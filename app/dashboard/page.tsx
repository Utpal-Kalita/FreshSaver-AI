import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowRight, BellRing, CalendarClock, Package, ReceiptText, Tag, Users } from 'lucide-react'
import { createServiceClient } from '@/lib/supabase/server'
import { getServerUser, getStoreAdminRecord } from '@/lib/auth'
import { daysUntilDate } from '@/lib/date-utils'

export const dynamic = 'force-dynamic'

interface AttentionProduct {
  id: string
  product_name: string
  sku: string
  expiry_date: string
  stock_quantity: number
  discounted_price: number | null
  original_price: number
}

export default async function DashboardPage() {
  const user = await getServerUser()
  if (!user) redirect('/login')
  const storeAdmin = await getStoreAdminRecord(user.id)
  if (!storeAdmin) redirect('/login')

  const supabase = createServiceClient()
  const now = new Date()
  const today = now.toISOString().slice(0, 10)
  const thirtyDaysFromNow = new Date(now)
  thirtyDaysFromNow.setUTCDate(thirtyDaysFromNow.getUTCDate() + 30)
  const inThirtyDays = thirtyDaysFromNow.toISOString().slice(0, 10)

  const [productsResult, dealsResult, subscribersResult, expiryResult, attentionResult, lastScanResult] = await Promise.all([
    supabase.from('products').select('*', { count: 'exact', head: true }).eq('store_id', storeAdmin.store_id).eq('is_active', true),
    supabase.from('products').select('*', { count: 'exact', head: true }).eq('store_id', storeAdmin.store_id).in('discount_tier', ['tier_1', 'tier_2']),
    supabase.from('store_subscriptions').select('*', { count: 'exact', head: true }).eq('store_id', storeAdmin.store_id).eq('notifications_enabled', true),
    supabase.from('products').select('*', { count: 'exact', head: true }).eq('store_id', storeAdmin.store_id).eq('is_active', true).gte('expiry_date', today).lte('expiry_date', inThirtyDays),
    supabase.from('products').select('id, product_name, sku, expiry_date, stock_quantity, discounted_price, original_price').eq('store_id', storeAdmin.store_id).eq('is_active', true).gte('expiry_date', today).order('expiry_date', { ascending: true }).limit(6),
    supabase.from('scan_logs').select('scanned_at, status, emails_sent').eq('store_id', storeAdmin.store_id).order('scanned_at', { ascending: false }).limit(1).maybeSingle(),
  ])

  const attentionProducts = (attentionResult.data ?? []) as AttentionProduct[]
  const stats = [
    { label: 'Active products', value: productsResult.count ?? 0, note: 'In your current inventory', icon: Package, color: 'bg-emerald-100 text-emerald-700' },
    { label: 'Expiring in 30 days', value: expiryResult.count ?? 0, note: 'Ready for pricing review', icon: CalendarClock, color: 'bg-orange-100 text-orange-700' },
    { label: 'Active deals', value: dealsResult.count ?? 0, note: 'Visible to shoppers', icon: Tag, color: 'bg-lime-200 text-emerald-900' },
    { label: 'Deal subscribers', value: subscribersResult.count ?? 0, note: 'Opted into this store', icon: Users, color: 'bg-violet-100 text-violet-700' },
  ]

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <header className="flex flex-col gap-5 border-b border-emerald-950/10 pb-7 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-600">{storeAdmin.store_name}</p>
          <h1 className="mt-2 text-4xl font-black tracking-[-0.04em] sm:text-5xl">Good morning.</h1>
          <p className="mt-3 text-sm text-emerald-950/55">Here is what needs attention across inventory, pricing, and your shopper audience.</p>
        </div>
        <Link href="/dashboard/pricing" className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#173d31] px-5 py-3 text-sm font-black text-white transition hover:bg-emerald-900"><ReceiptText size={17} /> Open pricing agent</Link>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(({ label, value, note, icon: Icon, color }) => (
          <article key={label} className="rounded-3xl border border-emerald-950/10 bg-white p-5 shadow-sm">
            <div className={`grid size-11 place-items-center rounded-2xl ${color}`}><Icon size={20} /></div>
            <p className="mt-5 text-3xl font-black tracking-tight">{value}</p>
            <p className="mt-1 text-sm font-black">{label}</p>
            <p className="mt-1 text-xs text-emerald-950/40">{note}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.35fr_.65fr]">
        <div className="overflow-hidden rounded-3xl border border-emerald-950/10 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-emerald-950/10 px-6 py-5">
            <div><p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-600">Next in line</p><h2 className="mt-1 text-xl font-black">Upcoming expiries</h2></div>
            <Link href="/dashboard/pricing" className="flex items-center gap-1 text-xs font-black text-emerald-700">View all <ArrowRight size={14} /></Link>
          </div>
          <div className="divide-y divide-emerald-950/5">
            {attentionProducts.length === 0 && <div className="px-6 py-12 text-center text-sm text-emerald-950/40">No upcoming expiries found.</div>}
            {attentionProducts.map(product => {
              const days = daysUntilDate(product.expiry_date)
              return (
                <div key={product.id} className="grid grid-cols-[1fr_auto] items-center gap-4 px-6 py-4 sm:grid-cols-[1fr_auto_auto]">
                  <div><p className="font-black">{product.product_name}</p><p className="mt-1 font-mono text-[10px] text-emerald-950/35">{product.sku} · {product.stock_quantity} units</p></div>
                  <p className="hidden text-right text-xs font-bold text-emerald-950/45 sm:block">₹{Number(product.discounted_price ?? product.original_price).toFixed(2)}</p>
                  <span className={`rounded-full px-3 py-1.5 text-[10px] font-black uppercase ${days <= 3 ? 'bg-red-100 text-red-700' : days <= 15 ? 'bg-orange-100 text-orange-700' : 'bg-emerald-100 text-emerald-700'}`}>{days === 0 ? 'Today' : `${days} days left`}</span>
                </div>
              )
            })}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-3xl bg-[#173d31] p-6 text-white shadow-sm">
            <BellRing size={22} className="text-lime-300" />
            <p className="mt-5 text-xs font-black uppercase tracking-[0.16em] text-lime-300">Last agent run</p>
            <p className="mt-2 text-xl font-black">{lastScanResult.data ? new Date(lastScanResult.data.scanned_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'No runs yet'}</p>
            <p className="mt-2 text-xs text-emerald-100/55">{lastScanResult.data ? `${lastScanResult.data.emails_sent} emails sent · ${lastScanResult.data.status}` : 'Run the pricing agent to create your first log.'}</p>
          </div>
          <Link href="/dashboard/products" className="flex items-center justify-between rounded-2xl border border-emerald-950/10 bg-white p-5 font-black shadow-sm"><span className="flex items-center gap-3"><Package size={18} className="text-emerald-600" /> Manage products</span><ArrowRight size={17} /></Link>
          <Link href="/dashboard/customers" className="flex items-center justify-between rounded-2xl border border-emerald-950/10 bg-white p-5 font-black shadow-sm"><span className="flex items-center gap-3"><Users size={18} className="text-violet-600" /> View customers</span><ArrowRight size={17} /></Link>
        </div>
      </section>
    </div>
  )
}
