"""Test offline cho độ chính xác dự báo BE — KHÔNG DB, KHÔNG artifact, KHÔNG mạng (I7)."""

from pathlib import Path

from gdmas.services.analysis.filtered import rounded_forecast

SERVICE_SOURCE = (
    Path(__file__).resolve().parents[2]
    / "src"
    / "gdmas"
    / "services"
    / "prediction"
    / "service.py"
).read_text(encoding="utf-8")


def test_tc01_rounds_three_prediction_fields_to_three_decimals():
    raw = {"predicted": 299.5424, "lower": 179.7053, "upper": 316.7531}
    result = rounded_forecast(raw)
    assert result == {"predicted": 299.542, "lower": 179.705, "upper": 316.753}


def test_tc02_preserves_other_fields_and_original_dict():
    raw = {"predicted": 6.086, "lower": 4.554, "upper": 8.766, "other": "keep", "n": 3}
    result = rounded_forecast(raw)
    assert result["other"] == "keep"
    assert result["n"] == 3
    assert raw["predicted"] == 6.086, "hàm thuần không được sửa input"


def test_tc03_already_three_decimals_stays_stable():
    raw = {"predicted": 6.086, "lower": 4.554, "upper": 8.766}
    assert rounded_forecast(raw) == raw


def test_tc04_handles_missing_and_non_numeric_fields():
    result = rounded_forecast({"predicted": None, "lower": "n/a"})
    assert result == {"predicted": None, "lower": "n/a"}


def test_tc05_snapshot_path_uses_the_same_three_decimal_precision():
    for field in ("predicted", "lower", "upper"):
        assert f'round(fc["{field}"], 3)' in SERVICE_SOURCE
    assert 'round(fc["predicted"], 1)' not in SERVICE_SOURCE
