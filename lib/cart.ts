'use client'

const CART_KEY = 'freshsaver_cart'
const EMPTY_CART: CartItem[] = []
let cartSnapshot: CartItem[] | null = null

export interface CartItem {
  productId: string
  sku: string
  productName: string
  storeId: string
  storeSlug: string
  storeName: string
  quantity: number
  unitPrice: number
  imageUrl?: string
}

export function getCart(): CartItem[] {
  if (typeof window === 'undefined') return EMPTY_CART
  if (cartSnapshot) return cartSnapshot
  try {
    const raw = localStorage.getItem(CART_KEY)
    cartSnapshot = raw ? JSON.parse(raw) : EMPTY_CART
  } catch {
    cartSnapshot = EMPTY_CART
  }
  return cartSnapshot ?? EMPTY_CART
}

function saveCart(items: CartItem[]) {
  cartSnapshot = items
  localStorage.setItem(CART_KEY, JSON.stringify(items))
  window.dispatchEvent(new CustomEvent('cart-updated', { detail: items }))
}

export function subscribeCart(listener: () => void) {
  const handleStorage = () => {
    cartSnapshot = null
    listener()
  }
  window.addEventListener('cart-updated', listener)
  window.addEventListener('storage', handleStorage)
  return () => {
    window.removeEventListener('cart-updated', listener)
    window.removeEventListener('storage', handleStorage)
  }
}

export function getServerCart() {
  return EMPTY_CART
}

export function addToCart(item: CartItem): { cleared: boolean } {
  const cart = getCart()
  const differentStore = cart.length > 0 && cart[0].storeId !== item.storeId

  if (differentStore) {
    // Clear cart and start fresh with new store
    const existing = cart.find(c => c.sku === item.sku)
    if (existing) {
      existing.quantity += item.quantity
      saveCart([existing])
    } else {
      saveCart([item])
    }
    return { cleared: true }
  }

  const existing = cart.find(c => c.sku === item.sku)
  if (existing) {
    existing.quantity += item.quantity
    saveCart(cart)
  } else {
    saveCart([...cart, item])
  }
  return { cleared: false }
}

export function removeFromCart(sku: string) {
  saveCart(getCart().filter(c => c.sku !== sku))
}

export function updateQuantity(sku: string, qty: number) {
  if (qty <= 0) {
    removeFromCart(sku)
    return
  }
  const cart = getCart()
  const item = cart.find(c => c.sku === sku)
  if (item) {
    item.quantity = qty
    saveCart(cart)
  }
}

export function clearCart() {
  cartSnapshot = EMPTY_CART
  localStorage.removeItem(CART_KEY)
  window.dispatchEvent(new CustomEvent('cart-updated', { detail: [] }))
}

export function getCartCount(items = getCart()): number {
  return items.reduce((sum, item) => sum + item.quantity, 0)
}

export function getCartTotal(items = getCart()): number {
  return items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
}
