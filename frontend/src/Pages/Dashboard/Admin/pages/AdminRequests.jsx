import React, { useState, useEffect } from "react";
import axios from "axios";
import DataTable from "../../SuperAdmin/components/DataTable";
import RequestAdminModal from "../components/RequestAdminModal";

const API_BASE = "http://localhost:8000";

const badgeClass = {
  pending: "sa-badge--pending",
  approved: "sa-badge--approved",
  rejected: "sa-badge--rejected",
};

export default function AdminRequests() {
  const [requests, setRequests] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const token = () => localStorage.getItem("access_token");

  const fetchRequests = async () => {
    try {
      setFetching(true);

      const res = await axios.get(
        `${API_BASE}/admin-requests`,
        {
          headers: {
            Authorization: `Bearer ${token()}`,
          },
        }
      );

      setRequests(res.data);
    } catch (error) {
      console.error(
        "Error fetching admin requests:",
        error
      );
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  // Called after successful request
  const handleSubmitted = async () => {
    setShowModal(false);

    // Refresh table
    await fetchRequests();
  };

  return (
    <div className="sa-page">

      {/* Header */}
      <div className="sa-section__header">
        <h2 className="sa-section__title">
          Admin Requests
        </h2>

        <button
          className="sa-btn-primary"
          onClick={() => setShowModal(true)}
        >
          + Make Admin
        </button>
      </div>

      {/* Data Table */}
      <DataTable
        columns={[
          {
            key: "sangha_name",
            label: "Sangha",
          },

          {
            key: "candidate_name",
            label: "Member Name",
          },

          {
            key: "candidate_email",
            label: "Email",
          },

          {
            key: "candidate_phone",
            label: "Phone",
          },

          {
            key: "message",
            label: "Reason",
            render: (row) =>
              row.message || "-",
          },

          {
            key: "status",
            label: "Status",
            render: (row) => (
              <span
                className={`sa-badge ${
                  badgeClass[row.status] || ""
                }`}
              >
                {row.status}
              </span>
            ),
          },

          {
            key: "rejection_reason",
            label: "Note",
            render: (row) =>
              row.rejection_reason || "-",
          },
        ]}
        rows={requests}
        emptyText={
          fetching
            ? "Loading..."
            : "No admin requests submitted yet"
        }
      />

      {/* Modal */}
      {showModal && (
        <RequestAdminModal
          onClose={() => setShowModal(false)}
          onSubmitted={handleSubmitted}
        />
      )}

    </div>
  );
}