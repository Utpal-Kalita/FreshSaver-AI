import { describe, expect, it } from 'vitest'
import { buildDemandForecast } from '@/lib/demand-forecast'

const now = new Date('2026-09-14T12:00:00Z')

describe('demand forecast', () => {
  it('uses a labeled prior when history is insufficient', () => {
    const forecast = buildDemandForecast([], 1.5, now)
    expect(forecast.mode).toBe('category_prior')
    expect(forecast.dailyVelocity).toBe(1.5)
    expect(forecast.validationMae).toBeNull()
  })

  it('learns velocity and reports validation error from store history', () => {
    const observations = Array.from({ length: 14 }, (_, index) => ({
      date: new Date(now.getTime() - index * 24 * 60 * 60 * 1000).toISOString(),
      quantity: 2,
    }))
    const forecast = buildDemandForecast(observations, 1, now)
    expect(forecast.mode).toBe('store_history')
    expect(forecast.sampleCount).toBe(14)
    expect(forecast.dailyVelocity).toBeGreaterThan(1)
    expect(forecast.validationMae).not.toBeNull()
  })
})
