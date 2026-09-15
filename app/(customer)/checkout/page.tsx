'use client'

import { useEffect, useSyncExternalStore } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { getCart, getServerCart, getCartTotal, subscribeCart } from '@/lib/cart'
import { MockPaymentForm } from '@/components/customer/MockPaymentForm'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Suspense } from 'react'

function CheckoutContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const storeId = searchParams.get('store')
  const cart = useSyncExternalStore(subscribeCart, getCart, getServerCart)

  useEffect(() => {
    if (cart.length === 0) { router.push('/cart'); return }
    if (storeId && cart[0]?.storeId !== storeId) router.push('/cart')
  }, [cart, router, storeId])

  if (!storeId || cart.length === 0) return null

  return (
    <div className="max-w-xl mx-auto px-4 py-6">
      <Link href="/cart" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-green-600 mb-4 transition-colors">
        <ArrowLeft size={14} />
        Back to Cart
      </Link>

      <h1 className="text-2xl font-black text-gray-800 mb-6">Checkout</h1>

      {/* Order summary */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-5">
        <h2 className="font-bold text-gray-700 mb-3">Order Summary</h2>
        <div className="space-y-2">
          {cart.map(item => (
            <div key={item.sku} className="flex justify-between text-sm">
              <span className="text-gray-600 truncate max-w-[200px]">
                {item.productName} × {item.quantity}
              </span>
              <span className="font-semibold text-gray-800 ml-2">
                ₹{(item.unitPrice * item.quantity).toFixed(2)}
              </span>
            </div>
          ))}
        </div>
        <div className="border-t border-gray-100 mt-3 pt-3 flex justify-between">
          <span className="font-bold text-gray-700">Total</span>
          <span className="text-xl font-black text-green-600">₹{getCartTotal(cart).toFixed(2)}</span>
        </div>
      </div>

      {/* Payment form */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h2 className="font-bold text-gray-700 mb-4">Payment Details</h2>
        <MockPaymentForm storeId={storeId} />
      </div>
    </div>
  )
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-400">Loading checkout…</div>}>
      <CheckoutContent />
    </Suspense>
  )
}
