import { NextResponse } from 'next/server'
import { getCurrentUser } from './auth'

export async function guard(handler: (user: any) => Promise<Response>) {
  const user = await getCurrentUser()
  
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  
  return handler(user)
}
