import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { TeamClient } from '@/components/teams/team-client'

interface Props { params: { teamId: string } }

export default async function TeamPage({ params }: Props) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/dashboard/onboarding')

  const { data: members } = await supabase
    .from('team_members')
    .select('*, profile:profiles(*)')
    .eq('team_id', params.teamId)

  const { data: tasks } = await supabase
    .from('tasks')
    .select('*')
    .eq('team_id', params.teamId)

  const { data: team } = await supabase.from('teams').select('*').eq('id', params.teamId).single()

  return (
    <TeamClient 
      members={members || []} 
      tasks={tasks || []} 
      team={team} 
    />
  )
}
