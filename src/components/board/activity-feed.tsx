'use client'

import { useState, useEffect } from 'react'
import { TaskActivity, Profile } from '@/types'
import { useAppStore } from '@/store'
import { createClient } from '@/lib/supabase/client'
import { cn, getInitials, timeAgo } from '@/lib/utils'
import { X, Loader2, Activity, History } from 'lucide-react'

interface TeamActivity extends TaskActivity {
  task: { id: string; title: string }
}

export function ActivityFeed() {
  const { currentTeam, isActivityFeedOpen, setActivityFeedOpen, setSelectedTaskId, setTaskDrawerOpen } = useAppStore()
  const [activities, setActivities] = useState<TeamActivity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isActivityFeedOpen && currentTeam) {
      fetchActivity()

      // Realtime listener for team activity
      const supabase = createClient()
      const channel = supabase
        .channel(`team-activity-${currentTeam.id}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'task_activity'
        }, async (payload) => {
          // Fetch full activity data (with user/task info) for the new record
          const { data } = await supabase
            .from('task_activity')
            .select(`
              *,
              user:profiles(id, full_name, avatar_url, email),
              task:tasks(id, title)
            `)
            .eq('id', payload.new.id)
            .single()
          
          if (data) {
            setActivities(prev => [data as TeamActivity, ...prev].slice(0, 50))
          }
        })
        .subscribe()

      return () => { supabase.removeChannel(channel) }
    }
  }, [isActivityFeedOpen, currentTeam])

  async function fetchActivity() {
    setLoading(true)
    try {
      const res = await fetch(`/api/teams/${currentTeam?.id}/activity`)
      if (res.ok) {
        const data = await res.json()
        setActivities(data.activity)
      }
    } catch (err) {
      console.error('Failed to fetch activity', err)
    } finally {
      setLoading(false)
    }
  }

  if (!isActivityFeedOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setActivityFeedOpen(false)} />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-card border-l border-border shadow-2xl flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold" style={{ fontFamily: 'var(--font-display)' }}>Team Activity</h2>
          </div>
          <button
            onClick={() => setActivityFeedOpen(false)}
            suppressHydrationWarning
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : activities.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto opacity-50">
                <Activity className="w-6 h-6" />
              </div>
              <p className="text-sm text-muted-foreground">No recent activity to show</p>
            </div>
          ) : (
            <div className="space-y-6">
              {activities.map((a, i) => (
                <div key={a.id} className="flex gap-4 group">
                  <div className="flex flex-col items-center">
                    <div className="w-10 h-10 rounded-full bg-primary/15 border border-primary/20 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
                      {getInitials(a.user?.full_name || a.user?.email)}
                    </div>
                    {i < activities.length - 1 && (
                      <div className="w-0.5 flex-1 bg-border my-2" />
                    )}
                  </div>
                  <div className="flex-1 pt-0.5 pb-6">
                    <p className="text-sm leading-relaxed">
                      <span className="font-semibold text-foreground">{a.user?.full_name || 'Member'}</span>
                      {' '}
                      <span className="text-muted-foreground">
                        {a.action === 'created' && 'created'}
                        {a.action === 'moved' && 'moved'}
                        {a.action === 'assigned' && 'assigned'}
                        {a.action === 'commented' && 'commented on'}
                        {a.action === 'uploaded' && 'uploaded a file to'}
                        {a.action === 'updated' && 'updated'}
                        {a.action === 'reminder_sent' && 'sent a reminder for'}
                      </span>
                      {' '}
                      <button 
                        onClick={() => {
                          setSelectedTaskId(a.task.id)
                          setTaskDrawerOpen(true)
                          setActivityFeedOpen(false)
                        }}
                        suppressHydrationWarning
                        className="font-medium text-primary hover:underline underline-offset-2 text-left"
                      >
                        {a.task?.title || 'a task'}
                      </button>
                    </p>
                    
                    {a.action === 'moved' && (
                      <div className="mt-2 flex items-center gap-2 text-[10px] uppercase tracking-wider font-bold">
                        <span className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{a.old_value}</span>
                        <span className="text-muted-foreground">→</span>
                        <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary">{a.new_value}</span>
                      </div>
                    )}

                    <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
                      <History className="w-3 h-3" />
                      {timeAgo(a.created_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
