// supabase/functions/email-reminders/index.ts
// Deploy: supabase functions deploy email-reminders
// Schedule: Set up in Supabase Dashboard > Database > Cron Jobs
// Cron: */5 * * * * (every 5 minutes)
// Calls: https://<project>.supabase.co/functions/v1/email-reminders

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  // Find due reminders
  const { data: reminders, error } = await supabase
    .from('email_reminders')
    .select(`
      *,
      task:tasks(id, title, description, due_date, priority),
      profile:profiles(email, full_name)
    `)
    .lte('send_at', new Date().toISOString())
    .eq('sent', false)
    .limit(100)

  if (error) {
    console.error('Failed to fetch reminders:', error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }

  if (!reminders?.length) {
    return new Response(JSON.stringify({ sent: 0, message: 'No pending reminders' }))
  }

  let sent = 0
  const errors: string[] = []

  for (const reminder of reminders) {
    if (!reminder.profile?.email || !reminder.task) continue

    try {
      // Call the send-email edge function
      const { error: emailError } = await supabase.functions.invoke('send-email', {
        body: {
          to: reminder.profile.email,
          subject: `⏰ Reminder: ${reminder.task.title}`,
          type: 'reminder',
          task: reminder.task,
          assignee_name: reminder.profile.full_name,
        },
      })

      if (emailError) throw emailError

      // Mark as sent
      await supabase
        .from('email_reminders')
        .update({ sent: true })
        .eq('id', reminder.id)

      // Log activity
      await supabase.from('task_activity').insert({
        task_id: reminder.task_id,
        user_id: reminder.user_id,
        action: 'reminder_sent',
        new_value: reminder.profile.email,
      })

      sent++
    } catch (e: any) {
      console.error(`Failed reminder ${reminder.id}:`, e)
      errors.push(e.message)
    }
  }

  // Also check for overdue tasks and send notifications
  const { data: overdueTasks } = await supabase
    .from('tasks')
    .select('id, title, description, priority, due_date, assigned_to, team_id')
    .lt('due_date', new Date().toISOString())
    .neq('status', 'completed')
    .not('due_date', 'is', null)

  if (overdueTasks?.length) {
    for (const task of overdueTasks) {
      // Check if we already sent an overdue notification today
      const today = new Date().toISOString().split('T')[0]
      const { data: existing } = await supabase
        .from('email_reminders')
        .select('id')
        .eq('task_id', task.id)
        .like('send_at', `${today}%`)
        .eq('sent', true)
        .limit(1)

      if (existing?.length) continue // Already notified today

      for (const userId of (task.assigned_to || [])) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('email, full_name')
          .eq('id', userId)
          .single()

        if (profile?.email) {
          await supabase.functions.invoke('send-email', {
            body: {
              to: profile.email,
              subject: `⚠️ Overdue: ${task.title}`,
              type: 'overdue',
              task,
              assignee_name: profile.full_name,
            },
          })
        }
      }
    }
  }

  return new Response(
    JSON.stringify({ sent, errors: errors.length ? errors : undefined }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})
