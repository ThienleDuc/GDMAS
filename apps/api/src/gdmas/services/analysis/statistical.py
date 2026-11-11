"""Pattern 1: temporal counts, event scatter and magnitude histogram."""

import pandas as pd

from gdmas.services.analysis.preprocessing import (
    FREQUENCIES,
    PreparedData,
    aggregate,
    finite,
)


def compute_statistics(data: PreparedData) -> dict:
    frame = data.frame
    by_interval = {}
    for interval in FREQUENCIES:
        line = [
            {
                "date": row.bucket_start.date().isoformat(),
                "event_count": int(row.event_count),
                "avg_magnitude": finite(row.avg_magnitude),
                "max_magnitude": finite(row.max_magnitude),
                "avg_depth": finite(row.avg_depth),
                "energy_joules": finite(row.energy_joules),
                "partial": bool(row.partial),
            }
            for row in aggregate(data, interval).itertuples()
        ]
        by_interval[interval] = {"line_chart": line}
    mags = frame["magnitude"].dropna()
    histogram = {
        "<2.0": int((mags < 2).sum()),
        "2.0-3.0": int(((mags >= 2) & (mags < 3)).sum()),
        "3.0-4.0": int(((mags >= 3) & (mags < 4)).sum()),
        "4.0-5.0": int(((mags >= 4) & (mags < 5)).sum()),
        ">=5.0": int((mags >= 5).sum()),
    }
    scatter = [
        {
            "id": int(row.id),
            "timestamp": row.Index.isoformat().replace("+00:00", "Z"),
            "magnitude": float(row.magnitude),
            "depth_km": finite(row.depth_km),
        }
        # iterrows coerces mixed numeric rows to float and loses BIGINT bits.
        for row in frame.itertuples()
        if pd.notna(row.magnitude)
    ]
    return {
        "metadata": data.metadata(),
        "interval": "day",
        "by_interval": by_interval,
        "line_chart": by_interval["day"]["line_chart"],
        "scatter_plot": scatter,
        "histogram": histogram,
        "total_events": len(frame),
        "data_points": len(scatter),
        "avg_magnitude": finite(mags.mean()),
        "max_magnitude": finite(mags.max()),
        "min_magnitude": finite(mags.min()),
        "avg_depth": finite(frame["depth_km"].mean()),
        "time_distribution": [
            {"hour": f"{hour:02d}:00", "count": int((frame.index.hour == hour).sum())}
            for hour in range(24)
        ],
    }
