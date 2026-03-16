import { createClient, createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const adminSupabase = createServiceClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { invite_code } = await request.json()
  if (!invite_code) return NextResponse.json({ error: 'Invite code required' }, { status: 400 })

  // Use adminSupabase to find the team by invite code, as standard RLS might block non-members
  const { data: team, error } = await adminSupabase
    .from('teams')
    .select('id, name')
    .eq('invite_code', invite_code.toUpperCase())
    .single()

  if (error || !team) return NextResponse.json({ error: 'Invalid invite code' }, { status: 404 })

  // Check if already a member
  const { data: existing } = await adminSupabase
    .from('team_members')
    .select('id')
    .eq('team_id', team.id)
    .eq('user_id', user.id)
    .single()

  if (existing) return NextResponse.json({ team_id: team.id, message: 'Already a member' })

  const { error: joinError } = await adminSupabase.from('team_members').insert({
    team_id: team.id,
    user_id: user.id,
    role: 'member',
  })

  if (joinError) return NextResponse.json({ error: joinError.message }, { status: 500 })

  return NextResponse.json({ team_id: team.id, team_name: team.name })
}
