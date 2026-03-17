'use client'

import { useEffect, useCallback } from 'react'
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent,
  PointerSensor, useSensor, useSensors, closestCorners
} from '@dnd-kit/core'
import { createClient } from '@/lib/supabase/client'
import { useAppStore } from '@/store'
import { Task, TaskStatus, Team, TeamMember, Profile } from '@/types'
import { BoardColumn } from './board-column'
import { BoardHeader } from './board-header'
import { TaskCard } from './task-card'
import { TaskDrawer } from '../tasks/task-drawer'
import { CreateTaskModal } from '../tasks/create-task-modal'
import { QuickCreate } from '../tasks/quick-create'
import { PasteImport } from '../tasks/paste-import'
import { DashboardStats } from '../tasks/dashboard-stats'
import { ActivityFeed } from './activity-feed'
import { CursorPresence } from './cursor-presence'
import { useState } from 'react'
import { useToast } from '@/hooks/use-toast'

const COLUMNS: { id: TaskStatus; label: string; color: string }[] = [
  { id: 'pending', label: 'Pending', color: 'text-slate-400' },
  { id: 'in_progress', label: 'In Progress', color: 'text-blue-400' },
  { id: 'review', label: 'Review', color: 'text-violet-400' },
  { id: 'completed', label: 'Completed', color: 'text-emerald-400' },
]

interface Props {
  team: Team
  initialTasks: Task[]
  members: TeamMember[]
  currentUser: Profile
  userRole: string
}

export function BoardClient({ team, initialTasks, members, currentUser, userRole }: Props) {
  const {
    tasks, setTasks, updateTask, setMembers, setCurrentTeam, setCurrentUser,
    setProfiles, selectedTaskId, isTaskDrawerOpen, setTaskDrawerOpen,
    setSelectedTaskId, filterAssignee, filterPriority, filterTag, searchQuery,
    isCreateModalOpen, isQuickCreateOpen, isPasteImportOpen,
  } = useAppStore()
  const [activeDragId, setActiveDragId] = useState<string | null>(null)
  const [remoteDragTaskId, setRemoteDragTaskId] = useState<string | null>(null)
  const { toast } = useToast()
  const supabase = createClient()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  // Remote Drag Sync
  useEffect(() => {
    const channel = supabase.channel(`drag-sync-${team.id}`)
      .on('broadcast', { event: 'drag-start' }, ({ payload }) => {
        if (payload.userId !== currentUser.id) setRemoteDragTaskId(payload.taskId)
      })
      .on('broadcast', { event: 'drag-end' }, ({ payload }) => {
        if (payload.userId !== currentUser.id) setRemoteDragTaskId(null)
      })
      .subscribe()
    
    return () => { supabase.removeChannel(channel) }
  }, [team.id, currentUser.id])

  useEffect(() => {
    setTasks(initialTasks)
    setMembers(members)
    setCurrentTeam(team)
    setCurrentUser(currentUser)
    const profilesResult = members.map((m: any) => m.profile).filter(Boolean)
    setProfiles(profilesResult)
  }, [team.id, initialTasks.length, members.length])

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`team-${team.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'tasks',
        filter: `team_id=eq.${team.id}`,
      }, (payload) => {
        if (payload.eventType === 'UPDATE') {
          updateTask(payload.new.id, payload.new as Partial<Task>)
        } else if (payload.eventType === 'INSERT') {
          // Use latest state to avoid duplicates
          const currentTasks = useAppStore.getState().tasks
          const existing = currentTasks.find(t => t.id === payload.new.id)
          if (!existing) {
            useAppStore.getState().addTask(payload.new as Task)
          }
        } else if (payload.eventType === 'DELETE') {
          useAppStore.getState().removeTask(payload.old.id)
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [team.id])

  // Keyboard shortcut Cmd/Ctrl + K
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        useAppStore.getState().setQuickCreateOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const filteredTasks = tasks.filter(t => {
    if (filterAssignee && !t.assigned_to?.includes(filterAssignee)) return false
    if (filterPriority && t.priority !== filterPriority) return false
    if (filterTag && !t.tags?.includes(filterTag)) return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      if (!t.title.toLowerCase().includes(q) && !t.description?.toLowerCase().includes(q)) return false
    }
    return true
  })

  const getColumnTasks = (status: TaskStatus) =>
    filteredTasks.filter(t => t.status === status)

  const totalTasks = tasks.length
  const completedTasks = tasks.filter(t => t.status === 'completed').length
  const progressPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveDragId(null)
    
    // Broadcast end
    supabase.channel(`drag-sync-${team.id}`).send({
      type: 'broadcast',
      event: 'drag-end',
      payload: { userId: currentUser.id }
    })

    if (!over) return

    const taskId = active.id as string
    let newStatus = over.id as TaskStatus

    // If over.id is a taskId (UUID), find the task's status
    const overTask = tasks.find(t => t.id === over.id)
    if (overTask) {
      newStatus = overTask.status
    }

    const task = tasks.find(t => t.id === taskId)
    if (!task || task.status === newStatus) return

    // Optimistic update
    updateTask(taskId, { status: newStatus })

    const res = await fetch(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus, old_status: task.status }),
    })
    if (!res.ok) {
      updateTask(taskId, { status: task.status })
      toast({ title: 'Failed to move task', variant: 'destructive' })
    }
  }

  function handleDragStart(event: DragStartEvent) {
    const taskId = event.active.id as string
    setActiveDragId(taskId)

    // Broadcast start
    supabase.channel(`drag-sync-${team.id}`).send({
      type: 'broadcast',
      event: 'drag-start',
      payload: { userId: currentUser.id, taskId }
    })
  }

  const activeTask = activeDragId ? tasks.find(t => t.id === activeDragId) : null

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <CursorPresence teamId={team.id} activeDragId={activeDragId} />
      <BoardHeader
        team={team}
        members={members}
        progressPct={progressPct}
        completedTasks={completedTasks}
        totalTasks={totalTasks}
        userRole={userRole}
      />

      {/* Stats row */}
      <DashboardStats tasks={tasks} members={members} />

      {/* Board */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden p-2 sm:p-4">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 h-full min-w-max">
            {COLUMNS.map(col => (
              <BoardColumn
                key={col.id}
                id={col.id}
                label={col.label}
                color={col.color}
                tasks={getColumnTasks(col.id)}
                members={members}
                remoteDragTaskId={remoteDragTaskId}
                onTaskClick={(id) => {
                  setSelectedTaskId(id)
                  setTaskDrawerOpen(true)
                }}
              />
            ))}
          </div>
          <DragOverlay>
            {activeTask && (
              <div className="rotate-2 opacity-90 w-72">
                <TaskCard task={activeTask} members={members} onClick={() => {}} isDragging />
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Modals & Drawers */}
      {isTaskDrawerOpen && selectedTaskId && (
        <TaskDrawer
          taskId={selectedTaskId}
          members={members}
          currentUser={currentUser}
          onClose={() => { setTaskDrawerOpen(false); setSelectedTaskId(null) }}
        />
      )}
      {isCreateModalOpen && (
        <CreateTaskModal
          teamId={team.id}
          members={members}
          onClose={() => useAppStore.getState().setCreateModalOpen(false)}
        />
      )}
      {isQuickCreateOpen && (
        <QuickCreate
          teamId={team.id}
          onClose={() => useAppStore.getState().setQuickCreateOpen(false)}
        />
      )}
      {isPasteImportOpen && (
        <PasteImport
          teamId={team.id}
          onClose={() => useAppStore.getState().setPasteImportOpen(false)}
        />
      )}
      <ActivityFeed />
    </div>
  )
}
