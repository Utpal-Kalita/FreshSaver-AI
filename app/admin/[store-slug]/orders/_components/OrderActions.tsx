'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, X, Loader2 } from 'lucide-react'

interface OrderActionsProps {
  orderId: string
  status: string
}

export default function OrderActions({ orderId, status }: OrderActionsProps) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState('')

  async function updateStatus(newStatus: string) {
    setLoading(newStatus)
    setError('')
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Failed to update order')
        return
      }
      router.refresh()
    } catch {
      setError('Something went wrong')
    } finally {
      setLoading(null)
    }
  }

  if (status === 'cancelled' || status === 'completed') {
    return <p className="text-xs text-gray-400 capitalize">{status}</p>
  }

  return (
    <div className="flex gap-2 flex-wrap">
      {error && <p className="w-full text-xs text-red-500">{error}</p>}

      {status === 'pending' && (
        <>
          <button
            onClick={() => updateStatus('accepted')}
            disabled={!!loading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white text-xs font-bold rounded-xl transition-colors disabled:opacity-50"
          >
            {loading === 'accepted' ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} strokeWidth={3} />}
            Accept
          </button>
          <button
            onClick={() => updateStatus('cancelled')}
            disabled={!!loading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold rounded-xl transition-colors disabled:opacity-50"
          >
            {loading === 'cancelled' ? <Loader2 size={12} className="animate-spin" /> : <X size={12} strokeWidth={3} />}
            Cancel
          </button>
        </>
      )}

      {status === 'accepted' && (
        <>
          <button
            onClick={() => updateStatus('completed')}
            disabled={!!loading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold rounded-xl transition-colors disabled:opacity-50"
          >
            {loading === 'completed' ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} strokeWidth={3} />}
            Mark Complete
          </button>
          <button
            onClick={() => updateStatus('cancelled')}
            disabled={!!loading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold rounded-xl transition-colors disabled:opacity-50"
          >
            {loading === 'cancelled' ? <Loader2 size={12} className="animate-spin" /> : <X size={12} strokeWidth={3} />}
            Cancel
          </button>
        </>
      )}
    </div>
  )
}
