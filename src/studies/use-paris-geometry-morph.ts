import { useLayoutEffect, useMemo } from 'react'
import { BufferAttribute, BufferGeometry, Sphere, Vector3 } from 'three'
import type { NetworkProjection } from '@motionstudies/three/NationalNetworkScene'
import { parisHeartFromWorld } from '../editions/paris-layout.ts'

/** Geometry belongs to the shared renderer. Retain its buffers and topology;
 * only position values change. Both end states share a conservative cull sphere. */
export function prepareParisGeometryMorph(resource: unknown, projection: NetworkProjection) {
  const geometries = new Set<BufferGeometry>()
  const visit = (value: unknown) => {
    if (value instanceof BufferGeometry) { geometries.add(value); return }
    if (value && typeof value === 'object') Object.values(value).forEach(visit)
  }
  visit(resource)
  return [...geometries].map((geometry) => {
    const position = geometry.getAttribute('position') as BufferAttribute
    const from = new Float32Array(position.array)
    const to = new Float32Array(from)
    let radius = 0
    for (let i = 0; i < from.length; i += 3) {
      const [x, z] = parisHeartFromWorld(from[i], from[i + 2], projection)
      to[i] = x
      to[i + 2] = z
      radius = Math.max(radius, Math.hypot(from[i], from[i + 1], from[i + 2]), Math.hypot(x, from[i + 1], z))
    }
    geometry.boundingSphere = new Sphere(new Vector3(), radius + 0.1)
    return { position, from, to }
  })
}

export function updateParisGeometryMorph(records: ReturnType<typeof prepareParisGeometryMorph>, mix: number) {
  for (const { position, from, to } of records) {
    for (let i = 0; i < from.length; i++) position.array[i] = from[i] + (to[i] - from[i]) * mix
    position.needsUpdate = true
  }
}

export function useParisGeometryMorph(resource: unknown, projection: NetworkProjection, mix = 0) {
  const records = useMemo(() => prepareParisGeometryMorph(resource, projection), [resource, projection])
  useLayoutEffect(() => updateParisGeometryMorph(records, mix), [records, mix])
}
