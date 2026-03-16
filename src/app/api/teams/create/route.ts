import { createClient, createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { generateInviteCode } from '@/lib/utils'

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const adminSupabase = createServiceClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  console.log('API Create Team - User:', user?.id)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Ensure profile exists (trigger might have failed or been added later)
  const { data: profile } = await adminSupabase.from('profiles').select('id').eq('id', user.id).single()
  if (!profile) {
    console.log('API Create Team - Profile missing, creating one...')
    await adminSupabase.from('profiles').insert({
      id: user.id,
      email: user.email!,
      full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'
    })
  }

  const { name, description } = await request.json()
  if (!name?.trim()) return NextResponse.json({ error: 'Team name required' }, { status: 400 })

  const invite_code = generateInviteCode()

  console.log('API Create Team - Inserting team:', { name, owner_id: user.id })
  const { data: team, error } = await adminSupabase
    .from('teams')
    .insert({ name: name.trim(), description: description || null, owner_id: user.id, invite_code })
    .select('*')
    .single()

  if (error) {
    console.error('API Create Team - Team insert error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  console.log('API Create Team - Team created:', team.id)

  // Add owner as member
  const { error: memberError } = await adminSupabase.from('team_members').insert({
    team_id: team.id,
    user_id: user.id,
    role: 'owner',
  })

  if (memberError) {
    console.error('API Create Team - Member insert error:', memberError)
    // We should probably delete the team if member creation fails, but for now just return error
    return NextResponse.json({ error: memberError.message }, { status: 500 })
  }

  return NextResponse.json({ team }, { status: 201 })
}
