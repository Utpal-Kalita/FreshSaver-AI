import Link from 'next/link'
import { redirect } from 'next/navigation'
import { format } from 'date-fns'
import { BellRing, ExternalLink, MapPin, QrCode, UserRound, Users } from 'lucide-react'
import { createServiceClient } from '@/lib/supabase/server'
import { getServerUser, getStoreAdminRecord } from '@/lib/auth'

export const dynamic = 'force-dynamic'

interface CustomerRecord {
  id: string
  name: string | null
  email: string
  phone: string | null
  location: string | null
  is_subscribed: boolean
  subscribed_categories: string[] | null
}

interface SubscriptionRecord {
  id: string
  source: 'website' | 'store_qr'
  interested_categories: string[] | null
  notifications_enabled: boolean
  subscribed_at: string
  customers: CustomerRecord | CustomerRecord[] | null
}

export default async function CustomersPage() {
  const user = await getServerUser()
  if (!user) redirect('/login')
  const storeAdmin = await getStoreAdminRecord(user.id)
  if (!storeAdmin) redirect('/login')

  const supabase = createServiceClient()
  const { data } = await supabase
    .from('store_subscriptions')
    .select('id, source, interested_categories, notifications_enabled, subscribed_at, customers(id, name, email, phone, location, is_subscribed, subscribed_categories)')
    .eq('store_id', storeAdmin.store_id)
    .order('subscribed_at', { ascending: false })

  const subscriptions = (data ?? []) as SubscriptionRecord[]
  const activeCount = subscriptions.filter(item => item.notifications_enabled).length
  const qrCount = subscriptions.filter(item => item.source === 'store_qr').length

  return (
    <div className="mx-auto max-w-7xl space-y-7">
      <header className="flex flex-col gap-4 border-b border-emerald-950/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-600">Store audience</p>
          <h1 className="mt-2 text-4xl font-black tracking-[-0.035em]">Customers</h1>
          <p className="mt-2 text-sm text-emerald-950/55">Shoppers who explicitly opted into flash-deal notifications from {storeAdmin.store_name}.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href={`/store/${storeAdmin.store_slug}?source=store_qr`} target="_blank" className="inline-flex items-center gap-2 rounded-2xl border border-emerald-950/10 bg-white px-4 py-3 text-xs font-black text-emerald-800"><QrCode size={16} /> Open in-store opt-in <ExternalLink size={13} /></Link>
          <div className="rounded-2xl border border-emerald-950/10 bg-white px-4 py-3"><p className="text-[10px] font-black uppercase text-emerald-950/35">Active alerts</p><p className="mt-1 text-2xl font-black">{activeCount}</p></div>
          <div className="rounded-2xl border border-emerald-950/10 bg-white px-4 py-3"><p className="text-[10px] font-black uppercase text-emerald-950/35">In-store QR</p><p className="mt-1 text-2xl font-black">{qrCount}</p></div>
        </div>
      </header>

      <div className="overflow-x-auto rounded-3xl border border-emerald-950/10 bg-white shadow-sm">
        <table className="w-full min-w-[1000px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-emerald-950/10 bg-emerald-50/70 text-left text-[10px] font-black uppercase tracking-[0.14em] text-emerald-950/45">
              <th className="px-5 py-4">Name</th>
              <th className="px-5 py-4">Email</th>
              <th className="px-5 py-4">Phone</th>
              <th className="px-5 py-4">Location</th>
              <th className="px-5 py-4">Interested in</th>
              <th className="px-5 py-4">Opt-in source</th>
              <th className="px-5 py-4">Joined</th>
              <th className="px-5 py-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-emerald-950/5">
            {subscriptions.length === 0 && (
              <tr><td colSpan={8} className="px-6 py-16 text-center"><Users size={34} className="mx-auto text-emerald-200" /><p className="mt-3 font-bold text-emerald-950/55">No store subscribers yet</p><p className="mt-1 text-xs text-emerald-950/35">Website and in-store QR opt-ins will appear here.</p></td></tr>
            )}
            {subscriptions.map(subscription => {
              const customer = Array.isArray(subscription.customers) ? subscription.customers[0] : subscription.customers
              if (!customer) return null
              const categories = subscription.interested_categories?.length ? subscription.interested_categories : customer.subscribed_categories
              const active = subscription.notifications_enabled && customer.is_subscribed
              return (
                <tr key={subscription.id} className="hover:bg-emerald-50/30">
                  <td className="px-5 py-4"><span className="flex items-center gap-2 font-bold"><span className="grid size-8 place-items-center rounded-full bg-emerald-100 text-emerald-700"><UserRound size={14} /></span>{customer.name ?? 'Unnamed shopper'}</span></td>
                  <td className="px-5 py-4 text-emerald-950/65">{customer.email}</td>
                  <td className="px-5 py-4 text-emerald-950/55">{customer.phone ?? 'Not provided'}</td>
                  <td className="px-5 py-4"><span className="flex items-center gap-1.5 text-emerald-950/55"><MapPin size={13} />{customer.location ?? 'Not provided'}</span></td>
                  <td className="px-5 py-4"><div className="flex max-w-[220px] flex-wrap gap-1">{categories?.length ? categories.map(category => <span key={category} className="rounded-full bg-lime-100 px-2 py-1 text-[10px] font-bold text-emerald-800">{category}</span>) : <span className="text-xs text-emerald-950/35">All categories</span>}</div></td>
                  <td className="px-5 py-4"><span className="inline-flex items-center gap-1.5 rounded-full bg-stone-100 px-2.5 py-1 text-[10px] font-black uppercase text-stone-600">{subscription.source === 'store_qr' ? <QrCode size={12} /> : <BellRing size={12} />}{subscription.source === 'store_qr' ? 'In-store QR' : 'Website'}</span></td>
                  <td className="px-5 py-4 text-xs text-emerald-950/45">{format(new Date(subscription.subscribed_at), 'dd MMM yyyy')}</td>
                  <td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${active ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-100 text-stone-500'}`}>{active ? 'Opted in' : 'Paused'}</span></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs leading-5 text-emerald-950/40">Only shoppers with an active store-specific opt-in are shown. FreshSaver records whether consent came from the store page or an in-store QR journey.</p>
    </div>
  )
}
