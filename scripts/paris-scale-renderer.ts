import type { Plugin } from 'vite'
import { transformParisLayout } from './paris-layout-renderer.ts'

/** Edition-only geometry policies not yet covered by public options.
 * Keep the installed renderer intact and reject changed hooks on upgrades.
 */
export function transformParisScale(source: string): string {
  return transformParisLayout(source)
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
