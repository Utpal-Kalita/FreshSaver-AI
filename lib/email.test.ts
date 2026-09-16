import { afterEach, describe, expect, it } from 'vitest'
import { buildBrevoEmailPayload, type Customer, type TieredProduct } from '@/lib/email'

afterEach(() => {
  delete process.env.NEXT_PUBLIC_STORE_URL
  delete process.env.BREVO_SENDER_EMAIL
  delete process.env.BREVO_SENDER_NAME
})

describe('customized surplus-food email', () => {
  it('personalizes locally and safely renders a generated recipe', () => {
    process.env.NEXT_PUBLIC_STORE_URL = 'https://freshsaver.example'
    const customer: Customer = {
      id: 'customer-1',
      email: 'asha@example.com',
      name: 'Asha<script>\r\nBcc: attacker@example.com',
      subscribed_categories: ['Dairy'],
    }
    const product: TieredProduct = {
      id: 'product-1',
      sku: 'MILK-1',
      product_name: 'Whole <Milk>',
      original_price: 100,
      new_price: 80,
      new_tier: 'tier_2',
      store_name: 'Willow & Pine',
      store_address: '123 Market Road',
      store_id: 'store-1',
      category: 'Dairy',
      discount_pct: 20,
      campaign_copy: {
        subject: '20% off milk + recipe',
        headline: 'A dairy deal for you',
        body: 'Use this deal in a quick breakfast.',
        recipe: {
          title: 'Cinnamon <script>alert(1)</script> oats',
          intro: 'A fast breakfast idea.',
          ingredients: ['Whole milk', '<img src=x onerror=alert(1)>', 'Oats', 'Banana'],
          steps: ['Warm the milk.', 'Stir in oats.', 'Top with banana.'],
        },
      },
    }

    const payload = buildBrevoEmailPayload(customer, product)
    expect(payload.subject).toBe('Ashascript, 20% off milk + recipe')
    expect(payload.subject).not.toContain('\n')
    expect(payload.to[0].name).not.toContain('<')
    expect(payload.htmlContent).toContain('You asked for Dairy deals from Willow &amp; Pine')
    expect(payload.htmlContent).toContain('Recipe idea for your FreshSaver find')
    expect(payload.htmlContent).toContain('Cinnamon &lt;script&gt;alert(1)&lt;/script&gt; oats')
    expect(payload.htmlContent).toContain('&lt;img src=x onerror=alert(1)&gt;')
    expect(payload.htmlContent).toContain('Check the package date, storage condition, allergens, and cooking instructions')
    expect(payload.htmlContent).not.toContain('<img src=x onerror=alert(1)>')
  })

  it('uses a category-based recipe fallback when generated recipe data is missing', () => {
    const customer: Customer = {
      id: 'customer-2',
      email: 'shopper@example.com',
      name: 'Ravi',
      subscribed_categories: ['Bakery'],
    }
    const product: TieredProduct = {
      id: 'product-2',
      sku: 'BREAD-1',
      product_name: 'Sourdough loaf',
      original_price: 120,
      new_price: 90,
      new_tier: 'tier_1',
      store_id: 'store-1',
      category: 'Bakery',
      discount_pct: 25,
      campaign_copy: { subject: 'Bread deal' },
    }

    const payload = buildBrevoEmailPayload(customer, product)
    expect(payload.subject).toBe('Ravi, Bread deal')
    expect(payload.htmlContent).toContain('Crispy Sourdough loaf savory bites')
    expect(payload.htmlContent).toContain('Toast until crisp')
  })
})
