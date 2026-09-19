"""Deterministic auto-layout for figure specs.

Scientific meaning and explicit geometry both come from the spec; this module
only derives coordinates when they are not given. Every derived value is
deterministic so geometry QA and the two renderers agree.
"""

from __future__ import annotations

from layout_contracts import (TITLE_ZONE, NO_BIG_TITLE_TYPES, safe_margin,
                              estimate_text_width, estimate_text_height, ANNOTATION_ZONE)

NODE_SIZES = {
    "input": (128, 44), "output": (128, 44), "feature": (120, 44),
    "feature-sequence": (146, 44), "module": (144, 52), "learned-module": (150, 54),
    "frozen-module": (146, 52), "cache": (136, 58), "operator": (44, 44),
    "loss": (128, 42), "data": (128, 44), "backbone": (176, 62), "head": (136, 46),
    "expert": (150, 54), "predictor": (156, 54), "tensor": (128, 48),
    "group": (200, 120), "text": (168, 30), "image": (120, 80),
    "timestep": (64, 40), "vector": (124, 36),
}


def _size(node: dict) -> tuple[float, float]:
    base = NODE_SIZES.get(node["type"], (140, 50))
    if node.get("repeat", 1) > 1:
        return (base[0] + 18, base[1])
    return base


def _panel_grid(spec: dict, style: dict, canvas: dict, content_top: float, bottom_reserve: float = 0.0):
    margin = style["spacing"]["margin"]
    gap = style["spacing"]["panel_gap"]
    panels_spec = spec.get("panels") or []
    avail_w = canvas["w"] - 2 * margin
    avail_h = canvas["h"] - content_top - margin - bottom_reserve
    if not panels_spec:
        return [{"id": "__main__", "label": None, "x": margin, "y": content_top,
                 "w": avail_w, "h": avail_h, "role": None, "emphasis": False}]
    cols = max(p.get("column", 0) + p.get("span", 1) for p in panels_spec)
    rows = max(p.get("row", 0) for p in panels_spec) + 1
    colw = (avail_w - (cols - 1) * gap) / cols
    rowh = (avail_h - (rows - 1) * gap) / rows
    out = []
    for p in panels_spec:
        col = p.get("column", 0)
        row = p.get("row", 0)
        span = p.get("span", 1)
        out.append({
            "id": p["id"], "label": p.get("label"), "role": p.get("role"),
            "emphasis": bool(p.get("emphasis")),
            "x": margin + col * (colw + gap),
            "y": content_top + row * (rowh + gap),
            "w": colw * span + gap * (span - 1),
            "h": rowh,
        })
    return out


def _arrange_columns(nodes: list[dict], inner: dict, style: dict) -> dict:
    """Column-aware layout: stack nodes vertically within a column."""
    gap = style["spacing"]["node_gap"]
    cols: dict[int, list[dict]] = {}
    for n in nodes:
        cols.setdefault(int(n.get("column", 0)), []).append(n)
    for c in cols:
        cols[c].sort(key=lambda n: n.get("order", 0))
    widths = {c: max(_size(n)[0] for n in ns) for c, ns in cols.items()}
    total_w = sum(widths.values()) + gap * (len(cols) - 1)
    x = inner["x"] + max(0.0, (inner["w"] - total_w) / 2)
    placed: dict = {}
    for c in sorted(cols):
        ns = cols[c]
        cw = widths[c]
        heights = [_size(n)[1] for n in ns]
        total_h = sum(heights) + gap * (len(ns) - 1)
        y = inner["y"] + max(0.0, (inner["h"] - total_h) / 2)
        for n, h in zip(ns, heights):
            nw = _size(n)[0]
            placed[n["id"]] = {"x": x + (cw - nw) / 2, "y": y, "w": nw, "h": h}
            y += h + gap
        x += cw + gap
    return placed


def _arrange(nodes: list[dict], inner: dict, style: dict) -> dict:
    gap = style["spacing"]["node_gap"]
    if not nodes:
        return {}
    if any(n.get("column") is not None for n in nodes):
        return _arrange_columns(nodes, inner, style)
    max_per_row = max(2, int(inner["w"] / (170 + gap)))
    rows = [nodes[i:i + max_per_row] for i in range(0, len(nodes), max_per_row)]
    row_hs = [max(_size(n)[1] for n in r) for r in rows]
    total_h = sum(row_hs) + gap * (len(rows) - 1)
    y = inner["y"] + max(0.0, (inner["h"] - total_h) / 2)
    placed: dict = {}
    for row, rh in zip(rows, row_hs):
        widths = [_size(n)[0] for n in row]
        total_w = sum(widths) + gap * (len(row) - 1)
        x = inner["x"] + max(0.0, (inner["w"] - total_w) / 2)
        for n, nw in zip(row, widths):
            nh = _size(n)[1]
            placed[n["id"]] = {"x": x, "y": y + (rh - nh) / 2, "w": nw, "h": nh}
            x += nw + gap
        y += rh + gap
    return placed


def _route(a: dict, b: dict, waypoints: list | None) -> list[tuple[float, float]]:
    acx, acy = a["x"] + a["w"] / 2, a["y"] + a["h"] / 2
    bcx, bcy = b["x"] + b["w"] / 2, b["y"] + b["h"] / 2
    if abs(acy - bcy) < 14:
        if acx <= bcx:
            p1, p3 = (a["x"] + a["w"], acy), (b["x"], bcy)
        else:
            p1, p3 = (a["x"], acy), (b["x"] + b["w"], bcy)
        return [p1, p3]
    if acx <= bcx:
        p1, p3 = (a["x"] + a["w"], acy), (b["x"], bcy)
    else:
        p1, p3 = (a["x"], acy), (b["x"] + b["w"], bcy)
    midx = (p1[0] + p3[0]) / 2
    pts = [p1, (midx, p1[1])]
    for wp in (waypoints or []):
        pts.append((float(wp[0]), float(wp[1])))
    pts.append((midx, p3[1]))
    pts.append(p3)
    return pts


def compute(spec: dict, style: dict) -> dict:
    fig = spec["figure"]
    canvas = {
        "w": float(fig.get("width") or style["canvas"]["width"]),
        "h": float(fig.get("height") or style["canvas"]["height"]),
        "bg": style["canvas"]["background"],
    }
    margin = max(style["spacing"]["margin"], safe_margin(canvas["w"], canvas["h"]))
    style = {**style, "spacing": {**style["spacing"], "margin": margin}}

    title = None
    content_top = margin
    if fig.get("title") and fig["type"] not in NO_BIG_TITLE_TYPES:
        size = min(style["typography"]["title"]["size"], TITLE_ZONE["max_font"])
        title = {"text": fig["title"], "x": margin, "y": margin,
                 "w": canvas["w"] - 2 * margin, "h": size * 1.4, "size": size}
        content_top = margin + TITLE_ZONE["height"]

    legend_entries = spec.get("legend") or []
    legend_reserve = 0.0
    if legend_entries:
        lsize = style["typography"]["label"]["size"]
        legend_reserve = lsize * 2.0 * len(legend_entries) + 10 + style["spacing"]["base"]

    panels = _panel_grid(spec, style, canvas, content_top, legend_reserve)
    panel_by_id = {p["id"]: p for p in panels}

    # group nodes by panel
    groups: dict[str, list[dict]] = {p["id"]: [] for p in panels}
    for node in spec["nodes"]:
        pid = node.get("panel") or panels[0]["id"]
        groups.setdefault(pid, []).append(node)

    placed_nodes: dict[str, dict] = {}
    node_panel: dict[str, str] = {}
    padding = style["spacing"]["padding"]
    label_h = style["typography"]["panel_label"]["size"] * 1.6
    for pid, nodes in groups.items():
        panel = panel_by_id.get(pid)
        if panel is None:
            continue
        ordered = sorted(nodes, key=lambda n: (n.get("row", 0), n.get("order", n.get("column", 0))))
        inner = {
            "x": panel["x"] + padding,
            "y": panel["y"] + (label_h + padding if panel.get("label") else padding),
            "w": panel["w"] - 2 * padding,
            "h": panel["h"] - padding - (label_h + padding if panel.get("label") else padding),
        }
        placed = _arrange(ordered, inner, style)
        for n in ordered:
            node_panel[n["id"]] = pid
            g = dict(placed.get(n["id"], {"x": inner["x"], "y": inner["y"],
                                          "w": _size(n)[0], "h": _size(n)[1]}))
            if n.get("geometry"):
                geo = n["geometry"]
                g.update({k: float(geo[k]) for k in ("x", "y", "w", "h") if k in geo})
                g["explicit"] = True
            placed_nodes[n["id"]] = g

    # annotations first, so they count toward the content box when we hug it
    annotations = []
    ann_style = style["typography"]["annotation"]
    for a in spec.get("annotations", []):
        t = placed_nodes.get(a["target"])
        if not t:
            continue
        text = a["text"]
        size = min(ann_style["size"], ANNOTATION_ZONE["max_font"])
        w = min(estimate_text_width(text, size) + 12, 280)
        h = estimate_text_height(text, size, w) + 8
        placement = a.get("placement", "above")
        clr = ANNOTATION_ZONE["clearance"]
        pid = node_panel.get(a["target"])
        peers = [placed_nodes[n["id"]] for n in groups.get(pid, []) if n["id"] in placed_nodes] or [t]
        panel_top = min(p["y"] for p in peers)
        panel_bottom = max(p["y"] + p["h"] for p in peers)
        if placement == "above":
            x, y = t["x"] + t["w"] / 2 - w / 2, panel_top - h - clr
        elif placement == "below":
            x, y = t["x"] + t["w"] / 2 - w / 2, panel_bottom + clr
        elif placement == "left":
            x, y = t["x"] - w - clr, t["y"] + t["h"] / 2 - h / 2
        else:
            x, y = t["x"] + t["w"] + clr, t["y"] + t["h"] / 2 - h / 2
        x = max(margin, min(x, canvas["w"] - margin - w))
        annotations.append({"id": a.get("id") or f"ann_{a['target']}", "target": a["target"],
                            "role": a.get("role", "note"), "text": text,
                            "x": x, "y": y, "w": w, "h": h, "size": size,
                            "placement": placement})

    # Hug the content when there is a single panel: shrink it around its nodes
    # and annotations and recenter everything, so a method-overview does not sit
    # in a sea of whitespace.
    if len(panels) == 1 and placed_nodes:
        rects = [{"x": g["x"], "y": g["y"], "w": g["w"], "h": g["h"]} for g in placed_nodes.values()]
        rects += [{"x": a["x"], "y": a["y"], "w": a["w"], "h": a["h"]} for a in annotations]
        xs0 = min(r["x"] for r in rects)
        ys0 = min(r["y"] for r in rects)
        xs1 = max(r["x"] + r["w"] for r in rects)
        ys1 = max(r["y"] + r["h"] for r in rects)
        pad = padding
        label_h = style["typography"]["panel_label"]["size"] * 1.6 if panels[0].get("label") else 0
        new_w = (xs1 - xs0) + 2 * pad
        new_h = (ys1 - ys0) + 2 * pad + label_h
        # tighten the canvas so a short pipeline is not buried in whitespace,
        # keeping room below for a legend when one exists
        canvas["h"] = round(new_h + 2 * margin + legend_reserve, 1)
        canvas["w"] = round(max(new_w + 2 * margin, canvas["w"] * 0.5), 1)
        if title:
            title["w"] = canvas["w"] - 2 * margin
        dx = (canvas["w"] - new_w) / 2 - (xs0 - pad)
        dy = (canvas["h"] - new_h) / 2 - (ys0 - pad - label_h)
        for g in placed_nodes.values():
            g["x"] += dx
            g["y"] += dy
        for a in annotations:
            a["x"] += dx
            a["y"] += dy
        panels = [{**panels[0], "x": xs0 - pad + dx, "y": ys0 - pad - label_h + dy,
                   "w": new_w, "h": new_h}]
        panel_by_id = {panels[0]["id"]: panels[0]}

    edges = []
    for e in spec.get("edges", []):
        a = placed_nodes.get(e["from"])
        b = placed_nodes.get(e["to"])
        if not a or not b:
            continue
        edges.append({"id": e.get("id") or f"{e['from']}->{e['to']}", "from": e["from"],
                      "to": e["to"], "role": e.get("role", "computation"),
                      "label": e.get("label"), "emphasis": bool(e.get("emphasis")),
                      "points": _route(a, b, e.get("waypoints"))})

    # legend
    legend = None
    entries = legend_entries
    if entries:
        size = style["typography"]["label"]["size"]
        row_h = size * 2.0
        w = max(estimate_text_width(e["label"], size) for e in entries) + 34
        h = row_h * len(entries) + 10
        legend = {"x": canvas["w"] - margin - w, "y": canvas["h"] - margin - h,
                  "w": w, "h": h, "size": size,
                  "entries": [{"role": e["role"], "label": e["label"],
                               "y": 5 + i * row_h} for i, e in enumerate(entries)]}

    mode = "columns" if any(n.get("column") is not None for n in spec["nodes"]) else "rows"
    return {"canvas": canvas, "margin": margin, "title": title, "panels": panels, "layout_mode": mode,
            "nodes": placed_nodes, "edges": edges, "annotations": annotations,
            "legend": legend}
