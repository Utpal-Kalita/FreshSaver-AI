'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, LoaderCircle, PackagePlus } from 'lucide-react'

const categories = ['Bakery', 'Dairy', 'Deli', 'Grocery', 'Meat', 'Produce', 'Seafood', 'Other']

export default function AddProductPage() {
  const router = useRouter()
  const [form, setForm] = useState({ productName: '', sku: '', category: 'Grocery', expiryDate: '', originalPrice: '', mrp: '', stockQuantity: '', unitCost: '', minimumPrice: '', disposalCost: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function update(field: keyof typeof form, value: string) {
    setForm(current => ({ ...current, [field]: value }))
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          originalPrice: Number(form.originalPrice),
          mrp: Number(form.mrp),
          stockQuantity: Number(form.stockQuantity),
          unitCost: form.unitCost === '' ? null : Number(form.unitCost),
          minimumPrice: form.minimumPrice === '' ? null : Number(form.minimumPrice),
          disposalCost: form.disposalCost === '' ? 0 : Number(form.disposalCost),
        }),
      })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error ?? 'Could not add product')
      router.push('/dashboard/products')
      router.refresh()
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Could not add product')
    } finally {
      setLoading(false)
    }
  }

  const inputClass = 'mt-2 w-full rounded-xl border border-emerald-950/15 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10'

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/dashboard/products" className="mb-6 inline-flex items-center gap-1.5 text-xs font-black text-emerald-700"><ArrowLeft size={14} /> Back to products</Link>
      <div className="rounded-3xl border border-emerald-950/10 bg-white p-6 shadow-sm sm:p-9">
        <div className="mb-8 flex items-start gap-4 border-b border-emerald-950/10 pb-6">
          <span className="grid size-12 place-items-center rounded-2xl bg-lime-200 text-emerald-900"><PackagePlus size={22} /></span>
          <div><p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-600">Inventory</p><h1 className="mt-1 text-3xl font-black tracking-tight">Add a product</h1><p className="mt-2 text-sm text-emerald-950/50">Add one item manually. Use CSV import for a full catalog.</p></div>
        </div>

        <form onSubmit={submit} className="grid gap-5 sm:grid-cols-2">
          <label className="text-sm font-bold text-emerald-950/70 sm:col-span-2">Product name<input required value={form.productName} onChange={event => update('productName', event.target.value)} className={inputClass} placeholder="Organic whole milk" /></label>
          <label className="text-sm font-bold text-emerald-950/70">SKU<input required value={form.sku} onChange={event => update('sku', event.target.value)} className={inputClass} placeholder="DAIR-104" /></label>
          <label className="text-sm font-bold text-emerald-950/70">Category<select value={form.category} onChange={event => update('category', event.target.value)} className={inputClass}>{categories.map(category => <option key={category}>{category}</option>)}</select></label>
          <label className="text-sm font-bold text-emerald-950/70">Expiry date<input required type="date" value={form.expiryDate} onChange={event => update('expiryDate', event.target.value)} className={inputClass} /></label>
          <label className="text-sm font-bold text-emerald-950/70">Stock quantity<input required min="0" step="1" type="number" value={form.stockQuantity} onChange={event => update('stockQuantity', event.target.value)} className={inputClass} placeholder="24" /></label>
          <label className="text-sm font-bold text-emerald-950/70">Original price (₹)<input required min="0.01" step="0.01" type="number" value={form.originalPrice} onChange={event => update('originalPrice', event.target.value)} className={inputClass} placeholder="84" /></label>
          <label className="text-sm font-bold text-emerald-950/70">MRP (₹)<input required min="0.01" step="0.01" type="number" value={form.mrp} onChange={event => update('mrp', event.target.value)} className={inputClass} placeholder="95" /></label>
          <div className="rounded-2xl bg-emerald-50 p-4 sm:col-span-2"><p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-700">AI unit economics</p><p className="mt-1 text-xs leading-5 text-emerald-950/50">These optional values let the optimizer protect contribution margin instead of optimizing revenue alone.</p></div>
          <label className="text-sm font-bold text-emerald-950/70">Unit cost (₹)<input min="0" step="0.01" type="number" value={form.unitCost} onChange={event => update('unitCost', event.target.value)} className={inputClass} placeholder="45" /></label>
          <label className="text-sm font-bold text-emerald-950/70">Minimum price (₹)<input min="0" step="0.01" type="number" value={form.minimumPrice} onChange={event => update('minimumPrice', event.target.value)} className={inputClass} placeholder="55" /></label>
          <label className="text-sm font-bold text-emerald-950/70 sm:col-span-2">Disposal cost per unsold unit (₹)<input min="0" step="0.01" type="number" value={form.disposalCost} onChange={event => update('disposalCost', event.target.value)} className={inputClass} placeholder="2" /></label>
          {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 sm:col-span-2">{error}</div>}
          <div className="flex flex-col-reverse gap-3 border-t border-emerald-950/10 pt-6 sm:col-span-2 sm:flex-row sm:justify-end">
            <Link href="/dashboard/products" className="rounded-xl border border-emerald-950/15 px-5 py-3 text-center text-sm font-bold text-emerald-950/60">Cancel</Link>
            <button disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#173d31] px-5 py-3 text-sm font-black text-white disabled:opacity-60">{loading && <LoaderCircle size={16} className="animate-spin" />}{loading ? 'Adding product' : 'Add product'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
