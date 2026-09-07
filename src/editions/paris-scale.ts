/** Paris keeps place names ahead of individual mission labels at city scale. */
export function parisOverviewMix(cameraHeight: number): number {
  const progress = Math.min(1, Math.max(0, (cameraHeight - 10) / 22))
  return progress * progress * (3 - 2 * progress)
}

export function parisTrainLabelBudget(height: number, width: number, mode: string): number {
  if (mode === 'off' || height >= 5) return 0
  return width <= 600 ? 3 : 8
}

export function parisTrainLabelHeight(width: number, selected: boolean): number {
  return selected ? 34 : width <= 600 ? 26 : 30
}

export function parisStationLabelHeight(width: number, selected: boolean, rank?: number, cameraHeight = Infinity): number {
  if (!selected && (rank ?? 3) >= 3 && cameraHeight < 15) return width <= 600 ? 24 : 26
  if (width > 600) return selected ? 44 : rank === 1 ? 38 : 32
  return selected ? 36 : rank === 1 ? 32 : 28
}
