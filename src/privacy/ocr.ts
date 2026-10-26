import type { Box } from './mask'

type Word = { text: string; bbox: { x0: number; y0: number; x1: number; y1: number } }

// Finds runs of digit words totalling exactly 12 digits; returns boxes over the first 8.
// shortcut: ignores line breaks between words of a group, upgrade if false positives appear.
export function maskBoxes(words: Word[]): Box[] {
  const ws = words.map((w) => ({ ...w, d: w.text.replace(/\D/g, ''), ok: /^\d+$/.test(w.text.trim()) }))
  const out: Box[] = []
  for (let i = 0; i < ws.length; i++) {
    let n = 0
    let j = i
    while (j < ws.length && ws[j].ok && n < 12) n += ws[j++].d.length
    if (n !== 12) continue
    let left = 8
    for (const w of ws.slice(i, j)) {
      if (left <= 0) break
      const take = Math.min(left, w.d.length)
      const { x0, y0, x1, y1 } = w.bbox
      out.push({ x: x0, y: y0, w: ((x1 - x0) * take) / w.d.length, h: y1 - y0 })
      left -= take
    }
    i = j - 1
  }
  return out
}

export async function findIdDigits(canvas: HTMLCanvasElement): Promise<Box[]> {
  const { createWorker } = await import('tesseract.js')
  const worker = await createWorker('eng', 1, {
    workerPath: '/wasm/tesseract/worker.min.js',
    corePath: '/wasm/tesseract',
    langPath: '/tessdata',
    gzip: false,
  })
  try {
    const { data } = await worker.recognize(canvas, {}, { blocks: true })
    const words = (data.blocks ?? []).flatMap((b) =>
      b.paragraphs.flatMap((p) => p.lines.flatMap((l) => l.words)),
    )
    return maskBoxes(words)
  } finally {
    await worker.terminate()
  }
}
