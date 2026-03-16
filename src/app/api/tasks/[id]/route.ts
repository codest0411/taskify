import { createClient, createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { sendEmailNotification } from '@/lib/email'

interface Params { params: { id: string } }

export async function GET(_req: NextRequest, { params }: Params) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: task, error } = await supabase
    .from('tasks')
    .select(`
      *,
      attachments:task_attachments(*, uploader:profiles(id,full_name,avatar_url,email)),
      comments:task_comments(*, user:profiles(id,full_name,avatar_url,email)),
      activity:task_activity(*, user:profiles(id,full_name,avatar_url,email))
    `)
    .eq('id', params.id)
    .order('created_at', { foreignTable: 'task_activity', ascending: false })
    .order('created_at', { foreignTable: 'task_comments', ascending: true })
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 404 })

  return NextResponse.json({ task })
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { old_status, ...updates } = body

  // Build update payload (only allowed fields)
  const allowed = ['title', 'description', 'priority', 'status', 'due_date', 'reminder_at', 'assigned_to', 'tags', 'google_event_id']
  const payload: Record<string, any> = { updated_at: new Date().toISOString() }
  for (const key of allowed) {
    if (key in updates) payload[key] = updates[key]
  }

  const { data: task, error } = await supabase
    .from('tasks')
    .update(payload)
    .eq('id', params.id)
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Log activity for status change
  if (updates.status && old_status && updates.status !== old_status) {
    await supabase.from('task_activity').insert({
      task_id: params.id,
      user_id: user.id,
      action: 'moved',
      old_value: old_status,
      new_value: updates.status,
    })

    // Send review notification via unified email utility
    if (updates.status === 'review') {
      try {
        const serviceClient = createServiceClient()
        const assignedTo = task.assigned_to || []
        for (const uid of assignedTo) {
          const { data: profile } = await serviceClient
            .from('profiles')
            .select('email, full_name')
            .eq('id', uid)
            .single()
          if (profile?.email) {
            await sendEmailNotification({
              to: profile.email,
              subject: `Task moved to Review: ${task.title}`,
              type: 'review',
              task: { title: task.title, id: task.id },
              assignee_name: profile.full_name,
            })
          }
        }
      } catch (_) {}
    }
  }

  // Log for other updates
  if ('assigned_to' in updates) {
    await supabase.from('task_activity').insert({
      task_id: params.id,
      user_id: user.id,
      action: 'assigned',
      new_value: (updates.assigned_to || []).join(', '),
    })
  }

  // Update reminder records if reminder_at or assigned_to changed
  if (('reminder_at' in updates || 'assigned_to' in updates) && task.assigned_to?.length > 0) {
    // Always clear existing unsent reminders for this task first
    await supabase.from('email_reminders').delete().eq('task_id', params.id).eq('sent', false)
    
    // Create new ones ONLY if we still have a reminder date
    const finalReminderAt = 'reminder_at' in updates ? updates.reminder_at : task.reminder_at
    if (finalReminderAt) {
      const reminders = task.assigned_to.map((uid: string) => ({
        task_id: params.id,
        user_id: uid,
        send_at: finalReminderAt,
        sent: false,
      }))
      await supabase.from('email_reminders').insert(reminders)
    }
  }

  return NextResponse.json({ task })
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { error } = await supabase.from('tasks').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
