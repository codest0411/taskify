'use client'

import { useState } from 'react'
import { Team } from '@/types'
import { useAppStore } from '@/store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { X, Copy, Check, Users, Mail, Link as LinkIcon, Loader2, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  team: Team
  onClose: () => void
}

export function InviteModal({ team, onClose }: Props) {
  const [copied, setCopied] = useState(false)
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  async function copyInviteCode() {
    await navigator.clipboard.writeText(team.invite_code)
    setCopied(true)
    toast({ title: 'Invite code copied!', description: team.invite_code })
    setTimeout(() => setCopied(false), 2000)
  }

  async function copyLink() {
    const url = `${window.location.origin}/dashboard/onboarding?join=${team.invite_code}`
    await navigator.clipboard.writeText(url)
    toast({ title: 'Invite link copied!', description: 'Anyone with this link can join the team' })
  }

  async function handleSendInvite(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    
    setLoading(true)
    try {
      const res = await fetch('/api/teams/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: email.trim(),
          team_name: team.name,
          invite_code: team.invite_code
        })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to send invite')

      toast({ 
        title: 'Invite sent!', 
        description: `An invitation has been sent to ${email}` 
      })
      setEmail('')
    } catch (err: any) {
      toast({ 
        title: 'Failed to send invite', 
        description: err.message, 
        variant: 'destructive' 
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md glass-card rounded-2xl shadow-2xl animate-fade-in overflow-hidden border border-primary/20">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-primary/5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
              <Users className="w-4 h-4 text-primary" />
            </div>
            <h2 className="font-bold text-lg" style={{ fontFamily: 'var(--font-display)' }}>
              Invite People
            </h2>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Hero Section: Direct Link */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-primary uppercase tracking-wider ml-1">
                Zero-Friction Join Link
              </label>
              <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full uppercase">Best for guests</span>
            </div>
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-primary/50 to-blue-500/50 rounded-xl blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
              <Button 
                onClick={copyLink}
                className="relative w-full h-14 rounded-xl gap-3 bg-card border-2 border-primary/20 hover:border-primary/50 text-foreground text-lg font-bold shadow-xl transition-all"
                variant="outline"
              >
                <LinkIcon className="w-5 h-5 text-primary" />
                Copy Shareable Link
              </Button>
            </div>
            <p className="text-[11px] text-center text-muted-foreground px-2">
              Anyone with this link can join instantly. No login or password required.
            </p>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">or use email</span>
            </div>
          </div>

          {/* Email Section */}
          <form onSubmit={handleSendInvite} className="space-y-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="colleague@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="rounded-xl h-11 pl-10"
                  required
                />
              </div>
              <Button type="submit" disabled={loading} className="rounded-xl px-5 h-11">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send'}
              </Button>
            </div>
            {email.length > 0 && (
              <p className="text-[10px] text-muted-foreground italic ml-1">
                Note: Supabase Free Tier limits emails to 3 per hour. Use the link above if this fails.
              </p>
            )}
          </form>

          {/* Code Section */}
          <details className="group">
            <summary className="text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground transition-colors flex items-center gap-2 list-none justify-center">
              Show Invite Code
              <ChevronDown className="w-3 h-3 group-open:rotate-180 transition-transform" />
            </summary>
            <div className="mt-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="flex gap-2">
                <div className="flex-1 bg-muted/50 border border-border rounded-xl px-4 flex items-center justify-center font-mono text-xl tracking-[0.2em] font-bold h-12">
                  {team.invite_code}
                </div>
                <Button 
                  onClick={copyInviteCode}
                  className="h-12 w-12 rounded-xl"
                  variant="secondary"
                >
                  {copied ? <Check className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5" />}
                </Button>
              </div>
            </div>
          </details>
        </div>
      </div>
    </div>
  )
}
