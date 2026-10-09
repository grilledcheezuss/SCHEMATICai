#!/usr/bin/env python3
"""Match PDF pages to the mapped border/title-block layouts and emit SCHEMATICai overlay zones
(border landmarks, sensitive non-Cox company/personal boxes to redact, title-block cpid/date/stage/type).

usage: venv/bin/python match_layout.py <file.pdf> [--pages 1,3] [--include-flagged] [--layouts layouts.json]
Output (stdout, JSON): per page {page, layout_id, template_id, match, placement, zones[]}.
 - Title-block pages: template chosen by placement-invariant line fingerprint; if the title block sits where a known
   layout of that template+class sits (<=0.008), that layout's zones are used verbatim, otherwise the template zones
   are re-placed through the title-block affine (placement="affine").
 - Pages without a title block: cover layouts matched by cpid / contact-block position.
 - Zones with cox_check (template used by Cox on most jobs, another company on some) are resolved per page from OCR.
 - Zones flagged low-confidence are excluded unless --include-flagged. Unmatched pages return zones=[] (blank over wrong).
Prints no page text."""
import sys, json, argparse, os, warnings
warnings.filterwarnings("ignore")
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import pymupdf as fitz
import extract, analyze, appexport
from fields import *
from fields import _match

def rscore(a, b):
    n = len(a["H"]) + len(a["V"]) + len(b["H"]) + len(b["V"])
    return 2 * (_match(a["H"], b["H"], 0.03, 0.03) + _match(a["V"], b["V"], 0.006, 0.08)) / n if n else 0

def relfp(pg):
    x0, t, x1, y1 = pg["tb_bbox_frame"]; bw = max(x1 - x0, 1e-3); bh = max(y1 - t, 1e-3)
    return {"H": [[(h[0] - t) / bh, (h[1] - x0) / bw, (h[2] - x0) / bw] for h in pg["fp"]["H"]],
            "V": [[(v[0] - x0) / bw, (v[1] - t) / bh, (v[2] - t) / bh] for v in pg["fp"]["V"]]}

def place(z, tbf, frame):
    r = z["rel_tb"]; tw, th = tbf[2] - tbf[0], tbf[3] - tbf[1]
    b = frame_box_to_page([tbf[0] + r[0] * tw, tbf[1] + r[1] * th, tbf[0] + r[2] * tw, tbf[1] + r[3] * th], frame)
    z = dict(z, x=round(b[0], 4), y=round(b[1], 4), w=round(b[2] - b[0], 4), h=round(b[3] - b[1], 4), value_bbox=rnd(b), placement="affine")
    return z

def match_page(pg, LAY, include_flagged=False):
    analyze.process_page(pg)
    cls = pg["cls"] if pg["cls"] in ("COVER", "NOTB", "INFO") else "SHEET"   # DRAWING/BOM share one border layout
    def zl(lay): return lay["zones"] + (lay["flagged_zones"] if include_flagged else [])
    if pg["fp"]:
        rf = relfp(pg)
        tmpls = {}
        for lid, l in LAY.items():
            if l.get("template_id") and l["fingerprint"].get("template_lines_rel") and l["title_block_edge"] == pg["frame"]:
                tmpls.setdefault(l["template_id"], l["fingerprint"]["template_lines_rel"])
        if not tmpls: return {"layout_id": None, "reason": "no template for this title-block edge", "zones": []}
        sc, tid = max((rscore(rf, v), k) for k, v in tmpls.items())
        if sc < 0.70: return {"layout_id": None, "template_id": tid, "match": round(sc, 3), "reason": "unknown title block", "zones": []}
        same = [l for l in LAY.values() if l.get("template_id") == tid and l["class"] == cls]
        if not same: same = [l for l in LAY.values() if l.get("template_id") == tid]
        tbf = pg["tb_bbox_frame"]
        def dist(l): return max(abs(a - b) for a, b in zip(l["fingerprint"]["title_block_bbox_frame"], tbf))
        best = min(same, key=lambda l: (dist(l) > 0.008, -l["n_pages"] if dist(l) <= 0.008 else dist(l)))
        if dist(best) <= 0.008:
            return {"layout_id": best["layout_id"], "template_id": tid, "match": round(sc, 3), "placement": "exact", "zones": zl(best)}
        zs = [place(z, tbf, pg["frame"]) for z in zl(best) if z.get("rel_tb")]
        return {"layout_id": best["layout_id"] + "~affine", "template_id": tid, "match": round(sc, 3), "placement": "affine", "zones": zs}
    if cls == "COVER":
        cov = [l for l in LAY.values() if l["class"] == "COVER" and any(z["role"] != "border" for z in l["zones"])]
        fl = pg["fields"]
        def cd(l):
            d = 0
            for f in ("cpid", "company_block"):
                a = fl.get(f, {}).get("value_bbox"); zb = next((z for z in l["zones"] + l["flagged_zones"] if z["field"] == f), None)
                d += abs(a[1] - zb["y"]) if (a and zb) else 0.05
            return d
        if cov:
            b = min(cov, key=lambda l: (round(cd(l) / 0.01), -l["n_pages"]))
            if cd(b) <= 0.03: return {"layout_id": b["layout_id"], "match": round(1 - cd(b) / 0.1, 3), "placement": "exact", "zones": zl(b)}
        return {"layout_id": None, "reason": "cover with unknown arrangement", "zones": []}
    return {"layout_id": None, "reason": f"no title block ({pg['role']})", "zones": []}

def cox_resolve(pg, zones):
    """Zones marked cox_check (mixed Cox / other company across jobs): read this page's OCR inside the box; if it names
    Cox Research the box is Cox branding (not redacted), otherwise it stays sensitive. No text is printed."""
    import re
    L = list(pg.get("lines") or []) + [dict(l, b=frame_box_to_page(l["b"], pg["frame"])) for l in (pg.get("flines") or []) if pg.get("frame") in ("left", "right")]
    out = []
    for z in zones:
        if z.get("cox_check"):
            b = [z["x"], z["y"], z["x"] + z["w"], z["y"] + z["h"]]
            hit = any("COX" in re.sub(r"[^A-Z]", "", l["t"].upper()) for l in L if inter(l["b"], b) > 0.5 * area(l["b"]))
            z = dict(z, cox_check_result="cox" if hit else "not cox")
            if hit: z.update(role="cox_brand", redact=False, map="custom", transparent=True, text="")
        out.append(z)
    return out

if __name__ == "__main__":
    ap = argparse.ArgumentParser(); ap.add_argument("pdf"); ap.add_argument("--pages"); ap.add_argument("--include-flagged", action="store_true")
    ap.add_argument("--layouts", default=os.path.join(HERE, "layouts.json")); a = ap.parse_args()
    LAY = json.load(open(a.layouts))["layouts"]
    doc = fitz.open(a.pdf)
    sel = [int(x) for x in a.pages.split(",")] if a.pages else range(1, len(doc) + 1)
    out = []
    for pn in sel:
        p = doc[pn - 1]
        pg = extract.page_record(p, pn - 1); pg["n_pages"] = len(doc)
        pg["hs"] = remerge([tuple(x) for x in pg["hs"]]); pg["vs"] = remerge([tuple(x) for x in pg["vs"]])
        fr, _ = detect_frame(pg["hs"], pg["vs"])
        if fr in ("left", "right"):  # rotated title block: OCR the upright render (same as reocr.py)
            import numpy as np
            pix = p.get_pixmap(dpi=150)
            img = np.frombuffer(pix.samples, np.uint8).reshape(pix.height, pix.width, pix.n)[:, :, :3]
            img = np.ascontiguousarray(np.rot90(img, k=1 if fr == "left" else -1)); Hh, Ww = img.shape[:2]
            res, _ = extract.ocr()(img)
            pg["flines"] = [{"t": t.strip(), "b": [min(q[0] for q in bx) / Ww, min(q[1] for q in bx) / Hh, max(q[0] for q in bx) / Ww, max(q[1] for q in bx) / Hh], "c": float(c), "s": "o"} for bx, t, c in (res or [])]
        r = match_page(pg, LAY, a.include_flagged)
        r["page"] = pn
        r["zones"] = cox_resolve(pg, r["zones"])
        # SCHEMATICai-ready view: profile key as exported in layouts_overlay.json + zones in exact LAYOUT_RULES shape
        base_lid = (r.get("layout_id") or "").split("~")[0]
        if base_lid in LAY:
            l = LAY[base_lid]
            r["profile_key"] = appexport.profile_key(l); r["base_profile"] = appexport.base_profile(l)
            r["app_zones"] = appexport.export_zones(l, zones=[z for z in r["zones"] if "flag" not in z], include_flagged=(l["class"] == "COVER"))
            if l["class"] == "NOTB": r["app_zones"] = []
        else:
            r["profile_key"] = None; r["app_zones"] = []
            cls_ = pg.get("cls")
            r["base_profile"] = "COVER_TEMPLATE" if pn == 1 else ("INFO" if cls_ == "INFO" else ("SCHEMATIC_LANDSCAPE" if pg["w"] > pg["h"] else "SCHEMATIC_PORTRAIT"))
        r["zones"] = [{k: v for k, v in z.items() if k not in ("own_measurement",)} for z in r["zones"]]
        out.append(r)
    print(json.dumps(out, indent=1))
