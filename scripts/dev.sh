#!/usr/bin/env bash
# =============================================================================
# GDMAS - Unified Development Launcher (1 Lệnh Khởi Chạy Toàn Bộ Hệ Thống)
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$SCRIPT_DIR"

echo "=========================================================================="
echo "        GDMAS - GLOBAL DISASTER MONITORING & ANALYSIS SYSTEM              "
echo "            MÔI TRƯỜNG PHÁT TRIỂN LOCAL (HOT-RELOAD 100%)                "
echo "=========================================================================="

if [ "$1" == "--stop" ] || [ "$1" == "stop" ]; then
    echo "[-] Đang dừng toàn bộ 7 dịch vụ của GDMAS..."
    docker compose down
    echo "[+] Toàn bộ hệ thống đã được dừng an toàn."
    exit 0
fi

if [ "$1" == "--logs" ] || [ "$1" == "logs" ]; then
    docker compose logs -f
    exit 0
fi

echo "[*] Khởi chạy toàn bộ hệ thống với Docker Compose Hot-Reload..."
docker compose up -d

echo ""
echo "=========================================================================="
echo "                 HỆ THỐNG ĐÃ SẴN SÀNG HOẠT ĐỘNG!                          "
echo "=========================================================================="
echo "  [T7] Frontend SPA Client  : http://localhost:3000   (Vite HMR Hot Reload)"
echo "  [T6] Backend FastAPI & SSE: http://localhost:8000   (Uvicorn Hot Reload)"
echo "  [--] Swagger API Docs     : http://localhost:8000/api/v1/docs"
echo "  [T1] PostgreSQL Database  : localhost:5432        (DB: gdmas_db, UTC)"
echo "  [T2-T5] 4 Workers ngầm    : Ingestion, Analysis, Clustering, Prediction"
echo "=========================================================================="
echo "  Mẹo: Bất kỳ sửa đổi file .py hoặc .tsx đều TỰ ĐỘNG CẬP NHẬT TỨC THÌ!"
echo "  Dừng hệ thống: gõ ./scripts/dev.sh stop hoặc docker compose down"
echo "=========================================================================="

