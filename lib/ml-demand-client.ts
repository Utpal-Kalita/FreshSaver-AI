import type { SalesObservation } from '@/lib/demand-forecast'

export interface DemandModelInput {
  productId: string
  storeId: string
  category: string
  stockQuantity: number
  daysUntilExpiry: number
  originalPrice: number
  unitCost?: number | null
  observations: SalesObservation[]
  candidateDiscounts: number[]
  asOf: string
}

export interface DemandCandidatePrediction {
  discountPct: number
  lowUnits: number
  expectedUnits: number
  highUnits: number
  clearanceProbability: number
  factors: Array<{ feature: string; impact: number }>
}

export interface DemandModelPrediction {
  provider: 'xgboost'
  modelVersion: string
  trainingData: 'real' | 'synthetic_demo' | 'mixed'
  predictions: DemandCandidatePrediction[]
}

function validNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function parsePrediction(value: unknown): DemandModelPrediction | null {
  if (!value || typeof value !== 'object') return null
  const candidate = value as Partial<DemandModelPrediction>
  if (candidate.provider !== 'xgboost' || typeof candidate.modelVersion !== 'string' || !Array.isArray(candidate.predictions)) return null

  const predictions = candidate.predictions.filter(item =>
    validNumber(item.discountPct) &&
    validNumber(item.lowUnits) &&
    validNumber(item.expectedUnits) &&
    validNumber(item.highUnits) &&
    validNumber(item.clearanceProbability) &&
    Array.isArray(item.factors)
  )
  if (predictions.length === 0) return null

  return {
    provider: 'xgboost',
    modelVersion: candidate.modelVersion,
    trainingData: candidate.trainingData === 'real' || candidate.trainingData === 'mixed' ? candidate.trainingData : 'synthetic_demo',
    predictions,
  }
}

export async function predictDemandWithML(input: DemandModelInput): Promise<DemandModelPrediction | null> {
  const baseUrl = process.env.DEMAND_MODEL_URL?.replace(/\/$/, '')
  if (!baseUrl) return null

  const controller = new AbortController()
  const configuredTimeout = Number(process.env.DEMAND_MODEL_TIMEOUT_MS ?? 15000)
  const timeoutMs = Number.isFinite(configuredTimeout)
    ? Math.min(60_000, Math.max(1_000, configuredTimeout))
    : 15_000
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(`${baseUrl}/predict-demand`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(process.env.DEMAND_MODEL_API_KEY ? { Authorization: `Bearer ${process.env.DEMAND_MODEL_API_KEY}` } : {}),
      },
      body: JSON.stringify({
        product_id: input.productId,
        store_id: input.storeId,
        category: input.category,
        stock_quantity: input.stockQuantity,
        days_until_expiry: input.daysUntilExpiry,
        original_price: input.originalPrice,
        unit_cost: input.unitCost ?? null,
        observations: input.observations,
        candidate_discounts: input.candidateDiscounts,
        as_of: input.asOf,
      }),
      cache: 'no-store',
      signal: controller.signal,
    })
    if (!response.ok) return null
    return parsePrediction(await response.json())
  } catch {
    return null
  } finally {
    clearTimeout(timeout)
  }
}
