# FormReady

Offline-first web app (PWA) that turns a raw photo, signature and ID into an upload-ready kit for an exam portal, and **predicts** rejection risk before you upload. Everything runs in the browser. Nothing is uploaded.

Built for Build With Bharat 5.0. Plan: `FormReady_Build_Plan.md`. Designs: `docs/DESIGN.md`.

## Run
```bash
npm i
npm run dev        # http://localhost:5173
npm test           # unit tests
npm run build && npx vite preview   # production build (use this for the offline test)
```

## What works
Exact-size crop around the face, binary-search JPEG compression into the KB range, re-decode verification, checks (face, background, blur, exposure, signature, true file type), ID masking (first 8 digits via local OCR) with watermark, merged PDF, offline via service worker.

## Known limitations
- **Every spec pack is a SAMPLE with invented numbers** (`sample: true`). Replace from official notices: `docs/spec-sources/README.md`.
- Thresholds are tuned on a small fixture set (`fixtures/`, results in `docs/TEST_RESULTS.md`). Not tested on real phone cameras.
- Not caught: rotated pixels, mostly non-frontal group photos, signatures on ruled paper.
- It is a preflight check, not a way around live-capture requirements.

## Licences
Libraries are Apache-2.0 / MIT (MediaPipe, Tesseract.js, jsPDF, React, Vite). Fixture images from Wikimedia Commons keep their own licences: see `fixtures/web/MANIFEST.json`.
