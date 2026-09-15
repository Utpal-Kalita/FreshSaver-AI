import Link from 'next/link'
import { redirect } from 'next/navigation'
import { FileUp, Package, PackagePlus } from 'lucide-react'
import { createServiceClient } from '@/lib/supabase/server'
import { getServerUser, getStoreAdminRecord } from '@/lib/auth'
import { daysUntilDate } from '@/lib/date-utils'

export const dynamic = 'force-dynamic'

interface ProductRecord {
  id: string
  product_name: string
  sku: string
  category: string
  original_price: number
  discounted_price: number | null
  expiry_date: string
  stock_quantity: number
}

function expiryStatus(days: number) {
  if (days < 0) return { label: 'Expired', detail: `${Math.abs(days)}d ago`, className: 'bg-stone-100 text-stone-600' }
  if (days === 0) return { label: 'Expires today', detail: '0 days left', className: 'bg-red-100 text-red-700' }
  if (days <= 3) return { label: 'Urgent', detail: `${days} days left`, className: 'bg-red-100 text-red-700' }
  if (days <= 15) return { label: 'Expiring soon', detail: `${days} days left`, className: 'bg-orange-100 text-orange-700' }
  if (days <= 30) return { label: 'Watch', detail: `${days} days left`, className: 'bg-amber-100 text-amber-700' }
  return { label: 'Fresh', detail: `${days} days left`, className: 'bg-emerald-100 text-emerald-700' }
}

function money(value: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(value)
}

export default async function ProductsPage() {
  const user = await getServerUser()
  if (!user) redirect('/login')
  const storeAdmin = await getStoreAdminRecord(user.id)
  if (!storeAdmin) redirect('/login')

  const supabase = createServiceClient()
  const { data } = await supabase
    .from('products')
    .select('id, product_name, sku, category, original_price, discounted_price, expiry_date, stock_quantity')
    .eq('store_id', storeAdmin.store_id)
    .eq('is_active', true)
    .order('expiry_date', { ascending: true })
    .limit(500)

  const products = (data ?? []) as ProductRecord[]

  return (
    <div className="mx-auto max-w-7xl space-y-7">
      <header className="flex flex-col gap-5 border-b border-emerald-950/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-600">Store inventory</p>
          <h1 className="mt-2 text-4xl font-black tracking-[-0.035em]">Products</h1>
          <p className="mt-2 text-sm text-emerald-950/55">{products.length} active products at {storeAdmin.store_name}</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Link href="/dashboard/products/upload" className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-950/15 bg-white px-4 py-2.5 text-sm font-black text-emerald-900 transition hover:bg-emerald-50"><FileUp size={17} /> Import CSV</Link>
          <Link href="/dashboard/products/new" className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#173d31] px-4 py-2.5 text-sm font-black text-white transition hover:bg-emerald-900"><PackagePlus size={17} /> Add product</Link>
        </div>
      </header>

      <div className="overflow-x-auto rounded-3xl border border-emerald-950/10 bg-white shadow-sm">
        <table className="w-full min-w-[1050px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-emerald-950/10 bg-emerald-50/70 text-left text-[10px] font-black uppercase tracking-[0.14em] text-emerald-950/45">
              <th className="px-5 py-4">Product</th>
              <th className="px-5 py-4">SKU</th>
              <th className="px-5 py-4">Category</th>
              <th className="px-5 py-4">Exp. date</th>
              <th className="px-5 py-4 text-right">Original price</th>
              <th className="px-5 py-4 text-right">Current price</th>
              <th className="px-5 py-4 text-right">Discount</th>
              <th className="px-5 py-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-emerald-950/5">
            {products.length === 0 && (
              <tr><td colSpan={8} className="px-6 py-16 text-center"><Package size={34} className="mx-auto text-emerald-200" /><p className="mt-3 font-bold text-emerald-950/55">No products yet</p><div className="mt-4 flex justify-center gap-3"><Link href="/dashboard/products/new" className="font-black text-emerald-700">Add one product</Link><span className="text-emerald-950/20">or</span><Link href="/dashboard/products/upload" className="font-black text-emerald-700">import CSV</Link></div></td></tr>
            )}
            {products.map(product => {
              const days = daysUntilDate(product.expiry_date)
              const status = expiryStatus(days)
              const currentPrice = Number(product.discounted_price ?? product.original_price)
              const originalPrice = Number(product.original_price)
              const discount = originalPrice > 0 ? Math.max(0, Math.round((1 - currentPrice / originalPrice) * 100)) : 0
              return (
                <tr key={product.id} className="hover:bg-emerald-50/30">
                  <td className="px-5 py-4"><p className="max-w-[240px] truncate font-black text-[#173d31]">{product.product_name}</p><p className="mt-1 text-[11px] text-emerald-950/35">{product.stock_quantity} units in stock</p></td>
                  <td className="px-5 py-4 font-mono text-xs font-bold text-emerald-950/45">{product.sku}</td>
                  <td className="px-5 py-4"><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-black uppercase text-emerald-700">{product.category}</span></td>
                  <td className="px-5 py-4 font-semibold text-emerald-950/65">{product.expiry_date}</td>
                  <td className="px-5 py-4 text-right text-emerald-950/45">{money(originalPrice)}</td>
                  <td className="px-5 py-4 text-right font-black text-emerald-800">{money(currentPrice)}</td>
                  <td className="px-5 py-4 text-right"><span className={`font-black ${discount > 0 ? 'text-orange-600' : 'text-emerald-950/30'}`}>{discount}%</span></td>
                  <td className="px-5 py-4"><span className={`inline-flex flex-col rounded-xl px-3 py-1.5 ${status.className}`}><span className="text-[10px] font-black uppercase">{status.label}</span><span className="text-[10px] font-semibold opacity-75">{status.detail}</span></span></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
