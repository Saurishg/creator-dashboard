import { readConfig } from './config'

export interface CreatorProfile {
  username: string
  displayName: string
  brandName: string
  contentNiche: string
  languageStyle: string
  audience: string
  calendarFocus: string
}

function env(name: string, fallback = ''): string {
  return process.env[name]?.trim() || fallback
}

export function readCreatorProfile(): CreatorProfile {
  const config = readConfig()
  const username = config?.username || env('OWN_INSTAGRAM_USERNAME', 'yourusername')

  return {
    username,
    displayName: env('CREATOR_DISPLAY_NAME', username),
    brandName: env('CREATOR_BRAND_NAME', 'CreatorOS'),
    contentNiche: env('CREATOR_CONTENT_NICHE', 'short-form educational content'),
    languageStyle: env('CREATOR_LANGUAGE_STYLE', 'clear, actionable, audience-native language'),
    audience: env('CREATOR_AUDIENCE', 'people who want practical creator advice they can use immediately'),
    calendarFocus: env('CREATOR_CALENDAR_FOCUS', env('CREATOR_CONTENT_NICHE', 'practical content ideas')),
  }
}

export function creatorHandle(profile = readCreatorProfile()): string {
  return `@${profile.username.replace(/^@/, '')}`
}
