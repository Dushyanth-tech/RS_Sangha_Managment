import React, { useState, useEffect } from "react";
import api from "../../../../api/axiosInstance";
import {
  Users,
  Building2,
  ClipboardList,
  Check,
  AlertCircle,
  PiggyBank,
  HandCoins,
  BadgeCheck,
  UserCheck,
} from "lucide-react";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

import "./Overview.css";

// Matches the 20-member limit enforced by the backend.
const SANGHA_CAPACITY = 20;

/* =========================================================
   HELPERS
========================================================= */

function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}") || {};
  } catch {
    return {};
  }
}

function getGreeting() {
  const hour = new Date().getHours();

  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";

  return "Good evening";
}

/* =========================================================
   STAT TILE
========================================================= */

function StatTile({
  icon: Icon,
  label,
  value,
  loading,
  failed,
  attention,
}) {
  return (
    <div className="ao-stat">
      <div
        className={`ao-stat__icon ${
          attention ? "ao-stat__icon--attention" : ""
        }`}
      >
        <Icon size={20} strokeWidth={2} />
      </div>

      <div className="ao-stat__body">
        <span className="ao-stat__label">{label}</span>

        {loading ? (
          <span className="ao-skeleton ao-skeleton--value" />
        ) : (
          <span className="ao-stat__value">
            {failed ? "—" : value}
          </span>
        )}
      </div>
    </div>
  );
}

/* =========================================================
   SMALL SUMMARY CARD
========================================================= */

function SummaryCard({
  icon: Icon,
  title,
  value,
  description,
  loading = false,
  failed = false,
  attention = false,
}) {
  return (
    <div className="ao-summary-card">
      <div
        className={`ao-summary-card__icon ${
          attention ? "ao-summary-card__icon--attention" : ""
        }`}
      >
        <Icon size={20} strokeWidth={2} />
      </div>

      <div className="ao-summary-card__content">
        <span className="ao-summary-card__label">{title}</span>

        {loading ? (
          <span className="ao-skeleton ao-skeleton--value" />
        ) : (
          <strong className="ao-summary-card__value">
            {failed ? "—" : value}
          </strong>
        )}

        {description && (
          <span className="ao-summary-card__description">
            {description}
          </span>
        )}
      </div>
    </div>
  );
}

/* =========================================================
   MAIN OVERVIEW
========================================================= */

export default function Overview() {
  /* =======================================================
     SANGHA DATA
  ======================================================= */

  const [sanghas, setSanghas] = useState([]);

  const [sanghasLoading, setSanghasLoading] = useState(true);
  const [sanghasFailed, setSanghasFailed] = useState(false);

  /* =======================================================
     ADMIN REQUEST DATA
  ======================================================= */

  const [pendingCount, setPendingCount] = useState(0);

  const [pendingLoading, setPendingLoading] = useState(true);
  const [pendingFailed, setPendingFailed] = useState(false);

  /* =======================================================
     SAVINGS DATA

     These are intentionally kept ready for the real
     Savings Account API.

     We do NOT invent an endpoint here.
  ======================================================= */

  const [savingsAccounts, setSavingsAccounts] = useState([]);

  const [savingsLoading, setSavingsLoading] = useState(false);
  const [savingsFailed, setSavingsFailed] = useState(false);

  /* =======================================================
     LOAN REQUEST DATA

     Ready for the existing Loan Request API.
  ======================================================= */

  const [loanRequests, setLoanRequests] = useState([]);

  const [loanRequestsLoading, setLoanRequestsLoading] =
    useState(false);

  const [loanRequestsFailed, setLoanRequestsFailed] =
    useState(false);

  /* =======================================================
     LOAN APPROVAL DATA

     Ready for the existing Loan Approval API.
  ======================================================= */

  const [loanApprovals, setLoanApprovals] = useState([]);

  const [loanApprovalsLoading, setLoanApprovalsLoading] =
    useState(false);

  const [loanApprovalsFailed, setLoanApprovalsFailed] =
    useState(false);

  /* =======================================================
     FETCH CURRENT ADMIN'S SANGHAS
  ======================================================= */

  useEffect(() => {
    api
      .get("/sanghas")
      .then((res) => {
        const data = Array.isArray(res.data)
          ? res.data
          : [];

        setSanghas(data);
      })
      .catch(() => {
        setSanghasFailed(true);
      })
      .finally(() => {
        setSanghasLoading(false);
      });
  }, []);

  /* =======================================================
     FETCH PENDING ADMIN REQUEST COUNT
  ======================================================= */

  useEffect(() => {
    api
      .get("/admin-requests/pending-count")
      .then((res) => {
        setPendingCount(
          res.data?.pending_count ?? 0
        );
      })
      .catch(() => {
        setPendingFailed(true);
      })
      .finally(() => {
        setPendingLoading(false);
      });
  }, []);

  /* =======================================================
     DERIVED SANGHA DATA
  ======================================================= */

  const totalMembers = sanghas.reduce(
    (sum, sangha) =>
      sum +
      Number(
        sangha.membersCount ??
          sangha.members_count ??
          0
      ),
    0
  );

  const totalSeats =
    sanghas.length * SANGHA_CAPACITY;

  const availableSeats = Math.max(
    totalSeats - totalMembers,
    0
  );

  const filledPercent = totalSeats
    ? Math.min(
        100,
        Math.round(
          (totalMembers / totalSeats) * 100
        )
      )
    : 0;

  const fullSanghas = sanghas.filter((sangha) => {
    const count =
      sangha.membersCount ??
      sangha.members_count ??
      0;

    return count >= SANGHA_CAPACITY;
  }).length;

  const availableSanghas =
    sanghas.length - fullSanghas;

  /* =======================================================
     MEMBERSHIP CHART DATA
  ======================================================= */

  const membershipChartData = sanghas.map(
    (sangha) => ({
      name: sangha.name,
      members:
        Number(
          sangha.membersCount ??
            sangha.members_count ??
            0
        ),
    })
  );

  /* =======================================================
     SAVINGS DERIVED DATA

     Will automatically work once real savings data
     is connected.
  ======================================================= */

  const totalSavingsAccounts =
    savingsAccounts.length;

  const totalSavingsBalance =
    savingsAccounts.reduce(
      (sum, account) =>
        sum +
        Number(
          account.bank_balance ??
            account.bankBalance ??
            account.balance ??
            0
        ),
      0
    );

  /* =======================================================
     LOAN DERIVED DATA
  ======================================================= */

  const totalLoanRequests =
    loanRequests.length;

  const pendingLoanRequests =
    loanRequests.filter((loan) => {
      const status = String(
        loan.status ?? ""
      ).toLowerCase();

      return status === "pending";
    }).length;

  const approvedLoanRequests =
    loanRequests.filter((loan) => {
      const status = String(
        loan.status ?? ""
      ).toLowerCase();

      return status === "approved";
    }).length;

  const rejectedLoanRequests =
    loanRequests.filter((loan) => {
      const status = String(
        loan.status ?? ""
      ).toLowerCase();

      return status === "rejected";
    }).length;

  /* =======================================================
     LOAN APPROVAL DERIVED DATA
  ======================================================= */

  const totalLoanApprovals =
    loanApprovals.length;

  const pendingApprovals =
    loanApprovals.filter((loan) => {
      const status = String(
        loan.status ?? ""
      ).toLowerCase();

      return status === "pending";
    }).length;

  const approvedLoans =
    loanApprovals.filter((loan) => {
      const status = String(
        loan.status ?? ""
      ).toLowerCase();

      return status === "approved";
    }).length;

  const rejectedLoans =
    loanApprovals.filter((loan) => {
      const status = String(
        loan.status ?? ""
      ).toLowerCase();

      return status === "rejected";
    }).length;

  /* =======================================================
     USER / HEADER
  ======================================================= */

  const storedUser = getStoredUser();

  const firstName = (
    storedUser.fullname || ""
  )
    .trim()
    .split(" ")[0];

  const greeting = getGreeting();

  let sanghaLine = "";

  if (
    !sanghasLoading &&
    !sanghasFailed
  ) {
    if (sanghas.length === 1) {
      sanghaLine = sanghas[0].name;
    } else if (sanghas.length > 1) {
      sanghaLine = `Managing ${sanghas.length} sanghas`;
    } else {
      sanghaLine =
        "No sanghas assigned yet";
    }
  }

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="sa-page ao-page">

      {/* ===================================================
          HEADER
      =================================================== */}

      <header className="ao-header">
        <p className="ao-header__eyebrow">
          Admin Dashboard
        </p>

        <h1 className="ao-header__title">
          {greeting}
          {firstName
            ? `, ${firstName}`
            : ""}
        </h1>

        {sanghaLine && (
          <p className="ao-header__sub">
            <Building2
              size={15}
              strokeWidth={2}
            />

            <span>
              {sanghaLine}
            </span>
          </p>
        )}
      </header>

      {/* ===================================================
          GLOBAL ALERT
      =================================================== */}

      {(sanghasFailed ||
        pendingFailed ||
        savingsFailed ||
        loanRequestsFailed ||
        loanApprovalsFailed) && (
        <div
          className="ao-alert"
          role="alert"
        >
          <AlertCircle
            size={16}
            strokeWidth={2}
          />

          <span>
            Some information couldn't be
            loaded. Refresh the page to try
            again.
          </span>
        </div>
      )}

      {/* ===================================================
          TOP STATISTICS
      =================================================== */}

      <section
        className="ao-stats"
        aria-label="Overview statistics"
      >

        <StatTile
          icon={Building2}
          label="Sanghas Managed"
          value={sanghas.length}
          loading={sanghasLoading}
          failed={sanghasFailed}
        />

        <StatTile
          icon={Users}
          label="Total Members"
          value={totalMembers}
          loading={sanghasLoading}
          failed={sanghasFailed}
        />

        <StatTile
          icon={PiggyBank}
          label="Savings Accounts"
          value={totalSavingsAccounts}
          loading={savingsLoading}
          failed={savingsFailed}
        />

        <StatTile
          icon={ClipboardList}
          label="Pending Admin Requests"
          value={pendingCount}
          loading={pendingLoading}
          failed={pendingFailed}
          attention={
            pendingCount > 0
          }
        />
      </section>

      {/* ===================================================
          MEMBERSHIP CHART
      =================================================== */}

      <section className="ao-charts">

        <div className="ao-chart-card">

          <div className="ao-chart-card__header">

            <div>
              <p className="ao-chart-card__eyebrow">
                Membership
              </p>

              <h2>
                Sangha Members
              </h2>
            </div>

            <div className="ao-chart-card__badge">
              <Users size={16} />

              <span>
                {totalMembers} members
              </span>
            </div>

          </div>

          {sanghasLoading ? (
            <div className="ao-chart-loading">
              Loading membership chart...
            </div>
          ) : sanghasFailed ? (
            <div className="ao-chart-empty">
              Unable to load membership data.
            </div>
          ) : sanghas.length === 0 ? (
            <div className="ao-chart-empty">
              No Sangha data available.
            </div>
          ) : (
            <div className="ao-chart">

              <ResponsiveContainer
                width="100%"
                height={300}
              >
                <BarChart
                  data={
                    membershipChartData
                  }
                  margin={{
                    top: 10,
                    right: 10,
                    left: 0,
                    bottom: 10,
                  }}
                >

                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                  />

                  <XAxis
                    dataKey="name"
                    tick={{
                      fontSize: 12,
                    }}
                    tickLine={false}
                    axisLine={false}
                  />

                  <YAxis
                    allowDecimals={false}
                    domain={[
                      0,
                      SANGHA_CAPACITY,
                    ]}
                    tick={{
                      fontSize: 12,
                    }}
                    tickLine={false}
                    axisLine={false}
                  />

                  <Tooltip
                    cursor={{
                      opacity: 0.08,
                    }}
                    formatter={(
                      value
                    ) => [
                      `${value} members`,
                      "Members",
                    ]}
                  />

                  <Bar
                    dataKey="members"
                    name="Members"
                    radius={[
                      6,
                      6,
                      0,
                      0,
                    ]}
                    maxBarSize={55}
                  />

                </BarChart>
              </ResponsiveContainer>

            </div>
          )}

        </div>

      </section>

      {/* ===================================================
          SUMMARY CARDS
      =================================================== */}

      <section className="ao-summary-grid">

        {/* MEMBERSHIP */}

        <SummaryCard
          icon={Users}
          title="Available Seats"
          value={
            sanghasLoading
              ? "—"
              : availableSeats
          }
          description={
            sanghasLoading
              ? ""
              : `Across ${sanghas.length} sangha${
                  sanghas.length === 1
                    ? ""
                    : "s"
                }`
          }
          loading={sanghasLoading}
          failed={sanghasFailed}
        />

        {/* FULL SANGHAS */}

        <SummaryCard
          icon={Building2}
          title="Full Sanghas"
          value={
            sanghasLoading
              ? "—"
              : fullSanghas
          }
          description={
            sanghasLoading
              ? ""
              : `${availableSanghas} with available seats`
          }
          loading={sanghasLoading}
          failed={sanghasFailed}
        />

        {/* SAVINGS */}

        <SummaryCard
          icon={PiggyBank}
          title="Savings Balance"
          value={
            savingsAccounts.length === 0
              ? "₹0"
              : `₹${totalSavingsBalance.toLocaleString(
                  "en-IN"
                )}`
          }
          description="Total recorded balance"
          loading={savingsLoading}
          failed={savingsFailed}
        />

        {/* LOANS */}

        <SummaryCard
          icon={HandCoins}
          title="Loan Requests"
          value={
            totalLoanRequests
          }
          description={`${pendingLoanRequests} pending`}
          loading={
            loanRequestsLoading
          }
          failed={
            loanRequestsFailed
          }
          attention={
            pendingLoanRequests > 0
          }
        />

      </section>

      {/* ===================================================
          MAIN CONTENT
      =================================================== */}

      <div className="ao-grid">

        {/* =================================================
            YOUR SANGHAS
        ================================================= */}

        <section className="ao-card">

          <header className="ao-card__header">

            <h2>
              Your Sanghas
            </h2>

            {!sanghasLoading &&
              !sanghasFailed && (
                <span className="ao-card__count">
                  {sanghas.length}
                </span>
              )}

          </header>

          {sanghasLoading ? (

            <ul className="ao-list">

              {[0, 1, 2].map(
                (i) => (
                  <li
                    key={i}
                    className="ao-sangha"
                  >

                    <div className="ao-sangha__main">

                      <span className="ao-skeleton ao-skeleton--line" />

                      <span className="ao-skeleton ao-skeleton--line ao-skeleton--short" />

                    </div>

                    <span className="ao-skeleton ao-skeleton--line" />

                  </li>
                )
              )}

            </ul>

          ) : sanghasFailed ? (

            <p className="ao-empty__text">
              Your sanghas couldn't
              be loaded.
            </p>

          ) : sanghas.length === 0 ? (

            <div className="ao-empty">

              <div className="ao-empty__icon">
                <Building2
                  size={22}
                  strokeWidth={1.8}
                />
              </div>

              <p className="ao-empty__title">
                No sanghas yet
              </p>

              <p className="ao-empty__text">
                Sanghas you manage
                will appear here.
              </p>

            </div>

          ) : (

            <ul className="ao-list">

              {sanghas.map(
                (sangha) => {

                  const count =
                    sangha.membersCount ??
                    sangha.members_count ??
                    0;

                  const pct =
                    Math.min(
                      100,
                      Math.round(
                        (count /
                          SANGHA_CAPACITY) *
                          100
                      )
                    );

                  const isFull =
                    count >=
                    SANGHA_CAPACITY;

                  const meta = [
                    sangha.code,
                    sangha.subadmin_name
                      ? `Subadmin: ${sangha.subadmin_name}`
                      : null,
                  ]
                    .filter(Boolean)
                    .join(" · ");

                  return (
                    <li
                      key={sangha.id}
                      className="ao-sangha"
                    >

                      <div className="ao-sangha__main">

                        <span className="ao-sangha__name">
                          {sangha.name}
                        </span>

                        {meta && (
                          <span className="ao-sangha__meta">
                            {meta}
                          </span>
                        )}

                      </div>

                      <div className="ao-sangha__capacity">

                        <div className="ao-sangha__count">

                          <span>
                            {count} /{" "}
                            {SANGHA_CAPACITY}{" "}
                            members
                          </span>

                          {isFull && (
                            <span className="ao-tag">
                              Full
                            </span>
                          )}

                        </div>

                        <div
                          className="ao-bar"
                          role="progressbar"
                          aria-label={`${sangha.name} membership`}
                          aria-valuemin={0}
                          aria-valuemax={
                            SANGHA_CAPACITY
                          }
                          aria-valuenow={Math.min(
                            count,
                            SANGHA_CAPACITY
                          )}
                        >

                          <div
                            className={`ao-bar__fill ${
                              isFull
                                ? "ao-bar__fill--full"
                                : ""
                            }`}
                            style={{
                              width: `${pct}%`,
                            }}
                          />

                        </div>

                      </div>

                    </li>
                  );
                }
              )}

            </ul>
          )}

        </section>

        {/* =================================================
            RIGHT SIDE
        ================================================= */}

        <div className="ao-side">

          {/* ===============================================
              ADMIN REQUESTS
          =============================================== */}

          <section className="ao-card">

            <header className="ao-card__header">

              <h2>
                Pending Requests
              </h2>

            </header>

            {pendingLoading ? (

              <span className="ao-skeleton ao-skeleton--line" />

            ) : pendingFailed ? (

              <p className="ao-empty__text">
                Request status
                couldn't be loaded.
              </p>

            ) : (

              <div className="ao-pending">

                <div
                  className={`ao-pending__icon ${
                    pendingCount > 0
                      ? "ao-pending__icon--attention"
                      : ""
                  }`}
                >

                  {pendingCount > 0 ? (
                    <ClipboardList
                      size={20}
                      strokeWidth={2}
                    />
                  ) : (
                    <Check
                      size={20}
                      strokeWidth={2.2}
                    />
                  )}

                </div>

                <div>

                  <p className="ao-pending__title">

                    {pendingCount > 0
                      ? `${pendingCount} request${
                          pendingCount ===
                          1
                            ? ""
                            : "s"
                        } pending`
                      : "All caught up"}

                  </p>

                  <p className="ao-pending__text">

                    {pendingCount > 0
                      ? "Waiting for Super Admin review."
                      : "No requests are waiting for review."}

                  </p>

                </div>

              </div>
            )}

          </section>

          {/* ===============================================
              MEMBERSHIP CAPACITY
          =============================================== */}

          {!sanghasLoading &&
            !sanghasFailed &&
            sanghas.length > 0 && (

              <section className="ao-card">

                <header className="ao-card__header">

                  <h2>
                    Membership Capacity
                  </h2>

                </header>

                <p className="ao-capacity__figure">

                  <strong>
                    {totalMembers}
                  </strong>{" "}
                  of {totalSeats} seats
                  filled

                </p>

                <div
                  className="ao-bar ao-bar--lg"
                  role="progressbar"
                  aria-label="Total membership capacity"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={
                    filledPercent
                  }
                >

                  <div
                    className="ao-bar__fill"
                    style={{
                      width: `${filledPercent}%`,
                    }}
                  />

                </div>

                <p className="ao-capacity__note">

                  Across{" "}
                  {sanghas.length}{" "}
                  sangha
                  {sanghas.length ===
                  1
                    ? ""
                    : "s"}
                  , up to{" "}
                  {SANGHA_CAPACITY}{" "}
                  members each.

                </p>

              </section>
            )}

        </div>
      </div>

      {/* ===================================================
          SAVINGS ACCOUNT SECTION
      =================================================== */}

      <section className="ao-feature-section">

        <div className="ao-feature-section__header">

          <div>
            <p className="ao-chart-card__eyebrow">
              Financial Management
            </p>

            <h2>
              Savings Accounts
            </h2>

            <p>
              Monitor savings accounts
              created for your Sanghas.
            </p>
          </div>

          <div className="ao-feature-icon">
            <PiggyBank
              size={22}
            />
          </div>

        </div>

        <div className="ao-feature-grid">

          <SummaryCard
            icon={PiggyBank}
            title="Total Accounts"
            value={
              totalSavingsAccounts
            }
            description="Created savings accounts"
            loading={
              savingsLoading
            }
            failed={
              savingsFailed
            }
          />

          <SummaryCard
            icon={PiggyBank}
            title="Total Balance"
            value={`₹${totalSavingsBalance.toLocaleString(
              "en-IN"
            )}`}
            description="Current recorded balance"
            loading={
              savingsLoading
            }
            failed={
              savingsFailed
            }
          />

        </div>

        <div className="ao-feature-empty">

          <PiggyBank
            size={24}
            strokeWidth={1.8}
          />

          <div>
            <strong>
              Savings Account
              chart ready
            </strong>

            <p>
              Connect this section to
              your existing Savings
              Account API to display
              each Sangha's balance.
            </p>
          </div>

        </div>

      </section>

      {/* ===================================================
          LOAN REQUEST SECTION
      =================================================== */}

      <section className="ao-feature-section">

        <div className="ao-feature-section__header">

          <div>
            <p className="ao-chart-card__eyebrow">
              Loan Management
            </p>

            <h2>
              Loan Requests
            </h2>

            <p>
              Track loan requests from
              your Sangha members.
            </p>
          </div>

          <div className="ao-feature-icon">
            <HandCoins
              size={22}
            />
          </div>

        </div>

        <div className="ao-feature-grid">

          <SummaryCard
            icon={HandCoins}
            title="Total Requests"
            value={
              totalLoanRequests
            }
            description="All loan requests"
            loading={
              loanRequestsLoading
            }
            failed={
              loanRequestsFailed
            }
          />

          <SummaryCard
            icon={ClipboardList}
            title="Pending"
            value={
              pendingLoanRequests
            }
            description="Waiting for review"
            loading={
              loanRequestsLoading
            }
            failed={
              loanRequestsFailed
            }
            attention={
              pendingLoanRequests >
              0
            }
          />

          <SummaryCard
            icon={Check}
            title="Approved"
            value={
              approvedLoanRequests
            }
            description="Approved requests"
            loading={
              loanRequestsLoading
            }
            failed={
              loanRequestsFailed
            }
          />

          <SummaryCard
            icon={AlertCircle}
            title="Rejected"
            value={
              rejectedLoanRequests
            }
            description="Rejected requests"
            loading={
              loanRequestsLoading
            }
            failed={
              loanRequestsFailed
            }
          />

        </div>

      </section>

      {/* ===================================================
          LOAN APPROVAL SECTION
      =================================================== */}

      <section className="ao-feature-section">

        <div className="ao-feature-section__header">

          <div>
            <p className="ao-chart-card__eyebrow">
              Approval Management
            </p>

            <h2>
              Loan Approvals
            </h2>

            <p>
              Monitor the status of loan
              approval activity.
            </p>
          </div>

          <div className="ao-feature-icon">
            <BadgeCheck
              size={22}
            />
          </div>

        </div>

        <div className="ao-feature-grid">

          <SummaryCard
            icon={BadgeCheck}
            title="Total Approvals"
            value={
              totalLoanApprovals
            }
            description="Approval records"
            loading={
              loanApprovalsLoading
            }
            failed={
              loanApprovalsFailed
            }
          />

          <SummaryCard
            icon={ClipboardList}
            title="Pending Approval"
            value={
              pendingApprovals
            }
            description="Waiting for decision"
            loading={
              loanApprovalsLoading
            }
            failed={
              loanApprovalsFailed
            }
            attention={
              pendingApprovals >
              0
            }
          />

          <SummaryCard
            icon={UserCheck}
            title="Approved"
            value={
              approvedLoans
            }
            description="Approved loans"
            loading={
              loanApprovalsLoading
            }
            failed={
              loanApprovalsFailed
            }
          />

          <SummaryCard
            icon={AlertCircle}
            title="Rejected"
            value={
              rejectedLoans
            }
            description="Rejected loans"
            loading={
              loanApprovalsLoading
            }
            failed={
              loanApprovalsFailed
            }
          />

        </div>

      </section>

    </div>
  );
}