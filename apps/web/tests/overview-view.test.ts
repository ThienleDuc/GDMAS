/**
 * Test offline cho view model trang Tổng quan — testcase 2026-11-21-overview-dashboard-thien.
 * Không React/DOM/mạng; fixtures cục bộ, mọi timestamp UTC (I7/I3).
 */

import test from "node:test";
import assert from "node:assert/strict";
import type { SeasonalityResponse, TrendResponse } from "../src/contracts/analysis.ts";
import type { ClustersResponse } from "../src/contracts/clusters.ts";
import type { EarthquakeItem, StatisticsResponse } from "../src/contracts/earthquake.ts";
import {
  buildKpis,
  buildLatestEvents,
  buildSeasonalityBars,
  buildSeverityMix,
  buildTrendComparison,
  depthLabel,
  rankCountries,
  rankRegionsForCountry,
  riskLabelVietnamese,
  riskBadgeClass,
  formatDecimal3,
  formatPrediction,
  severityLabel,
} from "../src/features/overview/overview-view.ts";

const statistics: StatisticsResponse = {
  success: true,
  data: {
    total_events: 120,
    recent_24h_count: 7,
    avg_magnitude: 4.2,
    max_magnitude: 6.4,
    strong_events_count: 5,
    moderate_events_count: 25,
    minor_events_count: 90,
  },
};

const clusters: ClustersResponse = {
  success: true,
  data: {
    clusters_count: 2,
    clusters: [
      {
        cluster_id: 1,
        center_latitude: 38.2,
        center_longitude: 142.4,
        event_count: 12,
        avg_magnitude: 5.1,
        max_magnitude: 6.4,
        dominant_place: "Honshu, Japan",
      },
      {
        cluster_id: 2,
        center_latitude: -6.2,
        center_longitude: 106.8,
        event_count: 7,
        avg_magnitude: 4.8,
        max_magnitude: 5.2,
        dominant_place: "Java, Indonesia",
      },
    ],
  },
};

const trend: TrendResponse = {
  success: true,
  data: {
    resample_freq: "D",
    metric: "count",
    trend_direction: "increasing",
    r_squared: 0.72,
    series: [
      { period: "2026-11-20", actual_value: 8, trend_value: 6.1, is_complete: true },
      { period: "2026-11-21", actual_value: 3, trend_value: 6.4, is_complete: false },
      { period: "2026-11-22", actual_value: 2, trend_value: null, is_complete: false },
    ],
  },
};

const seasonality: SeasonalityResponse = {
  success: true,
  data: {
    components: {
      seasonal_line: [
        { cycle_index: 2, period_label: "02:00", seasonal_factor: 1.4 },
        { cycle_index: 9, period_label: "09:00", seasonal_factor: 0.8 },
        { cycle_index: 12, period_label: "12:00", seasonal_factor: 1.0 },
      ],
    },
  },
};

function event(id: number, event_time: string, magnitude = 5.1): EarthquakeItem {
  return {
    id,
    source: "usgs",
    source_event_id: `us_${id}`,
    event_time,
    latitude: 38.29,
    longitude: 142.38,
    depth_km: 24.5,
    magnitude,
    place: "Honshu, Japan",
  };
}

test("TC-01: KPI lấy đúng giá trị từ statistics/clusters", () => {
  const kpis = buildKpis(statistics, clusters);
  assert.deepEqual(
    kpis.map((card) => card.value),
    [120, 7, 6.4, 2],
  );
  assert.equal(kpis[0].hint, "Độ lớn TB M4.200");

  const empty = buildKpis(null, null);
  assert.ok(empty.every((card) => card.value === null));
});

test("TC-02: cơ cấu độ lớn — tổng đúng, thiếu nhóm thì partial", () => {
  const mix = buildSeverityMix(statistics);
  assert.deepEqual(mix.slices.map((slice) => slice.value), [90, 25, 5]);
  assert.deepEqual(mix.slices.map((slice) => slice.badgeClass), [
    "ds-badge-success",
    "ds-badge-warning",
    "ds-badge-error",
  ]);
  assert.equal(mix.partial, false);

  const partial = buildSeverityMix({ success: true, data: { ...statistics.data, minor_events_count: undefined } });
  assert.equal(partial.slices.length, 2);
  assert.equal(partial.partial, true);
  assert.deepEqual(buildSeverityMix(null).slices, []);
});

test("TC-03: xếp hạng quốc gia sort giảm theo eventCount", () => {
  const rows = rankCountries(clusters);
  assert.deepEqual(
    rows.map((row) => row.label),
    ["Japan", "Indonesia"],
  );
  assert.equal(rows[0].eventCount, 12);
  assert.equal(rows[0].avgMagnitude, 5.1);
  assert.equal(rows[0].maxMagnitude, 6.4);
});

test("TC-04: đã chọn quốc gia → xếp hạng theo khu vực của quốc gia đó", () => {
  const withRegions: ClustersResponse = {
    success: true,
    data: {
      clusters: [
        { ...clusters.data.clusters[0], cluster_id: 10, dominant_place: "Honshu, Japan", event_count: 9 },
        { ...clusters.data.clusters[0], cluster_id: 11, dominant_place: "Kyushu, Japan", event_count: 4 },
        { ...clusters.data.clusters[1], cluster_id: 12, dominant_place: "Java, Indonesia", event_count: 20 },
      ],
    },
  };
  const rows = rankRegionsForCountry(withRegions, "Japan");
  assert.deepEqual(rows.map((row) => row.key), ["Honshu", "Kyushu"]);
  assert.deepEqual(rankRegionsForCountry(withRegions, "all").map((row) => row.key), ["Indonesia", "Japan"]);
});

test("TC-05: thiếu dominant_place → gộp 'Khác', không đoán từ name", () => {
  const nameless: ClustersResponse = {
    success: true,
    data: {
      clusters: [
        {
          cluster_id: 3,
          center_latitude: 21,
          center_longitude: 105,
          event_count: 4,
          avg_magnitude: 4.4,
          max_magnitude: 5.0,
          name: "Vành đai Thái Bình Dương - Nhật Bản",
        },
      ],
    },
  };
  assert.deepEqual(rankCountries(nameless).map((row) => row.key), ["Khác"]);
  assert.deepEqual(rankRegionsForCountry(nameless, "Japan"), []);
});

test("TC-06: so sánh trend giữ trend_value=null và cờ projected", () => {
  const view = buildTrendComparison(trend);
  assert.equal(view.direction, "Tăng");
  assert.equal(view.rSquared, 0.72);
  assert.equal(view.rows.length, 3);
  assert.deepEqual(
    view.rows.map((row) => row.projected),
    [false, true, true],
  );
  assert.equal(view.rows[2].trend, null);
  assert.equal(view.rows[0].actual, 8);
  assert.deepEqual(buildTrendComparison(null).rows, []);
});

test("TC-07: seasonality baseline 1.0 — above/below/average", () => {
  const rows = buildSeasonalityBars(seasonality);
  assert.deepEqual(
    rows.map((row) => row.position),
    ["above", "below", "average"],
  );
  assert.equal(rows[0].factor, 1.4);
});

test("TC-08: dữ liệu không đủ → [] không bịa số", () => {
  const empty: SeasonalityResponse = { success: true, data: { components: { seasonal_line: [] } } };
  assert.deepEqual(buildSeasonalityBars(empty), []);
  assert.deepEqual(buildSeasonalityBars(null), []);
});

test("TC-13: nhãn rủi ro Pattern 6 bằng tiếng Việt", () => {
  assert.equal(riskLabelVietnamese("LOW"), "Thấp");
  assert.equal(riskLabelVietnamese("MEDIUM"), "Trung bình");
  assert.equal(riskLabelVietnamese("HIGH"), "Cao");
  assert.equal(riskLabelVietnamese("CRITICAL"), "Rất cao");
  assert.equal(riskLabelVietnamese(null), null);
  const view = formatPrediction(null, {
    success: true,
    data: { target_date: "2026-11-22", predicted_label: "High Activity" },
  });
  assert.equal(view.riskLabel, "Cao");
});

test("TC-15: formatDecimal3 — đúng 3 chữ số sau dấu chấm", () => {
  assert.equal(formatDecimal3(5.2), "5.200");
  assert.equal(formatDecimal3(6), "6");
  assert.equal(formatDecimal3(4.25), "4.250");
  assert.equal(formatDecimal3(null), "—");
  assert.equal(formatDecimal3(Number.NaN), "—");
});

test("TC-14: riskBadgeClass dùng chung palette earthquakes", () => {
  assert.equal(riskBadgeClass("Thấp"), "ds-badge-success");
  assert.equal(riskBadgeClass("Trung bình"), "ds-badge-warning");
  assert.equal(riskBadgeClass("Cao"), "ds-badge-error");
  assert.equal(riskBadgeClass("Rất cao"), "ds-badge-error");
  assert.equal(riskBadgeClass(null), "ds-badge-neutral");
  assert.equal(riskBadgeClass("lạ"), "ds-badge-neutral");
});

test("TC-12: nhãn 5 mức độ lớn theo quy ước earthquakes", () => {
  assert.deepEqual(severityLabel(2.9), { label: "Rất nhẹ", tone: "very_low", badgeClass: "ds-badge-success" });
  assert.deepEqual(severityLabel(3.2), { label: "Nhẹ", tone: "low", badgeClass: "ds-badge-info" });
  assert.deepEqual(severityLabel(5.2), { label: "Trung bình", tone: "medium", badgeClass: "ds-badge-warning" });
  assert.deepEqual(severityLabel(6.4), { label: "Mạnh", tone: "high", badgeClass: "ds-badge-error" });
  assert.deepEqual(severityLabel(7.1), { label: "Rất mạnh", tone: "very_high", badgeClass: "ds-badge-error" });
  assert.deepEqual(severityLabel(null), { label: "—", tone: "low", badgeClass: "ds-badge-neutral" });
});

test("TC-13: nhãn 3 mức độ sâu theo quy ước earthquakes", () => {
  assert.deepEqual(depthLabel(0), { label: "Nông", tone: "shallow", badgeClass: "ds-badge-warning" });
  assert.deepEqual(depthLabel(69.9), { label: "Nông", tone: "shallow", badgeClass: "ds-badge-warning" });
  assert.deepEqual(depthLabel(70), { label: "Trung bình", tone: "mid", badgeClass: "ds-badge-info" });
  assert.deepEqual(depthLabel(300), { label: "Trung bình", tone: "mid", badgeClass: "ds-badge-info" });
  assert.deepEqual(depthLabel(300.1), { label: "Sâu", tone: "deep", badgeClass: "ds-badge-success" });
  assert.deepEqual(depthLabel(Number.NaN), { label: "—", tone: "mid", badgeClass: "ds-badge-neutral" });
});

test("TC-09: sự kiện mới nhất sort theo UTC, giữ WGS84", () => {
  const rows = buildLatestEvents([
    event(1, "2026-11-19T01:00:00Z"),
    event(2, "2026-11-21T09:30:00Z"),
    event(3, "2026-11-20T12:00:00Z"),
  ]);
  assert.deepEqual(rows.map((row) => row.id), [2, 3, 1]);
  assert.equal(rows[0].time, "2026-11-21T09:30:00Z");
  assert.equal(rows[0].latitude, 38.29);
  assert.equal(rows[0].longitude, 142.38);
  assert.deepEqual(buildLatestEvents([]), []);
});
