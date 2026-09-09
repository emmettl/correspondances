/** Alpha.4 nests airport landmarks inside the optional aircraft layer. Expose
 * its existing marker locally so geography can show it without fetching AIR. */
export function transformParisAirportLayer(source: string): string {
  const hooks = [
    ['function AirportMarker({', 'export function AirportMarker({'],
    ['visibleAirports.map((airport) =>', 'false && visibleAirports.map((airport) =>'],
    ['const name = (airport.mapLabel ?? airport.city).toUpperCase();', 'const name = airport.mapLabel === code ? "" : (airport.mapLabel ?? airport.city).toUpperCase();'],
    ['const gap = 17;', 'const gap = name ? 17 : 0;'],
    ['ref: marker, position: position, renderOrder: 19,', 'ref: marker, position: position, renderOrder: 19, userData: { parisAirport: airport },'],
    ['ref: label, renderOrder: 20,', 'ref: label, renderOrder: 20, userData: { parisAirport: airport },'],
    ['const aircraftRef = useRef(currentAircraft(snapshot, time, projection));', 'const { scene, camera, gl } = useThree();\n    const aircraftRef = useRef(currentAircraft(snapshot, time, projection));'],
    ['onPointerDown: (event) => {\n                    if (event.instanceId === undefined)', 'onClick: (event) => {\n                    if (event.delta > 5 || pickAirportTarget(scene, camera, gl.domElement.getBoundingClientRect(), event.clientX, event.clientY, event.pointerType === "touch")) return;\n                    if (event.instanceId === undefined)'],
    ['map: labelTexture.texture, transparent: true, opacity: selected ? 1 : 0.92', 'map: labelTexture.texture, fog: false, transparent: true, opacity: selected ? 1 : 0.92'],
  ]
  for (const [before, after] of hooks) {
    if (source.split(before).length !== 2) throw new Error(`Paris airport renderer hook needs review: ${before}`)
    source = source.replace(before, after)
  }
  return 'import { pickAirportTarget } from "/src/studies/airport-selection.ts";\n' + source
}

export function transformParisAirportScene(source: string): string {
  const hooks = [
    ['const { camera, gl } = useThree();', 'const { camera, gl, scene } = useThree();'],
    ['const rect = element.getBoundingClientRect();\n            const projected = new THREE.Vector3();', 'const rect = element.getBoundingClientRect();\n            if (pickAirportTarget(scene, camera, rect, event.clientX, event.clientY, start.pointerType === "touch")) return;\n            const projected = new THREE.Vector3();'],
    ['[camera, cameraFraming, gl, onSelectStation, projectedStops, rankedStations, spatialLayoutMix]', '[camera, cameraFraming, gl, scene, onSelectStation, projectedStops, rankedStations, spatialLayoutMix]'],
    ["import { AirTrafficLayer } from './AirTrafficLayer.js';", "import { AirTrafficLayer, AirportMarker } from './AirTrafficLayer.js';"],
    ['camera.lookAt(currentTarget);', `// Leave the northern airports below the masthead and phone status panel.
        const regionalInset = Math.round(size.height * 0.13 * (1 - diagramMix));
        const regionalZoom = size.width > 700 ? Math.min(1, Math.max(0.65, (size.height - 300) / 510)) : 1;
        const framingZoom = regionalZoom + (1 - regionalZoom) * diagramMix;
        if (camera.zoom !== framingZoom || camera.view?.offsetY !== -regionalInset || camera.view?.fullWidth !== size.width || camera.view?.fullHeight !== size.height) {
            camera.zoom = framingZoom;
            camera.setViewOffset(size.width, size.height, 0, -regionalInset, size.width, size.height);
        }
        camera.lookAt(currentTarget);`],
    ['props.airSnapshot && (_jsx(AirTrafficLayer,', `_jsx(ParisAirportSelection, { onSelectAirport: props.onSelectAirport, enabled: (props.spatialLayoutMix ?? 0) === 0 }), _jsx("group", { name: "paris-airport-landmarks", visible: (props.spatialLayoutMix ?? 0) === 0, children: props.airports?.map((airport) => _jsx(AirportMarker, { airport, projection, showLabel: props.trainLabelMode !== "off", selected: airport.id === props.selectedAirport?.id }, airport.id)) }), props.airSnapshot && (_jsx(AirTrafficLayer,`],
  ]
  for (const [before, after] of hooks) {
    if (source.split(before).length !== 2) throw new Error(`Paris airport scene hook needs review: ${before}`)
    source = source.replace(before, after)
  }
  return 'import { ParisAirportSelection } from "/src/studies/ParisAirportSelection.tsx";\nimport { pickAirportTarget } from "/src/studies/airport-selection.ts";\n' + source
}
