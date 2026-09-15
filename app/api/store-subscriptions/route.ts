import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth'

const SOURCES = new Set(['website', 'store_qr'])

export async function GET() {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServiceClient()
  const { data: customer } = await supabase
    .from('customers')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!customer) return NextResponse.json({ data: [] })

  const { data, error } = await supabase
    .from('store_subscriptions')
    .select('id, source, interested_categories, notifications_enabled, subscribed_at, stores(id, name, slug, city)')
    .eq('customer_id', customer.id)
    .order('subscribed_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function POST(request: NextRequest) {
  const user = await getServerUser()
  if (!user || !user.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { storeId?: string; source?: string; categories?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (!body.storeId) return NextResponse.json({ error: 'storeId is required' }, { status: 400 })
  const source = SOURCES.has(body.source ?? '') ? body.source! : 'website'
  const categories = Array.isArray(body.categories)
    ? body.categories.filter((item): item is string => typeof item === 'string').map(item => item.trim()).filter(Boolean).slice(0, 20)
    : []

  const supabase = createServiceClient()
  const { data: store } = await supabase
    .from('stores')
    .select('id')
    .eq('id', body.storeId)
    .eq('is_active', true)
    .maybeSingle()

  if (!store) return NextResponse.json({ error: 'Store not found' }, { status: 404 })

  const normalizedEmail = user.email.toLowerCase()
  const { data: existingCustomer } = await supabase
    .from('customers')
    .select('id')
    .eq('email', normalizedEmail)
    .maybeSingle()

  const displayName = typeof user.user_metadata?.full_name === 'string' ? user.user_metadata.full_name : null
  const customerResult = existingCustomer
    ? await supabase.from('customers').update({ user_id: user.id, is_subscribed: true }).eq('id', existingCustomer.id).select('id').single()
    : await supabase.from('customers').insert({ email: normalizedEmail, user_id: user.id, name: displayName, is_subscribed: true }).select('id').single()
  const { data: customer, error: customerError } = customerResult

  if (customerError || !customer) {
    return NextResponse.json({ error: customerError?.message ?? 'Could not create customer profile' }, { status: 500 })
  }

  const { data, error } = await supabase
    .from('store_subscriptions')
    .upsert({
      store_id: store.id,
      customer_id: customer.id,
      source,
      interested_categories: categories,
      notifications_enabled: true,
    }, { onConflict: 'store_id,customer_id' })
    .select('id, source, interested_categories, notifications_enabled, subscribed_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
