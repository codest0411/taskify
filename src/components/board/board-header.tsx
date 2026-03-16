'use client'

import { useState } from 'react'
import { Team, TeamMember } from '@/types'
import { useAppStore } from '@/store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import {
  Plus, Search, Filter, ClipboardPaste, Zap,
  ChevronDown, X, Copy, Check, UserPlus, History,
  Mic, MicOff, Phone, PhoneOff, Volume2,
  Monitor, MonitorDown
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { InviteModal } from '../teams/invite-modal'
import { VoiceChat } from './voice-chat'
import { useScreenShareStore } from '@/store/screen-share-store'
import { SessionCodeModal } from '../screen-share/session-code-modal'

interface Props {
  team: Team
  members: TeamMember[]
  progressPct: number
  completedTasks: number
  totalTasks: number
  userRole: string
}

export function BoardHeader({ team, members, progressPct, completedTasks, totalTasks, userRole }: Props) {
  const {
    searchQuery, setSearchQuery,
    filterAssignee, setFilterAssignee,
    filterPriority, setFilterPriority,
    setCreateModalOpen, setQuickCreateOpen, setPasteImportOpen,
    isInviteModalOpen, setInviteModalOpen,
    setActivityFeedOpen,
    isVoiceJoined, setVoiceJoined
  } = useAppStore()
  
  const { setIsCodeModalOpen } = useScreenShareStore()
  const [modalMode, setModalMode] = useState<'host' | 'viewer'>('host')
  const [copied, setCopied] = useState(false)
  const { toast } = useToast()

  const priorities = ['low', 'medium', 'high', 'urgent']
  const hasFilters = filterAssignee || filterPriority || searchQuery

  function clearFilters() {
    setFilterAssignee(null)
    setFilterPriority(null)
    setSearchQuery('')
  }

  async function copyInviteCode() {
    await navigator.clipboard.writeText(team.invite_code)
    setCopied(true)
    toast({ title: 'Invite code copied!', description: team.invite_code })
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex-shrink-0 border-b border-border bg-card/30 px-4 py-3">
      {/* Top row */}
      <div className="flex items-center gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold truncate" style={{ fontFamily: 'var(--font-display)' }}>
            {team.name}
          </h1>
        </div>

        {/* Invite code */}
        <button
          onClick={copyInviteCode}
          className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-muted hover:bg-muted/80 transition-colors text-xs text-muted-foreground font-mono"
          title="Copy invite code"
        >
          {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
          {team.invite_code}
        </button>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setInviteModalOpen(true)}
            className="h-8 text-xs gap-1.5 border-primary/20 hover:border-primary/50 text-primary hover:bg-primary/5"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Invite</span>
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setQuickCreateOpen(true)}
            className="h-8 text-xs gap-1.5"
            title="Quick create (⌘K)"
          >
            <Zap className="w-3 h-3" />
            <span className="hidden sm:inline">Quick</span>
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setActivityFeedOpen(true)}
            className="h-8 text-xs gap-1.5"
            title="Team Activity"
          >
            <History className="w-3 h-3" />
            <span className="hidden sm:inline">Activity</span>
          </Button>
          <Button
            size="sm"
            variant={isVoiceJoined ? "default" : "outline"}
            onClick={() => setVoiceJoined(!isVoiceJoined)}
            className={cn(
              "h-8 text-xs gap-1.5",
              isVoiceJoined && "bg-emerald-500 hover:bg-emerald-600 animate-pulse ring-2 ring-emerald-500/20"
            )}
            title={isVoiceJoined ? "Leave Voice Chat" : "Join Voice Chat"}
          >
            {isVoiceJoined ? <PhoneOff className="w-3 h-3" /> : <Phone className="w-3 h-3" />}
            <span className="hidden sm:inline">{isVoiceJoined ? 'Leave Voice' : 'Join Voice'}</span>
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setModalMode('host')
              setIsCodeModalOpen(true)
            }}
            className="h-8 text-xs gap-1.5"
            title="Share Screen"
          >
            <Monitor className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">Share</span>
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setModalMode('viewer')
              setIsCodeModalOpen(true)
            }}
            className="h-8 text-xs gap-1.5"
            title="View Screen"
          >
            <MonitorDown className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">View</span>
          </Button>
          <Button
            size="sm"
            onClick={() => setCreateModalOpen(true)}
            className="h-8 text-xs gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            New Task
          </Button>
        </div>
      </div>
      
      <SessionCodeModal mode={modalMode} teamId={team.id} />

      {/* Filters row */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-40 max-w-64">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search tasks..."
            className="h-8 pl-8 text-sm"
          />
        </div>

        {/* Assignee filter */}
        <select
          value={filterAssignee || ''}
          onChange={e => setFilterAssignee(e.target.value || null)}
          className="h-8 px-2 text-sm bg-muted border border-border rounded-md text-foreground"
        >
          <option value="">All members</option>
          {members.map((m: any) => (
            <option key={m.user_id} value={m.user_id}>
              {m.profile?.full_name || m.profile?.email || 'Unknown'}
            </option>
          ))}
        </select>

        {/* Priority filter */}
        <select
          value={filterPriority || ''}
          onChange={e => setFilterPriority(e.target.value || null)}
          className="h-8 px-2 text-sm bg-muted border border-border rounded-md text-foreground"
        >
          <option value="">All priorities</option>
          {priorities.map(p => (
            <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
          ))}
        </select>

        {hasFilters && (
          <button
            onClick={clearFilters}
            className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 rounded-md hover:bg-muted transition-colors"
          >
            <X className="w-3 h-3" /> Clear
          </button>
        )}
      </div>

      {/* Progress bar */}
      <div className="mt-3">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-muted-foreground">
            {completedTasks} of {totalTasks} tasks completed
          </span>
          <span className="text-xs font-semibold text-primary">{progressPct}%</span>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>
      <VoiceChat teamId={team.id} />
      {/* Invite Modal */}
      {isInviteModalOpen && (
        <InviteModal 
          team={team} 
          onClose={() => setInviteModalOpen(false)} 
        />
      )}
    </div>
  )
}
