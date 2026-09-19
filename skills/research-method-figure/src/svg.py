"""Render a Figure IR to vector SVG (the reliable preview / PDF / PNG source)."""

from __future__ import annotations

from xml.sax.saxutils import escape


def _esc(s) -> str:
    return escape(str(s))


def _wrap(text: str, size: float, width: float) -> list[str]:
    per = max(3, int((width - 10) / max(1e-6, size * 0.55)))
    lines: list[str] = []
    for para in str(text).split("\n"):
        words = para.split()
        if not words:
            lines.append("")
            continue
        cur = ""
        for w in words:
            if not cur:
                cur = w
            elif len(cur) + 1 + len(w) <= per:
                cur += " " + w
            else:
                lines.append(cur)
                cur = w
        lines.append(cur)
    return lines


def _text_block(text: str, cx: float, cy: float, width: float, size: float,
                color: str, family: str, weight: int, anchor: str = "middle") -> str:
    lines = _wrap(text, size, width)
    lh = size * 1.28
    total = len(lines) * lh
    start = cy - total / 2 + lh * 0.72
    x = cx if anchor == "middle" else cx
    tspans = "".join(
        f'<tspan x="{cx:.1f}" y="{start + i * lh:.1f}">{_esc(ln) or " "}</tspan>'
        for i, ln in enumerate(lines))
    return (f'<text font-family="{_esc(family)}" font-size="{size}" fill="{color}" '
            f'font-weight="{weight}" text-anchor="{anchor}">{tspans}</text>')


def _node_shape(n: dict, ir: dict) -> str:
    x, y, w, h = n["x"], n["y"], n["w"], n["h"]
    sw = ir["style"]["stroke_width"]
    r = ir["style"]["corner_radius"]
    if n["shape"] == "none":
        return ""
    if n["shape"] == "ellipse":
        return (f'<ellipse cx="{x + w / 2:.1f}" cy="{y + h / 2:.1f}" rx="{w / 2:.1f}" '
                f'ry="{h / 2:.1f}" fill="{n["fill"]}" stroke="{n["color"]}" stroke-width="{sw}"/>')
    if n["shape"] == "diamond":
        pts = f"{x + w / 2},{y} {x + w},{y + h / 2} {x + w / 2},{y + h} {x},{y + h / 2}"
        return f'<polygon points="{pts}" fill="{n["fill"]}" stroke="{n["color"]}" stroke-width="{sw}"/>'
    if n["shape"] in ("stack", "cylinder"):
        parts = [f'<rect x="{x + 6:.1f}" y="{y + 6:.1f}" width="{w:.1f}" height="{h:.1f}" rx="{r}" '
                 f'fill="{n["fill"]}" stroke="{n["color"]}" stroke-width="{sw}" opacity="0.55"/>']
        parts.append(f'<rect x="{x:.1f}" y="{y:.1f}" width="{w:.1f}" height="{h:.1f}" rx="{r}" '
                     f'fill="{n["fill"]}" stroke="{n["color"]}" stroke-width="{sw}"/>')
        return "".join(parts)
    rx = 0 if n["shape"] == "rect" else r
    return (f'<rect x="{x:.1f}" y="{y:.1f}" width="{w:.1f}" height="{h:.1f}" rx="{rx}" '
            f'fill="{n["fill"]}" stroke="{n["color"]}" stroke-width="{sw}"/>')


def _path(points: list) -> str:
    d = f"M {points[0][0]:.1f} {points[0][1]:.1f}"
    for x, y in points[1:]:
        d += f" L {x:.1f} {y:.1f}"
    return d


def _midpoint(points: list) -> tuple[float, float]:
    segs = []
    total = 0.0
    for a, b in zip(points[:-1], points[1:]):
        d = ((b[0] - a[0]) ** 2 + (b[1] - a[1]) ** 2) ** 0.5
        segs.append((total, total + d, a, b))
        total += d
    half = total / 2
    for s0, s1, a, b in segs:
        if s0 <= half <= s1:
            t = 0 if s1 == s0 else (half - s0) / (s1 - s0)
            return (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)
    return points[len(points) // 2]


def render(ir: dict) -> str:
    W, H = ir["canvas"]["w"], ir["canvas"]["h"]
    bg = ir["style"]["background"]
    parts: list[str] = [f'<rect width="{W}" height="{H}" fill="{bg}"/>']

    colors = sorted({e["color"] for e in ir["edges"]})
    defs = []
    for c in colors:
        cid = c.lstrip("#")
        defs.append(
            f'<marker id="arw-{cid}" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="7" '
            f'markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="{c}"/></marker>')
    parts.append("<defs>" + "".join(defs) + "</defs>")

    if ir.get("title"):
        t = ir["title"]
        parts.append(_text_block(t["text"], t["x"], t["y"] + t["h"] / 2, t["w"], t["size"],
                                 t["color"], t["family"], t["weight"], anchor="start"))

    for p in ir["panels"]:
        sw = ir["style"]["panel_stroke_width"]
        parts.append(f'<rect x="{p["x"]:.1f}" y="{p["y"]:.1f}" width="{p["w"]:.1f}" height="{p["h"]:.1f}" '
                     f'rx="{ir["style"]["corner_radius"]}" fill="{p["fill"]}" stroke="{p["color"]}" '
                     f'stroke-width="{sw}" stroke-dasharray="{ir["style"]["panel_dash"]}"/>')
        if p.get("label"):
            parts.append(f'<text x="{p["x"] + 10:.1f}" y="{p["y"] + 18:.1f}" '
                         f'font-family="{ir["style"]["typography"]["family"]}" '
                         f'font-size="{ir["style"]["typography"]["panel_label"]["size"]}" '
                         f'font-weight="700" fill="{p["color"]}">{_esc(p["label"])}</text>')

    for n in ir["nodes"]:
        parts.append(_node_shape(n, ir))
        if n.get("repeat", 1) > 1 and n["shape"] != "none":
            pass
        label = n["label"] + (f"  ×{n['repeat']}" if n.get("repeat", 1) > 1 else "")
        parts.append(_text_block(label, n["x"] + n["w"] / 2, n["y"] + n["h"] / 2, n["w"],
                                 n["text"]["size"], n["text"]["color"], n["text"]["family"],
                                 n["text"]["weight"]))

    for a in ir["annotations"]:
        parts.append(_text_block(a["text"], a["x"], a["y"] + a["h"] / 2, a["w"], a["size"],
                                 a["color"], ir["style"]["typography"]["family"], 400, anchor="start"))

    for e in ir["edges"]:
        cid = e["color"].lstrip("#")
        dash = f' stroke-dasharray="7 5"' if e["dash"] else ""
        parts.append(f'<path d="{_path(e["points"])}" fill="none" stroke="{e["color"]}" '
                     f'stroke-width="{e["width"]}"{dash} marker-end="url(#arw-{cid})"/>')
        if e.get("label"):
            mx, my = _midpoint(e["points"])
            parts.append(f'<text x="{mx:.1f}" y="{my - 5:.1f}" text-anchor="middle" '
                         f'font-family="{ir["style"]["typography"]["family"]}" '
                         f'font-size="{ir["style"]["typography"]["annotation"]["size"]}" '
                         f'fill="{e["color"]}">{_esc(e["label"])}</text>')

    if ir.get("legend"):
        lg = ir["legend"]
        parts.append(f'<rect x="{lg["x"]:.1f}" y="{lg["y"]:.1f}" width="{lg["w"]:.1f}" height="{lg["h"]:.1f}" '
                     f'rx="4" fill="none" stroke="#D1D5DB" stroke-dasharray="3 3"/>')
        for e in lg["entries"]:
            color = ir["style"]["semantics"].get(e["role"], "#374151")
            parts.append(f'<rect x="{lg["x"] + 8:.1f}" y="{lg["y"] + e["y"]:.1f}" width="12" height="12" fill="{color}"/>')
            parts.append(f'<text x="{lg["x"] + 26:.1f}" y="{lg["y"] + e["y"] + 10:.1f}" '
                         f'font-family="{ir["style"]["typography"]["family"]}" font-size="{lg["size"]}" '
                         f'fill="{ir["style"]["semantics"].get("neutral")}">{_esc(e["label"])}</text>')

    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" '
            f'viewBox="0 0 {W} {H}">' + "".join(parts) + "</svg>")
