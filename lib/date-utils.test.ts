import { describe, expect, it } from 'vitest'
import { daysUntilDate, isValidDateOnly } from '@/lib/date-utils'

describe('date utilities', () => {
  it('validates real calendar dates', () => {
    expect(isValidDateOnly('2028-02-29')).toBe(true)
    expect(isValidDateOnly('2027-02-29')).toBe(false)
    expect(isValidDateOnly('09/16/2026')).toBe(false)
  })

  it('calculates date-only differences independently of local time', () => {
    expect(daysUntilDate('2026-09-16', new Date('2026-09-14T23:45:00-07:00'))).toBe(1)
    expect(daysUntilDate('2026-09-16', new Date('2026-09-14T01:00:00+05:30'))).toBe(3)
  })
})
