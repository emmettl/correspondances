import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { parisScaleRenderer } from './scripts/paris-scale-renderer.ts'
import { parisPerformanceRenderer } from './scripts/paris-performance-renderer.ts'
import { parisCartographyRenderer } from './scripts/paris-cartography-renderer.ts'
export default defineConfig({
  plugins: [parisScaleRenderer(), parisPerformanceRenderer(), parisCartographyRenderer(), react()],
  optimizeDeps: {
    exclude: ['@motionstudies/three'],
    include: ['@react-three/fiber', 'three'],
  },
  base: './',
  build: { manifest: true, target: 'es2022' },
})
