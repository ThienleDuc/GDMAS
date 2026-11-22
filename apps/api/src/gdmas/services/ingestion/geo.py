"""Tách chuỗi `place` của USGS thành quốc gia và khu vực.

USGS chỉ cung cấp `place` (chuỗi địa danh tự do) — không có field country/region.
Module này port bảng heuristic đã được FE dùng (country-clusters.ts / region-filter.ts)
sang BE để có một nguồn phân loại tập trung. Không gọi mạng, không reverse-geocode,
không dùng prefix `id` (đó là network code, không phải quốc gia).

Khi không trích được → "Khác" (không bịa dữ liệu).
"""

import re

UNKNOWN_LABEL = "Khác"
ALL_COUNTRIES = "all"

# Mã quốc gia ngắn hay gặp ở cuối địa danh USGS ("..., MX" → Mexico).
COUNTRY_CODES: dict[str, str] = {"MX": "Mexico"}

# Pattern theo thứ tự ưu tiên — giữ nguyên với FE để FE/BE cùng trả một nhãn.
COUNTRY_PATTERNS: tuple[tuple[re.Pattern[str], str], ...] = (
    (
        re.compile(r"california|alaska|hawaii|united states|\busa\b", re.IGNORECASE),
        "USA",
    ),
    (re.compile(r"japan|honshu|hokkaido", re.IGNORECASE), "Japan"),
    (re.compile(r"indonesia|sumatra|java|sunda", re.IGNORECASE), "Indonesia"),
    (re.compile(r"tonga", re.IGNORECASE), "Tonga"),
    (re.compile(r"chile", re.IGNORECASE), "Chile"),
    (re.compile(r"philippines", re.IGNORECASE), "Philippines"),
    (re.compile(r"new zealand", re.IGNORECASE), "New Zealand"),
    (re.compile(r"papua", re.IGNORECASE), "Papua New Guinea"),
    (re.compile(r"vanuatu", re.IGNORECASE), "Vanuatu"),
    (re.compile(r"fiji", re.IGNORECASE), "Fiji"),
    (re.compile(r"mexico", re.IGNORECASE), "Mexico"),
    (re.compile(r"turkey|türkiye", re.IGNORECASE), "Turkey"),
    (re.compile(r"iceland", re.IGNORECASE), "Iceland"),
    (re.compile(r"greece", re.IGNORECASE), "Greece"),
    (re.compile(r"china|taiwan", re.IGNORECASE), "China"),
)

# Tên bang Mỹ đầy đủ ("..., Tennessee" → USA) — bổ sung thêm ngoài mã 2 chữ.
US_STATE_NAMES: frozenset[str] = frozenset(
    {
        "alabama",
        "alaska",
        "arizona",
        "arkansas",
        "california",
        "colorado",
        "connecticut",
        "delaware",
        "florida",
        "georgia",
        "hawaii",
        "idaho",
        "illinois",
        "indiana",
        "iowa",
        "kansas",
        "kentucky",
        "louisiana",
        "maine",
        "maryland",
        "massachusetts",
        "michigan",
        "minnesota",
        "mississippi",
        "missouri",
        "montana",
        "nebraska",
        "nevada",
        "new hampshire",
        "new jersey",
        "new mexico",
        "new york",
        "north carolina",
        "north dakota",
        "ohio",
        "oklahoma",
        "oregon",
        "pennsylvania",
        "rhode island",
        "south carolina",
        "south dakota",
        "tennessee",
        "texas",
        "utah",
        "vermont",
        "virginia",
        "washington",
        "west virginia",
        "wisconsin",
        "wyoming",
        "district of columbia",
    }
)

# Mã bang Mỹ thường xuất hiện ở cuối địa danh USGS ("..., CA" → USA).
US_STATE_CODES: frozenset[str] = frozenset(
    {
        "AL",
        "AK",
        "AZ",
        "AR",
        "CA",
        "CO",
        "CT",
        "DE",
        "FL",
        "GA",
        "HI",
        "ID",
        "IL",
        "IN",
        "IA",
        "KS",
        "KY",
        "LA",
        "ME",
        "MD",
        "MA",
        "MI",
        "MN",
        "MS",
        "MO",
        "MT",
        "NE",
        "NV",
        "NH",
        "NJ",
        "NM",
        "NY",
        "NC",
        "ND",
        "OH",
        "OK",
        "OR",
        "PA",
        "RI",
        "SC",
        "SD",
        "TN",
        "TX",
        "UT",
        "VT",
        "VA",
        "WA",
        "WV",
        "WI",
        "WY",
        "DC",
    }
)

# "12 km NE of San Francisco" → "San Francisco"; "off the coast of Honshu" → "Honshu".
_DISTANCE_PREFIX = re.compile(
    r"^\d+(?:\.\d+)?\s*(?:km|mi|miles?)?\s*[NSEW]{1,3}\s+of\s+", re.IGNORECASE
)
_OFF_COAST_PREFIX = re.compile(r"^off (?:the )?.+?\bof\s+", re.IGNORECASE)


def derive_country(place: str | None) -> str:
    """Suy quốc gia từ `place`. Fallback "Khác" — không bịa dữ liệu."""
    if not place or not place.strip():
        return UNKNOWN_LABEL

    segments = [part.strip() for part in place.split(",") if part.strip()]
    last = segments[-1] if segments else None
    if last:
        upper_last = last.upper()
        if upper_last in COUNTRY_CODES:
            return COUNTRY_CODES[upper_last]
        if upper_last in US_STATE_CODES or last.lower() in US_STATE_NAMES:
            return "USA"

    for pattern, country in COUNTRY_PATTERNS:
        if pattern.search(place):
            return country

    parts = place.split(",")
    last_segment = parts[-1].strip() if parts else ""
    return last_segment or UNKNOWN_LABEL


def derive_region(place: str | None, country: str) -> str:
    """Suy khu vực trong `country` từ `place` sau khi biết quốc gia."""
    if not place or not place.strip():
        return UNKNOWN_LABEL

    segments = [part.strip() for part in place.strip().split(",") if part.strip()]
    if len(segments) > 1:
        last = segments[-1]
        if country != ALL_COUNTRIES and (
            derive_country(last) == country or last.upper() == country.upper()
        ):
            segments.pop()

    text = ", ".join(segments).strip()
    text = _DISTANCE_PREFIX.sub("", text).strip()
    text = _OFF_COAST_PREFIX.sub("", text).strip()
    return text or UNKNOWN_LABEL


def derive_place_fields(place: str | None) -> tuple[str, str]:
    """Trả (country, region) nhất quán — dùng chung cho ingestion và sync route."""
    country = derive_country(place)
    return country, derive_region(place, country)
