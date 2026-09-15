import { createServiceClient } from '@/lib/supabase/server'
import { getServerUser, getStoreAdminRecord } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { format } from 'date-fns'
import { TierBadge } from '@/components/TierBadge'

export const dynamic = 'force-dynamic'

const statusColors: Record<string, string> = {
 sent: 'text-green-600 bg-green-50',
 failed: 'text-red-600 bg-red-50',
 skipped: 'text-gray-500 bg-gray-100',
}

interface EmailLog {
 id: string
 sent_at: string
 customer_email: string
 product_sku: string
 tier: string
 status: string
}

export default async function EmailLogsPage() {
 const user = await getServerUser()
 if (!user) redirect('/login')
 const storeAdmin = await getStoreAdminRecord(user.id)
 if (!storeAdmin) redirect('/login')

 const supabase = createServiceClient()

 // email_logs has no store_id — filter via product_id → products.store_id
 const { data: storeProductRows } = await supabase
   .from('products')
   .select('id')
   .eq('store_id', storeAdmin.store_id)
 const storeProductIds = (storeProductRows ?? []).map((p: { id: string }) => p.id)

 const { data: logs } = storeProductIds.length > 0
   ? await supabase
       .from('email_logs')
       .select('*')
       .in('product_id', storeProductIds)
       .order('sent_at', { ascending: false })
       .limit(100)
   : { data: [] }

 return (
 <div className="space-y-6">
 <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-emerald-50">
 <div className="flex flex-col gap-1">
 <h1 className="text-3xl font-black text-primary tracking-tight font-mono">Email Logs</h1>
 <p className="text-sm text-emerald-400 font-medium font-mono text-[10px] uppercase tracking-widest">Tracking communication with deal-hunters</p>
 </div>
 <div className="flex items-center gap-2">
 <a href="/dashboard/emails/compose" className="bg-primary text-white text-sm font-bold px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors shadow-sm">
 + Compose Email
 </a>
 </div>
 </div>

 <div className="bg-white rounded-3xl border border-emerald-100 shadow-sm overflow-hidden overflow-x-auto">
 <table className="w-full text-sm border-collapse">
 <thead>
 <tr className="bg-emerald-50/50 text-emerald-900/50 text-[10px] font-black uppercase tracking-[0.15em] text-left border-b border-emerald-50">
 <th className="px-6 py-4 font-black">Sent At</th>
 <th className="px-6 py-4 font-black">Customer</th>
 <th className="px-6 py-4 font-black">SKU</th>
 <th className="px-6 py-4 font-black text-center">Tier</th>
 <th className="px-6 py-4 font-black text-center">Status</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-emerald-50">
 {!logs?.length && (
 <tr><td colSpan={5} className="px-6 py-16 text-center text-emerald-300">No emails sent yet.</td></tr>
 )}
 {(logs as EmailLog[] | null)?.map((l) => (
 <tr key={l.id} className="hover:bg-emerald-50/30 transition-colors group">
 <td className="px-6 py-5 text-emerald-500 font-medium">
 {format(new Date(l.sent_at), 'MMM d, HH:mm')}
 </td>
 <td className="px-6 py-5 font-bold text-primary group-hover:text-accent transition-colors">
 {l.customer_email}
 </td>
 <td className="px-6 py-5 truncate font-mono text-[11px] font-bold text-slate-500 bg-slate-50/50 rounded-lg max-w-[120px]">
 {l.product_sku}
 </td>
 <td className="px-6 py-5 text-center">
 <TierBadge tier={l.tier} />
 </td>
 <td className="px-6 py-5 text-center">
 <span className={`inline-flex px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${statusColors[l.status]?.replace('text-', 'border-').replace('600', '200') ?? ''} ${statusColors[l.status] ?? ''}`}>
 {l.status}
 </span>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </div>
 )
}
