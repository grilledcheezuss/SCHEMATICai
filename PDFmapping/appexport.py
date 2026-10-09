"""SCHEMATICai export: layouts.json (diagnostic) -> drop-in LAYOUT_RULES profiles.

Zone objects use exactly the props app.js LAYOUT_RULES / applyRuleToWrapper consume:
  map, x, y, w, h, fontSize, transparent, fontFamily, textAlign [, rotation] [, text]
map values are only keys the app's refreshContent() knows: cust job type cpid date stage po serial company address phone fax logo custom.
"""
import json, os, re, datetime
os.umask(0o077)
B = "/workspace/pdf-layouts"
SCHEMA = "schematicai-layout-rules/1.0"
APP_REF = {"repo": "grilledcheezuss/SCHEMATICai", "commit": "3a9159e8", "app_version": "v2.5.113", "file": "app.js (const LAYOUT_RULES)"}
APP_MAPS = {"cust", "job", "type", "cpid", "date", "stage", "po", "serial", "company", "address", "phone", "fax", "logo", "custom"}
BLANK_FIELDS = {"drawn_by", "ship_to", "footer_note", "company_name", "cover_extra"}   # sensitive, no app key -> opaque blank custom box

def base_profile(l):
    """The built-in key the app would use for this page class (AUTO / PageClassifier vocabulary)."""
    c = l["class"]
    bordered = any(z["field"] == "page_border" and z.get("detect_rate", 0) >= 0.5 for z in l["zones"])
    if c == "COVER":
        r = [z.get("cox_brand_rate") for z in l["zones"] + l["flagged_zones"] if z["field"] in ("company_block", "logo_text") and z.get("cox_brand_rate") is not None]
        if r and min(r) >= 0.98: return "COX_COVER"
        if r and max(r) <= 0.02: return "THIRD_PARTY_COVER"
        return "COVER_TEMPLATE"
    if c == "INFO": return "INFO" if bordered else "INFO_BORDERLESS"
    land = l["orientation"] == "landscape"
    return ("SCHEMATIC_LANDSCAPE" if land else "SCHEMATIC_PORTRAIT") + ("" if bordered else "_BORDERLESS")

def profile_key(l):
    lid = l["layout_id"].split("-")[0].upper()          # TB01a-SHEET -> TB01A ; COV01 -> COV01
    return f"{base_profile(l)}_{lid}"

def app_zone(z, has_company_line=False):
    """One diagnostic zone -> app zone, or None if it is not exported."""
    role, f = z["role"], z["field"]
    if role in ("border", "cox_brand"): return None
    if f == "company_block": mp = "custom" if has_company_line else "company"
    elif f == "logo_text": mp = "logo"
    elif f in BLANK_FIELDS or f.startswith(("tb_text_cell", "info_header_cell")): mp = "custom"
    else: mp = z["map"] if z["map"] in APP_MAPS else "custom"
    if mp not in APP_MAPS: return None
    cl = lambda v: round(min(1.0, max(0.0, v)), 4)
    x, y = cl(z["x"]), cl(z["y"]); w, h = cl(min(z["w"], 1 - x)), cl(min(z["h"], 1 - y))
    out = {"map": mp, "x": x, "y": y, "w": w, "h": h, "fontSize": int(z.get("fontSize") or 10),
           "transparent": False, "fontFamily": z.get("fontFamily") or "'Courier New', monospace", "textAlign": z.get("textAlign") or "left"}
    if z.get("rotation"): out["rotation"] = z["rotation"]
    if mp == "custom": out["text"] = ""
    return out

def export_zones(l, zones=None, include_flagged=None):
    """Ordered app zones for a layout (blank boxes first so value boxes draw on top)."""
    zs = list(l["zones"] if zones is None else zones)
    if include_flagged if include_flagged is not None else l["class"] == "COVER":
        zs += [z for z in l["flagged_zones"] if z["role"] == "sensitive"]
    has_line = any(z["field"] == "company" and z["role"] == "sensitive" for z in zs)
    out = []
    for z in zs:
        a = app_zone(z, has_line)
        if a: out.append((0 if a["map"] in ("custom", "logo") else 1, a))
    out.sort(key=lambda t: t[0])
    return [a for _, a in out]

def main():
    LJ = json.load(open(f"{B}/layouts.json")); L = LJ["layouts"]
    rules, meta, skipped = {}, {}, {}
    for lid, l in L.items():
        key = profile_key(l)
        if l["class"] == "NOTB":
            skipped[key] = {"layout_id": lid, "reason": "no title block: stacked Cox block floats along the page; envelope zones would blank schematic content. Use runtime per-page detection instead.", "n_pages": l["n_pages"]}
            continue
        zs = export_zones(l)
        if not zs:
            skipped[key] = {"layout_id": lid, "reason": "no usable zones", "n_pages": l["n_pages"]}; continue
        rules[key] = zs
        meta[key] = {"layout_id": lid, "base_profile": base_profile(l), "class": l["class"], "orientation": l["orientation"],
                     "title_block_edge": l["title_block_edge"], "template_id": l["template_id"],
                     "template_hash": l["fingerprint"].get("template_hash"), "title_block_bbox": l["fingerprint"].get("title_block_bbox"),
                     "cover_key": l["fingerprint"].get("cover_key"), "n_pages": l["n_pages"], "n_pdfs": l["n_pdfs"],
                     "eras": l["eras"], "page_size_pt": l["page_size_pt"], "n_zones": len(zs),
                     "builtin_best": {"profile": l["profile"], "iou": l["profile_score"]},
                     "low_confidence": l["n_pages"] < 3,
                     "cox_check_fields": [z["field"] for z in l["zones"] if z.get("cox_check")]}
    json.dump(rules, open(f"{B}/layouts_overlay.json", "w"), indent=1)
    json.dump({"schema": SCHEMA, "generated": datetime.datetime.now().strftime("%Y-%m-%d %H:%M CT"), "app_ref": APP_REF,
               "coords": "normalized 0-1, top-left origin, displayed (rotation-applied) page - identical to LAYOUT_RULES",
               "load_paths": {"builtin": "merge layouts_overlay.json keys into const LAYOUT_RULES",
                              "custom": "localStorage['cox_custom_profiles'] = layouts_overlay.json (select value 'CUSTOM:<key>')"},
               "profiles": meta, "not_exported": skipped}, open(f"{B}/layouts_overlay.meta.json", "w"), indent=1)
    for p in ("layouts_overlay.json", "layouts_overlay.meta.json"): os.chmod(f"{B}/{p}", 0o600)
    print("exported", len(rules), "profiles;", len(skipped), "not exported;", sum(len(v) for v in rules.values()), "zones")

if __name__ == "__main__":
    main()
