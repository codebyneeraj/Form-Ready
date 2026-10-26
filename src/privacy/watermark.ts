export function applyWatermark(canvas: HTMLCanvasElement, examName: string, dateStr: string): void {
  const ctx = canvas.getContext('2d')!
  const size = Math.max(14, Math.round(canvas.width / 28))
  const text = `FOR ${examName.toUpperCase()} ONLY · ${dateStr}`
  ctx.save()
  ctx.font = `800 ${size}px sans-serif`
  ctx.fillStyle = 'rgba(209,63,0,.55)'
  ctx.textAlign = 'center'
  ctx.translate(canvas.width / 2, canvas.height / 2)
  ctx.rotate((-18 * Math.PI) / 180)
  const reach = Math.hypot(canvas.width, canvas.height)
  for (let y = -reach / 2; y <= reach / 2; y += size * 4) ctx.fillText(text, 0, y)
  ctx.restore()
}
