export function hasSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  return Boolean(
    url && anonKey && serviceKey &&
    url.startsWith('https://') &&
    !url.includes('xxxx.supabase.co') &&
    !anonKey.startsWith('eyJ...') &&
    !serviceKey.startsWith('eyJ...')
  )
}
