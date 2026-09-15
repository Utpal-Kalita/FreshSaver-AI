import { createServiceClient } from '@/lib/supabase/server'
import { requireSuperAdmin } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Store, Plus } from 'lucide-react'
import StoreTable from './_components/StoreTable'
import CreateStoreForm from './_components/CreateStoreForm'
import StoreAdminManager from './_components/StoreAdminManager'

export const dynamic = 'force-dynamic'

export default async function StoresPage() {
  try { await requireSuperAdmin() } catch { redirect('/login') }

  const db = createServiceClient()

  const [storesRes, storeAdminsRes] = await Promise.all([
    db.from('stores')
      .select('id, name, slug, address, city, phone, lat, lng, is_active, created_at')
      .order('created_at', { ascending: false }),
    db.from('store_admins')
      .select('id, user_id, store_id, created_at, stores(name, slug)')
      .order('created_at', { ascending: false }),
  ])

  const stores = storesRes.data ?? []
  const active = stores.filter((s: { is_active: boolean }) => s.is_active).length
  const inactive = stores.length - active

  // Fetch emails for each store admin user_id from auth.users
  const userIds = (storeAdminsRes.data ?? []).map((a: { user_id: string }) => a.user_id)
  let emailMap: Record<string, string> = {}
  if (userIds.length > 0) {
    const { data: { users } } = await db.auth.admin.listUsers({ perPage: 1000 })
    emailMap = Object.fromEntries(
      (users ?? [])
        .filter((u: { id: string }) => userIds.includes(u.id))
        .map((u: { id: string; email?: string }) => [u.id, u.email ?? ''])
    )
  }

  const admins = (storeAdminsRes.data ?? []).map((a: {
    id: string; user_id: string; store_id: string; created_at: string;
    stores: unknown
  }) => {
    const store = Array.isArray(a.stores) ? a.stores[0] : a.stores
    return {
      id: a.id,
      user_id: a.user_id,
      email: emailMap[a.user_id] ?? '—',
      store_name: (store as { name?: string } | null)?.name ?? '—',
      store_slug: (store as { slug?: string } | null)?.slug ?? '',
      created_at: a.created_at,
    }
  })

  const storeOptions = stores.map((s: { id: string; name: string; slug: string }) => ({
    id: s.id,
    name: s.name,
    slug: s.slug,
  }))

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <header className="pb-6 border-b border-slate-800">
        <h1 className="text-4xl font-black text-white tracking-tight font-mono mb-1">Stores</h1>
        <p className="text-slate-500 text-sm">
          {stores.length} total — {active} active, {inactive} inactive · {admins.length} admin account{admins.length !== 1 ? 's' : ''}
        </p>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Left: store list (2 cols) */}
        <div className="xl:col-span-2 space-y-6">
          {/* Store table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl px-6 overflow-hidden">
            <div className="flex items-center justify-between py-5 border-b border-slate-800">
              <div className="flex items-center gap-2 text-sm font-black text-slate-300 uppercase tracking-widest">
                <Store size={16} className="text-emerald-400" />
                All Stores
              </div>
              <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest">
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />{active} Active
                </span>
                <span className="flex items-center gap-1.5 text-slate-500">
                  <span className="w-2 h-2 rounded-full bg-slate-600" />{inactive} Inactive
                </span>
              </div>
            </div>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <StoreTable stores={stores as any} />
          </div>

          {/* Create store form */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-7 h-7 rounded-lg bg-emerald-600 flex items-center justify-center">
                <Plus size={14} className="text-white" />
              </div>
              <h2 className="text-sm font-black text-white uppercase tracking-widest">Add New Store</h2>
            </div>
            <CreateStoreForm />
          </div>
        </div>

        {/* Right: store admin manager (1 col) */}
        <div className="xl:col-span-1">
          <StoreAdminManager stores={storeOptions} admins={admins} />
        </div>
      </div>
    </div>
  )
}
