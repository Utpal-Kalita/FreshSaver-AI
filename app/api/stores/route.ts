import { createServiceClient } from '@/lib/supabase/server'
import { guardError, requireSuperAdmin } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  const serviceClient = createServiceClient()
  const { data, error } = await serviceClient
    .from('stores')
    .select('id, name, slug, address, city, lat, lng, image_url, phone, is_active, created_at')
    .eq('is_active', true)
    .order('name')

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}

export async function POST(request: Request) {
  try {
    await requireSuperAdmin()
  } catch (err) {
    return guardError(err)
  }

  const body = await request.json()
  const { name, slug, address, city, lat, lng, image_url, phone } = body

  if (!name || !slug) {
    return Response.json({ error: 'name and slug are required' }, { status: 400 })
  }

  const serviceClient = createServiceClient()
  const { data, error } = await serviceClient
    .from('stores')
    .insert({ name, slug, address, city, lat, lng, image_url, phone })
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 400 })
  return Response.json(data, { status: 201 })
}
