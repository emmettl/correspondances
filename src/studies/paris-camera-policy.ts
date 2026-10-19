import type { Vector3 } from 'three'
import { stationCentre } from '@motionstudies/three/map-camera'
import type { NetworkCameraContext, NetworkCameraDriver, ProjectedPoint } from '@motionstudies/three/scene-extensions'
import { parisHeartCoordinate } from '../editions/paris-layout.ts'

/** Authored focus follows the current morph until any direct gesture releases it. */
export function createParisCameraDriver(_context: NetworkCameraContext,
  motion: { readonly matches: boolean } = window.matchMedia('(prefers-reduced-motion: reduce)')): NetworkCameraDriver {
  let remaining = 0
  let focus: ((target: Vector3, stops: readonly ProjectedPoint[], mix: number) => void) | undefined
  const release = () => { focus = undefined; remaining = 0 }
  return {
    update: () => false,
    dispose: release,
    onGesture: release,
    onCommand({ action, focus: coordinate }, station, { x, z }) {
      remaining = action === 'focus-location' || action === 'reset' ? 1.6 : 0
      if (action === 'focus-location' && coordinate) {
        const [heartX, heartY] = parisHeartCoordinate(coordinate)
        focus = (target, _stops, mix) => { target.set(x + (heartX - x) * mix, 0, z + (-heartY - z) * mix) }
      } else focus = action === 'reveal-station' && station ? (target, stops) => { stationCentre(station, stops, target) } : undefined
    },
    prepareFrame(target, stops, mix, delta, following) {
      focus?.(target, stops, mix)
      remaining -= delta
      if (motion.matches) return 1
      if (remaining > 0 && !following) return 1 - Math.exp(-delta * 3.2)
    },
  }
}
