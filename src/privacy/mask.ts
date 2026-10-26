export type Box = { x: number; y: number; w: number; h: number }

export function applyMask(canvas: HTMLCanvasElement, boxes: Box[]): void {
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#000'
  for (const b of boxes) ctx.fillRect(b.x, b.y, b.w, b.h)
}

// Drag corners in any direction -> normalized box.
export const manualBox = (a: { x: number; y: number }, b: { x: number; y: number }): Box => ({
  x: Math.min(a.x, b.x),
  y: Math.min(a.y, b.y),
  w: Math.abs(a.x - b.x),
  h: Math.abs(a.y - b.y),
})
