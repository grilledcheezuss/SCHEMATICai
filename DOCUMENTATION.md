# SCHEMATICA ai - Comprehensive Redaction System Documentation

## Table of Contents
1. [Overview](#overview)
2. [Layout Profiles](#layout-profiles)
3. [How to Add New Layouts/Profiles](#how-to-add-new-layoutsprofiles)
4. [Sensitive Fields Configuration](#sensitive-fields-configuration)
5. [Manual Profile Override](#manual-profile-override)
6. [Auto-Detection & Classification](#auto-detection--classification)
7. [HP Search & Filtering](#hp-search--filtering)
8. [Troubleshooting](#troubleshooting)

---

## Overview

SCHEMATICA ai v2.4.4+ features a comprehensive schematic redaction and profile system designed to automatically detect and redact sensitive information from electrical panel schematics, drawings, and documentation.

**Key Features:**
- **Unique Layout Profiles**: 11+ built-in profiles covering all common schematic layouts
- **Auto-Classification**: Intelligent detection of page types (title sheets, schematics, door drawings, etc.)
- **Sensitive Data Management**: 12 different sensitive field types with toggle controls
- **Upload-for-Profile**: Add custom layouts by uploading screenshots or PDFs
- **Edge-Aware Redaction**: Works with borderless and margin-adjacent content
- **Fuzzy HP Filtering**: Tolerant search for horsepower values in various formats

---

## Layout Profiles

### Built-In Profiles

#### Title & Cover Sheets
1. **Title Sheet (Standard)** - Standard Cox Research cover sheet with centered layout
   - Fields: Customer, Job, System Type, Panel ID, Date, Stage
   - Best for: Standard submittal packages

2. **Title Sheet (As-Built)** - Modified title sheet for as-built drawings
   - Fields: Customer, Job, System Type, Panel ID, Date, AS-BUILT stage
   - Best for: Record drawings and as-built documentation

3. **Cox Cover Sheet** - Cox Research branded cover
   - Fields: Customer, Job, System Type, Logo placeholder
   - Best for: Cox Research branded submittals

4. **Delta Cover Sheet** - Delta Controls style cover
   - Fields: Customer, Job, System Type, Date
   - Best for: Delta Controls projects

5. **3rd Party Cover** - Generic third-party cover sheet
   - Fields: Customer, Job, Logo placeholder
   - Best for: External vendor documentation

#### Info & Notes Pages
6. **Info / Notes (Standard)** - Standard bordered info pages
   - Fields: Customer, Job, Date, System Type, Panel ID
   - Best for: Notes, schedules, specifications with title blocks

7. **Info (Borderless)** - Borderless info pages
   - Fields: Customer, Job, Date, System Type, Panel ID (edge-positioned)
   - Best for: Pages without traditional title blocks

#### Schematics
8. **Schematic (Portrait)** - Standard portrait schematics
   - Fields: Date, System Type, Panel ID (in title block)
   - Best for: Vertical/portrait oriented electrical diagrams

9. **Schematic (Portrait Borderless)** - Portrait without borders
   - Fields: Date, System Type, Panel ID (edge-positioned)
   - Best for: Borderless portrait schematics

10. **Schematic (Landscape)** - Standard landscape schematics
    - Fields: Customer, Job, Date, System Type, Panel ID (rotated -90°)
    - Best for: Horizontal/landscape oriented electrical diagrams

11. **Schematic (Landscape Borderless)** - Landscape without borders
    - Fields: Customer, Job, Date, System Type, Panel ID (edge-positioned, rotated)
    - Best for: Borderless landscape schematics

#### Special
12. **Door Drawing** - Panel door/front view layouts
    - Fields: Customer, Job, Panel ID, Date
    - Best for: Door layouts, front panel views

13. **General** - Fallback for unknown layouts
    - Fields: Placeholder text
    - Best for: Unrecognized page types

### Custom Profiles

Custom profiles can be created through:
1. Manual zone placement on existing pages
2. Upload of new layout images/PDFs

---

## How to Add New Layouts/Profiles

### Method 1: Upload Layout (Recommended)

1. **Open Generator Controls**
   - Click the menu (☰) → "Submittal Generator"
   - Generator panel appears on the right side

2. **Upload New Layout**
   - Click "📤 Upload Layout for New Profile"
   - Choose your PDF or image file (PNG, JPG, JPEG accepted)
   - Preview appears in modal

3. **Name Your Profile**
   - Enter a descriptive name (e.g., "Vendor X Title Sheet")
   - Click "✅ Create Profile"

4. **Define Sensitive Zones**
   - Profile is created empty (no zones)
   - Load a document with this layout
   - Select your new profile from dropdown
   - Use "➕ Text" or "➕ Whiteout" to add zones
   - Position and map each zone to sensitive data
   - Click "💾" to save profile

### Method 2: Manual Profile Creation

1. **Load a PDF** with the layout you want to save
2. **Navigate to the page** with the layout
3. **Add Redaction Zones**:
   - Click "➕ Text" to add text overlay zones
   - Click "➕ Whiteout" to add opaque blocking zones
   - Drag zones to position
   - Resize using corner handles
   - Map each zone to data field (Customer, Job, etc.)

4. **Save Profile**:
   - Enter profile name in "New Profile Name" field
   - Click 💾 button
   - Profile is saved to local storage

5. **Profile Availability**:
   - New profile appears in all page dropdown menus
   - Available in "Custom Profiles" optgroup
   - Auto-saved and persists across sessions

### Profile Storage

- Stored in browser's `localStorage`
- Key: `cox_custom_profiles`
- Export/backup via "Export Config" button
- Format: JSON array of zone definitions

---

## Sensitive Fields Configuration

### Available Sensitive Fields

| Field | ID | Description | Toggle Control |
|-------|-----|-------------|----------------|
| Customer Name | `cust` | Client/customer organization | ☑️ Customer |
| Job Name | `job` | Project name/identifier | ☑️ Job |
| System Type | `type` | Equipment/system description | ☑️ System |
| Panel ID | `cpid` | Control panel identifier (CP-####) | ☑️ Panel ID |
| Date | `date` | Issue/revision date | ☑️ Date |
| Stage | `stage` | SUBMITTAL/DESIGN/AS-BUILT | ☑️ Stage |
| PO Number | `po` | Purchase order number | ☑️ PO |
| Serial Number | `serial` | Equipment serial number | ☑️ Serial |
| Company Name | `company` | Your company name | ☑️ Company |
| Address | `address` | Company/project address | ☑️ Address |
| Phone | `phone` | Phone number | ☑️ Phone |
| Fax | `fax` | Fax number | ☑️ Fax |

### Using Project Context Toggles

1. **Open Project Context Panel**
   - Expand "🔬 Project Context & Sensitive Data"
   - Located in Generator Controls panel

2. **Configure Redaction Toggles**
   - All fields checked by default (all redacted)
   - Uncheck fields you want to KEEP visible
   - Checked = REDACTED (hidden/replaced)
   - Unchecked = VISIBLE (original content shown)

3. **Enter Project Data**
   - Fill in fields you want to appear on redacted output
   - Leave unchecked fields empty or with defaults
   - Changes apply in real-time to all pages

4. **Field Mapping**
   - Each redaction zone is mapped to a field
   - Zones only appear when their field's toggle is checked
   - Text content comes from Project Context inputs

### Best Practices

- **Always redact**: Customer, Job, Panel ID for external sharing
- **Keep visible**: System Type, Stage (for context)
- **Situational**: Company info (redact for competitors, keep for customers)
- **Test before export**: Review all pages with different toggle states

---

## Manual Profile Override

### When to Use Manual Override

- Auto-detection selects wrong profile
- Page has unique layout not in built-in profiles
- Mixed document with varying layouts
- Borderless vs bordered variants

### How to Override

1. **Per-Page Selection**
   - Each page has a dropdown in its toolbar
   - Default: "✨ Auto (Detected)"
   - Change to any available profile

2. **Profile Categories**
   ```
   ✨ Auto (Detected)
   📁 Title & Cover Sheets
      🏷️ Title Sheet (Standard)
      📋 Title Sheet (As-Built)
      🏢 Cox Cover Sheet
      🔷 Delta Cover Sheet
      📄 3rd Party Cover
   📁 Info & Notes
      📝 Info / Notes (Standard)
      🖼️ Info (Borderless)
   📁 Schematics
      📄 Schematic (Portrait)
      🖼️ Schematic (Portrait Borderless)
      🔄 Schematic (Landscape)
      🖼️ Schematic (Landscape Borderless)
   📁 Special
      🚪 Door Drawing
      📐 General
   📁 Custom Profiles
      ⭐ [Your Custom Profiles]
   ```

3. **Apply Selection**
   - Profile applies immediately to page
   - Zones are recreated based on profile rules
   - Project Context data populates zones

4. **Re-scan Option**
   - Click 🔄 button on page toolbar
   - Re-runs auto-detection for that page only
   - Useful after manual edits

---

## Auto-Detection & Classification

### How Classification Works

The system uses a multi-factor scoring algorithm:

1. **Content Analysis**
   - Scans text for keywords
   - Schematic terms: L1, L2, L3, MOTOR, PUMP, RELAY, etc.
   - Info terms: TABLE OF CONTENTS, NOTES, SCHEDULE, BOM
   - Title terms: PROJECT, CLIENT, DRAWN BY, SUBMITTAL
   - As-Built terms: AS-BUILT, RECORD DRAWING
   - Door terms: DOOR, FRONT VIEW, PANEL FRONT
   - Vendor terms: COX RESEARCH, DELTA

2. **Layout Heuristics**
   - Aspect ratio (landscape vs portrait)
   - Text density (sparse = title, dense = info)
   - Border detection (bordered vs borderless)

3. **Position Clues**
   - Page 1 = likely title sheet
   - Page 2 = often info/notes
   - Page 3+ = usually schematics

4. **Confidence Scoring**
   - High: Text-based detection with clear keywords
   - Medium: OCR-based detection
   - Low: Fallback to heuristics only

### Classification Flow

```
1. Load Page
   ↓
2. Extract Text (PDF.js) or OCR (Tesseract.js)
   ↓
3. Score content against all profile types
   ↓
4. Apply highest-scoring profile
   ↓
5. User can override if incorrect
```

### Improving Classification

- **Add keywords**: Submit feedback for misclassified pages
- **Create custom profile**: For repeated unique layouts
- **Manual override**: For one-off cases

---

## HP Search & Filtering

### Enhanced HP Filtering Logic

The system now supports **fuzzy, tolerant HP matching**:

#### Supported Formats

1. **Standard Field Match**
   - Database field `hp` = search value
   - Tolerance: ±10% (0.1)
   - Weight: 5000 points

2. **Description Match (Inline)**
   - "5 HP", "5HP", "5H.P", "5 H.P.", "5.0HP"
   - "5 KW", "5kW", "5 kW"
   - Weight: 2000 points

3. **Fractional HP**
   - "1/2 HP", "1/4 HP", "3/4 HP"
   - Converts to decimal (0.5, 0.25, 0.75)
   - Weight: 2000 points

4. **Table/Header Format**
   - "HP: 5", "Horsepower 5", "Motor HP 5"
   - Common in specifications tables
   - Weight: 2000 points

#### Search Examples

**Search: 5 HP**
- Matches: "5 HP", "5HP", "5.0 HP", "5 KW"
- Matches: "Motor HP 5", "HP: 5.0"
- Matches: Field `hp=5.0`, `hp=4.9`, `hp=5.1` (within 10%)
- Does NOT match: "0.5 HP", "50 HP", "15 HP"

**Search: 0.5 HP**
- Matches: "1/2 HP", "0.5 HP", "0.5HP"
- Matches: Field `hp=0.5`, `hp=0.45`, `hp=0.55`
- Does NOT match: "5 HP", "2 HP"

#### Normalization

- Spaces ignored: "5HP" = "5 HP"
- Case-insensitive: "hp" = "HP" = "Hp"
- Decimal vs integer: "5" = "5.0"
- Units interchangeable: "HP" = "KW" (for search purposes)

#### Filtering Behavior

- **No HP selected** ("Any"): Shows all results
- **HP selected**: ONLY shows results with matching HP
- **Hard filter**: If HP specified, results MUST match or are excluded
- **Ranked by weight**: Exact field match ranks higher than description match

---

## Troubleshooting

### Common Issues

#### 1. Profile Not Auto-Detecting Correctly

**Symptoms**: Wrong layout applied, zones in wrong positions

**Solutions**:
- Use manual override dropdown on page toolbar
- Select correct profile from categorized list
- If layout is unique, create custom profile
- Click 🔄 to re-scan page

#### 2. Redaction Zones Not Showing

**Symptoms**: Blank redaction boxes, missing text

**Solutions**:
- Check Project Context toggles (field may be unchecked)
- Fill in Project Context input fields
- Verify zone is mapped to correct field
- Check if generator mode is active (demo-mode)

#### 3. Text Not Aligning Correctly

**Symptoms**: Text overflows box, wrong alignment

**Solutions**:
- Adjust font size with slider (8-72px)
- Change text alignment (Left/Center/Right)
- Resize zone by dragging corner handle
- Try different font family (Courier vs Times)

#### 4. Upload Profile Not Creating

**Symptoms**: Upload fails, no profile appears

**Solutions**:
- Ensure file is PDF, PNG, JPG, or JPEG
- Check file size (very large files may fail)
- Verify profile name is entered
- Check browser console for errors
- Try refreshing page and uploading again

#### 5. HP Search Returning No Results

**Symptoms**: Known HP values not appearing

**Solutions**:
- Remove other filters (Mfg, Volt, Phase)
- Try decimal format: "0.5" instead of "1/2"
- Check if description contains HP in different format
- Try "Any" HP to see all available values
- Verify database is loaded (check status message)

#### 6. Custom Profile Not Appearing in Dropdown

**Symptoms**: Saved profile missing from list

**Solutions**:
- Refresh profile options (reload page)
- Check localStorage for `cox_custom_profiles`
- Re-save profile with different name
- Export config and check JSON structure

#### 7. Whiteout Not Covering Content

**Symptoms**: Original content visible through redaction

**Solutions**:
- Enable "Opaque Background (Whiteout)" checkbox
- Increase zone size to fully cover content
- Use logo/blocker zone type instead of text
- Layer multiple zones if needed

#### 8. Rotated Text Not Displaying

**Symptoms**: Text appears horizontal instead of rotated

**Solutions**:
- Check if profile has rotation property
- Landscape profiles use -90° rotation
- Custom zones don't support rotation (use profile)
- Verify rotation value in exported config

### Getting Help

- **Export Configuration**: Use "Export Config" to save current state
- **Check Browser Console**: F12 → Console for error messages
- **Clear Cache**: Force Reset in menu if persistent issues
- **Report Issue**: Use feedback system for data problems

### Data Integrity

- **Local Storage**: Profiles saved in browser only
- **Backup**: Regularly export configurations
- **Sync**: No cloud sync - export/import to transfer
- **Clear Data**: "Force Reset" clears all local storage

### Performance Tips

- **Large PDFs**: May take time to scan (15+ pages)
- **OCR Pages**: Slower than text-based pages
- **Reduce Zones**: Fewer zones = faster rendering
- **Disable Features**: Turn off unneeded toggles

---

## Version History

**v2.4.4** - PDF Loading by Panel ID
- Added worker endpoint `target=PDF_BY_ID` for fresh PDF fetching
- Updated client to request PDFs by panel ID instead of cached URLs
- Maintains fallback to cached URLs if worker fetch fails
- Version bump across all files

**v2.4.3+** - Comprehensive Overhaul
- Added 11 built-in layout profiles
- Enhanced auto-classification with 7 detection types
- Added 12 sensitive field types with toggle controls
- Implemented upload-for-profile feature
- Fuzzy HP search with tolerance and format support
- Edge-aware borderless layouts
- Organized dropdown with optgroups

**v2.4.3** - Previous Version
- Basic 5 layout profiles
- Simple auto-detection
- 6 sensitive fields
- Standard HP search

---

## Technical Reference

### Profile Structure (JSON)

```json
{
  "map": "cust",              // Field mapping
  "x": 0.15,                  // X position (0-1, relative)
  "y": 0.42,                  // Y position (0-1, relative)
  "w": 0.7,                   // Width (0-1, relative)
  "h": 0.04,                  // Height (0-1, relative)
  "fontSize": 24,             // Font size in pixels
  "transparent": false,       // Opaque (true) or transparent (false)
  "fontFamily": "'Times New Roman', serif",
  "textAlign": "center",      // left, center, right
  "rotation": 0               // Degrees (-90, 0, 90)
}
```

### Field Mappings

- `cust` → Customer Name
- `job` → Job Name
- `type` → System Type
- `cpid` → Panel ID
- `date` → Date
- `stage` → Design Stage
- `po` → PO Number
- `serial` → Serial Number
- `company` → Company Name
- `address` → Company Address
- `phone` → Phone Number
- `fax` → Fax Number
- `custom` → Custom text (no mapping)
- `logo` → Logo/blocker (no text)

### Storage Keys

- `cox_custom_profiles`: Custom profile definitions
- `cox_user`: Current authenticated user
- `cox_theme`: Light/dark theme preference
- `cox_auth_token`: Authentication token (if applicable)

---

**End of Documentation**

For additional support or feature requests, contact the development team.
