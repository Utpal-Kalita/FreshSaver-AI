import Link from 'next/link'
import { MapPin, Phone } from 'lucide-react'

interface Store {
  id: string
  name: string
  slug: string
  address?: string | null
  city?: string | null
  phone?: string | null
  image_url?: string | null
}

export function StoreCard({ store }: { store: Store }) {
  return (
    <Link href={`/store/${store.slug}`}>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 overflow-hidden group">
        {/* Header color block */}
        <div className="h-20 bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center">
          {store.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={store.image_url} alt={store.name} className="h-full w-full object-cover" />
          ) : (
            <span className="text-4xl">🏪</span>
          )}
        </div>

        <div className="p-4">
          <h3 className="font-bold text-gray-800 group-hover:text-green-600 transition-colors text-sm leading-snug">
            {store.name}
          </h3>
          {(store.address || store.city) && (
            <p className="flex items-start gap-1 mt-1.5 text-[11px] text-gray-400">
              <MapPin size={11} className="mt-0.5 shrink-0" />
              {[store.address, store.city].filter(Boolean).join(', ')}
            </p>
          )}
          {store.phone && (
            <p className="flex items-center gap-1 mt-1 text-[11px] text-gray-400">
              <Phone size={11} />
              {store.phone}
            </p>
          )}
          <span className="mt-3 inline-block text-xs font-semibold text-green-600 hover:text-green-700">
            View Deals →
          </span>
        </div>
      </div>
    </Link>
  )
}
