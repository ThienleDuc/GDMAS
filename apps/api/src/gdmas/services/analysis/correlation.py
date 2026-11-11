"""Pattern 4: pairwise Pearson coefficients without fabricated diagonals."""

import numpy as np

from gdmas.services.analysis.preprocessing import PreparedData, finite

VARIABLES = [
    "magnitude",
    "depth_km",
    "latitude",
    "longitude",
    "daily_event_count",
    "energy_joules",
]


def compute_correlation(data: PreparedData) -> dict:
    frame = data.frame.copy()
    daily = frame.index.floor("D")
    frame["daily_event_count"] = frame.groupby(daily)["id"].transform("size")
    values = frame[VARIABLES]
    matrix = values.corr(method="pearson", min_periods=2)
    available = values.notna().astype(np.int64)
    counts = available.T.dot(available)
    coefficients = [
        [finite(np.clip(value, -1, 1)) for value in row] for row in matrix.to_numpy()
    ]
    coefficient = coefficients[0][1]
    strength = "undefined"
    if coefficient is not None:
        strength = (
            "weak"
            if abs(coefficient) < 0.3
            else ("moderate" if abs(coefficient) < 0.7 else "strong")
        )
    return {
        "metadata": data.metadata(
            "OK" if coefficient is not None else "INSUFFICIENT_DATA",
            None if coefficient is not None else "Magnitude/depth Pearson is undefined",
        ),
        "variables": VARIABLES,
        "units": {
            "magnitude": "magnitude",
            "depth_km": "km",
            "latitude": "degrees WGS84",
            "longitude": "degrees WGS84",
            "daily_event_count": "events/day",
            "energy_joules": "estimated joules",
        },
        "matrix": coefficients,
        "sample_counts": counts.to_numpy().tolist(),
        "method": "pearson",
        "observation_unit": "event",
        "weighting_note": "Daily counts repeat per event; busy days have more observations",
        "corr_mag_depth": coefficient,
        "correlation_strength": strength,
    }
