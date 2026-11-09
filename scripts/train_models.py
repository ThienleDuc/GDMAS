"""Huấn luyện offline cho FEAT-05 (Pattern 5 dự báo số trận t+1, Pattern 6 phân loại rủi ro t+1).

Chạy (từ apps/api):
    uv run python ../../scripts/train_models.py

Đầu vào : data/usgs_history.csv
Đầu ra  : src/gdmas/services/prediction/models/{forecast_model.joblib, risk_classifier.joblib,
          training_report.json, recent_history.json}
"""

import argparse
import json
import warnings
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression, RidgeCV
from sklearn.metrics import accuracy_score, classification_report, f1_score
from sklearn.model_selection import TimeSeriesSplit
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from statsmodels.tsa.arima.model import ARIMA

warnings.filterwarnings("ignore")
LABELS = ["Low", "Moderate", "High", "Critical"]
SKIP = 10  # bỏ vài sai số đầu của ARIMA (giai đoạn khởi tạo)


# ---------- Dữ liệu & đặc trưng ----------
def build_daily(csv_path: str) -> pd.DataFrame:
    df = pd.read_csv(csv_path, usecols=["time", "mag", "depth"]).dropna(subset=["mag"])
    df["time"] = pd.to_datetime(df["time"], utc=True)
    g = df.set_index("time").resample("1D")
    daily = pd.DataFrame({
        "count": g["mag"].size(),
        "max_mag": g["mag"].max(),
        "n_m4": g["mag"].apply(lambda s: (s >= 4).sum()),
        "mean_depth": g["depth"].mean(),
    })
    if df["time"].max().hour < 23:  # chỉ bỏ ngày cuối nếu nó thiếu giờ
        daily = daily.iloc[:-1]
    daily.index = daily.index.tz_localize(None)
    return daily.fillna(0)


def make_features(daily: pd.DataFrame) -> pd.DataFrame:
    """Đặc trưng biết được vào cuối ngày t, dùng để dự đoán ngày t+1."""
    c = daily["count"].astype(float)
    f = pd.DataFrame(index=daily.index)
    for k in range(7):
        f[f"count_lag{k}"] = c.shift(k)
    f["roll_mean_7"] = c.rolling(7).mean()
    f["roll_mean_14"] = c.rolling(14).mean()
    f["roll_std_7"] = c.rolling(7).std()
    f["roll_max_7"] = c.rolling(7).max()
    f["max_mag"] = daily["max_mag"]
    f["max_mag_roll7"] = daily["max_mag"].rolling(7).max()
    f["n_m4_roll7"] = daily["n_m4"].rolling(7).sum()
    f["mean_depth"] = daily["mean_depth"]
    return f


def to_label(counts, cuts):
    return pd.cut(counts, bins=[-np.inf, *cuts, np.inf], labels=LABELS, right=False).astype(str)


def metrics(y, pred, lo=None, hi=None) -> dict:
    out = {"MAE": float(np.mean(np.abs(y - pred))), "RMSE": float(np.sqrt(np.mean((y - pred) ** 2)))}
    if lo is not None:
        out["coverage_95"] = float(np.mean((y >= lo) & (y <= hi)))
    return out


def fit_arima_best(series: pd.Series):
    best = None
    for p in (1, 2, 3):
        for q in (0, 1, 2):
            try:
                fit = ARIMA(series, order=(p, 0, q), trend="c").fit()
            except Exception:
                continue
            if best is None or fit.aic < best[0]:
                best = (fit.aic, (p, 0, q), fit)
    return best[1], best[2]


def inv_fn(log: bool):
    return np.expm1 if log else (lambda x: x)


# ---------- Pattern 5: dự báo số trận ----------
def train_forecast(daily, ds, split, y_next):
    c = daily["count"].astype(float)
    target_dates = ds.index[split:] + pd.Timedelta(days=1)
    y_test = y_next.iloc[split:]
    pos = c.index.get_indexer(target_dates)
    results, cands = {}, {}

    results["baseline_hom_qua"] = metrics(y_test, ds["count_lag0"].iloc[split:])
    results["baseline_tb_7_ngay"] = metrics(y_test, ds["roll_mean_7"].iloc[split:])
    results["baseline_tb_train"] = metrics(y_test, pd.Series(c.iloc[: pos[0]].mean(), index=y_test.index))

    # ARIMA trên số trận gốc và trên thang log; khoảng tin cậy từ phân vị sai số thực tế
    for log in (False, True):
        series = np.log1p(c) if log else c
        order, fit = fit_arima_best(series.iloc[: pos[0]])
        ext = fit.apply(series)  # giữ tham số, lọc dữ liệu mới -> dự báo 1 bước, không nhìn trước
        mean = ext.get_prediction(start=pos[0], end=pos[-1], dynamic=False).predicted_mean.values
        resid = np.asarray(fit.resid)[SKIP:]
        ql, qh = np.quantile(resid, [0.025, 0.975])
        inv = inv_fn(log)
        name = f"ARIMA{order}" + ("_log" if log else "")
        results[name] = metrics(y_test.values, inv(mean), inv(mean + ql), inv(mean + qh))
        cands[name] = {"log": log, "order": order, "mean": mean, "resid": resid}
    best_arima = min(cands, key=lambda k: results[k]["MAE"])

    # Ridge trên đặc trưng trễ
    ridge = make_pipeline(StandardScaler(), RidgeCV(alphas=[0.1, 1, 10, 100, 1000], cv=TimeSeriesSplit(5)))
    ridge.fit(ds.iloc[:split], y_next.iloc[:split])
    r_res = y_next.iloc[:split] - ridge.predict(ds.iloc[:split])
    rl, rh = np.quantile(r_res, [0.025, 0.975])
    rp = ridge.predict(ds.iloc[split:])
    results["Ridge"] = metrics(y_test.values, rp, rp + rl, rp + rh)

    best_base = min(results[k]["MAE"] for k in results if k.startswith("baseline"))
    winner = best_arima if results[best_arima]["MAE"] <= results["Ridge"]["MAE"] else "Ridge"
    results["_cai_thien_so_voi_baseline_tot_nhat_%"] = round(100 * (1 - results[winner]["MAE"] / best_base), 1)

    # Huấn luyện lại mô hình thắng trên toàn bộ dữ liệu
    if winner == "Ridge":
        ridge.fit(ds, y_next)
        ra = y_next - ridge.predict(ds)
        ql, qh = np.quantile(ra, [0.025, 0.975])
        artifact = {"type": "ridge", "model": ridge, "features": list(ds.columns),
                    "q_lo": float(ql), "q_hi": float(qh)}
    else:
        artifact = refit_arima_artifact(c, cands[winner], "arima")
        ql, qh = np.quantile(artifact.pop("resid"), [0.025, 0.975])
        artifact.update(q_lo=float(ql), q_hi=float(qh))
    return results, winner, artifact, cands, best_arima


def refit_arima_artifact(c, cand, kind):
    series = np.log1p(c) if cand["log"] else c
    final = ARIMA(series, order=cand["order"], trend="c").fit()
    return {"type": kind, "order": cand["order"], "log": cand["log"],
            "params": final.params.to_dict(), "resid": np.asarray(final.resid)[SKIP:]}


# ---------- Pattern 6: phân loại rủi ro ----------
def proba_from_forecast(mean, resid, log, cuts):
    """Xác suất mỗi mức = tỉ lệ kịch bản (dự báo + sai số thực tế) rơi vào mức đó."""
    samples = mean[:, None] + resid[None, :]
    counts = inv_fn(log)(samples)
    bins = np.digitize(counts, cuts)  # 0..3, khớp cách chia [a, b) của nhãn
    return np.stack([(bins == k).mean(axis=1) for k in range(len(LABELS))], axis=1)


def train_classifier(daily, ds, split, y_next, cuts, cand):
    labels = to_label(y_next, cuts)
    Xtr, Xte = ds.iloc[:split], ds.iloc[split:]
    ytr, yte = labels.iloc[:split], labels.iloc[split:]
    rank = {l: i for i, l in enumerate(LABELS)}

    def evaluate(pred):
        pred = pd.Series(np.asarray(pred), index=yte.index)
        gap = np.abs(pred.map(rank).values - yte.map(rank).values)
        return {"accuracy": float(accuracy_score(yte, pred)),
                "f1_macro": float(f1_score(yte, pred, average="macro", labels=LABELS, zero_division=0)),
                "within_1_level": float(np.mean(gap <= 1))}

    def make_rf():
        return RandomForestClassifier(n_estimators=300, max_depth=6, min_samples_leaf=10,
                                      class_weight="balanced_subsample", random_state=42, n_jobs=-1)

    def make_lr():
        return make_pipeline(StandardScaler(), LogisticRegression(C=0.5, class_weight="balanced", max_iter=3000))

    preds = {
        "baseline_giong_hom_nay": to_label(Xte["count_lag0"], cuts).values,
        "baseline_lop_da_so": np.full(len(yte), ytr.mode()[0]),
    }
    preds["RandomForest"] = make_rf().fit(Xtr, ytr).predict(Xte)
    preds["LogisticRegression"] = make_lr().fit(Xtr, ytr).predict(Xte)
    prob = proba_from_forecast(cand["mean"], cand["resid"], cand["log"], cuts)
    preds["PhanPhoiDuBao"] = np.array(LABELS)[prob.argmax(axis=1)]

    res = {k: evaluate(v) for k, v in preds.items()}
    pool = ["RandomForest", "LogisticRegression", "PhanPhoiDuBao"]
    # 4 mức có thứ tự và mức hiếm (High, Critical) chỉ có vài ngày kiểm thử nên macro-F1 không ổn định:
    # chọn theo độ chính xác + tỉ lệ đoán sai tối đa 1 mức.
    winner = max(pool, key=lambda k: res[k]["accuracy"] + res[k]["within_1_level"])
    print(f"Báo cáo chi tiết của {winner}:")
    print(classification_report(yte, preds[winner], labels=LABELS, zero_division=0))

    base = {"labels": LABELS, "thresholds": list(cuts)}
    if winner == "PhanPhoiDuBao":
        art = refit_arima_artifact(daily["count"].astype(float), cand, "forecast_distribution")
        art["resid"] = art["resid"].tolist()
        artifact = {**base, **art}
    else:
        m = (make_rf() if winner == "RandomForest" else make_lr()).fit(ds, labels)
        classes = list(m.classes_)
        artifact = {**base, "type": "sklearn", "model": m, "classes": classes, "features": list(ds.columns)}
    return res, winner, artifact


def show(title, table):
    print(f"\n=== {title} ===")
    for name, m in table.items():
        print(f"{name:34s}", {k: round(v, 3) for k, v in m.items()} if isinstance(m, dict) else m)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--csv", default="data/usgs_history.csv")
    ap.add_argument("--model-dir", default="src/gdmas/services/prediction/models")
    args = ap.parse_args()

    daily = build_daily(args.csv)
    feats = make_features(daily)
    y_next = daily["count"].astype(float).shift(-1).rename("y_next")
    ds = feats.join(y_next).dropna()
    y_next = ds.pop("y_next")
    split = int(len(ds) * 0.8)
    print(f"{len(daily)} ngày | mẫu huấn luyện {split} | mẫu kiểm thử {len(ds) - split} (chia theo thời gian)")

    cuts = tuple(float(round(y_next.iloc[:split].quantile(p) / 5) * 5) for p in (0.5, 0.75, 0.9))
    print(f"Ngưỡng 4 mức (phân vị 50/75/90 của tập train): {cuts}")

    fc_res, fc_winner, fc_art, cands, best_arima = train_forecast(daily, ds, split, y_next)
    show("PATTERN 5 - DỰ BÁO SỐ TRẬN t+1 (tập kiểm thử)", fc_res)
    print(f"-> Mô hình được chọn: {fc_winner}")

    print("\n=== PATTERN 6 - PHÂN LOẠI RỦI RO (tập kiểm thử) ===")
    cl_res, cl_winner, cl_art = train_classifier(daily, ds, split, y_next, cuts, cands[best_arima])
    show("PATTERN 6 - TÓM TẮT", cl_res)
    print(f"-> Mô hình được chọn: {cl_winner}")

    out = Path(args.model_dir)
    out.mkdir(parents=True, exist_ok=True)
    # 60 ngày gần nhất: runner dùng làm "bối cảnh" khi DB chưa tích lũy đủ lịch sử
    tail = daily["count"].iloc[-60:]
    (out / "recent_history.json").write_text(
        json.dumps({"dates": [d.strftime("%Y-%m-%d") for d in tail.index],
                    "counts": [int(v) for v in tail.values]}), encoding="utf-8")
    joblib.dump(fc_art, out / "forecast_model.joblib")
    joblib.dump(cl_art, out / "risk_classifier.joblib")
    (out / "training_report.json").write_text(
        json.dumps({"forecast": fc_res, "forecast_winner": fc_winner, "classifier": cl_res,
                    "classifier_winner": cl_winner, "thresholds": list(cuts),
                    "n_train": split, "n_test": len(ds) - split},
                   ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\nĐã lưu model và báo cáo vào {out.resolve()}")


if __name__ == "__main__":
    main()
