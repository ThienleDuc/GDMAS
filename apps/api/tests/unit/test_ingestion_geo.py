"""Unit test offline cho derive quốc gia/khu vực từ `place` (testcase 2026-11-22-be-country-region-derivation-thien)."""

import pytest

from gdmas.services.ingestion.geo import (
    ALL_COUNTRIES,
    UNKNOWN_LABEL,
    derive_country,
    derive_place_fields,
    derive_region,
)


# TC-01 → TC-05
@pytest.mark.parametrize(
    "place, country, region",
    [
        ("12 km NE of San Francisco, CA", "USA", "San Francisco"),
        ("17 km SE of Naalehu, Hawaii", "USA", "Naalehu"),
        ("10 km W of Nashville, Tennessee", "USA", "Nashville"),
        ("5 km NE of Austin, Texas", "USA", "Austin"),
        ("20 km SW of Ensenada, MX", "Mexico", "Ensenada"),
        ("Honshu, Japan", "Japan", "Honshu"),
        ("Java, Indonesia", "Indonesia", "Java"),
        ("Near East Coast of Honshu, Japan", "Japan", "Near East Coast of Honshu"),
        ("Off the east coast of Honshu, Japan", "Japan", "Honshu"),
        ("Tonga Region", "Tonga", "Tonga Region"),
        (
            "South Sandwich Islands region",
            "South Sandwich Islands region",
            "South Sandwich Islands region",
        ),
        (None, UNKNOWN_LABEL, UNKNOWN_LABEL),
        ("", UNKNOWN_LABEL, UNKNOWN_LABEL),
        ("   ", UNKNOWN_LABEL, UNKNOWN_LABEL),
    ],
)
def test_derive_place_fields_matches_fe_heuristic(place, country, region):
    assert derive_country(place) == country
    assert derive_region(place, country) == region
    assert derive_place_fields(place) == (country, region)


def test_derive_region_respects_all_countries_sentinel():
    assert derive_region("Honshu, Japan", ALL_COUNTRIES) == "Honshu, Japan"


def test_derive_does_not_use_id_prefix():
    # Prefix `us`/`ak` là network code của USGS, không phải nguồn quốc gia.
    assert derive_country("us7000m8v8") == "us7000m8v8"
    assert derive_country(None) == UNKNOWN_LABEL
