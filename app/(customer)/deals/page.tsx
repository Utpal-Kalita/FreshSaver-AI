import { createClient } from '@/lib/supabase/server'
import { DealCard } from '@/components/customer/DealCard'
import { DealFilters } from '@/components/customer/DealFilters'
import { Suspense } from 'react'
import { hasSupabaseConfig } from '@/lib/env'

export const dynamic = 'force-dynamic'

export default async function DealsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; tier?: string; store?: string; q?: string }>
}) {
  const params = await searchParams
  if (!hasSupabaseConfig()) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center md:px-6">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-600">Marketplace preview</p>
        <h1 className="mt-3 text-3xl font-black text-[#173d31]">Live deals will appear here.</h1>
        <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-emerald-950/55">Connect FreshSaver to a store inventory to publish active, store-controlled markdowns.</p>
      </div>
    )
  }

  const supabase = await createClient()

  let query = supabase
    .from('products_public')
    .select('id, sku, product_name, brand, category, original_price, discounted_price, discount_tier, image_url, store_name, store_slug, store_id')
    .in('discount_tier', ['tier_1', 'tier_2'])
    .order('discount_tier', { ascending: true })

  if (params.category) {
    query = query.ilike('category', params.category)
  }
  if (params.tier) {
    query = query.eq('discount_tier', params.tier)
  }
  if (params.store) {
    query = query.eq('store_slug', params.store)
  }
  if (params.q) {
    query = query.ilike('product_name', `%${params.q}%`)
  }

  const { data: products } = await query.limit(48)

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-gray-800">Live Deals</h1>
        <p className="text-gray-500 text-sm">Products discounted to prevent food waste</p>
      </div>

      <Suspense>
        <DealFilters />
      </Suspense>

      <div className="mt-6">
        {!products || products.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <p className="text-4xl mb-3">🔍</p>
            <p className="font-semibold">No deals found</p>
            <p className="text-sm mt-1">Try adjusting your filters</p>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-500 mb-4">{products.length} deals found</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {(products as any[]).map(product => (
                <DealCard key={product.id} product={product} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
