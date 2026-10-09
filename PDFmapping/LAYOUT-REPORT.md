# PDF border / title-block layout map

2026-10-09 08:52 . Coordinates are 0-1 fractions, top-left origin, displayed page (same as SCHEMATICai `LAYOUT_RULES`).

**Scope (per Thomas, Oct 9):** only page borders, title blocks / cover borders, and boxes holding company or personal info that is *not* Cox Research branding (customer, job, address, phone, fax, PO, serial, third-party company, drawn-by, unrecognised title-block entries), plus cpid/date/stage/type where they sit in the title block or cover. Schematic content, BOM tables, option tables and info-page spec rows are **not** mapped.

## Headline
- **198 unique layouts** (cap ~200): {'SHEET': 113, 'COVER': 18, 'INFO': 59, 'NOTB': 8}; 84 distinct title-block templates; title-block edge {'bottom': 159, 'right': 2, 'left': 7}.
- **127 new** vs the pilot; **71** layouts contain pilot pages. The pilot's 83 layouts become 65 under this scope, because drawing and BOM pages share one border/title block (class `SHEET`); INFO keeps its own layout because its header carries customer/job boxes.
- Fully processed: 266 PDFs / 2082 pages (pilot 150 PDFs + 116 picked for unseen fingerprints). Every one of the 5849 local PDFs (~45k pages) was geometry-screened first, so duplicates were never OCR'd.
- Zones: 1824 usable - sensitive 1133, border 344, overlay 251, cox_brand 96; 74 sensitive zones are `cox_check` (mixed Cox / other company).

## How uniqueness was found
1. `screen.py` (no OCR except a 100-dpi band on page-1 covers, positions only): title-block edge, title-block bbox, placement-invariant line fingerprint, page-class guess, border. Checked against the pilot: class agreed on 99.3% of pages, placement on 96.6%.
2. `novelty.py`: keys = title-block template x placement x (INFO|SHEET); covers = border|orientation|cpid row|contact-block row; no-title-block = border|orientation|size. Tier 1 = title block never seen, tier 2 = new cover / no-title-block group / new class, tier 3 = known template at a shifted placement (`match_layout.py` re-places these by affine). A greedy set cover picks the fewest PDFs carrying unseen keys.
3. Three extraction batches (9 + 53 + 54 PDFs), rebuilt after each; stopped at 198 layouts.

## Coverage by era (layouts with pages from that era)
| era | SHEET | INFO | COVER | NOTB |
|---|---|---|---|---|
| CP3000s | 58 | 25 | 5 | 5 |
| CP4000s | 28 | 15 | 9 | 5 |
| CP5000s | 20 | 14 | 6 | 2 |
| CP6000s | 12 | 9 | 5 | 6 |
| CP7000s | 18 | 16 | 6 | 4 |
| CP8000s | 5 | 4 | 2 | 0 |
No pre-CP3000 PDFs exist locally (staging holds CP-3000 to CP-8377).

## Cox branding vs. sensitive
- A box counts as Cox branding on a page when its OCR names Cox, or it holds a contact line that across >=5 PDFs appears almost only next to the Cox name (Cox's own address, phone and fax). Reference strings are kept in memory only.
- A zone is `cox_brand` (not redacted, map=custom, transparent) only if it is Cox on >=98% of member pages. If the share is between 0 and 98% (the template is used by Cox on most jobs and by another company or rep on others), the zone stays `sensitive` with `cox_check`. `match_layout.py` then reads that page's OCR and releases the box only when it names Cox.
- Some large templates carry a constant company block that never shows the Cox name in OCR text (the logo may be an image). They stay sensitive. If Thomas confirms one is a Cox identity, add its template to `COX_ALIAS_TEMPLATES` in build.py.
- Unrecognised title-block entries (third-party grids, revision initials, project-title cells) are covered by `tb_text_cell_N` sensitive zones: any non-label, non-cpid/date/stage, non-Cox text cell present on >=50% of member pages.

## Largest new layouts
| layout | class | pages | PDFs | eras | edge | zones (sensitive) |
|---|---|---|---|---|---|---|
| TB01d-SHEET | SHEET | 25 | 2 | 7000s | bottom | 15 (10) |
| TB10a-SHEET | SHEET | 20 | 1 | 5000s | bottom | 19 (9) |
| TB08a-SHEET | SHEET | 15 | 5 | 3000s, 4000s | bottom | 7 (4) |
| TB11a-SHEET | SHEET | 14 | 1 | 3000s | bottom | 26 (16) |
| TB12a-SHEET | SHEET | 13 | 1 | 5000s | bottom | 10 (7) |
| TB14a-SHEET | SHEET | 9 | 2 | 4000s, 5000s | bottom | 14 (9) |
| TB17a-SHEET | SHEET | 8 | 1 | 5000s | bottom | 11 (7) |
| TB03b-SHEET | SHEET | 8 | 1 | 6000s | bottom | 19 (14) |
| TB18a-SHEET | SHEET | 7 | 1 | 5000s | bottom | 12 (8) |
| TB01c-INFO | INFO | 7 | 7 | 6000s, 7000s | bottom | 16 (10) |
| TB19a-SHEET | SHEET | 6 | 1 | 5000s | bottom | 11 (7) |
| TB23a-SHEET | SHEET | 6 | 1 | 4000s | bottom | 7 (4) |
| TB21a-SHEET | SHEET | 6 | 1 | 3000s | bottom | 6 (3) |
| TB20a-SHEET | SHEET | 6 | 1 | 3000s | bottom | 6 (3) |
| TB15a-SHEET | SHEET | 6 | 1 | 5000s | bottom | 10 (7) |
| TB08b-SHEET | SHEET | 6 | 2 | 3000s, 4000s | bottom | 7 (4) |
| TB27a-SHEET | SHEET | 5 | 2 | 3000s | bottom | 6 (3) |
| TB13a-SHEET | SHEET | 5 | 1 | 3000s | bottom | 7 (4) |
| TB13b-SHEET | SHEET | 5 | 1 | 3000s | bottom | 9 (6) |
| TB26a-SHEET | SHEET | 5 | 1 | 3000s | bottom | 8 (5) |
| TB34a-SHEET | SHEET | 5 | 1 | 5000s | right | 11 (9) |
| TB24a-SHEET | SHEET | 5 | 1 | 3000s | bottom | 7 (4) |
| TB22a-SHEET | SHEET | 4 | 1 | 3000s | bottom | 7 (4) |
| TB32a-SHEET | SHEET | 4 | 1 | 3000s | bottom | 8 (5) |
| TB25a-SHEET | SHEET | 4 | 1 | 3000s | bottom | 6 (3) |

## Profiles
Profile keys as they exist in app.js: TITLE, TITLE_ASBUILT, COX_COVER, DELTA_COVER, THIRD_PARTY_COVER, COVER_TEMPLATE, INFO, INFO_BORDERLESS, SCHEMATIC_PORTRAIT(_BORDERLESS), SCHEMATIC_LANDSCAPE(_BORDERLESS), DOOR_DRAWING, GENERAL. 0 of 198 layouts fit a built-in profile at IoU >= 0.5. Use the measured zones (proposed keys `COX_<layout>` in layouts.json).

## Accuracy
- The CP number read from the measured cpid zone matches the file name on 1827/1852 pages (98.7%).
- 82 layouts are single-page (rare title blocks / covers). Their zones come from that page or the parent template; confidence is lower, and low-confidence zones are in `flagged_zones`.
- **Hold-out** (12 PDFs never processed, 2 per thousand): `match_layout.py` assigned a layout to 74/87 pages (85%), 73 at an exact placement. Unmatched pages get zones=[].

## Leak check (leakcheck.py)
- 979 raw strings from every sensitive box and every non-generic cover line (private cache) were searched in every deliverable, plus OCR of all 198 PNGs.
- layouts.json: 0 string hits, 0 phone-pattern hits.
- layouts_overlay.json: 0 string hits, 0 phone-pattern hits.
- layouts_overlay.meta.json: 0 string hits, 0 phone-pattern hits.
- page_index.csv: 0 string hits, 0 phone-pattern hits.
- page_index.json: 0 string hits, 0 phone-pattern hits.
- LAYOUT-REPORT.md: 0 string hits, 0 phone-pattern hits.
- ALIGNMENT-NOTES.md: 0 string hits, 0 phone-pattern hits.
- PNGs: 0 string hits, 0 phone-pattern hits.

## SCHEMATICai alignment (see ALIGNMENT-NOTES.md)
- App-facing export: `layouts_overlay.json` = `{PROFILE_KEY: [zones]}` in exact LAYOUT_RULES shape (map,x,y,w,h,fontSize,transparent,fontFamily,textAlign[,rotation][,text]); keys `<BASE>_<LAYOUT>` e.g. `SCHEMATIC_PORTRAIT_TB01A`, `INFO_TB01A`, `COVER_TEMPLATE_COV01`. Metadata and the profile index are in `layouts_overlay.meta.json`.
- Map keys are only those app.js fills (cust, job, type, cpid, date, stage, po, serial, company, address, phone, fax, logo, custom). Landmarks and Cox-brand zones are not exported. No-title-block groups are not exported (their fixed zones fail).
- Unavoidable mismatches: no built-in fits (best IoU 0.39); cox_check and affine re-placement need program support; REDACTION_SCHEMA.md still uses TITLE_COX/TITLE_DELTA/TITLE_3RDPARTY (code: COX_COVER/DELTA_COVER/THIRD_PARTY_COVER).
- Spot-check of 24 layouts (PNG review): 13 pass, 6 warn, 5 fail (all 5 are no-title-block groups, excluded from the export).

## Files (/workspace/pdf-layouts, private)
- `layouts.json`: layout -> fingerprint (template lines, title-block bbox, cover key), zones[] (SCHEMATICai zone + field, role, redact, cox_brand_rate, cox_check, rel_tb, confidence), flagged_zones[].
- `page_index.csv/json`: every processed page -> layout, per-field bboxes, per-field Cox flag; text only for cpid/date/stage/generic type.
- `png/<layout>.png`: one per layout; all non-label text and every sensitive box blanked before drawing. Red = redact, magenta = title-block overlay, green = border/title block, blue = Cox brand.
- `match_layout.py <pdf> [--pages] [--include-flagged]`: page -> layout, `profile_key`, `base_profile`, diagnostic zones and `app_zones` (LAYOUT_RULES shape; exact or affine placement, cox_check resolved per page).
- `layouts_overlay.json` / `layouts_overlay.meta.json`: SCHEMATICai drop-in export (appexport.py). `ALIGNMENT-NOTES.md`: nomenclature, accuracy, program-side recommendations.
- Pipeline: screen.py, novelty.py, grow.sh (extract.py, reocr.py, notb_ocr.py), analyze.py, fields.py, build.py, render_png.py, leakcheck.py, report.py.
