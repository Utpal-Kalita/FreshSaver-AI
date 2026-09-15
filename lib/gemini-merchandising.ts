import type { MarkdownRecommendation } from '@/lib/markdown-recommender'

export interface CampaignCopy {
  subject: string
  headline: string
  body: string
}

export interface MerchandisingBrief {
  provider: 'gemini' | 'template'
  model: string
  managerSummary: string
  riskSignal: 'low' | 'medium' | 'high'
  campaign: CampaignCopy
}

interface MerchandisingInput {
  productName: string
  category: string
  stockQuantity: number
  daysUntilExpiry: number
  originalPrice: number
  recommendation: MarkdownRecommendation
}

function plainText(value: unknown, fallback: string, maxLength: number) {
  if (typeof value !== 'string') return fallback
  const normalized = value.replace(/[<>]/g, '').replace(/\s+/g, ' ').trim()
  return normalized ? normalized.slice(0, maxLength) : fallback
}

export function createTemplateMerchandisingBrief(input: MerchandisingInput): MerchandisingBrief {
  const discount = Math.round(input.recommendation.discountPct)
  const riskSignal = input.daysUntilExpiry <= 3 ? 'high' : input.daysUntilExpiry <= 15 ? 'medium' : 'low'
  return {
    provider: 'template',
    model: 'deterministic-copy-v1',
    managerSummary: input.recommendation.explanation,
    riskSignal,
    campaign: {
      subject: discount > 0 ? `${discount}% off ${input.productName} at your local store` : `${input.productName} is available now`,
      headline: discount > 0 ? `Save ${discount}% and help prevent food waste` : 'Fresh and available today',
      body: discount > 0
        ? `Pick up ${input.productName} at a better price while helping your local store keep good food in use.`
        : `${input.productName} is available from your local FreshSaver store.`,
    },
  }
}

export async function createMerchandisingBrief(input: MerchandisingInput): Promise<MerchandisingBrief> {
  const fallback = createTemplateMerchandisingBrief(input)
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return fallback

  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash'
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8000)

  const evidence = {
    product: input.productName,
    category: input.category,
    stockQuantity: input.stockQuantity,
    daysUntilExpiry: input.daysUntilExpiry,
    originalPrice: input.originalPrice,
    recommendedPrice: input.recommendation.recommendedPrice,
    discountPct: input.recommendation.discountPct,
    action: input.recommendation.action,
    predictionSource: input.recommendation.predictionSource,
    trainingData: input.recommendation.trainingData,
    expectedUnitsSold: input.recommendation.expectedUnitsSold,
    expectedWaste: input.recommendation.expectedWaste,
    candidates: input.recommendation.candidates.map(candidate => ({
      discountPct: candidate.discountPct,
      price: candidate.price,
      expectedUnitsSold: candidate.expectedUnitsSold,
      range: [candidate.lowUnits, candidate.highUnits],
      expectedMargin: candidate.expectedMargin,
      clearanceProbability: candidate.clearanceProbability,
      topFactors: candidate.factors.slice(0, 3),
    })),
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: 'You are FreshSaver merchandising AI. Use only the supplied numerical evidence. Never change the selected price, discount, expiry date, or predicted values. Do not make food-safety claims, guarantees, causal impact claims, or use urgency that is unsupported. Write concise plain text for a store manager and opted-in shoppers.' }],
          },
          contents: [{ role: 'user', parts: [{ text: `Create a grounded merchandising brief from this JSON evidence:\n${JSON.stringify(evidence)}` }] }],
          generationConfig: {
            temperature: 0.2,
            responseMimeType: 'application/json',
            responseSchema: {
              type: 'OBJECT',
              properties: {
                managerSummary: { type: 'STRING' },
                riskSignal: { type: 'STRING', enum: ['low', 'medium', 'high'] },
                emailSubject: { type: 'STRING' },
                emailHeadline: { type: 'STRING' },
                emailBody: { type: 'STRING' },
              },
              required: ['managerSummary', 'riskSignal', 'emailSubject', 'emailHeadline', 'emailBody'],
            },
          },
        }),
        signal: controller.signal,
      },
    )
    if (!response.ok) return fallback

    const payload = await response.json()
    const text = payload?.candidates?.[0]?.content?.parts?.[0]?.text
    if (typeof text !== 'string') return fallback
    const generated = JSON.parse(text) as Record<string, unknown>
    const riskSignal = generated.riskSignal === 'high' || generated.riskSignal === 'medium' ? generated.riskSignal : 'low'

    return {
      provider: 'gemini',
      model,
      managerSummary: plainText(generated.managerSummary, fallback.managerSummary, 500),
      riskSignal,
      campaign: {
        subject: plainText(generated.emailSubject, fallback.campaign.subject, 120),
        headline: plainText(generated.emailHeadline, fallback.campaign.headline, 140),
        body: plainText(generated.emailBody, fallback.campaign.body, 600),
      },
    }
  } catch {
    return fallback
  } finally {
    clearTimeout(timeout)
  }
}
