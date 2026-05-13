import { NextResponse } from 'next/server'
import { readConfig } from '@/lib/config'
import { readCreatorProfile } from '@/lib/creator-profile'
import { requireApiAuth } from '@/lib/auth'

export async function GET(req: Request) {
  const auth = requireApiAuth(req)
  if (auth) return auth
  return NextResponse.json({
    config: readConfig(),
    profile: readCreatorProfile(),
  })
}
