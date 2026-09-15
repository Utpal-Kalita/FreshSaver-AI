'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MapPin, Phone, Pencil, Trash2, ExternalLink, ToggleLeft, ToggleRight, X, Check, Loader2 } from 'lucide-react'

interface Store {
  id: string
  name: string
  slug: string
  address?: string | null
  city?: string | null
  phone?: string | null
  lat?: number | null
  lng?: number | null
  is_active: boolean
  created_at: string
}

function EditModal({ store, onClose }: { store: Store; onClose: () => void }) {
  const router = useRouter()
  const [form, setForm] = useState({
    name: store.name,
    address: store.address ?? '',
    city: store.city ?? '',
    phone: store.phone ?? '',
    lat: store.lat?.toString() ?? '',
    lng: store.lng?.toString() ?? '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/stores/${store.slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          lat: form.lat ? parseFloat(form.lat) : null,
          lng: form.lng ? parseFloat(form.lng) : null,
        }),
      })
      if (!res.ok) { const d = await res.json(); setError(d.error ?? 'Failed'); return }
      router.refresh()
      onClose()
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  const fields = [
    { key: 'name' as const,    label: 'Store Name',  placeholder: 'FreshSaver Koramangala' },
    { key: 'address' as const, label: 'Address',     placeholder: '123 Main Street' },
    { key: 'city' as const,    label: 'City',        placeholder: 'Bangalore' },
    { key: 'phone' as const,   label: 'Phone',       placeholder: '+91 98765 43210' },
    { key: 'lat' as const,     label: 'Latitude',    placeholder: '12.9716' },
    { key: 'lng' as const,     label: 'Longitude',   placeholder: '77.5946' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800">
          <h2 className="text-white font-black text-lg">Edit Store</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          {error && <div className="p-3 bg-red-900/40 border border-red-700 rounded-xl text-red-400 text-sm">{error}</div>}
          <div className="grid grid-cols-2 gap-3">
            {fields.map(f => (
              <div key={f.key} className={f.key === 'name' ? 'col-span-2' : ''}>
                <label className="block text-xs font-semibold text-slate-400 mb-1">{f.label}</label>
                <input
                  type="text"
                  value={form[f.key]}
                  onChange={e => setForm(v => ({ ...v, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-800">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-colors"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            Save Changes
          </button>
        </div>
      </div>
    </div>
  )
}

function DeleteConfirm({ store, onClose }: { store: Store; onClose: () => void }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    setLoading(true)
    await fetch(`/api/stores/${store.slug}`, { method: 'DELETE' })
    router.refresh()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className="w-12 h-12 rounded-full bg-red-900/40 flex items-center justify-center mx-auto mb-4">
          <Trash2 size={22} className="text-red-400" />
        </div>
        <h2 className="text-white font-black text-lg text-center mb-1">Deactivate Store?</h2>
        <p className="text-slate-400 text-sm text-center mb-6">
          <strong className="text-white">{store.name}</strong> will be hidden from customers. Products remain intact.
        </p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 border border-slate-700 text-slate-300 font-semibold text-sm rounded-xl hover:bg-slate-800 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={loading}
            className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold text-sm rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : null}
            Deactivate
          </button>
        </div>
      </div>
    </div>
  )
}

export default function StoreTable({ stores }: { stores: Store[] }) {
  const router = useRouter()
  const [editStore, setEditStore] = useState<Store | null>(null)
  const [deleteStore, setDeleteStore] = useState<Store | null>(null)

  async function toggleActive(store: Store) {
    await fetch(`/api/stores/${store.slug}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !store.is_active }),
    })
    router.refresh()
  }

  if (stores.length === 0) {
    return (
      <div className="text-center py-16 text-slate-600">
        <p className="text-lg font-bold">No stores yet</p>
        <p className="text-sm mt-1">Create your first store using the form below.</p>
      </div>
    )
  }

  return (
    <>
      {editStore && <EditModal store={editStore} onClose={() => setEditStore(null)} />}
      {deleteStore && <DeleteConfirm store={deleteStore} onClose={() => setDeleteStore(null)} />}

      <div className="divide-y divide-slate-800">
        {stores.map(store => (
          <div key={store.id} className="flex items-center gap-4 py-5 group">
            {/* Status dot */}
            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${store.is_active ? 'bg-emerald-400' : 'bg-slate-600'}`} />

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <p className="text-white font-bold truncate">{store.name}</p>
                <span className="text-[10px] font-mono text-slate-500 shrink-0">/{store.slug}</span>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
                {(store.address || store.city) && (
                  <span className="flex items-center gap-1">
                    <MapPin size={10} />
                    {[store.address, store.city].filter(Boolean).join(', ')}
                  </span>
                )}
                {store.phone && (
                  <span className="flex items-center gap-1">
                    <Phone size={10} />
                    {store.phone}
                  </span>
                )}
              </div>
            </div>

            {/* Status badge */}
            <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border shrink-0 ${
              store.is_active
                ? 'bg-emerald-900/30 text-emerald-400 border-emerald-800'
                : 'bg-slate-800 text-slate-500 border-slate-700'
            }`}>
              {store.is_active ? 'Active' : 'Inactive'}
            </span>

            {/* Actions */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <a
                href={`/store/${store.slug}`}
                target="_blank"
                className="p-2 text-slate-500 hover:text-emerald-400 hover:bg-slate-800 rounded-lg transition-colors"
                title="View store"
              >
                <ExternalLink size={15} />
              </a>
              <button
                onClick={() => toggleActive(store)}
                className="p-2 text-slate-500 hover:text-blue-400 hover:bg-slate-800 rounded-lg transition-colors"
                title={store.is_active ? 'Deactivate' : 'Activate'}
              >
                {store.is_active ? <ToggleRight size={15} /> : <ToggleLeft size={15} />}
              </button>
              <button
                onClick={() => setEditStore(store)}
                className="p-2 text-slate-500 hover:text-amber-400 hover:bg-slate-800 rounded-lg transition-colors"
                title="Edit"
              >
                <Pencil size={15} />
              </button>
              <button
                onClick={() => setDeleteStore(store)}
                className="p-2 text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors"
                title="Deactivate"
              >
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
