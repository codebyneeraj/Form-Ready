import { jsPDF } from 'jspdf'

const toJpeg = (src: Blob, q: number) =>
  createImageBitmap(src).then(
    (bmp) =>
      new Promise<Blob>((res, rej) => {
        const c = document.createElement('canvas')
        c.width = bmp.width
        c.height = bmp.height
        c.getContext('2d')!.drawImage(bmp, 0, 0)
        c.toBlob((b) => (b ? res(b) : rej(new Error('Could not re-encode image'))), 'image/jpeg', q)
      }),
  )

async function build(imgs: Blob[]): Promise<Blob> {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' })
  const m = 10
  const maxW = 210 - 2 * m
  const maxH = 297 - 2 * m
  for (let i = 0; i < imgs.length; i++) {
    const bmp = await createImageBitmap(imgs[i])
    const s = Math.min(maxW / bmp.width, maxH / bmp.height)
    const data = new Uint8Array(await imgs[i].arrayBuffer())
    if (i) pdf.addPage()
    pdf.addImage(data, 'JPEG', m, m, bmp.width * s, bmp.height * s)
  }
  return pdf.output('blob')
}

// Inputs are expected to be JPEG blobs (what the pipeline produces).
export async function buildKitPdf(images: { blob: Blob }[], maxKB: number): Promise<Blob> {
  let blobs = images.map((i) => i.blob)
  let out = await build(blobs)
  for (const q of [0.7, 0.5, 0.35, 0.2]) {
    if (out.size <= maxKB * 1024) return out
    blobs = await Promise.all(images.map((i) => toJpeg(i.blob, q)))
    out = await build(blobs)
  }
  if (out.size > maxKB * 1024) {
    throw new Error(`PDF is ${Math.ceil(out.size / 1024)} KB, over the ${maxKB} KB limit even at lowest quality`)
  }
  return out
}
