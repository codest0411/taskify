import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

interface Params { params: { teamId: string } }

export async function GET(_req: NextRequest, { params }: Params) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Verify membership
  const { data: member } = await supabase
    .from('team_members')
    .select('id')
    .eq('team_id', params.teamId)
    .eq('user_id', user.id)
    .single()

  if (!member) return NextResponse.json({ error: 'Not a team member' }, { status: 403 })

  // Fetch recent activity for the whole team
  const { data: teamTasks } = await supabase
    .from('tasks')
    .select('id')
    .eq('team_id', params.teamId)
  
  const taskIds = (teamTasks || []).map(t => t.id)
  
  if (taskIds.length === 0) return NextResponse.json({ activity: [] })

  const { data: activity, error } = await supabase
    .from('task_activity')
    .select(`
      *,
      user:profiles(id, full_name, avatar_url, email),
      task:tasks(id, title)
    `)
    .in('task_id', taskIds)
    .limit(50)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ activity })
}
