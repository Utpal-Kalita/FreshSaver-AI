import Link from 'next/link'
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  BellRing,
  Leaf,
  PackageSearch,
  ShieldCheck,
  ShoppingBasket,
  Sparkles,
  Store,
  Upload,
} from 'lucide-react'
import { DealCard } from '@/components/customer/DealCard'
import { StoreCard } from '@/components/customer/StoreCard'
import { hasSupabaseConfig } from '@/lib/env'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

interface Deal {
  id: string
  sku: string
  product_name: string
  brand: string | null
  category: string | null
  original_price: number
  discounted_price: number | null
  discount_tier: string | null
  image_url: string | null
  store_name: string | null
  store_slug: string | null
  store_id: string | null
}

interface StoreSummary {
  id: string
  name: string
  slug: string
  address: string | null
  city: string | null
  phone: string | null
  image_url: string | null
}

async function getLandingData() {
  if (!hasSupabaseConfig()) {
    return { deals: [] as Deal[], stores: [] as StoreSummary[] }
  }

  const supabase = await createClient()
  const [dealsResult, storesResult] = await Promise.all([
    supabase
      .from('products_public')
      .select('id, sku, product_name, brand, category, original_price, discounted_price, discount_tier, image_url, store_name, store_slug, store_id')
      .in('discount_tier', ['tier_1', 'tier_2'])
      .limit(6),
    supabase
      .from('stores')
      .select('id, name, slug, address, city, phone, image_url')
      .eq('is_active', true)
      .limit(4),
  ])

  return {
    deals: (dealsResult.data ?? []) as Deal[],
    stores: (storesResult.data ?? []) as StoreSummary[],
  }
}

const storySteps = [
  {
    number: '01',
    title: 'Spot food at risk',
    body: 'FreshSaver reads stock, expiry dates, and recent demand before good food becomes surplus.',
    icon: PackageSearch,
  },
  {
    number: '02',
    title: 'Choose the right intervention',
    body: 'Store owners compare explainable markdown options and keep control of every price change.',
    icon: BarChart3,
  },
  {
    number: '03',
    title: 'Connect it with a buyer',
    body: 'Store-controlled deals reach nearby shoppers who save money and rescue food through one simple marketplace.',
    icon: BellRing,
  },
]

export default async function HomePage() {
  const { deals, stores } = await getLandingData()
  const connected = hasSupabaseConfig()
  const shopperHref = connected ? '/deals' : '/demo'

  return (
    <div className="overflow-hidden bg-[#f6f3ea] text-[#173d31]">
      <section className="relative isolate border-b border-emerald-950/10">
        <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_82%_16%,rgba(190,242,100,0.42),transparent_27%),radial-gradient(circle_at_10%_82%,rgba(16,185,129,0.14),transparent_30%)]" />
        <div className="absolute inset-y-0 right-0 -z-10 hidden w-[44%] border-l border-emerald-950/10 bg-[#173d31] lg:block" />

        <div className="mx-auto grid min-h-[680px] max-w-7xl items-center gap-12 px-5 py-16 sm:px-8 lg:grid-cols-[1.08fr_.92fr] lg:px-10 lg:py-20">
          <div className="max-w-3xl">
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-emerald-800/15 bg-white/70 px-3 py-2 text-xs font-black uppercase tracking-[0.14em] text-emerald-800 shadow-sm backdrop-blur">
              <Leaf size={14} fill="currentColor" />
              Better prices. Less waste.
            </div>
            <h1 className="text-balance text-5xl font-black leading-[0.96] tracking-[-0.045em] text-[#12372c] sm:text-6xl lg:text-7xl">
              Good food deserves a buyer,
              <span className="block text-emerald-600">not a bin.</span>
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-emerald-950/65 sm:text-xl">
              FreshSaver helps local grocers act before food becomes waste, then brings those store-controlled deals to shoppers looking for fresh food at a fairer price.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                href={shopperHref}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#173d31] px-6 py-3.5 text-sm font-black text-white shadow-[0_12px_30px_rgba(23,61,49,0.18)] transition hover:-translate-y-0.5 hover:bg-emerald-900"
              >
                <ShoppingBasket size={18} />
                {connected ? 'Browse live deals' : 'Explore the product'}
                <ArrowRight size={17} />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-900/20 bg-white/70 px-6 py-3.5 text-sm font-black text-[#173d31] backdrop-blur transition hover:-translate-y-0.5 hover:bg-white"
              >
                <Store size={18} />
                Log in as store owner
              </Link>
            </div>

            <div className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-xs font-bold text-emerald-950/55">
              <span className="flex items-center gap-2"><BadgeCheck size={16} className="text-emerald-600" /> Store-controlled prices</span>
              <span className="flex items-center gap-2"><BadgeCheck size={16} className="text-emerald-600" /> Local pickup</span>
              <span className="flex items-center gap-2"><BadgeCheck size={16} className="text-emerald-600" /> Explainable recommendations</span>
            </div>
          </div>

          <div className="relative lg:pl-10">
            <div className="absolute -left-3 top-10 hidden rounded-2xl bg-lime-300 px-4 py-3 text-xs font-black text-emerald-950 shadow-xl lg:block">
              18 units need a decision
            </div>
            <div className="relative overflow-hidden rounded-[2rem] border border-white/15 bg-white p-4 shadow-2xl shadow-emerald-950/20 sm:p-5">
              <div className="rounded-[1.5rem] bg-[#f0f7ed] p-5 sm:p-7">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-emerald-700">Today&apos;s decision</p>
                    <h2 className="mt-2 text-2xl font-black tracking-tight">Organic whole milk</h2>
                    <p className="mt-1 text-sm text-emerald-950/50">18 units · 4 days remaining</p>
                  </div>
                  <span className="rounded-full bg-orange-100 px-3 py-1 text-[10px] font-black uppercase text-orange-700">Review</span>
                </div>

                <div className="mt-7 grid grid-cols-3 gap-2">
                  <div className="rounded-xl bg-white p-3 shadow-sm">
                    <p className="text-[10px] text-emerald-950/45">At current pace</p>
                    <p className="mt-1 text-xl font-black">6 units</p>
                  </div>
                  <div className="rounded-xl bg-white p-3 shadow-sm">
                    <p className="text-[10px] text-emerald-950/45">Likely leftover</p>
                    <p className="mt-1 text-xl font-black text-orange-600">12 units</p>
                  </div>
                  <div className="rounded-xl bg-[#173d31] p-3 text-white shadow-sm">
                    <p className="text-[10px] text-emerald-100/65">Suggested</p>
                    <p className="mt-1 text-xl font-black">20% off</p>
                  </div>
                </div>

                <div className="mt-6 rounded-2xl border border-emerald-900/10 bg-white p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-bold text-emerald-950/45">Recommended price</p>
                      <p className="mt-1 text-3xl font-black">₹67 <span className="text-sm font-semibold text-emerald-950/35 line-through">₹84</span></p>
                    </div>
                    <span className="grid size-12 place-items-center rounded-2xl bg-lime-200 text-emerald-900"><Sparkles size={22} /></span>
                  </div>
                  <p className="mt-4 border-l-2 border-lime-400 pl-3 text-xs leading-5 text-emerald-950/60">
                    This price balances expected sell-through with the value of stock likely to remain before expiry.
                  </p>
                </div>

                <div className="mt-4 flex items-center justify-between rounded-xl bg-emerald-600 px-4 py-3 text-white">
                  <span className="flex items-center gap-2 text-sm font-black"><ShieldCheck size={17} /> Owner stays in control</span>
                  <ArrowRight size={17} />
                </div>
              </div>
            </div>
            <div className="absolute -bottom-5 -right-2 rounded-2xl border border-emerald-900/10 bg-white px-4 py-3 shadow-xl sm:right-6">
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-950/40">When activated</p>
              <p className="mt-1 flex items-center gap-2 text-sm font-black"><BellRing size={15} className="text-emerald-600" /> Relevant shoppers matched</p>
            </div>
          </div>
        </div>
      </section>

      <section id="mission" className="scroll-mt-24 bg-white py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
          <div className="grid gap-10 lg:grid-cols-[.72fr_1.28fr] lg:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-600">Our mission</p>
              <h2 className="mt-4 text-4xl font-black leading-tight tracking-[-0.035em] text-[#173d31] sm:text-5xl">Make prevention easier than disposal.</h2>
            </div>
            <p className="max-w-2xl text-lg leading-8 text-emerald-950/60 lg:justify-self-end">
              Most surplus platforms begin after food has already been written off. FreshSaver acts earlier, giving independent stores a practical decision and shoppers a reason to choose that food in time.
            </p>
          </div>

          <div className="mt-14 grid gap-px overflow-hidden rounded-3xl border border-emerald-950/10 bg-emerald-950/10 md:grid-cols-3">
            {storySteps.map(({ number, title, body, icon: Icon }) => (
              <article key={number} className="group bg-[#fbfaf6] p-7 transition hover:bg-lime-50 sm:p-8">
                <div className="flex items-center justify-between">
                  <span className="grid size-12 place-items-center rounded-2xl bg-emerald-100 text-emerald-700 transition group-hover:bg-lime-300 group-hover:text-emerald-950"><Icon size={22} /></span>
                  <span className="text-sm font-black text-emerald-950/20">{number}</span>
                </div>
                <h3 className="mt-8 text-xl font-black">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-emerald-950/55">{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
          <div className="grid overflow-hidden rounded-[2rem] bg-[#173d31] text-white lg:grid-cols-[1.05fr_.95fr]">
            <div className="p-8 sm:p-12 lg:p-14">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-lime-300">Built for store owners</p>
              <h2 className="mt-4 max-w-xl text-4xl font-black leading-tight tracking-[-0.035em] sm:text-5xl">Turn an inventory export into decisions your team can trust.</h2>
              <p className="mt-5 max-w-xl text-base leading-7 text-emerald-100/65">
                No expensive hardware and no black-box pricing. Import inventory, review demand-aware recommendations, control offers, and follow each deal through pickup.
              </p>
              <Link href="/login" className="mt-8 inline-flex items-center gap-2 rounded-xl bg-lime-300 px-5 py-3 text-sm font-black text-emerald-950 transition hover:-translate-y-0.5 hover:bg-lime-200">
                Open the owner portal <ArrowRight size={17} />
              </Link>
            </div>
            <div className="grid border-t border-white/10 bg-emerald-950/35 sm:grid-cols-3 lg:grid-cols-1 lg:border-l lg:border-t-0">
              {[
                { icon: Upload, title: 'Import', body: 'Bring inventory in with a familiar CSV export.' },
                { icon: Sparkles, title: 'Review', body: 'See the proposed price, alternatives, and reasoning.' },
                { icon: ShoppingBasket, title: 'Rescue', body: 'Publish active deals and manage shopper pickup.' },
              ].map(({ icon: Icon, title, body }) => (
                <div key={title} className="flex gap-4 border-b border-white/10 p-7 last:border-b-0 lg:p-8">
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-white/10 text-lime-300"><Icon size={20} /></span>
                  <div><h3 className="font-black">{title}</h3><p className="mt-1 text-sm leading-6 text-emerald-100/55">{body}</p></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {deals.length > 0 && (
        <section className="bg-white py-20 sm:py-24">
          <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
            <div className="mb-8 flex items-end justify-between gap-5">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-600">Live near you</p>
                <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Food worth saving today</h2>
              </div>
              <Link href="/deals" className="hidden items-center gap-1 text-sm font-black text-emerald-700 hover:text-emerald-900 sm:flex">See all deals <ArrowRight size={16} /></Link>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {deals.map(product => <DealCard key={product.id} product={product} />)}
            </div>
            <Link href="/deals" className="mt-6 flex items-center justify-center gap-1 rounded-xl border border-emerald-900/15 py-3 text-sm font-black text-emerald-700 sm:hidden">See all deals <ArrowRight size={16} /></Link>
          </div>
        </section>
      )}

      {stores.length > 0 && (
        <section className="py-20 sm:py-24">
          <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
            <div className="mb-8 flex items-end justify-between gap-5">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-600">Community partners</p>
                <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Shop local. Waste less.</h2>
              </div>
              <Link href="/stores" className="hidden items-center gap-1 text-sm font-black text-emerald-700 hover:text-emerald-900 sm:flex">Find a store <ArrowRight size={16} /></Link>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {stores.map(store => <StoreCard key={store.id} store={store} />)}
            </div>
          </div>
        </section>
      )}

      <section className="bg-lime-300 py-16">
        <div className="mx-auto flex max-w-5xl flex-col items-center px-5 text-center">
          <Leaf size={30} fill="currentColor" />
          <h2 className="mt-5 text-4xl font-black tracking-[-0.035em] sm:text-5xl">A fairer outcome for food, stores, and shoppers.</h2>
          <p className="mt-4 max-w-2xl text-base leading-7 text-emerald-950/65">Every timely decision can protect store value, stretch a household budget, and keep good food in use.</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href={shopperHref} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#173d31] px-6 py-3.5 text-sm font-black text-white">Find a deal <ArrowRight size={17} /></Link>
            <Link href="/login" className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-950/20 bg-white/60 px-6 py-3.5 text-sm font-black text-emerald-950"><Store size={17} /> I own a store</Link>
          </div>
        </div>
      </section>

      <footer className="bg-[#102d25] px-5 py-8 text-emerald-100/60">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 text-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 font-black text-white"><Leaf size={17} fill="currentColor" className="text-lime-300" /> FreshSaver</div>
          <p>Protecting value before food becomes waste.</p>
          <div className="flex gap-5 font-bold"><Link href="/deals" className="hover:text-white">Deals</Link><Link href="/login" className="hover:text-white">Store owners</Link><Link href="/demo" className="hover:text-white">Product demo</Link></div>
        </div>
      </footer>
    </div>
  )
}
