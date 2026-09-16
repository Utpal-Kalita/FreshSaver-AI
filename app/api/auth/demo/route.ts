import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { hasSupabaseConfig } from '@/lib/env'

type DemoRole = 'owner' | 'customer'

function credentialsFor(role: DemoRole) {
  if (role === 'owner') {
    return {
      email: process.env.DEMO_STORE_OWNER_EMAIL,
      password: process.env.DEMO_STORE_OWNER_PASSWORD,
      redirectTo: '/dashboard',
    }
  }

  return {
    email: process.env.DEMO_CUSTOMER_EMAIL,
    password: process.env.DEMO_CUSTOMER_PASSWORD,
    redirectTo: '/account',
  }
}

export async function POST(request: NextRequest) {
  if (!hasSupabaseConfig()) {
    return NextResponse.json({ error: 'Connected demo access is not configured yet' }, { status: 503 })
  }

  let body: { role?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (body.role !== 'owner' && body.role !== 'customer') {
    return NextResponse.json({ error: 'Choose a valid demo role' }, { status: 400 })
  }

  const credentials = credentialsFor(body.role)
  if (!credentials.email || !credentials.password) {
    return NextResponse.json({ error: 'This demo account is not configured yet' }, { status: 503 })
  }

  const supabase = await createClient()
  // Replace an existing shopper/owner session when judges switch demo personas.
  await supabase.auth.signOut({ scope: 'local' })
  const { data, error } = await supabase.auth.signInWithPassword({
    email: credentials.email,
    password: credentials.password,
  })

  if (error || !data.user) {
    return NextResponse.json({ error: 'The demo account is temporarily unavailable' }, { status: 503 })
  }

  if (body.role === 'owner') {
    const serviceClient = createServiceClient()
    const { data: assignment } = await serviceClient
      .from('store_admins')
      .select('store_id')
      .eq('user_id', data.user.id)
      .limit(1)
      .maybeSingle()

    if (!assignment) {
      await supabase.auth.signOut()
      return NextResponse.json({ error: 'The demo owner is not assigned to a store' }, { status: 503 })
    }
  }

  return NextResponse.json(
    { redirectTo: credentials.redirectTo },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
