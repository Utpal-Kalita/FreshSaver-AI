'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function SignupPage() {
  const router = useRouter()
  const [form, setForm] = useState({ name: '', email: '', phone: '', location: '', password: '', confirm: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (form.password !== form.confirm) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name, email: form.email, phone: form.phone, location: form.location, password: form.password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Signup failed'); return }

      // Establish session cookie via client-side sign in
      const supabase = createClient()
      await supabase.auth.signInWithPassword({ email: form.email, password: form.password })
      router.push('/')
      router.refresh()
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-green-500 flex items-center justify-center">
              <span className="text-white font-black text-xl">F</span>
            </div>
            <span className="text-2xl font-black text-green-600">FreshSaver</span>
          </Link>
          <p className="mt-2 text-gray-500">Create your account to start saving</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h1 className="text-2xl font-bold text-gray-800 mb-6">Sign up</h1>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-400 text-gray-800"
                placeholder="Your full name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-400 text-gray-800"
                placeholder="you@example.com"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone <span className="text-gray-400">(optional)</span></label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-400 text-gray-800"
                  placeholder="Your phone"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location <span className="text-gray-400">(optional)</span></label>
                <input
                  type="text"
                  value={form.location}
                  onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-400 text-gray-800"
                  placeholder="City or area"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                required
                minLength={8}
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-400 text-gray-800"
                placeholder="At least 8 characters"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
              <input
                type="password"
                required
                value={form.confirm}
                onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-400 text-gray-800"
                placeholder="Repeat password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white font-bold rounded-xl transition-colors mt-2"
            >
              {loading ? 'Creating account…' : 'Create Account'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-green-600 font-semibold hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
