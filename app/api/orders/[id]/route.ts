import { createServiceClient, createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const serviceClient = createServiceClient()
  const { data: order, error } = await serviceClient
    .from('orders')
    .select(`
      id, status, total_amount, payment_ref, created_at, updated_at,
      customer_id, customer_email, store_id,
      stores(name, slug, address, city),
      order_items(id, sku, product_name, quantity, unit_price)
    `)
    .eq('id', id)
    .single()

  if (error || !order) return Response.json({ error: 'Order not found' }, { status: 404 })

  // Check ownership: customer or store admin
  const isOwner = order.customer_id === user.id
  const { data: storeAdmin } = await serviceClient
    .from('store_admins')
    .select('store_id')
    .eq('user_id', user.id)
    .eq('store_id', order.store_id)
    .maybeSingle()

  if (!isOwner && !storeAdmin) return Response.json({ error: 'Forbidden' }, { status: 403 })

  return Response.json(order)
}

export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { status: newStatus } = await request.json()
  const validTransitions: Record<string, string[]> = {
    pending: ['accepted', 'cancelled'],
    accepted: ['completed', 'cancelled'],
  }

  if (!newStatus) return Response.json({ error: 'status is required' }, { status: 400 })

  const serviceClient = createServiceClient()

  // Fetch current order to validate transition + store admin check
  const { data: order, error: fetchErr } = await serviceClient
    .from('orders')
    .select('id, status, store_id')
    .eq('id', id)
    .single()

  if (fetchErr || !order) return Response.json({ error: 'Order not found' }, { status: 404 })

  // Verify store admin
  const { data: storeAdmin } = await serviceClient
    .from('store_admins')
    .select('store_id')
    .eq('user_id', user.id)
    .eq('store_id', order.store_id)
    .maybeSingle()

  if (!storeAdmin) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const allowed = validTransitions[order.status] ?? []
  if (!allowed.includes(newStatus)) {
    return Response.json({ error: `Cannot transition from ${order.status} to ${newStatus}` }, { status: 400 })
  }

  const { data: updated, error: updateErr } = await serviceClient
    .from('orders')
    .update({ status: newStatus })
    .eq('id', id)
    .select('id, status, updated_at')
    .single()

  if (updateErr) return Response.json({ error: updateErr.message }, { status: 500 })
  return Response.json(updated)
}
