"""Build a renderer-neutral Figure IR from a figure spec, style and layout.

The IR is the single object consumed by the Draw.io renderer, the SVG renderer,
the geometric QA and the PowerPoint bridge, so all four agree on geometry and
semantics.
"""

from __future__ import annotations

import copy

import layout
import style as style_mod


def _rgb(h: str) -> tuple[int, int, int]:
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def _hex(rgb) -> str:
    return "#%02X%02X%02X" % tuple(max(0, min(255, int(round(c)))) for c in rgb)


def blend(a: str, b: str, t: float) -> str:
    ra, rb = _rgb(a), _rgb(b)
    return _hex(tuple(ra[i] * (1 - t) + rb[i] * t for i in range(3)))


def luminance(h: str) -> float:
    r, g, b = _rgb(h)
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255.0


def _shape(node: dict) -> str:
    if node.get("shape"):
        return node["shape"]
    return {
        "operator": "ellipse", "cache": "stack", "tensor": "rect", "group": "rect",
        "text": "none", "image": "rect", "vector": "rect",
    }.get(node["type"], "rounded")


def build(spec: dict, profile: dict) -> dict:
    st = style_mod.resolve(profile)
    lay = layout.compute(spec, st)
    bg = st["canvas"]["background"]
    dark = luminance(bg) < 0.5
    default_text = "#E5E7EB" if dark else st["semantics"]["neutral"]

    nodes = []
    for n in spec["nodes"]:
        g = lay["nodes"].get(n["id"])
        if not g:
            continue
        role = n.get("role") or ("neutral")
        color = style_mod.semantic_color(st, role)
        shape = _shape(n)
        if n["type"] in ("input", "output"):
            fill = blend(bg, color, 0.10)
        elif shape == "none":
            fill = "none"
        else:
            fill = blend(color, bg, 0.86)
        ts = style_mod.text(st, "module" if n["type"] not in ("text",) else "label")
        nodes.append({
            "id": n["id"], "semantic_id": n.get("semantic_id"), "type": n["type"],
            "label": n.get("label") or n["id"], "detail": n.get("detail"),
            "role": role, "repeat": n.get("repeat", 1), "shape": shape,
            "x": round(g["x"], 2), "y": round(g["y"], 2),
            "w": round(g["w"], 2), "h": round(g["h"], 2),
            "explicit": bool(g.get("explicit")),
            "color": color, "fill": fill,
            "text": {"size": ts["size"], "weight": ts["weight"],
                     "color": ts["color"] if dark else default_text,
                     "family": ts["family"]},
        })

    edges = []
    for e in lay["edges"]:
        es = style_mod.edge_style(st, e["role"])
        edges.append({
            "id": e["id"], "from": e["from"], "to": e["to"], "role": e["role"],
            "label": e.get("label"), "emphasis": e["emphasis"],
            "points": [[round(x, 2), round(y, 2)] for x, y in e["points"]],
            "color": es.get("color") or (st["semantics"]["neutral"]),
            "dash": es["style"] != "solid",
            "dash_style": es["style"],
            "arrowhead": es["arrowhead"],
            "width": st["geometry"]["arrow_width"] * (1.5 if e["emphasis"] else 1.0),
        })

    annotations = []
    for a in lay["annotations"]:
        color = style_mod.semantic_color(st, a["role"])
        annotations.append({**a, "color": color,
                            "text_color": default_text if dark else st["semantics"]["neutral"]})

    panels = []
    for p in lay["panels"]:
        color = style_mod.semantic_color(st, p.get("role") or "neutral")
        panels.append({**p, "color": color,
                       "fill": blend(color, bg, 0.94) if p.get("role") else "none"})

    title = lay["title"]
    if title:
        ts = style_mod.text(st, "title")
        title = {**title, "color": ts["color"] if dark else default_text,
                 "weight": ts["weight"], "family": ts["family"]}

    return {
        "figure": spec["figure"],
        "canvas": lay["canvas"],
        "layout_mode": lay.get("layout_mode", "rows"),
        "style": {
            "name": st["name"],
            "background": bg,
            "corner_radius": st["geometry"]["corner_radius"],
            "stroke_width": st["geometry"]["stroke_width"],
            "panel_stroke_width": st["geometry"]["panel_stroke_width"],
            "panel_dash": st["geometry"]["panel_dash"],
            "semantics": st["semantics"],
            "typography": {k: st["typography"].get(k) for k in
                           ("family", "title", "module", "label", "annotation", "panel_label")},
            "spacing": st["spacing"],
        },
        "panels": panels,
        "nodes": nodes,
        "edges": edges,
        "annotations": annotations,
        "legend": lay["legend"],
        "title": title,
        "shared_concepts": spec.get("shared_concepts", []),
        "comparison": spec.get("comparison"),
        "provenance": spec.get("provenance", {}),
    }


def node_by_id(ir: dict, node_id: str) -> dict | None:
    for n in ir["nodes"]:
        if n["id"] == node_id:
            return n
    return None


def deep_copy(ir: dict) -> dict:
    return copy.deepcopy(ir)
