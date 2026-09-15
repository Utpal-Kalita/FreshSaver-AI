import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'

const SUPER_ADMIN_EMAIL = 'admin@yahoo.com'

export async function getServerUser() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null
  return user
}

// For Route Handlers: returns user or throws a 401 Response
export async function requireAuth() {
  const user = await getServerUser()
  if (!user) {
    throw Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return user
}

// Super admin only — throws a Response (401/403) for anyone who isn't admin@yahoo.com
// Callers: `try { await requireSuperAdmin() } catch (err) { return guardError(err) }`
export async function requireSuperAdmin() {
  const user = await getServerUser()
  if (!user) throw Response.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.email !== SUPER_ADMIN_EMAIL) {
    throw Response.json({ error: 'Forbidden' }, { status: 403 })
  }
  return user
}

// Safe catch helper: returns auth error Responses, re-throws genuine runtime errors
export function guardError(err: unknown): Response {
  if (err instanceof Response) return err
  throw err
}

// Returns the store record the user administers, or null
export async function getStoreAdminRecord(userId: string) {
  const serviceClient = createServiceClient()
  const { data } = await serviceClient
    .from('store_admins')
    .select('store_id, stores(id, name, slug)')
    .eq('user_id', userId)
    .single()
  if (!data) return null
  const store = Array.isArray(data.stores) ? data.stores[0] : data.stores
  return {
    store_id: data.store_id as string,
    store_name: (store as { name: string })?.name ?? '',
    store_slug: (store as { slug: string })?.slug ?? '',
  }
}

// For store admin Route Handlers: verifies authenticated user manages storeSlug
export async function requireStoreAdmin(storeSlug: string) {
  const user = await getServerUser()
  if (!user) throw Response.json({ error: 'Unauthorized' }, { status: 401 })
  const record = await getStoreAdminRecord(user.id)
  if (!record || record.store_slug !== storeSlug) {
    throw Response.json({ error: 'Forbidden' }, { status: 403 })
  }
  return { user, storeAdmin: record }
}
