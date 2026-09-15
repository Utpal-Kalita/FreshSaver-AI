'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Search, X } from 'lucide-react'
import { useCallback, useState } from 'react'

const CATEGORIES = ['Dairy', 'Bakery', 'Produce', 'Meat', 'Beverages', 'Snacks', 'Frozen', 'Other']
const TIERS = [
  { value: 'tier_1', label: 'Expiring Soon' },
  { value: 'tier_2', label: 'Final Markdown' },
]

export function DealFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [query, setQuery] = useState(searchParams.get('q') ?? '')

  const updateParam = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value) params.set(key, value)
      else params.delete(key)
      router.push(`/deals?${params.toString()}`)
    },
    [router, searchParams]
  )

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    updateParam('q', query || null)
  }

  const activeCategory = searchParams.get('category')
  const activeTier = searchParams.get('tier')

  return (
    <div className="space-y-3">
      {/* Search */}
      <form onSubmit={handleSearch} className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search products…"
          className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-white"
        />
        {query && (
          <button type="button" onClick={() => { setQuery(''); updateParam('q', null) }} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            <X size={14} />
          </button>
        )}
      </form>

      {/* Category pills */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => updateParam('category', null)}
          className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
            !activeCategory ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          All
        </button>
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => updateParam('category', activeCategory === cat ? null : cat)}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
              activeCategory === cat ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Tier pills */}
      <div className="flex gap-2">
        {TIERS.map(t => (
          <button
            key={t.value}
            onClick={() => updateParam('tier', activeTier === t.value ? null : t.value)}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
              activeTier === t.value ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
    </div>
  )
}
