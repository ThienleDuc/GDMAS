#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
for cmd in docker uv curl; do
  command -v "$cmd" >/dev/null || { printf 'Thiếu lệnh %s\n' "$cmd" >&2; exit 1; }
done
printf '%s\n' 'T1: khởi động PostgreSQL và chờ healthy...'
docker compose up -d --wait postgres
cd "$ROOT/apps/api"
printf '%s\n' 'Áp dụng migration trên DATABASE_URL của API local...'
uv run alembic upgrade head
printf '%s\n' 'T2: nạp dữ liệu USGS...'
uv run python -c 'import sys; from gdmas.services.ingestion.service import IngestionService; r = IngestionService().execute_cycle(); print(r); sys.exit(0 if r.get("success") else 1)'
printf '%s\n' 'Kiểm tra dữ liệu sự kiện...'
uv run python -c 'import sys; from sqlalchemy import text; from gdmas.db.connection import SessionLocal; db = SessionLocal(); n = db.execute(text("SELECT count(*) FROM earthquake_events")).scalar_one(); db.close(); print("Số sự kiện:", n); sys.exit(0 if n > 0 else 1)'
printf '%s\n' 'T3: phân tích...'
uv run python -m gdmas.services.analysis.runner --once
printf '%s\n' 'T4: phân cụm...'
uv run python -c 'import sys; from gdmas.services.clustering.runner import run_once; r = run_once(); print(r); sys.exit(1 if r.get("success") is False else 0)'
printf '%s\n' 'T5: dự báo...'
uv run python -m gdmas.services.prediction.runner --once
printf '%s\n' 'T6: khởi động API...'
cd "$ROOT"
docker compose up -d api
api_port="${API_PORT:-8000}"
ready=0
for ((attempt=1; attempt<=30; attempt++)); do
  if curl --fail --silent --max-time 2 "http://127.0.0.1:${api_port}/health" >/dev/null; then ready=1; break; fi
  sleep 1
done
if [ "$ready" -ne 1 ]; then printf '%s\n' 'API không sẵn sàng tại /health.' >&2; exit 1; fi
printf '%s\n' 'Hoàn tất. Kiểm tra dữ liệu bằng demo_queries.sql; API và PostgreSQL vẫn chạy.'
