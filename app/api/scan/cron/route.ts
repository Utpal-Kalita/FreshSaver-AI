import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { runScan } from '@/lib/scan-engine'

// GET /api/scan/cron — Dedicated endpoint for Vercel Cron (which only sends GET requests)
export async function GET(request: NextRequest) {
  const supabase = createServiceClient()

  // Vercel sends the cron secret in the Authorization header
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    return NextResponse.json({ error: 'Cron not configured' }, { status: 503 })
  }

  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const summary = await runScan(supabase, 'cron')
    return NextResponse.json({ success: true, ...summary })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    if (message.includes('already in progress')) {
      return NextResponse.json({ error: message }, { status: 409 })
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
