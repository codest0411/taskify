import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { content } = await request.json()
  if (!content?.trim()) return NextResponse.json({ error: 'Content required' }, { status: 400 })

  const { data: comment, error } = await supabase
    .from('task_comments')
    .insert({ task_id: params.id, user_id: user.id, content: content.trim() })
    .select('*, user:profiles(id,full_name,avatar_url,email)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabase.from('task_activity').insert({
    task_id: params.id,
    user_id: user.id,
    action: 'commented',
    new_value: content.slice(0, 100),
  })

  return NextResponse.json({ comment }, { status: 201 })
}
