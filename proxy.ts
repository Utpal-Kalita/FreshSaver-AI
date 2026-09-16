import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const SUPER_ADMIN_EMAIL = 'admin@yahoo.com'

export async function proxy(request: NextRequest) {
  const { pathname: rawPathname } = request.nextUrl
  const pathname = rawPathname.toLowerCase()

  function redirectTo(path: string) {
    return NextResponse.redirect(new URL(path, request.url))
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const hasAuthConfig = Boolean(
    supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl.startsWith('https://') &&
    !supabaseUrl.includes('xxxx.supabase.co') &&
    !supabaseAnonKey.startsWith('eyJ...')
  )

  if (!hasAuthConfig) {
    const protectedPath = pathname.startsWith('/dashboard') ||
      pathname.startsWith('/admin/') ||
      pathname.startsWith('/account') ||
      pathname.startsWith('/checkout')
    return protectedPath ? redirectTo('/') : NextResponse.next()
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    supabaseUrl!,
    supabaseAnonKey!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session on every request
  const { data: { user } } = await supabase.auth.getUser()

  // ── /admin/dashboard/** — super admin only ──────────────────
  if (pathname.startsWith('/admin/dashboard')) {
    if (!user || user.email !== SUPER_ADMIN_EMAIL) return redirectTo('/login')
    return supabaseResponse
  }

  // ── /dashboard/** — store admins only ───────────────────────
  if (pathname.startsWith('/dashboard')) {
    if (!user) return redirectTo('/login')
    // Super admin has no business in the store dashboard
    if (user.email === SUPER_ADMIN_EMAIL) return redirectTo('/admin/dashboard')
    // Must be a registered store admin
    const { data: storeAdmin } = await supabase
      .from('store_admins')
      .select('store_id')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle()
    if (!storeAdmin) return redirectTo('/login')
    return supabaseResponse
  }

  // ── /admin/[store-slug]/** — store admins only ───────────────
  if (pathname.startsWith('/admin/')) {
    if (!user) return redirectTo('/auth/login')
    if (user.email === SUPER_ADMIN_EMAIL) return redirectTo('/admin/dashboard')
    return supabaseResponse
  }

  // ── Customer protected routes ────────────────────────────────
  if (pathname.startsWith('/account') || pathname.startsWith('/checkout')) {
    if (!user) return redirectTo('/auth/login?redirect=' + encodeURIComponent(pathname))
    return supabaseResponse
  }

  // Auth pages keep the opposite-role login available so judges can switch personas.
  if ((pathname === '/login' || pathname === '/auth/login' || pathname === '/auth/signup') && user) {
    if (user.email === SUPER_ADMIN_EMAIL) return redirectTo('/admin/dashboard')
    const { data: storeAdmin } = await supabase
      .from('store_admins')
      .select('store_id')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle()

    if (pathname === '/login') {
      return storeAdmin ? redirectTo('/dashboard') : supabaseResponse
    }
    if (pathname === '/auth/login') {
      return storeAdmin ? supabaseResponse : redirectTo('/')
    }
    return storeAdmin ? redirectTo('/dashboard') : redirectTo('/')
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/dashboard/:path*',
    '/login',
    '/auth/login',
    '/auth/signup',
    '/account/:path*',
    '/checkout/:path*',
  ],
}
