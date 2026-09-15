import { createServiceClient } from '@/lib/supabase/server'
import { format } from 'date-fns'
import { notFound, redirect } from 'next/navigation'
import { TierBadge } from '@/components/TierBadge'
import Link from 'next/link'
import { Bot, Brain, BrainCircuit, Database, ShieldCheck } from 'lucide-react'
import { getServerUser, getStoreAdminRecord } from '@/lib/auth'

interface CandidateEvidence {
  discountPct: number
  expectedUnitsSold: number
  expectedWaste: number
  expectedRevenue: number
  expectedMargin?: number | null
  lowUnits?: number
  highUnits?: number
  clearanceProbability?: number | null
  predictionSource?: 'xgboost' | 'heuristic'
  factors?: Array<{ feature: string; impact: number }>
  score: number
}

interface RecommendationEvidence {
  action?: string
  explanation?: string
  model_mode?: 'store_history' | 'category_prior'
  prediction_source?: 'xgboost' | 'heuristic'
  training_data?: 'real' | 'synthetic_demo' | 'mixed' | null
  model_metrics?: { sampleCount?: number; validationMae?: number | null }
  ai_analysis?: { provider?: 'gemini' | 'template'; model?: string; manager_summary?: string; risk_signal?: string }
  inputs?: { days_until_expiry?: number; stock_quantity?: number; baseline_units_sold?: number; expected_units_sold?: number }
  candidates?: CandidateEvidence[]
}

interface ScanResultRecord {
  id: string
  sku: string
  tier_before: string
  tier_after: string
  price_before: number
  price_after: number
  recommended_discount_pct: number | null
  recommendation_confidence: number | null
  recommendation_version: string | null
  recommendation_reason: RecommendationEvidence | null
}

export default async function ScanDetailPage({ params }: { params: Promise<{ id: string }> }) {
 const { id } = await params
 const user = await getServerUser()
 if (!user) redirect('/login')
 const storeAdmin = await getStoreAdminRecord(user.id)
 if (!storeAdmin) redirect('/login')
 const supabase = createServiceClient()

 const { data: scan } = await supabase.from('scan_logs').select('*').eq('id', id).eq('store_id', storeAdmin.store_id).single()
 if (!scan) notFound()

 const { data: results } = await supabase
 .from('scan_product_results')
 .select('*')
 .eq('scan_id', id)
 .order('created_at', { ascending: true })

 return (
 <div className="space-y-8">
 <div>
  <Link href="/dashboard/pricing" className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-emerald-400 hover:text-primary transition-colors mb-4 group">
  <span className="group-hover:-translate-x-1 transition-transform">←</span> Back to Pricing Log
 </Link>
 <div className="flex flex-col gap-1 pb-6 border-b border-emerald-50">
 <h1 className="text-3xl font-black text-primary tracking-tight font-mono">Scan Detail</h1>
 <p className="text-sm text-emerald-400 font-medium">
 Executed on {format(new Date(scan.scanned_at), 'MMMM d, yyyy HH:mm')} • {scan.triggered_by}
 </p>
 </div>
 </div>

 <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
 {[
 { label: 'Total Scanned', value: scan.total_products, color: 'text-primary bg-primary/5' },
 { label: 'Tier 1 Flagged', value: scan.tier_1_flagged, color: 'text-orange-600 bg-orange-50' },
 { label: 'Tier 2 Flagged', value: scan.tier_2_flagged, color: 'text-red-600 bg-red-50' },
 { label: 'Items Expired', value: scan.expired_flagged, color: 'text-slate-400 bg-slate-50' },
 { label: 'Emails Sent', value: scan.emails_sent, color: 'text-emerald-600 bg-emerald-50' },
 ].map(s => (
 <div key={s.label} className="bg-white border border-emerald-100 rounded-3xl p-6 text-center shadow-sm">
 <p className={`text-3xl font-black mb-1 font-mono ${s.color.split(' ')[0]}`}>{s.value}</p>
 <p className="text-[10px] font-black uppercase text-emerald-300 tracking-tighter">{s.label}</p>
 </div>
 ))}
 </div>

 {scan.error_message && (
 <div className="bg-red-50 border border-red-100 rounded-2xl p-4 flex gap-3 text-red-600">
 <div className="text-sm">
 <p className="font-bold">Scan Error Reported</p>
 <p className="opacity-80">{scan.error_message}</p>
 </div>
 </div>
 )}

 <section className="space-y-4">
 <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
  <div>
   <h2 className="text-xs font-black text-emerald-400 uppercase tracking-[0.2em]">Recommendation Evidence ({results?.length ?? 0})</h2>
   <p className="mt-2 text-sm text-slate-500">Every evaluated price is preserved for audit and manager review.</p>
  </div>
  <span className="inline-flex items-center gap-2 rounded-full bg-violet-50 px-3 py-1.5 text-xs font-bold text-violet-700">
   <ShieldCheck size={14} /> Explainable by design
  </span>
 </div>
 <div className="bg-white rounded-3xl border border-emerald-100 shadow-sm overflow-hidden overflow-x-auto">
 <table className="w-full text-sm border-collapse">
 <thead>
 <tr className="bg-emerald-50/50 text-emerald-900/50 text-[10px] font-black uppercase tracking-[0.15em] text-left border-b border-emerald-50">
 <th className="px-6 py-4 font-black">SKU</th>
 <th className="px-6 py-4 font-black">Before</th>
 <th className="px-6 py-4 font-black">After</th>
 <th className="px-6 py-4 font-black text-right">Price Decision</th>
 <th className="px-6 py-4 font-black">Why This Price</th>
 <th className="px-6 py-4 font-black">Model Evidence</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-emerald-50">
 {!results?.length && (
 <tr><td colSpan={6} className="px-6 py-16 text-center text-emerald-300">No recommendations were recorded in this scan.</td></tr>
 )}
 {(results as ScanResultRecord[] | null)?.map((r) => {
  const evidence = r.recommendation_reason
  const candidates = evidence?.candidates ?? []
  return (
 <tr key={r.id} className="hover:bg-emerald-50/30 transition-colors group">
 <td className="px-6 py-5 font-mono text-[11px] font-bold text-slate-500 bg-slate-50/50 rounded-lg max-w-[120px]">{r.sku}</td>
 <td className="px-6 py-5"><TierBadge tier={r.tier_before} /></td>
 <td className="px-6 py-5"><TierBadge tier={r.tier_after} discountPct={r.recommended_discount_pct} /></td>
 <td className="px-6 py-5 text-right">
  <span className="block text-[10px] text-slate-400 line-through">₹{Number(r.price_before).toFixed(2)}</span>
  <span className="font-black text-primary font-mono">₹{Number(r.price_after).toFixed(2)}</span>
 </td>
 <td className="px-6 py-5 min-w-[280px]">
  <div className="flex items-start gap-2">
   <Brain size={15} className="mt-0.5 shrink-0 text-violet-500" />
   <div>
     <p className="text-xs font-semibold leading-relaxed text-slate-700">{evidence?.explanation ?? 'Legacy tier result without recommendation evidence.'}</p>
     {evidence?.ai_analysis?.manager_summary && (
      <div className="mt-2 rounded-xl bg-violet-50 p-3">
       <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wide text-violet-700">
        {evidence.ai_analysis.provider === 'gemini' ? <Bot size={12} /> : <Brain size={12} />}
        {evidence.ai_analysis.provider === 'gemini' ? `Gemini · ${evidence.ai_analysis.model}` : 'Template fallback'}
       </p>
       <p className="mt-1 text-xs leading-relaxed text-violet-950/70">{evidence.ai_analysis.manager_summary}</p>
      </div>
     )}
    {candidates.length > 0 && (
     <p className="mt-1 text-[10px] text-slate-400">Compared {candidates.length} prices from {Math.min(...candidates.map(item => item.discountPct))}% to {Math.max(...candidates.map(item => item.discountPct))}% off.</p>
    )}
   </div>
  </div>
 </td>
 <td className="px-6 py-5 min-w-[180px]">
   <div className="flex items-center gap-2 text-xs font-bold text-slate-600">{evidence?.prediction_source === 'xgboost' ? <BrainCircuit size={14} className="text-violet-500" /> : <Database size={14} className="text-emerald-500" />}{evidence?.prediction_source === 'xgboost' ? 'XGBoost demand model' : evidence?.model_mode === 'store_history' ? 'Store-history heuristic' : 'Cold-start fallback'}</div>
   <p className="mt-1 text-[10px] text-slate-400">{evidence?.model_metrics?.sampleCount ?? 0} sales · {r.recommendation_confidence == null ? 'n/a' : `${Math.round(r.recommendation_confidence * 100)}%`} confidence</p>
   {evidence?.training_data && <p className="mt-1 text-[10px] text-slate-400">Training data: {evidence.training_data.replace('_', ' ')}</p>}
  {evidence?.model_metrics?.validationMae != null && <p className="mt-1 text-[10px] text-slate-400">Backtest MAE {evidence.model_metrics.validationMae.toFixed(2)} units/day</p>}
 </td>
 </tr>
  )})}
 </tbody>
 </table>
 </div>
 </section>
 </div>
 )
}
