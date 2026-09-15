'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LoaderCircle, PlayCircle, Store, UserRound } from 'lucide-react'

export function DemoLoginButton({ role }: { role: 'owner' | 'customer' }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const isOwner = role === 'owner'
  const Icon = isOwner ? Store : UserRound

  async function enterDemo() {
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth/demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error ?? 'Demo login is unavailable')
      router.push(body.redirectTo)
      router.refresh()
    } catch (demoError) {
      setError(demoError instanceof Error ? demoError.message : 'Demo login is unavailable')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={enterDemo}
        disabled={loading}
        className={`flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-60 ${isOwner ? 'border-emerald-900/15 bg-emerald-50 text-emerald-900 hover:bg-emerald-100' : 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100'}`}
      >
        {loading ? <LoaderCircle size={17} className="animate-spin" /> : <Icon size={17} />}
        {loading ? 'Opening demo account' : isOwner ? 'Enter demo owner account' : 'Continue as demo shopper'}
        {!loading && <PlayCircle size={15} className="opacity-55" />}
      </button>
      {error && <p role="alert" className="mt-2 text-center text-xs font-semibold text-red-600">{error}</p>}
    </div>
  )
}
