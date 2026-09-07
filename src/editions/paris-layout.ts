import type { NetworkSnapshot } from '@motionstudies/core/domain/network'
import type { SpatialLayoutSnapshot } from '@motionstudies/core/domain/spatial-layout'
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

export function buildParisHeartLayout(network: NetworkSnapshot): SpatialLayoutSnapshot {
  return {
    metadata: {
      id: 'paris-heart', label: 'Cœur', kind: 'topological', coordinateSpace: 'normalized',
      sourceNetwork: 'Correspondances · réseau composé',
      sourceSha256: network.metadata.sourceSha256 ?? '',
      feedVersion: network.metadata.feedVersion,
      model: 'paris-radial-lens-v1',
      note: 'Plan à échelle variable autour de Châtelet. Tracés source et ordre des stations conservés ; ni zones tarifaires ni temps de parcours.',
    },
    // The shared layout projection maps a width of 51 to 51 world units.
    bounds: { minX: -25.5, maxX: 25.5, minY: -25.5, maxY: 25.5 },
    stops: network.stops.map((stop) => {
      if (!stop[4]) throw new Error('The Paris heart requires source station identifiers')
      return [stop[4], ...parisHeartCoordinate(stop)]
    }),
    paths: (network.paths ?? []).map((path) => path.map(parisHeartCoordinate)),
  }
}

type Point = readonly [number, number, number]
interface Path {
  readonly points: readonly Point[]
  readonly cumulativeDistances: readonly number[]
  readonly length: number
}
interface Layout { readonly stops: readonly Point[]; readonly paths: readonly Path[] }

/** This lens retains source vertices. Blend corresponding vertices rather than
 * the shared diagram's 32 arc-length samples, keeping moving trains on the same
 * geometry as the persistent rail buffers throughout the transition. */
export function blendParisLayout(stops: readonly Point[], paths: readonly Path[], alternate: Layout | undefined, mix: number): Layout {
  if (!alternate || mix <= 0) return { stops, paths }
  if (mix >= 1) return alternate
  const point = (from: Point, to: Point): Point => [
    from[0] + (to[0] - from[0]) * mix,
    from[1] + (to[1] - from[1]) * mix,
    from[2] + (to[2] - from[2]) * mix,
  ]
  return {
    stops: stops.map((from, i) => point(from, alternate.stops[i])),
    paths: paths.map((from, i) => {
      const points = from.points.map((p, j) => point(p, alternate.paths[i].points[j]))
      const cumulativeDistances = [0]
      let length = 0
      for (let j = 1; j < points.length; j++) {
        const a = points[j - 1], b = points[j]
        length += Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2])
        cumulativeDistances.push(length)
      }
      return { points, cumulativeDistances, length }
    }),
  }
}
