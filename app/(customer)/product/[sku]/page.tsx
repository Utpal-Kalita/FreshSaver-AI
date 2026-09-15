import { createServiceClient } from '@/lib/supabase/server'
import { AddToCartButton } from '@/components/customer/AddToCartButton'
import { ArrowLeft, MapPin, Package } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

const tierLabels: Record<string, { label: string; color: string }> = {
  tier_1: { label: 'Expiring Soon', color: 'bg-orange-100 text-orange-700' },
  tier_2: { label: 'Final Markdown', color: 'bg-red-100 text-red-700' },
}

export default async function ProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ sku: string }>
  searchParams: Promise<{ store?: string }>
}) {
  const { sku } = await params
  const { store } = await searchParams
  const supabase = createServiceClient()

  let productQuery = supabase
    .from('products_public')
    .select('*')
    .eq('sku', sku)
  if (store) productQuery = productQuery.eq('store_id', store)
  const { data: products, error } = await productQuery.limit(1)
  const product = products?.[0]

  if (error || !product) notFound()

  const tierInfo = product.discount_tier ? tierLabels[product.discount_tier] : null
  const price = product.discounted_price ?? product.original_price
  const hasDiscount = product.discounted_price && product.discounted_price < product.original_price
  const discountPct = product.original_price > 0
    ? Math.max(0, Math.round((1 - price / product.original_price) * 100))
    : 0

  // Build store object for AddToCartButton (need store id from stores table)
  const { data: storeData } = product.store_id
    ? await supabase.from('stores').select('id, name, slug').eq('id', product.store_id).single()
    : { data: null }

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 py-6">
      <Link href="/deals" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-green-600 mb-4 transition-colors">
        <ArrowLeft size={14} />
        Back to Deals
      </Link>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="md:flex">
          {/* Image */}
          <div className="relative h-64 md:h-auto md:w-1/2 bg-gradient-to-br from-green-50 to-emerald-50 flex-shrink-0">
            {product.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={product.image_url}
                alt={product.product_name}
                className="object-contain w-full h-full p-6"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-gray-100">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-14 h-14 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5M4.5 3h15A1.5 1.5 0 0121 4.5v15A1.5 1.5 0 0119.5 21h-15A1.5 1.5 0 013 19.5v-15A1.5 1.5 0 014.5 3z" />
                </svg>
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Unavailable Image</span>
              </div>
            )}
            {tierInfo && (
              <span className={`absolute top-4 left-4 px-3 py-1 rounded-full text-sm font-bold ${tierInfo.color}`}>
                {discountPct}% OFF · {tierInfo.label}
              </span>
            )}
          </div>

          {/* Details */}
          <div className="p-6 md:p-8 flex flex-col gap-4">
            <div>
              {product.category && (
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">{product.category}</p>
              )}
              <h1 className="text-2xl font-black text-gray-800 leading-tight">{product.product_name}</h1>
              {product.brand && <p className="text-sm text-gray-500 mt-1">by {product.brand}</p>}
            </div>

            {product.description && (
              <p className="text-gray-600 text-sm leading-relaxed">{product.description}</p>
            )}

            {/* Price */}
            <div className="bg-gray-50 rounded-2xl p-4">
              {hasDiscount && (
                <p className="text-sm text-gray-400 line-through mb-0.5">₹{product.original_price.toFixed(2)}</p>
              )}
              <p className="text-3xl font-black text-green-600">₹{price.toFixed(2)}</p>
              {product.unit && <p className="text-xs text-gray-400 mt-0.5">per {product.unit}</p>}
            </div>

            {/* Stock */}
            {product.stock_quantity !== null && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Package size={14} />
                {product.stock_quantity > 0
                  ? `${product.stock_quantity} units available`
                  : <span className="text-red-500 font-semibold">Out of stock</span>}
              </div>
            )}

            {/* Store info */}
            {product.store_name && (
              <Link href={`/store/${product.store_slug}`} className="flex items-center gap-2 text-sm text-gray-500 hover:text-green-600 transition-colors">
                <MapPin size={14} className="text-green-400" />
                <span>
                  <span className="font-semibold text-gray-700">{product.store_name}</span>
                  {product.store_city && <span> · {product.store_city}</span>}
                </span>
              </Link>
            )}

            {/* Add to cart */}
            {product.stock_quantity > 0 && storeData ? (
              <AddToCartButton
                product={{
                  id: product.id,
                  sku: product.sku,
                  product_name: product.product_name,
                  discounted_price: product.discounted_price,
                  original_price: product.original_price,
                  image_url: product.image_url,
                }}
                store={{
                  id: storeData.id,
                  slug: storeData.slug,
                  name: storeData.name,
                }}
              />
            ) : (
              <div className="py-3 bg-gray-100 text-gray-400 text-center font-semibold rounded-2xl text-sm">
                {!storeData ? 'Store info unavailable' : 'Out of stock'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
