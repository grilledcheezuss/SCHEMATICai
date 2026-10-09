# ALIGNMENT-NOTES - border/title-block layouts -> SCHEMATICai nomenclature

2026-10-09 08:54 CT. Checked against grilledcheezuss/SCHEMATICai @ 3a9159e8 (APP_VERSION v2.5.113); app.js is identical to the copy in ref/.
Export schema: `schematicai-layout-rules/1.0`.

## 1. What the app actually uses (app.js, not REDACTION_SCHEMA.md)
- `const LAYOUT_RULES` keys (14): TITLE, TITLE_ASBUILT, INFO, INFO_BORDERLESS, SCHEMATIC_PORTRAIT, SCHEMATIC_PORTRAIT_BORDERLESS, SCHEMATIC_LANDSCAPE, SCHEMATIC_LANDSCAPE_BORDERLESS, DOOR_DRAWING, COX_COVER, DELTA_COVER, THIRD_PARTY_COVER, COVER_TEMPLATE, GENERAL.
- Zone props in built-ins: map, x, y, w, h, fontSize, transparent, fontFamily, textAlign (all 62 zones); rotation (10); text (5, custom only); decoration (1, job_block); fontWeight (1). `applyRuleToWrapper` passes exactly: x, y, w, h, map, fontSize (scaled by zoom), text, decoration, fontWeight (default 'bold'), transparent, rotation, fontFamily, textAlign. Any other key is ignored.
- `map` values that `refreshContent()` fills: cust, job, job_block, type, cpid, date, stage, po, serial, company, address, phone, fax, logo (always blank), custom (uses `text`). company/address/phone/fax/po/serial come from the demo-context inputs (the replacement identity), not from the source PDF.
- `transparent:false` = white box drawn over the original (the redaction) and then the replacement text. Export draws opaque boxes first, then transparent ones, keeping array order otherwise.
- Custom profiles: `ProfileManager` stores `{name: [zones]}` in `localStorage['cox_custom_profiles']`. They are applied with select value `CUSTOM:<name>`, and the zone shape is the same as LAYOUT_RULES.
- AUTO (`updatePageProfile`): page 1 -> COVER_TEMPLATE, page 2 -> INFO, otherwise SCHEMATIC_LANDSCAPE or SCHEMATIC_PORTRAIT by aspect ratio. Scan fallback (`PageClassifier.classify`) adds the BORDERLESS, DOOR, TITLE_ASBUILT, COX_COVER and DELTA_COVER branches. Page 1 is forced to COVER_TEMPLATE (`applyPage1CoverTemplate`) and its dropdown is disabled.
- REDACTION_SCHEMA.md drift: the doc says v2.5.3 and '13 built-in profiles'. It uses the names TITLE_COX / TITLE_DELTA / TITLE_3RDPARTY, which do not exist in code (the code has COX_COVER / DELTA_COVER / THIRD_PARTY_COVER). It omits COVER_TEMPLATE, and it omits map values `logo` and `job_block`.

## 2. What changed in our outputs
| before (diagnostic) | now (app-facing export) |
|---|---|
| layout ids `TB01a-SHEET`, `TB01a-INFO`, `COV01` | profile keys `<BASE>_<LAYOUT>`: `SCHEMATIC_PORTRAIT_TB01A`, `INFO_TB01A`, `COVER_TEMPLATE_COV01` (UPPER_SNAKE like the built-ins) |
| class SHEET / INFO / COVER / NOTB | `base_profile` = the built-in the app would pick: SCHEMATIC_{PORTRAIT,LANDSCAPE}[_BORDERLESS] by displayed orientation and detected border; INFO / INFO_BORDERLESS; covers COX_COVER if the company block is Cox on 98% or more of pages, THIRD_PARTY_COVER if 2% or less, otherwise COVER_TEMPLATE |
| zone extras (field, role, redact, confidence, rel_tb, cox_brand_rate, cox_check, value_bbox, ...) | stripped from `layouts_overlay.json`; kept in `layouts.json` (diagnostics) and in the profile index in `layouts_overlay.meta.json` |
| `company_block` | `company` (or an opaque blank `custom` box under a separate `company` line when both exist) |
| `logo_text` (non-Cox logo / name) | `logo` (app key; renders blank) |
| drawn_by, ship_to, footer_note (non-Cox), tb_text_cell_N, info_header_cell_N | `custom` with `text: ""` and transparent:false (pure whiteout) |
| cust/job/type/cpid/date/stage/po/serial/address/phone/fax | unchanged key, transparent:false |
| role `border` (page_border, title_block landmarks), role `cox_brand` | not exported (landmarks are used for matching; Cox branding is left alone) |
| flagged_zones | not exported, except sensitive flagged zones on covers (customer/job envelopes): blank over wrong |
| NOTB groups | not exported (see section 4) |

The export holds 186 profiles and 1487 zones. Map usage: custom 922, cpid 128, date 62, type 57, serial 55, po 49, address 47, cust 37, phone 35, job 34, fax 32, logo 16, company 11, stage 2.
Every exported zone has exactly map, x, y, w, h, fontSize, transparent, fontFamily, textAlign, plus `rotation` (rotated title blocks only) and `text` (custom only). Values are clamped to 0-1.

## 3. Accuracy spot-check (24 layouts, PNGs reviewed by eye)
| class | layouts checked | pass | warn | fail |
|---|---|---|---|---|
| SHEET | 9 (TB01a, TB02a, TB03a, TB04e, TB20a, TB26a, TB34a right-edge, TB64a left-edge, TB69a) | 7 | 2 | 0 |
| INFO | 5 (TB01a, TB03a, TB31a, TB36a, TB49a) | 4 | 1 (fixed) | 0 |
| COVER | 5 (COV01, COV02, COV09, COV18, COV28) | 2 | 3 | 0 |
| NOTB | 5 (NOT03, NOT04, NOT05, NOT06, NOT16) | 0 | 0 | 5 |
| **total** | **24** | **13** | **6** | **5** |

Findings:
- Cox-grid title blocks (TB01-TB07 families, 3000s-8000s): border, title block, cpid, date, project title (`type`), PO, serial, drawn-by, the company block and its address, phone and fax lines all sit on the correct cells. Cox-branded blocks (TB04, TB06b, TB07) are correctly `cox_brand` and not exported.
- Mixed templates (TB01a 289 pages: company is Cox on ~79-86% of pages; TB03a; COV01; COV02) are correctly kept as sensitive with `cox_check`; `match_layout.py` releases them per page when OCR finds the Cox name.
- Third-party / older title blocks (TB15, TB20, TB26, TB34, TB36, TB69): unrecognised cells are covered by `tb_text_cell_N`. WARN: on some CP3000s sheets the cell holding the Cox logo is redacted too (over-blank, safe). On TB64a (left-edge, 2 pages) the cells overlap and are seen on only 50% of pages.
- INFO: the header customer rows were mapped (cust, job, address), but a third row (tag / ship-to) was unmapped on TB03a/TB02a. Fixed with `info_header_cell_N`.
- COVER: positions are right, but cust/job/serial/date are flow-layout envelopes, flagged on COV01 and on all single-page covers (COV18, COV28). They are exported for blanking only; do not rely on them for exact text placement.
- NOTB: FAIL. NOT03/04/06 envelopes cover a large part of the schematic because the small rotated Cox block floats. On NOT05 the cpid/company zones miss the block. NOT16 is really a partial-width title block that the detector missed. None of these are exported; `match_layout.py` returns no zones for them.
- The CP number read from the cpid zone matches the file name on 98.7% of pages. Hold-out (12 unseen PDFs): 74/87 pages matched, 73 at an exact placement; every miss was a no-title-block page or one rare cover.

## 4. Remaining mismatches (unavoidable or deferred)
- No built-in profile fits any measured layout (best mean IoU 0.39): the Cox title block puts date at y~0.90 and drawing number at y~0.96, while the built-ins expect 0.858 / 0.945. So every layout is a new profile key; `base_profile` records the built-in it replaces.
- Profile keys are a snapshot. Template numbers (TB01...) are assigned by page count at build time. `layouts_overlay.meta.json` carries `template_hash` and `title_block_bbox` so a later rebuild can be mapped back. Freeze this export as the PR contract.
- `cox_check` (conditional Cox release) and affine re-placement have no LAYOUT_RULES equivalent. They need program support (section 6), or `match_layout.py` output.
- `logo` exists in code but not in the schema doc. `job_block` and `decoration` are not used by us.
- Not exported: 12 profiles (8 no-title-block groups).

## 5. Recommended profile set for the PR
- Core set (>=3 pages each): **81 profiles covering 1803 of 1934 measured pages**. The other 105 are rare one- or two-page layouts (low_confidence=true). Ship them as custom profiles or hold them back.
| base_profile | profiles | of which core |
|---|---|---|
| SCHEMATIC_PORTRAIT | 98 | 58 |
| INFO | 57 | 15 |
| THIRD_PARTY_COVER | 10 | 1 |
| SCHEMATIC_PORTRAIT_BORDERLESS | 7 | 1 |
| COVER_TEMPLATE | 4 | 4 |
| COX_COVER | 4 | 0 |
| SCHEMATIC_LANDSCAPE_BORDERLESS | 3 | 2 |
| SCHEMATIC_LANDSCAPE | 2 | 0 |
| INFO_BORDERLESS | 1 | 0 |

Top core profiles (key - pages / PDFs - zones - cox_check fields):
- `SCHEMATIC_PORTRAIT_TB01A` - 289 / 66 - 14 zones - cox_check: address, company, company_block, fax, phone
- `SCHEMATIC_PORTRAIT_TB03A` - 199 / 20 - 12 zones - cox_check: address, company_block, phone
- `COVER_TEMPLATE_COV01` - 184 / 184 - 10 zones - cox_check: address, company, company_block, fax
- `SCHEMATIC_PORTRAIT_TB02A` - 94 / 16 - 14 zones
- `SCHEMATIC_PORTRAIT_TB02B` - 86 / 17 - 14 zones
- `SCHEMATIC_PORTRAIT_TB04A` - 80 / 16 - 9 zones
- `SCHEMATIC_PORTRAIT_TB05A` - 80 / 11 - 13 zones
- `SCHEMATIC_PORTRAIT_TB01B` - 55 / 10 - 13 zones - cox_check: address, company, company_block, fax
- `COVER_TEMPLATE_COV02` - 50 / 50 - 12 zones - cox_check: address, company, company_block, fax
- `INFO_TB01A` - 50 / 50 - 16 zones - cox_check: address, company, company_block, fax, phone
- `SCHEMATIC_PORTRAIT_TB06A` - 43 / 8 - 9 zones - cox_check: address, company_block
- `SCHEMATIC_PORTRAIT_TB01C` - 41 / 8 - 13 zones - cox_check: address, company, company_block, phone
- `SCHEMATIC_PORTRAIT_TB02C` - 36 / 8 - 14 zones
- `SCHEMATIC_PORTRAIT_TB07A` - 27 / 5 - 9 zones
- `SCHEMATIC_PORTRAIT_TB01D` - 25 / 2 - 13 zones - cox_check: company, company_block, phone
- `SCHEMATIC_PORTRAIT_TB02D` - 23 / 5 - 14 zones
- `SCHEMATIC_PORTRAIT_TB06B` - 22 / 4 - 9 zones
- `SCHEMATIC_PORTRAIT_TB10A` - 20 / 1 - 12 zones
- `INFO_TB03A` - 19 / 19 - 15 zones - cox_check: address, company_block, phone
- `SCHEMATIC_PORTRAIT_TB04B` - 18 / 3 - 9 zones
- `INFO_TB02A` - 15 / 15 - 17 zones
- `INFO_TB02B` - 15 / 15 - 18 zones
- `SCHEMATIC_PORTRAIT_TB08A` - 15 / 5 - 5 zones
- `SCHEMATIC_PORTRAIT_TB09A` - 15 / 5 - 5 zones
- `SCHEMATIC_PORTRAIT_TB11A` - 14 / 1 - 19 zones

The full list is in `layouts_overlay.meta.json -> profiles` (n_pages, n_pdfs, eras, n_zones, base_profile, low_confidence).

## 6. Program-side recommendations (by impact)
1. **P1 - Fingerprint-driven AUTO profile selection.** AUTO only looks at page number and aspect ratio, so none of the measured profiles is ever chosen. Add a `LayoutMatcher` that runs before `PageClassifier`. From pdf.js `getOperatorList()` (or the canvas) build the axis-aligned line set, find the title-block band (lowest full-width lines between y 0.70 and 0.975), and compare the title-block-relative lines with each profile's `template_lines_rel` (tolerance H 0.03/0.03, V 0.006/0.08; accept a score of 0.70 or more). Also compare the title-block bbox (within 0.008). On a hit, apply `LAYOUT_RULES[profile_key]`; on a miss, fall back to the current logic. Ship the fingerprints as a small `LAYOUT_FINGERPRINTS` JSON (from layouts.json `fingerprint`). Alternative: run `match_layout.py` offline and store `{cpid: {page: profile_key}}`.
2. **P1 - Page-1 cover precedence.** `applyPage1CoverTemplate` forces COVER_TEMPLATE and the page-1 dropdown is disabled, so COX_COVER, THIRD_PARTY_COVER and the measured cover profiles cannot be applied. Proposed order: (1) a measured cover profile when the matcher hits (cpid row and contact-block row within 0.03); (2) COX_COVER / THIRD_PARTY_COVER from PageClassifier text; (3) COVER_TEMPLATE. Enable the page-1 dropdown, or add an override.
3. **P1 - Rotation-aware export.** The PDF export maps box positions with `page.getWidth()/getHeight()` and draws in unrotated page space. The viewer shows the rotation-applied page (pdf.js), and so do our coordinates and the built-ins. Pages with /Rotate 90/270 (the sample had about 2%) will be redacted in the wrong place. Before drawing, transform (x, y, w, h) by `page.getRotation().angle` (90: x'=y, y'=1-x-w, swap w/h; 180 and 270 likewise) and add the matching text rotation.
4. **P2 - Conditional Cox release (`cox_check`).** Templates used by Cox on most jobs and by another company on the rest. Add an optional zone prop `coxCheck: true` (ignored by older code). At apply time, if the page's text layer or OCR inside the box contains COX, skip the whiteout (or switch it to transparent). Until then the export redacts these boxes everywhere (blank over wrong).
5. **P2 - Affine re-placement for shifted title blocks.** The same template is often printed shifted by about 0.01 or scaled about 95%. Store `rel_tb` (zone relative to the title-block bbox) and the profile's title-block bbox. When the matcher finds the template at a different placement, compute zone = tb.x + rel.x * tb.w (and so on). This avoids one profile per placement and would let the 198 layouts collapse to about 84 templates x class.
6. **P2 - Bulk load path for measured profiles.** Either merge `layouts_overlay.json` into `LAYOUT_RULES` (built-in keys, versioned), or add 'Import profiles JSON' to ProfileManager that merges into `localStorage['cox_custom_profiles']` (the shape is already compatible; select `CUSTOM:<key>`). Recommended: built-in for the core profiles, so every user gets them, and the import for the long tail.
7. **P2 - Editor visibility for new keys.** `refreshProfileOptions` hard-codes its `<option>` list, so new built-in keys never show. Generate the options from `Object.keys(LAYOUT_RULES)`, grouped by `base_profile` prefix (Cover / Info / Schematic / Measured), with a label from metadata (layout id, pages).
8. **P3 - No-title-block pages.** Fixed zones fail here because the small Cox block floats. Use runtime detection: find the CP number in the text layer or OCR, take the vertically stacked block around it, whiteout that block plus the cpid box. This mirrors `analyze.detect_notb`.
9. **P3 - REDACTION_SCHEMA.md.** Update it to the current version: rename TITLE_COX/TITLE_DELTA/TITLE_3RDPARTY to COX_COVER/DELTA_COVER/THIRD_PARTY_COVER, add COVER_TEMPLATE, the `logo` and `job_block` map values, `fontWeight`, the `CUSTOM:` profile path, and the measured profile naming `<BASE>_<LAYOUT>`.
10. **P3 - Zone defaults.** `applyRuleToWrapper` defaults fontWeight to 'bold'. Our zones carry measured fontSize but no weight; consider defaulting replacement text in title blocks to 'normal'. Also note the page-1 guardrail (Times only for cust) already matches our cover zones.
11. **P3 - Confidence surfacing.** Show the profile's `low_confidence` (fewer than 3 pages) and match score in the scan-confidence indicator, so the operator reviews rare layouts.

## 7. How match_layout.py feeds the app
`venv/bin/python match_layout.py <pdf> [--pages 1,3]` prints JSON per page with: `layout_id`, `profile_key` (the key in layouts_overlay.json), `base_profile` (the built-in fallback), `placement` (exact | affine), `zones` (diagnostic) and **`app_zones`** (exact LAYOUT_RULES shape, with cox_check already resolved for that page and affine placement applied). The app or a pre-processor can call `applyRuleToWrapper(wrapper, app_zones)` per page, or set the page select to `profile_key`. Unmatched pages return `profile_key: null` and `app_zones: []`. The app then keeps its own AUTO choice (`base_profile` is what it would pick).

## 8. Files
- `/workspace/pdf-layouts/layouts_overlay.json`: **the drop-in export** `{PROFILE_KEY: [zones]}`. Merge into LAYOUT_RULES, or store as `cox_custom_profiles`.
- `/workspace/pdf-layouts/layouts_overlay.meta.json`: schema, app ref, load paths, a per-profile index (layout_id, base_profile, class, orientation, edge, template_hash, title_block_bbox, n_pages, n_pdfs, eras, low_confidence, cox_check_fields), and the not-exported list.
- `layouts.json` (diagnostics + fingerprints), `page_index.*`, `png/<layout_id>.png`, `match_layout.py`, `appexport.py` (diagnostics -> export), `LAYOUT-REPORT.md`.

## 9. Leak check after the rewrite
- layouts.json: 0 string hits, 0 phone-pattern hits
- layouts_overlay.json: 0 string hits, 0 phone-pattern hits
- layouts_overlay.meta.json: 0 string hits, 0 phone-pattern hits
- page_index.csv: 0 string hits, 0 phone-pattern hits
- page_index.json: 0 string hits, 0 phone-pattern hits
- LAYOUT-REPORT.md: 0 string hits, 0 phone-pattern hits
- ALIGNMENT-NOTES.md: 0 string hits, 0 phone-pattern hits
- PNGs (198): 0 string hits, 0 phone-pattern hits
