# Fixture test results (26 Oct 2026)

Run in headless Chrome against the dev build with the real `processImage` and real Tesseract OCR. Spec: the sample "Central Recruitment Exam" pack (invented numbers). Every output was 200x230 px (photo), 140x60 px (signature), re-decoded and measured.

## Photos (expected -> observed)

| Fixture | Expected flag | Observed |
|---|---|---|
| good portraits (2) | none | all pass |
| dark | exposure | `image.exposure` fail, also bg.color |
| bright | exposure | `image.exposure` fail |
| blurry | blur | `image.blur` warn |
| shadow | uneven bg | `bg.even` fail |
| coloured wall | bg colour | `bg.color` fail |
| two faces | face count | `face.count` fail |
| small face in big frame | face size | passes: the pipeline zooms to the face (not a defect once cropped) |
| low-res (110 px) | resolution | `size.upscale` warn |
| PNG renamed .jpg | format | `format.true` warn (output is re-encoded as a real JPEG) |
| 4200 px noisy "huge" | size/KB | pass, output in KB range, ~0.4-0.7 s |
| rotated 90 deg | face | **not caught**: the detector still found one face |
| landscapes, cat | face count | `face.count` fail |
| group photo (RWC) | face count | `face.count` fail |
| classroom, people facing away | face count | **not caught**: detector counted 1 frontal face |
| historical B&W/sepia portraits | bg + exposure | bg.even/bg.color fail, some exposure fail (correct for a white-wall rule) |

## Signatures
Portraits and landscapes uploaded as a signature fail `sig.notsignature` (ink > 25% or colourful). Real PD signatures (3 of 4) pass; one photographed on coloured paper fails contrast. Faint ink fails, blank page fails, cut-off warns, grey paper warns. **Not caught:** signature on lined paper (passes).

## ID masking (OCR, real)
- `2345 6789 0123` -> 2 boxes covering the first 8 digits.
- `234567890123` -> 1 box over the first 8 digits.
- no digits -> 0 boxes (UI tells the user to draw one).
- ~0.2-0.4 s per card on a laptop after a warm-up.

## Known gaps
Rotated pixels, mostly non-frontal group shots, ruled-line signatures. Thresholds are tuned on this set only. Nothing tested on a phone camera or low-end Android.
