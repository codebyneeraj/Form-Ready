# FormReady: Build Plan

An offline-first web app that turns a raw photo, signature and ID into an upload-ready kit for a specific exam portal, and warns the applicant about likely rejection reasons **before** they upload. Everything runs in the browser. Nothing is uploaded.

**Event:** Build With Bharat 5.0 (CodeVerse). PPT due **1 Nov 2026, 11:59 PM IST** on Unstop. Finale **6 Nov 2026**, about 9 hours of build time.
**Team:** 4 full-stack developers (Dev A, B, C, D below).

> Rule of thumb for every decision in this plan: **if it will not be reliable in a live demo, cut it.**

---

## 1. Goals, non-goals, guardrails

### Goals (MVP, must work on demo day)
1. Pick an exam; the app loads that exam's **spec pack** (rules as data).
2. Upload a raw photo, signature and ID; get each file converted to the exact pixels, KB range and format.
3. **Rejection predictor:** a checklist of pass/fail results with a plain-language fix tip for each failure.
4. **Privacy mode:** mask the first 8 digits of a 12-digit ID number and add a "for <exam> only" watermark.
5. Merge documents into one PDF kit and download everything.
6. Works fully offline (airplane-mode demo).

### Stretch (only if MVP is done and tested)
- Hindi UI strings.
- 6+ portals instead of 3.
- Shareable "kit report" image summarising the checks.
- Camera capture with live guidance overlay (face frame, brightness warning).

### Non-goals (do not build)
- Any backend, login, database or analytics.
- Automatic background removal (the popular library, `@imgly/background-removal`, is AGPL; also unreliable). We only **detect** a bad background and tell the user to retake.
- Generating or beautifying faces or signatures. We never alter a face. We only resize, compress, crop, and adjust brightness/contrast on signatures.
- Bypassing live-capture requirements. Some portals (e.g. UPSC, SSC OTR) require a live photo; FormReady is a **preflight check**, not a workaround. Say this in the pitch.

### Wording guardrails
- Say "**predicts** rejection risk", never "guarantees acceptance".
- Pitch ID masking as **privacy hygiene**, not a legal requirement (the UIDAI masked-Aadhaar advisory was issued and then withdrawn in 2022).
- Never invent portal rules. Every number in a spec pack comes from an official notification with a link and date.

---

## 2. Architecture

```
┌────────────────────────── Browser (the user's phone) ──────────────────────────┐
│  React + Vite UI (PWA)                                                         │
│    ├─ Spec packs (JSON, bundled + cached)                                      │
│    ├─ Pipeline (Web Worker):                                                   │
│    │     decode → orient → analyse → crop/resize → compress → verify           │
│    ├─ Checks:  Canvas pixel analysis · MediaPipe face detection                │
│    ├─ Privacy: Tesseract.js OCR (lazy) → mask boxes → watermark                │
│    └─ Export:  JPEG blobs · jsPDF merged PDF · ZIP (optional)                  │
│  Service worker: precache app shell, WASM, models, tessdata, spec packs        │
└────────────────────────────────────────────────────────────────────────────────┘
                    No server. No upload. No account.
```

### Stack
| Layer | Choice | Notes |
|---|---|---|
| App | React + Vite + TypeScript | Fast to build; TypeScript catches schema mistakes in spec packs |
| PWA | `vite-plugin-pwa` (Workbox) | Precaches everything for offline |
| Image work | Canvas / `OffscreenCanvas` in a Web Worker | Keeps the UI responsive on low-end phones |
| Face check | `@mediapipe/tasks-vision` FaceDetector (BlazeFace short-range model) | Bundle the `.wasm` and `.tflite` locally; do **not** load from a CDN, or offline breaks |
| OCR | `tesseract.js` | Lazy-load only when privacy mode is switched on; bundle the language data locally |
| PDF | `jspdf` | Embed the processed JPEGs into one PDF |
| Tests | Vitest + a fixtures folder of sample images | See section 8 |
| Styling | Tailwind or plain CSS modules | Use whichever the team already knows |

All of these are Apache-2.0 or MIT. Keep a `THIRD_PARTY.md` listing licences (judges like this).

---

## 3. Repository layout

```
formready/
├─ public/
│  ├─ models/           # face_detector.tflite
│  ├─ wasm/             # mediapipe + tesseract wasm
│  ├─ tessdata/         # eng.traineddata (+ optional hin)
│  └─ icons/            # PWA icons
├─ src/
│  ├─ specs/            # one JSON per portal + schema.ts + index.ts
│  ├─ pipeline/
│  │   ├─ decode.ts         # file → ImageBitmap (EXIF-aware)
│  │   ├─ resize.ts         # crop/resize to exact px
│  │   ├─ compress.ts       # binary-search JPEG quality to KB range
│  │   ├─ format.ts         # magic-byte sniffing, true-JPEG check
│  │   └─ worker.ts         # runs the pipeline off the main thread
│  ├─ checks/
│  │   ├─ types.ts          # CheckResult { id, status, message, tip }
│  │   ├─ dimensions.ts
│  │   ├─ filesize.ts
│  │   ├─ trueFormat.ts
│  │   ├─ face.ts           # count, size ratio, centring
│  │   ├─ background.ts     # uniformity + colour
│  │   ├─ blurExposure.ts   # sharpness + brightness
│  │   └─ signature.ts      # contrast, white bg, ink crop
│  ├─ privacy/
│  │   ├─ ocr.ts            # find ID digits
│  │   ├─ mask.ts           # draw boxes over first 8 digits
│  │   └─ watermark.ts      # "for <exam> only"
│  ├─ export/
│  │   ├─ pdf.ts
│  │   └─ download.ts
│  ├─ ui/                   # screens + components
│  ├─ sw.ts                 # (or generated by vite-plugin-pwa)
│  └─ main.tsx
├─ fixtures/
│  ├─ photos/good/  photos/bad/
│  ├─ signatures/good/  signatures/bad/
│  └─ ids/
├─ docs/                    # spec sources, screenshots, demo script
├─ THIRD_PARTY.md
└─ README.md
```

---

## 4. Spec packs (rules as data)

Each portal is **one JSON file**. Adding a portal never needs code changes.

```json
{
  "portal": "example-exam",
  "displayName": "Example Exam 2026",
  "source": "<official notification URL>",
  "verifiedOn": "<YYYY-MM-DD>",
  "photo": {
    "px": [200, 230],
    "kb": [20, 50],
    "format": "jpeg",
    "background": "white",
    "face": { "count": 1, "minHeightRatio": 0.5, "maxHeightRatio": 0.8 }
  },
  "signature": {
    "px": [140, 60],
    "kb": [10, 20],
    "format": "jpeg",
    "background": "white"
  },
  "id": {
    "maxKB": 200,
    "format": "pdf"
  }
}
```

**The values above are placeholders.** Real values come only from the official notification.

### How to build each real pack (Dev D, start now)
1. Open the exam's official notification PDF or application instructions page.
2. Copy the photo and signature requirements exactly (pixels, KB min/max, accepted formats, background, any face rules).
3. Save the notification link and the date you read it (`source`, `verifiedOn`).
4. Add a screenshot or PDF page reference in `docs/spec-sources/<portal>.md`.
5. Have a second teammate re-read the numbers against the source (two-person check).

**Target:** 3 verified packs for the demo (pick exams with clearly different rules, e.g. one SSC, one railway, one banking or state exam), 6–8 if time allows.

Some portals state size in "cm" or leave pixels unspecified. Record exactly what the notice says and note the interpretation in `docs/`. If a rule is ambiguous, do not guess; leave the field out and skip that check.

---

## 5. Pipeline and checks (the core)

### 5.1 Decode
- Use `createImageBitmap(file, { imageOrientation: 'from-image' })` so phone photos taken in portrait are not sideways.
- Keep the original `File` and its bytes for the true-format check.

### 5.2 True-format check
- Read the first bytes (magic numbers): JPEG starts `FF D8 FF`; PNG starts `89 50 4E 47`.
- Flag a **PNG renamed to .jpg** (extension says JPEG, bytes say PNG). Re-encoding through canvas fixes it. This is a common real rejection cause.

### 5.3 Resize to exact pixels
- Target size comes from the spec pack.
- **Photo:** crop to the required aspect ratio around the detected face (see 5.5), then scale to the exact width × height.
- **Signature:** find the ink bounding box (see 5.7), crop with small padding, scale to fit, pad with white to the exact size.
- Use `imageSmoothingQuality = 'high'`. For large downscales, resize in two or three steps (halve repeatedly) for better quality.

### 5.4 Compress to the KB range (binary search)
`canvas.toBlob(cb, 'image/jpeg', q)` gives a blob whose size depends on quality `q`.

```
lo = 0.05, hi = 0.98
repeat up to ~8 times:
    q = (lo + hi) / 2
    blob = encode(q)
    if blob.size > maxBytes: hi = q
    else if blob.size < minBytes: lo = q
    else: return blob          # inside the range
```

Edge cases:
- **Still too big at the lowest quality:** the pixel size is fixed, so we cannot shrink further. Report a failure ("photo too detailed; retake against a plain background") and suggest converting to grayscale only if the portal allows it.
- **Too small even at high quality:** (common for plain signatures) raise quality toward 1.0; if still under the minimum, **pad the file** by inserting a harmless JPEG comment (COM) segment so the size lands in range. The file stays a valid JPEG.
- Always **re-measure the final blob** and re-check pixel size by decoding it again (see 5.9).

### 5.5 Face check (photo only)
Use MediaPipe FaceDetector (BlazeFace). Starting thresholds (tune on fixtures):
- **Count:** exactly 1. 0 → "no face found"; 2+ → "more than one face".
- **Size:** face box height ÷ image height inside the spec's range (e.g. 0.5 to 0.8).
- **Centring:** face box centre within about 10% of the image centre horizontally and the face not cut off at the top or bottom.
- **Confidence:** below about 0.6 → "face unclear, retake with better light".

Never edit the face. Only crop and scale.

### 5.6 Background and exposure checks
- **Background uniformity:** sample strips along the left, right and top borders (outside the face box). Convert to Lab (or just check per-channel standard deviation). High variance → "background is uneven or has shadows".
- **Background colour:** mean of the border strips compared with the required colour (white is near RGB 255, 255, 255); allow a tolerance.
- **Blur:** variance of a Laplacian over the grayscale image. Low variance → "photo looks blurry". Choose the cutoff by measuring your fixtures.
- **Exposure:** mean luminance. Too dark or too bright → "poor lighting". Also check the clipped-pixel percentage.
- These thresholds are **starting points**. Plot the metric for your good vs bad fixtures and pick values that separate them.

### 5.7 Signature checks
- Convert to grayscale; threshold (Otsu) to find ink pixels.
- **Contrast:** gap between ink mean and paper mean; too low → "signature too faint, use a dark pen".
- **Background:** paper should be near white; if not, normalise (levels/curves) and re-check.
- **Cropping:** ink touching the image edge → "signature is cut off".
- Allowed edits: crop, scale, brightness/contrast. We never redraw or generate a signature.

### 5.8 ID document
- Resize if needed, convert to PDF or JPEG as the spec says, and compress below `maxKB` using the same binary search.
- Optional text sanity check with OCR (only if time allows).

### 5.9 Final verification (the rule that prevents embarrassing demos)
After producing each output, **decode it again** and check: pixel size, byte size, real format. Show the verified numbers in the UI ("200 × 230 px, 38 KB, JPEG"). Never display the target numbers; display the measured ones.

### 5.10 Check result shape
```ts
type CheckResult = {
  id: string;            // "face.count"
  status: 'pass' | 'warn' | 'fail';
  message: string;       // "2 faces found"
  tip?: string;          // "Retake with only you in the frame"
};
```
The UI only renders `CheckResult[]`. This keeps checks independent: one developer can add a check without touching the UI.

---

## 6. Privacy mode

1. User turns on **Privacy mode** and picks the ID document.
2. Lazy-load Tesseract.js (about 22 MB with data; cache it for offline).
3. Run OCR on the ID image; find digit groups that match a 12-digit pattern (allow spaces: `XXXX XXXX XXXX`).
4. Draw solid boxes over the **first 8 digits**; leave the last 4.
5. Add a watermark across the image: "For <exam name> only" with the date.
6. Show a **before/after preview** and ask the user to confirm the masking looks right. OCR can miss digits, so the user must review it.
7. If OCR finds nothing, say so and let the user draw a mask box manually (simple drag rectangle).

Pitch line: "Your ID number is hidden before it ever reaches a portal or a cyber café, and the file says who it was meant for."

---

## 7. PDF kit and export
- jsPDF: one page per document at A4 with margins, embedding the processed JPEGs.
- Enforce the ID `maxKB` on the final PDF; if too large, lower image quality and rebuild.
- Download buttons: each file separately plus "Download all" (use the File System Access API if available, otherwise sequential downloads; a ZIP library is optional).
- Filenames: `photo.jpg`, `signature.jpg`, `id-masked.pdf`.

---

## 8. UI screens

1. **Home / pick exam:** search box, list of portals, "works offline" badge.
2. **Upload:** three slots (photo, signature, ID), camera or gallery. Show the requirements for that exam beside each slot ("200 × 230 px, 20–50 KB").
3. **Results:** per-file checklist with green/amber/red rows, a measured-vs-required line, a fix tip for each failure, and a **Retake** button.
4. **Privacy:** toggle, before/after preview, confirm.
5. **Download:** the kit, verified numbers, "Nothing was uploaded" note.

Design rules: large tap targets, high contrast, English first (Hindi strings are a stretch goal), no signup, one primary button per screen.

---

## 9. Offline / PWA
- Use `vite-plugin-pwa` with a precache manifest that includes: app shell, spec packs, the `.tflite` model, MediaPipe and Tesseract WASM, and `tessdata`.
- Do not fetch anything from a CDN at runtime.
- **Test:** build (`vite build`), serve the production build, load it once online, switch to airplane mode, reload, and complete the full flow. Do this on a real Android phone **and** a laptop.
- Add a visible "Ready offline" indicator once the cache finishes.

---

## 10. Testing

### Fixtures (build before the finale; this is the demo)
Collect about 20 images (use your own team's photos, with permission):
- Good photo (white wall, even light, one face).
- Bad photos: shadow on the wall, two faces, face too small, blurry, too dark, too bright, coloured background, 4 MB original, a PNG renamed `.jpg`.
- Good signature, faint pen, signature on a lined page, signature cut off at the edge.
- A **sample/dummy ID image you create yourself**. Do **not** use real Aadhaar or other real ID numbers in the repo or the demo.

### Automated
- Unit tests for each check against fixtures (expected status per image).
- A pipeline test that runs every good fixture through every spec pack and asserts the verified output is inside the pixel and KB range.

### Manual
- Run the demo on a low-end Android phone and watch the speed. Set a target (for example under 3 seconds per image) and optimise only if you miss it.

---

## 11. Team split (4 developers)

| Dev | Owns | Main files |
|---|---|---|
| **A** | Pipeline: decode, resize, compress, true-format, final verification | `pipeline/*` |
| **B** | Checks: face, background, blur/exposure, signature | `checks/*` |
| **C** | UI, PWA, offline, screens, download | `ui/*`, `sw`, `export/download.ts` |
| **D** | Spec packs, privacy mode (OCR, mask, watermark), PDF, fixtures, pitch | `specs/*`, `privacy/*`, `export/pdf.ts`, `fixtures/*` |

**Interfaces to agree on in the first 30 minutes** (write them as TypeScript types in the repo):
- `SpecPack` (schema in section 4).
- `CheckResult` (section 5.10).
- `processImage(file, spec, kind) → { blob, measured: { width, height, bytes, format }, checks: CheckResult[] }`.

With those three fixed, everyone can work in parallel and mock each other's pieces.

---

## 12. Schedule

### Before the finale (today → 5 Nov)
| When | What | Owner |
|---|---|---|
| 25–27 Oct | Collect official notices and write **3** verified spec packs (6–8 later); two-person check | D (+ all) |
| 25–27 Oct | Build the fixtures set (about 20 images) | D, B |
| 26–28 Oct | Finalise PPT: fill team name, members, college, GitHub and demo links; swap in exact source links | All |
| 28–30 Oct | **Submit the PPT on Unstop by 30 Oct** (deadline is 1 Nov 11:59 PM IST; leave a buffer) | Team lead |
| 28 Oct–4 Nov | Email or ask organisers: *is pre-written code allowed?* (see rules below) | Team lead |
| 29 Oct–4 Nov | Learn-by-doing prep: tiny throwaway spikes (not the final project code) for binary-search compression, MediaPipe in the browser, Tesseract.js, `vite-plugin-pwa` offline. Write down the gotchas | A, B, C, D |
| 3–5 Nov | Rehearse the pitch and demo twice; prepare a backup demo video; charge devices; prepare a hotspot as a fallback | All |

> **Pre-written code:** the organisers' rules mention originality and disclosure of AI tools. Many hackathons require that the project be built during the event. **Ask in writing before the finale.** Until you get a yes, treat spikes as learning only and plan to write the real code at the venue. Also disclose any AI assistance as the rules require.

### Finale day (about 9 hours, 6 Nov)
| Time | Goal | Done when |
|---|---|---|
| 0:00–1:00 | **Scaffold:** repo, Vite + TS + PWA plugin, schema types, 3 spec packs loaded, fixtures copied in | App shows exam list; types agreed |
| 1:00–3:00 | **Pipeline** (A) with hard checks (dimensions, KB, true format); UI skeleton with upload slots (C); face model loading (B) | A raw photo becomes an exact-size JPEG in range |
| 3:00–5:00 | **Checks** (B): face, background, blur/exposure; **results UI** (C); signature handling (A) | Bad fixtures turn red with correct tips; good fixtures turn green |
| 5:00–6:30 | **Privacy mode** and **PDF** (D); download screen (C) | ID masked + watermarked; one merged PDF |
| 6:30–8:00 | **Polish, offline test, tuning** on all fixtures; fix top bugs; real-phone test | Airplane-mode run passes end to end |
| 8:00–9:00 | **Freeze code.** Record backup demo video; rehearse pitch with a timer; prepare Q&A | Demo runs twice in a row without a hiccup |

**Cut order if you fall behind** (cut from the bottom up): extra portals → ZIP download → manual mask drawing → signature auto-crop → background colour check → PDF merge. Never cut: exact-size output, the red/green checklist, and offline mode. Those are the demo.

---

## 13. Demo script (about 75 seconds)

1. **Hook (10 s):** "Ravi's form was rejected twice for a photo problem. He paid a cyber café each time."
2. **Pick the exam (5 s).** Show the requirements.
3. **Bad photo (20 s):** upload a 2 MB photo with a shadow. Checklist turns red: too large, uneven background. Show the tip.
4. **Fix (15 s):** retake or upload the good photo. All green; the kit is exactly the required size (read the measured numbers aloud).
5. **Privacy mode (15 s):** ID digits masked, watermark added, PDF merged.
6. **Offline (10 s):** switch to airplane mode and repeat one step. "No server. Nothing leaves the phone."

Pitch the **scale** (lakhs of applicants per exam, paid help at cyber cafés) and the **gap** (nothing checks documents against portal rules before upload). Keep a short answer ready for "isn't this just a resizer?" → "A resizer doesn't know the portal's rules, doesn't tell you why a photo will be rejected, and uploads your files somewhere. We do the opposite on all three."

---

## 14. Risks and mitigations

| Risk | Mitigation |
|---|---|
| A portal's rules change | Every pack has `source` and `verifiedOn`; show them in the UI so users can verify |
| Check thresholds give false alarms | Tune on fixtures; use `warn` rather than `fail` for borderline cases; wording says "may be rejected" |
| Model/OCR files too large for mobile | Lazy-load OCR; cache after first load; measure and show a one-time "preparing offline" progress bar |
| Offline fails on demo day | Test the production build on the actual demo device the day before; keep a backup video |
| Phone camera orientation bugs | Use `imageOrientation: 'from-image'`; include a rotated fixture |
| OCR misses ID digits | Review step with manual mask box; use a clean sample ID in the demo |
| Venue Wi-Fi is bad | Nothing depends on the network (that is the point); carry a hotspot just in case |
| Running out of time | Follow the cut order in section 12 |
| Judges ask "why not just use Google/Photoshop?" | They are general tools: not portal-aware, no rejection prediction, no privacy masking, and many upload your files |

---

## 15. Definition of done

- [ ] 3+ verified spec packs with source links and dates.
- [ ] A good photo and signature produce files inside the required pixel and KB range, verified by re-decoding the output.
- [ ] Every bad fixture produces the expected red check with a helpful tip.
- [ ] Privacy mode masks the first 8 digits and adds the watermark; the user can review before downloading.
- [ ] One merged PDF within the ID size limit.
- [ ] Complete flow works in airplane mode on a real phone.
- [ ] `THIRD_PARTY.md` lists all libraries and licences; AI-tool use is disclosed as the rules require.
- [ ] README with setup steps, demo steps and the known limitations.
- [ ] Backup demo video recorded.

---

## 16. Useful commands

```bash
npm create vite@latest formready -- --template react-ts
cd formready
npm i @mediapipe/tasks-vision tesseract.js jspdf
npm i -D vite-plugin-pwa vitest

npm run dev            # develop
npm run build          # production build (this is what you test offline)
npx vite preview       # serve the production build locally
npx vitest             # run check/pipeline tests
```

---

## 17. Open questions for the team
1. Which 3 exams do we feature in the demo? (Pick ones with clearly different rules.)
2. Do the organisers allow pre-written code? (Ask now.)
3. English only, or English + Hindi UI? (Default: English only; Hindi is a stretch goal.)
4. Which phone will be the demo device, and do we have a spare?
5. Who presents, and who runs the demo?
