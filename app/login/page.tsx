'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight, BarChart3, Leaf, LoaderCircle, LockKeyhole, Store, Upload } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { DemoLoginButton } from '@/components/auth/DemoLoginButton'

const SUPER_ADMIN_EMAIL = 'admin@yahoo.com'

const portalBenefits = [
  { icon: Upload, text: 'Import inventory from your existing CSV export' },
  { icon: BarChart3, text: 'Review demand-aware markdown recommendations' },
  { icon: Store, text: 'Manage active deals, orders, and pickups' },
]

export default function StoreOwnerLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(event: React.FormEvent) {
    event.preventDefault()
    setLoading(true)
    setError('')

    try {
      const supabase = createClient()
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password })
      if (signInError) {
        setError(signInError.message)
        return
      }
      router.push(data.user?.email === SUPER_ADMIN_EMAIL ? '/admin/dashboard' : '/dashboard')
      router.refresh()
    } catch (loginError: unknown) {
      setError(loginError instanceof Error ? loginError.message : 'An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="grid min-h-screen bg-[#f6f3ea] lg:grid-cols-[.9fr_1.1fr]">
      <section className="relative hidden overflow-hidden bg-[#173d31] p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-28 -top-28 size-80 rounded-full bg-lime-300/15" />
        <div className="absolute -bottom-36 -left-28 size-96 rounded-full border-[56px] border-emerald-400/10" />
        <Link href="/" className="relative flex items-center gap-3 font-black">
          <span className="grid size-10 place-items-center rounded-xl bg-lime-300 text-emerald-950"><Leaf size={21} fill="currentColor" /></span>
          <span className="text-xl">FreshSaver</span>
        </Link>

        <div className="relative max-w-lg">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-lime-300">The owner portal</p>
          <h1 className="mt-5 text-5xl font-black leading-[1.02] tracking-[-0.04em]">Make the right markdown before food becomes waste.</h1>
          <p className="mt-5 text-base leading-7 text-emerald-100/65">Your decision queue brings stock, expiry, demand evidence, and shopper activation into one reviewable workflow.</p>
          <div className="mt-10 space-y-4">
            {portalBenefits.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/10 text-lime-300"><Icon size={19} /></span>
                <p className="text-sm font-bold text-emerald-50/85">{text}</p>
              </div>
            ))}
          </div>
        </div>
        <p className="relative text-xs text-emerald-100/40">Store access is limited to approved FreshSaver partners.</p>
      </section>

      <section className="flex min-h-screen items-center justify-center px-5 py-12 sm:px-8">
        <div className="w-full max-w-md">
          <div className="mb-10 flex items-center justify-between lg:hidden">
            <Link href="/" className="flex items-center gap-2 font-black text-[#173d31]"><span className="grid size-9 place-items-center rounded-xl bg-[#173d31] text-lime-300"><Leaf size={18} fill="currentColor" /></span>FreshSaver</Link>
            <Link href="/" className="flex items-center gap-1 text-xs font-bold text-emerald-800"><ArrowLeft size={14} /> Marketplace</Link>
          </div>

          <div className="mb-8">
            <span className="grid size-12 place-items-center rounded-2xl bg-emerald-100 text-emerald-700"><LockKeyhole size={22} /></span>
            <p className="mt-6 text-xs font-black uppercase tracking-[0.18em] text-emerald-600">Store owner access</p>
            <h2 className="mt-2 text-4xl font-black tracking-[-0.035em] text-[#173d31]">Welcome back.</h2>
            <p className="mt-3 text-sm leading-6 text-emerald-950/55">Sign in to review inventory decisions and manage your store.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label htmlFor="owner-email" className="mb-2 block text-sm font-bold text-emerald-950/70">Work email</label>
              <input id="owner-email" type="email" autoComplete="email" required value={email} onChange={event => setEmail(event.target.value)} className="w-full rounded-xl border border-emerald-950/15 bg-white px-4 py-3.5 text-sm text-[#173d31] outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10" placeholder="owner@yourstore.com" />
            </div>
            <div>
              <label htmlFor="owner-password" className="mb-2 block text-sm font-bold text-emerald-950/70">Password</label>
              <input id="owner-password" type="password" autoComplete="current-password" required value={password} onChange={event => setPassword(event.target.value)} className="w-full rounded-xl border border-emerald-950/15 bg-white px-4 py-3.5 text-sm text-[#173d31] outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10" placeholder="Enter your password" />
            </div>
            {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
            <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#173d31] py-3.5 text-sm font-black text-white transition hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-60">
              {loading ? <><LoaderCircle size={17} className="animate-spin" /> Signing in</> : <>Enter owner portal <ArrowRight size={16} /></>}
            </button>
          </form>

          <div className="my-6 flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.15em] text-emerald-950/30"><span className="h-px flex-1 bg-emerald-950/10" />Judge access<span className="h-px flex-1 bg-emerald-950/10" /></div>
          <DemoLoginButton role="owner" />

          <div className="mt-8 border-t border-emerald-950/10 pt-6 text-center text-sm text-emerald-950/55">
            Shopping for deals? <Link href="/auth/login" className="font-black text-emerald-700 hover:text-emerald-900">Use customer sign in</Link>
          </div>
          <Link href="/" className="mt-5 hidden items-center justify-center gap-1 text-xs font-bold text-emerald-950/45 hover:text-emerald-800 lg:flex"><ArrowLeft size={14} /> Back to the marketplace</Link>
        </div>
      </section>
    </main>
  )
}
