import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getServerUser, getStoreAdminRecord } from '@/lib/auth'
import { daysUntilDate } from '@/lib/date-utils'
import { sendTierEmails, type TieredProduct } from '@/lib/email'

interface CampaignCopy {
  subject?: string
  headline?: string
  body?: string
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const storeAdmin = await getStoreAdminRecord(user.id)
  if (!storeAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  if (body.action !== 'approve' && body.action !== 'reject') {
    return NextResponse.json({ error: 'Action must be approve or reject' }, { status: 400 })
  }

  const { id } = await params
  const supabase = createServiceClient()
  const { data: recommendation } = await supabase
    .from('recommendations')
    .select('*')
    .eq('id', id)
    .eq('store_id', storeAdmin.store_id)
    .eq('status', 'pending')
    .maybeSingle()

  if (!recommendation) return NextResponse.json({ error: 'Pending recommendation not found' }, { status: 404 })

  if (body.action === 'reject') {
    const reason = typeof body.reason === 'string' ? body.reason.trim().slice(0, 500) : ''
    const { error } = await supabase.from('recommendations').update({
      status: 'rejected',
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      review_reason: reason || 'Rejected by store owner',
    }).eq('id', recommendation.id).eq('status', 'pending')
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ status: 'rejected' })
  }

  const { data: product } = await supabase
    .from('products')
    .select('id, sku, product_name, category, original_price, expiry_date, stock_quantity, image_url, is_active, is_expired, store_id, stores(name, address)')
    .eq('id', recommendation.product_id)
    .eq('store_id', storeAdmin.store_id)
    .maybeSingle()

  if (!product || !product.is_active || product.is_expired || product.stock_quantity <= 0) {
    return NextResponse.json({ error: 'Product is no longer available for this recommendation' }, { status: 409 })
  }
  if (daysUntilDate(product.expiry_date) <= 0) {
    await supabase.from('recommendations').update({ status: 'expired', reviewed_at: new Date().toISOString() }).eq('id', recommendation.id)
    return NextResponse.json({ error: 'This recommendation expired with the product' }, { status: 409 })
  }

  const approvedAt = new Date().toISOString()
  const { error: productError } = await supabase.from('products').update({
    discounted_price: recommendation.recommended_price,
    discount_tier: recommendation.tier,
    recommended_price: recommendation.recommended_price,
    recommended_discount_pct: recommendation.recommended_discount_pct,
  }).eq('id', product.id).eq('store_id', storeAdmin.store_id)
  if (productError) return NextResponse.json({ error: productError.message }, { status: 500 })

  const { error: recommendationError } = await supabase.from('recommendations').update({
    status: 'approved',
    reviewed_by: user.id,
    reviewed_at: approvedAt,
    applied_at: approvedAt,
    review_reason: typeof body.reason === 'string' ? body.reason.trim().slice(0, 500) || null : null,
  }).eq('id', recommendation.id).eq('status', 'pending')
  if (recommendationError) return NextResponse.json({ error: recommendationError.message }, { status: 500 })

  await supabase.rpc('append_price_history', {
    p_product_id: product.id,
    p_entry: {
      timestamp: approvedAt,
      scan_id: recommendation.scan_id,
      recommendation_id: recommendation.id,
      price_before: recommendation.regular_price,
      price_after: recommendation.recommended_price,
      discount_pct: recommendation.recommended_discount_pct,
      recommendation_version: recommendation.model_version,
      approved_by: user.id,
    },
  })

  await supabase.from('inventory_events').insert({
    store_id: storeAdmin.store_id,
    product_id: product.id,
    recommendation_id: recommendation.id,
    event_type: 'recommendation_approved',
    quantity: product.stock_quantity,
    unit_price: recommendation.recommended_price,
    source: 'owner_portal',
    recorded_by: user.id,
    metadata: { model_provider: recommendation.model_provider, model_version: recommendation.model_version },
  })

  const storeData = Array.isArray(product.stores) ? product.stores[0] : product.stores
  const tieredProduct: TieredProduct = {
    id: product.id,
    sku: product.sku,
    product_name: product.product_name,
    original_price: Number(product.original_price),
    new_price: Number(recommendation.recommended_price),
    new_tier: recommendation.tier,
    image_url: product.image_url,
    store_name: (storeData as { name?: string } | null)?.name ?? null,
    store_address: (storeData as { address?: string } | null)?.address ?? null,
    store_id: product.store_id,
    category: product.category,
    discount_pct: Number(recommendation.recommended_discount_pct),
    campaign_copy: recommendation.campaign_copy as CampaignCopy,
  }
  const emailsSent = await sendTierEmails(supabase, recommendation.scan_id, [tieredProduct])

  const { data: scan } = await supabase.from('scan_logs').select('emails_sent').eq('id', recommendation.scan_id).maybeSingle()
  await supabase.from('scan_logs').update({ emails_sent: Number(scan?.emails_sent ?? 0) + emailsSent }).eq('id', recommendation.scan_id)

  return NextResponse.json({ status: 'approved', emailsSent })
}
