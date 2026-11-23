/**
 * Test offline cho header toàn cục — .agents/notes/testcase/2026-11-21-header-country-clock-refresh-thien.md
 * TC-03..TC-09. Không gọi mạng/BE: mọi payload là fixture cục bộ (I7).
 */

import test from "node:test";
import assert from "node:assert/strict";
import type { ClustersResponse } from "../src/contracts/clusters.ts";
import { parseSelection, selectionToParams } from "../src/features/earthquakes/catalog-selection.ts";
import {
  REFRESH_CYCLE_SECONDS,
  TOAST_SECONDS,
  countdownLabel,
  countriesFromClusters,
  compactCountdownLabel,
  nextCountdownTick,
  nextToastTick,
} from "../src/layouts/header/header-data.ts";
import { formatClockTime } from "../src/utils/timezone.ts";

const FIXED_NOW = new Date("2026-11-21T12:00:00Z");

const CLUSTERS_PAYLOAD: ClustersResponse = {
  success: true,
  data: {
    clusters: [
      {
        cluster_id: 1,
        center_latitude: 38.29,
        center_longitude: 142.38,
        event_count: 5,
        avg_magnitude: 5.8,
        max_magnitude: 6.4,
        dominant_place: "Honshu, Japan",
      },
      {
        cluster_id: 2,
        center_latitude: -6.2,
        center_longitude: 106.8,
        event_count: 3,
        avg_magnitude: 4.9,
        max_magnitude: 5.1,
        dominant_place: "Java, Indonesia",
      },
      {
        cluster_id: 3,
        center_latitude: 35.7,
        center_longitude: -118.5,
        event_count: 3,
        avg_magnitude: 4.2,
        max_magnitude: 4.7,
        dominant_place: "California, USA",
      },
    ],
  },
};

test("TC-03: danh mục quốc gia suy từ cụm API theo eventCount giảm", () => {
  const options = countriesFromClusters(CLUSTERS_PAYLOAD);
  assert.deepEqual(
    options.map((item) => item.country),
    ["Japan", "Indonesia", "USA"],
  );
  assert.deepEqual(options[0].clusterIds, [1]);
  assert.equal(options[0].eventCount, 5);
});

test("TC-04: payload rỗng / DB rỗng → [] không bịa quốc gia", () => {
  assert.deepEqual(countriesFromClusters({ success: true, data: { clusters: [] } }), []);
});

test("TC-05: API 404 / payload sai hình → [] không fallback mock", () => {
  assert.deepEqual(countriesFromClusters(null), []);
  assert.deepEqual(countriesFromClusters(undefined), []);
  assert.deepEqual(countriesFromClusters({ success: false } as unknown as ClustersResponse), []);
});

test("TC-06: đồng hồ chế độ UTC", () => {
  const clock = formatClockTime(FIXED_NOW, "UTC");
  assert.match(clock, /12:00:00/u);
  assert.match(clock, /UTC/u);
});

test("TC-07: đồng hồ chế độ UTC+7 (Asia/Ho_Chi_Minh)", () => {
  const clock = formatClockTime(FIXED_NOW, "UTC+7");
  assert.match(clock, /19:00:00/u);
  assert.match(clock, /UTC\+7/u);
});

test("TC-08: đồng hồ đếm ngược 5 phút — giảm 1s, về 0 thì reset", () => {
  assert.equal(REFRESH_CYCLE_SECONDS, 300);
  assert.equal(countdownLabel(REFRESH_CYCLE_SECONDS), "05:00");
  assert.equal(countdownLabel(125), "02:05");
  assert.equal(nextCountdownTick(300), 299);
  assert.equal(nextCountdownTick(2), 1);
  assert.equal(nextCountdownTick(1), 300);
  assert.equal(nextCountdownTick(0), 300);
  assert.equal(nextCountdownTick(Number.NaN), 300);
  assert.equal(countdownLabel(nextCountdownTick(1)), "05:00");
});

test("TC-12: compactCountdownLabel rút gọn phút cho aside (giữ hàm cũ)", () => {
  assert.equal(compactCountdownLabel(300), "5:00");
  assert.equal(compactCountdownLabel(125), "2:05");
  assert.equal(compactCountdownLabel(0), "5:00");
  assert.equal(compactCountdownLabel(Number.NaN), "5:00");
  // I2 — caller/test cũ vẫn thấy "05:00".
  assert.equal(countdownLabel(300), "05:00");
});

test("TC-11: toast báo cập nhật tự đóng sau 5 giây", () => {
  assert.equal(TOAST_SECONDS, 5);
  assert.equal(nextToastTick(5), 4);
  assert.equal(nextToastTick(4), 3);
  assert.equal(nextToastTick(1), 0);
  assert.equal(nextToastTick(0), 0);
  assert.equal(nextToastTick(Number.NaN), 0);
});

test("TC-09: ?country= làm nguồn sự thật chung — round-trip", () => {
  const params = selectionToParams({ country: "Japan", region: "all" });
  assert.equal(params.get("country"), "Japan");
  assert.equal(params.has("region"), false);
  assert.deepEqual(parseSelection(params), { country: "Japan", region: "all" });

  const cleared = selectionToParams({ country: "all", region: "all" }, params);
  assert.equal(cleared.has("country"), false);
  assert.deepEqual(parseSelection(cleared), { country: "all", region: "all" });
});
