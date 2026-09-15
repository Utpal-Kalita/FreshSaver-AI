'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Tag, MapPin, ShoppingCart, User } from 'lucide-react'
import { useSyncExternalStore } from 'react'
import { getCart, getCartCount, getServerCart, subscribeCart } from '@/lib/cart'

const tabs = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/deals', label: 'Deals', icon: Tag },
  { href: '/stores', label: 'Stores', icon: MapPin },
  { href: '/cart', label: 'Cart', icon: ShoppingCart },
  { href: '/account', label: 'Account', icon: User },
]

export function BottomNav() {
  const pathname = usePathname()
  const cart = useSyncExternalStore(subscribeCart, getCart, getServerCart)
  const cartCount = getCartCount(cart)

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 bg-white border-t border-gray-100 shadow-lg md:hidden">
      <div className="flex items-stretch h-16">
        {tabs.map(({ href, label, icon: Icon }) => {
          const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href)
          const isCart = href === '/cart'
          return (
            <Link
              key={href}
              href={href}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 relative transition-colors ${
                isActive ? 'text-green-500' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <div className="relative">
                <Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
                {isCart && cartCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-green-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {cartCount > 9 ? '9+' : cartCount}
                  </span>
                )}
              </div>
              <span className={`text-[10px] font-medium ${isActive ? 'text-green-500' : ''}`}>{label}</span>
              {isActive && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-green-500 rounded-full" />
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
