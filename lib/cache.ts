import fs from 'fs'
import path from 'path'

const DATA_DIR = path.join(process.cwd(), 'data')

function ensureDir(): void {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
}

function safePath(filename: string): string {
  const filepath = path.join(DATA_DIR, filename)
  if (!filepath.startsWith(DATA_DIR + path.sep)) {
    throw new Error(`Invalid cache filename: ${filename}`)
  }
  return filepath
}

export function readCache<T>(filename: string): T | null {
  try {
    const filepath = safePath(filename)
    if (!fs.existsSync(filepath)) return null
    return JSON.parse(fs.readFileSync(filepath, 'utf-8')) as T
  } catch {
    return null
  }
}

export function writeCache<T>(filename: string, data: T): void {
  ensureDir()
  const filepath = safePath(filename)
  const tmp = `${filepath}.${process.pid}.${Date.now()}.tmp`
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf-8')
  fs.renameSync(tmp, filepath)
}
