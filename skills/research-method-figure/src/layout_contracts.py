"""Shared layout contracts.

These are the same concepts used by the PowerPoint and video QA, expressed once
so figures, slides and video clips can converge on one layout vocabulary:

    SAFE_TEXT_BOX, LABEL_CLEARANCE, EDGE_CLEARANCE, CONTENT_SAFE_ZONE,
    MIN_FONT_SIZE, TITLE_ZONE, ANNOTATION_ZONE

They are intentionally conservative; QA warns rather than blocks when a value
is only a heuristic.
"""

from __future__ import annotations

SAFE_TEXT_BOX = {
    "min_padding": 6.0,      # px between text and container edge
    "line_height": 1.35,     # multiplier on font size
    "avg_char_width": 0.55,  # Latin average glyph width / font size
}

LABEL_CLEARANCE = 6.0        # px a label must stay away from other geometry
EDGE_CLEARANCE = 8.0         # px an edge should stay away from unrelated nodes

CONTENT_SAFE_ZONE = {
    "margin_ratio": 0.025,   # fraction of canvas kept clear
    "min_margin": 10.0,      # px floor
}

MIN_FONT_SIZE = 7.5          # pt; below this a paper figure is unreadable
TITLE_ZONE = {"height": 34.0, "max_font": 20.0}
ANNOTATION_ZONE = {"clearance": 10.0, "max_font": 12.0}

# Figure types that should not carry a large internal title.
NO_BIG_TITLE_TYPES = {"method-overview", "architecture", "mechanism-zoom",
                      "graphical-abstract", "multi-panel-overview"}


def estimate_text_width(text: str, font_size: float) -> float:
    return len(text) * font_size * SAFE_TEXT_BOX["avg_char_width"]


def estimate_lines(text: str, font_size: float, box_width: float) -> int:
    usable = max(1.0, box_width - 2 * SAFE_TEXT_BOX["min_padding"])
    per_line = max(1, int(usable / max(1e-6, font_size * SAFE_TEXT_BOX["avg_char_width"])))
    lines = 0
    for para in str(text).split("\n"):
        lines += max(1, -(-len(para) // per_line))
    return lines


def estimate_text_height(text: str, font_size: float, box_width: float) -> float:
    return estimate_lines(text, font_size, box_width) * font_size * SAFE_TEXT_BOX["line_height"]


def safe_margin(canvas_width: float, canvas_height: float) -> float:
    return max(CONTENT_SAFE_ZONE["min_margin"],
               CONTENT_SAFE_ZONE["margin_ratio"] * min(canvas_width, canvas_height))
