import Papa from 'papaparse'
import { isValidDateOnly } from '@/lib/date-utils'

export interface ProductRow {
  product_name: string
  sku: string
  original_price: number
  mrp: number
  expiry_date: string
  category: string
  image_url?: string
  stock_quantity: number
  unit_cost?: number
  minimum_price?: number
  disposal_cost_per_unit?: number
}

export interface RowError {
  row: number
  sku: string
  reason: string
}

const REQUIRED = ['product_name', 'sku', 'price', 'mrp', 'expiry_date', 'category']
const MAX_ROWS = 10_000

export function parseProductCSV(csvText: string): { valid: ProductRow[]; errors: RowError[] } {
  const { data, errors: parseErrors, meta } = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: h => h.trim().toLowerCase(),
  })

  if (parseErrors.length > 0) {
    return { valid: [], errors: [{ row: 0, sku: '', reason: `CSV parse error: ${parseErrors[0].message}` }] }
  }

  const fields = meta.fields ?? []
  const missingColumns = REQUIRED.filter(column => !fields.includes(column))
  if (missingColumns.length > 0) {
    return { valid: [], errors: [{ row: 1, sku: '', reason: `Missing required columns: ${missingColumns.join(', ')}` }] }
  }

  if (data.length > MAX_ROWS) {
    return { valid: [], errors: [{ row: 0, sku: '', reason: `CSV exceeds the ${MAX_ROWS.toLocaleString()} row limit` }] }
  }

  const valid: ProductRow[] = []
  const errors: RowError[] = []
  const seenSkus = new Set<string>()

  data.forEach((raw, index) => {
    const rowNum = index + 2 // +2: 1-indexed + header row
    const sku = raw['sku']?.trim().toUpperCase() || ''

    // Check required columns
    const missing = REQUIRED.filter(col => !raw[col]?.trim())
    if (missing.length > 0) {
      errors.push({ row: rowNum, sku, reason: `Missing required fields: ${missing.join(', ')}` })
      return
    }

    const price = parseFloat(raw['price'])
    const mrp = parseFloat(raw['mrp'])
    const expiryDate = raw['expiry_date'].trim()

    if (isNaN(price) || price <= 0) {
      errors.push({ row: rowNum, sku, reason: 'price must be a positive number' })
      return
    }
    if (isNaN(mrp) || mrp <= 0) {
      errors.push({ row: rowNum, sku, reason: 'mrp must be a positive number' })
      return
    }
    if (mrp < price) {
      errors.push({ row: rowNum, sku, reason: 'mrp must be >= price' })
      return
    }
    if (!isValidDateOnly(expiryDate)) {
      errors.push({ row: rowNum, sku, reason: `expiry_date "${expiryDate}" must be a real date in YYYY-MM-DD format` })
      return
    }

    if (seenSkus.has(sku)) {
      errors.push({ row: rowNum, sku, reason: 'duplicate SKU in this file' })
      return
    }

    let stock = 100 // default stock
    if (raw['stock_quantity']?.trim() || raw['stock']?.trim() || raw['quantity']?.trim()) {
      const parsedStock = parseInt(raw['stock_quantity']?.trim() || raw['stock']?.trim() || raw['quantity']?.trim(), 10)
      if (!Number.isInteger(parsedStock) || parsedStock < 0) {
        errors.push({ row: rowNum, sku, reason: 'stock_quantity must be a non-negative integer' })
        return
      }
      stock = parsedStock
    }

    const optionalMoney: Record<string, number | undefined> = {}
    for (const column of ['unit_cost', 'minimum_price', 'disposal_cost_per_unit']) {
      const rawValue = raw[column]?.trim()
      if (!rawValue) continue
      const parsedValue = Number(rawValue)
      if (!Number.isFinite(parsedValue) || parsedValue < 0) {
        errors.push({ row: rowNum, sku, reason: `${column} must be a non-negative number` })
        return
      }
      optionalMoney[column] = parsedValue
    }
    if (optionalMoney.minimum_price != null && optionalMoney.minimum_price > price) {
      errors.push({ row: rowNum, sku, reason: 'minimum_price cannot exceed price' })
      return
    }

    seenSkus.add(sku)

    valid.push({
      product_name: raw['product_name'].trim(),
      sku,
      original_price: price,
      mrp,
      expiry_date: expiryDate,
      category: raw['category'].trim(),
      image_url: raw['image_url']?.trim() || undefined,
      stock_quantity: stock,
      unit_cost: optionalMoney.unit_cost,
      minimum_price: optionalMoney.minimum_price,
      disposal_cost_per_unit: optionalMoney.disposal_cost_per_unit,
    })
  })

  return { valid, errors }
}
