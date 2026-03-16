'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { Layers3, Plus, Users, Loader2 } from 'lucide-react'

export default function OnboardingPage() {
  const [step, setStep] = useState<'name' | 'choose' | 'create' | 'join' | 'invite-decision'>('name')
  const [invitedTeam, setInvitedTeam] = useState<{ id: string, name: string } | null>(null)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [teamName, setTeamName] = useState('')
  const [description, setDescription] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [initialized, setInitialized] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const isJoining = !!searchParams.get('join')
  const { toast } = useToast()
  const supabase = createClient()

  useEffect(() => {
    async function init() {
      const code = searchParams.get('join')
      if (initialized && !code) return

      if (code) {
        setInviteCode(code.toUpperCase())
        setLoading(true)
        // Fetch team info first to show Accept/Decline screen
        const res = await fetch(`/api/teams/info?code=${code}`)
        if (res.ok) {
          const data = await res.json()
          setInvitedTeam(data)
          setStep('invite-decision')
        } else {
          setStep('name')
        }
        setLoading(false)
        return
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single()
        if (profile?.full_name) {
          setStep('choose')
        }
      }
      setInitialized(true)
    }
    init()
  }, [searchParams, initialized])

  async function handleInstantAccept() {
    setLoading(true)
    try {
      // 1. Get or create session (Anonymous)
      let { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        const { data: { user: newUser }, error: authError } = await supabase.auth.signInAnonymously()
        if (authError) throw authError
        user = newUser
      }

      // 2. Set profile name via secure API
      const onboardRes = await fetch('/api/auth/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName: fullName.trim(), email: '' }),
      })
      if (!onboardRes.ok) throw new Error('Failed to setup profile')

      // 3. Join Team
      const joinRes = await fetch('/api/teams/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invite_code: inviteCode }),
      })
      const joinData = await joinRes.json()
      if (!joinRes.ok) throw new Error(joinData.error)

      // 4. Go to board
      router.push(`/dashboard/board/${joinData.team_id}`)
      router.refresh()
    } catch (err: any) {
      toast({ title: 'Failed to join', description: err.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  async function handleSetPlayerName(e: React.FormEvent) {
    e.preventDefault()
    if (!fullName.trim()) return
    setLoading(true)

    try {
      let { data: { user: currentUser } } = await supabase.auth.getUser()
      
      if (!currentUser && !isJoining) {
        const { data: { user: guestUser }, error: authError } = await supabase.auth.signInAnonymously()
        if (authError) throw authError
        currentUser = guestUser
      }

      const onboardRes = await fetch('/api/auth/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          fullName: fullName.trim(), 
          email: email.trim(),
          password: password 
        }),
      })
      
      let onboardData = await onboardRes.json()

      if (onboardRes.status === 409) {
        const { error: loginError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password
        })
        if (loginError) throw new Error('Password incorrect.')
        
        const retryRes = await fetch('/api/auth/onboard', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fullName: fullName.trim(), email: email.trim() }),
        })
        onboardData = await retryRes.json()
      }
      
      if (!onboardRes.ok && onboardRes.status !== 409) throw new Error(onboardData.error)

      if (isJoining) {
        const joinRes = await fetch('/api/teams/join', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ invite_code: inviteCode }),
        })
        const joinData = await joinRes.json()
        if (!joinRes.ok) throw new Error(joinData.error)
        router.push(`/dashboard/board/${joinData.team_id}`)
      } else {
        setStep('choose')
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const res = await fetch('/api/teams/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: teamName, description }),
    })
    const data = await res.json()
    if (!res.ok) {
      toast({ title: 'Error', description: data.error, variant: 'destructive' })
    } else {
      router.push(`/dashboard/board/${data.team.id}`)
      router.refresh()
    }
    setLoading(false)
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const res = await fetch('/api/teams/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invite_code: inviteCode.toUpperCase() }),
    })
    const data = await res.json()
    if (!res.ok) {
      toast({ title: 'Invalid code', description: data.error, variant: 'destructive' })
    } else {
      router.push(`/dashboard/board/${data.team_id}`)
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-primary/15 flex items-center justify-center mx-auto mb-4">
            <Layers3 className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold gradient-text">TaskFlow</h1>
          <p className="text-muted-foreground mt-2">Team Collaboration Redefined</p>
        </div>

        {step === 'invite-decision' && invitedTeam && (
          <div className="glass-card rounded-2xl p-8 animate-in fade-in zoom-in-95 duration-500 text-center">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4 text-primary">
              <Users className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-bold mb-2">You're invited!</h2>
            <p className="text-muted-foreground mb-8">
              Join <span className="text-foreground font-semibold">"{invitedTeam.name}"</span> workspace and start collaborating.
            </p>
            <div className="flex flex-col gap-4">
              <div className="space-y-1.5 text-left">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground ml-1">Your Name</Label>
                <Input 
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="Enter your name"
                  className="h-12 text-lg rounded-xl text-center"
                  autoFocus
                />
              </div>
              <div className="flex flex-col gap-3 pt-2">
                <Button 
                  onClick={handleInstantAccept} 
                  className="w-full h-12 text-lg font-semibold rounded-xl shadow-lg shadow-primary/20" 
                  disabled={loading || !fullName.trim()}
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Accept & Join'}
                </Button>
                <Button variant="ghost" onClick={() => router.push('/')} disabled={loading} className="rounded-xl">
                  Decline
                </Button>
              </div>
            </div>
          </div>
        )}

        {step === 'name' && (
          <div className="glass-card rounded-2xl p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="font-bold text-lg mb-4">Setup your profile</h2>
            <form onSubmit={handleSetPlayerName} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Full Name</Label>
                <Input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Guru" autoFocus required />
              </div>
              <Button type="submit" className="w-full h-11" disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Continue'}
              </Button>
            </form>
          </div>
        )}

        {step === 'choose' && (
          <div className="grid grid-cols-2 gap-4 animate-in fade-in zoom-in-95 duration-300">
            <button
              onClick={() => setStep('create')}
              className="glass-card rounded-xl p-6 text-left hover:border-primary/50 transition-colors group"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center mb-3 group-hover:bg-primary/25 transition-colors">
                <Plus className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-semibold" style={{ fontFamily: 'var(--font-display)' }}>Create Team</h3>
              <p className="text-sm text-muted-foreground mt-1">Start a new workspace</p>
            </button>
            <button
              onClick={() => setStep('join')}
              className="glass-card rounded-xl p-6 text-left hover:border-primary/50 transition-colors group"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center mb-3 group-hover:bg-primary/25 transition-colors">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-semibold" style={{ fontFamily: 'var(--font-display)' }}>Join Team</h3>
              <p className="text-sm text-muted-foreground mt-1">Enter a code manually</p>
            </button>
          </div>
        )}

        {step === 'create' && (
          <div className="glass-card rounded-2xl p-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <h2 className="font-bold text-lg mb-4">Create a Team</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Team Name</Label>
                <Input value={teamName} onChange={e => setTeamName(e.target.value)} placeholder="Acme Corp" required />
              </div>
              <div className="flex gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setStep('choose')} className="flex-1">Back</Button>
                <Button type="submit" className="flex-1" disabled={loading}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Team'}
                </Button>
              </div>
            </form>
          </div>
        )}

        {step === 'join' && (
          <div className="glass-card rounded-2xl p-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <h2 className="font-bold text-lg mb-4" style={{ fontFamily: 'var(--font-display)' }}>Join a Team</h2>
            <form onSubmit={handleJoin} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Invite Code</Label>
                <Input
                  value={inviteCode}
                  onChange={e => setInviteCode(e.target.value)}
                  placeholder="ABC123"
                  className="uppercase tracking-widest text-center text-lg font-mono"
                  maxLength={6}
                  required
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setStep('choose')} className="flex-1">Back</Button>
                <Button type="submit" className="flex-1" disabled={loading}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Join Team'}
                </Button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
