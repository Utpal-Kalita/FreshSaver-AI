'use client'

import dynamic from 'next/dynamic'

const StoresMap = dynamic(() => import('./StoresMap'), { ssr: false })

interface Store {
  id: string
  name: string
  slug: string
  address?: string | null
  city?: string | null
  lat?: number | null
  lng?: number | null
}

export function StoresMapWrapper({ stores }: { stores: Store[] }) {
  return <StoresMap stores={stores} />
}
