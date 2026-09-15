import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { format } from 'date-fns'
import OrderActions from './_components/OrderActions'

export const dynamic = 'force-dynamic'

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  accepted: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-500',
}

export default async function StoreOrdersPage({
  params,
}: {
  params: Promise<{ 'store-slug': string }>
}) {
  const { 'store-slug': storeSlug } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const serviceClient = createServiceClient()

  const { data: storeAdmin } = await serviceClient
    .from('store_admins')
    .select('store_id, stores(id, name, slug)')
    .eq('user_id', user.id)
    .single()

  if (!storeAdmin) redirect('/auth/login')
  const store = Array.isArray(storeAdmin.stores) ? storeAdmin.stores[0] : storeAdmin.stores
  const storeData = store as { id: string; name: string; slug: string }
  if (storeData.slug !== storeSlug) redirect('/auth/login')

  const { data: orders } = await serviceClient
    .from('orders')
    .select(`
      id, status, total_amount, customer_email, payment_ref, created_at,
      order_items(sku, product_name, quantity, unit_price)
    `)
    .eq('store_id', storeData.id)
    .order('created_at', { ascending: false })

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-black text-gray-800">Orders</h1>
        <p className="text-gray-500 text-sm">{storeData.name} — {orders?.length ?? 0} total orders</p>
      </div>

      {!orders || orders.length === 0 ? (
        <div className="py-16 text-center text-gray-400 bg-white rounded-2xl border border-gray-100">
          <p className="text-4xl mb-3">📦</p>
          <p className="font-semibold">No orders yet</p>
          <p className="text-sm mt-1">Orders from customers will appear here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {(orders as any[]).map(order => (
            <div key={order.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-start justify-between mb-3 flex-wrap gap-2">
                <div>
                  <p className="font-bold text-gray-800 text-sm">{order.customer_email}</p>
                  <p className="text-xs text-gray-400">{format(new Date(order.created_at), 'dd MMM yyyy, hh:mm a')}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Ref: {String(order.payment_ref).slice(0, 8).toUpperCase()}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full capitalize ${statusColors[order.status] ?? ''}`}>
                    {order.status}
                  </span>
                  <span className="text-base font-black text-green-600">₹{order.total_amount.toFixed(2)}</span>
                </div>
              </div>

              {/* Items */}
              <div className="space-y-1 mb-4 p-3 bg-gray-50 rounded-xl">
                {(Array.isArray(order.order_items) ? order.order_items : []).map((item: { sku: string; product_name: string; quantity: number; unit_price: number }) => (
                  <div key={item.sku} className="flex justify-between text-sm">
                    <span className="text-gray-600">{item.product_name} × {item.quantity}</span>
                    <span className="font-medium text-gray-700">₹{(item.unit_price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <OrderActions orderId={order.id} status={order.status} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
