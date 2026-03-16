'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAppStore } from '@/store'
import { useToast } from '@/hooks/use-toast'
import { getInitials } from '@/lib/utils'

export function RealtimeNotifications() {
  const { currentUser, teams } = useAppStore()
  const { toast } = useToast()
  const supabase = createClient()

  useEffect(() => {
    if (!currentUser || !teams.length) return

    // Listen to activity in all teams the user belongs to
    const channels = teams.map(team => {
      return supabase
        .channel(`global-notifications-${team.id}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'task_activity'
        }, async (payload) => {
          // Fetch activity with details
          const { data: activity } = await supabase
            .from('task_activity')
            .select(`
              *,
              user:profiles(id, full_name, avatar_url, email),
              task:tasks(id, title, team_id)
            `)
            .eq('id', payload.new.id)
            .single()

          if (!activity || activity.user_id === currentUser.id) return
          
          // Verify team ownership (though channel should handle this, extra safety)
          if (!teams.find(t => t.id === activity.task?.team_id)) return

          const actionLabel = 
            activity.action === 'created' ? 'created' :
            activity.action === 'moved' ? 'moved' :
            activity.action === 'assigned' ? 'assigned' :
            activity.action === 'commented' ? 'commented on' :
            activity.action === 'uploaded' ? 'uploaded a file to' :
            'updated'

          toast({
            title: `${activity.user?.full_name || 'Someone'} ${actionLabel} a task`,
            description: activity.task?.title || 'Unknown task',
            variant: 'default',
          })
        })
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'team_members'
        }, async (payload) => {
          // Fetch joiner info
          const { data: member } = await supabase
            .from('team_members')
            .select('*, profile:profiles(*)')
            .eq('id', payload.new.id)
            .single()

          if (!member || member.user_id === currentUser.id) return
          if (!teams.find(t => t.id === member.team_id)) return

          toast({
            title: `New Team Member!`,
            description: `${member.profile?.full_name || 'Someone'} joined the team`,
          })
        })
        .subscribe()
    })

    return () => {
      channels.forEach(channel => supabase.removeChannel(channel))
    }
  }, [currentUser?.id, teams.length])

  return null
}
