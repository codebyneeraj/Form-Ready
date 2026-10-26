# FormReady

**Upload-ready exam photos, signatures and IDs, checked before you submit.**

FormReady is an offline-first web app (PWA) that turns a raw photo, signature and ID into files that fit an exam portal's rules, and **predicts** rejection risk with a plain-language fix for each problem. Everything runs in the browser. Nothing is uploaded, and there is no account.

Built for Build With Bharat 5.0 (CodeVerse).

<!-- Live demo: add the Vercel URL here -->

## Why

Applicants are routinely rejected for avoidable file problems (wrong pixels or KB, shadows on the background, a PNG renamed to `.jpg`) and often pay a cyber café to fix them, while handing over their ID. Resizers don't know a portal's rules, don't explain why something fails, and often upload your files. FormReady does the opposite on all three.

> FormReady is a **preflight check**. It predicts risk from published rules and never guarantees acceptance. It is not a way around live-capture requirements.

## What it does

1. **Pick an exam.** Each exam's rules load from a JSON "spec pack".
2. **Add a photo, signature and ID** in any size or format.
3. **Get exact-fit files.** Photos are cropped around the face and scaled to the exact pixels, then compressed into the KB range. The output is re-decoded and the app shows the *measured* size, never the target.
4. **See a rejection checklist** (pass / warn / fail, with a tip for each).
5. **Privacy mode.** Local OCR finds a 12-digit ID number and hides the first 8 digits, adds a "for <exam> only" watermark, and shows a before/after to confirm. If OCR finds nothing, you can drag a box by hand.
6. **Download** each file or the merged PDF kit.

### Checks

| Area | What is checked |
|---|---|
| Format | Real file type from the bytes (a PNG renamed `.jpg` is flagged and re-encoded as a true JPEG) |
| Size | Exact pixels and KB range, measured on the re-decoded output |
| Face | Exactly one face, sized right for the frame, centred, confident (MediaPipe BlazeFace) |
| Background | Even, near-white, no shadows |
| Light | Blur, too dark or too bright |
| Resolution | Warns when the photo had to be stretched |
| Signature | Looks like a signature, dark enough, not cut off, white paper |

All thresholds are named constants at the top of each file in `src/checks/`.

## Run it

```bash
npm install
npm run dev                      # http://localhost:5173
npm test                         # unit tests
npm run build && npx vite preview   # production build, port 4173
```

To test **offline**: build, serve with `vite preview`, load once online, then switch to airplane mode and reload. The "Ready offline" badge appears when the cache is complete. On a phone, camera capture and the service worker need **HTTPS** (a deployed URL, or `localhost`).

Deploys as a static Vite app (Vercel preset: Vite, build `npm run build`, output `dist`).

## How it works

```
Browser only. No server.
  React + Vite + TypeScript (PWA, service worker precaches the lot)
   ├─ src/specs      spec packs (rules as JSON) + schema
   ├─ src/pipeline   decode (EXIF-aware) → analyse → face-aware crop → resize → compress → re-decode & verify
   ├─ src/checks     face · background · blur/exposure · signature  (each returns CheckResult[])
   ├─ src/privacy    Tesseract.js OCR (lazy) → mask → watermark
   ├─ src/export     jsPDF merged kit, downloads
   └─ src/ui         screens; phone UI, shown inside a phone frame on laptops
```

The UI only renders `CheckResult[]`, so a check can be added without touching the UI. Models and WASM (MediaPipe, Tesseract) are bundled in `public/`, never loaded from a CDN, so the app works offline.

## Spec packs

Each exam is one JSON file in `src/specs/` and adding one needs no code change (register it in `src/specs/index.ts`).

> **Every pack currently in the repo is a SAMPLE with invented numbers** (`"sample": true`, `verifiedOn: "[date]"`). Real values must come from the official notification, with a link and date, and be re-read by a second person. See [`docs/spec-sources/README.md`](docs/spec-sources/README.md). Never present sample numbers as official.

## Testing

- **Unit tests** (`npm test`): compression search, JPEG padding, format sniffing, signature ink crop, face crop, every check, OCR digit grouping, PDF output.
- **Fixture run** against the real pipeline in Chrome: [`scripts/run-fixtures.cjs`](scripts/run-fixtures.cjs) over [`fixtures/`](fixtures/) (real open-licence photos and signatures, generated defect variants, **dummy** IDs with made-up numbers). Results and gaps: [`docs/TEST_RESULTS.md`](docs/TEST_RESULTS.md).

## Known limitations

- Spec packs are samples (above).
- Thresholds are tuned on a small fixture set and have **not** been tested on real phone cameras or low-end Android.
- Not caught: photos whose pixels are rotated 90°, group photos where people face away, signatures on ruled paper.
- OCR has only run on dummy ID cards, not real ones. Always check the masked preview.
- The ID slot accepts any image. PDF and HEIC input are not supported.
- First load downloads about 33 MB (face model, OCR data) so that later use is offline.

## Privacy

No backend, analytics, login or database. Files are processed in memory in your browser. The ID number is masked on your device before anything is downloaded. Masking is privacy hygiene, not a legal requirement.

## Tech and licences

React, Vite, TypeScript, `vite-plugin-pwa` (Workbox), `@mediapipe/tasks-vision`, `tesseract.js`, `jspdf`, Vitest, Montserrat (`@fontsource`). These are MIT, Apache-2.0 or OFL. Fixture images from Wikimedia Commons keep their own licences (several are CC BY-SA): see [`fixtures/web/MANIFEST.json`](fixtures/web/MANIFEST.json) and keep attribution if you redistribute them.

## AI assistance disclosure

This project was built with AI assistance (Claude Code), including code, tests and documentation. All behaviour was reviewed and run by the team. See the event rules for disclosure requirements.

## Docs

[`FormReady_Build_Plan.md`](FormReady_Build_Plan.md) (plan and schedule) · [`docs/DESIGN.md`](docs/DESIGN.md) (design tokens and flow) · [`docs/TEST_RESULTS.md`](docs/TEST_RESULTS.md)
