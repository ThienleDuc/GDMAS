# BUG-thien-001: Dải tin cậy dự báo Pattern 5 tính sai khi `lower_bound` vượt `predicted_value`

- **Status:** fixed
- **Severity:** medium
- **Area:** `apps/web/src/components/charts/chart-data.ts` — hàm `buildForecastBand` (Terminal 7 / T7 Frontend, Pattern 5)
- **Reported:** 2026-11-16 — test offline `apps/web/tests/chart-data.test.ts` (TC-07) phát hiện khi chạy `pnpm test`
- **Fixed:** 2026-11-16 — nhánh `feat/2026-11-16-six-patterns-chart-components-thien`; `cd apps/web && pnpm test` → 12/12 pass
- **Related:** .agents/notes/proposed/2026-11-16-six-patterns-chart-components-thien.md; .agents/notes/implemented/2026-11-16-six-patterns-chart-components-thien/plan.md; .agents/notes/testcase/2026-11-16-six-patterns-chart-components-thien.md (TC-07)
- **Duplicate of:** -

## Triệu chứng
Với payload dự báo có khoảng tin cậy không bao trùm điểm dự báo (dữ liệu BE lệch: `lower_bound > predicted_value` hoặc `upper_bound < predicted_value`), dải CI vẽ trên biểu đồ bị cắt cụt và điểm dự báo nằm ngoài band.

Log test thật (`node --test tests/*.test.ts`):

```text
not ok 7 - TC-07 dải tin cậy dự báo: history + forecast + bridge
  error: |-
    Expected values to be strictly equal:

    10 !== 8

  code: 'ERR_ASSERTION'
  expected: 8
  actual: 10
  operator: 'strictEqual'
  stack: TestContext.<anonymous> (file:///.../apps/web/tests/chart-data.test.ts:185:10)
```

## Tái hiện
1. `cd apps/web`
2. `pnpm test` (hoặc `node --test tests/*.test.ts`) với test TC-07 dùng:

```js
buildForecastBand([], { predicted_value: 10, lower_bound: 12, upper_bound: 8 });
```

Mong đợi: `ciBase = 8`, `ciSpan = 4` (band phủ 8..12 và chứa cả điểm dự báo 10).
Thực tế: `ciBase = 10`, `ciSpan = 2` — band chỉ 10..12, mất nửa dưới của khoảng tin cậy.

## Nguyên nhân gốc
`chart-data.ts` — `buildForecastBand` chỉ so `lower_bound`/`upper_bound` với `predicted_value` mà không so hai biên với nhau:

```ts
const lower = Math.min(rawLower, predicted);   // = min(12, 10) = 10  ✗
const upper = Math.max(rawUpper, predicted);   // = max(8, 10) = 10   (nhánh này còn tệ hơn)
```

Khi BE trả biên bị hoán vị hoặc biên dưới lớn hơn giá trị dự báo, `lower` bị kéo lên bằng `predicted` → `ciBase` mất phần dưới thật, `ciSpan = upper - lower` bị âm/rút gọn. Cơ chế này cũng che mất lỗi dữ liệu thay vì hiển thị đúng khoảng rộng nhất mà payload khai báo.

## Cách sửa
Lấy bao đóng của cả 3 giá trị để khoảng tin cậy luôn chứa điểm dự báo và không bao giờ âm/rỗng sai hướng:

```ts
const lower = Math.min(rawLower, rawUpper, predicted);
const upper = Math.max(rawLower, rawUpper, predicted);
```

`ciBase = lower`, `ciSpan = upper - lower` nhờ đó luôn `>= 0` và `lower <= predicted <= upper`, kể cả khi BE trả biên hoán vị hoặc thiếu một biên (khi đó biên thiếu lấy chính `predicted`, band suy biến đúng nghĩa thay vì bịa khoảng).

File đã đụng: `apps/web/src/components/charts/chart-data.ts` (chỉ 2 dòng trong `buildForecastBand`; không đổi chữ ký hàm, không đổi component).

## Kiểm chứng
- `cd apps/web && pnpm test` → `# tests 12 · # pass 12 · # fail 0`.
- `cd apps/web && pnpm build` → PASS (2459 modules).
- Test hồi quy: `apps/web/tests/chart-data.test.ts` — test `TC-07 dải tin cậy dự báo: history + forecast + bridge`, phủ 3 biến thể:

```js
// (1) Biên hoán vị hoàn toàn: lower 12 > predicted 10 > upper 8
buildForecastBand([], { predicted_value: 10, lower_bound: 12, upper_bound: 8 });
// → lower 8, upper 12, ciBase 8 (trước khi sửa: ciBase = 10, ciSpan = 2)

// (2) Chỉ biên trên nằm dưới predicted: predicted 20 > upper 15 > lower 10
buildForecastBand([], { predicted_value: 20, lower_bound: 10, upper_bound: 15 });
// → lower 10, upper 20, ciBase 10, ciSpan 10 (trước khi sửa: upper = 20 nhưng band lệch)

// (3) Thiếu biên: chỉ có predicted 7
buildForecastBand([], { predicted_value: 7 });
// → lower = upper = 7, ciSpan 0 (band suy biến, không thay bằng số khác)
```

## Lịch sử
- 2026-11-16 — ghi nhận từ lần chạy test đầu tiên (status: open).
- 2026-11-16 — xác định nguyên nhân tại `buildForecastBand`, sửa 2 dòng và chạy lại test (status: fixed).
- 2026-11-16 — bổ sung 2 nhánh hồi quy (biên trên dưới `predicted`, thiếu biên) vào TC-07; `pnpm test` 12/12 pass, `pnpm build` PASS.
