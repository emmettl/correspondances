import { useJsonAsset } from '@motionstudies/web/use-json-asset'
import { useCallback, useState } from 'react'
import type { NetworkSnapshot } from '@motionstudies/core/domain/network'
import { useProgressiveNetworkDay } from '@motionstudies/web/use-progressive-network-day'
import { editionDataUrl } from '../editions/data-url.ts'

const SOURCE_SHA256 = 'c29fa61247444191407dae7c1bcf33315e56785369112642e836cba9d100fe18'


function parseMorning(raw: unknown): NetworkSnapshot {
  const snapshot = raw as NetworkSnapshot
  if (snapshot.metadata?.serviceDate !== '2026-09-04' ||
      snapshot.metadata?.sourceSha256 !== SOURCE_SHA256 ||
      snapshot.metadata?.windowStart !== 25_200 || snapshot.metadata?.windowEnd !== 32_400 ||
      !Array.isArray(snapshot.trains)) throw new Error('Paris rail layer does not match the study')
  return snapshot
}

export function useParisRailLayer(morningFile: string, dayManifestFile: string, window: 'morning' | 'day', time: number) {
  const [requested, setEnabled] = useState(false)
  const { data: morning, error: morningError, retry: retryMorning } = useJsonAsset(
    editionDataUrl(morningFile), requested && window === 'morning', parseMorning,
  )
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

  const toggle = useCallback(() => {
    if (enabled) { setEnabled(false); return }
    if (morningError) retryMorning()
    if (day.error || sourceMismatch) setAttempt((value) => value + 1)
    setEnabled(true)
  }, [enabled, day.error, sourceMismatch, morningError, retryMorning])

  return {
    enabled, toggle, error,
    network: enabled && !error ? (window === 'day' ? day.network : morning) : undefined,
    tripCount: enabled && !error ? (window === 'day' ? day.manifest?.tripCount ?? 0 : morning?.trains.length ?? 0) : 0,
    loading: enabled && !error && (window === 'day' ? day.loading : !morning),
  }
}
