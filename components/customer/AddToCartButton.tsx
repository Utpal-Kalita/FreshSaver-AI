'use client'

import { useState } from 'react'
import { addToCart, CartItem } from '@/lib/cart'
import { ShoppingCart, Check } from 'lucide-react'

interface AddToCartButtonProps {
  product: {
    id: string
    sku: string
    product_name: string
    discounted_price: number | null
    original_price: number
    image_url?: string | null
  }
  store: {
    id: string
    slug: string
    name: string
  }
}

export function AddToCartButton({ product, store }: AddToCartButtonProps) {
  const [added, setAdded] = useState(false)
  const [showClearWarning, setShowClearWarning] = useState(false)

  function handleAdd() {
    const item: CartItem = {
      productId: product.id,
      sku: product.sku,
      productName: product.product_name,
      storeId: store.id,
      storeSlug: store.slug,
      storeName: store.name,
      quantity: 1,
      unitPrice: product.discounted_price ?? product.original_price,
      imageUrl: product.image_url ?? undefined,
    }

    const { cleared } = addToCart(item)

    if (cleared) {
      setShowClearWarning(true)
      setTimeout(() => setShowClearWarning(false), 3000)
    }

    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  return (
    <div>
      {showClearWarning && (
        <div className="mb-3 p-3 bg-orange-50 border border-orange-200 rounded-xl text-orange-700 text-sm">
          🛒 Previous cart cleared — you can only order from one store at a time.
        </div>
      )}
      <button
        onClick={handleAdd}
        className={`w-full py-3.5 flex items-center justify-center gap-2 font-bold rounded-2xl transition-all duration-300 ${
          added
            ? 'bg-green-100 text-green-700 border-2 border-green-300'
            : 'bg-green-500 hover:bg-green-600 text-white shadow-md hover:shadow-lg'
        }`}
      >
        {added ? (
          <>
            <Check size={20} strokeWidth={3} />
            Added to Cart!
          </>
        ) : (
          <>
            <ShoppingCart size={20} />
            Add to Cart
          </>
        )}
      </button>
    </div>
  )
}
