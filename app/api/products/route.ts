import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getServerUser, getStoreAdminRecord } from '@/lib/auth'
import { isValidDateOnly } from '@/lib/date-utils'

async function requireProductStore() {
  const user = await getServerUser()
  if (!user) return { response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  const storeAdmin = await getStoreAdminRecord(user.id)
  if (!storeAdmin) return { response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  return { storeId: storeAdmin.store_id }
}

export async function GET(request: NextRequest) {
  const access = await requireProductStore()
  if (access.response) return access.response

  const { searchParams } = new URL(request.url)
  const page = Math.max(1, Number.parseInt(searchParams.get('page') || '1', 10))
  const limit = Math.min(100, Math.max(1, Number.parseInt(searchParams.get('limit') || '50', 10)))
  const tier = searchParams.get('tier')
  const category = searchParams.get('category')
  const offset = (page - 1) * limit
  const supabase = createServiceClient()

  let query = supabase
    .from('products')
    .select('*', { count: 'exact' })
    .eq('store_id', access.storeId!)
    .eq('is_active', true)
    .order('expiry_date', { ascending: true })
    .range(offset, offset + limit - 1)

  if (tier) query = query.eq('discount_tier', tier)
  if (category) query = query.eq('category', category)

  const { data, error, count } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data, total: count, page, limit })
}

export async function POST(request: NextRequest) {
  const access = await requireProductStore()
  if (access.response) return access.response

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const productName = typeof body.productName === 'string' ? body.productName.trim() : ''
  const sku = typeof body.sku === 'string' ? body.sku.trim().toUpperCase() : ''
  const category = typeof body.category === 'string' ? body.category.trim() : ''
  const expiryDate = typeof body.expiryDate === 'string' ? body.expiryDate : ''
  const originalPrice = Number(body.originalPrice)
  const mrp = Number(body.mrp)
  const stockQuantity = Number(body.stockQuantity)
  const unitCost = body.unitCost === '' || body.unitCost == null ? null : Number(body.unitCost)
  const minimumPrice = body.minimumPrice === '' || body.minimumPrice == null ? null : Number(body.minimumPrice)
  const disposalCost = body.disposalCost === '' || body.disposalCost == null ? 0 : Number(body.disposalCost)

  if (!productName || !sku || !category) {
    return NextResponse.json({ error: 'Product name, SKU, and category are required' }, { status: 400 })
  }
  if (!isValidDateOnly(expiryDate)) {
    return NextResponse.json({ error: 'Expiry date must be a valid date' }, { status: 400 })
  }
  if (!Number.isFinite(originalPrice) || originalPrice <= 0 || !Number.isFinite(mrp) || mrp < originalPrice) {
    return NextResponse.json({ error: 'Prices must be positive and MRP cannot be lower than the original price' }, { status: 400 })
  }
  if (!Number.isInteger(stockQuantity) || stockQuantity < 0) {
    return NextResponse.json({ error: 'Stock must be a non-negative whole number' }, { status: 400 })
  }
  if ((unitCost != null && (!Number.isFinite(unitCost) || unitCost < 0)) ||
      (minimumPrice != null && (!Number.isFinite(minimumPrice) || minimumPrice < 0 || minimumPrice > originalPrice)) ||
      !Number.isFinite(disposalCost) || disposalCost < 0) {
    return NextResponse.json({ error: 'Unit cost, minimum price, and disposal cost must be valid non-negative amounts' }, { status: 400 })
  }

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('products')
    .insert({
      store_id: access.storeId!,
      product_name: productName,
      sku,
      category,
      expiry_date: expiryDate,
      original_price: originalPrice,
      mrp,
      stock_quantity: stockQuantity,
      unit_cost: unitCost,
      minimum_price: minimumPrice,
      disposal_cost_per_unit: disposalCost,
      discounted_price: originalPrice,
      discount_tier: 'none',
      is_active: true,
      is_expired: false,
    })
    .select('id, sku')
    .single()

  if (error) {
    const message = error.code === '23505' ? 'This SKU already exists in your store' : error.message
    return NextResponse.json({ error: message }, { status: error.code === '23505' ? 409 : 500 })
  }
  return NextResponse.json(data, { status: 201 })
}
