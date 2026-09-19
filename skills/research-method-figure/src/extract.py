"""Extract a reusable style profile from a reference figure.

Supports SVG and .drawio (parsed, high confidence) and raster images (palette
and density heuristics, lower confidence). Fonts and exact geometry cannot be
recovered from a raster image, and the profile says so via per-field confidence
rather than inventing values.
"""

from __future__ import annotations

import colorsys
import pathlib
import re
from collections import Counter
from xml.etree import ElementTree as ET

HEX = re.compile(r"#([0-9A-Fa-f]{6})")


class ExtractError(Exception):
    pass


def _norm_hex(value: str | None) -> str | None:
    if not value:
        return None
    v = value.strip()
    if v.startswith("rgb"):
        nums = re.findall(r"\d+", v)
        if len(nums) >= 3:
            return "#%02X%02X%02X" % tuple(int(x) for x in nums[:3])
        return None
    if v.lower() in ("none", "transparent"):
        return None
    if not v.startswith("#"):
        v = "#" + v
    if len(v) == 4:  # #abc
        v = "#" + "".join(c * 2 for c in v[1:])
    return v.upper() if HEX.fullmatch(v) else None


def _hsv(hex_color: str):
    r, g, b = (int(hex_color[i:i + 2], 16) / 255 for i in (1, 3, 5))
    return colorsys.rgb_to_hsv(r, g, b)


def _map_roles(counts: list[tuple[str, int]]) -> dict:
    """Heuristic role assignment from a frequency-sorted palette."""
    roles = {}
    usable = [(c, n) for c, n in counts if c]
    if not usable:
        return {"shared": "#6B7280", "competitor": "#D97706", "ours": "#2563EB",
                "auxiliary": "#059669", "neutral": "#374151"}
    # neutral = darkest
    neutral = min(usable, key=lambda cn: sum(int(cn[0][i:i + 2], 16) for i in (1, 3, 5)))[0]
    roles["neutral"] = neutral
    rest = [(c, n) for c, n in usable if c != neutral]
    for role, test in (
        ("ours", lambda h, s, v: 0.45 <= h <= 0.72 and s > 0.25),
        ("competitor", lambda h, s, v: (h <= 0.14 or h >= 0.96) and s > 0.3),
        ("auxiliary", lambda h, s, v: 0.22 <= h <= 0.47 and s > 0.25),
    ):
        cand = [(c, n) for c, n in rest if test(*_hsv(c))]
        if cand:
            roles[role] = max(cand, key=lambda cn: cn[1])[0]
            rest = [(c, n) for c, n in rest if c != roles[role]]
    # shared = a mid-tone, low-saturation colour (avoid near-white fills and text)
    mid = [(c, n) for c, n in rest
           if _hsv(c)[1] < 0.32 and 0.15 < _hsv(c)[2] < 0.86]
    if mid:
        roles.setdefault("shared", max(mid, key=lambda cn: cn[1])[0])
    elif rest:
        roles.setdefault("shared", rest[0][0])
    roles.setdefault("shared", roles["neutral"])
    roles.setdefault("ours", "#2563EB")
    roles.setdefault("competitor", "#D97706")
    roles.setdefault("auxiliary", "#059669")
    roles.setdefault("changed", roles["ours"])
    roles.setdefault("added", roles["auxiliary"])
    roles.setdefault("removed", roles["competitor"])
    return roles


# ---------------------------------------------------------------------------
# SVG
# ---------------------------------------------------------------------------
def extract_from_svg(path: pathlib.Path) -> dict:
    tree = ET.parse(path)
    root = tree.getroot()
    fills, strokes, widths, families, sizes, weights = Counter(), Counter(), Counter(), Counter(), Counter(), Counter()
    max_rx = 0.0
    dashed = False
    root_fill = None
    svg_w = root.get("width")
    svg_h = root.get("height")

    for el in root.iter():
        tag = el.tag.split("}")[-1]
        style = el.get("style", "")
        props = dict(
            (kv.split(":", 1)[0].strip(), kv.split(":", 1)[1].strip())
            for kv in style.split(";") if ":" in kv
        )
        fill = _norm_hex(el.get("fill") or props.get("fill"))
        stroke = _norm_hex(el.get("stroke") or props.get("stroke"))
        if fill:
            fills[fill] += 1
        if stroke:
            strokes[stroke] += 1
        sw = el.get("stroke-width") or props.get("stroke-width")
        if sw:
            try:
                widths[round(float(re.sub(r"[^0-9.]", "", sw)), 2)] += 1
            except ValueError:
                pass
        if el.get("stroke-dasharray") or props.get("stroke-dasharray"):
            dashed = True
        if tag == "rect":
            try:
                rx = float(el.get("rx") or props.get("rx") or 0)
                max_rx = max(max_rx, rx)
                if svg_w and svg_h and fill:
                    rw = float(re.sub(r"[^0-9.]", "", el.get("width", "0")) or 0)
                    rh = float(re.sub(r"[^0-9.]", "", el.get("height", "0")) or 0)
                    if rw >= float(re.sub(r"[^0-9.]", "", svg_w) or 1e9) * 0.98 and \
                       rh >= float(re.sub(r"[^0-9.]", "", svg_h) or 1e9) * 0.98:
                        root_fill = fill
            except ValueError:
                pass
        if tag == "text":
            fam = el.get("font-family") or props.get("font-family")
            if fam:
                families[fam.split(",")[0].strip()] += 1
            fs = el.get("font-size") or props.get("font-size")
            if fs:
                try:
                    sizes[round(float(re.sub(r"[^0-9.]", "", fs)), 1)] += 1
                except ValueError:
                    pass
            fw = el.get("font-weight") or props.get("font-weight")
            if fw:
                weights[str(fw)] += 1

    bg = root_fill or (fills.most_common(1)[0][0] if fills else "#FFFFFF")
    palette = [(c, n) for c, n in fills.most_common() if c != bg]
    return {
        "background": bg,
        "palette": palette,
        "stroke": strokes.most_common(1)[0][0] if strokes else None,
        "stroke_width": widths.most_common(1)[0][0] if widths else None,
        "corner_radius": max_rx or None,
        "dashed": dashed,
        "family": families.most_common(1)[0][0] if families else None,
        "sizes": sorted(sizes),
        "weight_max": max((int(w) for w in weights), default=700),
        "reference_kind": "svg",
        "confidence": "high",
    }


# ---------------------------------------------------------------------------
# drawio
# ---------------------------------------------------------------------------
def _drawio_style(style: str) -> dict:
    out = {}
    for kv in style.split(";"):
        if "=" in kv:
            k, v = kv.split("=", 1)
            out[k.strip()] = v.strip()
    return out


def extract_from_drawio(path: pathlib.Path) -> dict:
    tree = ET.parse(path)
    fills, strokes, widths, families, sizes = Counter(), Counter(), Counter(), Counter(), Counter()
    rounded = False
    dashed = False
    max_radius = 0.0
    for cell in tree.iter():
        if cell.tag.split("}")[-1] != "mxCell":
            continue
        st = _drawio_style(cell.get("style") or "")
        fill = _norm_hex(st.get("fillColor"))
        stroke = _norm_hex(st.get("strokeColor"))
        if fill:
            fills[fill] += 1
        if stroke:
            strokes[stroke] += 1
        if st.get("strokeWidth"):
            try:
                widths[round(float(st["strokeWidth"]), 2)] += 1
            except ValueError:
                pass
        if st.get("fontFamily"):
            families[st["fontFamily"]] += 1
        if st.get("fontSize"):
            try:
                sizes[round(float(st["fontSize"]), 1)] += 1
            except ValueError:
                pass
        if st.get("rounded") == "1":
            rounded = True
            if st.get("arcSize"):
                max_radius = max(max_radius, float(st["arcSize"]))
        if st.get("dashed") == "1":
            dashed = True
    bg = "#FFFFFF"
    palette = [(c, n) for c, n in fills.most_common() if c != bg]
    return {
        "background": bg,
        "palette": palette,
        "stroke": strokes.most_common(1)[0][0] if strokes else None,
        "stroke_width": widths.most_common(1)[0][0] if widths else None,
        "corner_radius": max_radius or (6.0 if rounded else None),
        "dashed": dashed,
        "family": families.most_common(1)[0][0] if families else None,
        "sizes": sorted(sizes),
        "weight_max": 700,
        "reference_kind": "drawio",
        "confidence": "high",
    }


# ---------------------------------------------------------------------------
# raster
# ---------------------------------------------------------------------------
def extract_from_image(path: pathlib.Path) -> dict:
    try:
        from PIL import Image
    except Exception as exc:  # pragma: no cover
        raise ExtractError("Pillow is required for raster style extraction") from exc
    im = Image.open(path).convert("RGB")
    im.thumbnail((240, 240))
    q = im.quantize(colors=24, method=Image.MEDIANCUT).convert("RGB")
    counts = Counter(q.getdata())
    total = sum(counts.values())
    bg_rgb = counts.most_common(1)[0][0]
    bg = "#%02X%02X%02X" % bg_rgb
    palette = []
    for rgb, n in counts.most_common():
        if rgb == bg_rgb:
            continue
        palette.append(("#%02X%02X%02X" % rgb, n))
    ink = sum(n for rgb, n in counts.items() if rgb != bg_rgb) / max(1, total)
    return {
        "background": bg,
        "palette": palette,
        "stroke": None,
        "stroke_width": None,
        "corner_radius": None,
        "dashed": None,
        "family": None,
        "sizes": [],
        "weight_max": 700,
        "ink_ratio": round(ink, 4),
        "reference_kind": "raster",
        "confidence": "low",
    }


# ---------------------------------------------------------------------------
# profile assembly
# ---------------------------------------------------------------------------
def build_profile(name: str, data: dict, reference: str) -> dict:
    roles = _map_roles(data.get("palette", []))
    sizes = data.get("sizes") or []
    conf = data.get("confidence", "low")

    def pick(role, default):
        return data.get(role) if data.get(role) is not None else default

    title_size = max(sizes) if sizes else 15
    module_size = sizes[len(sizes) // 2] if sizes else 9.5
    ann_size = min(sizes) if sizes else 8

    confidence = {
        "palette": {"value": [c for c, _ in data.get("palette", [])][:8], "confidence": conf},
        "background": {"value": data["background"], "confidence": conf},
        "stroke_width": {"value": data.get("stroke_width"), "confidence": "high" if data.get("stroke_width") else "unknown"},
        "corner_radius": {"value": data.get("corner_radius"), "confidence": "high" if data.get("corner_radius") else "unknown"},
        "font_family": {"value": data.get("family"), "confidence": "high" if data.get("family") else "unknown"},
        "font_sizes": {"value": sizes, "confidence": "high" if sizes else "unknown"},
        "spacing": {"value": None, "confidence": "unknown"},
    }

    profile = {
        "style_profile": {
            "name": name,
            "source": {"kind": "extraction", "reference": reference,
                       "reference_kind": data.get("reference_kind", "manual")},
            "canvas": {"background": data["background"], "width": 1200, "height": 620},
            "typography": {
                "family": data.get("family") or "Arial",
                "fallback": ["Helvetica", "Helvetica Neue", "DejaVu Sans"],
                "title": {"size": title_size, "weight": data.get("weight_max", 700)},
                "module": {"size": module_size, "weight": 600},
                "label": {"size": module_size, "weight": 600},
                "annotation": {"size": ann_size, "weight": 400},
                "panel_label": {"size": max(ann_size, module_size), "weight": 700},
            },
            "geometry": {
                "corner_radius": pick("corner_radius", 6),
                "stroke_width": pick("stroke_width", 1.2),
                "arrow_width": pick("stroke_width", 1.2),
                "panel_stroke_width": 1.0,
                "panel_dash": "6 4",
            },
            "spacing": {"base": 8, "margin": 26, "panel_gap": 24, "node_gap": 16,
                        "row_gap": 20, "padding": 8},
            "semantics": roles,
            "edges": {
                "computation": {"style": "solid", "arrowhead": "classic"},
                "reuse": {"style": "dashed" if data.get("dashed") else "solid", "arrowhead": "classic"},
                "reference": {"style": "dotted", "arrowhead": "open"},
                "feedback": {"style": "dashed", "arrowhead": "classic"},
                "loss": {"style": "solid", "arrowhead": "classic"},
                "data": {"style": "solid", "arrowhead": "classic"},
                "gradient": {"style": "dashed", "arrowhead": "classic"},
            },
            "confidence": confidence,
            "notes": [
                "Extracted from a reference used as STYLE_SOURCE only; scientific content was not transferred.",
                f"Overall extraction confidence: {conf}.",
            ],
        }
    }
    return profile


def extract(path: str | pathlib.Path, name: str) -> dict:
    p = pathlib.Path(path)
    if not p.exists():
        raise ExtractError(f"reference not found: {p}")
    suffix = p.suffix.lower()
    if suffix == ".svg":
        data = extract_from_svg(p)
    elif suffix == ".drawio":
        data = extract_from_drawio(p)
    elif suffix in (".png", ".jpg", ".jpeg", ".webp"):
        data = extract_from_image(p)
    else:
        raise ExtractError(f"unsupported reference type: {suffix}")
    return build_profile(name, data, reference=str(p))
