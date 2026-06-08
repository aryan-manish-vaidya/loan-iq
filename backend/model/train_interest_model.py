"""
Interest Rate Regression Model — Training Script
-------------------------------------------------
Trains a RandomForestRegressor to predict personalised interest rates (6%–20%).

Features used:
  credit_score, payment_history, existing_debts, income,
  loan_amount, missed_emis, employment_status, loan_term

Target:
  interest_rate (float, 6.0–20.0)

Metrics:
  MAE (Mean Absolute Error), RMSE, R² Score, 5-fold CV R²
"""

import os
import sys
import json
import pickle
import numpy as np
import pandas as pd

from sklearn.ensemble        import RandomForestRegressor
from sklearn.preprocessing   import StandardScaler
from sklearn.pipeline        import Pipeline
from sklearn.model_selection import cross_val_score, KFold
from sklearn.metrics         import mean_absolute_error, r2_score, mean_squared_error

# ── Resolve paths ─────────────────────────────────────────────────────────────
ROOT_DIR  = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR  = os.path.join(ROOT_DIR, "data")
MODEL_DIR = os.path.dirname(os.path.abspath(__file__))

sys.path.insert(0, ROOT_DIR)

# Features the interest model uses (superset of classification features)
INTEREST_FEATURE_COLS = [
    "credit_score",
    "payment_history",
    "existing_debts",
    "income",
    "loan_amount",
    "missed_emis",
    "employment_status",
    "loan_term",
]
INTEREST_TARGET = "interest_rate"


def _ensure_dataset_has_interest(data_dir: str) -> None:
    """Regenerate the dataset if interest_rate or missed_emis columns are absent."""
    train_path = os.path.join(data_dir, "train_data.csv")
    test_path  = os.path.join(data_dir, "test_data.csv")

    needs_regen = True
    if os.path.exists(train_path):
        try:
            sample = pd.read_csv(train_path, nrows=1)
            required = {"interest_rate", "missed_emis"}
            if required.issubset(set(sample.columns)):
                needs_regen = False
        except Exception:
            pass

    if needs_regen:
        print("[InterestTrain] Dataset missing new columns — regenerating …")
        from data.generate_data import generate_loan_dataset, save_dataset
        df = generate_loan_dataset(n_samples=5000)
        save_dataset(df, output_dir=data_dir)


def load_interest_data(data_dir: str = None) -> tuple:
    """Load train/test CSVs; generate them if missing or outdated."""
    if data_dir is None:
        data_dir = DATA_DIR

    _ensure_dataset_has_interest(data_dir)

    train_df = pd.read_csv(os.path.join(data_dir, "train_data.csv"))
    test_df  = pd.read_csv(os.path.join(data_dir, "test_data.csv"))
    return train_df, test_df


def build_interest_pipeline() -> Pipeline:
    """
    sklearn Pipeline: StandardScaler → RandomForestRegressor.
    Random Forest handles non-linear interactions between credit, debt, and payment behaviour.
    """
    rfr = RandomForestRegressor(
        n_estimators=200,
        max_depth=10,
        min_samples_split=5,
        min_samples_leaf=2,
        max_features="sqrt",
        random_state=42,
        n_jobs=-1,
    )
    return Pipeline([
        ("scaler", StandardScaler()),
        ("reg",    rfr),
    ])


def evaluate_interest_model(pipeline: Pipeline, X_test: pd.DataFrame, y_test: pd.Series) -> dict:
    """Evaluate the regressor and print results."""
    y_pred = pipeline.predict(X_test)

    mae  = mean_absolute_error(y_test, y_pred)
    rmse = float(np.sqrt(mean_squared_error(y_test, y_pred)))
    r2   = r2_score(y_test, y_pred)

    print(f"\n{'='*50}")
    print(f"  Interest Rate Model Evaluation")
    print(f"{'='*50}")
    print(f"  MAE   : {mae:.4f}%  (avg absolute error)")
    print(f"  RMSE  : {rmse:.4f}%")
    print(f"  R²    : {r2:.4f}  (1.0 = perfect)")

    # Sample predictions vs actuals
    print(f"\n  Sample predictions (first 5 test rows):")
    for actual, pred in zip(y_test[:5], y_pred[:5]):
        print(f"    Actual: {actual:.2f}%  →  Predicted: {pred:.2f}%")
    print(f"{'='*50}\n")

    return {
        "mae":  round(mae, 4),
        "rmse": round(rmse, 4),
        "r2_score": round(r2, 4),
    }


def train_and_save_interest(data_dir: str = None) -> tuple:
    """Full interest rate training pipeline: load → train → evaluate → save."""
    if data_dir is None:
        data_dir = DATA_DIR

    print("\n[InterestTrain] Loading data …")
    train_df, test_df = load_interest_data(data_dir)

    X_train = train_df[INTEREST_FEATURE_COLS]
    y_train = train_df[INTEREST_TARGET]
    X_test  = test_df[INTEREST_FEATURE_COLS]
    y_test  = test_df[INTEREST_TARGET]

    print(f"[InterestTrain] Training on {len(X_train)} samples …")
    pipeline = build_interest_pipeline()
    pipeline.fit(X_train, y_train)

    # ── 5-fold cross-validation ───────────────────────────────────────────
    cv = cross_val_score(
        pipeline, X_train, y_train,
        cv=KFold(5, shuffle=True, random_state=42),
        scoring="r2"
    )
    print(f"[InterestTrain] CV R²: {cv.mean():.4f} ± {cv.std():.4f}")

    # ── Evaluate on held-out test set ─────────────────────────────────────
    metrics = evaluate_interest_model(pipeline, X_test, y_test)
    metrics["cv_r2_mean"] = round(float(cv.mean()), 4)
    metrics["cv_r2_std"]  = round(float(cv.std()),  4)
    metrics["feature_cols"] = INTEREST_FEATURE_COLS

    # ── Save artefacts ─────────────────────────────────────────────────────
    model_path   = os.path.join(MODEL_DIR, "interest_model.pkl")
    metrics_path = os.path.join(MODEL_DIR, "interest_metrics.json")

    with open(model_path, "wb") as f:
        pickle.dump(pipeline, f)

    with open(metrics_path, "w") as f:
        json.dump(metrics, f, indent=2)

    print(f"[InterestTrain] Model saved   → {model_path}")
    print(f"[InterestTrain] Metrics saved → {metrics_path}")
    print(f"[InterestTrain] Done ✓\n")

    return pipeline, metrics


if __name__ == "__main__":
    train_and_save_interest()
