import type { Plugin } from 'vite'
import { transformParisLayout } from './paris-layout-renderer.ts'

/** Edition-only geometry and material policies not yet covered by public options.
 * Keep the installed renderer intact and reject changed hooks on upgrades.
 */
export function transformParisScale(source: string): string {
  const replace = (before: string, after: string, count = 1) => {
    if (source.split(before).length !== count + 1) throw new Error(`Paris scale renderer hook needs review: ${before}`)
    source = source.replaceAll(before, after)
  }
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

  return transformParisLayout('import { parisOverviewMix } from "/src/editions/paris-scale.ts";\n' + source)
}

export function parisScaleRenderer(): Plugin {
  return {
    name: 'correspondances-scale-renderer',
    enforce: 'pre',
    transform(source, id) {
      const moduleId = id.split('?')[0].replaceAll('\\', '/')
      if (moduleId.endsWith('/@motionstudies/three/NationalNetworkScene.js')) return { code: transformParisScale(source), map: null }
    },
  }
}
