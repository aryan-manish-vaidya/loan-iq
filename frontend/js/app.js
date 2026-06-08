/**
 * LoanIQ — Frontend Application
 * Features: prediction, currency conversion, dark/light theme, analytics.
 */

const API_BASE = "http://localhost:5001/api";

// Declare session state here — before ANY function that references them
// (avoids temporal dead zone crash when applyTheme() is called at boot)
let sessionHistory  = [];
let analyticsCharts = {};

// ════════════════════════════════════════════════════════════════════════════
// DEMO APPLICANT PROFILES  (10 IDs for demo / testing)
// ════════════════════════════════════════════════════════════════════════════
const DEMO_PROFILES = {
  "LIQ-001": {
    name: "Sarah Johnson",      age: 32, employment_status: 3, income: 78000,
    credit_score: 742, payment_history: 88, missed_emis: 0,
    existing_debts: 12000, member_since: "Mar 2019",
    debt_breakdown: [{ label: "Credit Card", amount: 4200 }, { label: "Car Loan", amount: 7800 }],
    payment_log: ["P","P","P","P","P","P","P","P","P","P","P","P"],
  },
  "LIQ-002": {
    name: "Marcus Williams",    age: 45, employment_status: 2, income: 95000,
    credit_score: 680, payment_history: 71, missed_emis: 2,
    existing_debts: 28000, member_since: "Jul 2017",
    debt_breakdown: [{ label: "Home Equity", amount: 18500 }, { label: "Credit Card", amount: 6200 }, { label: "Personal Loan", amount: 3300 }],
    payment_log: ["P","P","M","P","P","L","P","M","P","P","P","P"],
  },
  "LIQ-003": {
    name: "Priya Sharma",       age: 28, employment_status: 3, income: 52000,
    credit_score: 598, payment_history: 55, missed_emis: 4,
    existing_debts: 18000, member_since: "Nov 2021",
    debt_breakdown: [{ label: "Student Loan", amount: 12000 }, { label: "Credit Card", amount: 6000 }],
    payment_log: ["L","M","P","M","P","P","M","L","P","M","P","P"],
  },
  "LIQ-004": {
    name: "Daniel Chen",        age: 38, employment_status: 3, income: 115000,
    credit_score: 805, payment_history: 95, missed_emis: 0,
    existing_debts: 5000, member_since: "Jan 2016",
    debt_breakdown: [{ label: "Credit Card", amount: 5000 }],
    payment_log: ["P","P","P","P","P","P","P","P","P","P","P","P"],
  },
  "LIQ-005": {
    name: "Maria Rodriguez",    age: 41, employment_status: 1, income: 38000,
    credit_score: 635, payment_history: 62, missed_emis: 3,
    existing_debts: 22000, member_since: "Jun 2018",
    debt_breakdown: [{ label: "Car Loan", amount: 14500 }, { label: "Credit Card", amount: 7500 }],
    payment_log: ["P","M","P","P","L","M","P","P","P","M","L","P"],
  },
  "LIQ-006": {
    name: "James O'Brien",      age: 54, employment_status: 3, income: 88000,
    credit_score: 725, payment_history: 82, missed_emis: 1,
    existing_debts: 35000, member_since: "Sep 2014",
    debt_breakdown: [{ label: "Mortgage", amount: 28000 }, { label: "Car Loan", amount: 5200 }, { label: "Credit Card", amount: 1800 }],
    payment_log: ["P","P","P","P","L","P","P","P","P","P","P","M"],
  },
  "LIQ-007": {
    name: "Aisha Patel",        age: 26, employment_status: 0, income: 18000,
    credit_score: 520, payment_history: 38, missed_emis: 7,
    existing_debts: 8000, member_since: "Feb 2023",
    debt_breakdown: [{ label: "Credit Card", amount: 5500 }, { label: "Payday Loan", amount: 2500 }],
    payment_log: ["M","M","P","M","L","M","P","M","L","P","M","M"],
  },
  "LIQ-008": {
    name: "Robert Kim",         age: 49, employment_status: 3, income: 145000,
    credit_score: 820, payment_history: 97, missed_emis: 0,
    existing_debts: 15000, member_since: "Apr 2012",
    debt_breakdown: [{ label: "Investment Loan", amount: 10000 }, { label: "Credit Card", amount: 5000 }],
    payment_log: ["P","P","P","P","P","P","P","P","P","P","P","P"],
  },
  "LIQ-009": {
    name: "Lisa Thompson",      age: 35, employment_status: 2, income: 62000,
    credit_score: 660, payment_history: 68, missed_emis: 3,
    existing_debts: 31000, member_since: "Oct 2019",
    debt_breakdown: [{ label: "Business Loan", amount: 18000 }, { label: "Car Loan", amount: 8200 }, { label: "Credit Card", amount: 4800 }],
    payment_log: ["P","L","P","M","P","P","L","P","P","M","P","P"],
  },
  "LIQ-010": {
    name: "Carlos Mendez",      age: 43, employment_status: 3, income: 71000,
    credit_score: 710, payment_history: 78, missed_emis: 1,
    existing_debts: 20000, member_since: "Aug 2016",
    debt_breakdown: [{ label: "Home Equity", amount: 12500 }, { label: "Car Loan", amount: 6000 }, { label: "Credit Card", amount: 1500 }],
    payment_log: ["P","P","P","P","P","L","P","P","P","P","M","P"],
  },
};

// Track the currently loaded profile (for currency re-render)
let currentLoadedProfileId = null;

// ════════════════════════════════════════════════════════════════════════════
// CURRENCY SYSTEM
// ════════════════════════════════════════════════════════════════════════════
const CURRENCIES = {
  USD: { symbol: "$",    name: "US Dollar",          rate: 1,       flag: "🇺🇸" },
  EUR: { symbol: "€",    name: "Euro",               rate: 0.921,   flag: "🇪🇺" },
  GBP: { symbol: "£",    name: "British Pound",      rate: 0.787,   flag: "🇬🇧" },
  JPY: { symbol: "¥",    name: "Japanese Yen",       rate: 149.8,   flag: "🇯🇵" },
  CAD: { symbol: "C$",   name: "Canadian Dollar",    rate: 1.363,   flag: "🇨🇦" },
  AUD: { symbol: "A$",   name: "Australian Dollar",  rate: 1.531,   flag: "🇦🇺" },
  CHF: { symbol: "Fr",   name: "Swiss Franc",        rate: 0.899,   flag: "🇨🇭" },
  INR: { symbol: "₹",    name: "Indian Rupee",       rate: 83.2,    flag: "🇮🇳" },
  AED: { symbol: "د.إ",  name: "UAE Dirham",         rate: 3.673,   flag: "🇦🇪" },
  CNY: { symbol: "¥",    name: "Chinese Yuan",       rate: 7.241,   flag: "🇨🇳" },
  SGD: { symbol: "S$",   name: "Singapore Dollar",   rate: 1.341,   flag: "🇸🇬" },
  MXN: { symbol: "MX$",  name: "Mexican Peso",       rate: 17.12,   flag: "🇲🇽" },
  BRL: { symbol: "R$",   name: "Brazilian Real",     rate: 4.971,   flag: "🇧🇷" },
  ZAR: { symbol: "R",    name: "South African Rand", rate: 18.62,   flag: "🇿🇦" },
};

let currentCurrency = "USD";

// Convert a USD value to the currently selected currency
function toDisplay(usdVal)   { return usdVal  * CURRENCIES[currentCurrency].rate; }
// Convert a displayed value back to USD for the API
function toUSD(displayVal)   { return displayVal / CURRENCIES[currentCurrency].rate; }

function currencySymbol() { return CURRENCIES[currentCurrency].symbol; }

// Format a USD amount for display in the current currency
function fmtMoney(usdVal) {
  const val = toDisplay(usdVal);
  const sym = currencySymbol();
  if (val >= 1_000_000) return `${sym}${(val/1_000_000).toFixed(2)}M`;
  if (val >= 1_000)     return `${sym}${Math.round(val).toLocaleString()}`;
  return `${sym}${val.toFixed(2)}`;
}

// When currency changes, re-label fields and convert existing values
function applyCurrencyChange(newCode, prevCode) {
  const prev = CURRENCIES[prevCode];
  const next = CURRENCIES[newCode];

  // Money input IDs and their label/prefix IDs
  const moneyFields = [
    { input: "income",          prefix: "incomePrefix", label: "incomeLabel",  base: "Annual Income" },
    { input: "existing_debts",  prefix: "debtPrefix",   label: "debtLabel",    base: "Existing Debts" },
    { input: "loan_amount",     prefix: "loanPrefix",   label: "loanLabel",    base: "Loan Amount" },
  ];

  moneyFields.forEach(({ input, prefix, label, base }) => {
    const el = document.getElementById(input);
    // Use !== '' so that 0 is still converted (not treated as falsy)
    if (el && el.value !== '') {
      const usdVal = parseFloat(el.value) / prev.rate;
      el.value = Math.round(usdVal * next.rate);
    }
    const lbl = document.getElementById(label);
    if (lbl) lbl.textContent = `${base} (${newCode})`;
    const pfx = document.getElementById(prefix);
    if (pfx) pfx.textContent = next.symbol;
  });

  // Update currency flag
  document.getElementById("currencyFlag").textContent = next.flag;

  currentCurrency = newCode;

  // Re-render profile card debt amounts in new currency
  if (currentLoadedProfileId) {
    renderProfileCard(currentLoadedProfileId, DEMO_PROFILES[currentLoadedProfileId]);
  }
}

// ════════════════════════════════════════════════════════════════════════════
// THEME SYSTEM
// ════════════════════════════════════════════════════════════════════════════
let currentTheme = localStorage.getItem("loaniq_theme") || "dark";

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  const icon = document.getElementById("themeIcon");
  icon.textContent = theme === "dark" ? "☀️" : "🌙";
  localStorage.setItem("loaniq_theme", theme);
  currentTheme = theme;

  // Re-render analytics charts if any exist (so axis/grid colors update)
  if (sessionHistory.length > 0) updateAnalyticsCharts();
}

document.getElementById("themeToggle").addEventListener("click", () => {
  applyTheme(currentTheme === "dark" ? "light" : "dark");
});

// Apply saved theme on load
applyTheme(currentTheme);

// ════════════════════════════════════════════════════════════════════════════
// PAGE NAVIGATION  (smooth exit → enter animation)
// ════════════════════════════════════════════════════════════════════════════
let _currentPage = "predict";

function switchPage(name) {
  if (name === _currentPage) return;

  const pageId = `page${name.charAt(0).toUpperCase() + name.slice(1)}`;
  const nextEl  = document.getElementById(pageId);
  if (!nextEl) return;

  // ── Exit current page ──────────────────────────────────────────────────
  const prevEl = document.querySelector(".page.active");
  if (prevEl) {
    prevEl.style.animation = "pageExit 0.18s ease forwards";
    prevEl.style.pointerEvents = "none";
    setTimeout(() => {
      prevEl.classList.remove("active");
      prevEl.style.animation    = "";
      prevEl.style.pointerEvents = "";
    }, 180);
  }

  // ── Enter new page after exit finishes ─────────────────────────────────
  setTimeout(() => {
    // Update nav tabs
    document.querySelectorAll(".nav-tab").forEach(t => t.classList.remove("active"));
    document.querySelector(`.nav-tab[data-page="${name}"]`).classList.add("active");

    // Show + animate the page in
    nextEl.classList.add("active");
    nextEl.classList.remove("page-enter");
    void nextEl.offsetWidth; // force reflow so animation re-triggers
    nextEl.classList.add("page-enter");

    // After enter animation, remove the enter class
    const onEnd = () => { nextEl.classList.remove("page-enter"); nextEl.removeEventListener("animationend", onEnd); };
    nextEl.addEventListener("animationend", onEnd);

    // Trigger page-specific rendering inside a RAF so the page is painted first
    requestAnimationFrame(() => {
      if (name === "analytics") renderAnalyticsPage();
      if (name === "model")     renderModelPage();
    });
  }, 160);

  _currentPage = name;
}

document.querySelectorAll(".nav-tab").forEach(tab => {
  tab.addEventListener("click", () => switchPage(tab.dataset.page));
});

// (Sliders removed — credit_score, payment_history, missed_emis are now
//  hidden inputs auto-populated via the ID lookup system.)

// ════════════════════════════════════════════════════════════════════════════
// CURRENCY SELECT
// ════════════════════════════════════════════════════════════════════════════
document.getElementById("currencySelect").addEventListener("change", function () {
  const newCode  = this.value;
  const prevCode = currentCurrency;
  if (newCode !== prevCode) applyCurrencyChange(newCode, prevCode);
});

// ════════════════════════════════════════════════════════════════════════════
// ID LOOKUP
// ════════════════════════════════════════════════════════════════════════════
const MONTH_ABBR = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function lookupApplicant(id) {
  const cleaned = id.trim().toUpperCase();
  const profile  = DEMO_PROFILES[cleaned];

  if (!profile) {
    showToast(`ID "${cleaned}" not found. Try LIQ-001 through LIQ-010.`, "error");
    return;
  }

  renderProfileCard(cleaned, profile);

  // Auto-fill form fields
  const r = CURRENCIES[currentCurrency].rate;
  document.getElementById("applicant_name").value      = profile.name;
  document.getElementById("age").value                 = profile.age;
  document.getElementById("employment_status").value   = profile.employment_status;
  document.getElementById("income").value              = Math.round(profile.income * r);
  document.getElementById("existing_debts").value      = Math.round(profile.existing_debts * r);

  // Hidden ML inputs
  document.getElementById("credit_score").value    = profile.credit_score;
  document.getElementById("payment_history").value = profile.payment_history;
  document.getElementById("missed_emis").value     = profile.missed_emis;

  // Show profile info strip
  const strip = document.getElementById("profileInfoStrip");
  strip.style.display = "";
  document.getElementById("piCreditScore").textContent = profile.credit_score;
  const phColor = profile.payment_history >= 80 ? "var(--green)" : profile.payment_history >= 60 ? "var(--yellow)" : "var(--red)";
  document.getElementById("piPayHistory").textContent  = profile.payment_history + "%";
  document.getElementById("piPayHistory").style.color  = phColor;
  const meColor = profile.missed_emis === 0 ? "var(--green)" : profile.missed_emis <= 3 ? "var(--yellow)" : "var(--red)";
  document.getElementById("piMissedEmis").textContent  = profile.missed_emis;
  document.getElementById("piMissedEmis").style.color  = meColor;

  // Highlight active demo chip
  document.querySelectorAll(".id-chip").forEach(c =>
    c.classList.toggle("active", c.dataset.id === cleaned)
  );

  currentLoadedProfileId = cleaned;
  showToast(`Profile loaded: ${profile.name} (${cleaned})`, "success");
}

function renderProfileCard(id, profile) {
  const initials   = profile.name.split(" ").map(n => n[0]).join("").slice(0, 2);
  const ficoColor  = profile.credit_score >= 750 ? "#22c55e"
                   : profile.credit_score >= 670 ? "#3b82f6"
                   : profile.credit_score >= 580 ? "#f59e0b" : "#ef4444";
  const ficoLabel  = profile.credit_score >= 750 ? "Excellent"
                   : profile.credit_score >= 670 ? "Good"
                   : profile.credit_score >= 580 ? "Fair" : "Poor";

  // Build month labels for the last 12 months (oldest → newest)
  const now = new Date();
  const monthLabels = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthLabels.push(MONTH_ABBR[d.getMonth()]);
  }

  // payment_log[0] = most recent month — reverse so index 0 = oldest for display
  const logDisplay = [...profile.payment_log].reverse();
  const payDots = logDisplay.map((status, i) => {
    const col  = status === "P" ? "#22c55e" : status === "L" ? "#f59e0b" : "#ef4444";
    const tip  = `${monthLabels[i]}: ${status === "P" ? "Paid" : status === "L" ? "Late" : "Missed"}`;
    return `<div class="pay-dot-wrap" title="${tip}">
      <div class="pay-dot" style="background:${col}"></div>
      <div class="pay-dot-month">${monthLabels[i].slice(0,1)}</div>
    </div>`;
  }).join("");

  const r   = CURRENCIES[currentCurrency].rate;
  const sym = currencySymbol();
  const debtRows = profile.debt_breakdown.map(d =>
    `<div class="id-debt-row">
      <span class="id-debt-label">${d.label}</span>
      <span class="id-debt-val">${sym}${Math.round(d.amount * r).toLocaleString()}</span>
    </div>`
  ).join("");

  const card = document.getElementById("idProfileCard");
  card.innerHTML = `
    <div class="id-profile-inner">

      <!-- Row 1: identity + FICO -->
      <div class="id-profile-head">
        <div class="id-avatar" style="background:${ficoColor}1a;color:${ficoColor};border-color:${ficoColor}50">${initials}</div>
        <div class="id-head-info">
          <div class="id-profile-name">${profile.name}</div>
          <div class="id-profile-meta">
            <span class="id-badge">${id}</span>
            <span class="id-meta-sep">·</span>
            <span>Since ${profile.member_since}</span>
          </div>
        </div>
        <div class="id-fico-badge">
          <span class="id-fico-score" style="color:${ficoColor}">${profile.credit_score}</span>
          <span class="id-fico-label" style="color:${ficoColor}">${ficoLabel}</span>
          <span class="id-fico-sub">FICO Score</span>
        </div>
      </div>

      <!-- Row 2: 12-month payment history -->
      <div class="id-profile-history">
        <div class="id-section-header">📅 Payment History — Last 12 Months</div>
        <div class="pay-grid">${payDots}</div>
        <div class="pay-legend">
          <span class="pay-leg-item"><span class="pay-leg-dot" style="background:#22c55e"></span>Paid</span>
          <span class="pay-leg-item"><span class="pay-leg-dot" style="background:#f59e0b"></span>Late</span>
          <span class="pay-leg-item"><span class="pay-leg-dot" style="background:#ef4444"></span>Missed</span>
          <span class="pay-leg-stat">${profile.missed_emis} missed · ${profile.payment_history}% on-time</span>
        </div>
      </div>

      <!-- Row 3: debt breakdown -->
      <div class="id-profile-debts">
        <div class="id-section-header">💳 Outstanding Debts</div>
        ${debtRows}
        <div class="id-debt-total">
          <span>Total Outstanding</span>
          <span>${sym}${Math.round(profile.existing_debts * r).toLocaleString()}</span>
        </div>
      </div>

    </div>`;
  card.style.display = "";
}

function clearProfileCard() {
  document.getElementById("idProfileCard").style.display = "none";
  document.getElementById("idProfileCard").innerHTML = "";
  document.getElementById("profileInfoStrip").style.display = "none";
  document.getElementById("applicantIdInput").value = "";
  document.querySelectorAll(".id-chip").forEach(c => c.classList.remove("active"));
  currentLoadedProfileId = null;
}

// Wire up lookup button and Enter key
document.getElementById("lookupBtn").addEventListener("click", () => {
  lookupApplicant(document.getElementById("applicantIdInput").value);
});
document.getElementById("applicantIdInput").addEventListener("keydown", e => {
  if (e.key === "Enter") { e.preventDefault(); lookupApplicant(e.target.value); }
});
document.querySelectorAll(".id-chip").forEach(chip => {
  chip.addEventListener("click", () => {
    document.getElementById("applicantIdInput").value = chip.dataset.id;
    lookupApplicant(chip.dataset.id);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// RESET BUTTON
// ════════════════════════════════════════════════════════════════════════════
document.getElementById("resetBtn").addEventListener("click", () => {
  document.getElementById("loanForm").reset();
  document.getElementById("applicant_name").value = "";

  // Restore money defaults in selected currency
  const r = CURRENCIES[currentCurrency].rate;
  document.getElementById("income").value         = Math.round(65000 * r);
  document.getElementById("existing_debts").value = Math.round(8000  * r);
  document.getElementById("loan_amount").value    = Math.round(25000 * r);

  // Reset hidden ML fields to sensible defaults
  document.getElementById("credit_score").value    = "720";
  document.getElementById("payment_history").value = "75";
  document.getElementById("missed_emis").value     = "0";

  // Clear profile card + strip
  clearProfileCard();
});

// ════════════════════════════════════════════════════════════════════════════
// FORM SUBMISSION
// ════════════════════════════════════════════════════════════════════════════
document.getElementById("loanForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  await runPrediction();
});

async function runPrediction() {
  const btn = document.getElementById("predictBtn");
  btn.disabled = true;
  showLoading();

  // Read displayed values then convert money fields back to USD
  const r = CURRENCIES[currentCurrency].rate;
  const payload = {
    age:               +document.getElementById("age").value,
    income:            +(+document.getElementById("income").value         / r).toFixed(2),
    employment_status: +document.getElementById("employment_status").value,
    credit_score:      +document.getElementById("credit_score").value,
    loan_amount:       +(+document.getElementById("loan_amount").value    / r).toFixed(2),
    loan_term:         +document.getElementById("loan_term").value,
    existing_debts:    +(+document.getElementById("existing_debts").value / r).toFixed(2),
    payment_history:   +document.getElementById("payment_history").value,
    missed_emis:       +document.getElementById("missed_emis").value,
  };

  try {
    const result = await callAPI("/predict", "POST", payload);
    hideLoading();
    renderResults(result, payload);
    addToHistory(result, payload);
  } catch (err) {
    hideLoading();
    showToast(err.message || "Prediction failed — is the backend running?", "error");
  } finally {
    btn.disabled = false;
  }
}

// ════════════════════════════════════════════════════════════════════════════
// API
// ════════════════════════════════════════════════════════════════════════════
async function callAPI(endpoint, method = "GET", body = null) {
  const opts = { method, headers: { "Content-Type": "application/json" } };
  if (body) opts.body = JSON.stringify(body);
  const res  = await fetch(API_BASE + endpoint, opts);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

// ════════════════════════════════════════════════════════════════════════════
// LOADING
// ════════════════════════════════════════════════════════════════════════════
const STEPS = [
  { icon: "🔍", text: "Validating applicant data…" },
  { icon: "⚙️", text: "Running approval ML model…" },
  { icon: "💰", text: "Predicting interest rate…" },
  { icon: "📊", text: "Computing risk score…" },
  { icon: "📝", text: "Generating analysis report…" },
];

function showLoading() {
  const container = document.getElementById("loadingSteps");
  container.innerHTML = STEPS.map((s, i) =>
    `<div class="loader-step" id="ls${i}"><span>${s.icon}</span><span>${s.text}</span></div>`
  ).join("");
  document.getElementById("loadingOverlay").classList.add("active");
  STEPS.forEach((_, i) => setTimeout(() => document.getElementById(`ls${i}`)?.classList.add("visible"), i * 380));
}

function hideLoading() {
  document.getElementById("loadingOverlay").classList.remove("active");
}

// ════════════════════════════════════════════════════════════════════════════
// RENDER RESULTS
// ════════════════════════════════════════════════════════════════════════════
function renderResults(result, payload) {
  document.getElementById("placeholder").style.display = "none";

  const isApproved = result.prediction === 1;
  const tier       = result.risk_tier.toLowerCase();

  // ── 1. Verdict card ────────────────────────────────────────────────────
  const vc = document.getElementById("verdictCard");
  vc.style.display = "";
  vc.className = `verdict-card ${isApproved ? "approved" : "rejected"}`;
  vc.innerHTML = `
    <div class="verdict-left">
      <div class="verdict-icon">${isApproved ? "✅" : "❌"}</div>
      <div>
        <div class="verdict-label">${isApproved ? "APPROVED" : "REJECTED"}</div>
        <div class="verdict-sub">AI Credit Decision · ${new Date().toLocaleTimeString()}</div>
      </div>
    </div>
    <div class="verdict-right">
      <div class="confidence-num">${result.confidence}%</div>
      <div class="confidence-lbl">Model Confidence</div>
    </div>`;

  // ── 2. Stats row (4 cards) ───────────────────────────────────────────────
  const irCat    = (result.interest_category || "Moderate").toLowerCase();
  const irColor  = { low: "var(--green)", moderate: "var(--yellow)", high: "var(--red)" }[irCat] || "var(--yellow)";

  const sr = document.getElementById("statsRow");
  sr.style.display = "";
  sr.className = "stats-row";
  sr.innerHTML = `
    <div class="stat-card">
      <div class="stat-lbl">Risk Score</div>
      <div class="stat-val c-${tier}">${result.risk_score}<span style="font-size:.95rem">/100</span></div>
      <div class="stat-sub c-${tier}">${result.risk_tier} Risk</div>
      <div class="prog-wrap"><div class="prog-bar ${tier}" style="width:${result.risk_score}%"></div></div>
    </div>
    <div class="stat-card">
      <div class="stat-lbl">Approval Probability</div>
      <div class="stat-val">${result.prob_approved}%</div>
      <div class="stat-sub">ML approval likelihood</div>
      <div class="prog-wrap"><div class="prog-bar accent" style="width:${result.prob_approved}%"></div></div>
    </div>
    <div class="stat-card">
      <div class="stat-lbl">Decision Strength</div>
      <div class="stat-val">${decisionLabel(result.confidence)}</div>
      <div class="stat-sub">${result.confidence >= 85 ? "High certainty" : result.confidence >= 70 ? "Good certainty" : "Borderline"}</div>
    </div>
    <div class="stat-card">
      <div class="stat-lbl">Interest Rate</div>
      <div class="stat-val" style="color:${irColor}">${result.interest_rate ?? "—"}<span style="font-size:.95rem">%</span></div>
      <div class="stat-sub" style="color:${irColor}">${result.interest_category ?? "—"} Rate</div>
      <div class="prog-wrap"><div class="prog-bar ${irCat === 'moderate' ? 'medium' : irCat}" style="width:${irRateToPercent(result.interest_rate)}%"></div></div>
    </div>`;

  // ── 2b. Interest Rate Card ───────────────────────────────────────────────
  const ic = document.getElementById("interestCard");
  ic.style.display = "";
  ic.className = `interest-card ir-${irCat}`;
  const irBarPct = irRateToPercent(result.interest_rate);
  ic.innerHTML = `
    <div class="ir-label-group">
      <div class="ir-icon">${irCat === "low" ? "✅" : irCat === "moderate" ? "⚠️" : "🔴"}</div>
      <div class="ir-title">Predicted Interest Rate</div>
      <div class="ir-value ir-${irCat}">${result.interest_rate ?? "—"}%</div>
      <span class="ir-badge ir-${irCat}">${result.interest_category ?? "—"} Rate</span>
    </div>
    <div class="ir-bar-group">
      <div class="ir-bar-label">Rate on scale: 6% (best) → 20% (highest)</div>
      <div class="ir-bar-track"><div class="ir-bar-fill ir-${irCat}" style="width:${irBarPct}%"></div></div>
      <div class="ir-bar-ticks"><span>6% Low</span><span>10%</span><span>15%</span><span>20% High</span></div>
    </div>
    <div class="ir-explanation ir-${irCat}">${result.interest_explanation || ""}</div>`;

  // ── 3. Report card ──────────────────────────────────────────────────────
  const rc = document.getElementById("reportCard");
  rc.style.display = "";

  document.getElementById("tabReasoning").innerHTML =
    `<p class="reasoning-box">${result.reasoning}</p>`;

  const pos = (result.positive_factors || []).map(f =>
    `<li class="factor-item pos"><span class="f-icon">✓</span>${f}</li>`).join("")
    || `<li class="factor-item">No positive factors noted.</li>`;
  const neg = (result.negative_factors || []).map(f =>
    `<li class="factor-item neg"><span class="f-icon">✗</span>${f}</li>`).join("")
    || `<li class="factor-item">No risk factors noted.</li>`;

  document.getElementById("tabFactors").innerHTML = `
    <div class="factors-grid">
      <div><div class="factors-group-title">✅ Strengths</div><ul class="factor-list">${pos}</ul></div>
      <div><div class="factors-group-title">⚠️ Risk Factors</div><ul class="factor-list">${neg}</ul></div>
    </div>`;

  const sugg = (result.suggestions || []).map((s, i) =>
    `<li class="suggestion-item"><span class="sug-num">${i+1}</span>${s}</li>`).join("");
  document.getElementById("tabSuggestions").innerHTML =
    `<ul class="suggestion-list">${sugg}</ul>`;

  // Interest Rate tab
  const iSugg = (result.interest_suggestions || []).map((s, i) =>
    `<li class="suggestion-item"><span class="sug-num" style="background:${irColor}">${i+1}</span>${s}</li>`).join("");
  document.getElementById("tabInterestRate").innerHTML = `
    <div style="margin-bottom:14px">
      <p class="reasoning-box" style="border-left-color:${irColor};background:rgba(0,0,0,0.03)">
        <strong style="color:${irColor}">${result.interest_category ?? ""} Rate · ${result.interest_rate ?? "—"}%</strong><br>
        ${result.interest_explanation || ""}
      </p>
    </div>
    <div class="factors-group-title" style="margin-bottom:10px">💡 How to Lower Your Interest Rate</div>
    <ul class="suggestion-list">${iSugg}</ul>`;

  // ── 4. Charts ───────────────────────────────────────────────────────────
  const cs = document.getElementById("chartsSection");
  cs.style.display = "";
  renderPredictionCharts(result, payload);

  // Store irCat/irColor on result for chart access
  result._irCat   = irCat;
  result._irColor = irColor;

  // Smooth-scroll on mobile
  if (window.innerWidth <= 1100) {
    document.getElementById("resultsArea").scrollIntoView({ behavior: "smooth", block: "start" });
  }
  showToast(`${result.status} — ${result.risk_tier} risk · ${result.confidence}% confidence`, isApproved ? "success" : "error");
}

// Tab switching (prediction page)
document.querySelectorAll(".report-tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".report-tab").forEach(t => t.classList.remove("active"));
    document.querySelectorAll(".tab-pane").forEach(p => p.classList.remove("active"));
    tab.classList.add("active");
    document.getElementById(tab.dataset.tab).classList.add("active");
  });
});

// ════════════════════════════════════════════════════════════════════════════
// PREDICTION CHARTS
// ════════════════════════════════════════════════════════════════════════════
let predCharts = {};

function chartColors() {
  return {
    text:   currentTheme === "light" ? "#374151" : "#94a3b8",
    grid:   currentTheme === "light" ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.05)",
    track:  currentTheme === "light" ? "rgba(0,0,0,0.07)"  : "rgba(255,255,255,0.07)",
  };
}

function renderPredictionCharts(result, payload) {
  Object.values(predCharts).forEach(c => c.destroy());
  predCharts = {};
  const cc = chartColors();

  // ── Feature importance (horizontal bar) ──────────────────────────────
  const fi = result.feature_importance || {};
  if (Object.keys(fi).length) {
    const labels_map = {
      credit_score:"Credit Score", income:"Income", payment_history:"Payment History",
      existing_debts:"Existing Debts", loan_amount:"Loan Amount",
      employment_status:"Employment", age:"Age", loan_term:"Loan Term",
    };
    const sorted = Object.entries(fi).sort((a,b) => b[1]-a[1]);
    predCharts.fi = new Chart(document.getElementById("chartFeatureImportance"), {
      type: "bar",
      data: {
        labels: sorted.map(([k]) => labels_map[k] || k),
        datasets: [{ data: sorted.map(([,v]) => +(v*100).toFixed(1)),
          backgroundColor: sorted.map((_,i) => `hsla(${215-i*18},75%,60%,0.72)`),
          borderRadius: 4, borderSkipped: false }],
      },
      options: {
        indexAxis:"y", responsive:true, maintainAspectRatio:false,
        plugins:{ legend:{display:false}, tooltip:{ callbacks:{ label: c=>` ${c.raw}% weight` }}},
        scales:{
          x:{ ticks:{color:cc.text, callback:v=>v+"%"}, grid:{color:cc.grid} },
          y:{ ticks:{color:cc.text}, grid:{display:false} },
        },
      },
    });
  }

  // ── Risk gauge (doughnut with center text) ────────────────────────────
  const rcolor = { low:"#22c55e", medium:"#f59e0b", high:"#ef4444" }[result.risk_tier.toLowerCase()] || "#3b82f6";
  predCharts.gauge = new Chart(document.getElementById("chartRiskGauge"), {
    type: "doughnut",
    data: { datasets:[{ data:[result.risk_score, 100-result.risk_score],
      backgroundColor:[rcolor, cc.track], borderWidth:0, borderRadius:4 }] },
    options: {
      cutout:"74%", responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{display:false}, tooltip:{enabled:false},
        centerText:{ val:`${result.risk_score}`, sub:`${result.risk_tier} Risk`, color:rcolor } },
    },
    plugins:[{
      id:"centerText",
      afterDraw(chart){
        const {width,height,ctx}=chart; ctx.save();
        const o=chart.options.plugins.centerText;
        const cx=width/2, cy=height/2;
        ctx.textAlign="center"; ctx.textBaseline="middle";
        ctx.font=`bold ${Math.floor(height/5.5)}px Inter,sans-serif`;
        ctx.fillStyle=o.color; ctx.fillText(o.val,cx,cy-9);
        ctx.font=`${Math.floor(height/10)}px Inter,sans-serif`;
        ctx.fillStyle=cc.text; ctx.fillText(o.sub,cx,cy+13);
        ctx.restore();
      }
    }],
  });

  // ── Financial radar ───────────────────────────────────────────────────
  const norm = {
    "Credit Score":    ((payload.credit_score-300)/550)*100,
    "Income":          Math.min((payload.income/200000)*100,100),
    "Payment Hist.":   payload.payment_history,
    "Employment":      (payload.employment_status/3)*100,
    "Low Debt":        Math.max(0,100-(payload.existing_debts/80000)*100),
    "Loan Ratio":      Math.max(0,100-(payload.loan_amount/payload.income)*100),
  };
  predCharts.radar = new Chart(document.getElementById("chartProfile"), {
    type:"radar",
    data:{
      labels:Object.keys(norm),
      datasets:[{ label:"Applicant", data:Object.values(norm).map(v=>+v.toFixed(1)),
        backgroundColor:"rgba(59,130,246,0.14)", borderColor:"rgba(59,130,246,0.75)",
        pointBackgroundColor:"#3b82f6", pointBorderColor:currentTheme==="light"?"#fff":"#0c1120",
        pointRadius:4, borderWidth:2 }],
    },
    options:{
      responsive:true, maintainAspectRatio:false,
      scales:{ r:{ min:0,max:100, ticks:{display:false},
        grid:{color:cc.grid}, pointLabels:{color:cc.text,font:{size:11}},
        angleLines:{color:cc.grid} }},
      plugins:{ legend:{display:false} },
    },
  });

  // ── Approval probability doughnut ─────────────────────────────────────
  predCharts.prob = new Chart(document.getElementById("chartProbability"), {
    type:"doughnut",
    data:{
      labels:["Approved","Rejected"],
      datasets:[{ data:[result.prob_approved, +(100-result.prob_approved).toFixed(1)],
        backgroundColor:["rgba(34,197,94,0.75)","rgba(239,68,68,0.65)"],
        borderWidth:0, borderRadius:4, hoverOffset:6 }],
    },
    options:{
      cutout:"62%", responsive:true, maintainAspectRatio:false,
      plugins:{
        legend:{ position:"bottom", labels:{color:cc.text,font:{size:11},padding:14,usePointStyle:true} },
        tooltip:{ callbacks:{ label:c=>` ${c.label}: ${c.raw}%` }},
      },
    },
  });

  // ── Interest Rate gauge (doughnut, scale 6%–20%) ───────────────────────
  const irRate   = result.interest_rate ?? 12;
  const irCat2   = (result.interest_category || "Moderate").toLowerCase();
  const irPalette = { low:"#22c55e", moderate:"#f59e0b", high:"#ef4444" };
  const irCol    = irPalette[irCat2] || "#f59e0b";
  // Normalise rate to 0–100 on the 6–20 scale for the gauge fill
  const irFill   = +((irRate - 6) / 14 * 100).toFixed(1);
  const irEmpty  = +(100 - irFill).toFixed(1);

  predCharts.irGauge = new Chart(document.getElementById("chartInterestGauge"), {
    type:"doughnut",
    data:{ datasets:[{
      data:[irFill, irEmpty],
      backgroundColor:[irCol, cc.track],
      borderWidth:0, borderRadius:4,
    }]},
    options:{
      cutout:"74%", responsive:true, maintainAspectRatio:false,
      plugins:{
        legend:{display:false}, tooltip:{enabled:false},
        centerText:{ val:`${irRate}%`, sub:`${result.interest_category ?? ""} Rate`, color:irCol },
      },
    },
    plugins:[{
      id:"centerText",
      afterDraw(chart){
        const {width,height,ctx}=chart; ctx.save();
        const o=chart.options.plugins.centerText;
        const cx=width/2, cy=height/2;
        ctx.textAlign="center"; ctx.textBaseline="middle";
        ctx.font=`bold ${Math.floor(height/6.5)}px Inter,sans-serif`;
        ctx.fillStyle=o.color; ctx.fillText(o.val,cx,cy-9);
        ctx.font=`${Math.floor(height/11)}px Inter,sans-serif`;
        ctx.fillStyle=cc.text; ctx.fillText(o.sub,cx,cy+12);
        ctx.restore();
      }
    }],
  });

  // ── Interest Rate breakdown bars (component contributions) ────────────
  const income    = payload.income;
  const cs2       = payload.credit_score;
  const ph        = payload.payment_history;
  const me        = payload.missed_emis ?? 0;
  const dti       = payload.existing_debts / Math.max(income, 1);

  // Compute each component (mirrors the formula in generate_data.py)
  const comp = {
    "Credit Score":      +(Math.max(0, (1 - (cs2 - 300) / 550) * 8)).toFixed(2),
    "Missed EMIs":       +(me * 0.6).toFixed(2),
    "Payment History":   +(Math.max(0, (1 - ph / 100) * 4)).toFixed(2),
    "Debt-to-Income":    +(Math.min(dti, 1) * 3).toFixed(2),
    "Loan Size":         +(Math.min(payload.loan_amount / Math.max(income,1), 1) * 1.5).toFixed(2),
  };
  const maxComp = Math.max(...Object.values(comp), 0.01);

  const breakdownEl = document.getElementById("interestRateBreakdown");
  breakdownEl.innerHTML = Object.entries(comp).map(([lbl, val]) => `
    <div class="ir-bk-row">
      <span class="ir-bk-label">${lbl}</span>
      <div class="ir-bk-bar-wrap">
        <div class="ir-bk-bar" style="width:${(val/maxComp*100).toFixed(1)}%;background:${val > 2 ? '#ef4444' : val > 1 ? '#f59e0b' : '#22c55e'}"></div>
      </div>
      <span class="ir-bk-val">+${val}%</span>
    </div>`).join("");
}

// ════════════════════════════════════════════════════════════════════════════
// SESSION HISTORY & ANALYTICS
// ════════════════════════════════════════════════════════════════════════════
// (sessionHistory and analyticsCharts are declared at the top of the file)

function addToHistory(result, payload) {
  sessionHistory.push({
    id:               sessionHistory.length + 1,
    ts:               new Date(),
    status:           result.status,
    confidence:       result.confidence,
    risk_tier:        result.risk_tier,
    risk_score:       result.risk_score,
    prob_approved:    result.prob_approved,
    interest_rate:    result.interest_rate ?? null,
    interest_category: result.interest_category ?? null,
    income:           payload.income,
    loan_amount:      payload.loan_amount,
    credit_score:     payload.credit_score,
    existing_debts:   payload.existing_debts,
  });

  // Update analytics tab badge
  const badge = document.getElementById("predCount");
  badge.textContent = sessionHistory.length;
  badge.style.display = "inline";
}

function renderAnalyticsPage() {
  const empty   = document.getElementById("analyticsEmpty");
  const content = document.getElementById("analyticsContent");

  if (!sessionHistory.length) {
    empty.style.display   = "";
    content.style.display = "none";
    return;
  }
  empty.style.display   = "none";
  content.style.display = "";

  renderAnalyticsStats();
  renderAnalyticsCharts();
  renderHistoryTable();
}

function renderAnalyticsStats() {
  const total      = sessionHistory.length;
  const approved   = sessionHistory.filter(r => r.status === "Approved").length;
  const approvalRate = ((approved/total)*100).toFixed(1);
  const avgRisk    = (sessionHistory.reduce((a,r) => a+r.risk_score, 0)/total).toFixed(1);
  const avgConf    = (sessionHistory.reduce((a,r) => a+r.confidence, 0)/total).toFixed(1);
  const rateData   = sessionHistory.filter(r => r.interest_rate != null);
  const avgRate    = rateData.length
    ? (rateData.reduce((a,r) => a + r.interest_rate, 0) / rateData.length).toFixed(2)
    : "—";
  const rateColor  = avgRate === "—" ? "var(--text-1)"
    : +avgRate < 10 ? "var(--green)" : +avgRate < 15 ? "var(--yellow)" : "var(--red)";

  document.getElementById("analyticsStats").innerHTML = `
    <div class="a-stat">
      <div class="a-stat-icon">📋</div>
      <div class="a-stat-val">${total}</div>
      <div class="a-stat-lbl">Total Predictions</div>
    </div>
    <div class="a-stat">
      <div class="a-stat-icon">✅</div>
      <div class="a-stat-val" style="color:var(--green)">${approvalRate}%</div>
      <div class="a-stat-lbl">Approval Rate</div>
    </div>
    <div class="a-stat">
      <div class="a-stat-icon">⚠️</div>
      <div class="a-stat-val">${avgRisk}/100</div>
      <div class="a-stat-lbl">Avg Risk Score</div>
    </div>
    <div class="a-stat">
      <div class="a-stat-icon">🎯</div>
      <div class="a-stat-val">${avgConf}%</div>
      <div class="a-stat-lbl">Avg Confidence</div>
    </div>
    <div class="a-stat">
      <div class="a-stat-icon">💰</div>
      <div class="a-stat-val" style="color:${rateColor}">${avgRate}${avgRate !== "—" ? "%" : ""}</div>
      <div class="a-stat-lbl">Avg Interest Rate</div>
    </div>`;
}

function renderAnalyticsCharts() {
  Object.values(analyticsCharts).forEach(c => c.destroy());
  analyticsCharts = {};
  const cc = chartColors();

  // ── Trend: approval probability over time (line) ─────────────────────
  analyticsCharts.trend = new Chart(document.getElementById("chartTrend"), {
    type:"line",
    data:{
      labels: sessionHistory.map(r => `#${r.id}`),
      datasets:[
        { label:"Approval %", data: sessionHistory.map(r => r.prob_approved),
          borderColor:"#3b82f6", backgroundColor:"rgba(59,130,246,0.10)",
          borderWidth:2.5, pointRadius:5, pointHoverRadius:7,
          pointBackgroundColor:"#3b82f6", pointBorderColor:"transparent",
          fill:true, tension:0.35 },
        { label:"Risk Score", data: sessionHistory.map(r => r.risk_score),
          borderColor:"#f59e0b", backgroundColor:"rgba(245,158,11,0.06)",
          borderWidth:2, pointRadius:4, pointHoverRadius:6,
          pointBackgroundColor:"#f59e0b", pointBorderColor:"transparent",
          fill:false, tension:0.35, borderDash:[4,3] },
      ],
    },
    options:{
      responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{ labels:{color:cc.text,font:{size:11},usePointStyle:true,padding:14} } },
      scales:{
        x:{ ticks:{color:cc.text}, grid:{color:cc.grid} },
        y:{ min:0,max:100, ticks:{color:cc.text,callback:v=>v+"%"}, grid:{color:cc.grid} },
      },
    },
  });

  // ── Risk tier distribution (doughnut) ─────────────────────────────────
  const riskCounts = { Low:0, Medium:0, High:0 };
  sessionHistory.forEach(r => riskCounts[r.risk_tier]++);
  analyticsCharts.riskDist = new Chart(document.getElementById("chartRiskDist"), {
    type:"doughnut",
    data:{
      labels: Object.keys(riskCounts),
      datasets:[{ data: Object.values(riskCounts),
        backgroundColor:["rgba(34,197,94,0.75)","rgba(245,158,11,0.75)","rgba(239,68,68,0.75)"],
        borderWidth:0, borderRadius:3 }],
    },
    options:{
      cutout:"58%", responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{position:"bottom",labels:{color:cc.text,font:{size:11},usePointStyle:true,padding:12}} },
    },
  });

  // ── Income vs Loan Amount (scatter) ───────────────────────────────────
  const r = CURRENCIES[currentCurrency].rate;
  const approvedData  = sessionHistory.filter(h=>h.status==="Approved").map(h=>({ x: +(h.income*r/1000).toFixed(1), y: +(h.loan_amount*r/1000).toFixed(1) }));
  const rejectedData  = sessionHistory.filter(h=>h.status==="Rejected").map(h=>({ x: +(h.income*r/1000).toFixed(1), y: +(h.loan_amount*r/1000).toFixed(1) }));
  const sym = currencySymbol();

  analyticsCharts.scatter = new Chart(document.getElementById("chartScatter"), {
    type:"scatter",
    data:{
      datasets:[
        { label:"Approved", data:approvedData, backgroundColor:"rgba(34,197,94,0.65)",
          pointRadius:7, pointHoverRadius:9, pointBorderWidth:0 },
        { label:"Rejected", data:rejectedData, backgroundColor:"rgba(239,68,68,0.65)",
          pointRadius:7, pointHoverRadius:9, pointBorderWidth:0 },
      ],
    },
    options:{
      responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{labels:{color:cc.text,font:{size:11},usePointStyle:true,padding:12}} },
      scales:{
        x:{ title:{display:true,text:`Income (${sym}K)`,color:cc.text,font:{size:11}},
            ticks:{color:cc.text}, grid:{color:cc.grid} },
        y:{ title:{display:true,text:`Loan Amount (${sym}K)`,color:cc.text,font:{size:11}},
            ticks:{color:cc.text}, grid:{color:cc.grid} },
      },
    },
  });

  // ── Interest Rate Trend (line) ─────────────────────────────────────────
  const rateHistory = sessionHistory.filter(h => h.interest_rate != null);
  const rateColors  = rateHistory.map(h => {
    const cat = (h.interest_category || "").toLowerCase();
    return cat === "low" ? "#22c55e" : cat === "high" ? "#ef4444" : "#f59e0b";
  });

  analyticsCharts.interestTrend = new Chart(document.getElementById("chartInterestTrend"), {
    type:"line",
    data:{
      labels: rateHistory.map(h => `#${h.id}`),
      datasets:[{
        label:"Interest Rate %",
        data: rateHistory.map(h => h.interest_rate),
        borderColor:"#a78bfa",
        backgroundColor:"rgba(167,139,250,0.10)",
        pointBackgroundColor: rateColors,
        pointBorderColor:"transparent",
        pointRadius:6, pointHoverRadius:8,
        borderWidth:2.5, fill:true, tension:0.4,
      }],
    },
    options:{
      responsive:true, maintainAspectRatio:false,
      plugins:{
        legend:{ labels:{color:cc.text,font:{size:11},usePointStyle:true,padding:14} },
        tooltip:{ callbacks:{ label: c=>`Rate: ${c.raw}%` }},
      },
      scales:{
        x:{ ticks:{color:cc.text}, grid:{color:cc.grid} },
        y:{ min:4, max:22, ticks:{color:cc.text,callback:v=>v+"%"}, grid:{color:cc.grid},
            title:{display:true,text:"Interest Rate (%)",color:cc.text,font:{size:11}} },
      },
    },
  });
}

// Called when theme changes — re-renders all analytics charts with new colours
function updateAnalyticsCharts() {
  if (document.getElementById("pageAnalytics").classList.contains("active")) {
    renderAnalyticsCharts();
  }
}

function renderHistoryTable() {
  const r   = CURRENCIES[currentCurrency].rate;
  const sym = currencySymbol();

  const rows = [...sessionHistory].reverse().slice(0, 20).map(h => {
    const irCatRow = (h.interest_category || "").toLowerCase();
    const irColRow = irCatRow === "low" ? "var(--green)" : irCatRow === "high" ? "var(--red)" : "var(--yellow)";
    return `
    <tr>
      <td style="color:var(--text-3)">#${h.id}</td>
      <td><span class="badge-status ${h.status==="Approved"?"badge-approved":"badge-rejected"}">${h.status==="Approved"?"✓":"✗"} ${h.status}</span></td>
      <td><span class="badge-risk badge-${h.risk_tier.toLowerCase()}">${h.risk_tier}</span></td>
      <td>${h.confidence}%</td>
      <td style="font-weight:700;color:${irColRow}">${h.interest_rate != null ? h.interest_rate + "%" : "—"}</td>
      <td>${sym}${Math.round(h.income*r).toLocaleString()}</td>
      <td>${h.credit_score}</td>
      <td>${sym}${Math.round(h.loan_amount*r).toLocaleString()}</td>
      <td>${sym}${Math.round(h.existing_debts*r).toLocaleString()}</td>
      <td style="color:var(--text-3)">${h.ts.toLocaleTimeString()}</td>
    </tr>`;
  }).join("");

  document.getElementById("historyBody").innerHTML = rows;
}

// ════════════════════════════════════════════════════════════════════════════
// TOAST
// ════════════════════════════════════════════════════════════════════════════
function showToast(msg, type = "info") {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.className = `toast ${type}`;
  void el.offsetWidth; // force reflow
  el.classList.add("show");
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove("show"), 4200);
}

// ════════════════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════════════════
function decisionLabel(conf) {
  if (conf >= 92) return "Very Strong";
  if (conf >= 82) return "Strong";
  if (conf >= 70) return "Moderate";
  if (conf >= 58) return "Weak";
  return "Borderline";
}

/**
 * Map an interest rate (6–20%) to a 0–100 percentage for progress bars / gauges.
 * @param {number} rate - Interest rate in %
 */
function irRateToPercent(rate) {
  if (rate == null) return 0;
  return Math.round(Math.max(0, Math.min(1, (rate - 6) / 14)) * 100);
}

// ════════════════════════════════════════════════════════════════════════════
// MODEL TRAINING PAGE
// ════════════════════════════════════════════════════════════════════════════
let modelPageChart = null;   // FI chart on model training page

async function renderModelPage() {
  // ── 1. Animate pipeline steps in (staggered) ─────────────────────────────
  document.querySelectorAll(".mt-pipe-step").forEach((step, i) => {
    step.classList.remove("visible");
    setTimeout(() => step.classList.add("visible"), 80 + i * 90);
  });

  // ── 2. Load metrics from API and populate all fields ─────────────────────
  try {
    const metrics = await callAPI("/metrics");

    // Top metrics strip
    if (metrics.accuracy) {
      document.getElementById("mtAccuracy").textContent = `${metrics.accuracy}%`;
      document.getElementById("mtAUC").textContent      = metrics.roc_auc ?? "—";
      document.getElementById("mtCV").textContent       = metrics.cv_mean_accuracy ? `${metrics.cv_mean_accuracy}%` : "—";
    }
    const im = metrics.interest_metrics;
    if (im) {
      document.getElementById("mtMAE").textContent = im.mae != null ? `${im.mae}%` : "—";
      document.getElementById("mtR2").textContent  = im.r2_score ?? "—";
    }

    // Animate metric card values
    document.querySelectorAll(".mt-mc-val").forEach(el => {
      el.style.animation = "none";
      void el.offsetWidth;
      el.style.animation = "countUp 0.45s ease both";
    });

    // Approval Classifier card metrics
    // precision/recall are nested under classification_report["1"] (Approved class)
    const cr = metrics.classification_report;
    if (metrics.accuracy)  document.getElementById("mtClfAcc").textContent  = `${metrics.accuracy}%`;
    if (metrics.roc_auc)   document.getElementById("mtClfAUC").textContent  = metrics.roc_auc;
    if (cr && cr["1"]) {
      document.getElementById("mtClfPrec").textContent = +(cr["1"].precision * 100).toFixed(1) + "%";
      document.getElementById("mtClfRec").textContent  = +(cr["1"].recall    * 100).toFixed(1) + "%";
    }

    // Interest Rate Regressor card metrics
    if (im) {
      if (im.mae)        document.getElementById("mtRegMAE").textContent  = `${im.mae}%`;
      if (im.r2_score)   document.getElementById("mtRegR2").textContent   = im.r2_score;
      if (im.rmse)       document.getElementById("mtRegRMSE").textContent = `${im.rmse}%`;
      if (im.cv_r2_mean) document.getElementById("mtRegCV").textContent   = im.cv_r2_mean;
    }

    // Confusion matrix
    if (metrics.confusion_matrix) {
      const [[tn, fp], [fn, tp]] = metrics.confusion_matrix;
      document.getElementById("cmTN").textContent = tn;
      document.getElementById("cmFP").textContent = fp;
      document.getElementById("cmFN").textContent = fn;
      document.getElementById("cmTP").textContent = tp;
    }
  } catch (_) { /* metrics may not be available before first train */ }

  // ── 3. Render Feature Importance chart ───────────────────────────────────
  try {
    const fi = await callAPI("/features");
    const cc = chartColors();
    const labels_map = {
      credit_score:"Credit Score", income:"Income", payment_history:"Payment History",
      existing_debts:"Existing Debts", loan_amount:"Loan Amount",
      employment_status:"Employment", age:"Age", loan_term:"Loan Term",
    };
    const sorted = Object.entries(fi).sort((a, b) => b[1] - a[1]);

    if (modelPageChart) { modelPageChart.destroy(); modelPageChart = null; }

    modelPageChart = new Chart(document.getElementById("chartModelFI"), {
      type: "bar",
      data: {
        labels: sorted.map(([k]) => labels_map[k] || k),
        datasets: [{
          data: sorted.map(([, v]) => +(v * 100).toFixed(1)),
          backgroundColor: sorted.map((_, i) => `hsla(${215 - i * 18},72%,58%,0.75)`),
          borderRadius: 4, borderSkipped: false,
        }],
      },
      options: {
        indexAxis: "y", responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => ` ${c.raw}% importance` } } },
        scales: {
          x: { ticks: { color: cc.text, callback: v => v + "%" }, grid: { color: cc.grid } },
          y: { ticks: { color: cc.text }, grid: { display: false } },
        },
      },
    });
  } catch (_) { /* features not available yet */ }

  // ── 4. Show idle log message ──────────────────────────────────────────────
  const logBody = document.getElementById("mtLogBody");
  if (logBody.querySelector(".log-dim")) {
    // Only reset if it's still showing the placeholder
    mtAppendLog("System ready. Click Retrain Models to run a full training cycle.", "log-info");
  }
}

// ── Append a single line to the training log ────────────────────────────────
function mtAppendLog(text, cls = "") {
  const logBody = document.getElementById("mtLogBody");

  // Clear placeholder text on first real message
  const dim = logBody.querySelector(".log-dim");
  if (dim) dim.remove();

  const line = document.createElement("div");
  line.className = `mt-log-line ${cls}`.trim();
  const ts = new Date().toLocaleTimeString("en-US", { hour12: false });
  line.innerHTML = `<span class="log-ts">[${ts}]</span> ${text}`;
  logBody.appendChild(line);
  logBody.scrollTop = logBody.scrollHeight;
}

// ── Retrain handler ───────────────────────────────────────────────────────────
async function runRetrain(btnId, btnTextId) {
  const btn     = document.getElementById(btnId);
  const btnText = document.getElementById(btnTextId);
  if (!btn || btn.disabled) return;

  btn.disabled       = true;
  btnText.textContent = "Training…";

  const statusEl = document.getElementById("mtLogStatus");
  if (statusEl) { statusEl.textContent = "● Training…"; statusEl.style.color = "var(--yellow)"; }

  // Clear log and show start message
  document.getElementById("mtLogBody").innerHTML = "";
  mtAppendLog("Starting training pipeline…", "log-info");

  // Simulate live log lines during the ~15s training
  const fakeLogs = [
    [500,  "Checking for existing dataset…"],
    [1000, "Generating 5,000 synthetic loan samples…"],
    [2200, "Dataset generation complete. Columns: 11"],
    [2800, "Splitting data: 4,000 train / 1,000 test (stratified)"],
    [3200, "Fitting StandardScaler on training features…"],
    [3800, "Training RandomForestClassifier (n_estimators=200, max_depth=12)…"],
    [6500, "Classifier training complete."],
    [7000, "Running 5-fold cross-validation on classifier…"],
    [8200, "Cross-validation complete."],
    [8600, "Training RandomForestRegressor for interest rate (n_estimators=200)…"],
    [11000,"Regressor training complete."],
    [11400,"Computing feature importances…"],
    [11800,"Evaluating on test set…"],
    [12200,"Saving models to /backend/model/…"],
    [12600,"Saving metrics.json and feature_importance.json…"],
  ];
  fakeLogs.forEach(([delay, msg]) => setTimeout(() => mtAppendLog(msg), delay));

  try {
    const result = await callAPI("/train", "POST");

    mtAppendLog("─────────────────────────────────────", "log-dim");
    mtAppendLog(`✅ Training complete!`, "log-success");

    const m = result.metrics || {};
    if (m.accuracy)         mtAppendLog(`   Accuracy:   ${m.accuracy}%`, "log-info");
    if (m.roc_auc)          mtAppendLog(`   ROC-AUC:    ${m.roc_auc}`, "log-info");
    if (m.cv_mean_accuracy) mtAppendLog(`   CV Acc:     ${m.cv_mean_accuracy}%`, "log-info");
    const im = m.interest_metrics;
    if (im) {
      if (im.mae)        mtAppendLog(`   IR MAE:     ${im.mae}%`, "log-info");
      if (im.r2_score)   mtAppendLog(`   IR R²:      ${im.r2_score}`, "log-info");
      if (im.cv_r2_mean) mtAppendLog(`   IR CV R²:   ${im.cv_r2_mean}`, "log-info");
    }
    mtAppendLog("Models are ready for predictions.", "log-success");

    if (statusEl) { statusEl.textContent = "● Trained"; statusEl.style.color = "var(--green)"; }

    // Refresh all metric displays
    await renderModelPage();

    // Refresh header metrics bar too
    if (m.accuracy) {
      document.getElementById("metricAccuracy").textContent = `${m.accuracy}%`;
      document.getElementById("metricAUC").textContent      = m.roc_auc ?? "—";
      document.getElementById("metricCV").textContent       = m.cv_mean_accuracy ? `${m.cv_mean_accuracy}%` : "—";
      if (im) {
        document.getElementById("metricMAE").textContent = im.mae != null ? `${im.mae}%` : "—";
        document.getElementById("metricR2").textContent  = im.r2_score ?? "—";
      }
      document.getElementById("modelMetricsBar").style.display = "flex";
    }

    showToast("Models retrained successfully!", "success");
  } catch (err) {
    mtAppendLog(`❌ Training failed: ${err.message}`, "log-error");
    if (statusEl) { statusEl.textContent = "● Error"; statusEl.style.color = "var(--red)"; }
    showToast("Training failed — check the backend.", "error");
  } finally {
    btn.disabled        = false;
    btnText.textContent = btnId === "retrainBtn" ? "Retrain Models" : "Retrain Now";
  }
}

document.getElementById("retrainBtn").addEventListener("click",  () => runRetrain("retrainBtn",  "retrainBtnText"));
document.getElementById("retrainBtn2").addEventListener("click", () => runRetrain("retrainBtn2", "retrainBtn2Text"));

// ════════════════════════════════════════════════════════════════════════════
// BOOT — check backend health & load metrics
// ════════════════════════════════════════════════════════════════════════════
(async () => {
  // Initialise default currency labels
  applyCurrencyChange("USD", "USD");

  const badge = document.getElementById("statusBadge");
  const text  = document.getElementById("statusText");
  badge.style.display = "flex";
  text.textContent = "Connecting…";

  try {
    const health = await callAPI("/health");
    if (health.model_ready) {
      text.textContent = "Model Ready";
      badge.style.background = "var(--green-dim)";
      badge.style.color      = "var(--green)";
      badge.style.borderColor = "rgba(34,197,94,0.22)";

      const metrics = await callAPI("/metrics");
      if (metrics?.accuracy) {
        document.getElementById("metricAccuracy").textContent = `${metrics.accuracy}%`;
        document.getElementById("metricAUC").textContent      = metrics.roc_auc ?? "—";
        document.getElementById("metricCV").textContent       = metrics.cv_mean_accuracy ? `${metrics.cv_mean_accuracy}%` : "—";

        // Interest rate model metrics (from interest_metrics sub-object)
        const im = metrics.interest_metrics;
        if (im) {
          document.getElementById("metricMAE").textContent = im.mae != null ? `${im.mae}%` : "—";
          document.getElementById("metricR2").textContent  = im.r2_score ?? "—";
        }

        document.getElementById("modelMetricsBar").style.display = "flex";
      }
    } else {
      text.textContent = "Training…";
      badge.style.borderColor = "rgba(245,158,11,0.30)";
      badge.style.color       = "var(--yellow)";
      document.querySelector(".badge-pulse").style.background = "var(--yellow)";
    }
  } catch (_) {
    text.textContent = "Backend Offline";
    badge.style.background  = "var(--red-dim)";
    badge.style.color       = "var(--red)";
    badge.style.borderColor = "rgba(239,68,68,0.28)";
    document.querySelector(".badge-pulse").style.background = "var(--red)";
  }
})();
