import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Package, CheckCircle2, XCircle, Clock } from 'lucide-react'
import { format } from 'date-fns'

export const dynamic = 'force-dynamic'

const statusConfig = {
  pending: { label: 'Pending', icon: Clock, color: 'text-yellow-600 bg-yellow-50' },
  accepted: { label: 'Accepted', icon: CheckCircle2, color: 'text-blue-600 bg-blue-50' },
  completed: { label: 'Completed', icon: CheckCircle2, color: 'text-green-600 bg-green-50' },
  cancelled: { label: 'Cancelled', icon: XCircle, color: 'text-red-500 bg-red-50' },
}

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string; success?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?redirect=/account')

  const serviceClient = createServiceClient()

  const { data: orders } = await serviceClient
    .from('orders')
    .select(`
      id, status, total_amount, payment_ref, created_at,
      stores(name, slug),
      order_items(sku, product_name, quantity, unit_price)
    `)
    .eq('customer_id', user.id)
    .order('created_at', { ascending: false })

  const { data: customer } = await serviceClient
    .from('customers')
    .select('name, email, is_subscribed')
    .eq('user_id', user.id)
    .single()

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      {/* Success banner */}
      {params.success && params.order && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-2xl flex items-center gap-3">
          <CheckCircle2 size={24} className="text-green-500 shrink-0" />
          <div>
            <p className="font-bold text-green-700">Order placed successfully!</p>
            <p className="text-sm text-green-600">Your order is confirmed. The store will prepare your items.</p>
          </div>
        </div>
      )}

      {/* Profile */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center text-green-600 font-black text-xl">
            {(customer?.name ?? user.email ?? 'U').charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-xl font-black text-gray-800">{customer?.name ?? 'My Account'}</h1>
            <p className="text-sm text-gray-500">{user.email}</p>
            {customer?.is_subscribed && (
              <span className="inline-block mt-1 text-xs font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                ✓ Deal alerts on
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Orders */}
      <h2 className="text-lg font-black text-gray-800 mb-4">Order History</h2>

      {!orders || orders.length === 0 ? (
        <div className="py-12 text-center text-gray-400 bg-white rounded-2xl border border-gray-100">
          <Package size={40} className="mx-auto mb-3 text-gray-200" />
          <p className="font-semibold">No orders yet</p>
          <Link href="/deals" className="mt-3 inline-block text-sm text-green-600 font-semibold hover:underline">
            Browse deals →
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {(orders as any[]).map(order => {
            const store = Array.isArray(order.stores) ? order.stores[0] : order.stores
            const statusInfo = statusConfig[order.status as keyof typeof statusConfig] ?? statusConfig.pending
            const StatusIcon = statusInfo.icon
            return (
              <div key={order.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    {store && (
                      <Link href={`/store/${(store as { slug: string }).slug}`} className="font-bold text-gray-800 hover:text-green-600 transition-colors text-sm">
                        🏪 {(store as { name: string }).name}
                      </Link>
                    )}
                    <p className="text-xs text-gray-400 mt-0.5">
                      {format(new Date(order.created_at), 'dd MMM yyyy, hh:mm a')}
                    </p>
                  </div>
                  <span className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${statusInfo.color}`}>
                    <StatusIcon size={12} />
                    {statusInfo.label}
                  </span>
                </div>

                <div className="space-y-1 mb-3">
                  {(Array.isArray(order.order_items) ? order.order_items : []).map((item: { sku: string; product_name: string; quantity: number; unit_price: number }) => (
                    <div key={item.sku} className="flex justify-between text-sm">
                      <span className="text-gray-600">{item.product_name} × {item.quantity}</span>
                      <span className="text-gray-700 font-semibold">₹{(item.unit_price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                  <span className="text-xs text-gray-400">Ref: {String(order.payment_ref).slice(0, 8).toUpperCase()}</span>
                  <span className="font-black text-green-600 text-base">₹{order.total_amount.toFixed(2)}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
