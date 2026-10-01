import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Wallet,
  CalendarDays,
  Percent,
  Landmark,
  ArrowRight,
  Download,
  Search,
  CheckCircle2,
  Receipt,
  PiggyBank,
  HandCoins,
  TrendingUp,
  Banknote,
  CreditCard,
  Clock,
} from "lucide-react";

import api from "../../../../api/axiosInstance";
import "./MyPayments.css";

/* ====================================================================
   HELPERS
==================================================================== */

const NA = "Not available yet";

const rupees = (v) =>
  v === null || v === undefined
    ? NA
    : `₹${Number(v).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

const fmtDate = (iso) =>
  iso
    ? new Date(iso).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

const errorText = (err, fallback) => {
  if (err?.response?.status === 401) {
    return "Your session has expired. Please log in again.";
  }
  const detail = err?.response?.data?.detail;
  if (Array.isArray(detail)) return detail.map((d) => d.msg).join(", ");
  return (typeof detail === "string" && detail) || fallback;
};

const pad = (n) => String(n).padStart(2, "0");

const FILTERS = ["All", "Contributions", "Interest", "Principal", "Pending", "Failed"];

const OPTIONS = [
  { key: "contribution", title: "Contribution", desc: "Pay daily/monthly contribution", icon: PiggyBank },
  { key: "interest", title: "Interest Payment", desc: "Interest on emergency funds / loans", icon: Percent },
  { key: "principal", title: "Principal Repayment", desc: "Repay borrowed amount", icon: HandCoins },
  { key: "other", title: "Other Payment", desc: "View other payment options", icon: CreditCard },
];

const STATUS_TONE = { Paid: "green", Pending: "orange", Failed: "red" };

// Backend transaction -> payment row. Money RECEIVED is not a payment, so it is filtered out below.
const toPayment = (t) => {
  const label = t.type || "";
  const kind = label.startsWith("Repayment")
    ? "Principal"
    : label.startsWith("Interest")
      ? "Interest"
      : "Other";
  return {
    id: t.id,
    kind,
    type: kind === "Other" ? label : kind,
    amount: t.amount,
    date: t.date,
    ref: `RS-TXN-${String(t.id).padStart(6, "0")}`,
    status: t.status === "Completed" ? "Paid" : t.status,
  };
};

const FILTER_TEST = {
  All: () => true,
  Contributions: (p) => p.kind === "Contribution",
  Interest: (p) => p.kind === "Interest",
  Principal: (p) => p.kind === "Principal",
  Pending: (p) => p.status === "Pending",
  Failed: (p) => p.status === "Failed",
};

/* ====================================================================
   SMALL UI PIECES
==================================================================== */

const Skel = ({ w = "100%", h = 18 }) => (
  <span className="mp-skel" style={{ width: w, height: h }} />
);

const Badge = ({ tone = "blue", children }) => (
  <span className={`mp-badge mp-badge--${tone}`}>{children}</span>
);

const Empty = ({ text }) => (
  <div className="mp-empty">
    <Receipt size={22} />
    <p>{text}</p>
  </div>
);

const ErrorBox = ({ text, onRetry }) => (
  <div className="mp-error" role="alert">
    <span>{text}</span>
    {onRetry && (
      <button type="button" onClick={onRetry}>
        Retry
      </button>
    )}
  </div>
);

const Card = ({ className = "", title, subtitle, action, children }) => (
  <section className={`mp-card ${className}`}>
    {title && (
      <div className="mp-card__head">
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {action}
      </div>
    )}
    {children}
  </section>
);

function Stat({ icon: Icon, label, value, desc, loading }) {
  return (
    <article className="mp-stat">
      <span className="mp-stat__icon">
        <Icon size={18} />
      </span>
      <span className="mp-stat__label">{label}</span>
      {loading ? (
        <Skel w="70%" h={24} />
      ) : (
        <strong className={`mp-stat__value ${value === NA ? "mp-na" : ""}`}>{value}</strong>
      )}
      <span className="mp-stat__desc">{desc}</span>
    </article>
  );
}

function KV({ label, value, loading }) {
  return (
    <div className="mp-kv__item">
      <dt>{label}</dt>
      <dd className={value === NA ? "mp-na" : ""}>{loading ? <Skel w="60%" h={14} /> : value}</dd>
    </div>
  );
}

/* ====================================================================
   CONTRIBUTION CALENDAR
==================================================================== */

function Calendar({ year, month, paidDays = [], missedDays = [] }) {
  const paid = new Set(paidDays);
  const missed = new Set(missedDays);
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const weekdays = ["S", "M", "T", "W", "T", "F", "S"];

  const cells = [];
  for (let i = 0; i < firstWeekday; i += 1) cells.push(<span key={`b${i}`} className="mp-cal__blank" />);
  for (let d = 1; d <= daysInMonth; d += 1) {
    const state = paid.has(d) ? "paid" : missed.has(d) ? "missed" : "pending";
    cells.push(
      <span key={d} className={`mp-cal__day mp-cal__day--${state}`} title={`${d}: ${state}`}>
        {d}
      </span>,
    );
  }

  return (
    <div>
      <div className="mp-cal">
        {weekdays.map((w, i) => (
          <span key={`w${i}`} className="mp-cal__wd">
            {w}
          </span>
        ))}
        {cells}
      </div>
      <ul className="mp-legend">
        <li><i className="mp-dot mp-dot--paid" /> Paid</li>
        <li><i className="mp-dot mp-dot--pending" /> Pending</li>
        <li><i className="mp-dot mp-dot--missed" /> Missed</li>
      </ul>
    </div>
  );
}

/* ====================================================================
   PAGE
   `contribution` is the plug-in point for a future contributions API:
   { monthlyAmount, yearTotal, dailyAmount, daysPaid, daysInMonth,
     paidAmount, remaining, paidDays: [1,2,...], missedDays: [...] }
   Until that exists it stays null and those sections say "Not available yet".
==================================================================== */

export default function MyPayments({ contribution = null }) {
  const [ov, setOv] = useState(null);
  const [ovError, setOvError] = useState("");
  const [hist, setHist] = useState(null);
  const [histError, setHistError] = useState("");
  const [loading, setLoading] = useState(true);

  const [filter, setFilter] = useState("All");
  const [month, setMonth] = useState("");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setOvError("");
    setHistError("");

    const [o, h] = await Promise.allSettled([
      api.get("/sangha-savings/overview"),
      api.get("/sangha-savings/history"),
    ]);

    if (o.status === "fulfilled") setOv(o.value.data);
    else {
      console.error("Overview failed:", o.reason);
      setOvError(errorText(o.reason, "Unable to load your payment information."));
    }

    if (h.status === "fulfilled") setHist(h.value.data);
    else {
      console.error("History failed:", h.reason);
      setHistError(errorText(h.reason, "Unable to load your payment history."));
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const member = ov?.member;
  const account = ov?.account;
  const sangha = ov?.sangha;

  const now = new Date();
  const monthKey = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
  const monthLabel = now.toLocaleDateString("en-IN", { month: "long", year: "numeric" });

  const payments = useMemo(
    () => (hist?.transactions ?? []).filter((t) => t.direction === "Paid").map(toPayment),
    [hist],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return payments.filter(
      (p) =>
        FILTER_TEST[filter](p) &&
        (!month || p.date.slice(0, 7) === month) &&
        (!q || p.ref.toLowerCase().includes(q) || p.type.toLowerCase().includes(q)),
    );
  }, [payments, filter, month, query]);

  // This month's principal + interest, from real repayment records
  const monthPayments = payments.filter((p) => p.date.slice(0, 7) === monthKey && p.status === "Paid");
  const principalPaid = monthPayments.filter((p) => p.kind === "Principal").reduce((s, p) => s + p.amount, 0);
  const interestPaid = monthPayments.filter((p) => p.kind === "Interest").reduce((s, p) => s + p.amount, 0);
  const breakdownTotal = principalPaid + interestPaid;
  const principalShare = breakdownTotal > 0 ? (principalPaid / breakdownTotal) * 100 : 0;

  const receipt = payments.find((p) => p.id === selectedId) ?? payments.find((p) => p.status === "Paid") ?? null;

  const downloadReceipt = (p) => {
    const text = [
      "RS-SANGHA — PAYMENT RECEIPT",
      "---------------------------",
      `Type:           ${p.type}`,
      `Amount:         ${rupees(p.amount)}`,
      `Date:           ${fmtDate(p.date)}`,
      `Transaction ID: ${p.ref}`,
      `Status:         ${p.status}`,
    ].join("\n");
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${p.ref}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const viewReceipt = (p) => {
    setSelectedId(p.id);
    document.getElementById("mp-receipt")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const outstanding = member ? member.outstanding : null;
  const c = contribution;
  const pct = c ? Math.min(Math.round((c.daysPaid / c.daysInMonth) * 100), 100) : 0;

  return (
    <div className="mp">
      {/* ---------- Header ---------- */}
      <header className="mp-header">
        <span className="mp-header__icon">
          <Wallet size={22} />
        </span>
        <div>
          <h1>My Payments</h1>
          <p>Track your contributions, interest, repayments and complete payment history.</p>
        </div>
      </header>

      {ovError && <ErrorBox text={ovError} onRetry={load} />}

      {/* ---------- Summary ---------- */}
      <div className="mp-stats">
        <Stat icon={CalendarDays} label="Monthly Contribution" value={rupees(c?.monthlyAmount)} desc="As per Sangha rules" loading={loading} />
        <Stat icon={TrendingUp} label="Total Contributions" value={rupees(c?.yearTotal)} desc="This year" loading={loading} />
        <Stat icon={Percent} label="Interest Paid" value={rupees(member?.totalInterestPaid)} desc="All time" loading={loading} />
        <Stat icon={Banknote} label="Outstanding Amount" value={rupees(outstanding)} desc="Principal outstanding" loading={loading} />
      </div>

      <div className="mp-body">
        <div className="mp-main">
          <div className="mp-row">
            {/* ---------- Current month ---------- */}
            <Card className="mp-o2" title="Current Month Contribution" subtitle={monthLabel}>
              {!c ? (
                <Empty text="Contribution tracking is not available yet." />
              ) : (
                <>
                  <dl className="mp-kv mp-kv--4">
                    <KV label="Daily Contribution" value={rupees(c.dailyAmount)} />
                    <KV label="Days Paid" value={`${c.daysPaid} / ${c.daysInMonth}`} />
                    <KV label="Paid Amount" value={rupees(c.paidAmount)} />
                    <KV label="Remaining" value={rupees(c.remaining)} />
                  </dl>
                  <div className="mp-progress" aria-label={`${pct}% paid`}>
                    <div className="mp-progress__top">
                      <span>Progress</span>
                      <strong>{pct}%</strong>
                    </div>
                    <div className="mp-bar">
                      <span style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  <Calendar
                    year={now.getFullYear()}
                    month={now.getMonth()}
                    paidDays={c.paidDays}
                    missedDays={c.missedDays}
                  />
                </>
              )}
            </Card>

            {/* ---------- Quick pay ---------- */}
            <Card className="mp-o3 mp-quick" title="Quick Pay" subtitle="Pay your contribution for today">
              <dl className="mp-kv">
                <KV label="Amount" value={rupees(c?.dailyAmount)} />
                <KV label="Payment Type" value="Contribution" />
              </dl>
              <button type="button" className="mp-btn mp-btn--primary mp-btn--block" disabled>
                {c?.dailyAmount != null ? `Pay ${rupees(c.dailyAmount)}` : "Pay"}
              </button>
              <p className="mp-hint">Online payment is not available yet.</p>
            </Card>
          </div>

          {/* ---------- Payment options ---------- */}
          <Card className="mp-o5" title="Payment Options">
            <div className="mp-options">
              {OPTIONS.map(({ key, title, desc, icon: Icon }) => (
                <button key={key} type="button" className="mp-option" disabled>
                  <span className="mp-option__icon">
                    <Icon size={20} />
                  </span>
                  <strong>{title}</strong>
                  <small>{desc}</small>
                </button>
              ))}
            </div>
            <p className="mp-hint">Payments are not available yet.</p>
          </Card>

          {/* ---------- History ---------- */}
          <Card className="mp-o8" title="Payment History" subtitle="Track all your past payments.">
            <div className="mp-filters" role="group" aria-label="Filter payments">
              {FILTERS.map((f) => (
                <button
                  key={f}
                  type="button"
                  className={`mp-chip ${filter === f ? "mp-chip--active" : ""}`}
                  onClick={() => setFilter(f)}
                >
                  {f}
                </button>
              ))}
            </div>

            <div className="mp-tools">
              <label className="mp-field">
                <span>Month</span>
                <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
              </label>
              <label className="mp-field mp-field--search">
                <span>Search</span>
                <div className="mp-search">
                  <Search size={16} />
                  <input
                    type="search"
                    placeholder="Search transaction"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </div>
              </label>
            </div>

            {loading ? (
              <Skel h={120} />
            ) : histError ? (
              <ErrorBox text={histError} onRetry={load} />
            ) : filtered.length === 0 ? (
              <Empty text={payments.length === 0 ? "No payments yet." : "No payments match your filters."} />
            ) : (
              <>
                <div className="mp-hrow mp-hrow--head" aria-hidden="true">
                  <span>Date</span>
                  <span>Type</span>
                  <span>Amount</span>
                  <span>Reference ID</span>
                  <span>Status</span>
                  <span>Action</span>
                </div>
                <ul className="mp-hlist">
                  {filtered.map((p) => (
                    <li key={p.id} className="mp-hrow">
                      <span className="mp-h-date">{fmtDate(p.date)}</span>
                      <strong className="mp-h-type">{p.type}</strong>
                      <strong className="mp-h-amount">{rupees(p.amount)}</strong>
                      <span className="mp-h-ref">{p.ref}</span>
                      <span className="mp-h-status">
                        <Badge tone={STATUS_TONE[p.status] ?? "blue"}>{p.status}</Badge>
                      </span>
                      <button type="button" className="mp-link mp-h-action" onClick={() => viewReceipt(p)}>
                        View <ArrowRight size={14} />
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </Card>

          {/* ---------- Loan / emergency fund repayment ---------- */}
          <Card className="mp-o9" title="Loan / Emergency Fund Repayment" subtitle="Separate from your Sangha contribution">
            <dl className="mp-kv mp-kv--3">
              <KV label="Principal Outstanding" value={rupees(outstanding)} loading={loading} />
              <KV label="Interest Outstanding" value={NA} />
              <KV label="Total Payable" value={NA} />
            </dl>
            <div className="mp-btnrow">
              <button type="button" className="mp-btn mp-btn--primary" disabled>
                Pay Principal
              </button>
              <button type="button" className="mp-btn" disabled>
                Pay Interest
              </button>
            </div>
          </Card>

          {/* ---------- Breakdown ---------- */}
          <Card className="mp-o10" title="Payment Breakdown" subtitle={monthLabel}>
            {loading ? (
              <Skel h={130} />
            ) : breakdownTotal === 0 ? (
              <Empty text="No principal or interest payments this month." />
            ) : (
              <div className="mp-break">
                <div
                  className="mp-donut"
                  role="img"
                  aria-label={`Principal ${Math.round(principalShare)} percent, interest ${Math.round(100 - principalShare)} percent`}
                  style={{
                    background: `conic-gradient(var(--mp-royal) 0 ${principalShare}%, var(--mp-bright) ${principalShare}% 100%)`,
                  }}
                >
                  <div className="mp-donut__hole">
                    <small>Total Paid</small>
                    <strong>{rupees(breakdownTotal)}</strong>
                  </div>
                </div>
                <ul className="mp-break__list">
                  <li><i className="mp-dot mp-dot--royal" /> Principal <b>{rupees(principalPaid)}</b></li>
                  <li><i className="mp-dot mp-dot--bright" /> Interest <b>{rupees(interestPaid)}</b></li>
                  <li><i className="mp-dot mp-dot--navy" /> Contribution <b className="mp-na">{NA}</b></li>
                </ul>
              </div>
            )}
          </Card>
        </div>

        <div className="mp-side">
          {/* ---------- Status ---------- */}
          <Card className="mp-o4" title="Payment Status">
            <ul className="mp-status">
              <li><span>Today&apos;s contribution</span><b className="mp-na">{NA}</b></li>
              <li><span>Previous contribution</span><b className="mp-na">{NA}</b></li>
              <li><span>Interest due</span><b className="mp-na">{NA}</b></li>
              <li><span>Principal outstanding</span><b>{loading ? <Skel w={60} h={14} /> : rupees(outstanding)}</b></li>
            </ul>
          </Card>

          {/* ---------- Sangha savings account ---------- */}
          <Card className="mp-o6" title="Sangha Savings Account" subtitle="The Sangha's account, not your personal balance">
            {loading ? (
              <Skel h={160} />
            ) : !account ? (
              <Empty text="No active Sangha Savings Account." />
            ) : (
              <>
                <div className="mp-acct__head">
                  <span className="mp-acct__icon"><Landmark size={18} /></span>
                  <div>
                    <strong>{sangha?.name}</strong>
                    <small>Code: {sangha?.code}</small>
                  </div>
                  <Badge tone={account.status === "Active" ? "green" : "orange"}>{account.status}</Badge>
                </div>
                <dl className="mp-kv mp-kv--acct">
                  <KV label="Bank Name" value={account.bank} />
                  <KV label="Account Holder" value={account.accountHolder} />
                  <KV label="Account No" value={account.accountNumberMasked} />
                  <KV label="IFSC" value={account.ifsc} />
                  <KV label="Branch" value={account.branch} />
                  <KV label="Account Type" value={account.accountType} />
                </dl>
                <div className="mp-balance">
                  <span>Available Balance</span>
                  <strong>{rupees(ov?.fund?.balance)}</strong>
                </div>
              </>
            )}
          </Card>

          {/* ---------- Upcoming ---------- */}
          <Card className="mp-o7" title="Upcoming Payments">
            <div className="mp-empty">
              <Clock size={22} />
              <p>{NA}</p>
            </div>
          </Card>

          {/* ---------- Financial position ---------- */}
          <Card className="mp-o11" title="Financial Position">
            <dl className="mp-kv">
              <KV label="Current Month" value={monthLabel} />
              <KV label="Contribution" value={NA} />
              <KV label="Money Received" value={rupees(member?.receivedThisMonth)} loading={loading} />
              <KV label="Outstanding" value={rupees(member?.outstanding)} loading={loading} />
              <KV label="Total Repaid" value={rupees(member?.totalRepaid)} loading={loading} />
            </dl>
          </Card>

          {/* ---------- Receipt ---------- */}
          <section id="mp-receipt" className="mp-card mp-o12 mp-receipt">
            {!receipt ? (
              <Empty text="Your latest receipt will appear here." />
            ) : (
              <>
                <div className="mp-receipt__top">
                  <CheckCircle2 size={22} />
                  <strong>Payment {receipt.status === "Paid" ? "Successful" : receipt.status}</strong>
                </div>
                <dl className="mp-kv">
                  <KV label={receipt.type} value={rupees(receipt.amount)} />
                  <KV label="Date" value={fmtDate(receipt.date)} />
                  <KV label="Transaction ID" value={receipt.ref} />
                </dl>
                <button type="button" className="mp-btn mp-btn--block" onClick={() => downloadReceipt(receipt)}>
                  <Download size={16} /> Download Receipt
                </button>
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}