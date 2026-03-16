'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Task, TeamMember } from '@/types'
import { cn, getPriorityColor, getInitials, timeAgo, isImageFile } from '@/lib/utils'
import { format, isPast } from 'date-fns'
import { Paperclip, MessageSquare, Clock, AlertCircle } from 'lucide-react'
import Image from 'next/image'

interface Props {
  task: Task
  members: TeamMember[]
  onClick: () => void
  isDragging?: boolean
  remoteDragTaskId?: string | null
}

const PRIORITY_BORDER: Record<string, string> = {
  urgent: 'priority-urgent',
  high: 'priority-high',
  medium: 'priority-medium',
  low: 'priority-low',
}

export function TaskCard({ task, members, onClick, isDragging, remoteDragTaskId }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging: isSortableDragging } = useSortable({ id: task.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const assignees = task.assigned_to?.map(uid => {
    const member = members.find((m: any) => m.user_id === uid)
    return (member as any)?.profile
  }).filter(Boolean) ?? []

  const imageAttachments = task.attachments?.filter(a => isImageFile(a.file_type)) ?? []
  const isOverdue = task.due_date && isPast(new Date(task.due_date)) && task.status !== 'completed'

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={cn(
        'glass-card rounded-xl p-3 cursor-pointer hover:border-primary/30 transition-all select-none',
        PRIORITY_BORDER[task.priority],
        isSortableDragging && 'opacity-40',
        isDragging && 'shadow-2xl shadow-primary/20',
        remoteDragTaskId === task.id && 'opacity-30 border-primary shadow-[0_0_15px_rgba(var(--primary),0.3)] ring-2 ring-primary/20 rotate-1 scale-[0.98]'
      )}
    >
      {/* Priority + Tags */}
      <div className="flex items-center gap-1.5 mb-2 flex-wrap">
        <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded-md border', getPriorityColor(task.priority))}>
          {task.priority.toUpperCase()}
        </span>
        {task.tags?.slice(0, 2).map(tag => (
          <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded-md bg-primary/10 text-primary/80 border border-primary/20">
            {tag}
          </span>
        ))}
      </div>

      {/* Title */}
      <p className="text-sm font-medium leading-snug mb-2 line-clamp-2">
        {task.title}
      </p>

      {/* Description excerpt */}
      {task.description && (
        <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
          {task.description}
        </p>
      )}

      {/* Image thumbnails */}
      {imageAttachments.length > 0 && (
        <div className="flex gap-1 mb-2">
          {imageAttachments.slice(0, 3).map(att => (
            <div key={att.id} className="w-12 h-12 rounded-md overflow-hidden bg-muted relative flex-shrink-0">
              <Image src={att.file_url} alt={att.file_name} fill className="object-cover" />
            </div>
          ))}
          {imageAttachments.length > 3 && (
            <div className="w-12 h-12 rounded-md bg-muted flex items-center justify-center text-xs text-muted-foreground flex-shrink-0">
              +{imageAttachments.length - 3}
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-2">
        {/* Assignee avatars */}
        <div className="flex -space-x-1.5">
          {assignees.slice(0, 3).map((p: any, i: number) => (
            <div
              key={p.id}
              className="w-6 h-6 rounded-full bg-primary/20 border-2 border-card flex items-center justify-center text-[10px] font-bold text-primary"
              title={p.full_name || p.email}
              style={{ zIndex: 10 - i }}
            >
              {p.avatar_url
                ? <img src={p.avatar_url} alt="" className="w-full h-full object-cover rounded-full" />
                : getInitials(p.full_name || p.email)
              }
            </div>
          ))}
          {assignees.length > 3 && (
            <div className="w-6 h-6 rounded-full bg-muted border-2 border-card flex items-center justify-center text-[10px] text-muted-foreground">
              +{assignees.length - 3}
            </div>
          )}
        </div>

        {/* Meta */}
        <div className="flex items-center gap-2 text-muted-foreground">
          {task.attachments && task.attachments.length > 0 && (
            <span className="flex items-center gap-0.5 text-[10px]">
              <Paperclip className="w-3 h-3" />
              {task.attachments.length}
            </span>
          )}
          {task.due_date && (
            <span className={cn(
              'flex items-center gap-0.5 text-[10px]',
              isOverdue && 'text-red-400'
            )}>
              {isOverdue ? <AlertCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
              {format(new Date(task.due_date), 'MMM d')}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
