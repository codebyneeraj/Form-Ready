import type { CheckResult } from '../checks/types'
import { background, blurExposure, detectFace, faceChecks, HEAD_FACTOR, signature } from '../checks'
import { compress } from './compress'
import { decode } from './decode'
import { formatCheck, sniff } from './format'
import { canvas, encodeJpeg, faceCrop, resizeId, resizePhoto, resizeSignature, type Rect } from './resize'
import type { ProcessImage } from './types'

const ANALYSE_PX = 640 // enough for blur/background stats, cheap on low-end phones

type Analysis = { checks: CheckResult[]; crop?: Rect }

async function analyse(bmp: ImageBitmap, spec: Parameters<ProcessImage>[1], kind: Parameters<ProcessImage>[2]): Promise<Analysis> {
  if (kind === 'id') return { checks: [] }
  const k = Math.min(1, ANALYSE_PX / Math.max(bmp.width, bmp.height))
  const w = Math.round(bmp.width * k), h = Math.round(bmp.height * k)
  const ctx = canvas(w, h).getContext('2d') as CanvasRenderingContext2D
  ctx.fillStyle = '#fff' // transparent pixels would read as black
  ctx.fillRect(0, 0, w, h)
  ctx.drawImage(bmp, 0, 0, w, h)
  const img = ctx.getImageData(0, 0, w, h)
  if (kind === 'signature') return { checks: signature(img) }
  const checks = blurExposure(img)
  let box, crop: Rect | undefined
  const rule = spec.photo.face
  if (rule) {
    try {
      const faces = await detectFace(bmp)
      if (faces.length === 1) {
        const b = faces[0].box
        const ar = spec.photo.px ? spec.photo.px[0] / spec.photo.px[1] : bmp.width / bmp.height
        crop = faceCrop(bmp.width, bmp.height, b, ar, HEAD_FACTOR, (rule.minHeightRatio + rule.maxHeightRatio) / 2)
        box = { x: b.x * k, y: b.y * k, width: b.width * k, height: b.height * k }
        // judge the face as it will appear in the submitted crop, not in the raw photo
        checks.push(...faceChecks([{ ...faces[0], box: { ...b, x: b.x - crop.x, y: b.y - crop.y } }], crop.w, crop.h, rule))
      } else checks.push(...faceChecks(faces, bmp.width, bmp.height, rule))
    } catch {
      checks.push({ id: 'face.unavailable', status: 'warn', message: 'Face check could not run on this device.' })
    }
  }
  return { checks: [...checks, ...background(img, box, 'white')], crop }
}

export const processImage: ProcessImage = async (file, spec, kind) => {
  const rule = spec[kind]
  const checks: CheckResult[] = [formatCheck(file.name, new Uint8Array(await file.slice(0, 8).arrayBuffer()))]
  const bmp = await decode(file) // shortcut: PDF/HEIC input throws here, upgrade if the UI must accept them
  const an = await analyse(bmp, spec, kind)
  checks.push(...an.checks)
  if (kind === 'photo' && rule.px) {
    const srcW = an.crop?.w ?? Math.min(bmp.width, (bmp.height * rule.px[0]) / rule.px[1])
    if (srcW < rule.px[0] * 0.9) checks.push({ id: 'size.upscale', status: 'warn', message: 'The photo is smaller than the required size, so it was stretched and may look blurry.', tip: 'Use the original photo from your phone camera, not a small copy or a screenshot.' })
  }
  const cv = kind === 'photo' && rule.px ? resizePhoto(bmp, rule.px, an.crop)
    : kind === 'signature' && rule.px ? resizeSignature(bmp, rule.px)
    : resizeId(bmp)
  bmp.close()

  const [minKB, maxKB] = rule.kb ?? [0, rule.maxKB ?? Infinity]
  const r = await compress((q) => encodeJpeg(cv, q), minKB * 1024, maxKB * 1024)
  const blob = new Blob([r.bytes as BlobPart], { type: 'image/jpeg' })

  const out = await decode(blob) // measure the real output, never the targets
  const measured = { width: out.width, height: out.height, bytes: blob.size, format: sniff(r.bytes) }
  out.close()

  if (rule.px) {
    const ok = measured.width === rule.px[0] && measured.height === rule.px[1]
    checks.push({
      id: 'size.px', status: ok ? 'pass' : 'fail',
      message: ok ? `Size is ${measured.width} x ${measured.height} px.` : `Size is ${measured.width} x ${measured.height} px but ${rule.px[0]} x ${rule.px[1]} is required.`,
      ...(ok ? {} : { tip: 'Try a different photo.' }),
    })
  }
  const kb = blob.size / 1024
  const okKb = !r.tooBig && kb >= minKB && kb <= maxKB
  checks.push({
    id: 'size.kb', status: okKb ? 'pass' : 'fail',
    message: okKb ? `File size is ${kb.toFixed(1)} KB.` : r.tooBig ? `The file is still ${kb.toFixed(0)} KB, over the ${maxKB} KB limit.` : `File size is ${kb.toFixed(1)} KB, outside the allowed range.`,
    ...(okKb ? {} : { tip: kind === 'id' ? 'Retake the photo of the document closer and in even light.' : 'The picture is too detailed. Retake it against a plain background.' }),
  })
  return { blob, measured, checks }
}
