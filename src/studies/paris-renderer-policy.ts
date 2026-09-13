import { FLAT_NETWORK_MAP_STYLE, type NetworkMapStyle } from '@motionstudies/three/scene-style'
import type { NetworkSceneExtensions } from '@motionstudies/three/scene-extensions'
import { pickAirportTarget } from './airport-selection.ts'

export const parisMapStyle: NetworkMapStyle = {
  ...FLAT_NETWORK_MAP_STYLE,
  stationLabels: { rankLimit: () => Infinity },
  airports: { independent: true, fog: false },
}
export const parisSceneExtensions: NetworkSceneExtensions = {
  aircraftPicking: { event: 'click', accepts: event => event.dragDistance <= 5 && !pickAirportTarget(event.scene,
    event.camera, event.canvas.getBoundingClientRect(), event.clientX, event.clientY, event.touch) },
}
