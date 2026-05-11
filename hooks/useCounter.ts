'use client'

import { useEffect, useRef, useState } from 'react'

export function useCounter(target: number, duration = 1600, delay = 0) {
  const [value, setValue] = useState(0)
  const raf = useRef<number>(0)

  useEffect(() => {
    const timeout = setTimeout(() => {
      const start = performance.now()
      const isFloat = target % 1 !== 0

      const tick = (now: number) => {
        const p = Math.min((now - start) / duration, 1)
        const ease = 1 - Math.pow(1 - p, 4)
        const current = ease * target
        setValue(isFloat ? parseFloat(current.toFixed(1)) : Math.floor(current))
        if (p < 1) raf.current = requestAnimationFrame(tick)
      }

      raf.current = requestAnimationFrame(tick)
    }, delay)

    return () => {
      clearTimeout(timeout)
      cancelAnimationFrame(raf.current)
    }
  }, [target, duration, delay])

  return value
}
