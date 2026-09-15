'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, Brain, Check, CheckCircle2, Database, LoaderCircle, Mail, Play, Tags } from 'lucide-react'

interface ScanResult {
  totalProducts: number
  tier1Flagged: number
  tier2Flagged: number
  expiredFlagged: number
  noAction: number
  emailsSent: number
  durationMs: number
}

type PhaseId = 'fetch' | 'ai' | 'prices' | 'notify'

const phases: Array<{ id: PhaseId; label: string; icon: React.ElementType }> = [
  { id: 'fetch', label: 'Loading product details', icon: Database },
  { id: 'ai', label: 'Forecasting demand', icon: Brain },
  { id: 'prices', label: 'Preparing discounts', icon: Tags },
  { id: 'notify', label: 'Crafting deal emails', icon: Mail },
]

const phaseOrder: PhaseId[] = phases.map(phase => phase.id)

export default function ScanButton() {
  const router = useRouter()
  const [running, setRunning] = useState(false)
  const [activePhase, setActivePhase] = useState<PhaseId | null>(null)
  const [completed, setCompleted] = useState<Set<PhaseId>>(new Set())
  const [details, setDetails] = useState<Partial<Record<PhaseId, string>>>({})
  const [result, setResult] = useState<ScanResult | null>(null)
  const [error, setError] = useState('')

  function complete(id: PhaseId) {
    setCompleted(current => new Set([...current, id]))
    const next = phaseOrder[phaseOrder.indexOf(id) + 1]
    setActivePhase(next ?? null)
  }

  function setDetail(id: PhaseId, detail: string) {
    setDetails(current => ({ ...current, [id]: detail }))
  }

  async function runAgent() {
    setRunning(true)
    setResult(null)
    setError('')
    setCompleted(new Set())
    setDetails({})
    setActivePhase('fetch')

    try {
      const response = await fetch('/api/scan', { method: 'POST' })
      if (!response.ok || !response.body) throw new Error('The pricing agent could not start')

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const raw = line.slice(6).trim()
          if (!raw) continue

          let event: Record<string, unknown>
          try { event = JSON.parse(raw) } catch { continue }

          if (event.phase === 'fetch') {
            setDetail('fetch', `${event.count} products loaded`)
            complete('fetch')
          } else if (event.phase === 'ai') {
            setActivePhase('ai')
            setDetail('ai', `${event.borderline} near-expiry items reviewed`)
          } else if (event.phase === 'prices') {
            complete('ai')
            setDetail('prices', `${event.changed} recommendations prepared`)
            complete('prices')
          } else if (event.phase === 'notify') {
            setActivePhase('notify')
          } else if (event.phase === 'complete') {
            complete('notify')
            setDetail('notify', `${event.emailsSent} emails sent to customers`)
            setResult(event as unknown as ScanResult)
            setActivePhase(null)
            router.refresh()
          } else if (event.phase === 'error') {
            throw new Error(String(event.message ?? 'The pricing agent failed'))
          }
        }
      }
    } catch (agentError) {
      setError(agentError instanceof Error ? agentError.message : 'The pricing agent failed')
      setActivePhase(null)
    } finally {
      setRunning(false)
    }
  }

  const showProgress = running || completed.size > 0 || Boolean(result)

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={runAgent}
        disabled={running}
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-lime-300 px-5 py-3 text-sm font-black text-emerald-950 shadow-sm transition hover:-translate-y-0.5 hover:bg-lime-200 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {running ? <LoaderCircle size={17} className="animate-spin" /> : <Play size={17} fill="currentColor" />}
        {running ? 'Agent running' : 'Run Agent Now'}
      </button>

      {showProgress && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="grid gap-4 md:grid-cols-4">
            {phases.map((phase, index) => {
              const Icon = phase.icon
              const done = completed.has(phase.id)
              const active = activePhase === phase.id
              return (
                <div key={phase.id} className="relative">
                  {index < phases.length - 1 && <span className={`absolute left-5 top-5 hidden h-0.5 w-[calc(100%-1.25rem)] md:block ${done ? 'bg-lime-300' : 'bg-white/15'}`} />}
                  <div className="relative flex gap-3 md:flex-col">
                    <span className={`grid size-10 shrink-0 place-items-center rounded-full border ${done ? 'border-lime-300 bg-lime-300 text-emerald-950' : active ? 'border-white bg-white text-emerald-800' : 'border-white/20 bg-white/5 text-white/35'}`}>
                      {done ? <Check size={18} strokeWidth={3} /> : active ? <LoaderCircle size={18} className="animate-spin" /> : <Icon size={17} />}
                    </span>
                    <div>
                      <p className={`text-xs font-black ${done || active ? 'text-white' : 'text-white/35'}`}>{phase.label}</p>
                      <p className="mt-1 text-[10px] leading-4 text-emerald-100/45">{details[phase.id] ?? (active ? 'In progress…' : 'Waiting')}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {result && !running && (
        <div className="flex flex-col gap-3 rounded-2xl bg-white p-4 text-emerald-950 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-full bg-emerald-100 text-emerald-700"><CheckCircle2 size={18} /></span><div><p className="text-sm font-black">Pricing run complete</p><p className="text-xs text-emerald-950/50">{result.totalProducts} products reviewed in {(result.durationMs / 1000).toFixed(1)} seconds</p></div></div>
          <div className="flex gap-4 text-xs font-bold"><span>{result.tier1Flagged + result.tier2Flagged} items reviewed</span><span className="text-emerald-700">Approve to notify shoppers</span></div>
        </div>
      )}

      {error && <div role="alert" className="flex items-center gap-2 rounded-xl border border-red-300/30 bg-red-950/20 px-4 py-3 text-xs font-bold text-red-100"><AlertCircle size={15} />{error}</div>}
    </div>
  )
}
