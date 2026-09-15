import { describe, expect, it } from 'vitest'
import { parseProductCSV } from '@/lib/csv-parser'

const header = 'product_name,sku,price,mrp,expiry_date,category,stock_quantity'

describe('product CSV validation', () => {
  it('normalizes a valid product row', () => {
    const result = parseProductCSV(`${header}\nMilk,milk-1,50,60,2026-09-16,Dairy,12`)
    expect(result.errors).toEqual([])
    expect(result.valid[0]).toMatchObject({ sku: 'MILK-1', original_price: 50, stock_quantity: 12 })
  })

  it('rejects missing columns before processing rows', () => {
    const result = parseProductCSV('product_name,sku\nMilk,M-1')
    expect(result.valid).toEqual([])
    expect(result.errors[0].reason).toContain('Missing required columns')
  })

  it('rejects impossible dates, negative stock, and duplicate SKUs', () => {
    const result = parseProductCSV([
      header,
      'Milk,M-1,50,60,2026-02-30,Dairy,12',
      'Bread,B-1,40,45,2026-09-16,Bakery,-1',
      'Yogurt,Y-1,30,35,2026-09-16,Dairy,2',
      'Yogurt,Y-1,30,35,2026-09-17,Dairy,2',
    ].join('\n'))
    expect(result.valid).toHaveLength(1)
    expect(result.errors.map(error => error.reason)).toEqual(expect.arrayContaining([
      expect.stringContaining('real date'),
      expect.stringContaining('non-negative integer'),
      expect.stringContaining('duplicate SKU'),
    ]))
  })

  it('accepts unit economics and rejects a minimum price above the regular price', () => {
    const valid = parseProductCSV(`${header},unit_cost,minimum_price,disposal_cost_per_unit\nMilk,M-2,50,60,2026-09-16,Dairy,12,30,40,2`)
    expect(valid.valid[0]).toMatchObject({ unit_cost: 30, minimum_price: 40, disposal_cost_per_unit: 2 })

    const invalid = parseProductCSV(`${header},minimum_price\nMilk,M-3,50,60,2026-09-16,Dairy,12,55`)
    expect(invalid.errors[0].reason).toContain('cannot exceed price')
  })
})
