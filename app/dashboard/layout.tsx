import { redirect } from 'next/navigation'
import { getServerUser, getStoreAdminRecord } from '@/lib/auth'
import { OwnerNav } from './_components/OwnerNav'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getServerUser()
  if (!user) redirect('/login')

  const storeAdmin = await getStoreAdminRecord(user.id)
  if (!storeAdmin) redirect('/login')

  return (
    <div className="min-h-screen bg-[#f6f3ea] text-[#173d31]">
      <OwnerNav email={user.email ?? 'Store owner'} storeName={storeAdmin.store_name} />
      <main className="px-4 py-7 sm:px-6 lg:ml-64 lg:px-10 lg:py-10">{children}</main>
    </div>
  )
}
