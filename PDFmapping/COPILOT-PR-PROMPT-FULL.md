# Copilot agent brief — SCHEMATICai measured overlay profiles PR

You are implementing a PR on **grilledcheezuss/SCHEMATICai**. Attach/use every file in this pack. Prefer facts from these files over guessing. Measured against app commit `3a9159e8` (APP_VERSION **v2.5.113**). Export schema: `schematicai-layout-rules/1.0`.

## Attachments in this pack (use all of them)
| File | Why |
|---|---|
| `layouts_overlay_core.json` | **Ship these 81 profiles** into `LAYOUT_RULES` |
| `layouts_overlay.json` | Full 186 profiles (core + long tail); long tail via import or second commit |
| `layouts_overlay.meta.json` | Per-profile `layout_id`, `base_profile`, `template_hash`, `title_block_bbox`, `n_pages`, `cox_check_fields`, `low_confidence`, `not_exported` |
| `LAYOUT_FINGERPRINTS.json` | AUTO matcher input: fingerprints + bbox + tolerances keyed by `PROFILE_KEY` |
| `ALIGNMENT-NOTES.md` | Full accuracy audit + program-side P1/P2/P3 recommendations |
| `LAYOUT-REPORT.md` | How layouts were discovered; coverage by era |
| `zone_examples_snippet.json` | Example zone objects (sanity-check shape) |
| `match_layout.py` | Offline Python reference for matching + affine + cox_check; **port concepts, do not require Python at runtime** |
| `PR-PACK-MANIFEST.json` | Pack inventory |

## Goal
Built-in `LAYOUT_RULES` zones do not land on real Cox title-block cells (best mean IoU ≈ 0.39). We measured production PDF borders/title blocks and exported drop-in profiles. This PR must:

1. Merge the **81 core** profiles from `layouts_overlay_core.json` into `LAYOUT_RULES` (keep all 14 existing built-ins unchanged).
2. Teach AUTO to select measured profiles via title-block fingerprints (`LAYOUT_FINGERPRINTS.json`).
3. Fix page-1 cover precedence (stop hard-locking only `COVER_TEMPLATE`).
4. Fix rotation-aware PDF export so boxes match the displayed page.
5. Make the profile dropdown dynamic; add JSON import for the long tail.
6. Sync `REDACTION_SCHEMA.md` to actual code names.

Scope of zones: **borders + non-Cox company/personal title-block info only**. No schematic internals, BOM tables, or info-page spec rows.

## Live app contract (code, not the outdated schema doc)
`const LAYOUT_RULES` keys today (14):  
`TITLE`, `TITLE_ASBUILT`, `INFO`, `INFO_BORDERLESS`, `SCHEMATIC_PORTRAIT`, `SCHEMATIC_PORTRAIT_BORDERLESS`, `SCHEMATIC_LANDSCAPE`, `SCHEMATIC_LANDSCAPE_BORDERLESS`, `DOOR_DRAWING`, `COX_COVER`, `DELTA_COVER`, `THIRD_PARTY_COVER`, `COVER_TEMPLATE`, `GENERAL`.

`applyRuleToWrapper` accepts: `x,y,w,h,map,fontSize,text,decoration,fontWeight,transparent,rotation,fontFamily,textAlign`. Any other key is ignored.

`refreshContent` map keys: `cust`, `job`, `job_block`, `type`, `cpid`, `date`, `stage`, `po`, `serial`, `company`, `address`, `phone`, `fax`, `logo`, `custom` (uses `text`).

Coords: **0–1, top-left, displayed page**. `transparent:false` = opaque whiteout (draw opaque first).

Custom profiles already work via `localStorage['cox_custom_profiles']` as `{name: [zones]}`, select value `CUSTOM:<name>`.

### Current AUTO (must improve)
- `updatePageProfile` (~line 3474): page 1 → COVER_TEMPLATE, page 2 → INFO, else landscape/portrait by aspect.
- `applyPage1CoverTemplate`: **forces** COVER_TEMPLATE and disables page-1 dropdown.
- `PageClassifier.classify` (~line 2686): door / borderless / as-built / Cox / Delta refinements.
- `refreshProfileOptions` (~line 3418): **hard-coded** `<option>` list — new keys never appear.
- Export (~lines 4560–4590): uses `getWidth`/`getHeight` without `/Rotate` transform — wrong on rotated pages; page-1 whiteout can be skipped when a template is set.

`REDACTION_SCHEMA.md` still says TITLE_COX/TITLE_DELTA/TITLE_3RDPARTY and “13 built-ins”; code uses COX_COVER/DELTA_COVER/THIRD_PARTY_COVER + COVER_TEMPLATE (14).

## Profile naming already in the JSON
`<BASE>_<LAYOUT>` UPPER_SNAKE, e.g. `SCHEMATIC_PORTRAIT_TB01A`, `INFO_TB01A`, `COVER_TEMPLATE_COV01`.

Core keys (81):
```
COVER_TEMPLATE_COV01
COVER_TEMPLATE_COV02
COVER_TEMPLATE_COV09
COVER_TEMPLATE_COV10
INFO_TB01A
INFO_TB01B
INFO_TB01C
INFO_TB02A
INFO_TB02B
INFO_TB02C
INFO_TB02D
INFO_TB03A
INFO_TB04A
INFO_TB05A
INFO_TB06A
INFO_TB06B
INFO_TB07A
INFO_TB09A
INFO_TB22A
SCHEMATIC_LANDSCAPE_BORDERLESS_TB34A
SCHEMATIC_LANDSCAPE_BORDERLESS_TB40A
SCHEMATIC_PORTRAIT_BORDERLESS_TB18A
SCHEMATIC_PORTRAIT_TB01A
SCHEMATIC_PORTRAIT_TB01B
SCHEMATIC_PORTRAIT_TB01C
SCHEMATIC_PORTRAIT_TB01D
SCHEMATIC_PORTRAIT_TB01E
SCHEMATIC_PORTRAIT_TB02A
SCHEMATIC_PORTRAIT_TB02B
SCHEMATIC_PORTRAIT_TB02C
SCHEMATIC_PORTRAIT_TB02D
SCHEMATIC_PORTRAIT_TB02E
SCHEMATIC_PORTRAIT_TB03A
SCHEMATIC_PORTRAIT_TB03B
SCHEMATIC_PORTRAIT_TB04A
SCHEMATIC_PORTRAIT_TB04B
SCHEMATIC_PORTRAIT_TB04C
SCHEMATIC_PORTRAIT_TB04D
SCHEMATIC_PORTRAIT_TB05A
SCHEMATIC_PORTRAIT_TB06A
SCHEMATIC_PORTRAIT_TB06B
SCHEMATIC_PORTRAIT_TB07A
SCHEMATIC_PORTRAIT_TB08A
SCHEMATIC_PORTRAIT_TB08B
SCHEMATIC_PORTRAIT_TB09A
SCHEMATIC_PORTRAIT_TB09B
SCHEMATIC_PORTRAIT_TB10A
SCHEMATIC_PORTRAIT_TB11A
SCHEMATIC_PORTRAIT_TB12A
SCHEMATIC_PORTRAIT_TB13A
SCHEMATIC_PORTRAIT_TB13B
SCHEMATIC_PORTRAIT_TB14A
SCHEMATIC_PORTRAIT_TB15A
SCHEMATIC_PORTRAIT_TB15B
SCHEMATIC_PORTRAIT_TB16A
SCHEMATIC_PORTRAIT_TB17A
SCHEMATIC_PORTRAIT_TB19A
SCHEMATIC_PORTRAIT_TB20A
SCHEMATIC_PORTRAIT_TB21A
SCHEMATIC_PORTRAIT_TB22A
SCHEMATIC_PORTRAIT_TB23A
SCHEMATIC_PORTRAIT_TB24A
SCHEMATIC_PORTRAIT_TB25A
SCHEMATIC_PORTRAIT_TB26A
SCHEMATIC_PORTRAIT_TB27A
SCHEMATIC_PORTRAIT_TB28A
SCHEMATIC_PORTRAIT_TB29A
SCHEMATIC_PORTRAIT_TB30A
SCHEMATIC_PORTRAIT_TB31A
SCHEMATIC_PORTRAIT_TB32A
SCHEMATIC_PORTRAIT_TB33A
SCHEMATIC_PORTRAIT_TB35A
SCHEMATIC_PORTRAIT_TB36A
SCHEMATIC_PORTRAIT_TB38A
SCHEMATIC_PORTRAIT_TB39A
SCHEMATIC_PORTRAIT_TB41A
SCHEMATIC_PORTRAIT_TB44A
SCHEMATIC_PORTRAIT_TB47A
SCHEMATIC_PORTRAIT_TB48A
SCHEMATIC_PORTRAIT_TB52A
THIRD_PARTY_COVER_COV12
```

Example zones (truncated — full arrays are in the JSON files):
```json
{
  "SCHEMATIC_PORTRAIT_TB01A": [
    {
      "map": "custom",
      "x": 0.4525,
      "y": 0.9303,
      "w": 0.3051,
      "h": 0.0412,
      "fontSize": 14,
      "transparent": false,
      "fontFamily": "'Courier New', monospace",
      "textAlign": "left",
      "text": ""
    },
    {
      "map": "custom",
      "x": 0.386,
      "y": 0.9162,
      "w": 0.4201,
      "h": 0.0708,
      "fontSize": 14,
      "transparent": false,
      "fontFamily": "'Courier New', monospace",
      "textAlign": "left",
      "text": ""
    },
    {
      "map": "custom",
      "x": 0.6626,
      "y": 0.9055,
      "w": 0.1528,
      "h": 0.0087,
      "fontSize": 6,
      "transparent": false,
      "fontFamily": "'Courier New', monospace",
      "textAlign": "left",
      "text": ""
    }
  ],
  "INFO_TB01A": [
    {
      "map": "custom",
      "x": 0.4518,
      "y": 0.9303,
      "w": 0.3058,
      "h": 0.0418,
      "fontSize": 14,
      "transparent": false,
      "fontFamily": "'Courier New', monospace",
      "textAlign": "left",
      "text": ""
    },
    {
      "map": "custom",
      "x": 0.386,
      "y": 0.9162,
      "w": 0.4201,
      "h": 0.0708,
      "fontSize": 14,
      "transparent": false,
      "fontFamily": "'Courier New', monospace",
      "textAlign": "left",
      "text": ""
    },
    {
      "map": "custom",
      "x": 0.6626,
      "y": 0.9055,
      "w": 0.1528,
      "h": 0.0087,
      "fontSize": 6,
      "transparent": false,
      "fontFamily": "'Courier New', monospace",
      "textAlign": "left",
      "text": ""
    }
  ],
  "COVER_TEMPLATE_COV01": [
    {
      "map": "custom",
      "x": 0.3569,
      "y": 0.8928,
      "w": 0.2792,
      "h": 0.0351,
      "fontSize": 14,
      "transparent": false,
      "fontFamily": "'Courier New', monospace",
      "textAlign": "center",
      "text": ""
    },
    {
      "map": "custom",
      "x": 0.3231,
      "y": 0.8928,
      "w": 0.3522,
      "h": 0.0725,
      "fontSize": 14,
      "transparent": false,
      "fontFamily": "'Courier New', monospace",
      "textAlign": "center",
      "text": ""
    },
    {
      "map": "logo",
      "x": 0.3224,
      "y": 0.2149,
      "w": 0.4047,
      "h": 0.1536,
      "fontSize": 14,
      "transparent": false,
      "fontFamily": "'Courier New', monospace",
      "textAlign": "center"
    }
  ]
}
```

## Implementation checklist

### A. Merge data
- [ ] Add `layouts_overlay_core.json` contents into `LAYOUT_RULES` (or `LAYOUT_RULES_MEASURED` Object.assign’d at init so `Object.keys(LAYOUT_RULES)` includes them).
- [ ] Embed or load `LAYOUT_FINGERPRINTS.json` as `LAYOUT_FINGERPRINTS` (by_profile_key + match_tolerances).
- [ ] Do not rename/delete existing 14 built-ins.
- [ ] Confirm no customer/PII strings in the diff (profiles are geometry + empty custom text only).

### B. P1 LayoutMatcher (required)
Before page-index/aspect fallback:
1. Build axis-aligned line fingerprint of title-block band from pdf.js operator list (or equivalent vector geometry).
2. Score against each fingerprint in `LAYOUT_FINGERPRINTS.by_profile_key` using `match_tolerances` (accept_score ≥ 0.70; tb bbox within 0.008).
3. On hit → set page profile to that `PROFILE_KEY`.
4. On miss → existing AUTO + PageClassifier.

**Page-1 precedence (required):**
1. Measured cover profile if matcher hits  
2. Else COX_COVER / THIRD_PARTY_COVER / DELTA_COVER from classifier text  
3. Else COVER_TEMPLATE  
Re-enable page-1 dropdown (or explicit override).

Port matching ideas from `match_layout.py` (`profile_key`, `app_zones`, affine placement, cox_check resolution). Do **not** shell out to Python in the browser.

### C. P1 Rotation-aware export (required)
Transform zones by `page.getRotation()` before drawing:
- 90°: x′=y, y′=1−x−w, swap w/h; rotate text accordingly  
- 180° / 270° likewise  
Also ensure page-1 opaque whiteouts still draw when a cover template is active.

### D. P2 Editor + import
- Build profile `<option>`s from `Object.keys(LAYOUT_RULES)`, grouped (Cover / Info / Schematic / Measured).
- “Import profiles JSON” → merge into `cox_custom_profiles` for the remaining 105 long-tail keys in `layouts_overlay.json` where `low_confidence` is true in meta.

### E. P2 Nice-to-have in this PR if small
- Zone prop `coxCheck: true`: skip whiteout when in-box text contains Cox (meta lists `cox_check_fields` per profile). Until then, blank-over-wrong on mixed templates is intentional.
- Affine re-placement using `title_block_bbox` + relative coords so placement-suffix variants collapse.

### F. Docs + tests
- Update `REDACTION_SCHEMA.md` to real key names + COVER_TEMPLATE + logo/job_block + measured naming + AUTO matcher.
- Unit tests: matcher fixtures for TB01A / INFO_TB01A / COV01 (synthetic line sets only — **never commit customer PDFs**); rotation 90/270; existing `tests/sheets-overlay.test.js` etc. stay green.
- PR body manual checklist: portrait schematic, info page, cover — whiteouts on title-block customer/company cells only; schematic content untouched.

## Out of scope
- NOTB (no-title-block) groups — failed accuracy review; listed in `meta.not_exported`; leave on legacy AUTO.
- Schematic/BOM/spec field mapping.
- Worker API changes unless export absolutely requires them (prefer client transform first).
- Deleting or renaming built-in profile keys.

## Acceptance criteria
- [ ] 81 core profiles in LAYOUT_RULES with valid zones  
- [ ] AUTO can select measured profiles from geometry; page 1 not hard-locked solely to COVER_TEMPLATE  
- [ ] Export correct on rotated pages  
- [ ] Dropdown lists new keys; JSON import works for long tail  
- [ ] REDACTION_SCHEMA.md matches code  
- [ ] No PII in diff  
- [ ] Tests green + new matcher/rotation tests  

## Suggested PR title / summary
**Title:** Add measured Cox title-block overlay profiles + AUTO matcher  
**Summary:** Ships 81 production-measured border/title-block profiles aligned to live `LAYOUT_RULES` zone props, adds fingerprint AUTO selection from `LAYOUT_FINGERPRINTS`, fixes page-1 cover precedence and rotation-aware export, and syncs redaction docs to code names (`COX_COVER` / `COVER_TEMPLATE`, etc.).

## Accuracy context (do not weaken these rules)
Spot-check of 24 layouts: 13 pass / 6 warn / 5 fail. All 5 fails were NOTB — excluded from export. Cover cust/job zones are flow envelopes (blanking OK, exact text placement not). CPID zone vs filename: 98.7%. Hold-out: 74/87 pages matched. Details in ALIGNMENT-NOTES.md §§3–4 and LAYOUT-REPORT.md.

## Program recommendations priority (implement P1 in this PR)
See ALIGNMENT-NOTES.md §6. Summary: P1 matcher + page-1 precedence + rotation export; P2 coxCheck, affine, bulk import, dynamic dropdown; P3 NOTB runtime detect, schema doc, fontWeight default, confidence UI.

---
After implementing, open the PR against main with the checklist above filled in. If anything in the JSON conflicts with current main (post-3a9159e8), prefer current main’s `applyRuleToWrapper` contract and adapt zone props — do not invent new map keys.
