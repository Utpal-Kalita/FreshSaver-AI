import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin, guardError } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/server'

// POST /api/admin/store-admins — create a store admin account
export async function POST(request: NextRequest) {
  try { await requireSuperAdmin() } catch (err) { return guardError(err) }

  const { email, password, store_id } = await request.json()

  if (!email || !password || !store_id) {
    return NextResponse.json({ error: 'email, password and store_id are required' }, { status: 400 })
  }
  if (password.length < 6) {
    return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
  }

  const db = createServiceClient()

  // Create the Auth user via admin API (service role bypasses email confirmation)
  const { data: authData, error: authError } = await db.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // mark confirmed so they can log in immediately
  })

  if (authError || !authData.user) {
    return NextResponse.json({ error: authError?.message ?? 'Failed to create user' }, { status: 400 })
  }

  // Link user → store in store_admins
  const { error: linkError } = await db
    .from('store_admins')
    .insert({ user_id: authData.user.id, store_id })

  if (linkError) {
    // Roll back: delete the auth user we just created
    const { error: rollbackError } = await db.auth.admin.deleteUser(authData.user.id)
    if (rollbackError) {
      // Rollback failed — orphaned auth user exists. Log for manual cleanup.
      console.error(`CRITICAL: orphaned auth user ${authData.user.id} (${email}) — store_admins insert failed and deleteUser also failed: ${rollbackError.message}`)
    }
    return NextResponse.json({ error: linkError.message }, { status: 400 })
  }

  return NextResponse.json({ success: true, email }, { status: 201 })
}

// GET /api/admin/store-admins — list all store admins
export async function GET() {
  try { await requireSuperAdmin() } catch (err) { return guardError(err) }

  const db = createServiceClient()
  const { data, error } = await db
    .from('store_admins')
    .select('id, user_id, store_id, created_at, stores(name, slug)')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// DELETE /api/admin/store-admins?user_id=xxx — remove store admin account
export async function DELETE(request: NextRequest) {
  try { await requireSuperAdmin() } catch (err) { return guardError(err) }

  const userId = request.nextUrl.searchParams.get('user_id')
  if (!userId) return NextResponse.json({ error: 'user_id required' }, { status: 400 })

  const db = createServiceClient()

  // Remove from store_admins (cascades via FK when user is deleted)
  await db.from('store_admins').delete().eq('user_id', userId)

  // Delete the Auth account entirely
  const { error } = await db.auth.admin.deleteUser(userId)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ success: true })
}
