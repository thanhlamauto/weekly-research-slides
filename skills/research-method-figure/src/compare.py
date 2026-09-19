"""Normalized method comparison and method-delta figure builders.

Both take method semantic models and one shared style profile, so competitor
and our method are drawn in the same visual language and only the minimal
structural difference is emphasised.
"""

from __future__ import annotations

import spec as spec_mod


def _remap(fig: dict, prefix: str, panel: str, role_for) -> tuple[list, list, list]:
    idmap = {}
    nodes = []
    for n in fig["nodes"]:
        nid = prefix + n["id"]
        idmap[n["id"]] = nid
        nn = dict(n)
        nn["id"] = nid
        nn["panel"] = panel
        nn["role"] = role_for(n)
        nodes.append(nn)
    edges = []
    for e in fig["edges"]:
        ee = dict(e)
        ee["from"] = idmap[e["from"]]
        ee["to"] = idmap[e["to"]]
        ee["id"] = prefix + e.get("id", f"{e['from']}->{e['to']}")
        edges.append(ee)
    anns = []
    for a in fig.get("annotations", []):
        aa = dict(a)
        aa["target"] = idmap[a["target"]]
        aa["id"] = prefix + a.get("id", a["target"])
        anns.append(aa)
    return nodes, edges, anns


def _semantic_set(fig: dict) -> set[str]:
    return {n["semantic_id"] for n in fig["nodes"] if n.get("semantic_id")}


def build_comparison(left_model: dict, right_model: dict, *, style: str = "topconf-clean",
                     left_label: str = "Competitor", right_label: str = "Ours",
                     figure_id: str = "method_comparison") -> dict:
    lf = spec_mod.from_method_model(left_model, style=style)
    rf = spec_mod.from_method_model(right_model, style=style)
    shared = _semantic_set(lf) & _semantic_set(rf)

    lnodes, ledges, lanns = _remap(lf, "L_", "competitor",
                                   lambda n: "shared" if n.get("semantic_id") in shared else "competitor")
    rnodes, redges, ranns = _remap(rf, "R_", "ours",
                                   lambda n: "shared" if n.get("semantic_id") in shared else "ours")

    left_only = sorted(_semantic_set(lf) - _semantic_set(rf))
    right_only = sorted(_semantic_set(rf) - _semantic_set(lf))

    return {
        "figure": {
            "id": figure_id, "type": "method-comparison", "mode": "comparison",
            "title": f"{left_label} vs {right_label}",
            "purpose": "Normalize both methods into one visual language and show the minimal structural difference.",
            "style": style, "width": 1320, "height": 640,
        },
        "panels": [
            {"id": "competitor", "label": left_label, "role": "competitor", "row": 0},
            {"id": "ours", "label": right_label, "role": "ours", "row": 1},
        ],
        "nodes": lnodes + rnodes,
        "edges": ledges + redges,
        "annotations": lanns + ranns,
        "legend": [
            {"role": "shared", "label": "shared computation"},
            {"role": "competitor", "label": f"only in {left_label}"},
            {"role": "ours", "label": f"only in {right_label}"},
        ],
        "comparison": {
            "methods": [left_label, right_label],
            "alignment": {"inputs": "shared", "outputs": "shared"},
            "shared_components": sorted(shared),
            "differences": {"competitor_only": left_only, "ours_only": right_only},
        },
        "shared_concepts": sorted(shared),
        "provenance": {"generated_by": "compare.build_comparison"},
    }


def build_delta(prev_model: dict, curr_model: dict, *, style: str = "topconf-clean",
                figure_id: str = "method_delta") -> dict:
    pf = spec_mod.from_method_model(prev_model, style=style)
    cf = spec_mod.from_method_model(curr_model, style=style)
    prev_sem = _semantic_set(pf)
    curr_sem = _semantic_set(cf)

    cnodes, cedges, cann = _remap(cf, "C_", "mechanism",
                                  lambda n: "shared" if n.get("semantic_id") in prev_sem else "added")
    removed = [n for n in pf["nodes"] if n.get("semantic_id") and n["semantic_id"] not in curr_sem]
    rnodes, redges, _ = _remap({**pf, "nodes": removed, "edges": [], "annotations": []},
                               "P_", "mechanism", lambda n: "removed")

    name = curr_model.get("method", {}).get("name", "method")
    return {
        "figure": {
            "id": figure_id, "type": "method-delta", "mode": "delta",
            "title": f"{name}: change this week",
            "purpose": "Keep unchanged components in place, mute them, and highlight only what changed.",
            "style": style,
        },
        "panels": [{"id": "mechanism", "label": "Current method", "role": "ours"}],
        "nodes": cnodes + rnodes,
        "edges": cedges,
        "annotations": cann,
        "legend": [
            {"role": "shared", "label": "unchanged"},
            {"role": "added", "label": "added / changed"},
            {"role": "removed", "label": "removed"},
        ],
        "comparison": {
            "methods": ["previous", "current"],
            "alignment": {"inputs": "shared", "outputs": "shared"},
            "shared_components": sorted(prev_sem & curr_sem),
            "differences": {"competitor_only": [], "ours_only": sorted(curr_sem - prev_sem)},
        },
        "shared_concepts": sorted(prev_sem & curr_sem),
        "provenance": {"generated_by": "compare.build_delta"},
    }
