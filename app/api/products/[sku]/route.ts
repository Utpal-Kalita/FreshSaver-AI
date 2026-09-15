import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireAuth, guardError, getStoreAdminRecord } from '@/lib/auth'

async function requireProductStore() {
 const user = await requireAuth()
 const storeAdmin = await getStoreAdminRecord(user.id)
 if (!storeAdmin) throw Response.json({ error: 'Forbidden' }, { status: 403 })
 return storeAdmin.store_id
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ sku: string }> }) {
 let storeId: string
 try { storeId = await requireProductStore() } catch (err) { return guardError(err) }

 const { sku } = await params
 const supabase = createServiceClient()
 const { data, error } = await supabase.from('products').select('*').eq('store_id', storeId).eq('sku', sku.toUpperCase()).single()

 if (error || !data) return NextResponse.json({ error: 'Product not found' }, { status: 404 })
 return NextResponse.json(data)
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ sku: string }> }) {
 let storeId: string
 try { storeId = await requireProductStore() } catch (err) { return guardError(err) }

 const { sku } = await params
 const supabase = createServiceClient()
 const body = await request.json()

 const allowed = ['manual_override_price', 'excluded_from_scan', 'is_active', 'discounted_price', 'discount_tier']
 const updates: Record<string, unknown> = {}
 for (const key of allowed) {
 if (key in body) updates[key] = body[key]
 }

 if (Object.keys(updates).length === 0) {
 return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
 }

 const { data, error } = await supabase
 .from('products')
 .update(updates)
 .eq('store_id', storeId)
 .eq('sku', sku.toUpperCase())
 .select()
 .single()

 if (error) return NextResponse.json({ error: error.message }, { status: 500 })
 return NextResponse.json(data)
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ sku: string }> }) {
 let storeId: string
 try { storeId = await requireProductStore() } catch (err) { return guardError(err) }

 const { sku } = await params
 const supabase = createServiceClient()

 const { error } = await supabase
 .from('products')
 .update({ is_active: false })
 .eq('store_id', storeId)
 .eq('sku', sku.toUpperCase())

 if (error) return NextResponse.json({ error: error.message }, { status: 500 })
 return NextResponse.json({ success: true })
}
