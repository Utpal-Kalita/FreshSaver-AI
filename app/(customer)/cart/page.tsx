'use client'

import { useSyncExternalStore } from 'react'
import { getCart, getServerCart, removeFromCart, subscribeCart, updateQuantity, getCartTotal } from '@/lib/cart'
import Link from 'next/link'
import { Trash2, Plus, Minus, ShoppingCart } from 'lucide-react'

export default function CartPage() {
  const cart = useSyncExternalStore(subscribeCart, getCart, getServerCart)

  if (cart.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <ShoppingCart size={56} className="mx-auto text-gray-200 mb-4" />
        <h1 className="text-2xl font-black text-gray-800 mb-2">Your cart is empty</h1>
        <p className="text-gray-500 mb-6">Browse deals and add items to get started</p>
        <Link href="/deals" className="inline-block px-6 py-3 bg-green-500 text-white font-bold rounded-xl hover:bg-green-600 transition-colors">
          Browse Deals
        </Link>
      </div>
    )
  }

  const total = getCartTotal(cart)
  const storeName = cart[0]?.storeName
  const storeSlug = cart[0]?.storeSlug
  const storeId = cart[0]?.storeId

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-black text-gray-800 mb-1">Your Cart</h1>
      {storeName && (
        <p className="text-sm text-gray-500 mb-6">
          From{' '}
          <Link href={`/store/${storeSlug}`} className="text-green-600 font-semibold hover:underline">
            {storeName}
          </Link>
        </p>
      )}

      <div className="space-y-3 mb-6">
        {cart.map(item => (
          <div key={item.sku} className="flex items-center gap-3 bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="w-14 h-14 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0 overflow-hidden">
              {item.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.imageUrl} alt={item.productName} className="object-cover w-14 h-14" />
              ) : (
                <span className="text-2xl">🛒</span>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-800 truncate">{item.productName}</p>
              <p className="text-xs text-gray-500">₹{item.unitPrice.toFixed(2)} each</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => updateQuantity(item.sku, item.quantity - 1)}
                className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition-colors"
              >
                <Minus size={12} />
              </button>
              <span className="w-6 text-center text-sm font-bold text-gray-800">{item.quantity}</span>
              <button
                onClick={() => updateQuantity(item.sku, item.quantity + 1)}
                className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition-colors"
              >
                <Plus size={12} />
              </button>
            </div>

            <div className="text-right ml-2">
              <p className="text-sm font-black text-green-600">₹{(item.unitPrice * item.quantity).toFixed(2)}</p>
              <button
                onClick={() => removeFromCart(item.sku)}
                className="mt-1 text-red-400 hover:text-red-600 transition-colors"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <span className="text-gray-600 font-semibold">Total</span>
          <span className="text-2xl font-black text-green-600">₹{total.toFixed(2)}</span>
        </div>
        <Link
          href={`/checkout?store=${storeId}`}
          className="block w-full py-3.5 bg-green-500 hover:bg-green-600 text-white font-bold text-center rounded-2xl transition-colors shadow-md"
        >
          Proceed to Checkout →
        </Link>
      </div>
    </div>
  )
}
