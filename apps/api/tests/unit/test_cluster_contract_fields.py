"""Test offline: `/api/v1/clusters` trả đủ field canonical theo contract (GAP-01).

Testcase: .agents/notes/testcase/2026-11-22-cluster-contract-fields-thien.md
FE `groupClustersByCountry()` đọc `dominant_place` — route phải trả field thật.
"""

from gdmas.models.clustering import ClusteringResult

API = "/api/v1/clusters"


def _seed(db, clusters):
    db.add(
        ClusteringResult(
            algorithm="DBSCAN",
            parameters={"eps_km": 150, "min_samples": 5},
            total_clusters=len(clusters),
            noise_count=2,
            summary_clusters={"clusters": clusters},
        )
    )
    db.commit()


def test_canonical_cluster_exposes_place_and_radius(client, db):
    _seed(
        db,
        [
            {
                "cluster_id": 1,
                "center_latitude": 38.2,
                "center_longitude": 142.4,
                "event_count": 48,
                "avg_magnitude": 4.6,
                "max_magnitude": 6.1,
                "radius_km": 152.4,
                "dominant_place": "Honshu, Japan",
                "name": "Honshu",
            }
        ],
    )

    cluster = client.get(API).json()["data"]["clusters"][0]

    assert cluster["cluster_id"] == 1
    assert cluster["dominant_place"] == "Honshu, Japan"
    assert cluster["radius_km"] == 152.4
    assert cluster["max_magnitude"] == 6.1
    assert cluster["name"] == "Honshu"


def test_legacy_alias_still_maps_and_missing_fields_are_none(client, db):
    _seed(
        db,
        [
            {
                "id": 2,
                "lat": -6.2,
                "lon": 106.8,
                "events_count": 7,
                "avg_mag": 4.9,
                "place": "Java, Indonesia",
            }
        ],
    )

    cluster = client.get(API).json()["data"]["clusters"][0]

    assert cluster["cluster_id"] == 2
    assert cluster["center_latitude"] == -6.2
    assert cluster["event_count"] == 7
    assert cluster["avg_magnitude"] == 4.9
    assert cluster["dominant_place"] == "Java, Indonesia"
    assert cluster["radius_km"] is None
    assert cluster["max_magnitude"] is None
    assert cluster["name"] is None


def test_empty_table_keeps_empty_envelope(client):
    body = client.get(API).json()
    assert body["success"] is False
    assert body["data"] is None
