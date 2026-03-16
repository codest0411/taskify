// supabase/functions/send-email/index.ts
// Deploy with: supabase functions deploy send-email
// Uses Supabase's built-in auth.users email system via custom SMTP settings
// OR Supabase Mailer. No external email provider needed.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EmailPayload {
  to: string
  subject: string
  type: 'reminder' | 'assignment' | 'review' | 'overdue' | 'invitation'
  team_name?: string
  invite_code?: string
  task?: {
    id: string
    title: string
    description?: string
    priority?: string
    due_date?: string
  }
  assignee_name?: string
}

const PRIORITY_COLOR: Record<string, string> = {
  urgent: '#ef4444',
  high:   '#f97316',
  medium: '#f59e0b',
  low:    '#10b981',
}

const PRIORITY_LABEL: Record<string, string> = {
  urgent: '🔴 URGENT',
  high:   '🟠 HIGH',
  medium: '🟡 MEDIUM',
  low:    '🟢 LOW',
}

function buildHtmlEmail(payload: EmailPayload): string {
  const { task, assignee_name, type } = payload
  const appUrl = Deno.env.get('APP_URL') || 'http://localhost:3000'
  const taskUrl = type === 'invitation' 
    ? `${appUrl}/dashboard/onboarding?join=${payload.invite_code}`
    : `${appUrl}/dashboard`
  const priority = task.priority || 'medium'
  const priorityColor = PRIORITY_COLOR[priority] || '#f59e0b'
  const priorityLabel = PRIORITY_LABEL[priority] || 'MEDIUM'

  const headings: Record<string, string> = {
    reminder: '⏰ Task Reminder',
    assignment: '📋 New Task Assigned',
    review: '👀 Task Ready for Review',
    overdue: '⚠️ Task Overdue',
    invitation: '👋 Join our Team',
  }

  const subtext: Record<string, string> = {
    reminder: 'This task needs your attention.',
    assignment: `${assignee_name || 'Someone'} assigned you a task.`,
    review: 'A task has been moved to review.',
    overdue: 'This task is past its due date.',
    invitation: `You've been invited to join ${payload.team_name || 'a team'} on TaskFlow.`,
  }

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${payload.subject}</title>
</head>
<body style="margin:0;padding:0;background:#0f1117;font-family:'DM Sans',system-ui,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f1117;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

          <!-- Logo -->
          <tr>
            <td style="padding-bottom:24px;text-align:center;">
              <div style="display:inline-flex;align-items:center;gap:10px;">
                <div style="background:#7c3aed;width:36px;height:36px;border-radius:10px;display:inline-flex;align-items:center;justify-content:center;font-size:18px;">⚡</div>
                <span style="color:#f1f5f9;font-size:20px;font-weight:700;letter-spacing:-0.5px;">TaskFlow</span>
              </div>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:#161b27;border:1px solid #1e2535;border-radius:16px;overflow:hidden;">

              <!-- Header -->
              <div style="background:linear-gradient(135deg,#1e1b4b,#1a1a2e);padding:28px 32px;border-bottom:1px solid #1e2535;">
                <p style="margin:0 0 4px;color:#a78bfa;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">
                  ${headings[type] || headings.reminder}
                </p>
                <p style="margin:0;color:#94a3b8;font-size:14px;">${subtext[type] || ''}</p>
              </div>

              <!-- Body -->
              <div style="padding:28px 32px;">

                <!-- Task title -->
                <h1 style="margin:0 0 16px;color:#f1f5f9;font-size:22px;font-weight:700;line-height:1.3;">
                  ${type === 'invitation' ? `Join ${payload.team_name}` : (task?.title || 'No Title')}
                </h1>

                <!-- Priority badge -->
                ${task && type !== 'invitation' ? `
                <div style="margin-bottom:16px;">
                  <span style="background:${priorityColor}18;color:${priorityColor};border:1px solid ${priorityColor}33;padding:4px 10px;border-radius:6px;font-size:11px;font-weight:700;">
                    ${priorityLabel}
                  </span>
                </div>` : ''}

                <!-- Description -->
                ${(task?.description || type === 'invitation') ? `
                <p style="margin:0 0 20px;color:#94a3b8;font-size:14px;line-height:1.6;background:#0f1117;border:1px solid #1e2535;border-radius:8px;padding:14px;">
                  ${type === 'invitation' 
                    ? `You have been invited to collaborate with ${payload.team_name}. Click the button below to join the workspace and start managing tasks together.`
                    : (task?.description?.slice(0, 200) + (task?.description && task.description.length > 200 ? '...' : ''))}
                </p>` : ''}

                <!-- Due date -->
                ${task?.due_date ? `
                <div style="margin-bottom:20px;display:flex;align-items:center;gap:8px;">
                  <span style="color:#64748b;font-size:13px;">📅 Due:</span>
                  <span style="color:#f1f5f9;font-size:13px;font-weight:600;">
                    ${new Date(task.due_date).toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}
                  </span>
                </div>` : ''}

                <!-- CTA Button -->
                <div style="text-align:center;margin-top:24px;">
                  <a href="${taskUrl}" style="display:inline-block;background:#7c3aed;color:#fff;text-decoration:none;padding:12px 28px;border-radius:10px;font-weight:600;font-size:15px;">
                    ${type === 'invitation' ? 'Join Team' : 'View Task'} →
                  </a>
                </div>
              </div>

              <!-- Footer -->
              <div style="padding:16px 32px;border-top:1px solid #1e2535;background:#0f1117;">
                <p style="margin:0;color:#475569;font-size:12px;text-align:center;">
                  You're receiving this because you're assigned to this task in TaskFlow.
                </p>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const payload: EmailPayload = await req.json()
    const { to, subject } = payload

    if (!to || !subject) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: to, subject' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Use Supabase Admin client to send email via Supabase's built-in mailer
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const html = buildHtmlEmail(payload)
    const appUrl = Deno.env.get('APP_URL') || 'http://localhost:3000'
    const finalRedirectUrl = payload.type === 'invitation' 
      ? `${appUrl}/dashboard/onboarding?join=${payload.invite_code}`
      : `${appUrl}/dashboard`

    console.log(`[send-email] Attempting to send to ${to} using Invite template trick...`)

    // Repurposing the 'Invite User' template as requested.
    // The user should use {{ .Data.task_title }}, etc. in their Supabase email template.
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(to, {
      data: {
        task_title: payload.task?.title || '',
        task_description: payload.task?.description || '',
        task_priority: payload.task?.priority || '',
        task_due_date: payload.task?.due_date || '',
        team_name: payload.team_name || '',
        invite_code: payload.invite_code || '',
        assignee_name: payload.assignee_name || '',
        notification_type: payload.type,
        email_subject: subject,
      },
      redirectTo: finalRedirectUrl
    })

    if (inviteError) {
      console.warn(`[send-email] inviteUserByEmail yielded error (possibly user already exists/confirmed):`, inviteError.message)
      
      // Fallback: SMTP if available
      const smtpHost = Deno.env.get('SMTP_HOST')
      if (smtpHost) {
        console.log(`[send-email] SMTP_HOST found, but logic is not implemented yet. Please configure SMTP in Dashboard.`)
      }
    } else {
      console.log(`[send-email] Successfully triggered invite email for: ${to}`)
    }

    // Always log for development visibility
    console.log(`[send-email] Final Summary: To=${to}, Subject=${subject}, Type=${payload.type}`)

    return new Response(
      JSON.stringify({ 
        success: !inviteError, 
        to, 
        subject,
        message: inviteError ? `Failed to trigger invite: ${inviteError.message}` : 'Invite triggered'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[send-email] Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
