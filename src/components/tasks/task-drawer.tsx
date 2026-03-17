'use client'

import { useState, useEffect, useRef } from 'react'
import { Task, TeamMember, Profile, TaskPriority, TaskStatus, TaskActivity, TaskComment } from '@/types'
import { useAppStore } from '@/store'
import { useToast } from '@/hooks/use-toast'
import { createClient } from '@/lib/supabase/client'
import { cn, getPriorityColor, getStatusColor, getStatusLabel, getInitials, timeAgo, formatBytes, isImageFile } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { format } from 'date-fns'
import {
  X, Loader2, Paperclip, MessageSquare, Clock, Tag,
  Users, Activity, Send, Download, Trash2, Calendar,
  ChevronDown, Edit3, Check, AlertCircle
} from 'lucide-react'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import Image from 'next/image'

interface Props {
  taskId: string
  members: TeamMember[]
  currentUser: Profile
  onClose: () => void
}

export function TaskDrawer({ taskId, members, currentUser, onClose }: Props) {
  const { tasks, updateTask } = useAppStore()
  const task = tasks.find(t => t.id === taskId)
  const [fullTask, setFullTask] = useState<Task | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingTitle, setEditingTitle] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [comment, setComment] = useState('')
  const [sendingComment, setSendingComment] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [activeTab, setActiveTab] = useState<'details' | 'activity' | 'files'>('details')
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  useEffect(() => {
    fetchFullTask()

    // Real-time synchronization for this specific task
    const supabase = createClient()
    const channel = supabase
      .channel(`task-drawer-${taskId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'task_comments',
        filter: `task_id=eq.${taskId}`
      }, async (payload) => {
        const { data } = await supabase
          .from('task_comments')
          .select('*, user:profiles(id,full_name,avatar_url,email)')
          .eq('id', payload.new.id)
          .single()
        if (data) {
          setFullTask(prev => prev ? {
            ...prev,
            comments: [...(prev.comments || []), data]
          } : prev)
        }
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'task_activity',
        filter: `task_id=eq.${taskId}`
      }, async (payload) => {
         const { data } = await supabase
          .from('task_activity')
          .select('*, user:profiles(id,full_name,avatar_url,email)')
          .eq('id', payload.new.id)
          .single()
        if (data) {
          setFullTask(prev => prev ? {
            ...prev,
            activity: [data as TaskActivity, ...(prev.activity || [])]
          } : prev)
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'tasks',
        filter: `id=eq.${taskId}`
      }, (payload) => {
        setFullTask(prev => prev ? { ...prev, ...payload.new } : (payload.new as Task))
        setTitle(payload.new.title)
        setDescription(payload.new.description || '')
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [taskId])

  async function fetchFullTask() {
    setLoading(true)
    const res = await fetch(`/api/tasks/${taskId}`)
    if (res.ok) {
      const data = await res.json()
      setFullTask(data.task)
      setTitle(data.task.title)
      setDescription(data.task.description || '')
    }
    setLoading(false)
  }

  async function handleSaveTitle() {
    if (!title.trim() || title === fullTask?.title) { setEditingTitle(false); return }
    setSaving(true)
    await fetch(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    })
    updateTask(taskId, { title })
    setFullTask(prev => prev ? { ...prev, title } : prev)
    setEditingTitle(false)
    setSaving(false)
  }

  async function handleFieldUpdate(field: string, value: any) {
    await fetch(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: value }),
    })
    updateTask(taskId, { [field]: value } as Partial<Task>)
    setFullTask(prev => prev ? { ...prev, [field]: value } : prev)
  }

  async function handleCommentSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!comment.trim()) return
    setSendingComment(true)
    const res = await fetch(`/api/tasks/${taskId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: comment }),
    })
    const data = await res.json()
    if (res.ok) {
      setFullTask(prev => prev ? {
        ...prev,
        comments: [...(prev.comments || []), { ...data.comment, user: currentUser }]
      } : prev)
      setComment('')
    }
    setSendingComment(false)
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files || files.length === 0) return
    setUploading(true)

    for (const file of Array.from(files)) {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch(`/api/tasks/${taskId}/attachments`, {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      if (res.ok) {
        setFullTask(prev => prev ? {
          ...prev,
          attachments: [...(prev.attachments || []), data.attachment]
        } : prev)
      }
    }
    setUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleDeleteTask() {
    setDeleting(true)
    await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' })
    useAppStore.getState().removeTask(taskId)
    toast({ title: 'Task deleted' })
    onClose()
  }

  const displayTask = fullTask || task
  const priorities: TaskPriority[] = ['low', 'medium', 'high', 'urgent']
  const statuses: TaskStatus[] = ['pending', 'in_progress', 'review', 'completed']

  const priorityColors: Record<string, string> = {
    low: 'border-emerald-400 text-emerald-400',
    medium: 'border-amber-400 text-amber-400',
    high: 'border-orange-400 text-orange-400',
    urgent: 'border-red-400 text-red-400',
  }

  if (!displayTask) return null

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 z-50 w-full sm:max-w-xl bg-card border-l border-border shadow-2xl flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="flex items-start gap-3 px-5 py-4 border-b border-border flex-shrink-0">
          <div className="flex-1 min-w-0">
            {editingTitle ? (
              <div className="flex items-center gap-2">
                <Input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleSaveTitle(); if (e.key === 'Escape') setEditingTitle(false) }}
                  className="text-base font-bold h-9"
                  autoFocus
                />
                <Button size="sm" onClick={handleSaveTitle} disabled={saving} className="h-9 px-3">
                  {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 group">
                <h2 className="text-base font-bold leading-snug" style={{ fontFamily: 'var(--font-display)' }}>
                  {displayTask.title}
                </h2>
                <button
                  onClick={() => setEditingTitle(true)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            <div className="flex items-center gap-2 mt-1.5">
              <span className={cn('text-xs px-2 py-0.5 rounded-md border font-medium', getPriorityColor(displayTask.priority))}>
                {displayTask.priority.toUpperCase()}
              </span>
              <span className={cn('text-xs px-2 py-0.5 rounded-md font-medium', getStatusColor(displayTask.status))}>
                {getStatusLabel(displayTask.status)}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-red-400 hover:bg-red-400/10 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border flex-shrink-0">
          {[
            { id: 'details', label: 'Details', icon: Edit3 },
            { id: 'activity', label: 'Activity', icon: Activity },
            { id: 'files', label: `Files${fullTask?.attachments?.length ? ` (${fullTask.attachments.length})` : ''}`, icon: Paperclip },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                'flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          )}

          {!loading && activeTab === 'details' && (
            <div className="p-5 space-y-5">
              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Description</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  onBlur={() => {
                    if (description !== fullTask?.description) {
                      handleFieldUpdate('description', description)
                    }
                  }}
                  placeholder="Add a description..."
                  rows={3}
                  className="w-full px-3 py-2 text-sm rounded-md border border-input bg-input text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>

              {/* Status */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</label>
                <div className="flex gap-1.5 flex-wrap">
                  {statuses.map(s => (
                    <button
                      key={s}
                      onClick={() => handleFieldUpdate('status', s)}
                      className={cn(
                        'text-xs px-2.5 py-1.5 rounded-lg border transition-colors',
                        displayTask.status === s
                          ? cn(getStatusColor(s), 'border-current')
                          : 'border-border text-muted-foreground hover:border-muted-foreground'
                      )}
                    >
                      {getStatusLabel(s)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Priority */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Priority</label>
                <div className="flex gap-1.5">
                  {priorities.map(p => (
                    <button
                      key={p}
                      onClick={() => handleFieldUpdate('priority', p)}
                      className={cn(
                        'text-xs px-2.5 py-1.5 rounded-lg border capitalize transition-colors',
                        displayTask.priority === p
                          ? priorityColors[p]
                          : 'border-border text-muted-foreground hover:border-muted-foreground'
                      )}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Due date */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Due Date
                  </label>
                  <Input
                    type="datetime-local"
                    defaultValue={displayTask.due_date ? displayTask.due_date.slice(0, 16) : ''}
                    onBlur={e => handleFieldUpdate('due_date', e.target.value || null)}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Reminder</label>
                  <Input
                    type="datetime-local"
                    defaultValue={displayTask.reminder_at ? displayTask.reminder_at.slice(0, 16) : ''}
                    onBlur={e => handleFieldUpdate('reminder_at', e.target.value || null)}
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              {/* Assignees */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <Users className="w-3 h-3" /> Assignees
                </label>
                <div className="flex gap-2 flex-wrap">
                  {members.map((m: any) => {
                    const isAssigned = displayTask.assigned_to?.includes(m.user_id)
                    const name = m.profile?.full_name || m.profile?.email || 'Unknown'
                    return (
                      <button
                        key={m.user_id}
                        onClick={() => {
                          const newAssigned = isAssigned
                            ? (displayTask.assigned_to || []).filter((id: string) => id !== m.user_id)
                            : [...(displayTask.assigned_to || []), m.user_id]
                          handleFieldUpdate('assigned_to', newAssigned)
                        }}
                        className={cn(
                          'flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-colors',
                          isAssigned ? 'bg-primary/15 border-primary/50 text-primary' : 'border-border text-muted-foreground'
                        )}
                      >
                        <div className="w-4 h-4 rounded-full bg-primary/20 flex items-center justify-center text-[9px] font-bold text-primary">
                          {name[0].toUpperCase()}
                        </div>
                        {name.split(' ')[0]}
                        {isAssigned && <Check className="w-3 h-3" />}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Tags */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <Tag className="w-3 h-3" /> Tags
                </label>
                <Input
                  defaultValue={displayTask.tags?.join(', ') || ''}
                  onBlur={e => handleFieldUpdate('tags', e.target.value.split(',').map((t: string) => t.trim()).filter(Boolean))}
                  placeholder="frontend, bug, v2.0"
                  className="h-8 text-xs"
                />
              </div>

              {/* Comments */}
              <div className="space-y-3">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <MessageSquare className="w-3 h-3" /> Comments
                </label>
                <div className="space-y-3">
                  {fullTask?.comments?.map((c: TaskComment) => (
                    <div key={c.id} className="flex gap-2.5">
                      <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary flex-shrink-0 mt-0.5">
                        {getInitials(c.user?.full_name || c.user?.email)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-semibold">{c.user?.full_name || 'User'}</span>
                          <span className="text-xs text-muted-foreground">{timeAgo(c.created_at)}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">{c.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <form onSubmit={handleCommentSubmit} className="flex gap-2">
                  <Input
                    value={comment}
                    onChange={e => setComment(e.target.value)}
                    placeholder="Add a comment..."
                    className="h-8 text-sm flex-1"
                  />
                  <Button type="submit" size="sm" disabled={!comment.trim() || sendingComment} className="h-8 px-3">
                    {sendingComment ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  </Button>
                </form>
              </div>
            </div>
          )}

          {!loading && activeTab === 'activity' && (
            <div className="p-5">
              <div className="space-y-1">
                {fullTask?.activity?.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">No activity yet</p>
                )}
                {fullTask?.activity?.map((a: TaskActivity, i: number) => (
                  <div key={a.id} className={cn('flex gap-3 pb-4 relative', i < (fullTask.activity?.length || 0) - 1 && 'activity-line')}>
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0 z-10">
                      {getInitials(a.user?.full_name || a.user?.email)}
                    </div>
                    <div className="flex-1 pt-1">
                      <p className="text-sm">
                        <span className="font-medium">{a.user?.full_name || 'User'}</span>
                        {' '}
                        <span className="text-muted-foreground">
                          {a.action === 'moved' && `moved from ${a.old_value} → ${a.new_value}`}
                          {a.action === 'created' && 'created this task'}
                          {a.action === 'assigned' && `assigned to ${a.new_value}`}
                          {a.action === 'commented' && 'commented'}
                          {a.action === 'uploaded' && `uploaded ${a.new_value}`}
                          {a.action === 'updated' && `updated ${a.old_value}`}
                          {a.action === 'reminder_sent' && 'email reminder sent'}
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">{timeAgo(a.created_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!loading && activeTab === 'files' && (
            <div className="p-5 space-y-4">
              {/* Upload zone */}
              <div
                className="border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={e => e.preventDefault()}
                onDrop={e => {
                  e.preventDefault()
                  const files = e.dataTransfer.files
                  if (files.length) {
                    const fakeEvent = { target: { files } } as any
                    handleFileUpload(fakeEvent)
                  }
                }}
              >
                {uploading ? (
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
                ) : (
                  <>
                    <Paperclip className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm font-medium">Drop files here or click to upload</p>
                    <p className="text-xs text-muted-foreground mt-1">Max 25MB per file · Images, PDF, DOCX, ZIP</p>
                  </>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                accept="image/*,.pdf,.docx,.xlsx,.zip"
                onChange={handleFileUpload}
              />

              {/* Image grid */}
              {fullTask?.attachments && fullTask.attachments.filter(a => isImageFile(a.file_type)).length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Images</p>
                  <div className="grid grid-cols-3 gap-2">
                    {fullTask.attachments.filter(a => isImageFile(a.file_type)).map(att => (
                      <button
                        key={att.id}
                        onClick={() => setLightboxUrl(att.file_url)}
                        className="aspect-square rounded-lg overflow-hidden bg-muted relative hover:ring-2 ring-primary transition-all"
                      >
                        <Image src={att.file_url} alt={att.file_name} fill className="object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* All files */}
              {fullTask?.attachments && fullTask.attachments.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">All Files</p>
                  <div className="space-y-2">
                    {fullTask.attachments.map(att => (
                      <div key={att.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                        <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold text-muted-foreground uppercase">
                            {att.file_name.split('.').pop()?.slice(0, 4)}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{att.file_name}</p>
                          <p className="text-xs text-muted-foreground">{formatBytes(att.size)}</p>
                        </div>
                        <a
                          href={att.file_url}
                          download={att.file_name}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                          onClick={e => e.stopPropagation()}
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(!fullTask?.attachments || fullTask.attachments.length === 0) && (
                <p className="text-sm text-muted-foreground text-center py-4">No attachments yet</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Lightbox */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightboxUrl(null)}
        >
          <button className="absolute top-4 right-4 text-white/80 hover:text-white">
            <X className="w-6 h-6" />
          </button>
          <img src={lightboxUrl} alt="" className="max-w-full max-h-full object-contain rounded-lg" />
        </div>
      )}
      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="Delete Task?"
        description="Are you sure you want to delete this task? This action cannot be undone."
        confirmText="Delete Task"
        variant="destructive"
        onConfirm={handleDeleteTask}
        onCancel={() => setShowDeleteConfirm(false)}
        loading={deleting}
      />
    </>
  )
}
