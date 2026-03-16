import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export default async function DashboardPage() {
  const supabase = createClient()
  const adminSupabase = createServiceClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/dashboard/onboarding')

  // Get first team (using admin client to bypass potential RLS issues)
  const { data: membership } = await adminSupabase
    .from('team_members')
    .select('team_id')
    .eq('user_id', user.id)
    .limit(1)
    .single()

  if (membership?.team_id) {
    redirect(`/dashboard/board/${membership.team_id}`)
  }

  // No team yet
  redirect('/dashboard/onboarding')
}
