import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { LayoutDashboard, ShoppingBag, LogOut } from 'lucide-react'

export default async function StoreAdminLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ 'store-slug': string }>
}) {
  const { 'store-slug': storeSlug } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const serviceClient = createServiceClient()

  // Verify user is admin of this specific store
  const { data: storeAdmin } = await serviceClient
    .from('store_admins')
    .select('store_id, stores(name, slug)')
    .eq('user_id', user.id)
    .single()

  if (!storeAdmin) redirect('/auth/login')

  const store = Array.isArray(storeAdmin.stores) ? storeAdmin.stores[0] : storeAdmin.stores
  const storeData = store as { name: string; slug: string } | null

  if (!storeData || storeData.slug !== storeSlug) redirect('/auth/login')

  const navLinks = [
    { href: `/admin/${storeSlug}`, label: 'Overview', icon: LayoutDashboard },
    { href: `/admin/${storeSlug}/orders`, label: 'Orders', icon: ShoppingBag },
  ]

  return (
    <div className="flex min-h-screen bg-gray-50 font-sans">
      {/* Sidebar */}
      <aside className="w-60 bg-white border-r border-gray-100 flex flex-col fixed inset-y-0 shadow-sm z-50">
        <div className="px-5 py-6">
          <Link href="/" className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-lg bg-green-500 flex items-center justify-center">
              <span className="text-white font-black text-sm">F</span>
            </div>
            <span className="text-lg font-black text-green-600">FreshSaver</span>
          </Link>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-2">Store Admin</p>
          <p className="text-sm font-bold text-gray-700 truncate">{storeData.name}</p>
        </div>

        <nav className="flex-1 px-3 space-y-1">
          {navLinks.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-green-50 hover:text-green-700 transition-colors"
            >
              <Icon size={16} className="text-gray-400" />
              {label}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-100">
          <div className="px-3 py-2 bg-gray-50 rounded-xl mb-3">
            <p className="text-xs font-semibold text-gray-700 truncate">{user.email}</p>
            <p className="text-[10px] text-gray-400">Store Administrator</p>
          </div>
          <form action="/api/auth/logout" method="POST">
            <button className="flex items-center gap-2 w-full px-3 py-2 text-xs font-semibold text-red-500 hover:bg-red-50 rounded-xl transition-colors">
              <LogOut size={13} />
              Sign out
            </button>
          </form>
        </div>
      </aside>

      <main className="flex-1 ml-60 p-8 overflow-auto">{children}</main>
    </div>
  )
}
