type Enc = (q: number) => Promise<Uint8Array | Blob>
export type Compressed = { bytes: Uint8Array; q: number; tooBig: boolean }

const toBytes = async (x: Uint8Array | Blob) => (x instanceof Uint8Array ? x : new Uint8Array(await x.arrayBuffer()))

// Insert COM (FF FE) segments right after SOI; each holds at most 65533 payload bytes.
export function padJpeg(jpg: Uint8Array, minBytes: number): Uint8Array {
  let need = minBytes - jpg.length
  if (need <= 0) return jpg
  const segs: Uint8Array[] = []
  while (need > 0) {
    const n = Math.min(need - 4, 65533) // 4 = marker + length bytes
    const s = new Uint8Array(Math.max(n, 0) + 4) // need<4 overshoots by up to 3 bytes
    s.set([0xff, 0xfe, (s.length - 2) >> 8, (s.length - 2) & 255])
    segs.push(s)
    need -= s.length
  }
  const out = new Uint8Array(jpg.length + segs.reduce((a, s) => a + s.length, 0))
  out.set(jpg.subarray(0, 2))
  let o = 2
  for (const s of segs) { out.set(s, o); o += s.length }
  out.set(jpg.subarray(2), o)
  return out
}

export async function compress(encode: Enc, minBytes: number, maxBytes: number): Promise<Compressed> {
  let lo = 0.05, hi = 0.98
  const low = await toBytes(await encode(lo))
  if (low.length > maxBytes) return { bytes: low, q: lo, tooBig: true }
  const top = await toBytes(await encode(hi))
  if (top.length <= maxBytes) return { bytes: padJpeg(top, minBytes), q: hi, tooBig: false } // best quality fits
  let best = low, bestQ = lo // largest result seen that fits
  for (let i = 0; i < 8; i++) {
    const q = (lo + hi) / 2
    const b = await toBytes(await encode(q))
    if (b.length > maxBytes) hi = q
    else {
      if (b.length > best.length) { best = b; bestQ = q }
      if (b.length >= minBytes) break
      lo = q
    }
  }
  return { bytes: padJpeg(best, minBytes), q: bestQ, tooBig: false }
}
