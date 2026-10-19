import type { NetworkProjection } from '@motionstudies/three/NationalNetworkScene'

// An authored focus, not a fare-zone centre or a distance/travel-time scale.
export const PARIS_HEART = [2.347, 48.861] as const
const LONGITUDE_KM = 111.195 * Math.cos(PARIS_HEART[1] * Math.PI / 180)
const LATITUDE_KM = 111.195

/** Strictly increasing radial lens: opens the inner city without folding or
 * truncating outer branches. Fixed parameters keep every layer in one space. */
export function parisHeartCoordinate([longitude, latitude]: readonly [number, number, ...unknown[]]): readonly [number, number] {
  const x = (longitude - PARIS_HEART[0]) * LONGITUDE_KM
  const y = (latitude - PARIS_HEART[1]) * LATITUDE_KM
  const radius = Math.hypot(x, y)
  const scale = 23 / (6 + radius)
  return [x * scale, y * scale]
}

export function parisHeartFromWorld(x: number, z: number, projection: NetworkProjection): readonly [number, number] {
  const [heartX, heartY] = parisHeartCoordinate([
    x / (projection.longitudeScale * projection.scale) + projection.centreLongitude,
    -z / projection.scale + projection.centreLatitude,
  ])
  return [heartX, -heartY]
}
