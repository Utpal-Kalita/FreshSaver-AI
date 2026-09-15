import { SupabaseClient } from '@supabase/supabase-js'

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email'

export interface TieredProduct {
  id: string
  sku: string
  product_name: string
  original_price: number
  new_price: number
  new_tier: 'tier_1' | 'tier_2'
  image_url?: string | null
  store_name?: string | null
  store_address?: string | null
  store_id?: string | null
  category: string
  discount_pct: number
  campaign_copy?: {
    subject?: string
    headline?: string
    body?: string
  } | null
}

interface Customer {
  id: string
  email: string
  name: string | null
  subscribed_categories: string[] | null
}

interface StoreSubscription {
  store_id: string
  customer_id: string
  interested_categories: string[] | null
}

async function sendBrevoEmail(
  customer: Customer,
  product: TieredProduct,
): Promise<{ messageId?: string; error?: string }> {
  const tier = product.new_tier
  const discountPct = `${Math.round(product.discount_pct)}%`
  const storeQuery = product.store_id ? `?store=${encodeURIComponent(product.store_id)}` : ''
  const productUrl = `${process.env.NEXT_PUBLIC_STORE_URL}/product/${product.sku}${storeQuery}`
  const safeCustomerName = escapeHtml(customer.name || 'there')
  const safeProductName = escapeHtml(product.product_name)
  const safeStoreName = product.store_name ? escapeHtml(product.store_name) : null
  const safeStoreAddress = product.store_address ? escapeHtml(product.store_address) : null
  const safeHeadline = escapeHtml(product.campaign_copy?.headline || (tier === 'tier_1' ? 'Flash Deal' : 'Final Markdown'))
  const safeBody = escapeHtml(product.campaign_copy?.body || `Great news! We have marked down ${product.product_name} to help keep good food in use.`)
  const subject = product.campaign_copy?.subject || (tier === 'tier_1'
    ? `Flash Deal: ${discountPct} off ${product.product_name}`
    : `Last Chance: ${discountPct} off ${product.product_name}`)

  const payload = {
    sender: {
      email: process.env.BREVO_SENDER_EMAIL || 'noreply@freshsaver.app',
      name: process.env.BREVO_SENDER_NAME || 'FreshSaver Deals',
    },
    to: [{ email: customer.email, name: customer.name || customer.email }],
    subject,
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #fdfdfd; border: 1px solid #d1fae5; border-radius: 12px; overflow: hidden;">
        <div style="background: #10b981; padding: 24px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 900; letter-spacing: 1px;">FreshSaver Deals</h1>
          <p style="color: #ecfdf5; margin: 8px 0 0 0; font-size: 14px; text-transform: uppercase; font-weight: bold;">
             ${safeHeadline}
          </p>
        </div>
        <div style="padding: 32px 24px;">
          <h2 style="font-size: 20px; color: #022c22; margin-top: 0;">Hi ${safeCustomerName},</h2>
          <p style="color: #065f46; font-size: 16px; line-height: 1.5;">${safeBody}</p>
          
          <div style="background: #f0fdf4; border: 2px dashed #34d399; border-radius: 8px; padding: 16px; text-align: center; margin: 24px 0;">
            <p style="color: #065f46; margin: 0 0 8px 0; font-size: 16px; font-weight: 700;">${safeProductName}</p>
            <p style="text-decoration: line-through; color: #9ca3af; margin: 0; font-size: 14px;">Original Price: ₹${product.original_price.toFixed(2)}</p>
            <p style="color: #10b981; font-size: 28px; font-weight: 900; margin: 4px 0;">Now: ₹${product.new_price.toFixed(2)}</p>
            <p style="color: #059669; font-weight: bold; margin: 0;">${discountPct} OFF</p>
          </div>

          ${safeStoreName ? `
          <div style="background: #f0fdf4; padding: 12px 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #22c55e;">
            <p style="color: #065f46; font-size: 13px; margin: 0;">
              <strong>Available at:</strong> ${safeStoreName}${safeStoreAddress ? `<br/><span style="color: #6b7280;">${safeStoreAddress}</span>` : ''}
            </p>
          </div>` : ''}

          <div style="text-align: center; margin-top: 32px;">
            <a href="${productUrl}" style="background: #10b981; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(16, 185, 129, 0.2);">
              Reserve Item Now
            </a>
          </div>
        </div>
        <div style="background: #f8fafc; padding: 16px; text-align: center; border-top: 1px solid #e2e8f0;">
          <p style="color: #64748b; font-size: 12px; margin: 0;">You're receiving this because you subscribed to FreshSaver Deals.</p>
          <p style="color: #64748b; font-size: 12px; margin: 4px 0 0 0;">Save food, save money, save the planet 🌱</p>
        </div>
      </div>
    `,
  }

  try {
    const res = await fetch(BREVO_API_URL, {
      method: 'POST',
      headers: {
        'api-key': process.env.BREVO_API_KEY!,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const body = await res.text()
      return { error: `Brevo ${res.status}: ${body.slice(0, 200)}` }
    }

    const data = await res.json()
    return { messageId: data.messageId }
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) }
  }
}

function sleep(ms: number) {
  return new Promise(res => setTimeout(res, ms))
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

export async function sendTierEmails(
  supabase: SupabaseClient,
  scanId: string,
  tieredProducts: TieredProduct[]
): Promise<number> {
  if (tieredProducts.length === 0) return 0

  if (!process.env.BREVO_API_KEY) {
    console.warn('BREVO_API_KEY not set — skipping email dispatch')
    return 0
  }

  const storeIds = [...new Set(tieredProducts.map(product => product.store_id).filter((id): id is string => Boolean(id)))]
  if (storeIds.length === 0) return 0

  const { data: subscriptionRows, error: subscriptionError } = await supabase
    .from('store_subscriptions')
    .select('store_id, customer_id, interested_categories')
    .in('store_id', storeIds)
    .eq('notifications_enabled', true)

  if (subscriptionError || !subscriptionRows?.length) return 0

  const subscriptions = subscriptionRows as StoreSubscription[]
  const customerIds = [...new Set(subscriptions.map(subscription => subscription.customer_id))]
  const { data: customerRows, error: customerError } = await supabase
    .from('customers')
    .select('id, email, name, subscribed_categories')
    .in('id', customerIds)
    .eq('is_subscribed', true)

  if (customerError || !customerRows?.length) return 0
  const customerById = new Map((customerRows as Customer[]).map(customer => [customer.id, customer]))

  let sentCount = 0

  for (const product of tieredProducts) {
    const productSubscriptions = subscriptions.filter(subscription => subscription.store_id === product.store_id)
    for (const subscription of productSubscriptions) {
      const customer = customerById.get(subscription.customer_id)
      if (!customer) continue
      const preferences = subscription.interested_categories?.length
        ? subscription.interested_categories
        : customer.subscribed_categories ?? []
      if (preferences.length > 0 && !preferences.some(category => category.toLowerCase() === product.category.toLowerCase())) {
        continue
      }
      // Check deduplication
      const { data: existing } = await supabase
        .from('email_logs')
        .select('id, status')
        .eq('customer_email', customer.email)
        .eq('product_id', product.id)
        .eq('tier', product.new_tier)
        .maybeSingle()

      if (existing?.status === 'sent') continue

      const { messageId, error: sendError } = await sendBrevoEmail(customer, product)

      await supabase.from('email_logs').upsert({
        customer_email: customer.email,
        product_sku: product.sku,
        product_id: product.id,
        tier: product.new_tier,
        scan_id: scanId,
        brevo_message_id: messageId ?? null,
        status: sendError ? 'failed' : 'sent',
        error_message: sendError ?? null,
        store_id: product.store_id ?? null,
        sent_at: new Date().toISOString(),
      }, { onConflict: 'customer_email,product_id,tier' })

      if (!sendError) sentCount++

      // Rate limit: 200ms between calls (stay within 300 emails/min)
      await sleep(200)
    }
  }

  return sentCount
}
