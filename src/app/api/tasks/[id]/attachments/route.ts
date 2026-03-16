import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  if (file.size > 25 * 1024 * 1024) {
    return NextResponse.json({ error: 'File too large (max 25MB)' }, { status: 400 })
  }

  // Check attachment count
  const { count } = await supabase
    .from('task_attachments')
    .select('id', { count: 'exact', head: true })
    .eq('task_id', params.id)

  if ((count || 0) >= 10) {
    return NextResponse.json({ error: 'Maximum 10 files per task' }, { status: 400 })
  }

  const fileExt = file.name.split('.').pop()
  const filePath = `${params.id}/${Date.now()}-${file.name}`

  const arrayBuffer = await file.arrayBuffer()
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('task-attachments')
    .upload(filePath, arrayBuffer, {
      contentType: file.type,
      upsert: false,
    })

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

  const { data: { publicUrl } } = supabase.storage
    .from('task-attachments')
    .getPublicUrl(filePath)

  const { data: attachment, error: dbError } = await supabase
    .from('task_attachments')
    .insert({
      task_id: params.id,
      uploader_id: user.id,
      file_url: publicUrl,
      file_name: file.name,
      file_type: file.type,
      size: file.size,
    })
    .select('*, uploader:profiles(id,full_name,avatar_url,email)')
    .single()

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })

  // Log activity
  await supabase.from('task_activity').insert({
    task_id: params.id,
    user_id: user.id,
    action: 'uploaded',
    new_value: file.name,
  })

  return NextResponse.json({ attachment }, { status: 201 })
}
