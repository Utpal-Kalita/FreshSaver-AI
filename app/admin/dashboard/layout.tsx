import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import {
  LayoutDashboard,
  Store,
  BarChart3,
  LogOut,
  ShieldCheck,
} from 'lucide-react'

const SUPER_ADMIN_EMAIL = 'admin@yahoo.com'

const navLinks = [
  { href: '/admin/dashboard',            label: 'Overview',   icon: LayoutDashboard },
  { href: '/admin/dashboard/stores',     label: 'Stores',     icon: Store },
  { href: '/admin/dashboard/analytics',  label: 'Analytics',  icon: BarChart3 },
]

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  if (user.email !== SUPER_ADMIN_EMAIL) redirect('/login')

  return (
    <div className="flex min-h-screen bg-slate-950 font-sans text-foreground">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col fixed inset-y-0 shadow-xl z-50">
        <div className="px-6 py-8">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center">
              <ShieldCheck size={16} className="text-white" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-white">FreshSaver</span>
              <p className="text-[10px] uppercase tracking-widest text-emerald-400 font-bold -mt-0.5">Super Admin</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-4 py-2 space-y-1">
          {navLinks.map((link) => {
            const Icon = link.icon
            return (
              <Link
                key={link.href}
                href={link.href}
                className="group flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-emerald-400 transition-all duration-200"
              >
                <Icon size={18} className="text-slate-600 group-hover:text-emerald-400 transition-colors" />
                {link.label}
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 px-4 py-3 bg-slate-800/60 rounded-2xl mb-4 border border-slate-700">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-xs">
              {user.email?.charAt(0).toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-semibold text-slate-200 truncate">{user.email}</p>
              <p className="text-[10px] text-slate-500">Super Administrator</p>
            </div>
          </div>
          <form action="/api/auth/logout" method="POST">
            <button className="flex items-center gap-2 w-full px-4 py-2 text-xs font-semibold text-red-400 hover:bg-red-900/30 rounded-lg transition-colors group">
              <LogOut size={14} className="group-hover:translate-x-0.5 transition-transform" />
              Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 ml-64 p-10 overflow-auto bg-slate-950">{children}</main>
    </div>
  )
}
