# Fixtures

- `web/` real images from Wikimedia Commons (open licences; per-file title, licence, author and page in `web/MANIFEST.json`). CC BY / BY-SA files need that attribution if redistributed. Note: `Teto passport photo` is a cat, kept as a "not a human face" case.
- `generated/` defect variants made from two stock passport-style portraits (dark, bright, blurry, shadow, coloured wall, two faces, small face, rotated, low-res, PNG renamed .jpg), signature variants (faint, cut off, lined, blank, grey paper) and **dummy** ID cards with made-up numbers. Never put real ID numbers in this repo.

Run (dev server on :5173, Chrome installed): `npm i -D puppeteer-core` then `node scripts/run-fixtures.cjs`.
Results are in `docs/TEST_RESULTS.md`.
