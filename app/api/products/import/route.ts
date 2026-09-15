import { NextRequest, NextResponse } from 'next/server'
import { getServerUser, getStoreAdminRecord } from '@/lib/auth'
import { parseProductCSV } from '@/lib/csv-parser'
import { uploadCSV } from '@/lib/supabase/storage'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
 const user = await getServerUser()
 if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
 const storeAdmin = await getStoreAdminRecord(user.id)
 if (!storeAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
 const storeId = storeAdmin.store_id

 const supabase = createServiceClient()

 let formData: FormData
 try {
 formData = await request.formData()
 } catch {
 return NextResponse.json({ error: 'Expected multipart/form-data' }, { status: 400 })
 }

  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  if (!file.name.toLowerCase().endsWith('.csv')) return NextResponse.json({ error: 'File must be a CSV' }, { status: 400 })
  if (file.size > 5 * 1024 * 1024) return NextResponse.json({ error: 'CSV must be 5 MB or smaller' }, { status: 413 })

 const buffer = Buffer.from(await file.arrayBuffer())
 const csvText = buffer.toString('utf-8')

 // Upload to Supabase Storage for audit
 let storagePath = ''
 try {
 storagePath = await uploadCSV(file.name, buffer)
 } catch (err) {
 // Storage failure is non-fatal — continue with import
 console.error('Storage upload failed:', err)
 }

 const { valid, errors } = parseProductCSV(csvText)

 let added = 0
 let updated = 0

 if (valid.length > 0) {
 // Fetch existing SKUs to distinguish add vs update
 const skus = valid.map(p => p.sku)
  const { data: existing } = await supabase
  .from('products')
  .select('sku')
  .in('sku', skus)
  .eq('store_id', storeId)
 const existingSkus = new Set((existing || []).map((r: { sku: string }) => r.sku))

 const rows = valid.map(p => ({
 product_name: p.product_name,
 sku: p.sku,
 original_price: p.original_price,
 mrp: p.mrp,
 expiry_date: p.expiry_date,
 category: p.category,
 image_url: p.image_url ?? null,
  stock_quantity: p.stock_quantity,
  unit_cost: p.unit_cost ?? null,
  minimum_price: p.minimum_price ?? null,
  disposal_cost_per_unit: p.disposal_cost_per_unit ?? 0,
 discounted_price: p.original_price,
 discount_tier: 'none',
 is_active: true,
 store_id: storeId,
 }))

 const { error: upsertError } = await supabase
 .from('products')
 .upsert(rows, { onConflict: 'store_id,sku', ignoreDuplicates: false })

 if (upsertError) {
 return NextResponse.json({ error: `DB upsert failed: ${upsertError.message}` }, { status: 500 })
 }

 valid.forEach(p => {
 if (existingSkus.has(p.sku)) updated++
 else added++
 })
 }

 // Log the upload
 await supabase.from('csv_upload_logs').insert({
 filename: file.name,
 storage_path: storagePath,
 total_rows: valid.length + errors.length,
 rows_succeeded: valid.length,
 rows_failed: errors.length,
  error_details: errors,
  uploaded_by: user.id,
  store_id: storeId,
  })

 return NextResponse.json({
 added,
 updated,
 failed: errors.length,
 errors,
 })
}
