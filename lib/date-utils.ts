const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/

export function isValidDateOnly(value: string) {
  const match = DATE_ONLY.exec(value)
  if (!match) return false
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
}

export function daysUntilDate(value: string, now = new Date()) {
  if (!isValidDateOnly(value)) throw new Error(`Invalid date: ${value}`)
  const [year, month, day] = value.split('-').map(Number)
  const expiryDay = Date.UTC(year, month - 1, day)
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  return Math.round((expiryDay - today) / (24 * 60 * 60 * 1000))
}
