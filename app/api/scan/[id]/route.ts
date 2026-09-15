import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getStoreAdminRecord, guardError, requireAuth } from '@/lib/auth'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let user
  try { user = await requireAuth() } catch (err) { return guardError(err) }
  const storeAdmin = await getStoreAdminRecord(user.id)
  if (!storeAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

 const { id } = await params
 const supabase = createServiceClient()

 const { data: scanLog, error: logErr } = await supabase
 .from('scan_logs')
 .select('*')
 .eq('id', id)
 .eq('store_id', storeAdmin.store_id)
 .single()

 if (logErr || !scanLog) return NextResponse.json({ error: 'Scan not found' }, { status: 404 })

 const { data: results } = await supabase
 .from('scan_product_results')
 .select('*')
 .eq('scan_id', id)
 .order('created_at', { ascending: true })

 return NextResponse.json({ ...scanLog, results: results ?? [] })
}
