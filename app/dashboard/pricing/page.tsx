import Link from 'next/link'
import { redirect } from 'next/navigation'
import { format } from 'date-fns'
import { Bot, BrainCircuit, CalendarClock, ChefHat, History, Mail, PackageSearch, ShieldCheck, Tags } from 'lucide-react'
import { createServiceClient } from '@/lib/supabase/server'
import { getServerUser, getStoreAdminRecord } from '@/lib/auth'
import { daysUntilDate } from '@/lib/date-utils'
import ScanButton from '../_components/ScanButton'
import { RecommendationActions } from '../_components/RecommendationActions'

export const dynamic = 'force-dynamic'

interface ExpiringProduct {
  id: string
  product_name: string
  sku: string
  expiry_date: string
  stock_quantity: number
  original_price: number
  discounted_price: number | null
  recommended_discount_pct: number | null
  discount_tier: string
}

interface ScanLog {
  id: string
  scanned_at: string
  triggered_by: string
  total_products: number
  tier_1_flagged: number
  tier_2_flagged: number
  emails_sent: number
  status: string
}

interface PendingRecommendation {
  id: string
  recommended_price: number
  recommended_discount_pct: number
  model_provider: string
  model_version: string
  evidence: {
    explanation?: string
    prediction_source?: string
    training_data?: string | null
    candidates?: Array<{
      discountPct: number
      lowUnits: number
      highUnits: number
      expectedMargin: number | null
      clearanceProbability: number | null
      factors: Array<{ feature: string; impact: number }>
    }>
  }
  ai_analysis: {
    provider?: string
    model?: string
    manager_summary?: string
    risk_signal?: string
  }
  campaign_copy?: {
    recipe?: {
      title?: string
      intro?: string
      ingredients?: string[]
      steps?: string[]
    }
  }
  products: {
    product_name: string
    sku: string
    stock_quantity: number
    expiry_date: string
  } | Array<{
    product_name: string
    sku: string
    stock_quantity: number
    expiry_date: string
  }> | null
}

function urgency(days: number) {
  if (days === 0) return { label: 'Today', className: 'bg-red-100 text-red-700' }
  if (days <= 3) return { label: `${days} days`, className: 'bg-red-100 text-red-700' }
  if (days <= 15) return { label: `${days} days`, className: 'bg-orange-100 text-orange-700' }
  if (days <= 30) return { label: `${days} days`, className: 'bg-amber-100 text-amber-700' }
  return { label: `${days} days`, className: 'bg-emerald-100 text-emerald-700' }
}

export default async function PricingPage() {
  const user = await getServerUser()
  if (!user) redirect('/login')
  const storeAdmin = await getStoreAdminRecord(user.id)
  if (!storeAdmin) redirect('/login')

  const today = new Date().toISOString().slice(0, 10)
  const supabase = createServiceClient()
  const [{ data: productData }, { data: scanData }, { data: recommendationData }] = await Promise.all([
    supabase
      .from('products')
      .select('id, product_name, sku, expiry_date, stock_quantity, original_price, discounted_price, recommended_discount_pct, discount_tier')
      .eq('store_id', storeAdmin.store_id)
      .eq('is_active', true)
      .gte('expiry_date', today)
      .order('expiry_date', { ascending: true })
      .limit(300),
    supabase
      .from('scan_logs')
      .select('id, scanned_at, triggered_by, total_products, tier_1_flagged, tier_2_flagged, emails_sent, status')
      .eq('store_id', storeAdmin.store_id)
      .order('scanned_at', { ascending: false })
      .limit(12),
    supabase
      .from('recommendations')
      .select('id, recommended_price, recommended_discount_pct, model_provider, model_version, evidence, ai_analysis, campaign_copy, products(product_name, sku, stock_quantity, expiry_date)')
      .eq('store_id', storeAdmin.store_id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  const products = (productData ?? []) as ExpiringProduct[]
  const scans = (scanData ?? []) as ScanLog[]
  const recommendations = (recommendationData ?? []) as PendingRecommendation[]
  const next30Days = products.filter(product => daysUntilDate(product.expiry_date) <= 30).length

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <section className="overflow-hidden rounded-3xl bg-[#173d31] p-6 text-white shadow-xl sm:p-8">
        <div className="flex flex-col gap-7 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-lime-300">Automated markdown workflow</p>
            <h1 className="mt-3 text-4xl font-black tracking-[-0.035em]">Pricing Log</h1>
            <p className="mt-3 text-sm leading-6 text-emerald-100/65">Review upcoming expiries, run the pricing agent, and follow each step from loading inventory to sending customer alerts.</p>
          </div>
          <div className="flex gap-3">
            <div className="rounded-2xl bg-white/10 px-4 py-3"><p className="text-[10px] font-black uppercase text-emerald-100/50">Upcoming</p><p className="mt-1 text-2xl font-black">{products.length}</p></div>
            <div className="rounded-2xl bg-lime-300 px-4 py-3 text-emerald-950"><p className="text-[10px] font-black uppercase opacity-55">Next 30 days</p><p className="mt-1 text-2xl font-black">{next30Days}</p></div>
          </div>
        </div>
        <div className="mt-7 border-t border-white/10 pt-6"><ScanButton /></div>
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between gap-4">
          <div><p className="text-xs font-black uppercase tracking-[0.16em] text-violet-600">Human review</p><h2 className="mt-2 text-2xl font-black">Pending AI recommendations</h2></div>
          <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-black text-violet-700">{recommendations.length} awaiting review</span>
        </div>
        {recommendations.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-emerald-950/15 bg-white/60 px-6 py-10 text-center"><ShieldCheck size={30} className="mx-auto text-emerald-300" /><p className="mt-3 font-black text-emerald-950/55">No recommendations awaiting approval</p><p className="mt-1 text-xs text-emerald-950/35">Run the agent to analyze the current inventory.</p></div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {recommendations.map(recommendation => {
              const product = Array.isArray(recommendation.products) ? recommendation.products[0] : recommendation.products
              const candidates = recommendation.evidence?.candidates ?? []
              const selected = candidates.find(candidate => candidate.discountPct === Number(recommendation.recommended_discount_pct))
              return (
                <article key={recommendation.id} className="overflow-hidden rounded-3xl bg-[#173d31] text-white shadow-sm">
                  <div className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-lime-300">{product?.sku ?? 'Product'}</p><h3 className="mt-1 text-xl font-black">{product?.product_name ?? 'Unknown product'}</h3><p className="mt-1 text-xs text-emerald-100/45">{product?.stock_quantity ?? 0} units · expires {product?.expiry_date ?? 'n/a'}</p></div>
                      <span className="rounded-full bg-lime-300 px-3 py-1 text-xs font-black text-emerald-950">{Number(recommendation.recommended_discount_pct)}% off</span>
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                      <div className="rounded-xl bg-white/10 p-3"><p className="text-[10px] text-emerald-100/45">New price</p><p className="mt-1 text-lg font-black">₹{Number(recommendation.recommended_price).toFixed(2)}</p></div>
                      <div className="rounded-xl bg-white/10 p-3"><p className="text-[10px] text-emerald-100/45">Predicted sales</p><p className="mt-1 text-lg font-black">{selected ? `${selected.lowUnits.toFixed(0)}-${selected.highUnits.toFixed(0)}` : 'n/a'}</p></div>
                      <div className="rounded-xl bg-white/10 p-3"><p className="text-[10px] text-emerald-100/45">Clear stock</p><p className="mt-1 text-lg font-black">{selected?.clearanceProbability == null ? 'n/a' : `${Math.round(selected.clearanceProbability * 100)}%`}</p></div>
                      <div className="rounded-xl bg-white/10 p-3"><p className="text-[10px] text-emerald-100/45">Expected margin</p><p className="mt-1 text-lg font-black">{selected?.expectedMargin == null ? 'n/a' : `₹${selected.expectedMargin.toFixed(0)}`}</p></div>
                    </div>

                    <div className="mt-4 rounded-2xl border border-violet-300/20 bg-violet-300/10 p-4">
                      <div className="flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-wider text-violet-200"><BrainCircuit size={14} />{recommendation.model_provider === 'xgboost' ? 'XGBoost prediction' : 'Heuristic fallback'}<span className="text-white/25">+</span><Bot size={14} />{recommendation.ai_analysis?.provider === 'gemini' ? `Gemini ${recommendation.ai_analysis.model ?? ''}` : 'Template explanation'}</div>
                      <p className="mt-2 text-sm leading-6 text-white/75">{recommendation.ai_analysis?.manager_summary ?? recommendation.evidence?.explanation ?? 'Review the model evidence before applying this price.'}</p>
                    </div>

                    {recommendation.campaign_copy?.recipe?.title && (
                      <div className="mt-3 rounded-2xl border border-orange-300/20 bg-orange-300/10 p-4">
                        <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wide text-orange-200"><ChefHat size={13} /> Customer recipe preview</p>
                        <p className="mt-1.5 text-sm font-black text-white">{recommendation.campaign_copy.recipe.title}</p>
                        {recommendation.campaign_copy.recipe.intro && <p className="mt-1 text-xs leading-5 text-orange-50/65">{recommendation.campaign_copy.recipe.intro}</p>}
                        <p className="mt-2 text-[10px] text-orange-100/45">{recommendation.campaign_copy.recipe.ingredients?.length ?? 0} ingredients · {recommendation.campaign_copy.recipe.steps?.length ?? 0} steps</p>
                      </div>
                    )}

                    {selected?.factors?.length ? <p className="mt-3 text-[10px] text-emerald-100/45">Top model factors: {selected.factors.slice(0, 3).map(factor => factor.feature.replaceAll('_', ' ')).join(', ')}</p> : null}
                    <div className="mt-5 flex items-end justify-between gap-4"><p className="text-[10px] text-emerald-100/35">Model {recommendation.model_version}<br />Training data: {recommendation.evidence?.training_data === 'synthetic_demo' ? 'synthetic demo only' : recommendation.evidence?.training_data ?? 'not applicable'}</p><RecommendationActions recommendationId={recommendation.id} /></div>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between">
          <div><p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-600">Expiry queue</p><h2 className="mt-2 text-2xl font-black">Upcoming product expiries</h2></div>
          <span className="hidden items-center gap-2 text-xs font-bold text-emerald-950/40 sm:flex"><CalendarClock size={15} /> Earliest first</span>
        </div>
        <div className="overflow-x-auto rounded-3xl border border-emerald-950/10 bg-white shadow-sm">
          <table className="w-full min-w-[900px] border-collapse text-sm">
            <thead><tr className="border-b border-emerald-950/10 bg-emerald-50/70 text-left text-[10px] font-black uppercase tracking-[0.14em] text-emerald-950/45"><th className="px-5 py-4">Product</th><th className="px-5 py-4">Expiry date</th><th className="px-5 py-4">Time left</th><th className="px-5 py-4 text-right">Stock</th><th className="px-5 py-4 text-right">Original</th><th className="px-5 py-4 text-right">Current price</th><th className="px-5 py-4 text-right">Discount</th></tr></thead>
            <tbody className="divide-y divide-emerald-950/5">
              {products.length === 0 && <tr><td colSpan={7} className="px-6 py-14 text-center"><PackageSearch size={32} className="mx-auto text-emerald-200" /><p className="mt-3 font-bold text-emerald-950/50">No upcoming expiries</p></td></tr>}
              {products.map(product => {
                const days = daysUntilDate(product.expiry_date)
                const status = urgency(days)
                const currentPrice = Number(product.discounted_price ?? product.original_price)
                const discount = Number(product.recommended_discount_pct) || Math.max(0, Math.round((1 - currentPrice / Number(product.original_price)) * 100))
                return <tr key={product.id} className="hover:bg-emerald-50/30"><td className="px-5 py-4"><p className="font-black">{product.product_name}</p><p className="mt-1 font-mono text-[10px] text-emerald-950/35">{product.sku}</p></td><td className="px-5 py-4 font-semibold text-emerald-950/60">{product.expiry_date}</td><td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${status.className}`}>{status.label}</span></td><td className="px-5 py-4 text-right font-bold">{product.stock_quantity}</td><td className="px-5 py-4 text-right text-emerald-950/40">₹{Number(product.original_price).toFixed(2)}</td><td className="px-5 py-4 text-right font-black text-emerald-800">₹{currentPrice.toFixed(2)}</td><td className="px-5 py-4 text-right font-black text-orange-600">{discount}%</td></tr>
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <div className="mb-4"><p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-600">Audit history</p><h2 className="mt-2 text-2xl font-black">Previous agent runs</h2></div>
        <div className="overflow-x-auto rounded-3xl border border-emerald-950/10 bg-white shadow-sm">
          <table className="w-full min-w-[760px] border-collapse text-sm">
            <thead><tr className="border-b border-emerald-950/10 bg-emerald-50/70 text-left text-[10px] font-black uppercase tracking-[0.14em] text-emerald-950/45"><th className="px-5 py-4">Run time</th><th className="px-5 py-4">Trigger</th><th className="px-5 py-4 text-right">Products</th><th className="px-5 py-4 text-right">Deals</th><th className="px-5 py-4 text-right">Emails</th><th className="px-5 py-4">Status</th><th className="px-5 py-4"></th></tr></thead>
            <tbody className="divide-y divide-emerald-950/5">
              {scans.length === 0 && <tr><td colSpan={7} className="px-6 py-12 text-center text-sm text-emerald-950/40"><History size={28} className="mx-auto mb-2 text-emerald-200" />No agent runs yet.</td></tr>}
              {scans.map(scan => <tr key={scan.id} className="hover:bg-emerald-50/30"><td className="px-5 py-4 font-bold">{format(new Date(scan.scanned_at), 'dd MMM yyyy, HH:mm')}</td><td className="px-5 py-4 text-xs font-bold capitalize text-emerald-950/45">{scan.triggered_by}</td><td className="px-5 py-4 text-right font-bold">{scan.total_products}</td><td className="px-5 py-4 text-right"><span className="inline-flex items-center gap-1 font-bold text-orange-600"><Tags size={13} />{scan.tier_1_flagged + scan.tier_2_flagged}</span></td><td className="px-5 py-4 text-right"><span className="inline-flex items-center gap-1 font-bold text-emerald-700"><Mail size={13} />{scan.emails_sent}</span></td><td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${scan.status === 'success' ? 'bg-emerald-100 text-emerald-700' : scan.status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>{scan.status.replace('_', ' ')}</span></td><td className="px-5 py-4 text-right"><Link href={`/dashboard/scans/${scan.id}`} className="text-xs font-black text-emerald-700">View details</Link></td></tr>)}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
