# SCHEMATICA ai Redaction Profile Schema

## Version: v2.5.3

## Overview

The redaction profile schema defines how sensitive information is identified and redacted on PDF pages. Profiles consist of layout rules that specify redaction zones with precise positioning, styling, and field mappings.

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

SCHEMATICA ai includes 13 built-in layout profiles:

### Title Sheets
1. **TITLE** - Standard title sheet
2. **TITLE_ASBUILT** - As-built title sheet
3. **TITLE_COX** - Cox-specific title sheet
4. **TITLE_DELTA** - Delta-specific title sheet
5. **TITLE_3RDPARTY** - Third-party title sheet

### Info Pages
6. **INFO** - Standard info page with border
7. **INFO_BORDERLESS** - Borderless info page

### Schematics
8. **SCHEMATIC_PORTRAIT** - Portrait schematic with border
9. **SCHEMATIC_PORTRAIT_BORDERLESS** - Portrait schematic without border
10. **SCHEMATIC_LANDSCAPE** - Landscape schematic with border
11. **SCHEMATIC_LANDSCAPE_BORDERLESS** - Landscape schematic without border

### Specialty
12. **DOOR_DRAWING** - Door/enclosure drawings
13. **GENERAL** - Fallback profile

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
5. **Use transparency wisely**: Whiteout for removal, transparent for overlay
6. **Consider rotation** for space-constrained areas
7. **Validate zones** ensure they don't overlap sensitive areas unintentionally

---

## Version History

- **v2.5.3**: Added preview, improved export, rotation underline fix
- **v2.5.2**: Fixed overlay visibility, CSS improvements
- **v2.5.1**: Refactored redaction UI
- Previous versions: See VERSION_HISTORY in app.js
