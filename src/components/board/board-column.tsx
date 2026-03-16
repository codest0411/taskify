'use client'

import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Task, TaskStatus, TeamMember } from '@/types'
import { TaskCard } from './task-card'
import { cn } from '@/lib/utils'

interface Props {
  id: TaskStatus
  label: string
  color: string
  tasks: Task[]
  members: TeamMember[]
  onTaskClick: (id: string) => void
  remoteDragTaskId?: string | null
}

const COLUMN_ACCENT: Record<TaskStatus, string> = {
  pending: 'border-t-slate-500/50',
  in_progress: 'border-t-blue-500/50',
  review: 'border-t-violet-500/50',
  completed: 'border-t-emerald-500/50',
}

const COLUMN_BG: Record<TaskStatus, string> = {
  pending: 'bg-slate-400/5',
  in_progress: 'bg-blue-400/5',
  review: 'bg-violet-400/5',
  completed: 'bg-emerald-400/5',
}

export function BoardColumn({ id, label, color, tasks, members, onTaskClick, remoteDragTaskId }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id })

  return (
    <div className="flex flex-col w-72 flex-shrink-0 h-full">
      {/* Column header */}
      <div className={cn(
        'flex items-center justify-between px-3 py-2.5 rounded-t-xl border border-border border-b-0 border-t-2',
        COLUMN_ACCENT[id],
        'bg-card/60'
      )}>
        <div className="flex items-center gap-2">
          <span className={cn('text-sm font-semibold', color)} style={{ fontFamily: 'var(--font-display)' }}>
            {label}
          </span>
        </div>
        <span className={cn(
          'text-xs font-bold px-2 py-0.5 rounded-full',
          tasks.length > 0 ? 'bg-muted text-muted-foreground' : 'text-muted-foreground'
        )}>
          {tasks.length}
        </span>
      </div>

      {/* Droppable area */}
      <div
        ref={setNodeRef}
        className={cn(
          'flex-1 rounded-b-xl border border-border border-t-0 overflow-y-auto p-2 space-y-2 transition-colors',
          COLUMN_BG[id],
          isOver && 'ring-2 ring-primary/40 ring-inset'
        )}
      >
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              members={members}
              onClick={() => onTaskClick(task.id)}
              remoteDragTaskId={remoteDragTaskId}
            />
          ))}
        </SortableContext>

        {tasks.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center mb-2">
              <span className="text-lg">📭</span>
            </div>
            <p className="text-xs text-muted-foreground">No tasks here</p>
            <p className="text-xs text-muted-foreground/60">Drop tasks or create one</p>
          </div>
        )}
      </div>
    </div>
  )
}
