import { createServiceClient } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const supabase = createClient()
    const adminSupabase = createServiceClient()
    const { fullName, email, password } = await req.json()

    let { data: { user } } = await supabase.auth.getUser()
    
    // If no user session, and we have credentials, create the user via admin API
    if (!user && email && password) {
      const { data: newUser, error: createError } = await adminSupabase.auth.admin.createUser({
        email: email.trim(),
        password: password,
        email_confirm: true, // AUTO-CONFIRM email for direct access
        user_metadata: { full_name: fullName }
      })
      
      if (createError) {
        if (createError.message.includes('already been registered')) {
          return NextResponse.json({ error: 'ALREADY_EXISTS' }, { status: 409 })
        }
        throw createError
      }
      user = newUser.user
    }

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Upsert profile using admin client to bypass RLS
    const { data: profile, error: profileError } = await adminSupabase
      .from('profiles')
      .upsert({
        id: user.id,
        full_name: fullName,
        email: user.email || email || `guest_${user.id.slice(0, 8)}@taskflow.local`,
      })
      .select()
      .single()

    if (profileError) throw profileError

    return NextResponse.json({ profile, user })
  } catch (error: any) {
    console.error('Onboarding API Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
