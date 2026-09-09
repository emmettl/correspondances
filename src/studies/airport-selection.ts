import * as THREE from 'three'
import type { StudyAirport } from '@motionstudies/core/domain/airport'

/** Pick the rendered label or a zoom-independent 44px mouse / 56px touch target. */
export function pickAirportTarget(scene: THREE.Scene, camera: THREE.Camera,
  rect: { left: number; top: number; width: number; height: number },
  clientX: number, clientY: number, touch: boolean): StudyAirport | undefined {
  const x = clientX - rect.left, y = clientY - rect.top
  if (rect.width <= 0 || rect.height <= 0 || x < 0 || y < 0 || x > rect.width || y > rect.height) return
  const ray = new THREE.Raycaster()
  ray.setFromCamera(new THREE.Vector2(x / rect.width * 2 - 1, 1 - y / rect.height * 2), camera)
  const point = new THREE.Vector3()
  let label: { airport: StudyAirport; order: number } | undefined
  let marker: StudyAirport | undefined, nearest = touch ? 28 : 22
  scene.traverseVisible(object => {
    const airport = object.userData.parisAirport as StudyAirport | undefined
    if (!airport) return
    if (object instanceof THREE.Sprite) {
      if (!object.material.visible || object.material.opacity < 0.1) return
      if (ray.intersectObject(object, false).length && (!label || object.renderOrder > label.order)) {
        label = { airport, order: object.renderOrder }
      }
      return
    }
    object.getWorldPosition(point).project(camera)
    if (!Number.isFinite(point.x + point.y + point.z) || point.z < -1 || point.z > 1) return
    const distance = Math.hypot((point.x * 0.5 + 0.5) * rect.width - x, (0.5 - point.y * 0.5) * rect.height - y)
    if (distance <= nearest) { nearest = distance; marker = airport }
  })
  return label?.airport ?? marker
}

/** Remember maximum travel, so a drag out and back can never become a click. */
export class MapTapGesture {
  private pointers = new Map<number, { x: number; y: number; moved: boolean }>()
  private multiple = false
  down(id: number, x: number, y: number) {
    this.pointers.set(id, { x, y, moved: false })
    if (this.pointers.size > 1) this.multiple = true
  }
  move(id: number, x: number, y: number) {
    const start = this.pointers.get(id)
    if (start && Math.hypot(x - start.x, y - start.y) > 5) start.moved = true
  }
  up(id: number, x: number, y: number, cancelled = false) {
    this.move(id, x, y)
    const start = this.pointers.get(id)
    const tapped = Boolean(start && !start.moved && !this.multiple && !cancelled)
    this.pointers.delete(id)
    if (!this.pointers.size) this.multiple = false
    return tapped
  }
}
