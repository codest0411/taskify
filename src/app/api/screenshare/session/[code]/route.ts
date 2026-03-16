import { createClient, createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function DELETE(req: Request, { params }: { params: { code: string } }) {
  try {
    const supabase = createClient()
    const code = params.code

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Use service client to bypass RLS
    const adminSupabase = createServiceClient()
    const { error } = await adminSupabase
      .from('screenshare_sessions')
      .update({ is_active: false })
      .eq('session_code', code)
      .eq('host_user_id', user.id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
