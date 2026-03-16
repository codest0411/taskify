import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { sendEmailNotification } from '@/lib/email'

export async function POST(request: NextRequest) {
  // Validate cron secret
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()

  const { data: reminders, error } = await supabase
    .from('email_reminders')
    .select(`
      *,
      task:tasks(id, title, description, due_date, priority),
      profile:profiles(email, full_name)
    `)
    .lte('send_at', new Date().toISOString())
    .eq('sent', false)
    .limit(50)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!reminders?.length) return NextResponse.json({ sent: 0 })

  let sent = 0
  for (const reminder of reminders) {
    if (!reminder.profile?.email || !reminder.task) continue

    try {
      await sendEmailNotification({
        to: reminder.profile.email,
        subject: `⏰ Reminder: ${reminder.task.title}`,
        type: 'reminder',
        task: reminder.task,
        assignee_name: reminder.profile.full_name,
      })

      await supabase
        .from('email_reminders')
        .update({ sent: true })
        .eq('id', reminder.id)

      await supabase.from('task_activity').insert({
        task_id: reminder.task_id,
        user_id: reminder.user_id,
        action: 'reminder_sent',
        new_value: reminder.profile.email,
      })

      sent++
    } catch (e) {
      console.error('Failed to send reminder:', e)
    }
  }

  return NextResponse.json({ sent })
}
