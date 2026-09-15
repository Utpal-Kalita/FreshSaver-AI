import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireAuth, guardError } from '@/lib/auth'

export async function GET(request: NextRequest) {
 try { await requireAuth() } catch (err) { return guardError(err) }

 const supabase = createServiceClient()
 const { searchParams } = new URL(request.url)
 const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
 const limit = Math.min(100, parseInt(searchParams.get('limit') || '50'))
 const offset = (page - 1) * limit

 const { data, error, count } = await supabase
 .from('email_logs')
 .select('*', { count: 'exact' })
 .order('sent_at', { ascending: false })
 .range(offset, offset + limit - 1)

 if (error) return NextResponse.json({ error: error.message }, { status: 500 })
 return NextResponse.json({ data, total: count, page, limit })
}
