import { useEffect, useLayoutEffect, useMemo } from 'react'
import type {} from '@react-three/fiber'
import { BufferAttribute, BufferGeometry, DoubleSide, Sphere, Vector3 } from 'three'
import type { NetworkSnapshot } from '@motionstudies/core/domain/network'
import { CORRESPONDANCES_ROUTE_COLORS } from '../editions/paris.ts'

type Path = { readonly points: readonly (readonly [number, number, number])[] }

/** A quiet ribbon on the two actual Métro arcs. Each source path remains
 * separate: no invented closing edge between termini or across the west gap. */
export function ParisArcLayer({ snapshot, projectedPaths, mix, subdued }: {
  readonly snapshot: NetworkSnapshot
  readonly projectedPaths: readonly Path[]
  readonly mix: number
  readonly subdued: boolean
}) {
  const arcs = useMemo(() => ['Métro 2', 'Métro 6'].map((name) => {
    const paths = new Set<number>()
    snapshot.trains.filter((train) => train.route === name).forEach((train) => {
      train.pathSegments?.forEach((index) => { if (index != null) paths.add(index) })
    })
    const segments = [...paths].flatMap((index) =>
      (snapshot.paths?.[index] ?? []).slice(1).map((_, point) => [index, point] as const),
    )
    const geometry = new BufferGeometry()
    geometry.setAttribute('position', new BufferAttribute(new Float32Array(segments.length * 18), 3))
    geometry.boundingSphere = new Sphere(new Vector3(), 100)
    return { name, geometry, segments }
  }), [snapshot])
  useLayoutEffect(() => {
    for (const { geometry, segments } of arcs) {
      const position = geometry.getAttribute('position') as BufferAttribute
      segments.forEach(([pathIndex, point], index) => {
        const a = projectedPaths[pathIndex].points[point], b = projectedPaths[pathIndex].points[point + 1]
        const dx = b[0] - a[0], dz = b[2] - a[2]
        const length = Math.hypot(dx, dz) || 1
        const x = -dz / length * 0.045, z = dx / length * 0.045
        position.array.set([
          a[0] + x, 0.07, a[2] + z, a[0] - x, 0.07, a[2] - z, b[0] + x, 0.07, b[2] + z,
          b[0] + x, 0.07, b[2] + z, a[0] - x, 0.07, a[2] - z, b[0] - x, 0.07, b[2] - z,
        ], index * 18)
      })
      position.needsUpdate = true
    }
  }, [arcs, projectedPaths])
  useEffect(() => () => arcs.forEach(({ geometry }) => geometry.dispose()), [arcs])
  return <group name="paris-metro-arcs" visible={mix > 0.001}>
    {arcs.map(({ name, geometry }) => <mesh key={name} geometry={geometry} renderOrder={2}>
      <meshBasicMaterial color={CORRESPONDANCES_ROUTE_COLORS[name]} transparent opacity={mix * (subdued ? 0.12 : 0.58)} side={DoubleSide} forceSinglePass depthWrite={false} toneMapped={false} fog={false} />
    </mesh>)}
  </group>
}
