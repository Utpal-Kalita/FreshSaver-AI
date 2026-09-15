import { createClient } from '@/lib/supabase/server'
import { DealCard } from '@/components/customer/DealCard'
import { StoreAlertButton } from '@/components/customer/StoreAlertButton'
import { MapPin, Phone, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function StorePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ source?: string }>
}) {
  const { slug } = await params
  const query = await searchParams
  const supabase = await createClient()

  const { data: store, error } = await supabase
    .from('stores')
    .select('id, name, slug, address, city, lat, lng, phone, image_url')
    .eq('slug', slug)
    .eq('is_active', true)
    .single()

  if (error || !store) notFound()

  const { data: products } = await supabase
    .from('products_public')
    .select('id, sku, product_name, brand, category, original_price, discounted_price, discount_tier, image_url, store_name, store_slug, store_id')
    .eq('store_slug', slug)
    .order('discount_tier', { ascending: true })

  const storeProducts = products ?? []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dealCount = (storeProducts as any[]).filter((p: any) => p.discount_tier === 'tier_1' || p.discount_tier === 'tier_2').length

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
      <Link href="/stores" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-green-600 mb-4 transition-colors">
        <ArrowLeft size={14} />
        All Stores
      </Link>

      {/* Store header */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-8">
        <div className="h-32 bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center">
          {store.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={store.image_url} alt={store.name} className="h-full w-full object-cover" />
          ) : (
            <span className="text-6xl">🏪</span>
          )}
        </div>
        <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
          <h1 className="text-2xl font-black text-gray-800">{store.name}</h1>
          <div className="flex flex-wrap gap-4 mt-3 text-sm text-gray-500">
            {(store.address || store.city) && (
              <span className="flex items-center gap-1.5">
                <MapPin size={14} className="text-green-500" />
                {[store.address, store.city].filter(Boolean).join(', ')}
              </span>
            )}
            {store.phone && (
              <span className="flex items-center gap-1.5">
                <Phone size={14} className="text-green-500" />
                {store.phone}
              </span>
            )}
          </div>
          {dealCount > 0 && (
            <p className="mt-3 inline-flex items-center gap-1 px-3 py-1 bg-green-50 text-green-700 rounded-full text-xs font-bold">
              🔥 {dealCount} active deal{dealCount !== 1 ? 's' : ''}
            </p>
          )}
          </div>
          <StoreAlertButton storeId={store.id} storeSlug={store.slug} source={query.source === 'store_qr' ? 'store_qr' : 'website'} />
        </div>
      </div>

      {/* Products */}
      <div>
        <h2 className="text-lg font-bold text-gray-800 mb-4">
          {storeProducts.length > 0 ? `${storeProducts.length} Products` : 'No products available'}
        </h2>
        {storeProducts.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {(storeProducts as any[]).map(product => (
              <DealCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="py-16 text-center text-gray-400">
            <p className="text-4xl mb-3">📦</p>
            <p className="font-semibold">No products listed yet</p>
          </div>
        )}
      </div>
    </div>
  )
}
