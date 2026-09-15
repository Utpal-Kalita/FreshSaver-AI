'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Loader2 } from 'lucide-react'

export default function CreateStoreForm() {
  const router = useRouter()
  const [form, setForm] = useState({
    name: '', slug: '', address: '', city: '', lat: '', lng: '', phone: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  function autoSlug(name: string) {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)
    try {
      const res = await fetch('/api/stores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          lat: form.lat ? parseFloat(form.lat) : null,
          lng: form.lng ? parseFloat(form.lng) : null,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Failed to create store'); return }
      setSuccess(`Store "${data.name}" created successfully!`)
      setForm({ name: '', slug: '', address: '', city: '', lat: '', lng: '', phone: '' })
      router.refresh()
    } catch {
      setError('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const fields = [
    { key: 'name' as const,    label: 'Store Name *', placeholder: 'FreshSaver Koramangala', required: true,  col: 2 },
    { key: 'slug' as const,    label: 'URL Slug *',   placeholder: 'koramangala',             required: true,  col: 2 },
    { key: 'address' as const, label: 'Address',      placeholder: '123 Main Street',         required: false, col: 2 },
    { key: 'city' as const,    label: 'City',         placeholder: 'Bangalore',               required: false, col: 1 },
    { key: 'phone' as const,   label: 'Phone',        placeholder: '+91 98765 43210',         required: false, col: 1 },
    { key: 'lat' as const,     label: 'Latitude',     placeholder: '12.9716',                 required: false, col: 1 },
    { key: 'lng' as const,     label: 'Longitude',    placeholder: '77.5946',                 required: false, col: 1 },
  ]

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="p-3 bg-red-900/40 border border-red-700 rounded-xl text-red-400 text-sm">{error}</div>}
      {success && <div className="p-3 bg-emerald-900/40 border border-emerald-700 rounded-xl text-emerald-400 text-sm">{success}</div>}

      <div className="grid grid-cols-2 gap-3">
        {fields.map(field => (
          <div key={field.key} className={field.col === 2 ? 'col-span-2' : ''}>
            <label className="block text-xs font-semibold text-slate-400 mb-1">{field.label}</label>
            <input
              type="text"
              required={field.required}
              value={form[field.key]}
              onChange={e => {
                const val = e.target.value
                setForm(f => ({
                  ...f,
                  [field.key]: val,
                  ...(field.key === 'name' ? { slug: autoSlug(val) } : {}),
                }))
              }}
              placeholder={field.placeholder}
              className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-shadow"
            />
          </div>
        ))}
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-sm rounded-xl transition-colors mt-2"
      >
        {loading ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
        {loading ? 'Creating...' : 'Create Store'}
      </button>
    </form>
  )
}
