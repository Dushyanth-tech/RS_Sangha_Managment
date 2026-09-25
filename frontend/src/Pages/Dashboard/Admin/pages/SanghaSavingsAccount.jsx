import React, { useState } from "react";
import DataTable from "../../../../Common_Component/DataTable";
import "./SanghaSavingsAccount.css";

const SanghaSavingsAccount = () => {
  // ============================================================
  // 3 SANGHAS AVAILABLE FOR ACCOUNT CREATION
  // ============================================================

  const sanghaOptions = [
    {
      code: "RS042429",
      name: "RS Bangalore Sangha",
      admin: "Rahul Kumar",
    },
    {
      code: "RS123456",
      name: "RS Mysore Sangha",
      admin: "Arun Sharma",
    },
    {
      code: "RS789012",
      name: "RS Tumkur Sangha",
      admin: "Vijay Kumar",
    },
  ];

  // ============================================================
  // MEMBERS - BANGALORE
  // ============================================================

  const bangaloreMembers = [
    {
      id: 101,
      name: "Rahul Kumar",
      bank: "Canara Bank",
      accountNumber: "123456789012",
      ifsc: "CNRB0001234",
      status: "Verified",
    },
    {
      id: 102,
      name: "Arun Sharma",
      bank: "HDFC Bank",
      accountNumber: "987654321098",
      ifsc: "HDFC0001234",
      status: "Verified",
    },
    {
      id: 103,
      name: "Vijay Kumar",
      bank: "State Bank of India",
      accountNumber: "456789012345",
      ifsc: "SBIN0001234",
      status: "Unverified",
    },
  ];

  // ============================================================
  // MEMBERS - MYSORE
  // ============================================================

  const mysoreMembers = [
    {
      id: 201,
      name: "Arun Sharma",
      bank: "Canara Bank",
      accountNumber: "111122223333",
      ifsc: "CNRB0002345",
      status: "Verified",
    },
    {
      id: 202,
      name: "Kiran Kumar",
      bank: "HDFC Bank",
      accountNumber: "444455556666",
      ifsc: "HDFC0002345",
      status: "Verified",
    },
    {
      id: 203,
      name: "Manoj Singh",
      bank: "State Bank of India",
      accountNumber: "777788889999",
      ifsc: "SBIN0002345",
      status: "Unverified",
    },
  ];

  // ============================================================
  // MEMBERS - TUMKUR
  // ============================================================

  const tumkurMembers = [
    {
      id: 301,
      name: "Vijay Kumar",
      bank: "Canara Bank",
      accountNumber: "222233334444",
      ifsc: "CNRB0003456",
      status: "Verified",
    },
    {
      id: 302,
      name: "Suresh Kumar",
      bank: "HDFC Bank",
      accountNumber: "555566667777",
      ifsc: "HDFC0003456",
      status: "Verified",
    },
    {
      id: 303,
      name: "Ramesh Babu",
      bank: "State Bank of India",
      accountNumber: "888899990000",
      ifsc: "SBIN0003456",
      status: "Unverified",
    },
  ];

  // ============================================================
  // INITIAL SAVINGS ACCOUNTS
  //
  // ONLY BANGALORE AND MYSORE EXIST INITIALLY.
  // TUMKUR WILL BE CREATED THROUGH THE FORM.
  // ============================================================

  const initialSavingsAccounts = [
    {
      id: 1,
      status: "Active",
      sanghaCode: "RS042429",
      sanghaName: "RS Bangalore Sangha",
      admin: "Rahul Kumar",
      managedMembers: bangaloreMembers,

      bankDetails: {
        accountHolder: "RS Bangalore Sangha",
        bank: "Canara Bank",
        accountNumber: "999900001234",
        ifsc: "CNRB0000001",
        branch: "Test Branch, Bengaluru",
        accountType: "Savings",
        balance: 125000,
        status: "Active",
      },
    },

    {
      id: 2,
      status: "Active",
      sanghaCode: "RS123456",
      sanghaName: "RS Mysore Sangha",
      admin: "Arun Sharma",
      managedMembers: mysoreMembers,

      bankDetails: {
        accountHolder: "RS Mysore Sangha",
        bank: "Canara Bank",
        accountNumber: "888800001234",
        ifsc: "CNRB0000002",
        branch: "Main Branch, Mysore",
        accountType: "Savings",
        balance: 85500,
        status: "Active",
      },
    },
  ];

  // ============================================================
  // STATE
  // ============================================================

  const [savingsAccounts, setSavingsAccounts] = useState(
    initialSavingsAccounts
  );

  const [selectedSangha, setSelectedSangha] = useState(null);

  const [showMembersModal, setShowMembersModal] =
    useState(false);

  const [showBankModal, setShowBankModal] =
    useState(false);

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
  // FIND MEMBERS FOR SELECTED SANGHA
  // ============================================================

  const getMembersForSangha = (sanghaCode) => {
    if (sanghaCode === "RS042429") {
      return bangaloreMembers;
    }

    if (sanghaCode === "RS123456") {
      return mysoreMembers;
    }

    if (sanghaCode === "RS789012") {
      return tumkurMembers;
    }

    return [];
  };

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
  // ============================================================

  const handleSanghaChange = (event) => {
    const sanghaCode = event.target.value;

    const selectedOption = sanghaOptions.find(
      (sangha) => sangha.code === sanghaCode
    );

    setFormData((previous) => ({
      ...previous,
      sangha: sanghaCode,
      accountHolder: selectedOption
        ? selectedOption.name
        : "",
    }));
  };

  // ============================================================
  // CREATE SAVINGS ACCOUNT
  // ============================================================

  const handleCreateAccount = (event) => {
    event.preventDefault();

    if (!formData.sangha) {
      alert("Please select a Sangha.");
      return;
    }

    // ----------------------------------------------------------
    // PREVENT DUPLICATE ACCOUNT
    // ----------------------------------------------------------

    const alreadyExists = savingsAccounts.some(
      (account) =>
        account.sanghaCode === formData.sangha
    );

    if (alreadyExists) {
      alert(
        "A savings account already exists for this Sangha."
      );
      return;
    }

    // ----------------------------------------------------------
    // ACCOUNT NUMBER VALIDATION
    // ----------------------------------------------------------

    if (
      !formData.accountNumber ||
      !formData.confirmAccountNumber
    ) {
      alert("Please enter the account number.");
      return;
    }

    if (
      formData.accountNumber !==
      formData.confirmAccountNumber
    ) {
      alert("Account numbers do not match.");
      return;
    }

    if (!formData.bank) {
      alert("Please enter the bank name.");
      return;
    }

    if (!formData.ifsc) {
      alert("Please enter the IFSC code.");
      return;
    }

    if (!formData.branch) {
      alert("Please enter the branch name.");
      return;
    }

    // ----------------------------------------------------------
    // FIND SELECTED SANGHA
    // ----------------------------------------------------------

    const selectedOption = sanghaOptions.find(
      (sangha) =>
        sangha.code === formData.sangha
    );

    if (!selectedOption) {
      alert("Selected Sangha was not found.");
      return;
    }

    // ----------------------------------------------------------
    // GET EXACT 3 MEMBERS
    // ----------------------------------------------------------

    const members = getMembersForSangha(
      selectedOption.code
    );

    // ----------------------------------------------------------
    // CREATE NEW ACCOUNT
    //
    // IMPORTANT:
    // NEW ACCOUNT BALANCE = 0
    // ----------------------------------------------------------

    const newSavingsAccount = {
      id: Date.now(),

      status: "Active",

      sanghaCode: selectedOption.code,

      sanghaName: selectedOption.name,

      admin: selectedOption.admin,

      managedMembers: members,

      bankDetails: {
        accountHolder: formData.accountHolder,

        bank: formData.bank,

        accountNumber: formData.accountNumber,

        ifsc: formData.ifsc,

        branch: formData.branch,

        accountType: formData.accountType,

        // NEW ACCOUNT ALWAYS STARTS WITH ₹0
        balance: 0,

        status: "Active",
      },
    };

    // ----------------------------------------------------------
    // ADD NEW ACCOUNT TO TABLE
    // ----------------------------------------------------------

    setSavingsAccounts((previous) => [
      ...previous,
      newSavingsAccount,
    ]);

    // ----------------------------------------------------------
    // RESET FORM
    // ----------------------------------------------------------

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
      `${selectedOption.name} savings account created successfully. Initial balance is ₹0.`
    );
  };

  // ============================================================
  // OPEN MEMBERS MODAL
  // ============================================================

  const openMembersModal = (sangha) => {
    setSelectedSangha(sangha);
    setShowMembersModal(true);
    setShowBankModal(false);
  };

  // ============================================================
  // OPEN BANK DETAILS MODAL
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
            row.status === "Active"
              ? "status-active"
              : "status-deactive"
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
        <span className="sangha-code">
          {row.sanghaCode}
        </span>
      ),
    },

    {
      key: "sanghaName",
      label: "Sangha Name",
    },

    {
      key: "admin",
      label: "Admin",
    },

    {
      key: "members",
      label: "Members",

      // The number comes from the SAME
      // array used by Members Details.
      render: (row) => (
        <span className="member-count">
          {row.managedMembers.length}
        </span>
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
            Manage Sangha savings accounts and connected
            member bank details.
          </p>
        </div>
      </div>

      {/* ======================================================
          CREATE ACCOUNT
      ====================================================== */}

      <section className="create-account-card">

        <div className="section-heading">

          <div className="section-icon">
            ₹
          </div>

          <div>
            <h2>Create Savings Account</h2>

            <p>
              Create a savings account for a Sangha.
            </p>
          </div>

        </div>

        <form
          className="account-form"
          onSubmit={handleCreateAccount}
        >

          {/* SANGHA */}

          <div className="form-group">
            <label htmlFor="sangha">
              Sangha
            </label>

            <select
              id="sangha"
              name="sangha"
              value={formData.sangha}
              onChange={handleSanghaChange}
            >
              <option value="">
                Select Sangha
              </option>

              {sanghaOptions.map((sangha) => {
                const accountExists =
                  savingsAccounts.some(
                    (account) =>
                      account.sanghaCode ===
                      sangha.code
                  );

                return (
                  <option
                    key={sangha.code}
                    value={sangha.code}
                    disabled={accountExists}
                  >
                    {sangha.name}
                    {accountExists
                      ? " — Account Exists"
                      : ""}
                  </option>
                );
              })}
            </select>
          </div>

          {/* ACCOUNT HOLDER */}

          <div className="form-group">
            <label htmlFor="accountHolder">
              Account Holder Name
            </label>

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
            <label htmlFor="bank">
              Bank
            </label>

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
            <label htmlFor="accountNumber">
              Account Number
            </label>

            <input
              id="accountNumber"
              type="text"
              name="accountNumber"
              value={formData.accountNumber}
              onChange={handleChange}
              placeholder="Enter account number"
            />
          </div>

          {/* CONFIRM ACCOUNT NUMBER */}

          <div className="form-group">
            <label htmlFor="confirmAccountNumber">
              Confirm Account Number
            </label>

            <input
              id="confirmAccountNumber"
              type="text"
              name="confirmAccountNumber"
              value={formData.confirmAccountNumber}
              onChange={handleChange}
              placeholder="Confirm account number"
            />
          </div>

          {/* IFSC */}

          <div className="form-group">
            <label htmlFor="ifsc">
              IFSC Code
            </label>

            <input
              id="ifsc"
              type="text"
              name="ifsc"
              value={formData.ifsc}
              onChange={handleChange}
              placeholder="Enter IFSC code"
            />
          </div>

          {/* BRANCH */}

          <div className="form-group">
            <label htmlFor="branch">
              Branch
            </label>

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
            <label htmlFor="accountType">
              Account Type
            </label>

            <select
              id="accountType"
              name="accountType"
              value={formData.accountType}
              onChange={handleChange}
            >
              <option value="Savings">
                Savings
              </option>

              <option value="Current">
                Current
              </option>
            </select>
          </div>

          {/* SUBMIT */}

          <div className="form-actions">

            <button
              type="submit"
              className="create-account-btn"
            >
              Create Savings Account
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

            <p>
              Existing savings accounts for Sanghas.
            </p>
          </div>

          <span className="total-accounts">
            {savingsAccounts.length}{" "}
            {savingsAccounts.length === 1
              ? "Account"
              : "Accounts"}
          </span>

        </div>

        <div className="savings-table-card">

          <DataTable
            columns={columns}
            rows={savingsAccounts}
            actions={(row) => (
              <div className="table-actions">

                <button
                  type="button"
                  className="members-details-btn"
                  onClick={() =>
                    openMembersModal(row)
                  }
                >
                  Members Details
                </button>

                <button
                  type="button"
                  className="bank-details-btn"
                  onClick={() =>
                    openBankModal(row)
                  }
                >
                  Bank Details
                </button>

              </div>
            )}
          />

        </div>

      </section>

      {/* ======================================================
          MEMBERS DETAILS MODAL
      ====================================================== */}

      {showMembersModal &&
        selectedSangha && (
          <div
            className="modal-overlay"
            onClick={closeModals}
          >

            <div
              className="details-modal members-modal"
              onClick={(event) =>
                event.stopPropagation()
              }
            >

              <div className="modal-header">

                <div>
                  <h2>Managed Members</h2>

                  <p>
                    {selectedSangha.sanghaName}
                    {" "}
                    ({selectedSangha.sanghaCode})
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

                  <strong>
                    {selectedSangha.admin}
                  </strong>
                </div>

                <div>
                  <span>Total Members</span>

                  <strong>
                    {
                      selectedSangha.managedMembers
                        .length
                    }
                  </strong>
                </div>

              </div>

              {/* MEMBERS TABLE */}

              <div className="modal-table-wrapper">

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

                    {selectedSangha.managedMembers.map(
                      (member) => (
                        <tr key={member.id}>

                          <td>
                            <div className="member-name">

                              <span className="member-avatar">
                                {member.name
                                  .charAt(0)
                                  .toUpperCase()}
                              </span>

                              {member.name}

                            </div>
                          </td>

                          <td>
                            {member.bank}
                          </td>

                          <td>
                            <span className="account-number">
                              {member.accountNumber}
                            </span>
                          </td>

                          <td>
                            <span className="ifsc-code">
                              {member.ifsc}
                            </span>
                          </td>

                          <td>
                            <span
                              className={`status-badge ${
                                member.status ===
                                "Verified"
                                  ? "status-verified"
                                  : "status-unverified"
                              }`}
                            >
                              {member.status}
                            </span>
                          </td>

                        </tr>
                      )
                    )}

                  </tbody>

                </table>

              </div>

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

      {showBankModal &&
        selectedSangha && (
          <div
            className="modal-overlay"
            onClick={closeModals}
          >

            <div
              className="details-modal bank-modal"
              onClick={(event) =>
                event.stopPropagation()
              }
            >

              <div className="modal-header">

                <div>
                  <h2>Bank Details</h2>

                  <p>
                    {selectedSangha.sanghaName}
                    {" "}
                    ({selectedSangha.sanghaCode})
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

                  <span>
                    Current Bank Balance
                  </span>

                  <strong className="balance-value">
                    ₹
                    {selectedSangha.bankDetails.balance.toLocaleString(
                      "en-IN"
                    )}
                  </strong>

                </div>

                <span
                  className={`status-badge ${
                    selectedSangha.bankDetails
                      .status === "Active"
                      ? "status-active"
                      : "status-deactive"
                  }`}
                >
                  {
                    selectedSangha.bankDetails
                      .status
                  }
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

                      <td>
                        {
                          selectedSangha
                            .bankDetails
                            .accountHolder
                        }
                      </td>

                      <td>
                        {
                          selectedSangha
                            .bankDetails.bank
                        }
                      </td>

                      <td>
                        <span className="account-number">
                          {
                            selectedSangha
                              .bankDetails
                              .accountNumber
                          }
                        </span>
                      </td>

                      <td>
                        <span className="ifsc-code">
                          {
                            selectedSangha
                              .bankDetails
                              .ifsc
                          }
                        </span>
                      </td>

                      <td>
                        {
                          selectedSangha
                            .bankDetails.branch
                        }
                      </td>

                      <td>
                        {
                          selectedSangha
                            .bankDetails
                            .accountType
                        }
                      </td>

                      <td>
                        ₹
                        {selectedSangha.bankDetails.balance.toLocaleString(
                          "en-IN"
                        )}
                      </td>

                      <td>
                        <span
                          className={`status-badge ${
                            selectedSangha
                              .bankDetails
                              .status ===
                            "Active"
                              ? "status-active"
                              : "status-deactive"
                          }`}
                        >
                          {
                            selectedSangha
                              .bankDetails
                              .status
                          }
                        </span>
                      </td>

                    </tr>

                  </tbody>

                </table>

              </div>

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