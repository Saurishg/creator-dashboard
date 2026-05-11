'use client'

import { useEffect, useState } from 'react'

interface FetchState<T> {
  data: T | null
  loading: boolean
  error: string | null
}

export function useFetch<T>(url: string): FetchState<T> {
  const [state, setState] = useState<FetchState<T>>({ data: null, loading: true, error: null })

  useEffect(() => {
    let cancelled = false
    setState({ data: null, loading: true, error: null })

    fetch(url)
      .then(async (res) => {
        const json = await res.json()
        if (!cancelled) {
          if (!res.ok) setState({ data: null, loading: false, error: json.error ?? 'Unknown error' })
          else setState({ data: json, loading: false, error: null })
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setState({ data: null, loading: false, error: err instanceof Error ? err.message : String(err) })
        }
      })

    return () => { cancelled = true }
  }, [url])

  return state
}
