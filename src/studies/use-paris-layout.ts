import { useEffect, useRef, useState } from 'react'

export function useParisLayout(heart: boolean) {
  const value = useRef(0)
  const [mix, setMix] = useState(0)
  const [transitioning, setTransitioning] = useState(false)
  useEffect(() => {
    const target = heart ? 1 : 0
    const from = value.current
    const motion = matchMedia('(prefers-reduced-motion: reduce)')
    let frame = 0
    const finish = () => {
      cancelAnimationFrame(frame)
      value.current = target
      setMix(target)
      setTransitioning(false)
    }
    if (motion.matches || from === target) { finish(); return }
    const start = performance.now()
    setTransitioning(true)
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 1600)
      value.current = from + (target - from) * t * t * (3 - 2 * t)
      setMix(value.current)
      if (t < 1) frame = requestAnimationFrame(tick)
      else finish()
    }
    frame = requestAnimationFrame(tick)
    const onMotion = () => { if (motion.matches) finish() }
    motion.addEventListener('change', onMotion)
    return () => { cancelAnimationFrame(frame); motion.removeEventListener('change', onMotion) }
  }, [heart])
  return { mix, transitioning }
}
