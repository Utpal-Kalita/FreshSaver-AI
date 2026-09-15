'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Leaf, ShoppingCart, Store, User, LogIn } from 'lucide-react'
import { useSyncExternalStore } from 'react'
import { getCart, getCartCount, getServerCart, subscribeCart } from '@/lib/cart'

const navLinks = [
  { href: '/deals', label: 'Deals' },
  { href: '/stores', label: 'Stores' },
  { href: '/#mission', label: 'Our mission' },
]

interface TopNavProps {
  isLoggedIn: boolean
}

export function TopNav({ isLoggedIn }: TopNavProps) {
  const pathname = usePathname()
  const cart = useSyncExternalStore(subscribeCart, getCart, getServerCart)
  const cartCount = getCartCount(cart)

  return (
    <header className="sticky top-0 z-50 border-b border-emerald-950/10 bg-[#fffefa]/95 shadow-sm backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="flex size-9 items-center justify-center rounded-xl bg-[#173d31] text-lime-300">
            <Leaf size={18} fill="currentColor" />
          </div>
          <span className="text-xl font-black tracking-tight text-[#173d31]">FreshSaver</span>
        </Link>

        {/* Center links */}
        <nav className="hidden items-center gap-8 md:flex">
          {navLinks.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`text-sm font-semibold transition-colors ${
                (href === '/#mission' ? false : pathname.startsWith(href))
                  ? 'text-green-600'
                  : 'text-gray-600 hover:text-green-600'
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* Right actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          <Link href="/login" className="flex items-center gap-2 rounded-xl border border-emerald-900/15 px-3 py-2 text-xs font-black text-[#173d31] transition-colors hover:bg-emerald-50 sm:px-4 sm:text-sm">
            <Store size={16} />
            <span className="hidden sm:inline">Store owner</span>
            <span className="sm:hidden">Owner login</span>
          </Link>
          <Link href="/cart" aria-label="Shopping cart" className="relative hidden rounded-xl p-2 transition-colors hover:bg-green-50 md:block">
            <ShoppingCart size={20} className="text-gray-600" />
            {cartCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-green-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {cartCount > 9 ? '9+' : cartCount}
              </span>
            )}
          </Link>
          <div className="hidden md:block">{isLoggedIn ? (
            <Link href="/account" className="flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-green-600 transition-colors">
              <User size={18} />
              Account
            </Link>
          ) : (
            <Link href="/auth/login" className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white text-sm font-bold rounded-xl transition-colors">
              <LogIn size={16} />
              Sign In
            </Link>
          )}</div>
        </div>
      </div>
    </header>
  )
}
