import { useCallback, useEffect, useState } from 'react'
import type { AirSnapshot } from '@motionstudies/core/domain/air'
import type { AirSearchTrack } from '@motionstudies/core/air-search'
import { useProgressiveAirDay } from '@motionstudies/web/use-progressive-air-day'
import { editionDataUrl } from '../editions/data-url.ts'
import type { ParisEdition } from '../editions/paris.ts'

export function useParisAir(edition: ParisEdition, window: 'morning' | 'day', time: number) {
  const [enabled, setEnabledState] = useState(false)
  const [morning, setMorning] = useState<AirSnapshot>()
  const [morningError, setMorningError] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const setEnabled = useCallback((next: boolean) => {
    setEnabledState(next)
    if (next) setMorningError(false)
  }, [])
  const day = useProgressiveAirDay(
    edition.data.air.dayManifest + (attempt ? `?retry=${attempt}` : ''),
    enabled && window === 'day', time, editionDataUrl,
  )

  useEffect(() => {
    if (!enabled || window !== 'morning' || morning) return
    const controller = new AbortController()
    void fetch(editionDataUrl(edition.data.air.morning), { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error('Paris AIR unavailable')
        const snapshot = await response.json() as AirSnapshot
        if (snapshot.metadata.serviceDate !== '2026-09-04' ||
            snapshot.metadata.windowStart !== 25_200 || snapshot.metadata.windowEnd !== 32_400 ||
            !Array.isArray(snapshot.tracks)) throw new Error('Paris AIR does not match the study clock')
        if (!controller.signal.aborted) setMorning(snapshot)
      })
      .catch(() => { if (!controller.signal.aborted) setMorningError(true) })
    return () => controller.abort()
  }, [enabled, window, morning, edition.data.air.morning, attempt])

  const dayMismatch = Boolean(day.manifest && (
    day.manifest.metadata.serviceDate !== '2026-09-04' ||
    day.manifest.metadata.windowStart !== 0 || day.manifest.metadata.windowEnd !== 86_400
  ))
  const error = enabled && (window === 'day' ? day.error || dayMismatch : morningError)
  const snapshot = enabled && !error ? (window === 'day' ? day.snapshot : morning) : undefined
  const aircraft: readonly AirSearchTrack[] = !enabled || error ? [] :
    window === 'day' ? day.manifest?.aircraft ?? [] : morning?.tracks ?? []
  return {
    enabled, setEnabled, snapshot, aircraft, error,
    loading: enabled && !error && (window === 'day' ? day.loading : !morning),
    retry: () => { setMorningError(false); setAttempt((value) => value + 1) },
  }
}
