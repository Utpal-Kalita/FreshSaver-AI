import type { DemandForecast } from '@/lib/demand-forecast'
import type { DemandModelPrediction } from '@/lib/ml-demand-client'

export type DiscountTier = 'tier_1' | 'tier_2' | 'none' | 'expired'

export const RECOMMENDER_VERSION = 'freshsaver-demand-v1'

const CATEGORY_ELASTICITY: Record<string, number> = {
  bakery: 3.6,
  dairy: 3.1,
  deli: 2.8,
  grocery: 2.5,
  meat: 2.4,
  produce: 3.8,
  seafood: 2.5,
}

export type RecommendationAction = 'blocked' | 'hold_price' | 'markdown' | 'manual_override'

export interface MarkdownCandidate {
  discountPct: number
  price: number
  expectedUnitsSold: number
  expectedWaste: number
  expectedRevenue: number
  expectedMargin: number | null
  lowUnits: number
  highUnits: number
  clearanceProbability: number | null
  predictionSource: 'xgboost' | 'heuristic'
  factors: Array<{ feature: string; impact: number }>
  score: number
}

export interface MarkdownInput {
  productId: string
  productName: string
  category: string
  originalPrice: number
  unitCost?: number | null
  minimumPrice?: number | null
  disposalCostPerUnit?: number | null
  stockQuantity: number
  daysUntilExpiry: number
  manualOverridePrice?: number | null
  forecast: DemandForecast
  mlPrediction?: DemandModelPrediction | null
}

export interface MarkdownRecommendation {
  tier: DiscountTier
  action: RecommendationAction
  recommendedPrice: number
  discountPct: number
  confidence: number
  explanation: string
  reasonCodes: string[]
  expectedUnitsSold: number
  expectedWaste: number
  baselineUnitsSold: number
  candidates: MarkdownCandidate[]
  modelMode: DemandForecast['mode']
  modelVersion: string
  predictionSource: 'xgboost' | 'heuristic'
  trainingData: 'real' | 'synthetic_demo' | 'mixed' | null
  modelMetrics: {
    sampleCount: number
    historyDays: number
    validationMae: number | null
  }
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100
}

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value))
}

export function urgencyTier(daysUntilExpiry: number): DiscountTier {
  if (daysUntilExpiry <= 0) return 'expired'
  if (daysUntilExpiry <= 15) return 'tier_2'
  if (daysUntilExpiry <= 30) return 'tier_1'
  return 'none'
}

function fallbackDiscount(tier: DiscountTier) {
  if (tier === 'tier_1') return 15
  if (tier === 'tier_2') return 25
  return 0
}

export function candidateDiscounts(tier: DiscountTier) {
  if (tier === 'tier_1') return [0, 10, 15, 20, 25]
  if (tier === 'tier_2') return [0, 15, 20, 25, 30, 35, 40]
  return [0]
}

function confidenceFor(forecast: DemandForecast) {
  if (forecast.mode === 'category_prior') return 0.48
  const sampleConfidence = clamp(forecast.sampleCount / 20)
  const errorRatio = forecast.dailyVelocity > 0 && forecast.validationMae !== null
    ? forecast.validationMae / forecast.dailyVelocity
    : 1
  return clamp(0.55 + sampleConfidence * 0.25 + (1 - clamp(errorRatio)) * 0.15, 0.55, 0.92)
}

export function recommendMarkdown(input: MarkdownInput): MarkdownRecommendation {
  const tier = urgencyTier(input.daysUntilExpiry)
  const stock = Math.max(0, Math.floor(input.stockQuantity))
  const originalPrice = Math.max(0, input.originalPrice)
  const unitCost = input.unitCost == null ? null : Math.max(0, input.unitCost)
  const disposalCost = Math.max(0, input.disposalCostPerUnit ?? 0)
  const minimumPrice = Math.min(originalPrice, Math.max(0, input.minimumPrice ?? 0))
  const baselineUnitsSold = Math.min(
    stock,
    Math.max(0, input.forecast.dailyVelocity * input.forecast.weekdayFactor * Math.max(0, input.daysUntilExpiry)),
  )
  const confidence = confidenceFor(input.forecast)
  const modelMetrics = {
    sampleCount: input.forecast.sampleCount,
    historyDays: input.forecast.historyDays,
    validationMae: input.forecast.validationMae,
  }

  if (tier === 'expired') {
    return {
      tier,
      action: 'blocked',
      recommendedPrice: originalPrice,
      discountPct: 0,
      confidence: 1,
      explanation: 'The recorded expiry date has passed. FreshSaver blocks automated sale and requires store review.',
      reasonCodes: ['expired', 'sale_blocked'],
      expectedUnitsSold: 0,
      expectedWaste: stock,
      baselineUnitsSold: 0,
      candidates: [],
      modelMode: input.forecast.mode,
      modelVersion: RECOMMENDER_VERSION,
      predictionSource: input.mlPrediction ? 'xgboost' : 'heuristic',
      trainingData: input.mlPrediction?.trainingData ?? null,
      modelMetrics,
    }
  }

  if (input.manualOverridePrice != null) {
    const price = roundMoney(Math.max(0, input.manualOverridePrice))
    const discountPct = originalPrice > 0 ? Math.max(0, (1 - price / originalPrice) * 100) : 0
    return {
      tier,
      action: 'manual_override',
      recommendedPrice: price,
      discountPct,
      confidence: 1,
      explanation: 'A manager-set price is active, so the automated recommendation was not applied.',
      reasonCodes: ['manual_override'],
      expectedUnitsSold: baselineUnitsSold,
      expectedWaste: Math.max(0, stock - baselineUnitsSold),
      baselineUnitsSold,
      candidates: [],
      modelMode: input.forecast.mode,
      modelVersion: RECOMMENDER_VERSION,
      predictionSource: input.mlPrediction ? 'xgboost' : 'heuristic',
      trainingData: input.mlPrediction?.trainingData ?? null,
      modelMetrics,
    }
  }

  const elasticity = CATEGORY_ELASTICITY[input.category.toLowerCase()] ?? 2.7
  const candidates = candidateDiscounts(tier).map((discountPct): MarkdownCandidate => {
    const discount = discountPct / 100
    const price = roundMoney(originalPrice * (1 - discount))
    const mlCandidate = input.mlPrediction?.predictions.find(item => item.discountPct === discountPct)
    const expectedUnitsSold = Math.min(stock, mlCandidate?.expectedUnits ?? baselineUnitsSold * (1 + elasticity * discount))
    const lowUnits = Math.min(stock, mlCandidate?.lowUnits ?? expectedUnitsSold)
    const highUnits = Math.min(stock, mlCandidate?.highUnits ?? expectedUnitsSold)
    const expectedWaste = Math.max(0, stock - expectedUnitsSold)
    const expectedRevenue = expectedUnitsSold * price
    const expectedMargin = unitCost == null ? null : expectedRevenue - expectedUnitsSold * unitCost - expectedWaste * disposalCost
    const urgencyWeight = tier === 'tier_2' ? 0.55 : tier === 'tier_1' ? 0.35 : 0.15
    const score = expectedMargin ?? expectedRevenue - expectedWaste * originalPrice * urgencyWeight
    return {
      discountPct,
      price,
      expectedUnitsSold,
      expectedWaste,
      expectedRevenue,
      expectedMargin,
      lowUnits,
      highUnits,
      clearanceProbability: mlCandidate?.clearanceProbability ?? null,
      predictionSource: mlCandidate ? 'xgboost' : 'heuristic',
      factors: mlCandidate?.factors ?? [],
      score,
    }
  }).filter(candidate => candidate.price >= minimumPrice)

  let selected = candidates.reduce((best, candidate) => candidate.score > best.score ? candidate : best)

  const fullPriceExpected = candidates.find(candidate => candidate.discountPct === 0)?.expectedUnitsSold ?? baselineUnitsSold

  if (input.forecast.mode === 'category_prior' && !input.mlPrediction && tier !== 'none') {
    selected = candidates.find(candidate => candidate.discountPct === fallbackDiscount(tier)) ?? selected
  } else if (stock === 0 || fullPriceExpected >= stock * 0.9) {
    selected = candidates[0]
  }

  const action: RecommendationAction = selected.discountPct > 0 ? 'markdown' : 'hold_price'
  const likelyUnsold = Math.max(0, Math.round((stock - baselineUnitsSold) * 10) / 10)
  const reasonCodes: string[] = [tier, input.forecast.mode]

  let explanation: string
  if (stock === 0) {
    explanation = 'No stock is available, so FreshSaver holds the current price.'
    reasonCodes.push('no_stock')
  } else if (action === 'hold_price') {
    explanation = `Current demand is forecast to sell ${Math.round(fullPriceExpected)} of ${stock} units before expiry, so a markdown would give away margin.`
    reasonCodes.push('demand_sufficient')
  } else {
    explanation = input.mlPrediction
      ? `${likelyUnsold} units may remain at the current pace. The demand model predicts ${selected.lowUnits.toFixed(1)}-${selected.highUnits.toFixed(1)} units sold at ${selected.discountPct}% off, the strongest eligible contribution score.`
      : `${likelyUnsold} units are forecast to remain at the current pace. A ${selected.discountPct}% markdown has the strongest revenue-and-waste score across ${candidates.length} tested prices.`
    reasonCodes.push('excess_stock', 'optimized_markdown')
  }

  return {
    tier,
    action,
    recommendedPrice: selected.price,
    discountPct: selected.discountPct,
    confidence,
    explanation,
    reasonCodes,
    expectedUnitsSold: selected.expectedUnitsSold,
    expectedWaste: selected.expectedWaste,
    baselineUnitsSold,
    candidates,
    modelMode: input.forecast.mode,
    modelVersion: input.mlPrediction?.modelVersion ?? RECOMMENDER_VERSION,
    predictionSource: selected.predictionSource,
    trainingData: input.mlPrediction?.trainingData ?? null,
    modelMetrics,
  }
}
