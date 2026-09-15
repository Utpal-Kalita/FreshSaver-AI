import { createServiceClient } from '@/lib/supabase/server'

const BUCKET = 'csv-uploads'

export async function uploadCSV(filename: string, buffer: Buffer): Promise<string> {
  const supabase = createServiceClient()
  const timestamp = Date.now()
  const path = `${timestamp}_${filename}`

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, buffer, { contentType: 'text/csv', upsert: false })

  if (error) throw new Error(`Storage upload failed: ${error.message}`)
  return path
}
