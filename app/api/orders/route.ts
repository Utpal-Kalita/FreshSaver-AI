import { createServiceClient, createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const serviceClient = createServiceClient()
  const { data, error } = await serviceClient
    .from('orders')
    .select(`
      id, status, total_amount, payment_ref, created_at, updated_at,
      customer_email, store_id,
      stores(name, slug),
      order_items(id, sku, product_name, quantity, unit_price)
    `)
    .eq('customer_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { storeId, items } = body as {
    storeId: string
    items: Array<{ productId: string; sku: string; quantity: number }>
  }

  if (!storeId || !items || items.length === 0) {
    return Response.json({ error: 'storeId and items are required' }, { status: 400 })
  }

  const serviceClient = createServiceClient()

  // Re-validate prices from DB (never trust client)
  const skus = items.map(i => i.sku)
  const { data: dbProducts, error: fetchErr } = await serviceClient
    .from('products')
    .select('id, sku, product_name, original_price, discounted_price, stock_quantity, is_active, is_expired')
    .in('sku', skus)
    .eq('store_id', storeId)

  if (fetchErr) return Response.json({ error: fetchErr.message }, { status: 500 })

  type DBProduct = {
    id: string; sku: string; product_name: string; original_price: number;
    discounted_price: number | null; stock_quantity: number;
    is_active: boolean; is_expired: boolean;
  }

  // Validate each item
  const productMap = new Map<string, DBProduct>((dbProducts ?? []).map((p: DBProduct) => [p.sku, p]))
  let totalAmount = 0
  const validatedItems: Array<{
    productId: string; sku: string; productName: string;
    quantity: number; unitPrice: number;
  }> = []

  for (const item of items) {
    const product = productMap.get(item.sku)
    if (!product) return Response.json({ error: `Product ${item.sku} not found in this store` }, { status: 400 })
    if (!product.is_active || product.is_expired) return Response.json({ error: `Product ${item.sku} is no longer available` }, { status: 400 })
    if (product.stock_quantity < item.quantity) return Response.json({ error: `Insufficient stock for ${item.sku}` }, { status: 400 })

    const unitPrice = product.discounted_price ?? product.original_price
    totalAmount += unitPrice * item.quantity
    validatedItems.push({
      productId: product.id,
      sku: product.sku,
      productName: product.product_name,
      quantity: item.quantity,
      unitPrice,
    })
  }

  // Get customer email
  const { data: customer } = await serviceClient
    .from('customers')
    .select('email')
    .eq('user_id', user.id)
    .single()

  const customerEmail = customer?.email ?? user.email ?? ''

  // Create order
  const { data: order, error: orderErr } = await serviceClient
    .from('orders')
    .insert({
      customer_id: user.id,
      customer_email: customerEmail,
      store_id: storeId,
      total_amount: parseFloat(totalAmount.toFixed(2)),
      status: 'pending',
    })
    .select('id, payment_ref, status, total_amount')
    .single()

  if (orderErr || !order) return Response.json({ error: orderErr?.message ?? 'Failed to create order' }, { status: 500 })

  // Insert order items
  const orderItemsData = validatedItems.map(i => ({
    order_id: order.id,
    product_id: i.productId,
    sku: i.sku,
    product_name: i.productName,
    quantity: i.quantity,
    unit_price: i.unitPrice,
  }))

  const { error: itemsErr } = await serviceClient.from('order_items').insert(orderItemsData)
  if (itemsErr) return Response.json({ error: itemsErr.message }, { status: 500 })

  // Atomically decrement stock (best effort)
  for (const item of validatedItems) {
    const { error: stockError } = await serviceClient.rpc('decrement_stock', {
      p_product_id: item.productId,
      p_qty: item.quantity,
    })
    if (stockError) console.error(`Stock decrement failed for ${item.productId}:`, stockError.message)
  }

  return Response.json({
    orderId: order.id,
    paymentRef: order.payment_ref,
    status: order.status,
    totalAmount: order.total_amount,
  }, { status: 201 })
}
