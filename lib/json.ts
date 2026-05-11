export function parseJsonObject<T>(raw: string, fallback: T): T {
  try {
    const parsed = JSON.parse(stripJsonFence(raw))
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as T : fallback
  } catch {
    return fallback
  }
}

export function parseJsonArray<T>(raw: string): T[] {
  try {
    const parsed = JSON.parse(stripJsonFence(raw))
    return Array.isArray(parsed) ? parsed as T[] : []
  } catch {
    return []
  }
}

function stripJsonFence(raw: string): string {
  return raw
    .replace(/<think>[\s\S]*?<\/think>/gi, '') // strip qwen3/deepseek thinking blocks
    .replace(/^```json\s*/im, '')
    .replace(/^```\s*/im, '')
    .replace(/\s*```$/im, '')
    .trim()
}
