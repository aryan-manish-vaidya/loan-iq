"""
Smart Loan Approval API — Flask Backend
----------------------------------------
Endpoints:
  POST /api/predict     — run loan prediction for one applicant
  GET  /api/metrics     — return model performance metrics (both models)
  GET  /api/features    — return feature importance data
  POST /api/train       — (re-)train both models on fresh synthetic data
  GET  /api/health      — health check
"""

import os
import sys
import json
import logging

from flask import Flask, request, jsonify
from flask_cors import CORS

# ── Path setup so we can import from /model and /data ────────────────────────
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, BASE_DIR)

from model.predict import predict, FEATURE_COLS

app = Flask(__name__)
CORS(app)  # Allow cross-origin requests from the frontend

logging.basicConfig(level=logging.INFO, format="%(levelname)s  %(message)s")
log = logging.getLogger(__name__)

MODEL_DIR            = os.path.join(BASE_DIR, "model")
METRICS_PATH         = os.path.join(MODEL_DIR, "metrics.json")
FI_PATH              = os.path.join(MODEL_DIR, "feature_importance.json")
MODEL_PATH           = os.path.join(MODEL_DIR, "loan_model.pkl")
INTEREST_MODEL_PATH  = os.path.join(MODEL_DIR, "interest_model.pkl")
INTEREST_METRICS_PATH = os.path.join(MODEL_DIR, "interest_metrics.json")


# ── Helpers ───────────────────────────────────────────────────────────────────

def model_is_trained() -> bool:
    """True only when both the approval and interest-rate models exist."""
    return os.path.exists(MODEL_PATH) and os.path.exists(INTEREST_MODEL_PATH)


def load_json(path: str) -> dict:
    if os.path.exists(path):
        with open(path) as f:
            return json.load(f)
    return {}


# ── Routes ────────────────────────────────────────────────────────────────────

@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({
        "status":                "ok",
        "model_ready":           os.path.exists(MODEL_PATH),
        "interest_model_ready":  os.path.exists(INTEREST_MODEL_PATH),
    })


@app.route("/api/predict", methods=["POST"])
def predict_endpoint():
    """
    Expects JSON body with applicant features.
    Returns approval prediction, risk score, interest rate, and full analysis.
    """
    if not os.path.exists(MODEL_PATH):
        return jsonify({
            "error": "Model not trained yet. Call POST /api/train first."
        }), 503

    data = request.get_json(force=True, silent=True)
    if not data:
        return jsonify({"error": "Invalid JSON body."}), 400

    # Validate required classification fields
    missing = [col for col in FEATURE_COLS if col not in data]
    if missing:
        return jsonify({"error": f"Missing fields: {missing}"}), 400

    # Parse and validate all fields
    try:
        age            = int(data["age"])
        income         = float(data["income"])
        employment     = int(data["employment_status"])
        credit_score   = int(data["credit_score"])
        loan_amount    = float(data["loan_amount"])
        loan_term      = int(data["loan_term"])
        existing_debts = float(data["existing_debts"])
        payment_hist   = int(data["payment_history"])
        missed_emis    = int(data.get("missed_emis", 0))   # optional, defaults to 0
    except (ValueError, TypeError) as e:
        return jsonify({"error": f"Invalid data types: {e}"}), 400

    validations = [
        (18 <= age <= 100,              "age must be 18–100"),
        (1_000 <= income <= 10_000_000, "income must be 1,000–10,000,000"),
        (employment in [0, 1, 2, 3],    "employment_status must be 0–3"),
        (300 <= credit_score <= 850,    "credit_score must be 300–850"),
        (500 <= loan_amount <= 5_000_000, "loan_amount must be 500–5,000,000"),
        (loan_term in [12, 24, 36, 48, 60, 72, 84, 120], "loan_term must be a valid term"),
        (0 <= existing_debts <= 10_000_000, "existing_debts must be 0–10,000,000"),
        (0 <= payment_hist <= 100,      "payment_history must be 0–100"),
        (0 <= missed_emis <= 12,        "missed_emis must be 0–12"),
    ]
    for ok, msg in validations:
        if not ok:
            return jsonify({"error": msg}), 400

    # Build the applicant dict passed to predict()
    applicant = {
        "age":               age,
        "income":            income,
        "employment_status": employment,
        "credit_score":      credit_score,
        "loan_amount":       loan_amount,
        "loan_term":         loan_term,
        "existing_debts":    existing_debts,
        "payment_history":   payment_hist,
        "missed_emis":       missed_emis,   # passed through for interest model
    }

    try:
        result = predict(applicant)
        log.info(
            "Prediction: %s | Risk: %s | Rate: %.2f%% | Confidence: %.1f%%",
            result["status"], result["risk_tier"],
            result["interest_rate"], result["confidence"]
        )
        return jsonify(result)
    except Exception as e:
        log.exception("Prediction failed")
        return jsonify({"error": str(e)}), 500


@app.route("/api/train", methods=["POST"])
def train_endpoint():
    """Trigger (re-)training of both models. Runs synchronously (~15s)."""
    try:
        from model.train_model import train_and_save
        _, metrics, fi = train_and_save()
        return jsonify({
            "status":            "Models trained successfully",
            "metrics":           metrics,
            "feature_importance": fi,
        })
    except Exception as e:
        log.exception("Training failed")
        return jsonify({"error": str(e)}), 500


@app.route("/api/metrics", methods=["GET"])
def metrics_endpoint():
    """Return performance metrics for both the approval and interest-rate models."""
    if not os.path.exists(METRICS_PATH):
        return jsonify({"error": "No metrics found. Train the model first."}), 404

    metrics = load_json(METRICS_PATH)

    # Merge interest-rate metrics if available
    if os.path.exists(INTEREST_METRICS_PATH):
        metrics["interest_metrics"] = load_json(INTEREST_METRICS_PATH)

    return jsonify(metrics)


@app.route("/api/features", methods=["GET"])
def features_endpoint():
    if not os.path.exists(FI_PATH):
        return jsonify({"error": "No feature importance found. Train the model first."}), 404
    return jsonify(load_json(FI_PATH))


# ── Entry point ────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    # Auto-train on first run if either model is missing
    if not model_is_trained():
        log.info("One or both models missing — running initial training …")
        try:
            from model.train_model import train_and_save
            train_and_save()
        except Exception as e:
            log.error("Auto-training failed: %s", e)
            log.error("Starting server anyway; train manually via POST /api/train")

    log.info("Starting Flask server on http://localhost:5001")
    app.run(debug=True, host="0.0.0.0", port=5001)
