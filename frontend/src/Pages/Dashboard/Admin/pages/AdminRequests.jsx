import React, { useState, useEffect } from "react";
import api from "../../../../api/axiosInstance"; // ⚠️ verify this matches this file's actual depth
import DataTable from "../../../../Common_Component/DataTable";
import RequestAdminModal from "../components/RequestAdminModal";

const badgeClass = {
  pending: "sa-badge--pending",
  approved: "sa-badge--approved",
  rejected: "sa-badge--rejected",
};

export default function AdminRequests() {
  const [requests, setRequests] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const fetchRequests = async () => {
    try {
      setFetching(true);
      const res = await api.get(`/admin-requests`);
      setRequests(res.data);
    } catch (error) {
      console.error("Error fetching admin requests:", error);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleSubmitted = async () => {
    setShowModal(false);
    await fetchRequests();
  };

  return (
    <div className="sa-page">
      <div className="sa-section__header">
        <h2 className="sa-section__title">Admin Requests</h2>
        <button className="sa-btn-primary" onClick={() => setShowModal(true)}>
          + Make Admin
        </button>
      </div>

      <DataTable
        columns={[
          { key: "sangha_name", label: "Sangha" },
          { key: "candidate_name", label: "Member Name" },
          { key: "candidate_email", label: "Email" },
          { key: "candidate_phone", label: "Phone" },
          { key: "message", label: "Reason", render: (row) => row.message || "-" },
          {
            key: "status",
            label: "Status",
            render: (row) => (
              <span className={`sa-badge ${badgeClass[row.status] || ""}`}>
                {row.status}
              </span>
            ),
          },
          {
            key: "rejection_reason",
            label: "Note",
            render: (row) => row.rejection_reason || "-",
          },
        ]}
        rows={requests}
        emptyText={fetching ? "Loading..." : "No admin requests submitted yet"}
      />

      {showModal && (
        <RequestAdminModal
          onClose={() => setShowModal(false)}
          onSubmitted={handleSubmitted}
        />
      )}
    </div>
  );
}