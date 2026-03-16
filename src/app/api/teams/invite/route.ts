import { NextRequest, NextResponse } from 'next/server'
import { sendEmailNotification } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const { to, team_name, invite_code } = await request.json()

    if (!to || !team_name || !invite_code) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const { success, error } = await sendEmailNotification({
      to: to.trim(),
      subject: `Join ${team_name} on TaskFlow`,
      type: 'invitation',
      team_name,
      invite_code
    })

    if (!success) {
      console.error('Invite Error:', error)
      return NextResponse.json({ error: error?.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('API Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
