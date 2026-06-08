"""
Loan Approval ML Model — Training Script
-----------------------------------------
Uses a Random Forest classifier with preprocessing pipeline.
Regenerates the synthetic dataset if new columns (missed_emis, interest_rate) are absent.
After training the classifier, automatically trains the interest-rate regressor too.
"""

import os
import sys
import json
import pickle
import numpy as np
import pandas as pd

from sklearn.ensemble         import RandomForestClassifier
from sklearn.preprocessing    import StandardScaler
from sklearn.pipeline         import Pipeline
from sklearn.model_selection  import cross_val_score, StratifiedKFold
from sklearn.metrics          import (
    accuracy_score, classification_report,
    confusion_matrix, roc_auc_score
)

# ── Resolve paths ────────────────────────────────────────────────────────────
ROOT_DIR  = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR  = os.path.join(ROOT_DIR, "data")
MODEL_DIR = os.path.dirname(os.path.abspath(__file__))

sys.path.insert(0, ROOT_DIR)

# Classification model features (unchanged — backward compatible)
FEATURE_COLS = [
    "age", "income", "employment_status", "credit_score",
    "loan_amount", "loan_term", "existing_debts", "payment_history",
]
TARGET_COL = "loan_approved"

FEATURE_LABELS = {
    "age":               "Age",
    "income":            "Annual Income",
    "employment_status": "Employment Status",
    "credit_score":      "Credit / CIBIL Score",
    "loan_amount":       "Loan Amount",
    "loan_term":         "Loan Term (months)",
    "existing_debts":    "Existing Debts",
    "payment_history":   "Payment History",
}

# Columns that MUST exist in the dataset (including new fields)
REQUIRED_COLUMNS = set(FEATURE_COLS) | {"loan_approved", "missed_emis", "interest_rate"}


def load_or_generate_data() -> tuple:
    """
    Load CSV data; regenerate it if the files don't exist OR if new
    columns (missed_emis / interest_rate) are missing from an older CSV.
    """
    train_path = os.path.join(DATA_DIR, "train_data.csv")
    test_path  = os.path.join(DATA_DIR, "test_data.csv")

    needs_regen = True

    if os.path.exists(train_path) and os.path.exists(test_path):
        try:
            sample = pd.read_csv(train_path, nrows=1)
            if REQUIRED_COLUMNS.issubset(set(sample.columns)):
                needs_regen = False
            else:
                missing = REQUIRED_COLUMNS - set(sample.columns)
                print(f"[Train] Dataset outdated — missing columns: {missing}")
        except Exception as e:
            print(f"[Train] Could not read dataset ({e}) — regenerating …")

    if needs_regen:
        print("[Train] Generating synthetic dataset …")
        from data.generate_data import generate_loan_dataset, save_dataset
        df = generate_loan_dataset(n_samples=5000)
        save_dataset(df, output_dir=DATA_DIR)

    train_df = pd.read_csv(train_path)
    test_df  = pd.read_csv(test_path)
    return train_df, test_df


def build_pipeline() -> Pipeline:
    """Return a sklearn Pipeline: StandardScaler → Random Forest classifier."""
    rf = RandomForestClassifier(
        n_estimators=200,
        max_depth=12,
        min_samples_split=5,
        min_samples_leaf=2,
        max_features="sqrt",
        class_weight="balanced",
        random_state=42,
        n_jobs=-1,
    )
    return Pipeline([
        ("scaler", StandardScaler()),
        ("clf",    rf),
    ])


def evaluate_model(pipeline: Pipeline, X_test: pd.DataFrame, y_test: pd.Series) -> dict:
    """Print and return classification evaluation metrics."""
    y_pred = pipeline.predict(X_test)
    y_prob = pipeline.predict_proba(X_test)[:, 1]

    acc    = accuracy_score(y_test, y_pred)
    auc    = roc_auc_score(y_test, y_prob)
    cm     = confusion_matrix(y_test, y_pred).tolist()
    report = classification_report(y_test, y_pred, output_dict=True)

    print(f"\n{'='*50}")
    print(f"  Approval Model Evaluation")
    print(f"{'='*50}")
    print(f"  Accuracy  : {acc*100:.2f}%")
    print(f"  ROC-AUC   : {auc:.4f}")
    print(f"\n  Confusion Matrix:")
    print(f"  TN={cm[0][0]}  FP={cm[0][1]}")
    print(f"  FN={cm[1][0]}  TP={cm[1][1]}")
    print(f"\n  Classification Report:")
    print(classification_report(y_test, y_pred, target_names=["Rejected", "Approved"]))
    print(f"{'='*50}\n")

    return {
        "accuracy":              round(acc * 100, 2),
        "roc_auc":               round(auc, 4),
        "confusion_matrix":      cm,
        "classification_report": report,
    }


def get_feature_importance(pipeline: Pipeline) -> dict:
    """Extract feature importances from the Random Forest inside the pipeline."""
    rf = pipeline.named_steps["clf"]
    importances = rf.feature_importances_
    fi = {feat: round(float(imp), 4) for feat, imp in zip(FEATURE_COLS, importances)}
    sorted_fi = dict(sorted(fi.items(), key=lambda x: x[1], reverse=True))

    print("  Feature Importances (Approval Model):")
    for feat, imp in sorted_fi.items():
        bar = "█" * int(imp * 40)
        print(f"  {FEATURE_LABELS[feat]:<28} {imp:.4f}  {bar}")

    return sorted_fi


def train_and_save() -> tuple:
    """Full training pipeline: load data → train classifier → evaluate → save artefacts."""
    print("\n[Train] Loading / generating data …")
    train_df, test_df = load_or_generate_data()

    X_train = train_df[FEATURE_COLS]
    y_train = train_df[TARGET_COL]
    X_test  = test_df[FEATURE_COLS]
    y_test  = test_df[TARGET_COL]

    # ── Train classifier ──────────────────────────────────────────────────
    print(f"[Train] Training approval classifier on {len(X_train)} samples …")
    pipeline = build_pipeline()
    pipeline.fit(X_train, y_train)

    # ── Cross-validation ──────────────────────────────────────────────────
    cv_scores = cross_val_score(
        pipeline, X_train, y_train, cv=StratifiedKFold(5), scoring="accuracy"
    )
    print(f"[Train] CV Accuracy: {cv_scores.mean()*100:.2f}% ± {cv_scores.std()*100:.2f}%")

    # ── Evaluate on held-out test set ─────────────────────────────────────
    metrics = evaluate_model(pipeline, X_test, y_test)
    metrics["cv_mean_accuracy"] = round(cv_scores.mean() * 100, 2)
    metrics["cv_std_accuracy"]  = round(cv_scores.std()  * 100, 2)

    # ── Feature importances ───────────────────────────────────────────────
    feature_importance = get_feature_importance(pipeline)

    # ── Save classifier artefacts ─────────────────────────────────────────
    model_path   = os.path.join(MODEL_DIR, "loan_model.pkl")
    metrics_path = os.path.join(MODEL_DIR, "metrics.json")
    fi_path      = os.path.join(MODEL_DIR, "feature_importance.json")

    with open(model_path, "wb") as f:
        pickle.dump(pipeline, f)
    with open(metrics_path, "w") as f:
        json.dump(metrics, f, indent=2)
    with open(fi_path, "w") as f:
        json.dump(feature_importance, f, indent=2)

    meta = {
        "feature_cols":   FEATURE_COLS,
        "feature_labels": FEATURE_LABELS,
        "model_path":     model_path,
    }
    with open(os.path.join(MODEL_DIR, "model_meta.json"), "w") as f:
        json.dump(meta, f, indent=2)

    print(f"[Train] Classifier saved  → {model_path}")
    print(f"[Train] Metrics saved     → {metrics_path}")

    # ── Train interest-rate regressor ─────────────────────────────────────
    print("\n[Train] Training interest rate regressor …")
    try:
        from model.train_interest_model import train_and_save_interest
        _, interest_metrics = train_and_save_interest(data_dir=DATA_DIR)
        metrics["interest_metrics"] = interest_metrics
    except Exception as e:
        print(f"[Train] ⚠ Interest model training failed: {e}")

    print(f"[Train] All models ready ✓\n")
    return pipeline, metrics, feature_importance


if __name__ == "__main__":
    train_and_save()
