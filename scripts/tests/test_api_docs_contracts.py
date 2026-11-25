#!/usr/bin/env python3
"""Offline tests: docs/api/API.md mô tả đúng payload BE/FE đang dùng."""

from __future__ import annotations

import unittest
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
API_DOC = (REPO_ROOT / "docs/api/API.md").read_text(encoding="utf-8")


class ApiDocsContractTests(unittest.TestCase):
    def test_01_empty_envelope_documented(self) -> None:
        self.assertIn('"success": false', API_DOC)
        self.assertIn('"data": null', API_DOC)
        self.assertIn("Phản hồi rỗng hợp lệ", API_DOC)
        self.assertIn("HTTP 200", API_DOC)

    def test_02_system_status_keys(self) -> None:
        self.assertIn('"ingestion"', API_DOC)
        self.assertIn('"analysis"', API_DOC)
        self.assertNotIn('"data_ingestion"', API_DOC)
        self.assertNotIn('"data_analysis"', API_DOC)
        self.assertIn("active`, `idle`, `error`, `unknown", API_DOC)

    def test_03_statistics_payload(self) -> None:
        self.assertIn('"total_events"', API_DOC)
        self.assertIn('"strong_events_count"', API_DOC)
        self.assertIn('"recent_24h_count"', API_DOC)
        self.assertNotIn('"summary_24h"', API_DOC)
        self.assertNotIn('"magnitude_distribution"', API_DOC)

    def test_04_histogram_bins(self) -> None:
        self.assertIn('"bin": "< 2.0"', API_DOC)
        self.assertNotIn('"bin": "1.0 - 2.0"', API_DOC)

    def test_05_trend_fields(self) -> None:
        for field in ('"r_squared"', '"intercept"', '"p_value"', '"sample_size"'):
            with self.subTest(field=field):
                self.assertIn(field, API_DOC)

    def test_06_correlation_fields(self) -> None:
        self.assertIn('"status": "computed"', API_DOC)
        self.assertIn('"sample_size": 24', API_DOC)
        self.assertIn('"note":', API_DOC)

    def test_07_classification_four_levels(self) -> None:
        self.assertIn('"predicted_label": "Moderate"', API_DOC)
        for label in ('"Low"', '"Moderate"', '"High"', '"Critical"'):
            with self.subTest(label=label):
                self.assertIn(label, API_DOC)
        self.assertNotIn('"Normal Activity"', API_DOC)

    def test_08_prediction_two_shapes(self) -> None:
        self.assertIn('"confidence_interval"', API_DOC)
        self.assertIn('"lower": 38.0', API_DOC)
        self.assertIn("lower_bound", API_DOC)
        self.assertIn("upper_bound", API_DOC)
        self.assertIn('"probabilities"', API_DOC)
        self.assertIn("probability_scores", API_DOC)

    def test_09_sse_routes_events_packet(self) -> None:
        self.assertIn("/api/v1/stream/earthquakes", API_DOC)
        self.assertIn("/api/v1/events/stream", API_DOC)
        for event in (
            "earthquake_detected",
            "earthquake_alert",
            "heartbeat",
            "ingestion_cycle_completed",
            "database_cleared",
            "alert",
        ):
            with self.subTest(event=event):
                self.assertIn(event, API_DOC)
        self.assertIn('"event":"earthquake_detected"', API_DOC)
        self.assertIn('"data":{', API_DOC)
        self.assertIn('"timestamp":"2026-11-06T11:08:01Z"', API_DOC)

    def test_10_patterns_endpoint_listed(self) -> None:
        self.assertIn("Tổng hợp: `GET /api/v1/patterns`", API_DOC)
        self.assertIn("pattern_1", API_DOC)
        self.assertIn("clustering_summary", API_DOC)

    def test_11_service_status_running_documented(self) -> None:
        # BE system.py trả postgres.status = "running"; FE ServiceHealth chấp nhận.
        self.assertIn("`unknown`, `running`", API_DOC)
        self.assertIn("`postgres`", API_DOC)

    def test_12_earthquakes_search_param_documented(self) -> None:
        # BE earthquakes.py:63 có Query(search); FE QueryEarthquakeParams.search gửi param này.
        self.assertIn("| `search` | string | Không |", API_DOC)
        self.assertIn("source_event_id", API_DOC)


if __name__ == "__main__":
    unittest.main()
