import { readCache, writeCache } from './cache'

export interface AppConfig {
  username: string
  competitors: string[]
  setupAt: string
}

export function readConfig(): AppConfig | null {
  return readCache<AppConfig>('config.json')
}

export function writeConfig(username: string, competitors: string[]): void {
  writeCache<AppConfig>('config.json', {
    username,
    competitors,
    setupAt: new Date().toISOString(),
  })
}
