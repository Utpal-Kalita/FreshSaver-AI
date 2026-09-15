import { createServiceClient } from '@/lib/supabase/server'
import { getServerUser, getStoreAdminRecord } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { format } from 'date-fns'

export const dynamic = 'force-dynamic'

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  accepted: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-500',
}

export default async function AllOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const user = await getServerUser()
  if (!user) redirect('/login')
  const storeAdmin = await getStoreAdminRecord(user.id)
  if (!storeAdmin) redirect('/login')

  const params = await searchParams
  const serviceClient = createServiceClient()

  let query = serviceClient
    .from('orders')
    .select(`
      id, status, total_amount, customer_email, created_at,
      order_items(product_name, quantity)
    `)
    .eq('store_id', storeAdmin.store_id)
    .order('created_at', { ascending: false })
    .limit(100)

  if (params.status) query = query.eq('status', params.status)

  const { data: orders } = await query

  const statusList = ['pending', 'accepted', 'completed', 'cancelled']

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-black text-gray-800">Orders — {storeAdmin.store_name}</h1>
        <p className="text-gray-500 text-sm">Orders placed at your store</p>
      </div>

      {/* Status filter */}
      <div className="flex flex-wrap gap-3 mb-6">
        <a
          href="/dashboard/orders"
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${!params.status ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >
          All
        </a>
        {statusList.map(s => (
          <a
            key={s}
            href={`/dashboard/orders?status=${s}`}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors capitalize ${params.status === s ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            {s}
          </a>
        ))}
      </div>

      {!orders || orders.length === 0 ? (
        <div className="py-16 text-center text-gray-400 bg-white rounded-2xl border border-gray-100">
          <p className="text-4xl mb-3">📦</p>
          <p className="font-semibold">No orders found</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100 bg-gray-50">
              <tr>
                <th className="text-left py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wide">Customer</th>
                <th className="text-left py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wide">Items</th>
                <th className="text-left py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wide">Total</th>
                <th className="text-left py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="text-left py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wide">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {(orders as any[]).map(order => {
                const items = Array.isArray(order.order_items) ? order.order_items : []
                return (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="py-3 px-4 text-gray-700 max-w-[180px] truncate">{order.customer_email}</td>
                    <td className="py-3 px-4 text-gray-500">{items.length} item{items.length !== 1 ? 's' : ''}</td>
                    <td className="py-3 px-4 font-bold text-green-600">₹{order.total_amount.toFixed(2)}</td>
                    <td className="py-3 px-4">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full capitalize ${statusColors[order.status] ?? ''}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-400 text-xs">{format(new Date(order.created_at), 'dd MMM yy, HH:mm')}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
