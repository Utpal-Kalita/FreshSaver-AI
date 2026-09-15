import { createServiceClient } from '@/lib/supabase/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST(request: Request) {
  const body = await request.json()
  const { name, email, password, phone, location } = body

  if (!name || !email || !password) {
    return Response.json({ error: 'name, email, and password are required' }, { status: 400 })
  }

  if (password.length < 8) {
    return Response.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
  }

  // Use anon client to sign up (operates on auth API with anon key)
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch { /* server component */ }
        },
      },
    }
  )

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: name } },
  })

  if (authError) return Response.json({ error: authError.message }, { status: 400 })
  if (!authData.user) return Response.json({ error: 'Signup failed' }, { status: 500 })

  // Link user to customers table using service client
  const serviceClient = createServiceClient()
  const { error: customerError } = await serviceClient
    .from('customers')
    .upsert(
      {
        email,
        name,
        user_id: authData.user.id,
        phone: typeof phone === 'string' ? phone.trim() || null : null,
        location: typeof location === 'string' ? location.trim() || null : null,
        is_subscribed: false,
      },
      { onConflict: 'email' }
    )

  if (customerError) {
    console.error('Failed to create customer record:', customerError.message)
    // Non-fatal — auth account was created successfully
  }

  return Response.json({
    user: { id: authData.user.id, email: authData.user.email },
    session: authData.session,
  }, { status: 201 })
}
