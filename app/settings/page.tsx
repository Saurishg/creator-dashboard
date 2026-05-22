export const dynamic = 'force-dynamic'

import { readConfig } from '@/lib/config'
import { readCreatorProfile } from '@/lib/creator-profile'
import SettingsClient from './SettingsClient'

export default function SettingsPage() {
  const config = readConfig()
  const profile = readCreatorProfile()
  return <SettingsClient config={config} profile={profile} />
}
