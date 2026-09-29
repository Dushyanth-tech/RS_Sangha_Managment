import React, { useEffect, useMemo, useState } from "react";
import DataTable from "../../../../Common_Component/DataTable";
import api from "../../../../api/axiosInstance";
import "./SanghaSavingsAccount.css";

const SanghaSavingsAccount = () => {
  // ============================================================
  // STATE
  // ============================================================

  const [sanghas, setSanghas] = useState([]);
  const [savingsAccounts, setSavingsAccounts] = useState([]);

  const [selectedSangha, setSelectedSangha] = useState(null);

  const [showMembersModal, setShowMembersModal] = useState(false);
  const [showBankModal, setShowBankModal] = useState(false);

  const [members, setMembers] = useState([]);

  const [loadingSanghas, setLoadingSanghas] = useState(false);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [creatingAccount, setCreatingAccount] = useState(false);

  const [error, setError] = useState("");
  const [membersError, setMembersError] = useState("");

  const [formData, setFormData] = useState({
    sangha: "",
    accountHolder: "",
    bank: "",
    accountNumber: "",
    confirmAccountNumber: "",
    ifsc: "",
    branch: "",
    accountType: "Savings",
  });

  // ============================================================
  // ERROR MESSAGE
  // ============================================================

  const getErrorMessage = (err, fallback = "Something went wrong.") => {
    const detail = err?.response?.data?.detail;
    if (Array.isArray(detail)) return detail.map((d) => d.msg).join(", ");
    return detail || err?.response?.data?.message || err?.message || fallback;
  };

  // ============================================================
  // FETCH SANGHAS
  //
  // IMPORTANT:
  // Uses your existing GET /sanghas endpoint.
  // No duplicate Sangha endpoint is created.
  // ============================================================

  const fetchSanghas = async () => {
    try {
      setLoadingSanghas(true);
      setError("");

      const response = await api.get("/sanghas");

      const data = Array.isArray(response.data)
        ? response.data
        : response.data?.sanghas || [];

      setSanghas(data);
    } catch (err) {
      console.error("Error fetching Sanghas:", err);

      setError(getErrorMessage(err, "Unable to load Sanghas."));
    } finally {
      setLoadingSanghas(false);
    }
  };

  // ============================================================
  // FETCH SAVINGS ACCOUNTS
  //
  // Data comes from database.
  // No fake/default accounts.
  // ============================================================

  const fetchSavingsAccounts = async () => {
    try {
      setLoadingAccounts(true);
      setError("");

      const response = await api.get("/sangha-savings-accounts");

      const data = Array.isArray(response.data)
        ? response.data
        : response.data?.accounts || [];

      setSavingsAccounts(data);
    } catch (err) {
      console.error("Error fetching savings accounts:", err);

      setError(getErrorMessage(err, "Unable to load savings accounts."));
    } finally {
      setLoadingAccounts(false);
    }
  };

  // ============================================================
  // INITIAL LOAD
  // ============================================================

  useEffect(() => {
    fetchSanghas();
    fetchSavingsAccounts();
  }, []);

  // ============================================================
  // SANGHAS AVAILABLE FOR CREATION
  //
  // A Sangha which already has a savings account is disabled.
  // ============================================================

  const availableSanghas = useMemo(() => {
    const existingSanghaIds = new Set(
      savingsAccounts.map((account) => account.sanghaId).filter(Boolean),
    );

    const existingSanghaCodes = new Set(
      savingsAccounts.map((account) => account.sanghaCode).filter(Boolean),
    );

    return sanghas.filter((sangha) => {
      if (sangha.id && existingSanghaIds.has(sangha.id)) {
        return false;
      }

      if (sangha.code && existingSanghaCodes.has(sangha.code)) {
        return false;
      }

      return true;
    });
  }, [sanghas, savingsAccounts]);

  // ============================================================
  // FORM CHANGE
  // ============================================================

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  // ============================================================
  // SANGHA CHANGE
  //
  // Account holder automatically becomes Sangha name.
  // ============================================================

  const handleSanghaChange = (event) => {
    const sanghaId = event.target.value;

    const selected = sanghas.find(
      (sangha) => String(sangha.id) === String(sanghaId),
    );

    setFormData((previous) => ({
      ...previous,
      sangha: sanghaId,
      accountHolder: selected?.name || "",
    }));
  };

  // ============================================================
  // CREATE SAVINGS ACCOUNT
  // ============================================================

  const handleCreateAccount = async (event) => {
    event.preventDefault();

    setError("");

    // ----------------------------------------------------------
    // BASIC VALIDATION
    // ----------------------------------------------------------

    if (!formData.sangha) {
      alert("Please select a Sangha.");
      return;
    }

    if (!formData.accountNumber) {
      alert("Please enter the account number.");
      return;
    }

    if (!formData.confirmAccountNumber) {
      alert("Please confirm the account number.");
      return;
    }

    if (formData.accountNumber !== formData.confirmAccountNumber) {
      alert("Account numbers do not match.");
      return;
    }

    if (!formData.bank.trim()) {
      alert("Please enter the bank name.");
      return;
    }

    if (!formData.ifsc.trim()) {
      alert("Please enter the IFSC code.");
      return;
    }

    if (!formData.branch.trim()) {
      alert("Please enter the branch name.");
      return;
    }

    // ----------------------------------------------------------
    // ACCOUNT NUMBER VALIDATION
    // ----------------------------------------------------------

    const accountNumber = formData.accountNumber.replace(/\D/g, "");

    if (accountNumber.length < 9 || accountNumber.length > 18) {
      alert("Account number must contain between 9 and 18 digits.");
      return;
    }

    // ----------------------------------------------------------
    // IFSC VALIDATION
    // ----------------------------------------------------------

    const ifsc = formData.ifsc.trim().toUpperCase();

    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc)) {
      alert("Please enter a valid IFSC code.");
      return;
    }

    // ----------------------------------------------------------
    // FIND SANGHA
    // ----------------------------------------------------------

    const selected = sanghas.find(
      (sangha) => String(sangha.id) === String(formData.sangha),
    );

    if (!selected) {
      alert("Selected Sangha was not found.");
      return;
    }

    // ----------------------------------------------------------
    // FRONTEND DUPLICATE CHECK
    //
    // Backend MUST also enforce this.
    // ----------------------------------------------------------

    const alreadyExists = savingsAccounts.some(
      (account) =>
        String(account.sanghaId) === String(selected.id) ||
        account.sanghaCode === selected.code,
    );

    if (alreadyExists) {
      alert("A savings account already exists for this Sangha.");
      return;
    }

    // ----------------------------------------------------------
    // SEND TO BACKEND
    //
    // IMPORTANT:
    // We DO NOT send balance.
    //
    // Backend must ALWAYS create:
    // balance = ₹0
    // ----------------------------------------------------------

    const payload = {
      sangha_id: Number(selected.id),
      account_holder: formData.accountHolder.trim(),
      bank: formData.bank.trim(),
      account_number: accountNumber,
      ifsc: ifsc,
      branch: formData.branch.trim(),
      account_type: formData.accountType,
    };

    try {
      setCreatingAccount(true);

      await api.post("/sangha-savings-accounts", payload);

      // --------------------------------------------------------
      // GET REAL DATA FROM DATABASE AGAIN
      // --------------------------------------------------------

      await fetchSavingsAccounts();

      // --------------------------------------------------------
      // RESET FORM
      // --------------------------------------------------------

      setFormData({
        sangha: "",
        accountHolder: "",
        bank: "",
        accountNumber: "",
        confirmAccountNumber: "",
        ifsc: "",
        branch: "",
        accountType: "Savings",
      });

      alert(
        `${selected.name} savings account created successfully. Initial balance is ₹0.`,
      );
    } catch (err) {
      console.error("Error creating savings account:", err);

      alert(getErrorMessage(err, "Unable to create savings account."));
    } finally {
      setCreatingAccount(false);
    }
  };

  // ============================================================
  // FETCH MEMBERS
  //
  // Backend uses:
  // User.sangha_id == sangha_id
  //
  // and BankDetails.user_id == member.id
  // ============================================================

  const fetchMembers = async (sanghaId) => {
    try {
      setLoadingMembers(true);
      setMembersError("");
      setMembers([]);

      const response = await api.get(
        `/sangha-savings-accounts/${sanghaId}/members`,
      );

      const data = Array.isArray(response.data)
        ? response.data
        : response.data?.members || [];

      setMembers(data);
    } catch (err) {
      console.error("Error fetching Sangha members:", err);

      setMembersError(getErrorMessage(err, "Unable to load Sangha members."));
    } finally {
      setLoadingMembers(false);
    }
  };

  // ============================================================
  // OPEN MEMBERS MODAL
  // ============================================================

  const openMembersModal = async (sangha) => {
    setSelectedSangha(sangha);
    setShowMembersModal(true);
    setShowBankModal(false);

    if (sangha.sanghaId) {
      await fetchMembers(sangha.sanghaId);
    } else {
      setMembersError("Sangha ID is missing from the savings account data.");
    }
  };

  // ============================================================
  // OPEN BANK DETAILS MODAL
  //
  // Bank details already come from backend.
  // No additional request is necessary.
  // ============================================================

  const openBankModal = (sangha) => {
    setSelectedSangha(sangha);
    setShowBankModal(true);
    setShowMembersModal(false);
  };

  // ============================================================
  // CLOSE MODALS
  // ============================================================

  const closeModals = () => {
    setSelectedSangha(null);
    setShowMembersModal(false);
    setShowBankModal(false);
    setMembers([]);
    setMembersError("");
  };

  // ============================================================
  // MAIN TABLE COLUMNS
  // ============================================================

  const columns = [
    {
      key: "status",
      label: "Status",

      render: (row) => (
        <span
          className={`status-badge ${
            row.status === "Active" ? "status-active" : "status-deactive"
          }`}
        >
          {row.status}
        </span>
      ),
    },

    {
      key: "sanghaCode",
      label: "Sangha Code",

      render: (row) => (
        <span className="sangha-code">{row.sanghaCode || "—"}</span>
      ),
    },

    {
      key: "sanghaName",
      label: "Sangha Name",

      render: (row) => <span>{row.sanghaName || "—"}</span>,
    },

    {
      key: "admin",
      label: "Admin",

      render: (row) => <span>{row.admin || "—"}</span>,
    },

    {
      key: "members",
      label: "Members",

      render: (row) => (
        <span className="member-count">{row.membersCount ?? 0}</span>
      ),
    },
  ];

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="savings-page">
      {/* ======================================================
          HEADER
      ====================================================== */}

      <div className="savings-header">
        <div>
          <h1>Sangha Savings Account</h1>

          <p>
            Manage Sangha savings accounts and connected member bank details.
          </p>
        </div>
      </div>

      {/* ======================================================
          ERROR
      ====================================================== */}

      {error && <div className="savings-error">{error}</div>}

      {/* ======================================================
          CREATE ACCOUNT
      ====================================================== */}

      <section className="create-account-card">
        <div className="section-heading">
          <div className="section-icon">₹</div>

          <div>
            <h2>Create Savings Account</h2>

            <p>Create a savings account for a Sangha.</p>
          </div>
        </div>

        <form className="account-form" onSubmit={handleCreateAccount}>
          {/* SANGHA */}

          <div className="form-group">
            <label htmlFor="sangha">Sangha</label>

            <select
              id="sangha"
              name="sangha"
              value={formData.sangha}
              onChange={handleSanghaChange}
              disabled={loadingSanghas}
            >
              <option value="">
                {loadingSanghas
                  ? "Loading Sanghas..."
                  : availableSanghas.length === 0
                    ? "No Sanghas available"
                    : "Select Sangha"}
              </option>

              {sanghas.map((sangha) => {
                const accountExists = savingsAccounts.some(
                  (account) =>
                    String(account.sanghaId) === String(sangha.id) ||
                    account.sanghaCode === sangha.code,
                );

                return (
                  <option
                    key={sangha.id}
                    value={sangha.id}
                    disabled={accountExists}
                  >
                    {sangha.name}
                    {sangha.code ? ` (${sangha.code})` : ""}
                    {accountExists ? " — Account Exists" : ""}
                  </option>
                );
              })}
            </select>
          </div>

          {/* ACCOUNT HOLDER */}

          <div className="form-group">
            <label htmlFor="accountHolder">Account Holder Name</label>

            <input
              id="accountHolder"
              type="text"
              name="accountHolder"
              value={formData.accountHolder}
              onChange={handleChange}
              placeholder="Enter account holder name"
            />
          </div>

          {/* BANK */}

          <div className="form-group">
            <label htmlFor="bank">Bank</label>

            <input
              id="bank"
              type="text"
              name="bank"
              value={formData.bank}
              onChange={handleChange}
              placeholder="Enter bank name"
            />
          </div>

          {/* ACCOUNT NUMBER */}

          <div className="form-group">
            <label htmlFor="accountNumber">Account Number</label>

            <input
              id="accountNumber"
              type="text"
              name="accountNumber"
              value={formData.accountNumber}
              onChange={handleChange}
              placeholder="Enter account number"
              inputMode="numeric"
            />
          </div>

          {/* CONFIRM ACCOUNT NUMBER */}

          <div className="form-group">
            <label htmlFor="confirmAccountNumber">Confirm Account Number</label>

            <input
              id="confirmAccountNumber"
              type="text"
              name="confirmAccountNumber"
              value={formData.confirmAccountNumber}
              onChange={handleChange}
              placeholder="Confirm account number"
              inputMode="numeric"
            />
          </div>

          {/* IFSC */}

          <div className="form-group">
            <label htmlFor="ifsc">IFSC Code</label>

            <input
              id="ifsc"
              type="text"
              name="ifsc"
              value={formData.ifsc}
              onChange={handleChange}
              placeholder="Enter IFSC code"
              style={{
                textTransform: "uppercase",
              }}
            />
          </div>

          {/* BRANCH */}

          <div className="form-group">
            <label htmlFor="branch">Branch</label>

            <input
              id="branch"
              type="text"
              name="branch"
              value={formData.branch}
              onChange={handleChange}
              placeholder="Enter branch name"
            />
          </div>

          {/* ACCOUNT TYPE */}

          <div className="form-group">
            <label htmlFor="accountType">Account Type</label>

            <select
              id="accountType"
              name="accountType"
              value={formData.accountType}
              onChange={handleChange}
            >
              <option value="Savings">Savings</option>

              <option value="Current">Current</option>
            </select>
          </div>

          {/* SUBMIT */}

          <div className="form-actions">
            <button
              type="submit"
              className="create-account-btn"
              disabled={creatingAccount}
            >
              {creatingAccount ? "Creating..." : "Create Savings Account"}
            </button>
          </div>
        </form>
      </section>

      {/* ======================================================
          ACCOUNTS TABLE
      ====================================================== */}

      <section className="accounts-list-section">
        <div className="list-heading">
          <div>
            <h2>Sangha Savings Accounts</h2>

            <p>Existing savings accounts for Sanghas.</p>
          </div>

          <span className="total-accounts">
            {savingsAccounts.length}{" "}
            {savingsAccounts.length === 1 ? "Account" : "Accounts"}
          </span>
        </div>

        <div className="savings-table-card">
          {loadingAccounts ? (
            <div className="savings-loading">Loading savings accounts...</div>
          ) : (
            <DataTable
              columns={columns}
              rows={savingsAccounts}
              actions={(row) => (
                <div className="table-actions">
                  <button
                    type="button"
                    className="members-details-btn"
                    onClick={() => openMembersModal(row)}
                  >
                    Members Details
                  </button>

                  <button
                    type="button"
                    className="bank-details-btn"
                    onClick={() => openBankModal(row)}
                  >
                    Bank Details
                  </button>
                </div>
              )}
            />
          )}
        </div>
      </section>

      {/* ======================================================
          MEMBERS DETAILS MODAL
      ====================================================== */}

      {showMembersModal && selectedSangha && (
        <div className="modal-overlay" onClick={closeModals}>
          <div
            className="details-modal members-modal"
            onClick={(event) => event.stopPropagation()}
          >
            {/* HEADER */}

            <div className="modal-header">
              <div>
                <h2>Managed Members</h2>

                <p>
                  {selectedSangha.sanghaName} ({selectedSangha.sanghaCode})
                </p>
              </div>

              <button
                type="button"
                className="modal-close-btn"
                onClick={closeModals}
              >
                ×
              </button>
            </div>

            {/* SUMMARY */}

            <div className="modal-info">
              <div>
                <span>Admin</span>

                <strong>{selectedSangha.admin || "—"}</strong>
              </div>

              <div>
                <span>Total Members</span>

                <strong>{loadingMembers ? "..." : members.length}</strong>
              </div>
            </div>

            {/* ERROR */}

            {membersError && (
              <div className="savings-error">{membersError}</div>
            )}

            {/* MEMBERS TABLE */}

            <div className="modal-table-wrapper">
              {loadingMembers ? (
                <div className="savings-loading">Loading members...</div>
              ) : members.length === 0 ? (
                <div className="savings-empty">
                  No members found for this Sangha.
                </div>
              ) : (
                <table className="details-table">
                  <thead>
                    <tr>
                      <th>Member</th>
                      <th>Bank</th>
                      <th>Account Number</th>
                      <th>IFSC</th>
                      <th>Status</th>
                    </tr>
                  </thead>

                  <tbody>
                    {members.map((member) => (
                      <tr key={member.id}>
                        <td>
                          <div className="member-name">
                            <span className="member-avatar">
                              {(member.name || member.fullname || "M")
                                .charAt(0)
                                .toUpperCase()}
                            </span>

                            {member.name || member.fullname || "—"}
                          </div>
                        </td>

                        <td>{member.bank || member.bank_name || "—"}</td>

                        <td>
                          <span className="account-number">
                            {member.accountNumber ||
                              member.account_number ||
                              "—"}
                          </span>
                        </td>

                        <td>
                          <span className="ifsc-code">
                            {member.ifsc || member.ifsc_code || "—"}
                          </span>
                        </td>

                        <td>
                          <span
                            className={`status-badge ${
                              member.status === "Verified"
                                ? "status-verified"
                                : "status-unverified"
                            }`}
                          >
                            {member.status || "Unverified"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* FOOTER */}

            <div className="modal-footer">
              <button
                type="button"
                className="modal-done-btn"
                onClick={closeModals}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================
          BANK DETAILS MODAL
      ====================================================== */}

      {showBankModal && selectedSangha && (
        <div className="modal-overlay" onClick={closeModals}>
          <div
            className="details-modal bank-modal"
            onClick={(event) => event.stopPropagation()}
          >
            {/* HEADER */}

            <div className="modal-header">
              <div>
                <h2>Bank Details</h2>

                <p>
                  {selectedSangha.sanghaName} ({selectedSangha.sanghaCode})
                </p>
              </div>

              <button
                type="button"
                className="modal-close-btn"
                onClick={closeModals}
              >
                ×
              </button>
            </div>

            {/* BALANCE */}

            <div className="bank-balance-card">
              <div className="balance-info">
                <span>Current Bank Balance</span>

                <strong className="balance-value">
                  ₹
                  {Number(
                    selectedSangha.bankDetails?.balance || 0,
                  ).toLocaleString("en-IN")}
                </strong>
              </div>

              <span
                className={`status-badge ${
                  selectedSangha.bankDetails?.status === "Active"
                    ? "status-active"
                    : "status-deactive"
                }`}
              >
                {selectedSangha.bankDetails?.status || "Active"}
              </span>
            </div>

            {/* BANK DETAILS */}

            <div className="modal-table-wrapper">
              <table className="details-table">
                <thead>
                  <tr>
                    <th>Account Holder Name</th>
                    <th>Bank</th>
                    <th>Account Number</th>
                    <th>IFSC</th>
                    <th>Branch</th>
                    <th>Account Type</th>
                    <th>Bank Balance</th>
                    <th>Status</th>
                  </tr>
                </thead>

                <tbody>
                  <tr>
                    <td>{selectedSangha.bankDetails?.accountHolder || "—"}</td>

                    <td>{selectedSangha.bankDetails?.bank || "—"}</td>

                    <td>
                      <span className="account-number">
                        {selectedSangha.bankDetails?.accountNumber || "—"}
                      </span>
                    </td>

                    <td>
                      <span className="ifsc-code">
                        {selectedSangha.bankDetails?.ifsc || "—"}
                      </span>
                    </td>

                    <td>{selectedSangha.bankDetails?.branch || "—"}</td>

                    <td>{selectedSangha.bankDetails?.accountType || "—"}</td>

                    <td>
                      ₹
                      {Number(
                        selectedSangha.bankDetails?.balance || 0,
                      ).toLocaleString("en-IN")}
                    </td>

                    <td>
                      <span
                        className={`status-badge ${
                          selectedSangha.bankDetails?.status === "Active"
                            ? "status-active"
                            : "status-deactive"
                        }`}
                      >
                        {selectedSangha.bankDetails?.status || "Active"}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* FOOTER */}

            <div className="modal-footer">
              <button
                type="button"
                className="modal-done-btn"
                onClick={closeModals}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SanghaSavingsAccount;
