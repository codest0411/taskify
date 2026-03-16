import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { TeamSettingsClient } from '@/components/board/team-settings-client'

interface Props { params: { teamId: string } }

export default async function TeamSettingsPage({ params }: Props) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/dashboard/onboarding')

  const { data: membership } = await supabase
    .from('team_members')
    .select('role')
    .eq('team_id', params.teamId)
    .eq('user_id', user.id)
    .single()

  if (!membership) redirect('/dashboard')

  const { data: team } = await supabase.from('teams').select('*').eq('id', params.teamId).single()
  const { data: members } = await supabase
    .from('team_members')
    .select('*, profile:profiles(*)')
    .eq('team_id', params.teamId)

  return (
    <TeamSettingsClient
      team={team}
      members={members || []}
      currentUserId={user.id}
      userRole={membership.role}
    />
  )
}
