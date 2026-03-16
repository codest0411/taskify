import { createClient, createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const supabase = createClient()
    const { team_id } = await req.json()
    
    // 1. Get user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // 2. Generate unique 6-digit code (use service client to bypass RLS for uniqueness check)
    const adminSupabase = createServiceClient()
    let sessionCode = ''
    let isUnique = false
    while (!isUnique) {
      sessionCode = Math.floor(100000 + Math.random() * 900000).toString()
      const { data } = await adminSupabase
        .from('screenshare_sessions')
        .select('id')
        .eq('session_code', sessionCode)
        .eq('is_active', true)
        .maybeSingle()
      
      if (!data) isUnique = true
    }

    // 3. Insert session (use service client to bypass RLS for insert)
    const { data, error } = await adminSupabase
      .from('screenshare_sessions')
      .insert({
        session_code: sessionCode,
        host_user_id: user.id,
        team_id: team_id,
        is_active: true
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ session_code: sessionCode, session_id: data.id })
  } catch (error: any) {
    console.error('Session creation error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function GET(req: Request) {
  try {
    // Use service client to bypass RLS — the 6-digit code IS the authorization
    const adminSupabase = createServiceClient()
    const { searchParams } = new URL(req.url)
    const code = searchParams.get('code')

    console.log('[GET session] Validating code:', code)

    if (!code) return NextResponse.json({ valid: false }, { status: 400 })

    const { data, error } = await adminSupabase
      .from('screenshare_sessions')
      .select('*')
      .eq('session_code', code)
      .eq('is_active', true)
      .maybeSingle()

    console.log('[GET session] Query result:', { data, error })

    if (error || !data) {
      console.log('[GET session] No valid session found')
      return NextResponse.json({ valid: false })
    }

    return NextResponse.json({ 
      valid: true, 
      host_name: 'Host',
      team_id: data.team_id 
    })
  } catch (error) {
    console.error('[GET session] Error:', error)
    return NextResponse.json({ valid: false }, { status: 500 })
  }
}
