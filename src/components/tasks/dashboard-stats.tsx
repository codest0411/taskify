'use client'

import { useMemo } from 'react'
import { Task, TeamMember } from '@/types'
import { useAppStore } from '@/store'
import { cn, getInitials } from '@/lib/utils'
import { startOfWeek, endOfWeek, subWeeks, isWithinInterval, isPast } from 'date-fns'
import { TrendingUp, TrendingDown, CheckCircle2, AlertTriangle, ListTodo, Zap } from 'lucide-react'

interface Props {
  tasks: Task[]
  members: TeamMember[]
}

export function DashboardStats({ tasks, members }: Props) {
  const now = new Date()
  const thisWeekStart = startOfWeek(now)
  const thisWeekEnd = endOfWeek(now)
  const lastWeekStart = startOfWeek(subWeeks(now, 1))
  const lastWeekEnd = endOfWeek(subWeeks(now, 1))

  const stats = useMemo(() => {
    const completed = tasks.filter(t => t.status === 'completed')

    const completedThisWeek = completed.filter(t =>
      t.updated_at && isWithinInterval(new Date(t.updated_at), { start: thisWeekStart, end: thisWeekEnd })
    ).length

    const completedLastWeek = completed.filter(t =>
      t.updated_at && isWithinInterval(new Date(t.updated_at), { start: lastWeekStart, end: lastWeekEnd })
    ).length

    const overdue = tasks.filter(t =>
      t.due_date && isPast(new Date(t.due_date)) && t.status !== 'completed'
    ).length

    // Velocity: avg tasks completed per day last 7 days
    const sevenDaysAgo = new Date(now)
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const completedLast7 = completed.filter(t =>
      t.updated_at && new Date(t.updated_at) >= sevenDaysAgo
    ).length
    const velocity = Math.round((completedLast7 / 7) * 10) / 10

    const weekChange = completedLastWeek > 0
      ? Math.round(((completedThisWeek - completedLastWeek) / completedLastWeek) * 100)
      : completedThisWeek > 0 ? 100 : 0

    return { total: tasks.length, completedThisWeek, completedLastWeek, weekChange, overdue, velocity }
  }, [tasks])

  const memberStats = useMemo(() => {
    return members.map((m: any) => {
      const assigned = tasks.filter(t => t.assigned_to?.includes(m.user_id)).length
      const completed = tasks.filter(t =>
        t.assigned_to?.includes(m.user_id) && t.status === 'completed'
      ).length
      return {
        profile: m.profile,
        assigned,
        completed,
        rate: assigned > 0 ? Math.round((completed / assigned) * 100) : 0,
      }
    }).filter(m => m.assigned > 0)
  }, [tasks, members])

  const statCards = [
    {
      label: 'Total Tasks',
      value: stats.total,
      icon: ListTodo,
      color: 'text-blue-400',
      bg: 'bg-blue-400/10',
    },
    {
      label: 'Completed This Week',
      value: stats.completedThisWeek,
      icon: CheckCircle2,
      color: 'text-emerald-400',
      bg: 'bg-emerald-400/10',
      badge: stats.weekChange !== 0 ? (
        <span className={cn(
          'flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded-md',
          stats.weekChange > 0 ? 'text-emerald-400 bg-emerald-400/10' : 'text-red-400 bg-red-400/10'
        )}>
          {stats.weekChange > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {Math.abs(stats.weekChange)}%
        </span>
      ) : null,
    },
    {
      label: 'Overdue Tasks',
      value: stats.overdue,
      icon: AlertTriangle,
      color: stats.overdue > 0 ? 'text-red-400' : 'text-muted-foreground',
      bg: stats.overdue > 0 ? 'bg-red-400/10' : 'bg-muted/50',
    },
    {
      label: 'Daily Velocity',
      value: stats.velocity,
      icon: Zap,
      color: 'text-amber-400',
      bg: 'bg-amber-400/10',
      suffix: '/day',
    },
  ]

  return (
    <div className="flex-shrink-0 px-4 py-2 border-b border-border">
      <div className="flex gap-3 overflow-x-auto pb-1">
        {/* Stat cards */}
        {statCards.map(card => (
          <div
            key={card.label}
            className="flex-shrink-0 flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-card/60 border border-border min-w-36"
          >
            <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', card.bg)}>
              <card.icon className={cn('w-4 h-4', card.color)} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className={cn('text-lg font-bold leading-none', card.color)}>
                  {card.value}{card.suffix}
                </span>
                {(card as any).badge}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{card.label}</p>
            </div>
          </div>
        ))}

        {/* Member stats */}
        {memberStats.slice(0, 4).map(m => (
          <div
            key={m.profile?.id}
            className="flex-shrink-0 flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-card/60 border border-border min-w-44"
          >
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
              {m.profile?.avatar_url
                ? <img src={m.profile.avatar_url} alt="" className="w-full h-full object-cover rounded-full" />
                : getInitials(m.profile?.full_name || m.profile?.email)
              }
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{m.profile?.full_name || m.profile?.email}</p>
              <div className="flex items-center gap-1.5 mt-1">
                <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${m.rate}%` }}
                  />
                </div>
                <span className="text-[10px] text-muted-foreground flex-shrink-0">
                  {m.completed}/{m.assigned}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
