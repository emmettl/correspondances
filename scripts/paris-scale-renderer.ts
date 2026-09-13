import type { Plugin } from 'vite'
import { transformParisLayout } from './paris-layout-renderer.ts'
import { transformParisAirportLayer, transformParisAirportScene } from './paris-airport-renderer.ts'

/** Edition-only adapter for alpha.2's missing camera-driven density settings.
 * Keep the installed renderer intact and reject changed hooks on upgrades.
 */
export function transformParisScale(source: string): string {
  const replace = (before: string, after: string, count = 1) => {
    if (source.split(before).length !== count + 1) throw new Error(`Paris scale renderer hook needs review: ${before}`)
    source = source.replaceAll(before, after)
  }
  replace('trainLabelBudget(semanticCameraHeight, trainLabelMode);', 'parisTrainLabelBudget(semanticCameraHeight, size.width, trainLabelMode);')
  replace('trainLabelScreenHeight(size.width, candidate.selected, semanticCameraHeight)', 'parisTrainLabelHeight(size.width, candidate.selected)')
  replace('stationLabelScreenHeight(selected, label.emphasised, label.station.labelRank)', 'parisStationLabelHeight(size.width, selected || label.emphasised, label.station.labelRank, semanticHeight)')
  replace('stationLabelWithinTier(label.station.labelRank, tierLimit)', 'parisStationLabelEligible(label.station, semanticHeight, tierLimit)')
  replace('const ranked = rankStationsForLabels(stations);', 'const ranked = parisStationLabels(rankStationsForLabels(stations));')
  // Admission is by Paris group and zoom, not the first N stations across the
  // whole region. Keep the existing on-screen budgets and collision handling.
  replace('const rankLimit = stationLabelRankLimit(semanticHeight);', 'const rankLimit = Infinity;')
  // Match tap targets to the label policy, retaining original array indexes
  // through flatMap so a tap still resolves to the correct station object.
  replace('const rankedStations = useMemo(() => rankStationsForLabels(stations), [stations]);', 'const rankedStations = useMemo(() => parisStationLabels(rankStationsForLabels(stations)), [stations]);')
  replace('const rankLimit = Math.min(rankedStations.length, stationLabelRankLimit(semanticHeight));', 'const rankLimit = rankedStations.length;')
  replace('.flatMap((station, index) => {\n                projected.copy(stationCentre(station, projectedStops)).project(camera);', '.flatMap((station, index) => {\n                if (!parisStationLabelEligible(station, semanticHeight)) return [];\n                projected.copy(stationCentre(station, projectedStops)).project(camera);')
  replace('const screenHeight = stationLabelScreenHeight(false, false);', 'const screenHeight = parisStationLabelHeight(rect.width, false, station.labelRank, semanticHeight);')
  // Avoid half a long terminus label hanging outside a narrow phone viewport.
  replace('const overlaps = occupied.some((other) => box.left < other.right + 5', 'if (box.left < 8 || box.right > size.width - 8 || box.top < 8 || box.bottom > size.height - 8) continue;\n            const overlaps = occupied.some((other) => box.left < other.right + 5', 2)

  // The administrative outline stays mounted and fades with real camera height.
  replace('function CountryBorder({ boundary, projection, subdued, opacityScale = 1, }) {', `function CountryBorder({ boundary, projection, subdued, opacityScale = 1, }) {
    const borderGroup = useRef(null);
    useFrame(({ camera }) => {
      if (!borderGroup.current) return;
      const mix = parisOverviewMix(camera.position.y) * opacityScale;
      borderGroup.current.visible = mix > 0.001;
      for (const ring of borderGroup.current.children) {
        ring.children[0].material.opacity = (subdued ? 0.018 : 0.12) * mix;
        ring.children[1].material.opacity = (subdued ? 0.13 : 0.84) * mix;
      }
    });`)
  replace('children: tubes.map(({ id, glow, core })', 'ref: borderGroup, children: tubes.map(({ id, glow, core })')

  // Change only material values as the camera moves: no React updates or new geometry.
  replace('const pulseMaterial = useRef(null);', 'const pulseMaterial = useRef(null);\n    const weightedMaterial = useRef(null);')
  replace('useFrame(({ clock }) => {\n        if (!pulseMaterial.current)', 'useFrame(({ clock, camera }) => {\n        const overviewEmphasis = parisOverviewMix(camera.position.y);\n        if (weightedMaterial.current) weightedMaterial.current.opacity = (subdued ? 0.045 : 0.62) * (1 - identityMix * 0.78) * (1 + overviewEmphasis * 1.2);\n        if (!pulseMaterial.current)')
  replace('opacity: (subdued ? 0.045 : 0.62) *', 'ref: weightedMaterial, opacity: (subdued ? 0.045 : 0.62) *')

  // Authored scale journeys settle over about 1.5 s; direct gestures stay immediate.
  replace('const lastCommand = useRef(0);', 'const lastCommand = useRef(0);\n    const scaleJourney = useRef(0);')
  replace('lastCommand.current = cameraCommand.id;', "lastCommand.current = cameraCommand.id;\n        scaleJourney.current = ['focus-location', 'reset'].includes(cameraCommand.action) ? 1.6 : 0;")
  replace('const onPointerDown = (event) => {\n            if (selectedTrain || selectedAirTrack', 'const onPointerDown = (event) => {\n            scaleJourney.current = 0;\n            if (selectedTrain || selectedAirTrack')
  replace('const onWheel = (event) => {', 'const onWheel = (event) => {\n            scaleJourney.current = 0;')
  replace('const damping = 1 -', 'scaleJourney.current = Math.max(0, scaleJourney.current - delta);\n        const damping = 1 -')
  replace('mapCameraDampingRate(Boolean(trainPosition || airPosition), directTouch.current)', '(scaleJourney.current > 0 && !trainPosition && !airPosition ? 3.2 : mapCameraDampingRate(Boolean(trainPosition || airPosition), directTouch.current))')
  return transformParisAirportScene(transformParisLayout('import { parisOverviewMix, parisTrainLabelBudget, parisTrainLabelHeight, parisStationLabelHeight } from "/src/editions/paris-scale.ts";\nimport { parisStationLabels, parisStationLabelEligible } from "/src/editions/paris-station-labels.ts";\n' + source))
}

export function parisScaleRenderer(): Plugin {
  return {
    name: 'correspondances-scale-renderer',
    enforce: 'pre',
    transform(source, id) {
      const moduleId = id.split('?')[0].replaceAll('\\', '/')
      if (moduleId.endsWith('/@motionstudies/three/AirTrafficLayer.js')) return { code: transformParisAirportLayer(source), map: null }
      if (!moduleId.endsWith('/@motionstudies/three/NationalNetworkScene.js')) return
      return { code: transformParisScale(source), map: null }
    },
  }
}
