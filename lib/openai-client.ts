import OpenAI from 'openai'

const OLLAMA_BASE_URL = process.env.OLLAMA_URL ?? 'http://localhost:11434/v1'
export const LOCAL_MODEL = process.env.LOCAL_AI_MODEL ?? 'qwen3:14b'
export const WHISPER_MODEL = process.env.WHISPER_MODEL ?? 'base'

// Keep CHAT_MODEL alias
export const CHAT_MODEL = LOCAL_MODEL

let _client: OpenAI | null = null

export function getOpenAI(): OpenAI {
  if (!_client) {
    _client = new OpenAI({ baseURL: OLLAMA_BASE_URL, apiKey: 'ollama' })
  }
  return _client
}
