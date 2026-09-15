'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { UserPlus, Loader2, Trash2, Eye, EyeOff, ShieldCheck } from 'lucide-react'

interface StoreOption {
  id: string
  name: string
  slug: string
}

interface StoreAdminRow {
  id: string
  user_id: string
  email: string
  store_name: string
  store_slug: string
  created_at: string
}

export default function StoreAdminManager({
  stores,
  admins,
}: {
  stores: StoreOption[]
  admins: StoreAdminRow[]
}) {
  const router = useRouter()
  const [form, setForm] = useState({ email: '', password: '', store_id: stores[0]?.id ?? '' })
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)
    try {
      const res = await fetch('/api/admin/store-admins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Failed'); return }
      setSuccess(`Account created for ${data.email}. They can now log in at /login.`)
      setForm(f => ({ ...f, email: '', password: '' }))
      router.refresh()
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(userId: string, email: string) {
    if (!confirm(`Remove store admin "${email}"? They will lose access immediately.`)) return
    setDeletingId(userId)
    try {
      await fetch(`/api/admin/store-admins?user_id=${userId}`, { method: 'DELETE' })
      router.refresh()
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Create form */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center">
            <UserPlus size={14} className="text-white" />
          </div>
          <h2 className="text-sm font-black text-white uppercase tracking-widest">Create Store Admin</h2>
        </div>

        <form onSubmit={handleCreate} className="space-y-3">
          {error   && <div className="p-3 bg-red-900/40 border border-red-700 rounded-xl text-red-400 text-sm">{error}</div>}
          {success && <div className="p-3 bg-emerald-900/40 border border-emerald-700 rounded-xl text-emerald-400 text-sm">{success}</div>}

          {/* Store selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Assign to Store</label>
            <select
              required
              value={form.store_id}
              onChange={e => setForm(f => ({ ...f, store_id: e.target.value }))}
              className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              {stores.map(s => (
                <option key={s.id} value={s.id}>{s.name} (/{s.slug})</option>
              ))}
            </select>
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Login Email</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              placeholder="storeowner@example.com"
              className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Password</label>
            <div className="relative">
              <input
                type={showPwd ? 'text' : 'password'}
                required
                minLength={6}
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                placeholder="Min 6 characters"
                className="w-full px-3 py-2.5 pr-10 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
              <button
                type="button"
                onClick={() => setShowPwd(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || stores.length === 0}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-bold text-sm rounded-xl transition-colors mt-1"
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : <UserPlus size={15} />}
            {loading ? 'Creating...' : 'Create Admin Account'}
          </button>

          {stores.length === 0 && (
            <p className="text-xs text-slate-600 text-center">Create a store first before adding admins.</p>
          )}
        </form>
      </div>

      {/* Existing admins list */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-800 flex items-center gap-2">
          <ShieldCheck size={15} className="text-violet-400" />
          <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest">
            Store Admins ({admins.length})
          </h2>
        </div>

        {admins.length === 0 ? (
          <p className="px-6 py-10 text-slate-600 text-sm text-center">No store admins yet.</p>
        ) : (
          <div className="divide-y divide-slate-800">
            {admins.map(a => (
              <div key={a.id} className="flex items-center justify-between gap-4 px-6 py-4 group">
                <div>
                  <p className="text-sm font-bold text-white">{a.email}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Store: <span className="text-slate-400">{a.store_name}</span>
                    <span className="text-slate-600 ml-1">/{a.store_slug}</span>
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(a.user_id, a.email)}
                  disabled={deletingId === a.user_id}
                  className="p-2 text-slate-600 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-50"
                  title="Remove admin"
                >
                  {deletingId === a.user_id
                    ? <Loader2 size={15} className="animate-spin" />
                    : <Trash2 size={15} />}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
