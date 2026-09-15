'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CreditCard, Lock, Check } from 'lucide-react'
import { clearCart, getCart, getCartTotal } from '@/lib/cart'

interface MockPaymentFormProps {
  storeId: string
}

export function MockPaymentForm({ storeId }: MockPaymentFormProps) {
  const router = useRouter()
  const [card, setCard] = useState({ number: '', expiry: '', cvv: '', name: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function formatCardNumber(v: string) {
    return v.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim()
  }

  function formatExpiry(v: string) {
    const digits = v.replace(/\D/g, '').slice(0, 4)
    if (digits.length > 2) return `${digits.slice(0, 2)}/${digits.slice(2)}`
    return digits
  }

  async function handlePay(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const cart = getCart()
      if (cart.length === 0) { setError('Your cart is empty'); return }

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId,
          items: cart.map(item => ({
            productId: item.productId,
            sku: item.sku,
            quantity: item.quantity,
          })),
        }),
      })

      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Payment failed'); return }

      clearCart()
      router.push(`/account?order=${data.orderId}&success=1`)
      router.refresh()
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handlePay} className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Lock size={16} className="text-green-500" />
        <span className="text-sm text-gray-500 font-medium">Secure mock payment (demo)</span>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">{error}</div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Name on Card</label>
        <input
          required
          value={card.name}
          onChange={e => setCard(c => ({ ...c, name: e.target.value }))}
          placeholder="John Doe"
          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-400 text-gray-800"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Card Number</label>
        <div className="relative">
          <CreditCard size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            required
            value={card.number}
            onChange={e => setCard(c => ({ ...c, number: formatCardNumber(e.target.value) }))}
            placeholder="4242 4242 4242 4242"
            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-400 text-gray-800 font-mono tracking-wider"
            maxLength={19}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Expiry</label>
          <input
            required
            value={card.expiry}
            onChange={e => setCard(c => ({ ...c, expiry: formatExpiry(e.target.value) }))}
            placeholder="MM/YY"
            maxLength={5}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-400 text-gray-800"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">CVV</label>
          <input
            required
            value={card.cvv}
            onChange={e => setCard(c => ({ ...c, cvv: e.target.value.replace(/\D/g, '').slice(0, 3) }))}
            placeholder="123"
            maxLength={3}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-400 text-gray-800"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-4 bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white font-bold rounded-2xl transition-colors flex items-center justify-center gap-2 text-base shadow-md"
      >
        {loading ? (
          'Processing…'
        ) : (
          <>
            <Check size={20} strokeWidth={3} />
            Pay ₹{getCartTotal().toFixed(2)} Now
          </>
        )}
      </button>

      <p className="text-center text-xs text-gray-400">
        🔒 This is a demo payment — no real charges are made
      </p>
    </form>
  )
}
