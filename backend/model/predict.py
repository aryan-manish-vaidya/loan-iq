"""
Loan Prediction Module — Enhanced
-----------------------------------
Handles single-applicant inference:
  1. Loan Approval classification  (loan_model.pkl)
  2. Risk Tier computation          (composite rule-based score)
  3. Interest Rate prediction       (interest_model.pkl)
  4. Human-readable analysis report (factors, suggestions, interest explanation)
"""

import os
import json
import pickle
import numpy as np
import pandas as pd

MODEL_DIR            = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH           = os.path.join(MODEL_DIR, "loan_model.pkl")
INTEREST_MODEL_PATH  = os.path.join(MODEL_DIR, "interest_model.pkl")
FI_PATH              = os.path.join(MODEL_DIR, "feature_importance.json")

# ── Feature columns ─────────────────────────────────────────────────────────
# Classification model uses the original 8 features
FEATURE_COLS = [
    "age", "income", "employment_status", "credit_score",
    "loan_amount", "loan_term", "existing_debts", "payment_history",
]

# Interest rate model includes the new missed_emis feature
INTEREST_FEATURE_COLS = [
    "credit_score", "payment_history", "existing_debts",
    "income", "loan_amount", "missed_emis", "employment_status", "loan_term",
]

EMPLOYMENT_MAP = {0: "Unemployed", 1: "Part-time", 2: "Self-employed", 3: "Full-time"}


# ════════════════════════════════════════════════════════════════════════════
# MODEL LOADERS
# ════════════════════════════════════════════════════════════════════════════

def load_model() -> object:
    """Load the trained approval classifier pipeline from disk."""
    if not os.path.exists(MODEL_PATH):
        raise FileNotFoundError(
            f"Approval model not found at {MODEL_PATH}. "
            "Run `python backend/model/train_model.py` first."
        )
    with open(MODEL_PATH, "rb") as f:
        return pickle.load(f)


def load_interest_model():
    """Load the interest rate regressor. Returns None if not yet trained."""
    if not os.path.exists(INTEREST_MODEL_PATH):
        return None
    with open(INTEREST_MODEL_PATH, "rb") as f:
        return pickle.load(f)


# ════════════════════════════════════════════════════════════════════════════
# RISK SCORE
# ════════════════════════════════════════════════════════════════════════════

def compute_risk_score(prob_approved: float, applicant: dict) -> dict:
    """
    Compute a composite risk score (0–100) and tier (Low / Medium / High).
    Blends ML approval probability with key financial ratios.
    """
    income         = max(applicant.get("income", 1), 1)
    debt_to_income = applicant.get("existing_debts", 0) / income
    loan_to_income = applicant.get("loan_amount", 0)    / income
    credit_score   = applicant.get("credit_score", 650)
    payment_hist   = applicant.get("payment_history", 70)
    missed_emis    = applicant.get("missed_emis", 0)

    prob_risk    = 1 - prob_approved
    dti_risk     = min(debt_to_income, 1.0)
    lti_risk     = min(loan_to_income, 1.0)
    credit_risk  = 1 - ((credit_score - 300) / 550)
    history_risk = 1 - (payment_hist / 100)
    emi_risk     = missed_emis / 12         # 0–1 scale

    composite = (
        0.32 * prob_risk
      + 0.18 * dti_risk
      + 0.18 * credit_risk
      + 0.14 * history_risk
      + 0.10 * emi_risk        # missed EMIs contribute to overall risk
      + 0.08 * lti_risk
    )
    composite      = float(np.clip(composite, 0, 1))
    risk_score_100 = round(composite * 100, 1)

    if   composite < 0.35: tier = "Low"
    elif composite < 0.65: tier = "Medium"
    else:                  tier = "High"

    return {"score": risk_score_100, "tier": tier, "raw": composite}


# ════════════════════════════════════════════════════════════════════════════
# INTEREST RATE PREDICTION
# ════════════════════════════════════════════════════════════════════════════

def predict_interest_rate(applicant: dict) -> dict:
    """
    Predict a personalised interest rate for the applicant.
    Falls back to a rule-based calculation if the ML model isn't available.
    Returns: { interest_rate, interest_category, interest_explanation }
    """
    model = load_interest_model()

    if model is not None:
        features = pd.DataFrame(
            [[float(applicant.get(col, 0)) for col in INTEREST_FEATURE_COLS]],
            columns=INTEREST_FEATURE_COLS
        )
        rate = float(model.predict(features)[0])
        rate = round(max(6.0, min(20.0, rate)), 2)
    else:
        # Rule-based fallback (mirrors the data-generation formula)
        income      = max(applicant.get("income", 1), 1)
        cs          = applicant.get("credit_score", 650)
        ph          = applicant.get("payment_history", 70)
        debts       = applicant.get("existing_debts", 0)
        la          = applicant.get("loan_amount", 25000)
        me          = applicant.get("missed_emis", 0)
        emp         = applicant.get("employment_status", 3)
        lt          = applicant.get("loan_term", 36)
        dti         = debts / income
        lti         = la    / income
        rate = round(max(6.0, min(20.0,
            8.0
            + (1 - (cs  - 300) / 550) * 8.0
            + me * 0.6
            + (1 - ph / 100) * 4.0
            + min(dti, 1) * 3.0
            - (emp / 3)   * 2.0
            + min(lti, 1) * 1.5
        )), 2)

    # Determine category
    if   rate < 10.0: category = "Low"
    elif rate < 15.0: category = "Moderate"
    else:             category = "High"

    explanation = _build_interest_explanation(applicant, rate, category)

    return {
        "interest_rate":        rate,
        "interest_category":    category,
        "interest_explanation": explanation,
    }


def _build_interest_explanation(applicant: dict, rate: float, category: str) -> str:
    """
    Generate a plain-English sentence explaining why this interest rate was assigned.
    """
    cs          = applicant.get("credit_score", 650)
    ph          = applicant.get("payment_history", 70)
    missed      = applicant.get("missed_emis", 0)
    income      = max(applicant.get("income", 1), 1)
    debts       = applicant.get("existing_debts", 0)
    dti         = debts / income

    drivers = []

    # Credit score driver
    if   cs >= 750: drivers.append(f"excellent credit score ({cs}) significantly reducing the rate")
    elif cs >= 670: drivers.append(f"good credit score ({cs}) lowering the rate")
    elif cs >= 580: drivers.append(f"fair credit score ({cs}) moderately increasing the rate")
    else:           drivers.append(f"poor credit score ({cs}) driving the rate higher")

    # Missed EMI driver
    if   missed == 0: drivers.append("no missed EMIs demonstrating strong repayment discipline")
    elif missed <= 2: drivers.append(f"{missed} missed EMI(s) slightly elevating the rate")
    else:             drivers.append(f"{missed} missed EMIs indicating repayment risk, raising the rate")

    # Payment history driver
    if   ph >= 85: drivers.append(f"excellent on-time payment history ({ph}/100) lowering the rate")
    elif ph < 50:  drivers.append(f"below-average payment history ({ph}/100) increasing the rate")

    # DTI driver
    if   dti > 0.5: drivers.append(f"high debt-to-income ratio ({dti*100:.0f}%) adding a risk premium")
    elif dti < 0.2: drivers.append(f"low debt-to-income ratio ({dti*100:.0f}%) reducing the risk premium")

    driver_str = "; ".join(drivers[:3]) if drivers else "overall balanced financial profile"
    return (
        f"A {category.lower()} interest rate of {rate:.2f}% was assigned because: {driver_str}. "
        f"{'Improving your credit score and reducing missed EMIs are the fastest ways to lower this rate.' if rate >= 13 else ''}"
        f"{'Maintain your strong financial habits to keep this competitive rate.' if rate < 10 else ''}"
    ).strip()


def _build_interest_suggestions(applicant: dict, rate: float) -> list:
    """Return interest-rate-specific improvement suggestions."""
    suggestions = []
    cs     = applicant.get("credit_score", 650)
    ph     = applicant.get("payment_history", 70)
    missed = applicant.get("missed_emis", 0)
    income = max(applicant.get("income", 1), 1)
    debts  = applicant.get("existing_debts", 0)
    dti    = debts / income

    if cs < 720:
        target = min(cs + 50, 850)
        suggestions.append(
            f"Raise your credit score from {cs} to {target}+ by reducing credit utilisation "
            f"— this alone could cut your rate by ~{round((850-cs)/550*3, 1)}%."
        )
    if missed > 0:
        suggestions.append(
            f"Eliminate missed EMIs (currently {missed}): setting up auto-pay for all EMIs "
            f"can reduce your rate by up to {round(missed * 0.6, 1)}% over time."
        )
    if ph < 70:
        suggestions.append(
            f"Improve your payment history score from {ph}/100 to 85+ by paying all bills "
            f"on time for at least 12 consecutive months."
        )
    if dti > 0.35:
        suggestions.append(
            f"Lower your debt-to-income ratio ({dti*100:.0f}%) below 35% by paying down "
            f"high-interest debts first — this will directly reduce your risk premium."
        )
    if rate >= 15:
        suggestions.append(
            "Consider applying after 6–12 months of consistent financial improvement; "
            "even a 50-point credit score gain could move you into the Moderate rate tier."
        )
    if not suggestions:
        suggestions.append(
            "Your rate is already competitive. Continue your strong payment habits "
            "and credit utilisation to lock in even lower rates on future applications."
        )
    return suggestions


# ════════════════════════════════════════════════════════════════════════════
# FULL REPORT
# ════════════════════════════════════════════════════════════════════════════

def generate_report(
    applicant: dict,
    prediction: int,
    confidence: float,
    risk: dict,
    interest: dict,
) -> dict:
    """
    Generate a plain-English analysis report including:
      - Approval/rejection reasoning
      - Positive and negative financial factors
      - General improvement suggestions
      - Interest rate specific suggestions
    """
    income          = applicant.get("income", 0)
    credit_score    = applicant.get("credit_score", 0)
    existing_debts  = applicant.get("existing_debts", 0)
    payment_history = applicant.get("payment_history", 0)
    employment      = EMPLOYMENT_MAP.get(int(applicant.get("employment_status", 0)), "Unknown")
    loan_amount     = applicant.get("loan_amount", 0)
    age             = applicant.get("age", 30)
    missed_emis     = applicant.get("missed_emis", 0)

    debt_to_income = existing_debts / max(income, 1)
    loan_to_income = loan_amount    / max(income, 1)

    positive_factors = []
    negative_factors = []

    # ── Credit score ───────────────────────────────────────────────────────
    if   credit_score >= 750: positive_factors.append(f"Excellent credit / CIBIL score ({credit_score})")
    elif credit_score >= 670: positive_factors.append(f"Good credit / CIBIL score ({credit_score})")
    elif credit_score >= 580: negative_factors.append(f"Fair credit score ({credit_score}) — below ideal")
    else:                     negative_factors.append(f"Poor credit score ({credit_score}) — major risk factor")

    # ── Missed EMIs ────────────────────────────────────────────────────────
    if   missed_emis == 0:   positive_factors.append("No missed EMIs — perfect repayment discipline")
    elif missed_emis <= 2:   negative_factors.append(f"{missed_emis} missed EMI(s) in repayment history")
    else:                    negative_factors.append(f"{missed_emis} missed EMIs — significant repayment risk")

    # ── Debt-to-income ─────────────────────────────────────────────────────
    if   debt_to_income < 0.20: positive_factors.append(f"Low debt-to-income ratio ({debt_to_income*100:.0f}%)")
    elif debt_to_income < 0.40: positive_factors.append(f"Manageable debt-to-income ratio ({debt_to_income*100:.0f}%)")
    elif debt_to_income < 0.60: negative_factors.append(f"Elevated debt-to-income ratio ({debt_to_income*100:.0f}%)")
    else:                        negative_factors.append(f"High debt-to-income ratio ({debt_to_income*100:.0f}%) — significant risk")

    # ── Income ─────────────────────────────────────────────────────────────
    if   income >= 100_000: positive_factors.append(f"High annual income (${income:,.0f})")
    elif income >= 50_000:  positive_factors.append(f"Moderate annual income (${income:,.0f})")
    elif income >= 30_000:  negative_factors.append(f"Below-average income (${income:,.0f})")
    else:                   negative_factors.append(f"Low annual income (${income:,.0f}) — affordability concern")

    # ── Payment history ────────────────────────────────────────────────────
    if   payment_history >= 85: positive_factors.append(f"Excellent payment history ({payment_history}/100)")
    elif payment_history >= 65: positive_factors.append(f"Good payment history ({payment_history}/100)")
    elif payment_history >= 45: negative_factors.append(f"Average payment history ({payment_history}/100)")
    else:                       negative_factors.append(f"Poor payment history ({payment_history}/100) — indicates unreliability")

    # ── Employment ─────────────────────────────────────────────────────────
    if   employment == "Full-time":    positive_factors.append("Stable full-time employment")
    elif employment == "Self-employed": positive_factors.append("Self-employed — variable income noted")
    elif employment == "Part-time":    negative_factors.append("Part-time employment — income stability concern")
    else:                              negative_factors.append("Unemployed — high repayment risk")

    # ── Loan-to-income ─────────────────────────────────────────────────────
    if   loan_to_income < 0.3: positive_factors.append(f"Loan amount proportionate to income ({loan_to_income*100:.0f}%)")
    elif loan_to_income >= 0.6: negative_factors.append(f"Loan amount large relative to income ({loan_to_income*100:.0f}%)")

    # ── Age ────────────────────────────────────────────────────────────────
    if   age < 22: negative_factors.append(f"Young age ({age}) — limited credit history likely")
    elif age > 60: negative_factors.append(f"Age ({age}) may limit long-term loan options")

    # ── Reasoning narrative ────────────────────────────────────────────────
    ir_cat = interest.get("interest_category", "Moderate")
    ir_val = interest.get("interest_rate", 12.0)

    if prediction == 1:
        reasoning = (
            f"The application was APPROVED with {confidence*100:.1f}% confidence. "
            f"Key strengths: {', '.join(positive_factors[:3]) if positive_factors else 'overall profile meets lending criteria'}. "
            f"Risk tier is {risk['tier']} ({risk['score']}/100). "
            f"A {ir_cat.lower()} interest rate of {ir_val:.2f}% was assigned."
        )
        if negative_factors:
            reasoning += f" Note: {'; '.join(negative_factors[:2])}."
    else:
        reasoning = (
            f"The application was REJECTED with {(1-confidence)*100:.1f}% confidence. "
            f"Primary concerns: {', '.join(negative_factors[:3]) if negative_factors else 'overall profile does not meet lending criteria'}. "
            f"Risk tier is {risk['tier']} ({risk['score']}/100). "
            f"An estimated {ir_cat.lower()} rate of {ir_val:.2f}% would apply if the profile improves."
        )
        if positive_factors:
            reasoning += f" Strengths noted: {'; '.join(positive_factors[:2])}."

    # ── General improvement suggestions ────────────────────────────────────
    suggestions = []
    if credit_score < 670:
        suggestions.append("Improve credit score by paying bills on time and reducing credit card balances.")
    if missed_emis > 0:
        suggestions.append(f"Eliminate {missed_emis} missed EMI(s) — set up auto-pay to avoid future misses.")
    if debt_to_income > 0.40:
        suggestions.append("Reduce existing debts to lower your debt-to-income ratio below 40%.")
    if income < 40_000:
        suggestions.append("Consider increasing income through additional employment or salary negotiation.")
    if payment_history < 65:
        suggestions.append("Build a consistent on-time payment record over the next 6–12 months.")
    if employment in ("Unemployed", "Part-time"):
        suggestions.append("Secure full-time or stable employment to strengthen your application.")
    if loan_to_income > 0.5:
        suggestions.append("Consider reducing the loan amount to a level more proportionate to your income.")
    if not suggestions:
        suggestions.append("Maintain your current strong financial profile to ensure continued eligibility.")
        suggestions.append("Your profile qualifies for premium rates — consider applying for a larger amount.")

    return {
        "reasoning":         reasoning,
        "positive_factors":  positive_factors,
        "negative_factors":  negative_factors,
        "suggestions":       suggestions,
        "interest_suggestions": _build_interest_suggestions(applicant, ir_val),
    }


# ════════════════════════════════════════════════════════════════════════════
# MAIN PREDICT FUNCTION
# ════════════════════════════════════════════════════════════════════════════

def predict(applicant_data: dict) -> dict:
    """
    Run end-to-end prediction for a single applicant.

    Parameters
    ----------
    applicant_data : dict
        Must include all FEATURE_COLS keys. `missed_emis` is optional (defaults to 0).

    Returns
    -------
    dict with full prediction result including interest rate.
    """
    # ── Approval classification ───────────────────────────────────────────
    pipeline = load_model()

    features = pd.DataFrame(
        [[float(applicant_data.get(col, 0)) for col in FEATURE_COLS]],
        columns=FEATURE_COLS
    )

    prediction    = int(pipeline.predict(features)[0])
    proba         = pipeline.predict_proba(features)[0]
    prob_approved = float(proba[1])
    confidence    = prob_approved if prediction == 1 else float(proba[0])

    # ── Risk score ────────────────────────────────────────────────────────
    risk = compute_risk_score(prob_approved, applicant_data)

    # ── Interest rate prediction ──────────────────────────────────────────
    interest = predict_interest_rate(applicant_data)

    # ── Analysis report ───────────────────────────────────────────────────
    report = generate_report(applicant_data, prediction, confidence, risk, interest)

    # ── Feature importance (load from disk if available) ──────────────────
    fi = {}
    if os.path.exists(FI_PATH):
        with open(FI_PATH) as f:
            fi = json.load(f)

    return {
        # Approval
        "prediction":           prediction,
        "status":               "Approved" if prediction == 1 else "Rejected",
        "confidence":           round(confidence * 100, 1),
        "prob_approved":        round(prob_approved * 100, 1),

        # Risk
        "risk_score":           risk["score"],
        "risk_tier":            risk["tier"],

        # Interest Rate
        "interest_rate":        interest["interest_rate"],
        "interest_category":    interest["interest_category"],
        "interest_explanation": interest["interest_explanation"],

        # Report
        "reasoning":            report["reasoning"],
        "positive_factors":     report["positive_factors"],
        "negative_factors":     report["negative_factors"],
        "suggestions":          report["suggestions"],
        "interest_suggestions": report["interest_suggestions"],

        # Feature importance
        "feature_importance":   fi,
    }
