'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { DemoLoginButton } from '@/components/auth/DemoLoginButton'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirect') ?? '/'
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      const supabase = createClient()
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: form.email, password: form.password })
      if (signInError) {
        setError(signInError.message)
        return
      }
      router.push(redirectTo)
      router.refresh()
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
        <input type="email" required value={form.email} onChange={event => setForm(current => ({ ...current, email: event.target.value }))} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-gray-800 outline-none focus:ring-2 focus:ring-green-400" placeholder="you@example.com" />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Password</label>
        <input type="password" required value={form.password} onChange={event => setForm(current => ({ ...current, password: event.target.value }))} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-gray-800 outline-none focus:ring-2 focus:ring-green-400" placeholder="Your password" />
      </div>
      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">{error}</div>}
      <button type="submit" disabled={loading} className="w-full rounded-xl bg-green-500 py-3 font-bold text-white transition-colors hover:bg-green-600 disabled:bg-green-300">{loading ? 'Signing in...' : 'Sign In'}</button>
    </form>
  )
}

export default function CustomerLoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2"><div className="flex size-10 items-center justify-center rounded-xl bg-green-500"><span className="text-xl font-black text-white">F</span></div><span className="text-2xl font-black text-green-600">FreshSaver</span></Link>
          <p className="mt-2 text-gray-500">Sign in to your account</p>
        </div>

        <div className="rounded-2xl bg-white p-8 shadow-lg">
          <h1 className="mb-6 text-2xl font-bold text-gray-800">Welcome back</h1>
          <Suspense fallback={<div>Loading...</div>}><LoginForm /></Suspense>

          <div className="my-5 flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.14em] text-gray-300"><span className="h-px flex-1 bg-gray-100" />Judge access<span className="h-px flex-1 bg-gray-100" /></div>
          <DemoLoginButton role="customer" />

          <p className="mt-6 text-center text-sm text-gray-500">Don&apos;t have an account? <Link href="/auth/signup" className="font-semibold text-green-600 hover:underline">Sign up free</Link></p>
          <div className="mt-5 border-t border-gray-100 pt-5 text-center text-sm text-gray-500">Manage a store? <Link href="/login" className="font-semibold text-green-600 hover:underline">Open the owner portal</Link></div>
        </div>
      </div>
    </div>
  )
}
