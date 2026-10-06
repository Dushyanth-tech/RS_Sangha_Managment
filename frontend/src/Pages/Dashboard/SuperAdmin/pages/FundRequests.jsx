import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Bell,
  HandCoins,
  RefreshCw,
  X,
  Loader2,
  CheckCircle2,
  XCircle,
  Eye,
  AlertTriangle,
} from "lucide-react";

import api from "../../../../api/axiosInstance";
import "./FundRequests.css";

/* ====================================================================
   HELPERS
==================================================================== */

const rupees = (v) =>
  v === null || v === undefined
    ? "—"
    : `₹${Number(v).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

const fmtDate = (iso) =>
  iso
    ? new Date(iso).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

const fmtDateTime = (iso) =>
  iso
    ? new Date(iso).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
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

const TABS = [
  { key: "pending", label: "Pending", test: (r) => r.status === "Pending" },
  { key: "review", label: "Under Review", test: (r) => r.status === "Under Review" },
  { key: "approved", label: "Approved", test: (r) => r.status === "Approved" },
  { key: "rejected", label: "Rejected", test: (r) => r.status === "Rejected" },
  { key: "all", label: "All", test: () => true },
];

const TONE = {
  Pending: "amber",
  "Under Review": "amber",
  Approved: "green",
  Rejected: "red",
  Disbursed: "blue",
  Repaying: "blue",
  Completed: "green",
};

const canDecide = (r) => r.status === "Pending" || r.status === "Under Review";

/* ====================================================================
   SMALL PIECES
==================================================================== */

const Badge = ({ status }) => (
  <span className={`fr-badge fr-badge--${TONE[status] ?? "gray"}`}>{status}</span>
);

function Modal({ title, subtitle, onClose, children }) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && closeRef.current();
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, []);

  return (
    <div
      className="fr-overlay"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="fr-modal" role="dialog" aria-modal="true" aria-label={title}>
        <header className="fr-modal__head">
          <div>
            <h3>{title}</h3>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button type="button" className="fr-icon-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </header>
        <div className="fr-modal__body">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children, wide }) {
  return (
    <div className={`fr-field ${wide ? "fr-field--wide" : ""}`}>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

/* ====================================================================
   APPROVE MODAL
==================================================================== */

function ApproveModal({ item, onClose, onConfirm }) {
  const [amount, setAmount] = useState(String(item.amount));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const confirm = async () => {
    const n = Number(amount);
    if (!(n > 0)) {
      setError("Enter an approved amount greater than ₹0.");
      return;
    }
    if (n > item.amount) {
      setError("The approved amount cannot exceed the requested amount.");
      return;
    }

    setBusy(true);
    setError("");
    try {
      await onConfirm(n);
      onClose();
    } catch (err) {
      console.error("Approve failed:", err);
      setError(errorText(err, "Unable to approve this request."));
      setBusy(false);
    }
  };

  return (
    <Modal title="Approve Fund Request" subtitle={`${item.memberName} · ${item.sanghaName}`} onClose={onClose}>
      <dl className="fr-grid fr-grid--tight">
        <Field label="Requested Amount">{rupees(item.amount)}</Field>
        <Field label="Monthly Salary">{rupees(item.monthlySalary)}</Field>
      </dl>

      <label className="fr-input">
        Approved Amount (₹)
        <input
          type="number"
          min="1"
          max={item.amount}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          disabled={busy}
        />
      </label>

      <p className="fr-note">
        Approving does not move any money. Disbursement is a separate step.
      </p>

      {!item.memberVerified && (
        <div className="fr-alert fr-alert--warn">
          <AlertTriangle size={16} /> This member&apos;s account must be verified before approval.
        </div>
      )}
      {error && <div className="fr-alert">{error}</div>}

      <div className="fr-actions">
        <button type="button" className="fr-btn" onClick={onClose} disabled={busy}>
          Cancel
        </button>
        <button
          type="button"
          className="fr-btn fr-btn--approve"
          onClick={confirm}
          disabled={busy || !item.memberVerified}
        >
          {busy ? <Loader2 size={16} className="fr-spin" /> : <CheckCircle2 size={16} />}
          Confirm Approval
        </button>
      </div>
    </Modal>
  );
}

/* ====================================================================
   REJECT MODAL
==================================================================== */

function RejectModal({ item, onClose, onConfirm }) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const confirm = async () => {
    if (!reason.trim()) {
      setError("Please provide a rejection reason.");
      return;
    }

    setBusy(true);
    setError("");
    try {
      await onConfirm(reason.trim());
      onClose();
    } catch (err) {
      console.error("Reject failed:", err);
      setError(errorText(err, "Unable to reject this request."));
      setBusy(false);
    }
  };

  return (
    <Modal title="Reject Fund Request" subtitle={`${item.memberName} · ${rupees(item.amount)}`} onClose={onClose}>
      <label className="fr-input">
        Reason
        <textarea
          rows={4}
          maxLength={255}
          placeholder="Please provide rejection reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          disabled={busy}
        />
      </label>
      <p className="fr-note">The member will see this reason. The request is kept in the records.</p>

      {error && <div className="fr-alert">{error}</div>}

      <div className="fr-actions">
        <button type="button" className="fr-btn" onClick={onClose} disabled={busy}>
          Cancel
        </button>
        <button type="button" className="fr-btn fr-btn--reject-solid" onClick={confirm} disabled={busy}>
          {busy ? <Loader2 size={16} className="fr-spin" /> : <XCircle size={16} />}
          Reject Request
        </button>
      </div>
    </Modal>
  );
}

/* ====================================================================
   DETAILS MODAL (every FundRequest column)
==================================================================== */

function DetailsModal({ item, onClose, onApprove, onReject, onStartReview, onDisburse }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirmDisburse, setConfirmDisburse] = useState(false);

  const run = async (fn) => {
    setBusy(true);
    setError("");
    try {
      await fn();
      setConfirmDisburse(false);
    } catch (err) {
      console.error("Action failed:", err);
      setError(errorText(err, "Unable to complete this action."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={`Fund Request #${item.id}`} subtitle={`${item.memberName} · ${item.sanghaName}`} onClose={onClose}>
      <div className="fr-detail-head">
        <Badge status={item.status} />
      </div>

      <dl className="fr-grid">
        <Field label="Request ID">#{item.id}</Field>
        <Field label="Status">{item.status}</Field>
        <Field label="Member">{item.memberName}</Field>
        <Field label="Member ID">{item.memberId}</Field>
        <Field label="Sangha">{item.sanghaName} ({item.sanghaCode})</Field>
        <Field label="Sangha ID">{item.sanghaId}</Field>
        <Field label="Requested Amount">{rupees(item.amount)}</Field>
        <Field label="Approved Amount">{rupees(item.approvedAmount)}</Field>
        <Field label="Monthly Salary">{rupees(item.monthlySalary)}</Field>
        <Field label="Requested On">{fmtDateTime(item.requestedAt)}</Field>
        <Field label="Reviewed By">{item.reviewedBy || "—"}</Field>
        <Field label="Reviewed On">{fmtDateTime(item.reviewedAt)}</Field>
        <Field label="Disbursed On">{fmtDateTime(item.disbursedAt)}</Field>
        <Field label="Completed On">{fmtDateTime(item.completedAt)}</Field>
        <Field label="Reason" wide>{item.reason}</Field>
        {item.rejectionReason && <Field label="Rejection Reason" wide>{item.rejectionReason}</Field>}
      </dl>

      {error && <div className="fr-alert">{error}</div>}

      {canDecide(item) && (
        <div className="fr-actions">
          {item.status === "Pending" && (
            <button type="button" className="fr-btn" disabled={busy} onClick={() => run(() => onStartReview(item.id))}>
              {busy ? <Loader2 size={16} className="fr-spin" /> : "Start Review"}
            </button>
          )}
          <button type="button" className="fr-btn fr-btn--reject" onClick={() => onReject(item)} disabled={busy}>
            Reject
          </button>
          <button type="button" className="fr-btn fr-btn--approve" onClick={() => onApprove(item)} disabled={busy}>
            Approve
          </button>
        </div>
      )}

      {item.status === "Approved" && (
        <div className="fr-inline">
          <p className="fr-note">
            Approved for {rupees(item.approvedAmount)}. Disbursing records that the money was given to the
            member and deducts it from the Sangha Savings balance.
          </p>
          {!confirmDisburse ? (
            <div className="fr-actions">
              <button type="button" className="fr-btn fr-btn--primary" onClick={() => setConfirmDisburse(true)}>
                Mark as Disbursed
              </button>
            </div>
          ) : (
            <div className="fr-actions">
              <button type="button" className="fr-btn" onClick={() => setConfirmDisburse(false)} disabled={busy}>
                Cancel
              </button>
              <button
                type="button"
                className="fr-btn fr-btn--primary"
                disabled={busy}
                onClick={() => run(() => onDisburse(item.id))}
              >
                {busy ? <Loader2 size={16} className="fr-spin" /> : "Confirm Disbursement"}
              </button>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

/* ====================================================================
   PAGE
==================================================================== */

export default function FundRequests({ onChanged }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [tab, setTab] = useState("pending");

  const [detailId, setDetailId] = useState(null);
  const [approveFor, setApproveFor] = useState(null);
  const [rejectFor, setRejectFor] = useState(null);

  const load = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setError("");
      const res = await api.get("/sangha-savings/inbox");
      setItems(res.data.items ?? []);
    } catch (err) {
      console.error("Error loading fund requests:", err);
      setError(errorText(err, "Unable to load fund requests."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const activeTab = TABS.find((t) => t.key === tab);
  const visible = useMemo(() => items.filter(activeTab.test), [items, activeTab]);
  const counts = useMemo(
    () => Object.fromEntries(TABS.map((t) => [t.key, items.filter(t.test).length])),
    [items],
  );

  // Always read the open request from the latest list so it reflects new status after an action
  const detailItem = items.find((r) => r.id === detailId) ?? null;

  // Reload the list, then refresh the bell badge in the topbar
  const afterChange = async () => {
    await load(true);
    onChanged?.();
  };

  const review = (id, body) => api.patch(`/sangha-savings/requests/${id}/review`, body);

  const approve = async (item, approvedAmount) => {
    await review(item.id, { action: "approve", approved_amount: approvedAmount });
    await afterChange();
    setNotice(`Approved ${rupees(approvedAmount)} for ${item.memberName}. The member has been notified.`);
  };

  const reject = async (item, reason) => {
    await review(item.id, { action: "reject", reason });
    await afterChange();
    setNotice(`Request from ${item.memberName} was rejected. The member has been notified.`);
  };

  const startReview = async (id) => {
    await review(id, { action: "start_review" });
    await afterChange();
    setNotice("Request moved to Under Review.");
  };

  const disburse = async (id) => {
    await api.post(`/sangha-savings/requests/${id}/disburse`, {});
    await afterChange();
    setNotice("Marked as disbursed. The amount was deducted from the Sangha Savings balance.");
  };

  return (
    <div className="fr">
      <header className="fr-header">
        <span className="fr-header__icon">
          <Bell size={22} />
        </span>
        <div className="fr-header__text">
          <h1>Member Fund Requests</h1>
          <p>Emergency money requests from members, paid from the Sangha Savings Account.</p>
        </div>
        <button type="button" className="fr-btn fr-btn--ghost" onClick={() => load()} aria-label="Refresh">
          <RefreshCw size={16} /> <span>Refresh</span>
        </button>
      </header>

      <div className="fr-tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            className={`fr-tab ${tab === t.key ? "fr-tab--active" : ""}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
            <span className="fr-tab__count">{counts[t.key]}</span>
          </button>
        ))}
      </div>

      {notice && (
        <div className="fr-notice" role="status">
          <CheckCircle2 size={18} />
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice("")} aria-label="Dismiss">
            <X size={16} />
          </button>
        </div>
      )}

      {error && (
        <div className="fr-error" role="alert">
          <span>{error}</span>
          <button type="button" onClick={() => load()}>
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div className="fr-list">
          {[0, 1, 2].map((i) => (
            <span key={i} className="fr-skel" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className="fr-empty">
          <HandCoins size={28} />
          <strong>
            {tab === "pending" ? "No pending fund requests" : "No requests in this list"}
          </strong>
          <p>
            {tab === "pending"
              ? "New requests from your members will appear here."
              : "Requests will show up here as members submit them."}
          </p>
        </div>
      ) : (
        <ul className="fr-list">
          {visible.map((r) => (
            <li key={r.id} className={`fr-card ${r.status === "Pending" ? "fr-card--new" : ""}`}>
              <div className="fr-card__top">
                <div>
                  <span className="fr-card__eyebrow">Member Fund Request #{r.id}</span>
                  <strong className="fr-card__amount">{rupees(r.amount)}</strong>
                </div>
                <Badge status={r.status} />
              </div>

              <dl className="fr-grid">
                <Field label="Member">{r.memberName}</Field>
                <Field label="Member ID">{r.memberId}</Field>
                <Field label="Sangha">{r.sanghaName}</Field>
                <Field label="Monthly Salary">{rupees(r.monthlySalary)}</Field>
                <Field label="Requested On">{fmtDate(r.requestedAt)}</Field>
                {r.approvedAmount != null && <Field label="Approved Amount">{rupees(r.approvedAmount)}</Field>}
                <Field label="Reason" wide>{r.reason}</Field>
              </dl>

              <div className="fr-card__actions">
                <button type="button" className="fr-btn fr-btn--ghost" onClick={() => setDetailId(r.id)}>
                  <Eye size={16} /> Details
                </button>
                {canDecide(r) && (
                  <>
                    <button type="button" className="fr-btn fr-btn--reject" onClick={() => setRejectFor(r)}>
                      Reject
                    </button>
                    <button type="button" className="fr-btn fr-btn--approve" onClick={() => setApproveFor(r)}>
                      Approve
                    </button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {detailItem && (
        <DetailsModal
          item={detailItem}
          onClose={() => setDetailId(null)}
          onApprove={(r) => setApproveFor(r)}
          onReject={(r) => setRejectFor(r)}
          onStartReview={startReview}
          onDisburse={disburse}
        />
      )}

      {approveFor && (
        <ApproveModal
          item={approveFor}
          onClose={() => setApproveFor(null)}
          onConfirm={(amount) => approve(approveFor, amount)}
        />
      )}

      {rejectFor && (
        <RejectModal
          item={rejectFor}
          onClose={() => setRejectFor(null)}
          onConfirm={(reason) => reject(rejectFor, reason)}
        />
      )}
    </div>
  );
}