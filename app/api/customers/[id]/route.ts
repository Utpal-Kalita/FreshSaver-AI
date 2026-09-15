import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getServerUser, getStoreAdminRecord } from '@/lib/auth'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const storeAdmin = await getStoreAdminRecord(user.id)
  if (!storeAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const body = await request.json()
  if (typeof body.notifications_enabled !== 'boolean') {
    return NextResponse.json({ error: 'notifications_enabled must be a boolean' }, { status: 400 })
  }

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('store_subscriptions')
    .update({ notifications_enabled: body.notifications_enabled })
    .eq('store_id', storeAdmin.store_id)
    .eq('customer_id', id)
    .select('id, notifications_enabled')
    .single()

  if (error) return NextResponse.json({ error: 'Store subscription not found' }, { status: 404 })
  return NextResponse.json(data)
}
