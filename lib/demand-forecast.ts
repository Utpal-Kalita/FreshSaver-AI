const DAY_MS = 24 * 60 * 60 * 1000

export interface SalesObservation {
  date: string
  quantity: number
}

export interface DemandForecast {
  dailyVelocity: number
  weekdayFactor: number
  sampleCount: number
  historyDays: number
  validationMae: number | null
  mode: 'store_history' | 'category_prior'
}

function startOfUtcDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
}

function dayKey(date: Date) {
  return date.toISOString().slice(0, 10)
}

function average(values: number[]) {
  return values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length
}

export function buildDemandForecast(
  observations: SalesObservation[],
  fallbackDailyVelocity: number,
  now = new Date(),
): DemandForecast {
  const today = startOfUtcDay(now)
  const salesByDay = new Map<string, number>()

  for (const observation of observations) {
    const date = new Date(observation.date)
    if (Number.isNaN(date.getTime()) || observation.quantity <= 0 || date > now) continue
    const key = dayKey(startOfUtcDay(date))
    salesByDay.set(key, (salesByDay.get(key) ?? 0) + observation.quantity)
  }

  const dailySeries = Array.from({ length: 30 }, (_, index) => {
    const date = new Date(today.getTime() - (29 - index) * DAY_MS)
    return { date, quantity: salesByDay.get(dayKey(date)) ?? 0 }
  })
  const sampleCount = observations.filter((item) => item.quantity > 0).length

  if (sampleCount < 3) {
    return {
      dailyVelocity: Math.max(0, fallbackDailyVelocity),
      weekdayFactor: 1,
      sampleCount,
      historyDays: 30,
      validationMae: null,
      mode: 'category_prior',
    }
  }

  const recent7 = dailySeries.slice(-7).map(item => item.quantity)
  const previous23 = dailySeries.slice(0, 23).map(item => item.quantity)
  const dailyVelocity = average(recent7) * 0.7 + average(previous23) * 0.3
  const overallAverage = average(dailySeries.map(item => item.quantity))
  const targetWeekday = today.getUTCDay()
  const weekdayAverage = average(
    dailySeries.filter(item => item.date.getUTCDay() === targetWeekday).map(item => item.quantity),
  )
  const weekdayFactor = overallAverage > 0
    ? Math.min(1.35, Math.max(0.7, weekdayAverage / overallAverage))
    : 1

  const validationDays = dailySeries.slice(-7)
  const trainingDays = dailySeries.slice(0, 23)
  const naivePrediction = average(trainingDays.slice(-7).map(item => item.quantity))
  const validationMae = average(validationDays.map(item => Math.abs(item.quantity - naivePrediction)))

  return {
    dailyVelocity: Math.max(0, dailyVelocity),
    weekdayFactor,
    sampleCount,
    historyDays: 30,
    validationMae,
    mode: 'store_history',
  }
}
