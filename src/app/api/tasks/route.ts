import { createClient, createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { sendEmailNotification } from '@/lib/email'

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { title, description, priority, status, team_id, due_date, reminder_at, assigned_to, tags } = body

  if (!title || !team_id) {
    return NextResponse.json({ error: 'title and team_id are required' }, { status: 400 })
  }

  // Verify membership
  const { data: member } = await supabase
    .from('team_members')
    .select('id')
    .eq('team_id', team_id)
    .eq('user_id', user.id)
    .single()

  if (!member) return NextResponse.json({ error: 'Not a team member' }, { status: 403 })

  const { data: task, error } = await supabase
    .from('tasks')
    .insert({
      title,
      description: description || null,
      priority: priority || 'medium',
      status: status || 'pending',
      team_id,
      created_by: user.id,
      assigned_to: assigned_to || [],
      tags: tags || [],
      due_date: due_date || null,
      reminder_at: reminder_at || null,
    })
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Log activity
  await supabase.from('task_activity').insert({
    task_id: task.id,
    user_id: user.id,
    action: 'created',
    new_value: title,
  })

  // Create reminder if set
  if (reminder_at && assigned_to?.length > 0) {
    const reminders = assigned_to.map((uid: string) => ({
      task_id: task.id,
      user_id: uid,
      send_at: reminder_at,
      sent: false,
    }))
    await supabase.from('email_reminders').insert(reminders)
  }

  // Send assignment notification via Supabase messages (Edge Function)
  if (assigned_to?.length > 0) {
    try {
      const serviceClient = createServiceClient()
      for (const uid of assigned_to) {
        const { data: profile } = await serviceClient
          .from('profiles')
          .select('email, full_name')
          .eq('id', uid)
          .single()

        if (profile?.email) {
          await sendEmailNotification({
            to: profile.email,
            subject: `You've been assigned: ${title}`,
            type: 'assignment',
            task: { title, description, priority, due_date, id: task.id },
            assignee_name: profile.full_name,
          })
        }
      }
    } catch (_) { /* non-critical */ }
  }

  return NextResponse.json({ task }, { status: 201 })
}
