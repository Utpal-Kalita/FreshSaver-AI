import { afterEach, describe, expect, it, vi } from 'vitest'
import { createMerchandisingBrief } from '@/lib/gemini-merchandising'
import { recommendMarkdown } from '@/lib/markdown-recommender'

function recommendation() {
  return recommendMarkdown({
    productId: 'p-1',
    productName: 'Whole milk',
    category: 'Dairy',
    originalPrice: 100,
    stockQuantity: 20,
    daysUntilExpiry: 4,
    forecast: { dailyVelocity: 1, weekdayFactor: 1, sampleCount: 12, historyDays: 30, validationMae: 0.5, mode: 'store_history' },
  })
}

afterEach(() => {
  vi.unstubAllGlobals()
  delete process.env.GEMINI_API_KEY
  delete process.env.GEMINI_MODEL
})

describe('Gemini merchandising brief', () => {
  it('returns a labeled deterministic fallback without a key', async () => {
    const result = await createMerchandisingBrief({ productName: 'Whole milk', category: 'Dairy', stockQuantity: 20, daysUntilExpiry: 4, originalPrice: 100, recommendation: recommendation() })
    expect(result.provider).toBe('template')
    expect(result.campaign.subject).toContain('Whole milk')
    expect(result.campaign.recipe.title).toContain('Whole milk')
    expect(result.campaign.recipe.ingredients.length).toBeGreaterThanOrEqual(4)
    expect(result.campaign.recipe.steps.length).toBeGreaterThanOrEqual(3)
  })

  it('parses structured grounded output from Gemini', async () => {
    process.env.GEMINI_API_KEY = 'test-key'
    process.env.GEMINI_MODEL = 'gemini-test'
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: JSON.stringify({
          managerSummary: 'Demand evidence supports the selected bounded markdown.',
          riskSignal: 'high',
          emailSubject: 'Fresh milk deal',
          emailHeadline: 'Save on milk today',
          emailBody: 'Pick up fresh milk at a lower price and help keep food in use.',
          recipeTitle: 'Quick cinnamon milk oats',
          recipeIntro: 'Use the milk deal in a simple breakfast.',
          recipeIngredients: ['Whole milk', 'Oats', 'Cinnamon', 'Banana'],
          recipeSteps: ['Warm the milk and oats.', 'Add cinnamon.', 'Top with banana.'],
        }) }] } }],
      }),
    }))

    const result = await createMerchandisingBrief({ productName: 'Whole milk', category: 'Dairy', stockQuantity: 20, daysUntilExpiry: 4, originalPrice: 100, recommendation: recommendation() })
    expect(result.provider).toBe('gemini')
    expect(result.model).toBe('gemini-test')
    expect(result.riskSignal).toBe('high')
    expect(result.campaign.subject).toBe('Fresh milk deal')
    expect(result.campaign.recipe.title).toBe('Quick cinnamon milk oats')
    expect(result.campaign.recipe.ingredients).toHaveLength(4)
  })
})
