import { createClient } from '@/lib/supabase/server'
import { StoreCard } from '@/components/customer/StoreCard'
import { StoresMapWrapper } from '@/components/customer/StoresMapWrapper'
import { hasSupabaseConfig } from '@/lib/env'

export const dynamic = 'force-dynamic'

export default async function StoresPage() {
  if (!hasSupabaseConfig()) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center md:px-6">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-600">Community partners</p>
        <h1 className="mt-3 text-3xl font-black text-[#173d31]">Partner stores will appear here.</h1>
        <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-emerald-950/55">Once connected, shoppers can discover participating local grocers and their active deals.</p>
      </div>
    )
  }

  const supabase = await createClient()
  const { data: stores } = await supabase
    .from('stores')
    .select('id, name, slug, address, city, lat, lng, phone, image_url')
    .eq('is_active', true)
    .order('name')

  const storesList = stores ?? []

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-gray-800">Our Stores</h1>
        <p className="text-gray-500 text-sm">{storesList.length} locations near you</p>
      </div>

      {/* Map */}
      <div className="mb-8 rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
        <StoresMapWrapper stores={storesList} />
      </div>

      {/* Store cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        {(storesList as any[]).map(store => (
          <StoreCard key={store.id} store={store} />
        ))}
      </div>

      {storesList.length === 0 && (
        <div className="py-16 text-center text-gray-400">
          <p className="text-4xl mb-3">🏪</p>
          <p className="font-semibold">No stores yet</p>
        </div>
      )}
    </div>
  )
}
