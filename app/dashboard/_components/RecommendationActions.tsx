'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, LoaderCircle, X } from 'lucide-react'

export function RecommendationActions({ recommendationId }: { recommendationId: string }) {
  const router = useRouter()
  const [working, setWorking] = useState<'approve' | 'reject' | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function decide(action: 'approve' | 'reject') {
    setWorking(action)
    setError('')
    setSuccess('')
    try {
      const response = await fetch(`/api/recommendations/${recommendationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error ?? `Could not ${action} recommendation`)
      setSuccess(action === 'approve' ? `Approved. ${body.emailsSent ?? 0} customer emails sent.` : 'Recommendation rejected.')
      setTimeout(() => router.refresh(), 1200)
    } catch (decisionError) {
      setError(decisionError instanceof Error ? decisionError.message : `Could not ${action} recommendation`)
    } finally {
      setWorking(null)
    }
  }

  return (
    <div>
      <div className="flex gap-2">
        <button type="button" onClick={() => decide('reject')} disabled={Boolean(working)} className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/15 px-3 py-2 text-xs font-black text-white/70 hover:bg-white/10 disabled:opacity-50">{working === 'reject' ? <LoaderCircle size={14} className="animate-spin" /> : <X size={14} />}Reject</button>
        <button type="button" onClick={() => decide('approve')} disabled={Boolean(working)} className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-lime-300 px-3 py-2 text-xs font-black text-emerald-950 hover:bg-lime-200 disabled:opacity-50">{working === 'approve' ? <LoaderCircle size={14} className="animate-spin" /> : <Check size={14} />}Approve & notify</button>
      </div>
      {error && <p role="alert" className="mt-2 max-w-xs text-xs font-semibold text-red-200">{error}</p>}
      {success && <p role="status" className="mt-2 max-w-xs text-xs font-semibold text-lime-200">{success}</p>}
    </div>
  )
}
