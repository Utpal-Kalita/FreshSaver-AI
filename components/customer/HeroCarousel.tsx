'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Banner {
  id: string
  title: string
  subtitle: string | null
  gradient: string | null
  cta_label: string | null
  cta_href: string | null
}

const defaultBanners: Banner[] = [
  {
    id: 'default-1',
    title: 'Smarter Discounts. Less Food Waste.',
    subtitle: 'Fight food waste and save money at the same time',
    gradient: 'from-green-600 to-emerald-500',
    cta_label: 'Browse Deals',
    cta_href: '/deals',
  },
  {
    id: 'default-2',
    title: 'Fresh Products, Better Prices',
    subtitle: 'Demand-aware markdowns connect you with food that needs a buyer',
    gradient: 'from-teal-600 to-green-500',
    cta_label: 'Find Stores',
    cta_href: '/stores',
  },
]

export function HeroCarousel({ banners }: { banners?: Banner[] }) {
  const items = banners && banners.length > 0 ? banners : defaultBanners
  const [current, setCurrent] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrent(c => (c + 1) % items.length)
    }, 4000)
    return () => clearInterval(interval)
  }, [items.length])

  const banner = items[current]

  return (
    <div className="relative overflow-hidden rounded-2xl md:rounded-3xl">
      <div
        className={`bg-gradient-to-br ${banner.gradient ?? 'from-green-600 to-emerald-500'} transition-all duration-700`}
      >
        <div className="px-8 py-12 md:px-16 md:py-20 max-w-2xl">
          <h1 className="text-3xl md:text-5xl font-black text-white leading-tight mb-3">
            {banner.title}
          </h1>
          {banner.subtitle && (
            <p className="text-green-100 text-base md:text-xl mb-6">{banner.subtitle}</p>
          )}
          {banner.cta_label && banner.cta_href && (
            <Link
              href={banner.cta_href}
              className="inline-block px-6 py-3 bg-white text-green-600 font-bold rounded-xl hover:bg-green-50 transition-colors shadow-md text-sm md:text-base"
            >
              {banner.cta_label} →
            </Link>
          )}
        </div>
      </div>

      {/* Dots */}
      {items.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
          {items.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === current ? 'w-6 bg-white' : 'w-1.5 bg-white/50'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
