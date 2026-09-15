'use client'

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import Link from 'next/link'

// Fix Leaflet default marker icon paths in webpack/Next.js
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: () => string })._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

interface Store {
  id: string
  name: string
  slug: string
  address?: string | null
  city?: string | null
  lat?: number | null
  lng?: number | null
}

export default function StoresMap({ stores }: { stores: Store[] }) {
  const storesWithCoords = stores.filter(s => s.lat && s.lng)

  if (storesWithCoords.length === 0) {
    return (
      <div className="h-64 bg-green-50 rounded-2xl flex items-center justify-center text-gray-400 text-sm">
        No store locations available
      </div>
    )
  }

  const center: [number, number] = [storesWithCoords[0].lat!, storesWithCoords[0].lng!]

  return (
    <MapContainer
      center={center}
      zoom={13}
      style={{ height: '360px', borderRadius: '1rem', zIndex: 0 }}
      className="w-full"
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />
      {storesWithCoords.map(store => (
        <Marker key={store.id} position={[store.lat!, store.lng!]}>
          <Popup>
            <div className="text-sm">
              <strong className="text-green-700">{store.name}</strong>
              {store.address && <p className="text-gray-500 text-xs mt-0.5">{store.address}</p>}
              <Link href={`/store/${store.slug}`} className="text-green-600 font-semibold text-xs mt-1 block hover:underline">
                View Deals →
              </Link>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}
