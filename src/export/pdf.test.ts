// @vitest-environment jsdom
import { beforeAll, expect, it, vi } from 'vitest'
import { buildKitPdf } from './pdf'

const JPG =
  '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA='
const jpeg = () => new Blob([Uint8Array.from(atob(JPG), (c) => c.charCodeAt(0))], { type: 'image/jpeg' })

beforeAll(() => {
  vi.stubGlobal('createImageBitmap', async () => ({ width: 100, height: 100 }))
  HTMLCanvasElement.prototype.getContext = (() => ({ drawImage() {} })) as never
  HTMLCanvasElement.prototype.toBlob = function (cb: BlobCallback) {
    cb(jpeg())
  }
})

it('builds a PDF', async () => {
  const out = await buildKitPdf([{ blob: jpeg() }, { blob: jpeg() }], 500)
  expect(await out.slice(0, 4).text()).toBe('%PDF')
})

it('throws when it cannot fit', async () => {
  await expect(buildKitPdf([{ blob: jpeg() }], 0)).rejects.toThrow(/over the 0 KB limit/)
})
