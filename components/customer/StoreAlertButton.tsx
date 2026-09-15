'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, BellRing, LoaderCircle } from 'lucide-react'

export function StoreAlertButton({ storeId, storeSlug, source }: { storeId: string; storeSlug: string; source: 'website' | 'store_qr' }) {
  const router = useRouter()
  const [status, setStatus] = useState<'idle' | 'loading' | 'subscribed'>('idle')
  const [error, setError] = useState('')

  async function subscribe() {
    setStatus('loading')
    setError('')

    try {
      const response = await fetch('/api/store-subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeId, source }),
      })

      if (response.status === 401) {
        router.push(`/auth/login?redirect=${encodeURIComponent(`/store/${storeSlug}${source === 'store_qr' ? '?source=store_qr' : ''}`)}`)
        return
      }

      const body = await response.json()
      if (!response.ok) throw new Error(body.error ?? 'Could not enable alerts')
      setStatus('subscribed')
    } catch (subscriptionError) {
      setStatus('idle')
      setError(subscriptionError instanceof Error ? subscriptionError.message : 'Could not enable alerts')
    }
  }

  return (
    <div className="flex flex-col items-start gap-2 sm:items-end">
      <button
        type="button"
        onClick={subscribe}
        disabled={status !== 'idle'}
        className="inline-flex items-center gap-2 rounded-xl bg-[#173d31] px-4 py-2.5 text-sm font-black text-white transition hover:bg-emerald-900 disabled:cursor-default disabled:bg-emerald-600"
      >
        {status === 'loading' ? <LoaderCircle size={17} className="animate-spin" /> : status === 'subscribed' ? <BellRing size={17} /> : <Bell size={17} />}
        {status === 'loading' ? 'Enabling alerts' : status === 'subscribed' ? 'Deal alerts enabled' : 'Notify me about deals'}
      </button>
      {source === 'store_qr' && status !== 'subscribed' && <p className="text-[11px] font-semibold text-emerald-700">In-store QR opt-in</p>}
      {error && <p role="alert" className="text-xs font-semibold text-red-600">{error}</p>}
    </div>
  )
}
