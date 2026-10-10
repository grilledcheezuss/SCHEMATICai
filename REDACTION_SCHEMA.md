# SCHEMATICA ai Redaction Profile Schema

## Release: v2.5.115

## Overview

Profiles define normalized overlay zones for **visual masking/title-block replacement**, not secure irreversible redaction. Export copies source PDF pages and draws rectangles/text over their content; underlying text/images may still be extracted. Replacing the cover removes that source page from the generated document, but does not make masking on other pages secure. Original print/download always uses the original PDF.

Coordinates are fractions of the **displayed, rotation-applied CropBox**, with a top-left origin; they are not canvas backing pixels or PDF MediaBox fractions. PDF.js viewport transforms, not `pdf-render-helper.js` DPR metrics, define the inverse transform used by output.

---

## Profile Structure

A redaction profile is defined in the `LAYOUT_RULES` object:

```javascript
const LAYOUT_RULES = {
  PROFILE_NAME: [
    // Array of redaction zone definitions
    { 
      map: "field_key",
      x: 0.15,
      y: 0.42,
      w: 0.7,
      h: 0.04,
      fontSize: 24,
      transparent: false,
      fontFamily: "'Times New Roman', serif",
      textAlign: 'center',
      rotation: 0,
      decoration: 'none'
    }
  ]
}
```

---

## Zone Properties

### Required Properties

#### `map` (string)
**Purpose**: Maps the zone to a specific data field or custom text.

**Values**:
- **Sensitive Field Keys**:
  - `"cust"` - Customer/Client name
  - `"job"` - Job/Project identifier
  - `"type"` - System type
  - `"cpid"` - Control Panel ID
  - `"date"` - Date
  - `"stage"` - Project stage (e.g., "SUBMITTAL", "AS-BUILT")
  - `"po"` - Purchase Order number
  - `"serial"` - Serial number
  - `"company"` - Company name
  - `"address"` - Address
  - `"phone"` - Phone number
  - `"fax"` - Fax number
- **Special Values**:
  - `"custom"` - Static text (requires `text` property)

**Example**:
```javascript
{ map: "cust", ... }      // Customer field
{ map: "custom", text: "CONTROL PANEL", ... }  // Static text
```

---

#### `x` (number, 0-1)
**Purpose**: Horizontal position as a fraction of page width.

**Range**: 0.0 (left edge) to 1.0 (right edge)

**Units**: Relative to page width

**Example**:
```javascript
{ x: 0.15, ... }  // 15% from left edge
{ x: 0.5, ... }   // Center horizontally
```

---

#### `y` (number, 0-1)
**Purpose**: Vertical position as a fraction of page height.

**Range**: 0.0 (top edge) to 1.0 (bottom edge)

**Units**: Relative to page height

**Note**: Origin (0,0) is at the top-left corner in the UI, but converted to bottom-left for PDF coordinate system during export.

**Example**:
```javascript
{ y: 0.42, ... }  // 42% from top edge
{ y: 0.9, ... }   // Near bottom
```

---

#### `w` (number, 0-1)
**Purpose**: Zone width as a fraction of page width.

**Range**: 0.0 to 1.0

**Units**: Relative to page width

**Example**:
```javascript
{ w: 0.7, ... }   // 70% of page width
{ w: 0.25, ... }  // 25% of page width
```

---

#### `h` (number, 0-1)
**Purpose**: Zone height as a fraction of page height.

**Range**: 0.0 to 1.0

**Units**: Relative to page height

**Example**:
```javascript
{ h: 0.04, ... }  // 4% of page height
{ h: 0.06, ... }  // 6% of page height
```

---

#### `fontSize` (number)
**Purpose**: Font size in points for rendered text.

**Range**: Typically 8-72 points

**Units**: PDF points (1/72 inch)

**Example**:
```javascript
{ fontSize: 24, ... }  // Large text
{ fontSize: 10, ... }  // Small text
```

---

#### `transparent` (boolean)
**Purpose**: Controls whether the zone has an opaque white background (whiteout) or transparent overlay.

**Values**:
- `false` - Opaque white background (covers underlying content)
- `true` - Transparent overlay (text appears over original content)

**Export Behavior**:
- **Opaque zones** are drawn first to ensure whiteout coverage
- **Transparent zones** are drawn afterward as text overlays

**Example**:
```javascript
{ transparent: false, ... }  // Whiteout box
{ transparent: true, ... }   // Transparent text overlay
```

---

#### `fontFamily` (string)
**Purpose**: CSS font family for text rendering.

**Common Values**:
- `"'Times New Roman', serif"` - Serif font
- `"'Courier New', monospace"` - Monospace font
- `"'Arial', sans-serif"` - Sans-serif font

**Example**:
```javascript
{ fontFamily: "'Courier New', monospace", ... }
```

---

#### `textAlign` (string)
**Purpose**: Horizontal text alignment within the zone.

**Values**:
- `"left"` - Align to left edge
- `"center"` - Center horizontally
- `"right"` - Align to right edge

**Example**:
```javascript
{ textAlign: 'center', ... }  // Centered text
{ textAlign: 'right', ... }   // Right-aligned
```

---

### Optional Properties

#### `rotation` (number)
**Purpose**: Rotation angle for text in degrees.

**Values**:
- `-90` - 90° counter-clockwise (vertical left)
- `0` - No rotation (default)
- `90` - 90° clockwise (vertical right)

**Note**: Rotation is applied around the zone's center point. Underline decorations are properly transformed for rotated text.

**Example**:
```javascript
{ rotation: 90, ... }   // Vertical text (clockwise)
{ rotation: -90, ... }  // Vertical text (counter-clockwise)
```

---

#### `decoration` (string)
**Purpose**: Text decoration style.

**Values**:
- `"underline"` - Underline text
- `"none"` - No decoration (default)

**Note**: Underline works with rotated text using proper transform calculations.

**Example**:
```javascript
{ decoration: 'underline', ... }
```

---

#### `text` (string)
**Purpose**: Static text for custom zones (only when `map: "custom"`).

**Example**:
```javascript
{ map: "custom", text: "CONTROL PANEL", ... }
```

---

## Built-in Profiles

SCHEMATICA ai retains 14 built-in layout profiles:

### Title Sheets
1. **TITLE** - Standard title sheet
2. **TITLE_ASBUILT** - As-built title sheet
3. **COX_COVER** - Cox-specific title sheet
4. **DELTA_COVER** - Delta-specific title sheet
5. **THIRD_PARTY_COVER** - Third-party title sheet
6. **COVER_TEMPLATE** - Forced replacement cover on source page 1

### Info Pages
7. **INFO** - Standard info page with border
8. **INFO_BORDERLESS** - Borderless info page

### Schematics
9. **SCHEMATIC_PORTRAIT** - Portrait schematic with border
10. **SCHEMATIC_PORTRAIT_BORDERLESS** - Portrait schematic without border
11. **SCHEMATIC_LANDSCAPE** - Landscape schematic with border
12. **SCHEMATIC_LANDSCAPE_BORDERLESS** - Landscape schematic without border

### Specialty
13. **DOOR_DRAWING** - Door/enclosure drawings
14. **GENERAL** - Fallback profile

---

## Example: Complete Profile

```javascript
TITLE: [
  // Customer name - large, centered
  { 
    map: "cust",
    x: 0.15,
    y: 0.42,
    w: 0.7,
    h: 0.04,
    fontSize: 24,
    transparent: false,
    fontFamily: "'Times New Roman', serif",
    textAlign: 'center'
  },
  
  // Job number - monospace, centered
  { 
    map: "job",
    x: 0.15,
    y: 0.502,
    w: 0.7,
    h: 0.04,
    fontSize: 22,
    transparent: false,
    fontFamily: "'Courier New', monospace",
    textAlign: 'center'
  },
  
  // Static text label
  { 
    map: "custom",
    text: "CONTROL PANEL",
    x: 0.15,
    y: 0.569,
    w: 0.7,
    h: 0.04,
    fontSize: 18,
    transparent: false,
    fontFamily: "'Courier New', monospace",
    textAlign: 'center'
  },
  
  // Panel ID - small, right-aligned
  { 
    map: "cpid",
    x: 0.835,
    y: 0.948,
    w: 0.15,
    h: 0.03,
    fontSize: 12,
    transparent: false,
    fontFamily: "'Courier New', monospace",
    textAlign: 'right'
  }
]
```

---

## Auto-Detection

The system can automatically detect which profile to use based on:

1. **Content Analysis**: Scanning for keywords (SUBMITTAL, AS-BUILT, etc.)
2. **Layout Heuristics**: Analyzing text density and distribution
3. **Position Clues**: Detecting title blocks and info sections
4. **HP Matching**: Fuzzy matching with ±10% tolerance

---

## Custom Profiles

Users can create custom profiles by:

1. **Upload**: Upload a reference PDF to auto-generate zones
2. **Manual**: Manually place redaction boxes in the editor
3. **Export**: Export the configuration for reuse

Custom profiles are stored in browser localStorage and can be:
- Applied to specific pages
- Used as defaults for new documents
- Exported as JSON for sharing

---

## Editor Visibility

In editor mode (`body.editor-active`):

- **Opaque zones**: Solid purple border (#9333ea)
- **Transparent zones**: Dashed purple border (#9333ea)
- **Selected zones**: Pink border and glow (#ec4899)
- **All zones**: Always visible and interactive (pointer-events: auto)

This ensures zones are never accidentally hidden by opacity or toggle settings.

---

## Export Behavior

### Zone Drawing Order
1. **Opaque whiteout zones** (transparent: false) - Drawn first
2. **Transparent text overlays** (transparent: true) - Drawn second

This ensures proper layering: whiteouts cover content, then text appears on top.

### Coordinate Transformation
- UI coordinates (top-left origin) → PDF coordinates (bottom-left origin)
- Relative positions (0-1) → Absolute PDF points
- Rotation applied around zone center

### Text Rendering
- Font selection (Times Roman or Courier)
- Width calculation for alignment
- Rotation transform for vertical text
- Underline with proper rotation transform

---

## Field Mapping Reference

| Field Key | Description | Typical Use |
|-----------|-------------|-------------|
| `cust` | Customer/Client | Company name |
| `job` | Job/Project | Project identifier |
| `type` | System Type | Pump type, system category |
| `cpid` | Panel ID | Control panel number |
| `date` | Date | Document date |
| `stage` | Stage | SUBMITTAL, AS-BUILT, etc. |
| `po` | Purchase Order | PO number |
| `serial` | Serial | Serial number |
| `company` | Company | Manufacturer/vendor |
| `address` | Address | Street address |
| `phone` | Phone | Phone number |
| `fax` | Fax | Fax number |
| `custom` | Static Text | Any static label |
| `job_block` | Multiline job/system type | Job block |
| `logo` | Blank branding mask | Logo/block |

---

## Units Summary

| Property | Units | Range | Notes |
|----------|-------|-------|-------|
| `x` | Relative | 0-1 | Fraction of page width |
| `y` | Relative | 0-1 | Fraction of page height |
| `w` | Relative | 0-1 | Fraction of page width |
| `h` | Relative | 0-1 | Fraction of page height |
| `fontSize` | Points | 8-72 | 1/72 inch |
| `rotation` | Degrees | -90, 0, 90 | Clockwise positive |

---

## Best Practices

1. **Use relative positioning** (0-1 range) for consistency across different page sizes
2. **Group related fields** vertically for easy reading
3. **Choose appropriate fonts**: Times for formal, Courier for technical
4. **Test with preview** before exporting to verify zone placement
5. **Use transparency wisely**: Whiteout visually covers content; transparency overlays text without covering it. Neither removes source content.
6. **Consider rotation** for space-constrained areas
7. **Validate zones** ensure they don't overlap sensitive areas unintentionally

---

## Version History

- **v2.5.115**: Bundled measured Cox profiles, automatic info/schematic/cover selection, and small title-block placement shift. Worker executable unchanged.
- **v2.5.114**: Revision-bound per-page generator state and mapping integration; visual masking semantics clarified.
- **v2.5.3**: Added preview, improved export, rotation underline fix
- **v2.5.2**: Fixed overlay visibility, CSS improvements
- **v2.5.1**: Refactored redaction UI
- Previous versions: See VERSION_HISTORY in app.js

## Measured layout assets and coverage

The supplied `PDFmapping/PR-PACK-MANIFEST.json`, `layouts_overlay.meta.json`,
`LAYOUT_FINGERPRINTS.json`, `ALIGNMENT-NOTES.md` and `LAYOUT-REPORT.md` identify
their source as app commit `3a9159e8`, v2.5.113, generated October 9, 2026.
`layouts_overlay.json` contains 186 profiles; `layouts_overlay_core.json`
contains the 81 profiles observed on at least three pages. These do not replace
the existing built-in or persisted custom profiles.

The supplied report describes 266 PDFs / 2,082 pages and 198 measured layouts.
Its core recommendation covers 1,803 of 1,934 measured pages; those are different
denominators, not a claim of complete coverage. Rare layouts are marked
`low_confidence`; no-title-block groups were excluded. The report's accuracy and
hold-out statistics are **supplier-reported**, not independently reproduced by
this PR. Neither the source corpus nor a digest-bound per-document/page
assignment manifest is checked in. External exact-assignment ingestion remains
pending; synthetic test fixtures are not user mapping data.

The Python reference `match_layout.py` requires `layouts.json`, `extract`,
`analyze`, and `fields`, which are absent here. It is evidence of matcher intent,
not a standalone runnable browser dependency. The browser matcher groups identical
title-block templates, accepts the closest core placement, and slides that
profile's zones when the same grid is printed up to about 5% of the page away.
Competing templates stay unresolved for operator review. It does not claim parity
with the reference's OCR-based conditional Cox branding release: a matched profile
is applied, including profiles flagged `cox_check`. Review measured masks for
over-blanking and missed content before sharing; a matching profile is not proof
of privacy.

## Release and acceptance

Publish `index.html`, all versioned frontend scripts/styles (including
`measured-layouts.js`), and the mapping JSON assets together. The v2.5.115 Worker
banner is a release label only: executable Worker code and its v2.5.113 transform
revision are unchanged. No Worker, Apps Script, parser revision, encrypted
snapshot schema, or compatibility-date deployment change is required.

Pending manual acceptance: representative real documents (including rare and
no-title-block layouts), mapped text/logo placement, responsive editing and
native print/download in Safari. No production/corpus accuracy, merge, or
deployment is claimed. Use a separately validated content-removal tool when
irreversible redaction is required.

The vendored PDF.js 3.11.174 is retained for compatibility. All app PDF-loading
calls disable `isEvalSupported` as the mitigation for the known malicious-font
JavaScript-evaluation advisory (patched upstream in 4.2.67). This is not a
dependency upgrade or a claim that arbitrary PDF contents have been sanitized.

## Exact assignment interchange

Mapping schema versioning is separate from the application release. A manifest
uses `schema: "schematicai-generator-mapping/1"` and
`coordinateSpace: "displayed-cropbox-normalized"`. It carries `sourceDigest`
(SHA-256 hex of the owned PDF bytes), `sourcePageCount`, `profileRevision`, and
`pages`. Every source page must appear exactly once, using **1-based** `page`.
Each page carries `profileId`, `profileRevision`, `coordinateSpace`,
`provenance` (`manual`, `exact`, or `auto`), `contentSource` (`source` or
`replacement`), and normalized `zones`.

Stable profile IDs use `BUILTIN:<key>`, `CUSTOM:<name>`, or `MEASURED:<key>`.
Obtain current revisions and a correctly populated manifest from the generator's
mapping export rather than guessing a revision or using a panel ID/URL as a
document revision. `profileRevision` is an opaque `profiles-sha256:<hex>` digest
of the asset revision and ID-sorted, normalized profile registry; it is not a
display name or serialized customer text. Page 1 remains `BUILTIN:COVER_TEMPLATE`; its effective content
source must match the committed cover choice. Import is whole-document and
atomic: invalid schema/coordinates, stale digests/revisions, missing profiles,
duplicate/out-of-range pages, malformed zones, or conflicting content-source
choices reject the import without replacing valid state. An existing current
manual override takes precedence over an imported exact assignment.

Zone rectangles require finite numeric `x`, `y`, `w`, `h`; positive dimensions;
and bounds within the displayed page (1e-6 rounding tolerance). Defaults are
normalized before semantic comparison: font size 14 points, Courier except the
cover customer field (Times), centered alignment, bold weight, no rotation,
opaque background, and null optional text/type/decoration. Font size must be
positive and at most 1,000 points. Zone `type` (including blocker), `map`,
transparency/whiteout, text, alignment, font, rotation and decoration survive
reconstruction. Empty zone arrays intentionally mean no overlays, not missing
page assignments.

Persisted legacy `{name: [zones]}` custom profiles remain supported; malformed
imports are rejected rather than partially saved. Document-specific assignments
and edits never migrate to a different digest just because its panel ID is the
same. Mapping fixtures must be synthetic and contain no customer content,
source URLs, credentials, or secrets.

Import limits (`GeneratorState.LIMITS`): 4 MiB UTF-8 JSON, 1,000 profiles,
256-character profile names, 1,000 zones per page/profile, 10,000 mapping pages,
and 10,000 characters of custom text per zone. These are interchange limits,
not a new source-PDF page limit. Existing legacy custom-profile dictionaries are
normalized and validated before persistence. Old unversioned page-config arrays
lack a document digest and are not silently treated as exact mappings; review
their zones and assign them explicitly using a current manifest/profile.

### Operator workflow and resolver seam

Use each page's profile dropdown to inspect its assignment and choose an
intentional override. The page badge reports assignment provenance or why it
remains unresolved. The existing active-page control determines where added
boxes and saved profiles apply, rather than always editing page 1. Rerendering
and zoom reconstruct zones from canonical page state.

Auto-Scan/Re-scan preserves current assignments and manual edits while retrying
unresolved pages. Selecting `AUTO` explicitly resets that page's assignment and
zones before detection; page 1 retains forced-cover rules. A new document load
starts a new generation and clears document-specific assignments. Completing
every unresolved page is required before generating or exporting a valid
mapping.

The generator panel provides mapping import/export; the programmatic seam is:

```javascript
await Generator.ready();
Generator.getState();                    // revision, digest, per-page status
Generator.setPageProfile(2, 'BUILTIN:INFO'); // explicit operator choice
const manifest = Generator.exportMapping(); // requires complete assignments
Generator.importMapping(manifest);       // atomic, revision-bound validation
Generator.exportProfiles();              // portable custom-profile envelope
Generator.importProfiles(profileEnvelope);
```

The page number above is an API example, **not** a mapping for a real document.
Choose profiles based on that document's actual layout. On digest failure the
generator is disabled safely; original committed PDF print/download remains
available. On failed or superseded generation, edits/template changes invalidate
generated bytes and a new preview must be generated.
