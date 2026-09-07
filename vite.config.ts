import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { parisScaleRenderer } from './scripts/paris-scale-renderer.ts'
export default defineConfig({
  plugins: [parisScaleRenderer(), react()],
  optimizeDeps: {
    exclude: ['@motionstudies/three'],
    include: ['@react-three/fiber', 'three'],
  },
  base: './',
  build: { manifest: true, target: 'es2022' },
})
