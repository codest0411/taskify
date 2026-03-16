'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAppStore } from '@/store'
import { Profile, Team } from '@/types'
import { ThemeToggle } from './theme-provider'
import { cn } from '@/lib/utils'
import {
  Layers3, LayoutDashboard, Settings, Users,
  Plus, LogOut, ChevronRight
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { RealtimeNotifications } from '../global/realtime-notifications'

interface AppShellProps {
  children: React.ReactNode
  user: Profile | null
  teams: any[]
}

export function AppShell({ children, user, teams }: AppShellProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const { setCurrentUser, setTeams, currentTeam, setCurrentTeam } = useAppStore()

  useEffect(() => {
    if (user) setCurrentUser(user)
    if (teams) setTeams(teams)
  }, [user, teams])

  useEffect(() => {
    // Set current team from URL
    const match = pathname.match(/\/board\/([^/]+)/)
    if (match && teams) {
      const found = teams.find((t: Team) => t.id === match[1])
      if (found) setCurrentTeam(found)
    }
  }, [pathname, teams])

  // Sync teams list in real-time
  useEffect(() => {
    if (!user) return

    const channel = supabase
      .channel('sidebar-sync')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'team_members',
        filter: `user_id=eq.${user.id}`
      }, () => {
        router.refresh()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [user?.id])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/dashboard/onboarding')
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <RealtimeNotifications />
      {/* Sidebar */}
      <aside className="w-60 flex-shrink-0 flex flex-col border-r border-border bg-card/50">
        {/* Logo */}
        <div className="h-14 flex items-center px-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
              <Layers3 className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-base" style={{ fontFamily: 'var(--font-display)' }}>
              TaskFlow
            </span>
          </div>
        </div>

        {/* Teams list */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 pb-1 pt-2">
            Teams
          </p>
          {teams.filter((obj, index, self) => 
            index === self.findIndex((t) => t.id === obj.id)
          ).map((team: Team) => {
            const isActive = pathname.includes(team.id)
            return (
              <div key={team.id} className="space-y-1">
                <Link
                  href={`/dashboard/board/${team.id}`}
                  className={cn(
                    'flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors',
                    isActive
                      ? 'bg-primary/15 text-primary font-semibold'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  )}
                >
                  <div className={cn(
                    'w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold flex-shrink-0',
                    isActive ? 'bg-primary text-white' : 'bg-muted text-foreground'
                  )}>
                    {team.name[0].toUpperCase()}
                  </div>
                  <span className="truncate flex-1">{team.name}</span>
                  {isActive && <ChevronRight className="w-3 h-3 flex-shrink-0 rotate-90" />}
                </Link>

                {isActive && (
                  <div className="ml-8 space-y-1 pr-1 pb-1">
                    <Link
                      href={`/dashboard/board/${team.id}`}
                      className={cn(
                        'flex items-center gap-2.5 px-2 py-1.5 rounded-md text-[13px] transition-colors',
                        pathname.endsWith(`/board/${team.id}`)
                          ? 'text-foreground font-medium'
                          : 'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      <LayoutDashboard className="w-3.5 h-3.5" />
                      Board
                    </Link>
                    <Link
                      href={`/dashboard/team/${team.id}`}
                      className={cn(
                        'flex items-center gap-2.5 px-2 py-1.5 rounded-md text-[13px] transition-colors',
                        pathname.includes(`/team/`)
                          ? 'text-foreground font-medium'
                          : 'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      <Users className="w-3.5 h-3.5" />
                      Team
                    </Link>
                    <Link
                      href={`/dashboard/settings/${team.id}`}
                      className={cn(
                        'flex items-center gap-2.5 px-2 py-1.5 rounded-md text-[13px] transition-colors',
                        pathname.includes(`/settings/`)
                          ? 'text-foreground font-medium'
                          : 'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      <Settings className="w-3.5 h-3.5" />
                      Settings
                    </Link>
                  </div>
                )}
              </div>
            )
          })}

          <div className="pt-2">
            <Link
              href="/dashboard/onboarding"
              className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors border border-transparent hover:border-border/50"
            >
              <div className="w-6 h-6 rounded-md border border-dashed border-border flex items-center justify-center flex-shrink-0">
                <Plus className="w-3 h-3" />
              </div>
              <span>New team</span>
            </Link>
          </div>
        </div>

        {/* Bottom user area */}
        <div className="border-t border-border p-3">
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg">
            <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
              {user?.full_name?.[0]?.toUpperCase() ?? user?.email?.[0]?.toUpperCase() ?? '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{user?.full_name || 'User'}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
            <div className="flex items-center gap-1">
              <ThemeToggle />
              <button
                onClick={handleLogout}
                className="w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                title="Sign out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {children}
      </main>
    </div>
  )
}
