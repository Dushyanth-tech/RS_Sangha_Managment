import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  X,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  XCircle,
  Loader2,
  Send,
  ArrowRight,
  PartyPopper,
} from "lucide-react";

import api from "../../../../api/axiosInstance";
import "./AccountStatusModal.css";

const TONE_ICON = {
  green: CheckCircle2,
  yellow: AlertTriangle,
  orange: AlertCircle,
  red: XCircle,
};

const getErrorMessage = (err, fallback) => {
  const detail = err?.response?.data?.detail;
  if (Array.isArray(detail)) return detail.map((d) => d.msg).join(", ");
  return detail || err?.message || fallback;
};

export default function AccountStatusModal({ onClose, onNavigate }) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [requestError, setRequestError] = useState("");

  const [closing, setClosing] = useState(false);
  const closeTimer = useRef(null);

  // ---------- close (with exit animation) ----------
  const requestClose = useCallback(() => {
    if (closeTimer.current) return;
    setClosing(true);
    closeTimer.current = setTimeout(onClose, 180);
  }, [onClose]);

  useEffect(() => () => clearTimeout(closeTimer.current), []);

  // Escape key
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "Escape") requestClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [requestClose]);

  // Lock page scroll while open
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  // ---------- load real status ----------
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        setLoadError("");
        const res = await api.get("/me/account-status");
        if (!cancelled) setStatus(res.data);
      } catch (err) {
        console.error("Error loading account status:", err);
        if (!cancelled) {
          setLoadError(getErrorMessage(err, "Unable to load account status."));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // ---------- navigation (dashboard closes the modal and switches page) ----------
  const goTo = (pageKey) => {
    try {
      onNavigate?.(pageKey);
    } catch (err) {
      console.error("Navigation failed:", err);
    }
  };

  // ---------- request verification ----------
  const handleRequestVerification = async () => {
    if (submitting || status?.verificationRequested) return;

    try {
      setSubmitting(true);
      setRequestError("");
      await api.post("/me/verification-request", {});
      setStatus((prev) => ({ ...prev, verificationRequested: true }));
    } catch (err) {
      console.error("Error sending verification request:", err);
      if (err?.response?.status === 409) {
        // Already pending on the server, so just reflect that
        setStatus((prev) => ({ ...prev, verificationRequested: true }));
      } else {
        setRequestError(
          "Unable to send verification request. Please try again.",
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  // ---------- build rows ----------
  const buildRows = (s) => {
    const rows = [];

    // 1. Account
    rows.push(
      s.isActive
        ? { key: "account", label: "Account", value: "Active", tone: "green" }
        : {
            key: "account",
            label: "Account",
            value: "Restricted",
            tone: "red",
            description: "Your account currently has restricted access.",
            action: {
              label: "Contact Support",
              onClick: () => goTo("help"),
            },
          },
    );

    // 2. Profile
    rows.push(
      s.profileComplete
        ? { key: "profile", label: "Profile", value: "Complete", tone: "green" }
        : {
            key: "profile",
            label: "Profile",
            value: "Incomplete",
            tone: "orange",
            description: "Some required profile information is missing.",
            action: {
              label: "Complete Your Profile",
              onClick: () => goTo("profile"),
            },
          },
    );

    // 3. Banking
    rows.push(
      s.bankingAdded
        ? {
            key: "banking",
            label: "Banking Details",
            value: "Added",
            tone: "green",
          }
        : {
            key: "banking",
            label: "Banking Details",
            value: "Not Added",
            tone: "orange",
            description: "Your banking details have not been added yet.",
            action: {
              label: "Add Banking Details",
              onClick: () => goTo("profile"), // banking lives in the profile wizard
            },
          },
    );

    // 4. Sangha
    rows.push(
      s.sanghaName
        ? {
            key: "sangha",
            label: "Sangha",
            value: s.sanghaName,
            tone: "green",
          }
        : {
            key: "sangha",
            label: "Sangha",
            value: "Not Assigned",
            tone: "orange",
            description: "You are not currently assigned to a Sangha.",
            action: {
              label: "View Sanghas",
              onClick: () => goTo("sangha"),
            },
          },
    );

    // 5. Identity verification
    if (s.isVerified) {
      rows.push({
        key: "verification",
        label: "Identity Verification",
        value: "Verified",
        tone: "green",
      });
    } else if (s.verificationRequested) {
      rows.push({
        key: "verification",
        label: "Identity Verification",
        value: "Verification Request Sent",
        tone: "green",
        description:
          "Your verification request has been sent to the SuperAdmin.",
        verifyButton: "sent",
      });
    } else {
      rows.push({
        key: "verification",
        label: "Identity Verification",
        value: "Verification Pending",
        tone: "yellow",
        description: "Your account has not been verified yet.",
        verifyButton: "request",
      });
    }

    return rows;
  };

  const rows = status ? buildRows(status) : [];

  const fullySetUp =
    !!status &&
    status.isActive &&
    status.isVerified &&
    status.profileComplete &&
    status.bankingAdded &&
    !!status.sanghaName;

  return (
    <div
      className={`as-overlay ${closing ? "as-overlay--closing" : ""}`}
      onMouseDown={(e) => e.target === e.currentTarget && requestClose()}
    >
      <div
        className={`as-modal ${closing ? "as-modal--closing" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="as-title"
      >
        {/* HEADER */}
        <div className="as-header">
          <div>
            <h2 id="as-title">Account Status</h2>
            <p>Your account verification and profile status</p>
          </div>

          <button
            type="button"
            className="as-close"
            onClick={requestClose}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* BODY */}
        <div className="as-body">
          {loading ? (
            <div className="as-state">
              <Loader2 size={26} className="as-spin" />
              <p>Loading account status...</p>
            </div>
          ) : loadError ? (
            <div className="as-alert as-alert--error">{loadError}</div>
          ) : (
            <>
              <ul className="as-list">
                {rows.map((row) => {
                  const Icon = TONE_ICON[row.tone];
                  return (
                    <li key={row.key} className="as-row">
                      <span className={`as-row__icon as-tone--${row.tone}`}>
                        <Icon size={18} strokeWidth={2.2} />
                      </span>

                      <div className="as-row__text">
                        <span className="as-row__label">{row.label}</span>
                        <strong
                          className={`as-row__value as-text--${row.tone}`}
                        >
                          {row.value}
                        </strong>

                        {row.description && (
                          <p className="as-row__desc">{row.description}</p>
                        )}

                        {/* Navigation action */}
                        {row.action && (
                          <button
                            type="button"
                            className="as-action"
                            onClick={row.action.onClick}
                          >
                            {row.action.label}
                            <ArrowRight size={15} />
                          </button>
                        )}

                        {/* Verification action */}
                        {row.verifyButton === "request" && (
                          <>
                            {!status.canRequestVerification && (
                              <p className="as-hint">
                                Complete your profile and banking details first
                                to request verification.
                              </p>
                            )}

                            {requestError && (
                              <div className="as-alert as-alert--error">
                                {requestError}
                              </div>
                            )}

                            <button
                              type="button"
                              className="as-action as-action--primary"
                              onClick={handleRequestVerification}
                              disabled={
                                submitting || !status.canRequestVerification
                              }
                            >
                              {submitting ? (
                                <>
                                  <Loader2 size={15} className="as-spin" />
                                  Sending Request...
                                </>
                              ) : (
                                <>
                                  <Send size={15} />
                                  Request to Verify My Account
                                </>
                              )}
                            </button>
                          </>
                        )}

                        {row.verifyButton === "sent" && (
                          <button
                            type="button"
                            className="as-action as-action--sent"
                            disabled
                          >
                            Request Sent ✓
                          </button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>

              {/* COMPLETION MESSAGE */}
              {fullySetUp && (
                <div className="as-complete">
                  <PartyPopper size={22} />
                  <div>
                    <strong>Account Fully Set Up</strong>
                    <p>
                      Your profile, banking details, Sangha assignment and
                      verification are all complete.
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}