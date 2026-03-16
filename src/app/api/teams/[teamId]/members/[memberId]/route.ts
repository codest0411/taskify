import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

interface Params { params: { teamId: string; memberId: string } }

export async function PATCH(request: NextRequest, { params }: Params) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { role } = await request.json()

  const { data: requester } = await supabase
    .from('team_members')
    .select('role')
    .eq('team_id', params.teamId)
    .eq('user_id', user.id)
    .single()

  if (!requester || !['owner', 'admin'].includes(requester.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { error } = await supabase
    .from('team_members')
    .update({ role })
    .eq('id', params.memberId)
    .eq('team_id', params.teamId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: requester } = await supabase
    .from('team_members')
    .select('role')
    .eq('team_id', params.teamId)
    .eq('user_id', user.id)
    .single()

  if (!requester || !['owner', 'admin'].includes(requester.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { error } = await supabase
    .from('team_members')
    .delete()
    .eq('id', params.memberId)
    .eq('team_id', params.teamId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
