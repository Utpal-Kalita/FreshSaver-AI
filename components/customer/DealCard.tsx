import Link from 'next/link'

interface Product {
  id: string
  sku: string
  product_name: string
  brand?: string | null
  category?: string | null
  original_price: number
  discounted_price: number | null
  discount_tier: string | null
  image_url?: string | null
  store_name?: string | null
  store_slug?: string | null
  store_id?: string | null
}

const tierColors = {
  tier_1: { badge: 'bg-orange-100 text-orange-700', icon: 'Expiring soon' },
  tier_2: { badge: 'bg-red-100 text-red-700', icon: 'Final markdown' },
}

export function DealCard({ product }: { product: Product }) {
  const tier = product.discount_tier as 'tier_1' | 'tier_2' | null
  const tierInfo = tier ? tierColors[tier] : null
  const price = product.discounted_price ?? product.original_price
  const discountPct = product.original_price > 0
    ? Math.max(0, Math.round((1 - price / product.original_price) * 100))
    : 0

  return (
    <Link href={`/product/${product.sku}${product.store_id ? `?store=${product.store_id}` : ''}`}>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group">
        {/* Image */}
        <div className="relative h-36 bg-gradient-to-br from-green-50 to-emerald-50">
          {product.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.image_url}
              alt={product.product_name}
              className="object-cover w-full h-full"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-1 bg-gray-100">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5M4.5 3h15A1.5 1.5 0 0121 4.5v15A1.5 1.5 0 0119.5 21h-15A1.5 1.5 0 013 19.5v-15A1.5 1.5 0 014.5 3z" />
              </svg>
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Unavailable Image</span>
            </div>
          )}
          {tierInfo && (
            <span className={`absolute top-2 left-2 text-xs font-bold px-2 py-0.5 rounded-full ${tierInfo.badge}`}>
              {discountPct}% OFF · {tierInfo.icon}
            </span>
          )}
        </div>

        {/* Info */}
        <div className="p-3">
          <p className="text-[11px] text-gray-400 uppercase tracking-wide font-medium mb-0.5">
            {product.category ?? product.brand ?? ''}
          </p>
          <h3 className="text-sm font-bold text-gray-800 leading-snug line-clamp-2 group-hover:text-green-600 transition-colors">
            {product.product_name}
          </h3>
          <div className="mt-2 flex items-center justify-between">
            <div>
              {product.discounted_price && product.discounted_price < product.original_price && (
                <p className="text-[11px] text-gray-400 line-through">₹{product.original_price.toFixed(2)}</p>
              )}
              <p className="text-base font-black text-green-600">₹{price.toFixed(2)}</p>
            </div>
            {product.store_name && (
              <p className="text-[10px] text-gray-400 text-right leading-tight max-w-[80px] truncate">
                {product.store_name}
              </p>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}
