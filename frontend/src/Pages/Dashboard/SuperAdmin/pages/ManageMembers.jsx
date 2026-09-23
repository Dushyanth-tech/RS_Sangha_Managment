import React, { useEffect, useState } from "react";
import api from "../../../../api/axiosInstance"; // ⚠️ verify this matches this file's actual depth
import DataTable from "../../../../Common_Component/DataTable";
import "../SuperAdminDashboard.css";
import "./ManageMembers.css";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"; // kept only for building the photo URL below

function initialsOf(name = "") {
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "M";
}

export default function ManageMembers() {
  const [members, setMembers] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [fetchError, setFetchError] = useState("");

  const [activeMember, setActiveMember] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");

  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState("");

  const fetchMembers = async () => {
    try {
      setFetching(true);
      setFetchError("");
      const res = await api.get(`/superadmin/members`);
      setMembers(res.data);
    } catch (error) {
      console.error("Error fetching members:", error);
      setFetchError(error.response?.data?.detail || "Failed to load members.");
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  const openMember = async (row) => {
    setActiveMember(row);
    setDetail(null);
    setDetailError("");
    setVerifyError("");

    try {
      setDetailLoading(true);
      const res = await api.get(`/superadmin/members/${row.id}`);
      // console.log(res.data)
      setDetail(res.data);
    } catch (error) {
      console.error("Error fetching member detail:", error);
      setDetailError(error.response?.data?.detail || "Failed to load member details.");
    } finally {
      setDetailLoading(false);
    }
  };

  const closeModal = () => {
    setActiveMember(null);
    setDetail(null);
    setDetailError("");
    setVerifyError("");
  };

  const handleVerify = async () => {
    if (!activeMember) return;

    try {
      setVerifying(true);
      setVerifyError("");
      await api.post(`/superadmin/members/${activeMember.id}/verify`, {});

      setDetail((prev) => (prev ? { ...prev, isVerified: true } : prev));
      setMembers((prev) =>
        prev.map((m) => (m.id === activeMember.id ? { ...m, isVerified: true } : m))
      );
    } catch (error) {
      console.error("Error verifying member:", error);
      setVerifyError(error.response?.data?.detail || "Failed to verify member.");
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="sa-page">
      <div className="sa-section__header">
        <div>
          <h2 className="sa-section__title">Manage Members</h2>
          <p className="mm-subtitle">
            Showing members who have completed both their profile and banking details.
            Verify their information below.
          </p>
        </div>
      </div>

      {fetchError && (
        <div className="sa-error" style={{ marginBottom: "1rem" }}>
          {fetchError}{" "}
          <button className="sa-btn-outline" onClick={fetchMembers}>
            Retry
          </button>
        </div>
      )}

      <div className="sa-scroll-table">
        <DataTable
          columns={[
            { key: "name", label: "Name" },
            { key: "email", label: "Email" },
            { key: "phone", label: "Phone" },
            { key: "sanghaName", label: "Sangha" },
            { key: "adminName", label: "Admin" },
            {
              key: "isVerified",
              label: "Status",
              render: (row) => (
                <span className={`sa-badge ${row.isVerified ? "sa-badge--approved" : "sa-badge--pending"}`}>
                  {row.isVerified ? "Verified" : "Unverified"}
                </span>
              ),
            },
          ]}
          rows={members}
          emptyText={fetching ? "Loading..." : "No members have completed both profile and banking details yet"}
          actions={(row) => (
            <button className="sa-btn-outline" onClick={() => openMember(row)}>
              View &amp; Verify
            </button>
          )}
        />
      </div>

      {activeMember && (
        <div className="mm-modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && closeModal()}>
          <div className="mm-modal">
            <div className="mm-modal__header">
              <h3>Member Verification</h3>
              <button className="mm-modal__close" onClick={closeModal}>&times;</button>
            </div>

            <div className="mm-modal__body">
              {detailLoading ? (
                <div className="mm-loading">Loading member details...</div>
              ) : detailError ? (
                <div className="sa-error">{detailError}</div>
              ) : detail ? (
                <>
                  <div className="mm-photo-row">
                    {detail.profile.profile_photo_url ? (
                      <img
                        className="mm-photo"
                        src={`${API_BASE}${detail.profile.profile_photo_url}`}
                        alt={detail.profile.fullname}
                      />
                    ) : (
                      <div className="mm-photo mm-photo--placeholder">
                        {initialsOf(detail.profile.fullname)}
                      </div>
                    )}

                    <div>
                      <div className="mm-name">{detail.profile.fullname}</div>
                      <span className={`sa-badge ${detail.isVerified ? "sa-badge--approved" : "sa-badge--pending"}`}>
                        {detail.isVerified ? "Verified" : "Unverified"}
                      </span>
                    </div>
                  </div>

                  <div className="mm-section">
                    <h4>Personal Details</h4>
                    <div className="mm-grid">
                      <div className="mm-field"><span>Email</span><strong>{detail.profile.email || "-"}</strong></div>
                      <div className="mm-field"><span>Phone</span><strong>{detail.profile.phone || "-"}</strong></div>
                      <div className="mm-field"><span>Date of Birth</span><strong>{detail.profile.date_of_birth || "-"}</strong></div>
                      <div className="mm-field"><span>PAN Number</span><strong>{detail.profile.pan_number || "-"}</strong></div>
                      <div className="mm-field"><span>ID Proof Type</span><strong>{detail.profile.id_proof_type || "-"}</strong></div>
                      <div className="mm-field"><span>ID Proof</span><strong>{detail.profile.id_proof_number || "-"}</strong></div>
                      <div className="mm-field mm-field--wide"><span>Address</span><strong>{detail.profile.address || "-"}</strong></div>
                      <div className="mm-field"><span>Sangha</span><strong>{detail.profile.sanghaName}</strong></div>
                    </div>
                  </div>

                  <div className="mm-section">
                    <h4>Banking Details</h4>
                    {detail.banking ? (
                      <div className="mm-grid">
                        <div className="mm-field"><span>Account Number</span><strong>{detail.banking.account_number || "-"}</strong></div>
                        <div className="mm-field"><span>Account Holder</span><strong>{detail.banking.account_holder_name || "-"}</strong></div>
                        <div className="mm-field"><span>Bank Name</span><strong>{detail.banking.bank_name || "-"}</strong></div>
                        <div className="mm-field"><span>Account Type</span><strong>{detail.banking.account_type || "-"}</strong></div>
                        <div className="mm-field"><span>IFSC Code</span><strong>{detail.banking.ifsc_code || "-"}</strong></div>
                        <div className="mm-field mm-field--wide"><span>Branch</span><strong>{detail.banking.branch_name || "-"}</strong></div>
                      </div>
                    ) : (
                      <p className="mm-empty-note">No banking details submitted yet.</p>
                    )}
                  </div>

                  {verifyError && <div className="sa-error" style={{ marginTop: "1rem" }}>{verifyError}</div>}
                </>
              ) : null}
            </div>

            <div className="mm-modal__footer">
              <button className="sa-btn-outline" onClick={closeModal}>Close</button>
              <button
                className="sa-btn-primary"
                onClick={handleVerify}
                disabled={!detail || detail.isVerified || verifying}
              >
                {verifying ? "Verifying..." : detail?.isVerified ? "Already Verified" : "Verify"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}