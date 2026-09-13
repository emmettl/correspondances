/** Paris abbreviates airport labels; picking and infrastructure use public APIs. */
export function transformParisAirportScene(source: string): string {
  const hooks = [
    ['const { camera, gl } = useThree();', 'const { camera, gl, scene } = useThree();'],
    ['const rect = element.getBoundingClientRect();\n            const projected = new THREE.Vector3();', 'const rect = element.getBoundingClientRect();\n            if (pickAirportTarget(scene, camera, rect, event.clientX, event.clientY, start.pointerType === "touch")) return;\n            const projected = new THREE.Vector3();'],
    ['[camera, cameraFraming, gl, onSelectStation, projectedStops, rankedStations, spatialLayoutMix]', '[camera, cameraFraming, gl, scene, onSelectStation, projectedStops, rankedStations, spatialLayoutMix]'],
    ['camera.lookAt(currentTarget);', `// Leave the northern airports below the masthead and phone status panel.
        const regionalInset = Math.round(size.height * 0.13 * (1 - diagramMix));
        const regionalZoom = size.width > 700 ? Math.min(1, Math.max(0.65, (size.height - 300) / 510)) : 1;
        const framingZoom = regionalZoom + (1 - regionalZoom) * diagramMix;
        if (camera.zoom !== framingZoom || camera.view?.offsetY !== -regionalInset || camera.view?.fullWidth !== size.width || camera.view?.fullHeight !== size.height) {
            camera.zoom = framingZoom;
            camera.setViewOffset(size.width, size.height, 0, -regionalInset, size.width, size.height);
        }
        camera.lookAt(currentTarget);`],
  ]
  for (const [before, after] of hooks) {
    if (source.split(before).length !== 2) throw new Error(`Paris airport scene hook needs review: ${before}`)
    source = source.replace(before, after)
  }
  return 'import { pickAirportTarget } from "/src/studies/airport-selection.ts";\n' + source
}
