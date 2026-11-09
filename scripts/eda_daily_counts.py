"""EDA số trận động đất mỗi ngày -> chọn ngưỡng 4 mức rủi ro + baseline cho FEAT-05.

Chạy (từ apps/api):
    uv run python ../../scripts/eda_daily_counts.py

Đầu vào : data/usgs_history.csv (từ download_usgs_history.py)
Đầu ra  : data/daily_counts.csv (chuỗi số trận mỗi ngày, dùng cho bước huấn luyện)
          data/eda_overview.png (nếu có matplotlib)
"""

import argparse
from pathlib import Path

import numpy as np
import pandas as pd

try:
    from statsmodels.tsa.stattools import acf, adfuller
except ImportError:  # chạy được dù thiếu statsmodels, chỉ bỏ qua phần ACF/ADF
    acf = adfuller = None

SPEC_THRESHOLDS = (100, 200, 350)  # ngưỡng ghi trong spec FEAT-05
LABELS = ["Low", "Moderate", "High", "Critical"]


def label_by(counts: pd.Series, cuts: tuple[float, float, float]) -> pd.Series:
    bins = [-np.inf, *cuts, np.inf]
    return pd.cut(counts, bins=bins, labels=LABELS, right=False)


def mae(y_true: pd.Series, y_pred: pd.Series) -> float:
    return float(np.mean(np.abs(y_true.values - y_pred.values)))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--csv", default="data/usgs_history.csv")
    parser.add_argument("--out", default="data/daily_counts.csv")
    args = parser.parse_args()

    df = pd.read_csv(args.csv, usecols=["time", "mag"])
    n_raw = len(df)
    df = df.dropna(subset=["mag"])  # giống ingestion: bỏ sự kiện không có magnitude
    df["time"] = pd.to_datetime(df["time"], utc=True)
    print(f"Đọc {n_raw:,} dòng, giữ {len(df):,} dòng có magnitude")

    # Đếm số trận mỗi ngày theo UTC
    daily = df.set_index("time").resample("1D").size().rename("count")
    if df["time"].max().hour < 23 and len(daily) > 1:  # chỉ bỏ ngày cuối nếu nó thiếu giờ
        daily = daily.iloc[:-1]
    daily.index = daily.index.tz_localize(None)
    daily.index.name = "date"
    Path(args.out).parent.mkdir(parents=True, exist_ok=True)
    daily.to_csv(args.out)
    print(f"Đã lưu chuỗi {len(daily)} ngày -> {args.out}")

    # 1) Thống kê mô tả
    print("\n=== 1. THỐNG KÊ SỐ TRẬN MỖI NGÀY ===")
    q = daily.quantile([0.05, 0.25, 0.5, 0.75, 0.9, 0.95])
    print(f"Ngày: {daily.index.min():%Y-%m-%d} -> {daily.index.max():%Y-%m-%d}")
    print(f"Trung bình {daily.mean():.1f} | Độ lệch chuẩn {daily.std():.1f} | "
          f"Min {daily.min()} | Max {daily.max()}")
    print("Phân vị:", {f"P{int(k*100)}": int(v) for k, v in q.items()})
    gaps = daily[daily < daily.mean() * 0.3]
    if len(gaps):
        print(f"CẢNH BÁO: {len(gaps)} ngày có số trận rất thấp (có thể thiếu dữ liệu): "
              f"{[d.strftime('%Y-%m-%d') for d in gaps.index[:5]]}")

    # 2) Ngưỡng 4 mức rủi ro
    print("\n=== 2. PHÂN BỐ 4 MỨC RỦI RO ===")
    quant_cuts = tuple(float(round(daily.quantile(p))) for p in (0.5, 0.75, 0.9))
    for name, cuts in (("Ngưỡng spec", SPEC_THRESHOLDS), ("Ngưỡng theo phân vị 50/75/90", quant_cuts)):
        dist = label_by(daily, cuts).value_counts(normalize=True).reindex(LABELS) * 100
        print(f"{name} {cuts}: " + ", ".join(f"{k} {v:.0f}%" for k, v in dist.items()))
    print("-> Chọn bộ ngưỡng cho 4 nhóm cân đối (không nhóm nào chiếm gần hết).")

    # 3) Tính tự tương quan và tính dừng
    print("\n=== 3. TỰ TƯƠNG QUAN & TÍNH DỪNG ===")
    if acf is not None and len(daily) > 30:
        ac = acf(daily, nlags=7)
        print("ACF lag 1..7:", [round(float(x), 2) for x in ac[1:]])
        p = adfuller(daily)[1]
        print(f"ADF p-value = {p:.4f} ->", "chuỗi dừng" if p < 0.05 else "chuỗi KHÔNG dừng (cần lấy sai phân, ARIMA d>=1)")
    else:
        print("(bỏ qua: thiếu statsmodels hoặc quá ít dữ liệu)")
    dow = daily.groupby(daily.index.dayofweek).mean().round(0)
    print("Trung bình theo thứ (0=T2..6=CN):", dow.astype(int).to_dict())

    # 4) Baseline: mô hình nào cũng phải thắng được những cái này
    print("\n=== 4. BASELINE DỰ BÁO t+1 (test = 20% cuối, chia theo thời gian) ===")
    split = int(len(daily) * 0.8)
    test = daily.iloc[split:]
    pred_yesterday = daily.shift(1).iloc[split:]
    pred_ma7 = daily.rolling(7).mean().shift(1).iloc[split:]
    print(f"Test: {len(test)} ngày")
    print(f"MAE 'bằng hôm qua'        : {mae(test, pred_yesterday):.1f}")
    print(f"MAE 'trung bình 7 ngày'   : {mae(test, pred_ma7):.1f}")

    try:
        import matplotlib
        matplotlib.use("Agg")
        import matplotlib.pyplot as plt

        fig, ax = plt.subplots(1, 2, figsize=(13, 4))
        daily.plot(ax=ax[0], title="Số trận mỗi ngày")
        ax[1].hist(daily, bins=40)
        ax[1].set_title("Phân phối")
        for c in quant_cuts:
            ax[1].axvline(c, color="red", ls="--")
        fig.tight_layout()
        out_png = Path(args.out).parent / "eda_overview.png"
        fig.savefig(out_png, dpi=120)
        print(f"\nĐã lưu biểu đồ -> {out_png}")
    except ImportError:
        print("\n(Không có matplotlib nên bỏ qua biểu đồ)")


if __name__ == "__main__":
    main()
