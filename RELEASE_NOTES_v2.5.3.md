# SCHEMATICA ai v2.5.3 Release Notes

**Release Date**: 2026-02-14  
**Version**: v2.5.3  
**Focus**: PDF Viewing/Redaction Improvements & Worker Hardening

---

## 🎯 Overview

Version 2.5.3 brings significant improvements to PDF redaction workflows, enhanced security for the Cloudflare Worker backend, and comprehensive documentation. This release focuses on user experience, security hardening, and developer documentation.

---

## ✨ New Features

### PDF Preview Before Export
- **Visual Verification**: New preview modal displays flattened PDF before final export
- **iframe Rendering**: Preview shows exactly what will be exported
- **Confirm or Cancel**: Users can verify redactions before committing to download

### Enhanced Overlay Visibility
- **Always Visible**: Redaction boxes always show outlines in editor mode
- **Distinct Styling**:
  - Opaque zones: Solid purple border (#9333ea)
  - Transparent zones: Dashed purple border (#9333ea)
  - Selected zones: Pink border with glow (#ec4899)
- **No Accidental Hiding**: Prevents opacity/toggle from hiding zones

### Lazy-Loading OCR
- **On-Demand Loading**: Tesseract.js loads only when OCR features are used
- **Feature Flag**: `FEATURES.OCR_ENABLED` for easy disable/enable
- **Performance**: Reduces initial page load by ~2MB

### Task Cancellation
- **Navigation Safety**: Active OCR tasks cancelled when switching PDFs
- **Memory Management**: Prevents orphaned processes
- **Responsive UI**: No blocking from long-running OCR tasks

---

## 🔒 Security Improvements

### Worker Hardening

#### Environment Secrets
- **No Hardcoded Keys**: API keys removed from source code
- **Worker Secrets**: Keys read from `env.KEY_READ_WRITE` and `env.KEY_READ_ONLY`
- **Key Rotation**: Documented process for rotating credentials

#### SSRF Protection
- **Host Allowlist**: PDF URLs validated against trusted domains
  - `dl.airtable.com`
  - `v5.airtableusercontent.com`
- **Size Limits**: PDF downloads capped at 50 MB
- **Timeout Guards**: Fetch operations timeout after 30 seconds
- **403 Forbidden**: Disallowed hosts rejected with clear error

#### Input Validation
- **Parameter Clamping**: `pageSize` validated and clamped to 1-100
- **Safe Defaults**: Missing parameters use secure defaults
- **Error Messaging**: Clear feedback for invalid inputs

---

## 🐛 Bug Fixes

### Export Improvements

#### Rotated Text Underline
- **Fixed**: Underline now properly transforms with rotated text
- **Algorithm**: Trigonometric calculations for endpoint positioning
- **Coverage**: Works with -90°, 0°, and 90° rotations

#### Whiteout Overlap
- **Fixed**: Opaque zones now drawn before transparent overlays
- **Z-Ordering**: Explicit sort ensures correct layering
- **Visual**: No more text bleeding through whiteouts

#### Type Safety
- **Fixed**: Explicit type conversion for pageSize in URL construction
- **Consistency**: Number-to-string conversion prevents template errors

---

## 📚 Documentation

### Worker API Documentation
**File**: `worker/API_DOCUMENTATION.md`

**Contents**:
- Complete API reference for all 4 targets (PDF, PDF_BY_ID, MAIN, FEEDBACK)
- Security features and SSRF protection details
- Request/response formats with examples
- Error codes and troubleshooting
- Deployment instructions for environment secrets
- Performance benchmarks

### Redaction Schema Documentation
**File**: `REDACTION_SCHEMA.md`

**Contents**:
- Complete zone property reference (required & optional)
- Units and coordinate systems explained
- 13 built-in profile examples
- Field mapping reference table
- Best practices and tips
- Export behavior documentation

---

## 🧪 Testing

### Integration Tests
**File**: `tests/worker.integration.test.js`

**Coverage**:
- ✅ PDF_BY_ID with CP- prefix
- ✅ PDF_BY_ID with .dwg extension
- ✅ PDF_BY_ID with .pdf extension
- ✅ PDF_BY_ID combined formats (CP-1234.dwg)
- ✅ 404 for missing panels
- ✅ 401 for unauthorized MAIN requests
- ✅ SSRF protection (host allowlist)
- ✅ pageSize validation
- ✅ CORS headers validation

**Test Runner**:
```bash
node tests/worker.integration.test.js
```

---

## 🔄 Breaking Changes

### Worker Deployment
**Action Required**: Set environment secrets in Cloudflare Worker dashboard
- `KEY_READ_WRITE`: Airtable token with read/write permissions
- `KEY_READ_ONLY`: Airtable token with read-only permissions

**Migration**: Rotate existing hardcoded keys after deployment

---

## 📊 Code Quality

### Review
- ✅ 3 code review comments addressed
- ✅ Type safety improvements
- ✅ Comment clarity enhanced

### Security Scan
- ✅ CodeQL: 0 alerts found
- ✅ No vulnerabilities detected
- ✅ SSRF protections validated

---

## 📦 Files Changed

### Core Application
- `app.js` - PDF preview, OCR lazy-loading, export fixes
- `index.html` - Preview modal, Tesseract removal from <head>
- `style.css` - Enhanced overlay visibility styles

### Worker
- `worker/worker.js` - Security hardening, environment secrets

### Documentation (New)
- `worker/API_DOCUMENTATION.md` - Complete API reference
- `REDACTION_SCHEMA.md` - Redaction profile schema

### Tests (New)
- `tests/worker.integration.test.js` - Worker API tests
- `tests/README.md` - Test documentation

---

## 🚀 Upgrade Path

### From v2.5.2

1. **Deploy Worker Changes**:
   ```bash
   # Set environment secrets in Cloudflare dashboard
   KEY_READ_WRITE=<new_token>
   KEY_READ_ONLY=<new_token>
   ```

2. **Update Frontend**:
   - No breaking changes for users
   - OCR feature works automatically (lazy-loaded)

3. **Rotate Keys**:
   - Generate new Airtable tokens
   - Update Worker secrets
   - Revoke old hardcoded tokens

---

## 🔮 Future Enhancements

Planned for v2.5.4+:
- [ ] Snapshot tests for PDF export (portrait/landscape)
- [ ] Snapshot tests for rotated overlays
- [ ] Unit tests for auto-detection algorithm
- [ ] E2E tests for redaction workflow
- [ ] Formal test framework (Jest/Vitest)

---

## 👥 Contributors

- GitHub Copilot
- grilledcheezuss

---

## 📝 Version History

- **v2.5.3** (2026-02-14): PDF preview, worker hardening, OCR lazy-load
- **v2.5.2**: Control Panel tabs, redaction box visibility
- **v2.5.1**: Control Panel refactor, tabbed UI
- **v2.5.0**: Tabbed Control Panel
- **v2.4.5**: PDF scanning fixes
- **v2.4.4**: Strict keyword boundaries

---

## 📄 License

See LICENSE file in repository.

---

## 🔗 Links

- **Repository**: https://github.com/grilledcheezuss/SCHEMATICai
- **Worker URL**: https://cox-proxy.thomas-85a.workers.dev
- **Documentation**: See `DOCUMENTATION.md` for user guide
