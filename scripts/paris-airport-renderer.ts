/** Alpha.4 nests airport landmarks inside the optional aircraft layer. Expose
 * its existing marker locally so geography can show it without fetching AIR. */
export function transformParisAirportLayer(source: string): string {
  const hooks = [
    ['function AirportMarker({', 'export function AirportMarker({'],
    ['visibleAirports.map((airport) =>', 'false && visibleAirports.map((airport) =>'],
    ['const name = (airport.mapLabel ?? airport.city).toUpperCase();', 'const name = airport.mapLabel === code ? "" : (airport.mapLabel ?? airport.city).toUpperCase();'],
    ['const gap = 17;', 'const gap = name ? 17 : 0;'],
    ['map: labelTexture.texture, transparent: true, opacity: selected ? 1 : 0.92', 'map: labelTexture.texture, fog: false, transparent: true, opacity: selected ? 1 : 0.92'],
  ]
  for (const [before, after] of hooks) {
    if (source.split(before).length !== 2) throw new Error(`Paris airport renderer hook needs review: ${before}`)
    source = source.replace(before, after)
  }
  return source
}

export function transformParisAirportScene(source: string): string {
  const hooks = [
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
    ['props.airSnapshot && (_jsx(AirTrafficLayer,', `_jsx("group", { name: "paris-airport-landmarks", visible: (props.spatialLayoutMix ?? 0) === 0, children: props.airports?.map((airport) => _jsx(AirportMarker, { airport, projection, showLabel: props.trainLabelMode !== "off", selected: airport.id === props.selectedAirport?.id }, airport.id)) }), props.airSnapshot && (_jsx(AirTrafficLayer,`],
  ]
  for (const [before, after] of hooks) {
    if (source.split(before).length !== 2) throw new Error(`Paris airport scene hook needs review: ${before}`)
    source = source.replace(before, after)
  }
  return source
}
