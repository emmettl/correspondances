import { useCallback, useEffect, useState } from 'react'
import type { NetworkSnapshot } from '@motionstudies/core/domain/network'
import { useProgressiveNetworkDay } from '@motionstudies/web/use-progressive-network-day'
import { editionDataUrl } from '../editions/data-url.ts'

const SOURCE_SHA256 = 'c29fa61247444191407dae7c1bcf33315e56785369112642e836cba9d100fe18'

export function useParisMetroLayer(morningFile: string, dayManifestFile: string, window: 'morning' | 'day', time: number) {
  const [requested, setEnabled] = useState(false)
  const [morning, setMorning] = useState<NetworkSnapshot>()
  const [morningError, setMorningError] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const day = useProgressiveNetworkDay(
    dayManifestFile + (attempt ? `?retry=${attempt}` : ''),
    requested && window === 'day', time, editionDataUrl,
  )
  const sourceMismatch = Boolean(day.manifest && (
    day.manifest.metadata?.serviceDate !== '2026-09-04' ||
    day.manifest.metadata?.sourceSha256 !== SOURCE_SHA256 ||
    day.manifest.metadata?.windowStart !== 0 || day.manifest.metadata?.windowEnd !== 86_400
  ))
  const error = window === 'day' ? day.error || sourceMismatch : morningError
  const enabled = requested && !error

  useEffect(() => {
    if (!enabled || window !== 'morning' || morning) return
    const controller = new AbortController()
    void fetch(editionDataUrl(morningFile), { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error('Paris Métro layer unavailable')
        const snapshot = await response.json() as NetworkSnapshot
        if (snapshot.metadata?.serviceDate !== '2026-09-04' ||
            snapshot.metadata?.sourceSha256 !== SOURCE_SHA256 ||
            snapshot.metadata?.windowStart !== 25_200 || snapshot.metadata?.windowEnd !== 32_400 ||
            !Array.isArray(snapshot.trains)) throw new Error('Paris Métro layer do not match the study')
        if (!controller.signal.aborted) setMorning(snapshot)
      })
      .catch(() => {
        if (!controller.signal.aborted) { setMorningError(true); setEnabled(false) }
      })
    return () => controller.abort()
  }, [enabled, window, morning, morningFile, attempt])

  const toggle = useCallback(() => {
    if (enabled) { setEnabled(false); return }
    setMorningError(false)
    if (day.error || sourceMismatch) setAttempt((value) => value + 1)
    setEnabled(true)
  }, [enabled, day.error, sourceMismatch])

  return {
    enabled, toggle, error,
    network: enabled && !error ? (window === 'day' ? day.network : morning) : undefined,
    tripCount: enabled && !error ? (window === 'day' ? day.manifest?.tripCount ?? 0 : morning?.trains.length ?? 0) : 0,
    loading: enabled && !error && (window === 'day' ? day.loading : !morning),
  }
}
