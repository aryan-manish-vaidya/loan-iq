"""
Synthetic Loan Dataset Generator — Enhanced
--------------------------------------------
Generates realistic loan applicant data including:
  - Standard features (age, income, credit score, etc.)
  - CIBIL / credit score (300–850 FICO range)
  - Payment history score (0–100)
  - Missed EMIs (0–12, correlated with payment history)
  - Debt-to-income ratio (derived)

Targets:
  - loan_approved    : binary classification (0/1)
  - interest_rate    : regression (6%–20%)
"""

import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
import os


def generate_loan_dataset(n_samples: int = 5000, random_state: int = 42) -> pd.DataFrame:
    """
    Generate a synthetic loan dataset with realistic, correlated features.
    Both classification and regression targets are included.
    """
    np.random.seed(random_state)

    # ── Age: 18–70, bell-curve centred at 38 ─────────────────────────────
    age = np.random.normal(38, 10, n_samples).clip(18, 70).astype(int)

    # ── Annual Income: $15k–$250k, log-normal ─────────────────────────────
    income = np.random.lognormal(mean=11.0, sigma=0.6, size=n_samples).clip(15_000, 250_000)

    # ── Employment: 0=Unemployed 1=Part-time 2=Self-employed 3=Full-time ──
    employment_status = np.random.choice(
        [0, 1, 2, 3], size=n_samples, p=[0.08, 0.12, 0.20, 0.60]
    )

    # ── Credit Score / CIBIL: 300–850 ─────────────────────────────────────
    credit_score = np.random.normal(650, 80, n_samples).clip(300, 850).astype(int)

    # ── Loan Amount: $1k–$100k, log-normal ───────────────────────────────
    loan_amount = np.random.lognormal(mean=10.0, sigma=0.8, size=n_samples).clip(1_000, 100_000)

    # ── Loan Term (months) ────────────────────────────────────────────────
    loan_term = np.random.choice(
        [12, 24, 36, 48, 60, 72, 84, 120], size=n_samples,
        p=[0.05, 0.10, 0.30, 0.20, 0.20, 0.07, 0.05, 0.03]
    )

    # ── Existing Debts: $0–$80k ───────────────────────────────────────────
    existing_debts = np.random.lognormal(mean=9.0, sigma=1.0, size=n_samples).clip(0, 80_000)

    # ── Payment History Score: 0–100 (higher = better) ────────────────────
    payment_history = np.random.normal(70, 18, n_samples).clip(0, 100).astype(int)

    # ── Missed EMIs: 0–12 (Poisson, correlated with payment history) ──────
    # Poor payment history → higher expected number of missed EMIs
    emi_lambda = np.clip((1 - payment_history / 100) * 4, 0.01, 10)
    missed_emis = np.clip(
        np.random.poisson(lam=emi_lambda, size=n_samples), 0, 12
    ).astype(int)

    # ── Derived ratios ────────────────────────────────────────────────────
    debt_to_income = existing_debts / (income + 1)
    loan_to_income = loan_amount    / (income + 1)

    # ═══════════════════════════════════════════════════════════════════════
    # TARGET 1: Loan Approval (classification)
    # ═══════════════════════════════════════════════════════════════════════
    approval_score = (
          0.30 * (credit_score / 850)
        + 0.25 * (1 - debt_to_income.clip(0, 1))
        + 0.20 * (payment_history / 100)
        + 0.15 * (employment_status / 3)
        + 0.10 * (1 - loan_to_income.clip(0, 1))
        - 0.08 * (missed_emis / 12)         # missed EMIs reduce approval probability
    )
    approval_score += np.random.normal(0, 0.05, n_samples)
    approval_score = approval_score.clip(0, 1)
    loan_approved = (approval_score > 0.72).astype(int)   # ~60% approval rate

    # ═══════════════════════════════════════════════════════════════════════
    # TARGET 2: Interest Rate % (regression, range 6%–20%)
    # ═══════════════════════════════════════════════════════════════════════
    # Logic: better credit/history → lower rate; more debt/missed EMIs → higher rate
    interest_rate = (
          8.0                                           # base prime rate
        + (1 - (credit_score - 300) / 550) * 8.0       # credit quality:   0%–+8.0%
        + missed_emis * 0.6                             # missed EMIs:      0%–+7.2%
        + (1 - payment_history / 100) * 4.0            # payment history:  0%–+4.0%
        + debt_to_income.clip(0, 1) * 3.0              # debt-to-income:   0%–+3.0%
        - (employment_status / 3) * 2.0                # employment bonus: 0%– -2.0%
        + loan_to_income.clip(0, 1) * 1.5              # loan-to-income:   0%–+1.5%
        + np.random.normal(0, 0.6, n_samples)          # realistic noise
    ).clip(6.0, 20.0)

    df = pd.DataFrame({
        "age":               age,
        "income":            income.round(2),
        "employment_status": employment_status,
        "credit_score":      credit_score,
        "loan_amount":       loan_amount.round(2),
        "loan_term":         loan_term,
        "existing_debts":    existing_debts.round(2),
        "payment_history":   payment_history,
        "missed_emis":       missed_emis,           # new feature
        "loan_approved":     loan_approved,
        "interest_rate":     interest_rate.round(2), # new target
    })

    return df


def save_dataset(df: pd.DataFrame, output_dir: str = None) -> tuple:
    """Save the dataset to CSV files (train/test split, plus full dataset)."""
    if output_dir is None:
        output_dir = os.path.dirname(os.path.abspath(__file__))

    train_df, test_df = train_test_split(
        df, test_size=0.2, random_state=42, stratify=df["loan_approved"]
    )

    train_path = os.path.join(output_dir, "train_data.csv")
    test_path  = os.path.join(output_dir, "test_data.csv")
    full_path  = os.path.join(output_dir, "loan_data.csv")

    train_df.to_csv(train_path, index=False)
    test_df.to_csv(test_path,   index=False)
    df.to_csv(full_path,        index=False)

    print(f"[DataGen] Dataset saved   → {full_path}")
    print(f"[DataGen] Train samples   → {len(train_df)}  ({train_df['loan_approved'].mean()*100:.1f}% approved)")
    print(f"[DataGen] Test  samples   → {len(test_df)}   ({test_df['loan_approved'].mean()*100:.1f}% approved)")
    print(f"[DataGen] Interest rate   → avg {df['interest_rate'].mean():.2f}%  "
          f"range {df['interest_rate'].min():.2f}%–{df['interest_rate'].max():.2f}%")

    return train_path, test_path


if __name__ == "__main__":
    df = generate_loan_dataset(n_samples=5000)
    save_dataset(df)
    print("\nSample rows:")
    print(df[["credit_score", "payment_history", "missed_emis", "interest_rate", "loan_approved"]].head(10))
    print(df.describe())
