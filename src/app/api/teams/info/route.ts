import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const adminSupabase = createServiceClient()
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')

  if (!code) return NextResponse.json({ error: 'Code required' }, { status: 400 })

  const { data: team, error } = await adminSupabase
    .from('teams')
    .select('id, name, description')
    .eq('invite_code', code.toUpperCase())
    .single()

  if (error || !team) return NextResponse.json({ error: 'Invalid code' }, { status: 404 })

  return NextResponse.json(team)
}
