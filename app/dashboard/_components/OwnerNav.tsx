'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Leaf, LogOut, Package, ReceiptText, Store, Users } from 'lucide-react'

const links = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/products', label: 'Products', icon: Package },
  { href: '/dashboard/customers', label: 'Customers', icon: Users },
  { href: '/dashboard/pricing', label: 'Pricing Log', icon: ReceiptText },
]

function isActivePath(pathname: string, href: string) {
  if (href === '/dashboard') return pathname === href
  if (href === '/dashboard/pricing') return pathname.startsWith('/dashboard/pricing') || pathname.startsWith('/dashboard/scans')
  return pathname.startsWith(href)
}

export function OwnerNav({ email, storeName }: { email: string; storeName: string }) {
  const pathname = usePathname()

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-50 hidden w-64 flex-col border-r border-emerald-950/10 bg-[#fffefa] lg:flex">
        <div className="border-b border-emerald-950/10 px-6 py-6">
          <Link href="/dashboard" className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-[#173d31] text-lime-300"><Leaf size={20} fill="currentColor" /></span>
            <div>
              <p className="text-lg font-black tracking-tight text-[#173d31]">FreshSaver</p>
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-600">Owner portal</p>
            </div>
          </Link>
        </div>

        <div className="px-4 py-5">
          <div className="rounded-2xl bg-emerald-50 p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.15em] text-emerald-600">Managing</p>
            <p className="mt-1 truncate text-sm font-black text-[#173d31]">{storeName}</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-4" aria-label="Owner portal">
          {links.map(({ href, label, icon: Icon }) => {
            const active = isActivePath(pathname, href)
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold transition ${active ? 'bg-[#173d31] text-white shadow-md' : 'text-emerald-950/60 hover:bg-emerald-50 hover:text-emerald-900'}`}
              >
                <Icon size={18} className={active ? 'text-lime-300' : 'text-emerald-500'} />
                {label}
              </Link>
            )
          })}
        </nav>

        <div className="border-t border-emerald-950/10 p-4">
          <Link href="/" className="mb-3 flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold text-emerald-950/55 hover:bg-emerald-50 hover:text-emerald-900">
            <Store size={15} /> View marketplace
          </Link>
          <div className="mb-3 flex items-center gap-3 px-4">
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-lime-200 text-xs font-black text-emerald-950">{email.charAt(0).toUpperCase()}</span>
            <p className="truncate text-xs font-semibold text-emerald-950/55">{email}</p>
          </div>
          <form action="/api/auth/logout" method="POST">
            <button className="flex w-full items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold text-red-600 transition hover:bg-red-50">
              <LogOut size={15} /> Sign out
            </button>
          </form>
        </div>
      </aside>

      <header className="sticky top-0 z-40 border-b border-emerald-950/10 bg-[#fffefa]/95 backdrop-blur lg:hidden">
        <div className="flex h-16 items-center justify-between px-4">
          <Link href="/dashboard" className="flex items-center gap-2 font-black text-[#173d31]"><span className="grid size-9 place-items-center rounded-xl bg-[#173d31] text-lime-300"><Leaf size={18} fill="currentColor" /></span>FreshSaver</Link>
          <p className="max-w-[42%] truncate text-xs font-bold text-emerald-950/50">{storeName}</p>
        </div>
        <nav className="grid grid-cols-4 border-t border-emerald-950/10" aria-label="Owner portal">
          {links.map(({ href, label, icon: Icon }) => {
            const active = isActivePath(pathname, href)
            return (
              <Link key={href} href={href} className={`flex min-w-0 flex-col items-center gap-1 px-1 py-2.5 text-[10px] font-bold ${active ? 'bg-emerald-50 text-emerald-800' : 'text-emerald-950/40'}`}>
                <Icon size={17} />
                <span className="truncate">{label}</span>
              </Link>
            )
          })}
        </nav>
      </header>
    </>
  )
}
