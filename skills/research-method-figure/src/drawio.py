"""Render a Figure IR to editable Draw.io XML.

Native vertices and edges with explicit geometry. Nodes are tagged with their
semantic id so the figure can be traced back to the method model, and edges keep
source/target references so the diagram stays editable (moving a node re-routes
its edges).
"""

from __future__ import annotations

from xml.sax.saxutils import escape, quoteattr


def _esc(text: str) -> str:
    return escape(str(text), {'"': "&quot;", "'": "&apos;"})


def _bold(weight: int) -> int:
    return 1 if int(weight or 400) >= 600 else 0


def _node_style(n: dict, ir: dict) -> str:
    g = ir["style"]
    base = (f"whiteSpace=wrap;html=1;strokeColor={n['color']};strokeWidth={g['stroke_width']};"
            f"fontSize={n['text']['size']};fontColor={n['text']['color']};"
            f"fontFamily={n['text']['family']};fontStyle={_bold(n['text']['weight'])};")
    if n["shape"] == "none":
        return "text;html=1;align=center;verticalAlign=middle;" + base
    if n["shape"] == "ellipse":
        return "ellipse;" + base + f"fillColor={n['fill']};"
    if n["shape"] == "cylinder" or n["shape"] == "stack":
        return "shape=cylinder3;boundedLbl=1;backgroundOutline=1;size=8;" + base + f"fillColor={n['fill']};"
    if n["shape"] == "rect":
        return "rounded=0;" + base + f"fillColor={n['fill']};"
    if n["shape"] == "diamond":
        return "rhombus;" + base + f"fillColor={n['fill']};"
    return (f"rounded=1;arcSize={max(4, int(g['corner_radius']))};" + base +
            f"fillColor={n['fill']};")


def _panel_style(p: dict, ir: dict) -> str:
    g = ir["style"]
    return (f"rounded=1;arcSize={int(g['corner_radius'])};whiteSpace=wrap;html=1;"
            f"fillColor={p['fill']};strokeColor={p['color']};strokeWidth={g['panel_stroke_width']};"
            f"dashed=1;dashPattern={g['panel_dash']};verticalAlign=top;align=left;"
            f"fontSize={g['typography']['panel_label']['size']};fontColor={p['color']};"
            f"fontStyle=1;spacingLeft=8;spacingTop=4;")


def _edge_style(e: dict, ir: dict) -> str:
    dash = "dashed=1;dashPattern=6 4;" if e["dash"] else ""
    arrow = "none" if e["arrowhead"] == "none" else ("open" if e["arrowhead"] == "open" else "classic")
    return (f"edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;jumpStyle=arc;"
            f"strokeColor={e['color']};strokeWidth={e['width']};{dash}"
            f"endArrow={arrow};endFill=1;fontSize={ir['style']['typography']['annotation']['size']};"
            f"fontColor={e['color']};labelBackgroundColor=#FFFFFF;")


def _vertex(cell_id: str, value: str, style: str, x, y, w, h) -> str:
    return (f'<mxCell id={quoteattr(cell_id)} value={quoteattr(value)} style={quoteattr(style)} '
            f'vertex="1" parent="1"><mxGeometry x="{x}" y="{y}" width="{w}" height="{h}" as="geometry"/>'
            f'</mxCell>')


def _text_cell(cell_id: str, value: str, style: str, x, y, w, h) -> str:
    return (f'<mxCell id={quoteattr(cell_id)} value={quoteattr(value)} style={quoteattr(style)} '
            f'vertex="1" parent="1"><mxGeometry x="{x}" y="{y}" width="{w}" height="{h}" as="geometry"/>'
            f'</mxCell>')


def render(ir: dict) -> str:
    W, H = ir["canvas"]["w"], ir["canvas"]["h"]
    cells: list[str] = []

    if ir.get("title"):
        t = ir["title"]
        style = (f"text;html=1;align=left;verticalAlign=middle;fontSize={t['size']};"
                 f"fontColor={t['color']};fontFamily={t['family']};fontStyle=1;")
        cells.append(_text_cell("title", t["text"], style, t["x"], t["y"], t["w"], t["h"]))

    for p in ir["panels"]:
        label = p.get("label") or ""
        cells.append(_vertex(f"panel_{p['id']}", label, _panel_style(p, ir), p["x"], p["y"], p["w"], p["h"]))

    for n in ir["nodes"]:
        label = n["label"]
        if n.get("repeat", 1) > 1:
            label = f"{label}  ×{n['repeat']}"
        if n.get("semantic_id"):
            label = f"{label}\n[{n['semantic_id']}]" if n["type"] == "text" else label
        cells.append(_vertex(n["id"], label, _node_style(n, ir), n["x"], n["y"], n["w"], n["h"]))

    ann_style_base = (f"text;html=1;align=left;verticalAlign=middle;fontSize="
                      f"{ir['style']['typography']['annotation']['size']};")
    for a in ir["annotations"]:
        style = ann_style_base + f"fontColor={a['color']};"
        cells.append(_text_cell(f"ann_{a['id']}", a["text"], style, a["x"], a["y"], a["w"], a["h"]))

    if ir.get("legend"):
        lg = ir["legend"]
        cells.append(_vertex("legend_box", "", "rounded=0;html=1;fillColor=none;strokeColor=#D1D5DB;"
                             "strokeWidth=1;dashed=1;dashPattern=3 3;", lg["x"], lg["y"], lg["w"], lg["h"]))
        for i, e in enumerate(lg["entries"]):
            color = ir["style"]["semantics"].get(e["role"], "#374151")
            cells.append(_vertex(f"legend_swatch_{i}", "",
                                 f"rounded=0;html=1;fillColor={color};strokeColor=none;",
                                 lg["x"] + 8, lg["y"] + e["y"], 12, 12))
            style = (f"text;html=1;align=left;verticalAlign=middle;fontSize={lg['size']};"
                     f"fontColor={ir['style']['semantics'].get('neutral')};")
            cells.append(_text_cell(f"legend_label_{i}", e["label"], style,
                                    lg["x"] + 26, lg["y"] + e["y"] - 4, lg["w"] - 30, 20))

    for e in ir["edges"]:
        pts = e["points"][1:-1] if len(e["points"]) > 2 else []
        point_xml = ""
        if pts:
            arr = "".join(f'<mxPoint x="{x}" y="{y}"/>' for x, y in pts)
            point_xml = f'<Array as="points">{arr}</Array>'
        cells.append(
            f'<mxCell id={quoteattr("edge_" + e["id"])} value={quoteattr(e.get("label") or "")} '
            f'style={quoteattr(_edge_style(e, ir))} edge="1" parent="1" '
            f'source={quoteattr(e["from"])} target={quoteattr(e["to"])}>'
            f'<mxGeometry relative="1" as="geometry">{point_xml}</mxGeometry></mxCell>')

    body = "".join(cells)
    return (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        f'<mxfile host="weekly-research-slides" type="device">\n'
        f'  <diagram id={quoteattr(ir["figure"]["id"])} name={quoteattr(ir["figure"].get("title") or ir["figure"]["id"])}>\n'
        f'    <mxGraphModel dx="1200" dy="700" grid="1" gridSize="10" guides="1" tooltips="1" '
        f'connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="{int(W)}" '
        f'pageHeight="{int(H)}" math="0" shadow="0">\n'
        f'      <root>\n        <mxCell id="0"/>\n        <mxCell id="1" parent="0"/>\n        '
        f'{body}\n      </root>\n    </mxGraphModel>\n  </diagram>\n</mxfile>\n'
    )
