import { BottomNav } from '@/components/customer/BottomNav'
import { TopNav } from '@/components/customer/TopNav'
import { createClient } from '@/lib/supabase/server'
import { hasSupabaseConfig } from '@/lib/env'

export default async function CustomerLayout({ children }: { children: React.ReactNode }) {
  let isLoggedIn = false
  if (hasSupabaseConfig()) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    isLoggedIn = Boolean(user)
  }

  return (
    <div className="min-h-screen bg-[#f6f3ea] font-sans">
      <TopNav isLoggedIn={isLoggedIn} />
      <main className="pb-20 md:pb-0">{children}</main>
      <BottomNav />
    </div>
  )
}
