import { readFile } from 'node:fs/promises'
import { createClient } from '@supabase/supabase-js'
import Papa from 'papaparse'

const required = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'DEMO_STORE_OWNER_EMAIL',
  'DEMO_STORE_OWNER_PASSWORD',
  'DEMO_CUSTOMER_EMAIL',
  'DEMO_CUSTOMER_PASSWORD',
]

const missing = required.filter(name => !process.env[name])
if (missing.length > 0) throw new Error(`Missing required environment variables: ${missing.join(', ')}`)

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
)

async function requireData(promise, context) {
  const { data, error } = await promise
  if (error) throw new Error(`${context}: ${error.message}`)
  return data
}

async function ensureAuthUser(email, password, fullName) {
  const normalizedEmail = email.trim().toLowerCase()
  const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 })
  if (error) throw new Error(`List Auth users: ${error.message}`)

  const existing = data.users.find(user => user.email?.toLowerCase() === normalizedEmail)
  if (existing) {
    const updated = await supabase.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
      user_metadata: { ...existing.user_metadata, full_name: fullName },
    })
    if (updated.error) throw new Error(`Update demo Auth user: ${updated.error.message}`)
    return updated.data.user
  }

  const created = await supabase.auth.admin.createUser({
    email: normalizedEmail,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  })
  if (created.error || !created.data.user) throw new Error(`Create demo Auth user: ${created.error?.message ?? 'No user returned'}`)
  return created.data.user
}

const owner = await ensureAuthUser(
  process.env.DEMO_STORE_OWNER_EMAIL,
  process.env.DEMO_STORE_OWNER_PASSWORD,
  'Demo Store Owner',
)
const shopper = await ensureAuthUser(
  process.env.DEMO_CUSTOMER_EMAIL,
  process.env.DEMO_CUSTOMER_PASSWORD,
  'Demo Shopper',
)

const store = await requireData(
  supabase
    .from('stores')
    .upsert({
      name: 'Willow & Pine Market',
      slug: 'willow-pine-market',
      address: '123 Market Road',
      city: 'Bengaluru',
      phone: '+91 90000 00000',
      is_active: true,
    }, { onConflict: 'slug' })
    .select('id, name, slug')
    .single(),
  'Create demo store',
)

await requireData(
  supabase
    .from('store_admins')
    .upsert({ user_id: owner.id, store_id: store.id }, { onConflict: 'user_id,store_id' })
    .select('id'),
  'Assign demo owner',
)

const customer = await requireData(
  supabase
    .from('customers')
    .upsert({
      email: process.env.DEMO_CUSTOMER_EMAIL.trim().toLowerCase(),
      name: 'Demo Shopper',
      user_id: shopper.id,
      is_subscribed: true,
      phone: '+91 90000 00001',
      location: 'Bengaluru',
      subscribed_categories: ['Dairy', 'Bakery', 'Produce'],
    }, { onConflict: 'email' })
    .select('id')
    .single(),
  'Create demo customer profile',
)

await requireData(
  supabase
    .from('store_subscriptions')
    .upsert({
      store_id: store.id,
      customer_id: customer.id,
      source: 'website',
      interested_categories: ['Dairy', 'Bakery', 'Produce'],
      notifications_enabled: true,
    }, { onConflict: 'store_id,customer_id' })
    .select('id'),
  'Subscribe demo customer to store',
)

const csv = await readFile(new URL('../sample_inventory.csv', import.meta.url), 'utf8')
const parsed = Papa.parse(csv, { header: true, skipEmptyLines: true, transformHeader: header => header.trim().toLowerCase() })
if (parsed.errors.length > 0) throw new Error(`Parse sample inventory: ${parsed.errors[0].message}`)

const products = parsed.data.map(row => ({
  store_id: store.id,
  product_name: row.product_name.trim(),
  sku: row.sku.trim().toUpperCase(),
  original_price: Number(row.price),
  mrp: Number(row.mrp),
  discounted_price: Number(row.price),
  expiry_date: row.expiry_date.trim(),
  category: row.category.trim(),
  image_url: row.image_url?.trim() || null,
  stock_quantity: Number(row.stock_quantity),
  unit_cost: row.unit_cost ? Number(row.unit_cost) : null,
  minimum_price: row.minimum_price ? Number(row.minimum_price) : null,
  disposal_cost_per_unit: row.disposal_cost_per_unit ? Number(row.disposal_cost_per_unit) : 0,
  discount_tier: 'none',
  is_expired: false,
  is_active: true,
}))

await requireData(
  supabase.from('products').upsert(products, { onConflict: 'store_id,sku' }).select('id'),
  'Import sample inventory',
)

console.log(`Bootstrap complete: ${store.name}`)
console.log('Demo owner: configured and assigned')
console.log('Demo customer: configured and subscribed')
console.log(`Inventory products: ${products.length}`)
