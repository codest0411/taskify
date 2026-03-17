'use client'

import { useState, useEffect } from 'react'
import { cn, timeAgo } from '@/lib/utils'
import { Team, TeamMember, Task, VoiceRecording } from '@/types'
import { useAppStore } from '@/store'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { 
  UserPlus, Settings as SettingsIcon, ShieldCheck, 
  Users as UsersIcon, Clock, FileText 
} from 'lucide-react'
import { InviteModal } from './invite-modal'
import Link from 'next/link'

interface Props {
  members: TeamMember[]
  tasks: Task[]
  team: Team
}

export function TeamClient({ members: initialMembers, tasks: initialTasks, team }: Props) {
  const { isInviteModalOpen, setInviteModalOpen } = useAppStore()
  const [members, setMembers] = useState(initialMembers)
  const [tasks, setTasks] = useState(initialTasks)
  const [recordings, setRecordings] = useState<VoiceRecording[]>([])
  const [activeTab, setActiveTab] = useState<'members' | 'recordings'>('members')
  const [loadingRecordings, setLoadingRecordings] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    useAppStore.getState().setMembers(initialMembers)
    useAppStore.getState().setProfiles(initialMembers.map(m => m.profile).filter(Boolean) as any[])
    useAppStore.getState().setCurrentTeam(team)
  }, [initialMembers, team])

  useEffect(() => {
    const channel = supabase
      .channel(`team-members-${team.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'team_members',
        filter: `team_id=eq.${team.id}`
      }, async (payload) => {
        if (payload.eventType === 'INSERT') {
          const { data } = await supabase
            .from('team_members')
            .select('*, profile:profiles(*)')
            .eq('id', payload.new.id)
            .single()
          if (data) setMembers(prev => [...prev, data as TeamMember])
        } else if (payload.eventType === 'DELETE') {
          setMembers(prev => prev.filter(m => m.id !== payload.old.id))
        } else if (payload.eventType === 'UPDATE') {
           setMembers(prev => prev.map(m => m.id === payload.new.id ? { ...m, ...payload.new } : m))
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [team.id])

  useEffect(() => {
    const channel = supabase
      .channel(`team-tasks-sync-${team.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'tasks',
        filter: `team_id=eq.${team.id}`
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setTasks(prev => [payload.new as Task, ...prev])
        } else if (payload.eventType === 'UPDATE') {
          setTasks(prev => prev.map(t => t.id === payload.new.id ? { ...t, ...payload.new } : t))
        } else if (payload.eventType === 'DELETE') {
          setTasks(prev => prev.filter(t => t.id !== payload.old.id))
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [team.id])

  useEffect(() => {
    if (activeTab === 'recordings') {
      fetchRecordings()
    }
  }, [activeTab, team.id])

  // Realtime recordings
  useEffect(() => {
    const channel = supabase
      .channel(`voice-recordings-sync-${team.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'voice_recordings',
        filter: `team_id=eq.${team.id}`
      }, async (payload) => {
        const { data } = await supabase
          .from('voice_recordings')
          .select('*, profile:profiles(*)')
          .eq('id', payload.new.id)
          .single()
        if (data) setRecordings(prev => [data as VoiceRecording, ...prev])
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [team.id])

  async function fetchRecordings() {
    setLoadingRecordings(true)
    try {
      const { data } = await supabase
        .from('voice_recordings')
        .select('*, profile:profiles(*)')
        .eq('team_id', team.id)
        .order('created_at', { ascending: false })
      
      if (data) setRecordings(data as VoiceRecording[])
    } catch (err) {
      console.error('Failed to fetch recordings', err)
    } finally {
      setLoadingRecordings(false)
    }
  }

  function getAudioUrl(path: string) {
    const { data } = supabase.storage.from('voice-recordings').getPublicUrl(path)
    return data.publicUrl
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 max-w-4xl mx-auto w-full">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
            {team.name}
          </h1>
          <p className="text-muted-foreground mt-1">
            Collaboration hub and team intelligence
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href={`/dashboard/settings/${team.id}`}>
            <Button variant="outline" size="sm" className="gap-2">
              <SettingsIcon className="w-4 h-4" />
              Settings
            </Button>
          </Link>
          <Button 
            onClick={() => setInviteModalOpen(true)}
            size="sm" 
            className="gap-2 shadow-lg shadow-primary/20"
          >
            <UserPlus className="w-4 h-4" />
            Add People
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-xl mb-8 w-fit">
        <button
          onClick={() => setActiveTab('members')}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
            activeTab === 'members' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <UsersIcon className="w-4 h-4" />
          Members
        </button>
        <button
          onClick={() => setActiveTab('recordings')}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
            activeTab === 'recordings' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <ShieldCheck className="w-4 h-4" />
          Interaction Audit
        </button>
      </div>

      {activeTab === 'members' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(members || []).map((m: any) => {
            const assigned = (tasks || []).filter(t => t.assigned_to?.includes(m.user_id)).length
            const completed = (tasks || []).filter(t => t.assigned_to?.includes(m.user_id) && t.status === 'completed').length
            const rate = assigned > 0 ? Math.round((completed / assigned) * 100) : 0
            const name = m.profile?.full_name || m.profile?.email || 'Unknown'
            const isOwner = m.role === 'owner'
            
            return (
              <div key={m.id} className="glass-card rounded-2xl p-5 flex flex-col gap-4 hover:border-primary/30 transition-all group">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-lg font-bold text-primary flex-shrink-0 group-hover:scale-110 transition-transform">
                      {m.profile?.avatar_url
                        ? <img src={m.profile.avatar_url} alt="" className="w-full h-full object-cover rounded-full" />
                        : name[0].toUpperCase()
                      }
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold truncate">{name}</p>
                      <p className="text-xs text-muted-foreground truncate">{m.profile?.email}</p>
                    </div>
                  </div>
                  <span className={cn(
                    "text-[10px] uppercase font-bold px-2 py-1 rounded-md tracking-wider",
                    isOwner ? "bg-amber-400/10 text-amber-500 border border-amber-500/20" : "bg-primary/10 text-primary border border-primary/20"
                  )}>
                    {m.role}
                  </span>
                </div>

                <div className="space-y-2 pt-2 border-t border-border/50">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Task Completion</span>
                    <span className="font-medium">{rate}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary rounded-full transition-all duration-1000" 
                      style={{ width: `${rate}%` }} 
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground text-right italic">
                    {completed} of {assigned} tasks finished
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="space-y-4">
          {loadingRecordings && recordings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground animate-pulse">
              <ShieldCheck className="w-12 h-12 mb-4 opacity-20" />
              <p>Fetching audit logs...</p>
            </div>
          ) : recordings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground border-2 border-dashed border-border rounded-3xl">
              <ShieldCheck className="w-12 h-12 mb-4 opacity-20" />
              <h3 className="font-bold text-foreground">No audit data</h3>
              <p className="text-sm">Activity history will appear here once interactions occur</p>
            </div>
          ) : (
            recordings.map((rec) => {
              const name = rec.profile?.full_name || rec.profile?.email || 'Unknown User'
              return (
                <div key={rec.id} className="glass-card rounded-2xl p-4 flex items-center gap-4 hover:border-primary/30 transition-all group">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                    {rec.profile?.avatar_url ? (
                      <img src={rec.profile.avatar_url} alt="" className="w-full h-full object-cover rounded-full" />
                    ) : (
                      <FileText className="w-5 h-5" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-bold text-sm truncate">{name}</p>
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1 bg-muted px-1.5 py-0.5 rounded">
                        <Clock className="w-3 h-3" />
                        {timeAgo(rec.created_at)}
                      </span>
                    </div>
                    
                    <audio 
                      controls 
                      src={getAudioUrl(rec.file_url)} 
                      className="h-8 w-full max-w-sm filter invert grayscale appearance-none bg-transparent"
                    />
                  </div>

                  <div className="hidden sm:flex items-center gap-3 text-muted-foreground pr-2">
                    <div className="text-right">
                      <p className="text-[10px] uppercase font-black opacity-50 tracking-tighter">Event</p>
                      <p className="text-xs font-mono">Sync</p>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {isInviteModalOpen && (
        <InviteModal 
          team={team} 
          onClose={() => setInviteModalOpen(false)} 
        />
      )}
    </div>
  )
}
