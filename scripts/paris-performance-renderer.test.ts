import { readFileSync } from 'node:fs'
import { expect, it } from 'vitest'
import { parse } from '@babel/parser'
import { parisScaleRenderer } from './paris-scale-renderer.ts'

it('composes edition adapters with the shared optimized renderer', () => {
  const plugins = [parisScaleRenderer()]
  for (const module of ['NationalNetworkScene', 'HubPulseScene', 'AirTrafficLayer', 'RoadTrafficLayer', 'air-labels', 'train-labels', 'network-paths']) {
    const id = `/node_modules/@motionstudies/three/${module}.js`
    let code = readFileSync(`.${id}`, 'utf8')
    for (const plugin of plugins) {
      const transform = plugin.transform as (source: string, id: string) => { code: string } | undefined
      const result = transform(code, id)
      expect(transform(code, `${id}?v=cache`)).toEqual(result)
      code = result?.code ?? code
    }
    expect(() => parse(code, { sourceType: 'module' })).not.toThrow()
  }
})
