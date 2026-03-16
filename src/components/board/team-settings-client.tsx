'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Team, TeamMember } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { cn, getInitials, timeAgo } from '@/lib/utils'
import { Settings, Users, RefreshCw, Trash2, Crown, Shield, User, Copy, Check, Loader2 } from 'lucide-react'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

interface Props {
  team: Team
  members: TeamMember[]
  currentUserId: string
  userRole: string
}

const ROLE_ICONS = { owner: Crown, admin: Shield, member: User }
const ROLE_COLORS = {
  owner: 'text-amber-400 bg-amber-400/10',
  admin: 'text-blue-400 bg-blue-400/10',
  member: 'text-muted-foreground bg-muted',
}

export function TeamSettingsClient({ team, members, currentUserId, userRole }: Props) {
  const [name, setName] = useState(team.name)
  const [description, setDescription] = useState(team.description || '')
  const [inviteCode, setInviteCode] = useState(team.invite_code)
  const [saving, setSaving] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false)
  const [removingMember, setRemovingMember] = useState<{ id: string, name: string } | null>(null)
  const [isRemoving, setIsRemoving] = useState(false)
  const { toast } = useToast()
  const router = useRouter()
  const canManage = ['owner', 'admin'].includes(userRole)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const res = await fetch(`/api/teams/${team.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description }),
    })
    if (res.ok) toast({ title: 'Team updated!' })
    else toast({ title: 'Failed to update', variant: 'destructive' })
    setSaving(false)
  }

  async function handleRegenerateCode() {
    setRegenerating(true)
    const res = await fetch('/api/teams/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ team_id: team.id }),
    })
    const data = await res.json()
    if (res.ok) {
      setInviteCode(data.invite_code)
      toast({ title: 'New invite code generated' })
    }
    setRegenerating(false)
  }

  async function handleRemoveMember() {
    if (!removingMember) return
    setIsRemoving(true)
    const res = await fetch(`/api/teams/${team.id}/members/${removingMember.id}`, { method: 'DELETE' })
    if (res.ok) {
      toast({ title: 'Member removed' })
      router.refresh()
    }
    setIsRemoving(false)
    setShowRemoveConfirm(false)
    setRemovingMember(null)
  }

  async function handleChangeRole(memberId: string, newRole: string) {
    await fetch(`/api/teams/${team.id}/members/${memberId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: newRole }),
    })
    router.refresh()
  }

  async function copyCode() {
    await navigator.clipboard.writeText(inviteCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 max-w-2xl mx-auto w-full">
      <h1 className="text-2xl font-bold mb-6" style={{ fontFamily: 'var(--font-display)' }}>
        Team Settings
      </h1>

      {/* General settings */}
      <section className="glass-card rounded-2xl p-5 mb-4">
        <div className="flex items-center gap-2 mb-4">
          <Settings className="w-4 h-4 text-primary" />
          <h2 className="font-semibold" style={{ fontFamily: 'var(--font-display)' }}>General</h2>
        </div>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Team Name</Label>
            <Input value={name} onChange={e => setName(e.target.value)} disabled={!canManage} />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="What does your team work on?" disabled={!canManage} />
          </div>
          {canManage && (
            <Button type="submit" disabled={saving} size="sm">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" /> : null}
              Save Changes
            </Button>
          )}
        </form>
      </section>

      {/* Invite code */}
      <section className="glass-card rounded-2xl p-5 mb-4">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-4 h-4 text-primary" />
          <h2 className="font-semibold" style={{ fontFamily: 'var(--font-display)' }}>Invite Code</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-3">Share this code with teammates to let them join your team.</p>
        <div className="flex items-center gap-2">
          <div className="flex-1 px-4 py-2.5 rounded-lg bg-muted border border-border font-mono text-lg font-bold tracking-[0.3em] text-center">
            {inviteCode}
          </div>
          <Button variant="outline" size="sm" onClick={copyCode} className="h-10 px-3">
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </Button>
          {canManage && (
            <Button variant="outline" size="sm" onClick={handleRegenerateCode} disabled={regenerating} className="h-10 px-3">
              <RefreshCw className={cn('w-4 h-4', regenerating && 'animate-spin')} />
            </Button>
          )}
        </div>
      </section>

      {/* Members */}
      <section className="glass-card rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-4 h-4 text-primary" />
          <h2 className="font-semibold" style={{ fontFamily: 'var(--font-display)' }}>
            Members ({members.length})
          </h2>
        </div>
        <div className="space-y-2">
          {members.map((m: any) => {
            const RoleIcon = ROLE_ICONS[m.role as keyof typeof ROLE_ICONS] || User
            const isMe = m.user_id === currentUserId
            const name = m.profile?.full_name || m.profile?.email || 'Unknown'
            return (
              <div key={m.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
                  {m.profile?.avatar_url
                    ? <img src={m.profile.avatar_url} alt="" className="w-full h-full object-cover rounded-full" />
                    : getInitials(name)
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-medium truncate">{name}</p>
                    {isMe && <span className="text-xs text-muted-foreground">(you)</span>}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{m.profile?.email}</p>
                </div>
                <div className={cn('flex items-center gap-1 text-xs px-2 py-1 rounded-md font-medium', ROLE_COLORS[m.role as keyof typeof ROLE_COLORS])}>
                  <RoleIcon className="w-3 h-3" />
                  {m.role}
                </div>
                {canManage && !isMe && m.role !== 'owner' && (
                  <button
                    onClick={() => {
                      setRemovingMember({ id: m.id, name });
                      setShowRemoveConfirm(true);
                    }}
                    className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-red-400 hover:bg-red-400/10 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </section>
      {/* Confirm Remove Member */}
      <ConfirmDialog
        isOpen={showRemoveConfirm}
        title="Remove Member?"
        description={`Are you sure you want to remove ${removingMember?.name} from the team?`}
        confirmText="Remove Member"
        variant="destructive"
        onConfirm={handleRemoveMember}
        onCancel={() => {
          setShowRemoveConfirm(false);
          setRemovingMember(null);
        }}
        loading={isRemoving}
      />
    </div>
  )
}
