"""Chu kỳ 4 worker phải khớp sơ đồ ASCII docs/yeucaubatbuoc.md §1.2 và đọc từ .env."""

from pathlib import Path

from gdmas.core.config import settings

API_DIR = Path(__file__).resolve().parents[2]


def test_intervals_match_ascii_diagram():
    assert settings.INGESTION_INTERVAL_SECONDS == 300  # Data Ingestion: 5 phút/lần
    assert settings.ANALYSIS_INTERVAL_SECONDS == 300  # Data Analysis: 5 phút/lần
    assert settings.PREDICTION_INTERVAL_SECONDS == 300  # Prediction: 5 phút/lần
    assert settings.CLUSTERING_INTERVAL_SECONDS == 86400  # Clustering: 1 ngày/lần


def test_all_runners_read_intervals_from_settings():
    for name in ("ingestion", "analysis", "prediction", "clustering"):
        source = (API_DIR / f"src/gdmas/services/{name}/runner.py").read_text(
            encoding="utf-8"
        )
        assert "settings" in source, f"{name}.runner không đọc cấu hình từ .env"
        assert "time.sleep" in source, f"{name}.runner thiếu vòng lặp chu kỳ"
