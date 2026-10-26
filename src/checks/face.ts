import type { FaceDetector } from '@mediapipe/tasks-vision'
import type { CheckResult } from './types'
import type { FaceRule } from '../specs/schema'
import type { Box } from './background'

// Starting points; tune on fixtures.
const CENTRE_TOL = 0.1 // of image width
const MIN_SCORE = 0.6
const EDGE_MARGIN = 0.01 // of image height

// BlazeFace boxes brow-to-chin; portals measure the whole head, hair included. Measured: 0.355 box ratio on a standard passport photo.
export const HEAD_FACTOR = 1.5

export type Face = { box: Box; score: number }

let detector: Promise<FaceDetector> | undefined

export function detectFace(bitmap: ImageBitmap | HTMLCanvasElement | HTMLImageElement): Promise<Face[]> {
  detector ??= import('@mediapipe/tasks-vision').then(async ({ FaceDetector, FilesetResolver }) =>
    FaceDetector.createFromOptions(await FilesetResolver.forVisionTasks('/wasm'), {
      baseOptions: { modelAssetPath: '/models/face_detector.tflite' },
      runningMode: 'IMAGE',
      minDetectionConfidence: 0.3, // low so faceChecks can report "unclear" itself
    }),
  )
  return detector.then((d) =>
    d.detect(bitmap).detections.flatMap((x) => {
      const b = x.boundingBox
      return b ? [{ box: { x: b.originX, y: b.originY, width: b.width, height: b.height }, score: x.categories[0]?.score ?? 0 }] : []
    }),
  )
}

export function faceChecks(faces: Face[], imgW: number, imgH: number, rule: FaceRule): CheckResult[] {
  if (faces.length === 0)
    return [{ id: 'face.count', status: 'fail', message: 'No face found.', tip: 'face the camera in good light.' }]
  if (faces.length > 1)
    return [{ id: 'face.count', status: 'fail', message: 'More than one face found.', tip: 'make sure only you are in the photo.' }]
  const { box, score } = faces[0]
  const ratio = (box.height * HEAD_FACTOR) / imgH
  const offset = Math.abs(box.x + box.width / 2 - imgW / 2) / imgW
  const cut = box.y < EDGE_MARGIN * imgH || box.y + box.height > (1 - EDGE_MARGIN) * imgH
  return [
    { id: 'face.count', status: 'pass', message: 'One face found.' },
    ratio < rule.minHeightRatio
      ? { id: 'face.size', status: 'fail', message: 'Face is too small in the frame.', tip: 'move closer or crop tighter.' }
      : ratio > rule.maxHeightRatio
        ? { id: 'face.size', status: 'fail', message: 'Face is too large in the frame.', tip: 'step back or leave more space around the head.' }
        : { id: 'face.size', status: 'pass', message: 'Face size is right.' },
    cut
      ? { id: 'face.centre', status: 'fail', message: 'Head is cut off at the top or bottom.', tip: 'leave a little space above the head and include the shoulders.' }
      : offset > CENTRE_TOL
        ? { id: 'face.centre', status: 'warn', message: 'Face is off-centre and may be rejected.', tip: 'centre your face in the frame.' }
        : { id: 'face.centre', status: 'pass', message: 'Face is centred.' },
    score < MIN_SCORE
      ? { id: 'face.confidence', status: 'warn', message: 'Face is unclear and may be rejected.', tip: 'retake with better light.' }
      : { id: 'face.confidence', status: 'pass', message: 'Face is clear.' },
  ]
}
