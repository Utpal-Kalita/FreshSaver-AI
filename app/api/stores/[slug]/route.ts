import { createServiceClient } from '@/lib/supabase/server'
import { requireSuperAdmin, guardError } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ slug: string }> }
) {
  const { slug } = await ctx.params
  const serviceClient = createServiceClient()

  const { data: store, error } = await serviceClient
    .from('stores')
    .select('id, name, slug, address, city, lat, lng, image_url, phone')
    .eq('slug', slug)
    .eq('is_active', true)
    .single()

  if (error || !store) return Response.json({ error: 'Store not found' }, { status: 404 })

  const { data: products } = await serviceClient
    .from('products_public')
    .select('*')
    .eq('store_slug', slug)
    .order('discount_tier', { ascending: true })

  return Response.json({ ...store, products: products ?? [] })
}

export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ slug: string }> }
) {
  try { await requireSuperAdmin() } catch (err) { return guardError(err) }

  const { slug } = await ctx.params
  const body = await request.json()
  const { name, address, city, lat, lng, phone, image_url, is_active } = body

  const serviceClient = createServiceClient()
  const { data, error } = await serviceClient
    .from('stores')
    .update({ name, address, city, lat, lng, phone, image_url, is_active })
    .eq('slug', slug)
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 400 })
  return Response.json(data)
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ slug: string }> }
) {
  try { await requireSuperAdmin() } catch (err) { return guardError(err) }

  const { slug } = await ctx.params
  const serviceClient = createServiceClient()

  // Soft-delete: mark inactive rather than hard-delete
  const { error } = await serviceClient
    .from('stores')
    .update({ is_active: false })
    .eq('slug', slug)

  if (error) return Response.json({ error: error.message }, { status: 400 })
  return Response.json({ success: true })
}
