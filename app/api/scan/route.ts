import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { runScan } from '@/lib/scan-engine'
import { getServerUser, getStoreAdminRecord } from '@/lib/auth'

const SUPER_ADMIN_EMAIL = 'admin@yahoo.com'

// POST /api/scan — trigger scan, streams SSE progress events
// Allowed: super admin OR registered store admin only
export async function POST(request: NextRequest) {
  const supabase = createServiceClient()

  const cronSecret = process.env.CRON_SECRET
  const authHeader = request.headers.get('authorization')
  const isCron = !!cronSecret && authHeader === `Bearer ${cronSecret}`

  // storeId scopes the scan to a single store (for store admins).
  // Super admin and cron scan all stores (storeId = undefined).
  let storeId: string | undefined

  if (!isCron) {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (user.email !== SUPER_ADMIN_EMAIL) {
      const storeAdmin = await getStoreAdminRecord(user.id)
      if (!storeAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      storeId = storeAdmin.store_id
    }
  }

  const triggeredBy = isCron ? 'cron' : 'manual'
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      function send(data: object) {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
        } catch {
          // client disconnected
        }
      }

      try {
        const summary = await runScan(supabase, triggeredBy, (event) => send(event), storeId)
        send({ phase: 'complete', ...summary })
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        send({ phase: 'error', message })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
      Connection: 'keep-alive',
    },
  })
}

// GET /api/scan — list scan logs
// Super admin: all logs. Store admin: filtered (scan_logs has no store_id, so store admins see all — acceptable for ops visibility)
export async function GET() {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServiceClient()

  // Customers blocked — must be super admin or store admin
  if (user.email !== SUPER_ADMIN_EMAIL) {
    const { data: storeAdmin } = await supabase
      .from('store_admins')
      .select('store_id')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle()
    if (!storeAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data, error } = await supabase
    .from('scan_logs')
    .select('*')
    .order('scanned_at', { ascending: false })
    .limit(50)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
