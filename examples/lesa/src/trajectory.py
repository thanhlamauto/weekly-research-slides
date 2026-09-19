"""The single LESA feature trajectory used by scenes 02, 03 and 07.

One source of points means the same object persists across scenes. The vertical
coordinate is a 1-D projection of the feature (the paper uses PCA); the step
sizes encode how much the feature changes between timesteps:

    early  -> large, irregular changes   (high noise)
    middle -> small, smooth changes      (stable)
    late   -> tiny refinement            (low noise)
"""

from __future__ import annotations

import numpy as np

X0 = -5.4
DX = 0.9
Y = [0.30, 0.58, 0.26, 0.74, 1.00, 1.22, 1.40, 1.55, 1.67, 1.72, 1.75, 1.77, 1.78]

# stage boundaries in x (between sampled timesteps)
STAGE_BOUNDS = {"high": (X0, -1.8), "mid": (-1.8, 2.7), "low": (2.7, X0 + DX * (len(Y) - 1))}


def xs() -> list[float]:
    return [X0 + DX * i for i in range(len(Y))]


def points(y_offset: float = 0.0) -> list[np.ndarray]:
    return [np.array([X0 + DX * i, Y[i] + y_offset, 0.0]) for i in range(len(Y))]


def steps() -> list[float]:
    return [Y[i + 1] - Y[i] for i in range(len(Y) - 1)]


def stage_of_index(i: int) -> str:
    x = X0 + DX * i
    if x < STAGE_BOUNDS["high"][1]:
        return "high"
    if x < STAGE_BOUNDS["mid"][1]:
        return "mid"
    return "low"
