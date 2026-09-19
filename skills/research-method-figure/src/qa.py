"""Static geometric pre-flight for figures.

Computable from geometry alone, before any render: text overflow, overlaps,
out-of-canvas nodes, arrows crossing unrelated nodes, inconsistent sizing,
spacing variance, tiny fonts, palette scatter and placeholders. Findings are
graded so a heuristic warning never blocks a legitimate figure.
"""

from __future__ import annotations

from layout_contracts import (SAFE_TEXT_BOX, LABEL_CLEARANCE, MIN_FONT_SIZE,
                              TITLE_ZONE, ANNOTATION_ZONE, safe_margin,
                              estimate_text_width, estimate_text_height,
                              NO_BIG_TITLE_TYPES)

PLACEHOLDER = __import__("re").compile(r"\b(TODO|TBD|FIXME|lorem ipsum|placeholder|xxx+)\b", __import__("re").I)


def _rect(n: dict) -> tuple[float, float, float, float]:
    return (n["x"], n["y"], n["x"] + n["w"], n["y"] + n["h"])


def _intersect(a, b, pad: float = 0.0) -> bool:
    return not (a[2] + pad <= b[0] or b[2] + pad <= a[0] or a[3] + pad <= b[1] or b[3] + pad <= a[1])


def _seg_rect(p1, p2, r, pad: float = 0.0) -> bool:
    x0, y0, x1, y1 = r[0] - pad, r[1] - pad, r[2] + pad, r[3] + pad
    if x0 <= p1[0] <= x1 and y0 <= p1[1] <= y1:
        return True
    if x0 <= p2[0] <= x1 and y0 <= p2[1] <= y1:
        return True

    def ccw(a, b, c):
        return (c[1] - a[1]) * (b[0] - a[0]) - (b[1] - a[1]) * (c[0] - a[0])

    corners = [(x0, y0), (x1, y0), (x1, y1), (x0, y1)]
    for i in range(4):
        c, d = corners[i], corners[(i + 1) % 4]
        if (ccw(p1, p2, c) * ccw(p1, p2, d) < 0) and (ccw(c, d, p1) * ccw(c, d, p2) < 0):
            return True
    return False


def preflight(ir: dict) -> list[dict]:
    findings: list[dict] = []
    add = lambda level, code, where, msg: findings.append(
        {"level": level, "code": code, "where": where, "message": msg})

    W, H = ir["canvas"]["w"], ir["canvas"]["h"]
    margin = safe_margin(W, H)
    nodes = [n for n in ir["nodes"] if n["shape"] != "none"]
    all_nodes = ir["nodes"]

    for n in all_nodes:
        x0, y0, x1, y1 = _rect(n)
        if x0 < -0.5 or y0 < -0.5 or x1 > W + 0.5 or y1 > H + 0.5:
            add("error", "outside_canvas", n["id"], f"node extends outside the canvas ({x0:.0f},{y0:.0f})-({x1:.0f},{y1:.0f})")
        elif x0 < margin or y0 < margin or x1 > W - margin or y1 > H - margin:
            add("warning", "outside_safe_zone", n["id"], "node enters the safe-zone margin")
        if n["shape"] != "none":
            need_h = estimate_text_height(n["label"], n["text"]["size"], n["w"]) + 2 * SAFE_TEXT_BOX["min_padding"]
            # wrapping handles long labels; only an unbreakable word can overflow
            longest_word = max((w for line in n["label"].split("\n") for w in line.split()),
                               key=len, default="")
            need_w = estimate_text_width(longest_word, n["text"]["size"]) + 2 * SAFE_TEXT_BOX["min_padding"]
            if need_h > n["h"] * 1.15:
                add("error", "text_overflow", n["id"], f"text needs ~{need_h:.0f}px height in {n['h']:.0f}px")
            elif need_h > n["h"] * 0.98:
                add("warning", "text_tight", n["id"], "text nearly fills the node vertically")
            if need_w > n["w"] * 1.15:
                add("warning", "text_wide", n["id"], f"longest line needs ~{need_w:.0f}px in {n['w']:.0f}px")
            if n["h"] / max(1.0, n["text"]["size"]) > 10:
                add("warning", "cavernous", n["id"], "node is much taller than its text")
        if n["text"]["size"] < MIN_FONT_SIZE:
            add("warning", "tiny_font", n["id"], f"font {n['text']['size']}pt below {MIN_FONT_SIZE}pt")
        if PLACEHOLDER.search(n["label"]):
            add("error", "placeholder", n["id"], "placeholder text in node label")

    for i in range(len(nodes)):
        for j in range(i + 1, len(nodes)):
            a, b = nodes[i], nodes[j]
            if a["type"] == "group" or b["type"] == "group":
                continue
            if _intersect(_rect(a), _rect(b)):
                add("error", "node_overlap", f"{a['id']}~{b['id']}", "nodes overlap")

    for e in ir["edges"]:
        pts = e["points"]
        for n in nodes:
            if n["id"] in (e["from"], e["to"]):
                continue
            for p1, p2 in zip(pts[:-1], pts[1:]):
                if _seg_rect(p1, p2, _rect(n), pad=2):
                    add("warning", "edge_through_node", e["id"], f"edge passes through node '{n['id']}'")
                    break

    ann_rects = []
    for a in ir["annotations"]:
        r = _rect(a)
        ann_rects.append((a, r))
        for n in all_nodes:
            if n["id"] == a["target"]:
                continue
            if _intersect(r, _rect(n), pad=LABEL_CLEARANCE / 2):
                add("warning", "annotation_overlap", a["id"], f"annotation overlaps node '{n['id']}'")
        if a["size"] < MIN_FONT_SIZE:
            add("warning", "tiny_font", a["id"], "annotation font is very small")
        if a["x"] < 0 or a["y"] < 0 or a["x"] + a["w"] > W or a["y"] + a["h"] > H:
            add("error", "outside_canvas", a["id"], "annotation extends outside the canvas")

    # repeated-module consistency
    by_type: dict[str, list] = {}
    for n in nodes:
        by_type.setdefault(n["type"], []).append(n)
    for t, group in by_type.items():
        if len(group) < 2 or t in ("text", "group"):
            continue
        ws = {round(n["w"]) for n in group}
        hs = {round(n["h"]) for n in group}
        if len(ws) > 1 or len(hs) > 1:
            add("warning", "inconsistent_size", t, f"'{t}' nodes differ in size: {sorted(ws)}x{sorted(hs)}")

    # spacing rhythm within a row (row layouts only)
    rows: dict[int, list] = {}
    if ir.get("layout_mode") != "columns":
        for n in nodes:
            rows.setdefault(round((n["y"] + n["h"] / 2) / 12), []).append(n)
    for _, row in rows.items():
        row = sorted(row, key=lambda n: n["x"])
        if len(row) < 3:
            continue
        # skip when columns are stacked (x-ranges overlap): not a simple row
        if any(row[i + 1]["x"] < row[i]["x"] + row[i]["w"] - 1 for i in range(len(row) - 1)):
            continue
        gaps = [row[i + 1]["x"] - (row[i]["x"] + row[i]["w"]) for i in range(len(row) - 1)]
        if not gaps:
            continue
        mean = sum(gaps) / len(gaps)
        if mean > 0:
            var = sum((g - mean) ** 2 for g in gaps) / len(gaps)
            if (var ** 0.5) / mean > 0.5:
                add("warning", "spacing_variance", "row", f"uneven gaps in a row: {[round(g) for g in gaps]}")

    if ir.get("legend"):
        lg = ir["legend"]
        lr = (lg["x"], lg["y"], lg["x"] + lg["w"], lg["y"] + lg["h"])
        for n in all_nodes:
            if n["shape"] == "none":
                continue
            if _intersect(lr, _rect(n)):
                add("warning", "legend_overlap", n["id"], "legend overlaps a node")

    fills = {n["fill"] for n in nodes if n["fill"] != "none"}
    if len(fills) > 10:
        add("warning", "palette_scatter", "figure", f"{len(fills)} distinct fills; palette looks scattered")

    if ir.get("title"):
        if ir["title"]["size"] > TITLE_ZONE["max_font"]:
            add("warning", "title_large", "title", "title font is larger than a paper figure needs")
        if ir["figure"]["type"] in NO_BIG_TITLE_TYPES and ir["title"]["size"] > 13:
            add("warning", "title_in_figure", "title", f"'{ir['figure']['type']}' usually omits an internal title")
    for a in ir["annotations"]:
        if a["size"] > ANNOTATION_ZONE["max_font"]:
            add("warning", "annotation_large", a["id"], "annotation font competes with module labels")

    return findings


def summarize(findings: list[dict]) -> dict:
    errors = [f for f in findings if f["level"] == "error"]
    warnings = [f for f in findings if f["level"] == "warning"]
    return {"errors": len(errors), "warnings": len(warnings), "findings": findings}
