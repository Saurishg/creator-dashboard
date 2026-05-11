export const dynamic = 'force-dynamic'

import { readCache } from '@/lib/cache'
import type { GeneratedCalendar } from '@/app/api/generate-calendar/route'
import CalendarClient from './CalendarClient'

export default function CalendarPage() {
  const calendar = readCache<GeneratedCalendar>('calendar.json')
  return <CalendarClient calendar={calendar ?? null} />
}
