import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { BoardClient } from '@/components/board/board-client'

interface Props {
  params: { teamId: string }
}

export default async function BoardPage({ params }: Props) {
  const supabase = createClient()
  const adminSupabase = createServiceClient()
  const teamId = params.teamId

  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/dashboard/onboarding')

    // Basic UUID validation to prevent DB crash
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(teamId)) {
      redirect('/dashboard')
    }

    // Verify membership
    const { data: membership } = await adminSupabase
      .from('team_members')
      .select('role')
      .eq('team_id', teamId)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      redirect('/dashboard')
    }

    // Fetch team
    const { data: team } = await adminSupabase
      .from('teams')
      .select('*')
      .eq('id', teamId)
      .single()

    if (!team) redirect('/dashboard')

    // Fetch members with profiles
    const { data: members } = await supabase
      .from('team_members')
      .select('*, profile:profiles(*)')
      .eq('team_id', teamId)

    // Fetch tasks
    const { data: tasks } = await supabase
      .from('tasks')
      .select('*, attachments:task_attachments(*)')
      .eq('team_id', teamId)
      .order('created_at', { ascending: false })

    // Fetch current user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    return (
      <BoardClient
        team={team!}
        initialTasks={tasks || []}
        members={members || []}
        currentUser={profile}
        userRole={membership.role}
      />
    )
  } catch (err: any) {
    if (err.digest?.startsWith('NEXT_REDIRECT')) throw err
    console.error('BoardPage Error:', err)
    redirect('/dashboard')
  }
}
