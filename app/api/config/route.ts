import { NextResponse } from 'next/server'
import { readConfig } from '@/lib/config'
import { readCreatorProfile } from '@/lib/creator-profile'

export async function GET() {
  return NextResponse.json({
    config: readConfig(),
    profile: readCreatorProfile(),
  })
}
