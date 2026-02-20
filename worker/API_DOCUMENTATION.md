# SCHEMATICA ai Worker API Documentation

## Version: v2.5.34

## Overview

The SCHEMATICA ai Worker is a Cloudflare Worker that provides a secure, edge-computing backend for the SCHEMATICA ai application. It handles data processing, PDF proxying, authentication, and feedback management.

---

## Version History

- **v2.5.34**: Worker search false negatives fix: HP table-format parsing (HP: 7.5 / HP - 7.5), NEMA4X enclosure detection (NEMA 4X / NEMA4X / TYPE 4X), `searchText` field in MAIN response for model-number matching (PD6000 matches PD-6000), `reject_keywords` normalized to uppercase for consistent client matching
- **v2.5.16**: Professional-Grade Update: restored positive feedback lockout; voltage/phase/enc badge strictness fix (green for exact field matches, orange for fuzzy); page toolbar cleanup; OCR min-size guard for tiny boxes; smarter page classification with page-number heuristics (page 1=Title, page 2=Info, pages 3-4=Power/Control)
- **v2.5.15**: Sorting: perfect matches (no varied flags) prioritized above varied results when weights equal; Feedback: removed thumbs-down lockout to allow multiple per-parameter corrections per panel per search
- **v2.5.14**: Fixed 4XSS enclosure parsing to exclude fiberglass panels (now correctly mapped to 4XFG); added Date field to feedback submissions
- **v2.5.13**: Fixed feedback lockout enforcement for thumbs up; HP badge now green for strict matches; enclosure parsing for 4XSS/4XFG/POLY
- **v2.5.12**: Badge suppression for unfiltered parameters: badges only shown for actively filtered criteria (not 'Any'); Vercel cleanup
- **v2.5.11**: Dual-voltage normalization: 120/240 and 277/480 split-phase pairs now use higher voltage with green badge instead of orange varied badge
- **v2.5.10**: Varied parameter badges: orange badges for ambiguous/multiple values in mfg, hp, volt, phase, enc fields
- **v2.5.9**: Fixed HP matching boundaries: 0.5 HP searches no longer match 1.5 HP (numeric boundary guards)
- **v2.5.8**: Feedback modal defaults to empty selection; improved HP parsing for mixed fractions (7 1/2, 7-1/2, 7½)
- **v2.5.7**: Fixed feedback button interactions (thumbs down onclick handler)
- **v2.5.6**: Client-side code refactoring and optimization (no API changes)
- **v2.5.5**: PDF_BY_ID relaxed REGEX lookup for revision suffixes, improved error handling

## Security Features (v2.5.3)

### Environment Secrets
API keys are now read from Worker environment secrets instead of hardcoded values:
- `AIRTABLE_WRITE_KEY`: Read/write access key for Airtable
- `AIRTABLE_READ_KEY`: Read-only access key for Airtable

**Note**: Rotate existing keys out-of-band after deployment.

### SSRF Protection
- **Host Allowlist**: PDF URLs are validated against an allowlist of trusted domains
  - `dl.airtable.com`
  - `v5.airtableusercontent.com`
- **Size Limits**: PDF downloads are capped at 50 MB
- **Timeout Guards**: PDF fetches timeout after 30 seconds
- **Parameter Validation**: Query parameters like `pageSize` are validated and clamped (1-100)

---

## API Targets

The Worker supports four primary targets, specified via the `?target=` query parameter:

### 1. PDF (Unauthenticated)

**Purpose**: Proxy PDF files through the worker to bypass CORS restrictions.

**Endpoint**: `/?target=PDF&url=<pdf_url>`

**Method**: `GET`

**Query Parameters**:
- `url` (required): The URL of the PDF to fetch

**Security**:
- URL must be from an allowed host (see Host Allowlist)
- Downloads are limited to 50 MB
- Fetch timeout: 30 seconds

**Response**:
- Success (200): PDF file with CORS headers
- Error (400): Missing URL or fetch failed
- Error (403): PDF host not allowed

**Example**:
```
GET /?target=PDF&url=https://dl.airtable.com/example.pdf
```

---

### 2. PDF_BY_ID (Unauthenticated)

**Purpose**: Fetch a PDF by Control Panel ID, with automatic normalization and variation handling.

**Endpoint**: `/?target=PDF_BY_ID&id=<panel_id>`

**Method**: `GET`

**Query Parameters**:
- `id` (required): Control Panel ID (e.g., "1234", "CP-1234", "1234.dwg")

**ID Normalization**:
The worker automatically tries multiple variations:
1. Clean ID (e.g., "1234")
2. With CP- prefix (e.g., "CP-1234")
3. With .dwg extension (e.g., "1234.dwg")
4. With .pdf extension (e.g., "1234.pdf")
5. With both prefix and extension (e.g., "CP-1234.dwg", "CP-1234.pdf")

**Security**:
- Same SSRF protections as PDF target
- PDF URL must be from allowed host
- Size and timeout limits enforced

**Response**:
- Success (200): PDF file with CORS headers
- Error (400): Missing ID or fetch failed
- Error (403): PDF host not allowed
- Error (404): Panel ID not found

**Example**:
```
GET /?target=PDF_BY_ID&id=1234
GET /?target=PDF_BY_ID&id=CP-1234.dwg
```

---

### 3. MAIN (Authenticated)

**Purpose**: Fetch and process control panel data with ML filtering.

**Endpoint**: `/?target=MAIN`

**Method**: `GET`

**Headers** (Required):
- `X-Cox-User`: Username for authentication
- `X-Cox-Pass`: Passcode for authentication

**Query Parameters**:
- `offset` (optional): Pagination offset from previous request
- `sort[0][direction]` (optional): Sort direction ("asc" or "desc", default: "desc")
- `pageSize` (optional): Results per page (1-100, default: 100)

**Security**:
- Requires valid authentication (401 if invalid)
- `pageSize` is validated and clamped to 1-100 range

**Response**:
- Success (200): JSON with control panel records
- Error (401): Unauthorized (invalid credentials)
- Error (500): Server error

**Response Format**:
```json
{
  "records": [
    {
      "id": "1234",
      "displayId": "CP-1234",
      "desc": "CONTROL PANEL DESCRIPTION",
      "searchText": "CONTROL PANEL DESCRIPTION 1234 CONTROLPANEL...",
      "pdfUrl": "https://...",
      "pdfStatus": "present",
      "mfg": "GORMAN RUPP",
      "hp": "7.5",
      "volt": "480",
      "phase": "3",
      "enc": "NEMA4X",
      "category": null,
      "reject_keywords": [],
      "mfgV": false,
      "hpV": false,
      "voltV": false,
      "phaseV": false,
      "encV": false
    }
  ],
  "offset": "next_page_offset_or_null"
}
```

**Varied Flags (v2.5.10)**:
- `mfgV`, `hpV`, `voltV`, `phaseV`, `encV`: Boolean flags indicating if multiple/ambiguous values were detected for a parameter
- When `true`, UI displays orange badges to indicate uncertainty
- When `false`, UI displays green badges for strict, clean matches

**Processing Pipeline**:
1. **Regex Extraction**: Strict keyword-based extraction (35+ manufacturer patterns)
2. **ML Classification**: Naive Bayes model trained on-edge from main database
3. **Healer Override**: User feedback corrections (vote threshold: 3+)

**Example**:
```
GET /?target=MAIN&pageSize=50&sort[0][direction]=asc
Headers:
  X-Cox-User: username
  X-Cox-Pass: passcode
```

---

### 4. FEEDBACK (Authenticated)

**Purpose**: Submit user corrections for control panel data.

**Endpoint**: `/?target=FEEDBACK`

**Method**: `POST`

**Headers** (Required):
- `X-Cox-User`: Username for authentication
- `X-Cox-Pass`: Passcode for authentication
- `Content-Type`: application/json

**Request Body**:
```json
{
  "records": [
    {
      "fields": {
        "Panel ID": "1234",
        "Corrections": "{\"mfg\":\"BARNES\",\"hp\":\"10\",\"volt\":\"575\",\"phase\":\"3\"}"
      }
    }
  ]
}
```

**Security**:
- Requires valid authentication (401 if invalid)
- Invalidates cache after submission

**Response**:
- Success (200): Airtable response JSON
- Error (401): Unauthorized

**Example**:
```
POST /?target=FEEDBACK
Headers:
  X-Cox-User: username
  X-Cox-Pass: passcode
  Content-Type: application/json
Body: { ... }
```

---

## CORS Headers

All responses include the following CORS headers:
- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Methods: GET, POST, OPTIONS`
- `Access-Control-Allow-Headers: Content-Type, X-Cox-User, X-Cox-Pass`

---

## Caching Strategy

### In-Memory Edge Cache
- **Duration**: 1 hour (3600 seconds)
- **Cached Data**:
  - User authentication records
  - User feedback corrections (healer)
  - ML model (Naive Bayes classifier)

### Cache Invalidation
- Automatic after 1 hour
- Manual on FEEDBACK submission

---

## Error Responses

All errors return JSON with CORS headers:

```json
{
  "error": "Error Type",
  "message": "Detailed error message"
}
```

**Common Error Codes**:
- `400`: Bad Request (missing parameters, invalid URL)
- `401`: Unauthorized (authentication failed)
- `403`: Forbidden (host not allowed)
- `404`: Not Found (resource not found)
- `500`: Server Error (worker exception)

---

## Deployment

### Environment Variables
Configure these secrets in your Cloudflare Worker dashboard:
1. `AIRTABLE_WRITE_KEY`: Airtable personal access token with read/write permissions
2. `AIRTABLE_READ_KEY`: Airtable personal access token with read-only permissions

### Airtable Base Configuration
- **Main Base ID**: `appgc1pbuOgmODRpj`
- **Users Base ID**: `app88zF2k4FgjU8hK`

**Tables**:
- Control Panel Items (Main)
- Users (Auth)
- Feedback (Corrections)
- Legacy Panels (ML Training - deprecated, now uses Main)

---

## Performance

### Cold Start
- Auth & Feedback cache: < 0.5s
- ML model build: < 3s (background)

### Warm Request
- MAIN target: < 0.2s (with cache)
- PDF proxy: Dependent on external fetch

---

## Version History

- **v2.5.5**: PDF_BY_ID relaxed REGEX lookup for revision suffixes, improved error handling
- **v2.5.4**: Enhanced error handling and logging
- **v2.5.3**: Security hardening, SSRF guards, environment secrets
- **v2.4.4**: Instant sync, background ML training
- Previous versions: See VERSION_HISTORY in app.js
