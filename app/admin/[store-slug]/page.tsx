import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ShoppingBag, Package, Clock } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function StoreAdminPage({
  params,
}: {
  params: Promise<{ 'store-slug': string }>
}) {
  const { 'store-slug': storeSlug } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const serviceClient = createServiceClient()

  const { data: storeAdmin } = await serviceClient
    .from('store_admins')
    .select('store_id, stores(id, name, slug)')
    .eq('user_id', user.id)
    .single()

  if (!storeAdmin) redirect('/auth/login')
  const store = Array.isArray(storeAdmin.stores) ? storeAdmin.stores[0] : storeAdmin.stores
  const storeData = store as { id: string; name: string; slug: string }

  // Slug in URL must match the admin's actual store — prevents cross-store URL access
  if (storeData.slug !== storeSlug) redirect('/auth/login')

  const [pendingRes, totalOrdersRes, productsRes] = await Promise.all([
    serviceClient.from('orders').select('id', { count: 'exact', head: true }).eq('store_id', storeData.id).eq('status', 'pending'),
    serviceClient.from('orders').select('id, total_amount').eq('store_id', storeData.id).neq('status', 'cancelled'),
    serviceClient.from('products').select('id', { count: 'exact', head: true }).eq('store_id', storeData.id).eq('is_active', true),
  ])

  const pendingCount = pendingRes.count ?? 0
  const totalRevenue = (totalOrdersRes.data ?? []).reduce((sum: number, o: { total_amount: number }) => sum + o.total_amount, 0)
  const productCount = productsRes.count ?? 0

  const stats = [
    { label: 'Pending Orders', value: pendingCount, icon: Clock, color: 'bg-yellow-50 text-yellow-700', href: `/admin/${storeSlug}/orders` },
    { label: 'Total Revenue', value: `₹${totalRevenue.toFixed(2)}`, icon: ShoppingBag, color: 'bg-green-50 text-green-700', href: null },
    { label: 'Active Products', value: productCount, icon: Package, color: 'bg-blue-50 text-blue-700', href: null },
  ]

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-black text-gray-800">{storeData.name}</h1>
        <p className="text-gray-500 text-sm">Store Dashboard Overview</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {stats.map(({ label, value, icon: Icon, color, href }) => {
          const card = (
            <div className={`${color} rounded-2xl p-5 ${href ? 'hover:shadow-md transition-shadow cursor-pointer' : ''}`}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold opacity-70">{label}</p>
                <Icon size={18} className="opacity-50" />
              </div>
              <p className="text-3xl font-black">{value}</p>
            </div>
          )
          return href ? <Link key={label} href={href}>{card}</Link> : <div key={label}>{card}</div>
        })}
      </div>

      {pendingCount > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-5">
          <p className="font-bold text-yellow-700 mb-1">
            🔔 {pendingCount} order{pendingCount !== 1 ? 's' : ''} waiting for your response
          </p>
          <p className="text-sm text-yellow-600 mb-3">Accept or cancel pending orders to keep customers informed.</p>
          <Link href={`/admin/${storeSlug}/orders`} className="inline-block px-4 py-2 bg-yellow-600 text-white text-sm font-bold rounded-xl hover:bg-yellow-700 transition-colors">
            View Orders →
          </Link>
        </div>
      )}
    </div>
  )
}
