import { createServiceClient } from '@/lib/supabase/server'
import { requireSuperAdmin } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { format } from 'date-fns'
import Link from 'next/link'
import {
  Store,
  Package,
  ShoppingCart,
  TrendingUp,
  Tag,
  Mail,
  Activity,
  ArrowRight,
  CheckCircle,
  XCircle,
  Clock,
  BarChart3,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

function KpiCard({
  label, value, sub, icon: Icon, accent,
}: {
  label: string; value: string | number; sub?: string; icon: React.ElementType; accent: string
}) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
      <div className="flex items-start justify-between mb-4">
        <p className="text-xs font-black uppercase tracking-widest text-slate-500">{label}</p>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${accent}`}>
          <Icon size={16} className="text-white" />
        </div>
      </div>
      <p className="text-3xl font-black text-white font-mono">{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
    </div>
  )
}

export default async function SuperAdminOverview() {
  try { await requireSuperAdmin() } catch { redirect('/login') }

  const db = createServiceClient()

  const [
    storesRes,
    productsRes,
    ordersRes,
    emailRes,
    dealsRes,
    expiredRes,
    scanRes,
    recentOrdersRes,
  ] = await Promise.all([
    db.from('stores').select('id', { count: 'exact', head: true }).eq('is_active', true),
    db.from('products').select('id', { count: 'exact', head: true }).eq('is_active', true),
    db.from('orders').select('total_amount').neq('status', 'cancelled'),
    db.from('email_logs').select('id', { count: 'exact', head: true }).eq('status', 'sent'),
    db.from('products').select('id', { count: 'exact', head: true }).in('discount_tier', ['tier_1', 'tier_2']),
    db.from('products').select('id', { count: 'exact', head: true }).eq('is_expired', true),
    db.from('scan_logs').select('id, scanned_at, status, total_products, tier_1_flagged, tier_2_flagged, triggered_by, duration_ms').order('scanned_at', { ascending: false }).limit(5),
    db.from('orders').select('id, total_amount, status, created_at, stores(name)').order('created_at', { ascending: false }).limit(8),
  ])

  const totalRevenue = (ordersRes.data ?? []).reduce((s: number, o: { total_amount: number }) => s + (o.total_amount ?? 0), 0)
  const lastScan = scanRes.data?.[0]

  const statusDot: Record<string, string> = {
    pending:   'bg-yellow-400',
    accepted:  'bg-blue-400',
    completed: 'bg-emerald-400',
    cancelled: 'bg-red-400',
  }

  return (
    <div className="max-w-7xl mx-auto space-y-10">
      {/* Header */}
      <header className="pb-6 border-b border-slate-800">
        <h1 className="text-4xl font-black text-white tracking-tight font-mono mb-1">Platform Overview</h1>
        <p className="text-slate-500 text-sm flex items-center gap-2">
          <Activity size={14} className="text-emerald-400 animate-pulse" />
          Real-time stats across all stores
        </p>
      </header>

      {/* KPI grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Active Stores"    value={storesRes.count ?? 0}                    icon={Store}       accent="bg-emerald-600" />
        <KpiCard label="Total Products"   value={productsRes.count ?? 0}                  icon={Package}     accent="bg-blue-600" />
        <KpiCard label="Total Revenue"    value={`₹${totalRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`} icon={TrendingUp}  accent="bg-violet-600" />
        <KpiCard label="Orders"           value={(ordersRes.data ?? []).length}            icon={ShoppingCart} accent="bg-orange-600" />
        <KpiCard label="Active Deals"     value={dealsRes.count ?? 0}   sub="Tier 1 + Tier 2" icon={Tag}      accent="bg-rose-600" />
        <KpiCard label="Expired Items"    value={expiredRes.count ?? 0} sub="Flagged by AI"   icon={XCircle}  accent="bg-slate-600" />
        <KpiCard label="Emails Sent"      value={emailRes.count ?? 0}                     icon={Mail}        accent="bg-cyan-600" />
        <KpiCard
          label="Last AI Scan"
          value={lastScan ? format(new Date(lastScan.scanned_at), 'HH:mm') : '—'}
          sub={lastScan ? `${format(new Date(lastScan.scanned_at), 'MMM d')} · ${lastScan.status}` : 'No scans yet'}
          icon={Activity}
          accent="bg-emerald-600"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Scans */}
        <section className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between">
            <h2 className="text-sm font-black text-white uppercase tracking-widest">Recent AI Scans</h2>
            <Link href="/admin/dashboard/analytics" className="text-[10px] font-black uppercase text-emerald-400 hover:text-emerald-300 flex items-center gap-1">
              Analytics <ArrowRight size={12} />
            </Link>
          </div>
          <div className="divide-y divide-slate-800">
            {!scanRes.data?.length && (
              <p className="px-6 py-10 text-slate-600 text-sm text-center">No scans yet</p>
            )}
            {scanRes.data?.map((s: {
              id: string; scanned_at: string; status: string; total_products: number;
              tier_1_flagged: number; tier_2_flagged: number; triggered_by: string; duration_ms: number
            }) => (
              <div key={s.id} className="px-6 py-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  {s.status === 'success' ? (
                    <CheckCircle size={16} className="text-emerald-500 shrink-0" />
                  ) : s.status === 'in_progress' ? (
                    <Clock size={16} className="text-blue-400 shrink-0 animate-pulse" />
                  ) : (
                    <XCircle size={16} className="text-red-400 shrink-0" />
                  )}
                  <div>
                    <p className="text-sm font-bold text-slate-200">{format(new Date(s.scanned_at), 'MMM d, HH:mm')}</p>
                    <p className="text-[10px] text-slate-500">{s.total_products} products · {(s.duration_ms / 1000).toFixed(1)}s</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-black">
                  <span className="bg-orange-900/40 text-orange-400 px-2 py-0.5 rounded">T1: {s.tier_1_flagged}</span>
                  <span className="bg-red-900/40 text-red-400 px-2 py-0.5 rounded">T2: {s.tier_2_flagged}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Recent Orders */}
        <section className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-800">
            <h2 className="text-sm font-black text-white uppercase tracking-widest">Recent Orders</h2>
          </div>
          <div className="divide-y divide-slate-800">
            {!recentOrdersRes.data?.length && (
              <p className="px-6 py-10 text-slate-600 text-sm text-center">No orders yet</p>
            )}
            {recentOrdersRes.data?.map((o: {
              id: string; total_amount: number; status: string; created_at: string; stores: unknown
            }) => {
              const store = Array.isArray(o.stores) ? o.stores[0] : o.stores
              const storeName = (store as { name?: string } | null)?.name ?? '—'
              return (
                <div key={o.id} className="px-6 py-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${statusDot[o.status] ?? 'bg-slate-600'}`} />
                    <div>
                      <p className="text-sm font-bold text-slate-200">{storeName}</p>
                      <p className="text-[10px] text-slate-500">{format(new Date(o.created_at), 'MMM d, HH:mm')} · {o.status}</p>
                    </div>
                  </div>
                  <span className="text-sm font-black text-emerald-400 font-mono">₹{o.total_amount}</span>
                </div>
              )
            })}
          </div>
        </section>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-4">
        <Link href="/admin/dashboard/stores" className="group bg-slate-900 border border-slate-800 hover:border-emerald-800 rounded-2xl p-6 transition-all">
          <Store size={24} className="text-emerald-500 mb-3" />
          <p className="text-white font-bold">Manage Stores</p>
          <p className="text-slate-500 text-xs mt-1">Add, edit, or remove store locations</p>
        </Link>
        <Link href="/admin/dashboard/analytics" className="group bg-slate-900 border border-slate-800 hover:border-emerald-800 rounded-2xl p-6 transition-all">
          <BarChart3 size={24} className="text-violet-400 mb-3" />
          <p className="text-white font-bold">Analytics</p>
          <p className="text-slate-500 text-xs mt-1">Scan history, tier breakdown, product health</p>
        </Link>
      </div>
    </div>
  )
}

