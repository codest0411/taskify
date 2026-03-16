import { createServiceClient } from '@/lib/supabase/server'

interface EmailPayload {
  to: string
  subject: string
  type: 'reminder' | 'assignment' | 'review' | 'overdue' | 'invitation'
  task?: {
    id: string
    title: string
    description?: string
    priority?: string
    due_date?: string
  }
  team_name?: string
  invite_code?: string
  assignee_name?: string
}

export async function sendEmailNotification(payload: EmailPayload) {
  const adminSupabase = createServiceClient()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  
  let redirectUrl = `${appUrl}/dashboard`
  if (payload.type === 'invitation' && payload.invite_code) {
    redirectUrl = `${appUrl}/dashboard/onboarding?join=${payload.invite_code}`
  }

  // Trigger Supabase Invite Email Template
  const { error } = await adminSupabase.auth.admin.inviteUserByEmail(payload.to, {
    data: {
      task_title: payload.task?.title || '',
      task_description: payload.task?.description || '',
      task_priority: payload.task?.priority || '',
      task_due_date: payload.task?.due_date || '',
      team_name: payload.team_name || '',
      invite_code: payload.invite_code || '',
      assignee_name: payload.assignee_name || '',
      notification_type: payload.type,
      email_subject: payload.subject,
    },
    redirectTo: redirectUrl
  })

  return { success: !error, error }
}
