import { afterEach, describe, expect, it, vi } from 'vitest'
import { predictDemandWithML } from '@/lib/ml-demand-client'

const input = {
  productId: 'product-1',
  storeId: 'store-1',
  category: 'Dairy',
  stockQuantity: 18,
  daysUntilExpiry: 4,
  originalPrice: 84,
  unitCost: 45,
  observations: [{ date: '2026-09-14T10:00:00.000Z', quantity: 2 }],
  candidateDiscounts: [0, 20],
  asOf: '2026-09-15T10:00:00.000Z',
}

afterEach(() => {
  vi.unstubAllGlobals()
  delete process.env.DEMAND_MODEL_URL
  delete process.env.DEMAND_MODEL_API_KEY
})

describe('ML demand client', () => {
  it('returns null when the model service is not configured', async () => {
    await expect(predictDemandWithML(input)).resolves.toBeNull()
  })

  it('accepts validated XGBoost predictions', async () => {
    process.env.DEMAND_MODEL_URL = 'https://model.example'
    process.env.DEMAND_MODEL_API_KEY = 'secret'
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        provider: 'xgboost',
        modelVersion: 'freshsaver-xgb-test',
        trainingData: 'synthetic_demo',
        predictions: [{
          discountPct: 20,
          lowUnits: 10,
          expectedUnits: 14,
          highUnits: 17,
          clearanceProbability: 0.42,
          factors: [{ feature: 'days_until_expiry', impact: -2.3 }],
        }],
      }),
    }))

    const result = await predictDemandWithML(input)
    expect(result?.provider).toBe('xgboost')
    expect(result?.predictions[0].expectedUnits).toBe(14)
    expect(fetch).toHaveBeenCalledWith('https://model.example/predict-demand', expect.objectContaining({
      headers: expect.objectContaining({ Authorization: 'Bearer secret' }),
    }))
  })
})
