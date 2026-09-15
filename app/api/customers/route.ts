import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getServerUser, getStoreAdminRecord } from '@/lib/auth'

async function requireStore() {
  const user = await getServerUser()
  if (!user) return { response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  const storeAdmin = await getStoreAdminRecord(user.id)
  if (!storeAdmin) return { response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  return { storeId: storeAdmin.store_id }
}

export async function GET() {
  const access = await requireStore()
  if (access.response) return access.response

  const supabase = createServiceClient()
  const { data, error, count } = await supabase
    .from('store_subscriptions')
    .select('id, source, interested_categories, notifications_enabled, subscribed_at, customers(id, name, email, phone, location, is_subscribed)', { count: 'exact' })
    .eq('store_id', access.storeId!)
    .order('subscribed_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data, total: count })
}

export async function POST(request: NextRequest) {
  const access = await requireStore()
  if (access.response) return access.response

  const body = await request.json()
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Valid email is required' }, { status: 400 })
  }

  const categories = Array.isArray(body.categories)
    ? body.categories.filter((item: unknown): item is string => typeof item === 'string').map((item: string) => item.trim()).filter(Boolean).slice(0, 20)
    : []
  const supabase = createServiceClient()
  const { data: customer, error: customerError } = await supabase
    .from('customers')
    .upsert({
      email,
      name: typeof body.name === 'string' ? body.name.trim() || null : null,
      phone: typeof body.phone === 'string' ? body.phone.trim() || null : null,
      location: typeof body.location === 'string' ? body.location.trim() || null : null,
      is_subscribed: true,
    }, { onConflict: 'email' })
    .select('id')
    .single()

  if (customerError || !customer) return NextResponse.json({ error: customerError?.message ?? 'Could not save customer' }, { status: 500 })

  const { data, error } = await supabase
    .from('store_subscriptions')
    .upsert({
      store_id: access.storeId!,
      customer_id: customer.id,
      source: 'store_qr',
      interested_categories: categories,
      notifications_enabled: true,
    }, { onConflict: 'store_id,customer_id' })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
