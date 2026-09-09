import { useEffect, useEffectEvent } from 'react'
import { useThree } from '@react-three/fiber'
import type { StudyAirport } from '@motionstudies/core/domain/airport'
import { MapTapGesture, pickAirportTarget } from './airport-selection.ts'

export interface ParisAirportSelectionProps {
  onSelectAirport?: (airport: StudyAirport) => void
}

export function ParisAirportSelection({ onSelectAirport, enabled = true }: ParisAirportSelectionProps & { enabled?: boolean }) {
  const { scene, camera, gl } = useThree()
  const selectable = enabled && Boolean(onSelectAirport)
  // Keep gestures intact when playback changes the consumer's callback.
  const select = useEffectEvent((airport: StudyAirport) => onSelectAirport?.(airport))
  useEffect(() => {
    if (!selectable) return
    const canvas = gl.domElement, previousCursor = canvas.style.cursor
    const gesture = new MapTapGesture()
    const airportAt = (event: PointerEvent) => pickAirportTarget(scene, camera,
      canvas.getBoundingClientRect(), event.clientX, event.clientY, event.pointerType === 'touch')
    const down = (event: PointerEvent) => {
      if (event.button !== 0) return
      gesture.down(event.pointerId, event.clientX, event.clientY)
      canvas.setPointerCapture(event.pointerId)
    }
    const move = (event: PointerEvent) => {
      gesture.move(event.pointerId, event.clientX, event.clientY)
      canvas.style.cursor = airportAt(event) ? 'pointer' : previousCursor
    }
    const up = (event: PointerEvent) => {
      if (!gesture.up(event.pointerId, event.clientX, event.clientY)) return
      const airport = airportAt(event)
      if (airport) select(airport)
    }
    const cancel = (event: PointerEvent) => { gesture.up(event.pointerId, event.clientX, event.clientY, true) }
    const leave = () => { canvas.style.cursor = previousCursor }
    canvas.addEventListener('pointerdown', down)
    canvas.addEventListener('pointermove', move)
    canvas.addEventListener('pointerup', up)
    canvas.addEventListener('pointercancel', cancel)
    canvas.addEventListener('lostpointercapture', cancel)
    canvas.addEventListener('pointerleave', leave)
    return () => {
      leave()
      canvas.removeEventListener('pointerdown', down)
      canvas.removeEventListener('pointermove', move)
      canvas.removeEventListener('pointerup', up)
      canvas.removeEventListener('pointercancel', cancel)
      canvas.removeEventListener('lostpointercapture', cancel)
      canvas.removeEventListener('pointerleave', leave)
    }
  }, [camera, gl, scene, selectable])
  return null
}
