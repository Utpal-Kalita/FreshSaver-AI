import { describe, expect, it } from 'vitest'
import { recommendMarkdown } from '@/lib/markdown-recommender'

function input(overrides = {}) {
  return {
    productId: 'p-1',
    productName: 'Whole milk',
    category: 'Dairy',
    originalPrice: 100,
    stockQuantity: 20,
    daysUntilExpiry: 8,
    forecast: {
      dailyVelocity: 1,
      weekdayFactor: 1,
      sampleCount: 12,
      historyDays: 30,
      validationMae: 0.5,
      mode: 'store_history' as const,
    },
    ...overrides,
  }
}

describe('markdown recommender', () => {
  it('blocks expired inventory', () => {
    const result = recommendMarkdown(input({ daysUntilExpiry: 0 }))
    expect(result.action).toBe('blocked')
    expect(result.tier).toBe('expired')
  })

  it('holds price when forecast demand will clear stock', () => {
    const result = recommendMarkdown(input({ stockQuantity: 5 }))
    expect(result.action).toBe('hold_price')
    expect(result.discountPct).toBe(0)
  })

  it('evaluates multiple prices for excess stock', () => {
    const result = recommendMarkdown(input())
    expect(result.action).toBe('markdown')
    expect(result.candidates.length).toBeGreaterThan(1)
    expect(result.discountPct).toBeGreaterThan(0)
    expect(result.explanation).toContain('tested prices')
  })

  it('uses the established tier fallback when history is sparse', () => {
    const result = recommendMarkdown(input({
      forecast: { dailyVelocity: 1, weekdayFactor: 1, sampleCount: 0, historyDays: 30, validationMae: null, mode: 'category_prior' },
    }))
    expect(result.discountPct).toBe(25)
    expect(result.modelMode).toBe('category_prior')
  })

  it('never overrides a manager price', () => {
    const result = recommendMarkdown(input({ manualOverridePrice: 82 }))
    expect(result.action).toBe('manual_override')
    expect(result.recommendedPrice).toBe(82)
  })

  it('uses XGBoost candidate predictions and unit economics when available', () => {
    const predictions = [
      [0, 5], [15, 10], [20, 17], [25, 18], [30, 18.5], [35, 19], [40, 19.5],
    ].map(([discountPct, expectedUnits]) => ({
      discountPct,
      lowUnits: expectedUnits - 2,
      expectedUnits,
      highUnits: Math.min(20, expectedUnits + 2),
      clearanceProbability: expectedUnits / 20,
      factors: [{ feature: 'days_until_expiry', impact: 2.1 }],
    }))

    const result = recommendMarkdown(input({
      unitCost: 50,
      minimumPrice: 70,
      disposalCostPerUnit: 2,
      mlPrediction: {
        provider: 'xgboost',
        modelVersion: 'freshsaver-xgb-test',
        trainingData: 'synthetic_demo',
        predictions,
      },
    }))

    expect(result.predictionSource).toBe('xgboost')
    expect(result.modelVersion).toBe('freshsaver-xgb-test')
    expect(result.discountPct).toBe(20)
    expect(result.candidates.every(candidate => candidate.price >= 70)).toBe(true)
    expect(result.candidates.find(candidate => candidate.discountPct === 20)?.factors[0].feature).toBe('days_until_expiry')
  })
})
