# Replacing sample spec packs with verified ones

Every pack in `src/specs/*.json` currently has `"sample": true`. Those numbers are INVENTED placeholders, not from any official notice. Never ship them as real rules.

For each real exam (plan section 4):
1. Open the exam's official notification PDF or application instructions page.
2. Copy the photo and signature rules exactly (pixels, KB min/max, format, background, face rules). If a rule is ambiguous or in cm only, leave the field out and note the interpretation here; do not guess.
3. Set `source` to the notification URL and `verifiedOn` to the date read (YYYY-MM-DD). Remove `"sample": true`.
4. Add `docs/spec-sources/<portal>.md` with a screenshot or PDF page reference.
5. A second teammate re-reads every number against the source (two-person check).
6. Register a new portal by importing its JSON in `src/specs/index.ts`.
