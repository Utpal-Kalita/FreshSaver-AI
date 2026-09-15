'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Bell,
  Brain,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Database,
  Leaf,
  PackageCheck,
  ShieldCheck,
  Sparkles,
  Store,
  Users,
  Zap,
} from 'lucide-react'
import { recommendMarkdown, type MarkdownRecommendation } from '@/lib/markdown-recommender'

interface DemoProduct {
  id: string
  name: string
  category: string
  stock: number
  price: number
  days: number
  recommendation: MarkdownRecommendation
}

const DEMO_PRODUCTS: DemoProduct[] = [
  { id: 'MILK-104', name: 'Organic whole milk', category: 'Dairy', stock: 18, price: 84, days: 4, velocity: 1.4, samples: 18, mae: 0.7 },
  { id: 'SPIN-317', name: 'Baby spinach 200g', category: 'Produce', stock: 24, price: 70, days: 3, velocity: 2.1, samples: 21, mae: 0.9 },
  { id: 'BREAD-208', name: 'Sourdough loaf', category: 'Bakery', stock: 12, price: 120, days: 9, velocity: 1.1, samples: 14, mae: 0.6 },
  { id: 'YOG-512', name: 'Greek yogurt', category: 'Dairy', stock: 6, price: 65, days: 12, velocity: 1.8, samples: 25, mae: 0.4 },
  { id: 'APPLE-905', name: 'Honeycrisp apples', category: 'Produce', stock: 10, price: 45, days: 34, velocity: 2.4, samples: 28, mae: 0.5 },
].map(({ velocity, samples, mae, ...product }) => ({
  ...product,
  recommendation: recommendMarkdown({
    productId: product.id,
    productName: product.name,
    category: product.category,
    originalPrice: product.price,
    stockQuantity: product.stock,
    daysUntilExpiry: product.days,
    forecast: {
      dailyVelocity: velocity,
      weekdayFactor: 1,
      sampleCount: samples,
      historyDays: 30,
      validationMae: mae,
      mode: 'store_history',
    },
  }),
}))

const DEMO_SHOPPERS = [
  { id: 1, categories: ['Dairy', 'Bakery'] },
  { id: 2, categories: ['Produce'] },
  { id: 3, categories: ['Dairy', 'Produce'] },
  { id: 4, categories: ['Bakery'] },
  { id: 5, categories: ['Dairy'] },
  { id: 6, categories: ['Produce', 'Bakery'] },
]

function money(value: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value)
}

export default function DemoPage() {
  const [selectedId, setSelectedId] = useState(DEMO_PRODUCTS[0].id)
  const [launched, setLaunched] = useState<string[]>([])
  const [redemptions, setRedemptions] = useState<Record<string, number>>({})
  const selected = DEMO_PRODUCTS.find(product => product.id === selectedId) ?? DEMO_PRODUCTS[0]
  const isLaunched = launched.includes(selected.id)
  const matchedShoppers = DEMO_SHOPPERS.filter(shopper => shopper.categories.includes(selected.category)).length
  const actionable = DEMO_PRODUCTS.filter(product => product.recommendation.action === 'markdown')
  const rescuePotential = actionable.reduce(
    (sum, product) => sum + Math.max(0, product.recommendation.expectedUnitsSold - product.recommendation.baselineUnitsSold),
    0,
  )
  const redeemedUnits = Object.values(redemptions).reduce((sum, value) => sum + value, 0)
  const campaignSales = DEMO_PRODUCTS.reduce(
    (sum, product) => sum + (redemptions[product.id] ?? 0) * product.recommendation.recommendedPrice,
    0,
  )

  function launchSelected() {
    if (!isLaunched && selected.recommendation.action === 'markdown') {
      setLaunched(current => [...current, selected.id])
    }
  }

  function redeemSelected() {
    if (!isLaunched) return
    setRedemptions(current => ({
      ...current,
      [selected.id]: Math.min(selected.stock, (current[selected.id] ?? 0) + 1),
    }))
  }

  return (
    <main className="min-h-screen bg-[#f4f1e9] text-[#173d31]">
      <div className="border-b border-emerald-900/10 bg-[#173d31] text-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-lime-300 text-emerald-950"><Leaf size={22} fill="currentColor" /></span>
            <div><p className="text-lg font-black tracking-tight">FreshSaver AI</p><p className="text-xs text-emerald-100/70">Hybrid AI markdown copilot for independent grocers</p></div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
            <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5">Public judge demo</span>
            <span className="flex items-center gap-1.5 rounded-full bg-lime-300 px-3 py-1.5 text-emerald-950"><ShieldCheck size={14} /> Synthetic data</span>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl space-y-6 px-5 py-8">
        <section className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-emerald-700"><Store size={14} /> Willow & Pine Market</p>
            <h1 className="max-w-3xl text-4xl font-black leading-[1.02] tracking-tight sm:text-5xl">Protect margin before food becomes waste.</h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-emerald-950/60">The connected agent predicts sell-through with XGBoost, applies deterministic pricing constraints, and uses Gemini to explain the evidence and prepare the campaign.</p>
          </div>
          <div className="flex items-center gap-2 rounded-2xl border border-emerald-900/10 bg-white px-4 py-3 text-xs font-bold shadow-sm">
            <span className="size-2 rounded-full bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,.12)]" />
            Offline fallback preview
          </div>
        </section>

        <section className="grid gap-px overflow-hidden rounded-2xl border border-emerald-900/10 bg-emerald-900/10 sm:grid-cols-4">
          {[
            { label: '1. Predict', value: 'XGBoost sell-through ranges', icon: Brain },
            { label: '2. Constrain', value: 'Price floors and expiry rules', icon: ShieldCheck },
            { label: '3. Generate', value: 'Gemini explanation and email', icon: Sparkles },
            { label: '4. Approve', value: 'Owner publishes and notifies', icon: Bell },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="flex items-center gap-3 bg-white p-4">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-emerald-100 text-emerald-700"><Icon size={17} /></span>
              <div><p className="text-[10px] font-black uppercase tracking-wider text-emerald-700">{label}</p><p className="mt-1 text-xs font-bold text-emerald-950/60">{value}</p></div>
            </div>
          ))}
        </section>
        <div className="-mt-3 flex flex-col items-center justify-center gap-2 text-center text-[10px] font-semibold text-emerald-950/40 sm:flex-row">This credential-free page uses synthetic inputs and the labeled deterministic fallback.<Link href="/login" className="font-black text-emerald-700 underline decoration-emerald-300 underline-offset-2">Open demo owner login for the connected AI workflow</Link></div>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'Decisions ready', value: actionable.length, note: 'manager approval required', icon: Brain, color: 'bg-violet-100 text-violet-700' },
            { label: 'Modeled sell-through', value: `${rescuePotential.toFixed(1)} units`, note: 'synthetic scenario estimate', icon: PackageCheck, color: 'bg-emerald-100 text-emerald-700' },
            { label: 'Offer redemptions', value: redeemedUnits, note: 'attributed demo events', icon: CheckCircle2, color: 'bg-blue-100 text-blue-700' },
            { label: 'Campaign sales', value: money(campaignSales), note: 'not claimed as incremental', icon: CircleDollarSign, color: 'bg-amber-100 text-amber-700' },
          ].map(({ label, value, note, icon: Icon, color }) => (
            <article key={label} className="flex items-start gap-3 rounded-2xl border border-emerald-900/10 bg-white p-4 shadow-sm">
              <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${color}`}><Icon size={19} /></span>
              <div><p className="text-xs font-semibold text-emerald-950/50">{label}</p><p className="mt-1 text-2xl font-black">{value}</p><p className="mt-1 text-[11px] text-emerald-950/40">{note}</p></div>
            </article>
          ))}
        </section>

        <section className="grid gap-5 xl:grid-cols-[1.25fr_.75fr]">
          <div className="overflow-hidden rounded-3xl border border-emerald-900/10 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-emerald-900/10 px-5 py-4">
              <div><p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-700">Priority queue</p><h2 className="mt-1 text-xl font-black">Inventory decisions</h2></div>
              <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-bold text-orange-700">{actionable.length} actionable</span>
            </div>
            <div className="divide-y divide-emerald-900/10">
              {DEMO_PRODUCTS.map(product => {
                const recommendation = product.recommendation
                const active = product.id === selected.id
                return (
                  <button key={product.id} onClick={() => setSelectedId(product.id)} className={`grid w-full grid-cols-[1fr_auto] items-center gap-4 px-5 py-4 text-left transition sm:grid-cols-[1.4fr_.7fr_.7fr_auto] ${active ? 'bg-emerald-50' : 'hover:bg-stone-50'}`}>
                    <div><p className="font-bold">{product.name}</p><p className="mt-1 text-xs text-emerald-950/45">{product.id} · {product.stock} units · {product.category}</p></div>
                    <div className="hidden sm:block"><p className="text-xs text-emerald-950/45">Expiry</p><p className="mt-1 text-sm font-bold">{product.days} days</p></div>
                    <div className="text-right sm:text-left"><p className="text-xs text-emerald-950/45">Decision</p><p className="mt-1 text-sm font-black text-emerald-700">{recommendation.discountPct > 0 ? `${recommendation.discountPct}% off` : 'Hold price'}</p></div>
                    <ChevronRight size={18} className="hidden text-emerald-900/30 sm:block" />
                  </button>
                )
              })}
            </div>
          </div>

          <aside className="rounded-3xl border border-emerald-900/10 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4 border-b border-emerald-900/10 pb-4">
               <div><p className="flex items-center gap-1.5 text-xs font-black uppercase tracking-[0.16em] text-violet-700"><Sparkles size={14} /> Decision preview</p><h2 className="mt-2 text-2xl font-black">{selected.name}</h2></div>
              <span className="rounded-full bg-red-100 px-2.5 py-1 text-[10px] font-black uppercase text-red-700">{selected.recommendation.tier.replace('_', ' ')}</span>
            </div>

            <div className="mt-5 flex items-end justify-between gap-4">
              <div><p className="text-xs text-emerald-950/45">Recommended price</p><p className="mt-1 text-3xl font-black">{money(selected.recommendation.recommendedPrice)}</p></div>
              {selected.recommendation.discountPct > 0 && <div className="text-right"><p className="text-sm text-emerald-950/35 line-through">{money(selected.price)}</p><p className="text-sm font-black text-emerald-700">{selected.recommendation.discountPct}% off</p></div>}
            </div>

            <p className="mt-4 rounded-xl border-l-4 border-violet-400 bg-violet-50 p-3 text-sm leading-6 text-violet-950/70">{selected.recommendation.explanation}</p>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <div className="rounded-xl bg-stone-100 p-3"><p className="text-[10px] text-emerald-950/45">Current pace</p><p className="mt-1 font-black">{selected.recommendation.baselineUnitsSold.toFixed(1)}</p></div>
              <div className="rounded-xl bg-stone-100 p-3"><p className="text-[10px] text-emerald-950/45">With offer</p><p className="mt-1 font-black">{selected.recommendation.expectedUnitsSold.toFixed(1)}</p></div>
              <div className="rounded-xl bg-stone-100 p-3"><p className="text-[10px] text-emerald-950/45">Confidence</p><p className="mt-1 font-black">{Math.round(selected.recommendation.confidence * 100)}%</p></div>
            </div>

            <div className="mt-4 rounded-xl border border-emerald-900/10 p-3">
              <div className="flex items-center gap-2 text-xs font-bold"><Database size={14} className="text-emerald-600" /> 30-day store history</div>
              <p className="mt-1 text-[11px] text-emerald-950/45">{selected.recommendation.modelMetrics.sampleCount} sales · backtest MAE {selected.recommendation.modelMetrics.validationMae?.toFixed(1)} units/day</p>
            </div>

            <div className="mt-4">
              <div className="mb-2 flex items-center justify-between"><p className="text-xs font-black uppercase tracking-wider text-emerald-950/45">Prices tested</p><p className="text-[10px] text-emerald-950/35">revenue-waste score</p></div>
              <div className="flex items-end gap-1.5">
                {selected.recommendation.candidates.map(candidate => {
                  const chosen = candidate.discountPct === selected.recommendation.discountPct
                  const maxScore = Math.max(...selected.recommendation.candidates.map(item => item.score))
                  const height = maxScore > 0 ? Math.max(18, (candidate.score / maxScore) * 62) : 18
                  return <div key={candidate.discountPct} className="flex flex-1 flex-col items-center gap-1"><span className={`w-full rounded-t ${chosen ? 'bg-emerald-500' : 'bg-emerald-100'}`} style={{ height }} /><span className={`text-[9px] ${chosen ? 'font-black text-emerald-700' : 'text-emerald-950/35'}`}>{candidate.discountPct}%</span></div>
                })}
              </div>
            </div>

            <button onClick={launchSelected} disabled={isLaunched || selected.recommendation.action !== 'markdown'} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#173d31] px-4 py-3 text-sm font-black text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-stone-200 disabled:text-stone-500">
              {isLaunched ? <><CheckCircle2 size={17} /> Offer live · {matchedShoppers} matched</> : selected.recommendation.action === 'markdown' ? <><Zap size={17} /> Approve and match shoppers</> : 'No markdown needed'}
            </button>
          </aside>
        </section>

        {isLaunched && (
          <section className="grid gap-4 rounded-3xl bg-[#173d31] p-5 text-white md:grid-cols-[1fr_auto] md:items-center">
            <div className="flex items-start gap-4"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-lime-300 text-emerald-950"><Bell size={20} /></span><div><p className="text-xs font-black uppercase tracking-[0.16em] text-lime-300">Customer activation</p><h2 className="mt-1 text-xl font-black">{matchedShoppers} opted-in {selected.category.toLowerCase()} shoppers matched</h2><p className="mt-1 text-sm text-emerald-100/60">Match count comes from demo preference records, not a category constant.</p></div></div>
            <button onClick={redeemSelected} className="flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-black text-emerald-950"><Users size={17} /> Simulate redemption</button>
          </section>
        )}
      </div>
    </main>
  )
}
