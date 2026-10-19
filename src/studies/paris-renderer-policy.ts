import { MathUtils } from 'three'
import { parisStationLabels, parisStationLabelEligible } from '../editions/paris-station-labels.ts'
import { parisStationLabelHeight, parisTrainLabelBudget, parisTrainLabelHeight } from '../editions/paris-scale.ts'
import { FLAT_NETWORK_MAP_STYLE, type NetworkMapStyle } from '@motionstudies/three/scene-style'
import type { NetworkSceneExtensions } from '@motionstudies/three/scene-extensions'
import { pickAirportTarget } from './airport-selection.ts'

export const parisMapStyle: NetworkMapStyle = {
  ...FLAT_NETWORK_MAP_STYLE,
  stationLabels: {
    rankLimit: () => Infinity,
    orderStations: parisStationLabels,
    semanticHeight: (height, mix) => height * (1 - mix * 0.62),
    eligible: parisStationLabelEligible,
    screenHeight: parisStationLabelHeight,
    viewportPadding: 8,
  },
  trainLabels: { ...FLAT_NETWORK_MAP_STYLE.trainLabels, viewportPadding: 8,
    budget: parisTrainLabelBudget, screenHeight: parisTrainLabelHeight },
  airports: { independent: true, fog: false },
}
export const parisSceneExtensions: NetworkSceneExtensions = {
  cameraViewport: ({ width, height, spatialLayoutMix: mix }) => ({
    zoom: width > 700 ? 1 - (MathUtils.clamp((810 - height) / 510, 0, 0.35)) * (1 - mix) : 1,
    offsetY: -Math.round(height * 0.13 * (1 - mix)),
  }),
  acceptsStationPick: event => !pickAirportTarget(event.scene, event.camera,
    event.canvas.getBoundingClientRect(), event.clientX, event.clientY, event.touch),
  aircraftPicking: { event: 'click', accepts: event => event.dragDistance <= 5 && !pickAirportTarget(event.scene,
    event.camera, event.canvas.getBoundingClientRect(), event.clientX, event.clientY, event.touch) },
}
