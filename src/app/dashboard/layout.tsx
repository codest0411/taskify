import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { AppShell } from '@/components/layout/app-shell'
import { ScreenShareOverlay } from '@/components/screen-share/screen-share-overlay'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const adminSupabase = createServiceClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  // If no user, we let them proceed to onboarding (where they'll be signed in anonymously)
  // But for actual board/team pages, we would normally protect them.
  // We'll handle the "Direct" sign-in in the Onboarding page.
  
  let profile = null
  let teams = []

  if (user) {
    const { data: p } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    profile = p

    // Fetch teams using service client to bypass RLS issues in sidebar
    const { data: t } = await adminSupabase
      .from('teams')
      .select('*, team_members!inner(user_id)')
      .eq('team_members.user_id', user.id)
    teams = t || []
  }

  return (
    <AppShell user={profile} teams={teams}>
      {children}
      <ScreenShareOverlay />
    </AppShell>
  )
}
