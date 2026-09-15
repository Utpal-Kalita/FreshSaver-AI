import { createServiceClient } from '@/lib/supabase/server'
import { requireSuperAdmin } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { format } from 'date-fns'
import { CheckCircle, XCircle, Clock, AlertTriangle, TrendingDown } from 'lucide-react'

export const dynamic = 'force-dynamic'

function TierBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-400 font-medium">{label}</span>
        <span className="text-slate-300 font-black font-mono">{count} <span className="text-slate-600 font-normal">({pct}%)</span></span>
      </div>
      <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export default async function AnalyticsPage() {
  try { await requireSuperAdmin() } catch { redirect('/login') }

  const db = createServiceClient()

  const [scansRes, storeBreakdownRes, nearExpiryRes] = await Promise.all([
    db.from('scan_logs')
      .select('id, scanned_at, status, total_products, tier_1_flagged, tier_2_flagged, expired_flagged, no_action, emails_sent, triggered_by, duration_ms, error_message')
      .order('scanned_at', { ascending: false })
      .limit(20),

    db.from('stores')
      .select('id, name, slug, products(discount_tier, is_expired)')
      .eq('is_active', true),

    db.from('products')
      .select('id, product_name, sku, expiry_date, discount_tier, discounted_price, original_price, stores(name)')
      .in('discount_tier', ['tier_1', 'tier_2'])
      .eq('is_active', true)
      .order('expiry_date', { ascending: true })
      .limit(20),
  ])
  const renderedAt = new Date()

  const scans = scansRes.data ?? []
  const totalScans = scans.length
  const successScans = scans.filter((s: { status: string }) => s.status === 'success').length
  const avgDuration = totalScans > 0
    ? Math.round(scans.reduce((a: number, s: { duration_ms: number }) => a + (s.duration_ms ?? 0), 0) / totalScans / 1000)
    : 0

  // Tier breakdown across all stores
  const allProducts = (storeBreakdownRes.data ?? []).flatMap((s: { products: { discount_tier: string; is_expired: boolean }[] }) => s.products ?? [])
  const tierCounts = {
    tier_1: allProducts.filter((p: { discount_tier: string }) => p.discount_tier === 'tier_1').length,
    tier_2: allProducts.filter((p: { discount_tier: string }) => p.discount_tier === 'tier_2').length,
    expired: allProducts.filter((p: { is_expired: boolean }) => p.is_expired).length,
    none: allProducts.filter((p: { discount_tier: string }) => p.discount_tier === 'none').length,
  }
  const totalProducts = allProducts.length

  // Per-store breakdown
  const storeStats = (storeBreakdownRes.data ?? []).map((store: {
    id: string; name: string; slug: string;
    products: { discount_tier: string; is_expired: boolean }[]
  }) => ({
    name: store.name,
    slug: store.slug,
    total: (store.products ?? []).length,
    t1: (store.products ?? []).filter(p => p.discount_tier === 'tier_1').length,
    t2: (store.products ?? []).filter(p => p.discount_tier === 'tier_2').length,
    expired: (store.products ?? []).filter(p => p.is_expired).length,
  })).sort((a: { total: number }, b: { total: number }) => b.total - a.total)

  return (
    <div className="max-w-6xl mx-auto space-y-10">
      <header className="pb-6 border-b border-slate-800">
        <h1 className="text-4xl font-black text-white tracking-tight font-mono mb-1">Analytics</h1>
        <p className="text-slate-500 text-sm">AI scan performance, tier distribution, and near-expiry insights</p>
      </header>

      {/* Scan summary cards */}
      <section>
        <h2 className="text-xs font-black text-slate-600 uppercase tracking-widest mb-4">AI Scan Engine</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Scans',    value: totalScans,     sub: 'all time',          color: 'text-white' },
            { label: 'Success Rate',   value: `${totalScans > 0 ? Math.round(successScans/totalScans*100) : 0}%`, sub: `${successScans} successful`, color: 'text-emerald-400' },
            { label: 'Avg Duration',   value: `${avgDuration}s`, sub: 'per scan',        color: 'text-blue-400' },
            { label: 'Near Expiry',    value: tierCounts.tier_1 + tierCounts.tier_2, sub: 'active discounts', color: 'text-orange-400' },
          ].map(c => (
            <div key={c.label} className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-600 mb-2">{c.label}</p>
              <p className={`text-3xl font-black font-mono ${c.color}`}>{c.value}</p>
              <p className="text-[10px] text-slate-600 mt-1">{c.sub}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Tier distribution */}
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <h2 className="text-xs font-black text-slate-600 uppercase tracking-widest mb-5">Platform Tier Distribution</h2>
          <div className="space-y-4">
            <TierBar label="Tier 1 — demand-aware (16–30 days)" count={tierCounts.tier_1} total={totalProducts} color="bg-orange-500" />
            <TierBar label="Tier 2 — final markdown (1–15 days)" count={tierCounts.tier_2} total={totalProducts} color="bg-red-500" />
            <TierBar label="Expired"                          count={tierCounts.expired} total={totalProducts} color="bg-slate-500" />
            <TierBar label="No discount needed"              count={tierCounts.none}   total={totalProducts} color="bg-emerald-700" />
          </div>
        </section>

        {/* Per-store breakdown */}
        <section className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-800">
            <h2 className="text-xs font-black text-slate-600 uppercase tracking-widest">Store Breakdown</h2>
          </div>
          <div className="divide-y divide-slate-800">
            {storeStats.length === 0 && (
              <p className="px-6 py-10 text-slate-600 text-sm text-center">No store data</p>
            )}
            {storeStats.map((s: { name: string; slug: string; total: number; t1: number; t2: number; expired: number }) => (
              <div key={s.slug} className="px-6 py-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-bold text-white">{s.name}</p>
                  <p className="text-[10px] text-slate-500">{s.total} products</p>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-black">
                  <span className="bg-orange-900/40 text-orange-400 px-2 py-0.5 rounded">T1:{s.t1}</span>
                  <span className="bg-red-900/40 text-red-400 px-2 py-0.5 rounded">T2:{s.t2}</span>
                  {s.expired > 0 && <span className="bg-slate-800 text-slate-400 px-2 py-0.5 rounded">EX:{s.expired}</span>}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Near-expiry products */}
      <section className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-800 flex items-center gap-2">
          <AlertTriangle size={16} className="text-orange-400" />
          <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">Near-Expiry Products (Active Deals)</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] font-black uppercase tracking-widest text-slate-600 border-b border-slate-800 text-left">
                <th className="px-6 py-3">Product</th>
                <th className="px-6 py-3">SKU</th>
                <th className="px-6 py-3">Store</th>
                <th className="px-6 py-3">Expiry</th>
                <th className="px-6 py-3">Tier</th>
                <th className="px-6 py-3 text-right">Price</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {nearExpiryRes.data?.map((p: {
                id: string; product_name: string; sku: string; expiry_date: string;
                discount_tier: string; discounted_price: number; original_price: number;
                stores: unknown
              }) => {
                const store = Array.isArray(p.stores) ? p.stores[0] : p.stores
                const storeName = (store as { name?: string } | null)?.name ?? '—'
                const daysLeft = Math.ceil((new Date(p.expiry_date).getTime() - renderedAt.getTime()) / 86400000)
                return (
                  <tr key={p.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-200 max-w-[200px] truncate">{p.product_name}</td>
                    <td className="px-6 py-4 font-mono text-[11px] text-slate-500">{p.sku}</td>
                    <td className="px-6 py-4 text-slate-400">{storeName}</td>
                    <td className="px-6 py-4">
                      <span className={`text-[11px] font-bold ${daysLeft <= 7 ? 'text-red-400' : daysLeft <= 15 ? 'text-orange-400' : 'text-slate-400'}`}>
                        {daysLeft <= 0 ? 'Today' : `${daysLeft}d`}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded ${
                        p.discount_tier === 'tier_2' ? 'bg-red-900/40 text-red-400' : 'bg-orange-900/40 text-orange-400'
                      }`}>
                        {p.discount_tier === 'tier_2' ? 'Tier 2' : 'Tier 1'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex flex-col items-end">
                        <span className="font-black text-emerald-400 font-mono">₹{p.discounted_price}</span>
                        <span className="text-[10px] text-slate-600 line-through font-mono">₹{p.original_price}</span>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {!nearExpiryRes.data?.length && (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-600">No active discounts</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Scan history table */}
      <section className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-800 flex items-center gap-2">
          <TrendingDown size={16} className="text-violet-400" />
          <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">Scan History (Last 20)</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] font-black uppercase tracking-widest text-slate-600 border-b border-slate-800 text-left">
                <th className="px-6 py-3">Time</th>
                <th className="px-6 py-3">Trigger</th>
                <th className="px-6 py-3 text-right">Scanned</th>
                <th className="px-6 py-3 text-right">T1</th>
                <th className="px-6 py-3 text-right">T2</th>
                <th className="px-6 py-3 text-right">Expired</th>
                <th className="px-6 py-3 text-right">Emails</th>
                <th className="px-6 py-3 text-right">Duration</th>
                <th className="px-6 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {scans.map((s: {
                id: string; scanned_at: string; triggered_by: string; total_products: number;
                tier_1_flagged: number; tier_2_flagged: number; expired_flagged: number;
                emails_sent: number; duration_ms: number; status: string; error_message?: string
              }) => (
                <tr key={s.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="px-6 py-4 text-slate-300 font-medium whitespace-nowrap">
                    {format(new Date(s.scanned_at), 'MMM d, HH:mm')}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded ${s.triggered_by === 'cron' ? 'bg-indigo-900/40 text-indigo-400' : 'bg-amber-900/40 text-amber-400'}`}>
                      {s.triggered_by}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right font-mono text-slate-400">{s.total_products}</td>
                  <td className="px-6 py-4 text-right font-mono text-orange-400 font-bold">{s.tier_1_flagged}</td>
                  <td className="px-6 py-4 text-right font-mono text-red-400 font-bold">{s.tier_2_flagged}</td>
                  <td className="px-6 py-4 text-right font-mono text-slate-500">{s.expired_flagged}</td>
                  <td className="px-6 py-4 text-right font-mono text-emerald-400">{s.emails_sent}</td>
                  <td className="px-6 py-4 text-right font-mono text-slate-500 text-[11px]">{(s.duration_ms / 1000).toFixed(1)}s</td>
                  <td className="px-6 py-4 text-center">
                    {s.status === 'success' ? (
                      <CheckCircle size={15} className="mx-auto text-emerald-500" />
                    ) : s.status === 'in_progress' ? (
                      <Clock size={15} className="mx-auto text-blue-400 animate-pulse" />
                    ) : (
                      <XCircle size={15} className="mx-auto text-red-400" />
                    )}
                  </td>
                </tr>
              ))}
              {!scans.length && (
                <tr><td colSpan={9} className="px-6 py-12 text-center text-slate-600">No scans recorded yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
