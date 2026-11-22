# Implementation Status: Tách `place` từ USGS thành quốc gia & khu vực tại Backend

## Metadata
- ID: 2026-11-22-be-country-region-derivation-thien
- Status: completed
- Started: 2026-11-22
- Last Updated: 2026-11-23
- Owner: agent | thien

---

## Tiến độ
Progress: 100%
Current Phase: completed — PR #89 đã merge vào develop (merge SHA `4fbec53`)

Completed:
- Proposal §9 Approved (Reviewer: thien) với `Overrides:` cho 2 proposal 2026-11-21
- Rẽ nhánh `feat/2026-11-22-be-country-region-thien` từ `develop`
- Tạo đồng thời `plan.md`, `status.md`, `testcase/<id>.md`
- Step 1: `services/ingestion/geo.py` — derive country/region thuần (port heuristic FE)
- Step 2: `parser.py` (T2) + `routes/earthquakes.py::sync` (T6) dùng chung helper
- Step 3: model 2 cột + index; migration MỚI `002_add_country_region` + backfill bằng helper Python (revision rút gọn ≤32 ký tự để khớp `alembic_version.version_num VARCHAR(32)`)
- Step 4: response field optional + query param `country`/`region` lọc server-side
- Step 5: hợp đồng `contracts/*`, `docs/api/API.md` §3.2; FE ưu tiên field BE, giữ fallback
- Step 6: test offline BE/FE, refresh snapshot guard, validation
- Step 7 (theo yêu cầu 2026-11-22): tách danh mục thành 2 endpoint BE (`/earthquakes/countries`, `/regions?country=`) + `geo-catalog-api.ts`; FE dùng cho header + combo bản đồ (fallback `/clusters`/helper cũ); docs API + ERD/SAD cập nhật
- Step 8 (Revision 2026-11-23): `backfill.py` CLI nạp feed `all_month`; chạy thật +9.427 sự kiện, catalog 1 → 102 quốc gia; chuẩn hoá MX → Mexico; re-derive DB dev

In Progress:
- none

Blocked:
- none

---

## Validation
| Kiểm tra | Kết quả | Ghi chú |
|---|---|---|
| Testcase & file test | DONE | `testcase/2026-11-22-be-country-region-derivation-thien.md` + `test_ingestion_geo.py`, bổ sung parser/routes, FE `be-country-region-fields.test.ts` |
| Test liên quan (`pytest`) | PASS | geo + parser + routes + catalog (đã gộp trong toàn bộ) |
| Test toàn bộ backend | PASS | 347/347 (`.venv/bin/python -m pytest -q`, gồm 2 test backfill) |
| Lint / Build | PASS | `ruff check .` + `ruff format --check .` sạch; FE `pnpm test` 245/245, `pnpm build` OK |
| Scripts tests | PASS | 43/43 |
| Notes check | PASS | `notes_index.py --check` OK |
| Tài liệu cập nhật | DONE | `contracts/schemas/earthquake.json`, `contracts/schemas/geo-catalog.json` *(mới)*, `contracts/README.md` §3.1, sample, `docs/api/API.md` §3.2 (2 endpoint mới) + kiến trúc: `docs/architecture/ERD.md` (§1 ERD, §2.1 cột + derived, §3 index, §4 upsert, §5 migration table + giới hạn 32 ký tự), `docs/architecture/SAD.md` (§4.2 T2 + geo.py, §4.6 T6 filter + catalog, §6 pipeline, §9 cây thư mục) — theo yêu cầu người dùng 2026-11-22 |
| Migration | PASS | `alembic heads` → `002_add_country_region (head)`; `001_` không đổi; đã `alembic upgrade head` trên DB dev |
| Backfill runtime | PASS | `python -m gdmas.services.ingestion.backfill` → +9.427 inserted, total 9.453; catalog 102 quốc gia |

---

## Known Issues
- none

---

## Deviations From Plan
- `uv run pytest` không spawn được trong môi trường này → dùng `.venv/bin/python -m pytest` (cùng interpreter/venv).
- Snapshot guard `tests/fixtures/quality_contracts.json` được refresh 3 phần theo thay đổi có chủ đích (không xoá/skip test).
- Revision migration ban đầu `002_add_earthquake_country_region` (34 ký tự) bị DB từ chối do `alembic_version.version_num VARCHAR(32)` → đổi thành `002_add_country_region` (22 ký tự) trước khi apply; upgrade rollback sạch, không để lại cột dư.
- Bổ sung mapping tên bang Mỹ đầy đủ (Tennessee/Texas → USA) sau khi phát hiện dữ liệu thật bị gán sai quốc gia; đồng bộ BE+FE, re-derive 22 dòng cũ.

---

## Decisions Made During Implementation
- Không reverse-geocode theo toạ độ; không dùng prefix `id` (network code, không phải quốc gia).
- Fallback `"Khác"` khi không trích được — không bịa dữ liệu.
- FE ưu tiên field BE, vẫn giữ helper cũ (I2/RULE-03).
- Backfill migration dùng helper Python để FE/BE cùng nhãn (không lệch regex SQL).

---

## Next Actions
- none — đã merge PR #89 vào develop, đồng bộ xong. Môi trường khác: `alembic upgrade head` (và tuỳ chọn chạy backfill all_month).

---

## Last Update
2026-11-23 — PR #89 merged vào develop (`4fbec53`); status → completed.
