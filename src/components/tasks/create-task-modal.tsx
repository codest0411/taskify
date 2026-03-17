'use client'

import { useState } from 'react'
import { TeamMember, TaskPriority, TaskStatus } from '@/types'
import { useAppStore } from '@/store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { X, Loader2, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  teamId: string
  members: TeamMember[]
  onClose: () => void
}

export function CreateTaskModal({ teamId, members, onClose }: Props) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<TaskPriority>('medium')
  const [status, setStatus] = useState<TaskStatus>('pending')
  const [dueDate, setDueDate] = useState('')
  const [reminderAt, setReminderAt] = useState('')
  const [assignedTo, setAssignedTo] = useState<string[]>([])
  const [tags, setTags] = useState('')
  const [loading, setLoading] = useState(false)
  const { addTask } = useAppStore()
  const { toast } = useToast()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    setLoading(true)

    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: title.trim(),
        description,
        priority,
        status,
        team_id: teamId,
        due_date: dueDate || null,
        reminder_at: reminderAt || null,
        assigned_to: assignedTo,
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      }),
    })

    const data = await res.json()
    if (!res.ok) {
      toast({ title: 'Failed to create task', description: data.error, variant: 'destructive' })
    } else {
      addTask(data.task)
      toast({ title: 'Task created!', description: title })
      onClose()
    }
    setLoading(false)
  }

  const priorities: TaskPriority[] = ['low', 'medium', 'high', 'urgent']
  const statuses: { value: TaskStatus; label: string }[] = [
    { value: 'pending', label: 'Pending' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'review', label: 'Review' },
    { value: 'completed', label: 'Completed' },
  ]

  const priorityColors: Record<TaskPriority, string> = {
    low: 'border-emerald-400 text-emerald-400 bg-emerald-400/10',
    medium: 'border-amber-400 text-amber-400 bg-amber-400/10',
    high: 'border-orange-400 text-orange-400 bg-orange-400/10',
    urgent: 'border-red-400 text-red-400 bg-red-400/10',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center sm:p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full h-full sm:h-auto sm:max-w-lg glass-card sm:rounded-2xl shadow-2xl animate-fade-in flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="font-bold text-lg" style={{ fontFamily: 'var(--font-display)' }}>
            New Task
          </h2>
          <button onClick={onClose} suppressHydrationWarning className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 flex-1 overflow-y-auto">
          {/* Title */}
          <div className="space-y-1.5">
            <Label>Title <span className="text-red-400">*</span></Label>
            <Input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="What needs to be done?"
              required
              autoFocus
              className="h-10"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label>Description</Label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              suppressHydrationWarning
              placeholder="Add details, context, or acceptance criteria..."
              rows={3}
              className="w-full px-3 py-2 text-sm rounded-md border border-input bg-input text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          {/* Priority + Status */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <div className="flex gap-1.5 flex-wrap">
                {priorities.map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={cn(
                      'text-xs px-2 py-1 rounded-md border capitalize transition-colors',
                      priority === p
                        ? priorityColors[p]
                        : 'border-border text-muted-foreground hover:border-muted-foreground'
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Status</Label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as TaskStatus)}
                suppressHydrationWarning
                className="w-full h-8 px-2 text-sm bg-input border border-border rounded-md text-foreground"
              >
                {statuses.map(s => (
                  <option key={s.value} value={s.value} suppressHydrationWarning>{s.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Due date + Reminder */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Due Date</Label>
              <Input
                type="datetime-local"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Reminder</Label>
              <Input
                type="datetime-local"
                value={reminderAt}
                onChange={e => setReminderAt(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
          </div>

          {/* Assignees */}
          <div className="space-y-1.5">
            <Label>Assign To</Label>
            <div className="flex flex-wrap gap-2">
              {members.map((m: any) => {
                const isSelected = assignedTo.includes(m.user_id)
                const name = m.profile?.full_name || m.profile?.email || 'Unknown'
                return (
                  <button
                    key={m.user_id}
                    type="button"
                    onClick={() => setAssignedTo(prev =>
                      isSelected ? prev.filter(id => id !== m.user_id) : [...prev, m.user_id]
                    )}
                    className={cn(
                      'flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-colors',
                      isSelected
                        ? 'bg-primary/15 border-primary/50 text-primary'
                        : 'border-border text-muted-foreground hover:border-muted-foreground'
                    )}
                  >
                    <div className="w-4 h-4 rounded-full bg-primary/20 flex items-center justify-center text-[9px] font-bold text-primary">
                      {name[0].toUpperCase()}
                    </div>
                    {name.split(' ')[0]}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-1.5">
            <Label>Tags <span className="text-muted-foreground text-xs">(comma-separated)</span></Label>
            <Input
              value={tags}
              onChange={e => setTags(e.target.value)}
              placeholder="frontend, bug, v2.0"
              className="h-9"
            />
          </div>

          {/* Submit */}
          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" className="flex-1 gap-1.5" disabled={loading || !title.trim()}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Create Task
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
