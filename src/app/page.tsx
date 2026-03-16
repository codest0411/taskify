import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function HomePage({ searchParams }: { searchParams: { [key: string]: string | string[] | undefined } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  const queryString = new URLSearchParams(searchParams as any).toString()
  const redirectPath = user ? '/dashboard' : '/dashboard/onboarding'
  const finalPath = queryString ? `${redirectPath}?${queryString}` : redirectPath

  redirect(finalPath)
}
