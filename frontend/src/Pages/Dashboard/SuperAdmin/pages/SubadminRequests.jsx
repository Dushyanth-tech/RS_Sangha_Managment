import React, { useState, useEffect } from "react";
import axios from "axios";
import DataTable from "../components/DataTable";

const API_BASE = "http://localhost:8000";

const badgeClass = {
  pending: "sa-badge--pending",
  approved: "sa-badge--approved",
  rejected: "sa-badge--rejected",
};

export default function SubadminRequests() {
  const [requests, setRequests] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [actingId, setActingId] = useState(null);
  const [error, setError] = useState("");

  const token = () => localStorage.getItem("access_token");

  const fetchRequests = async () => {
    try {
      setFetching(true);
      setError("");
      const res = await axios.get(`${API_BASE}/admin-requests`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      setRequests(res.data);
    } catch (err) {
      console.error("Error fetching admin requests:", err);
      setError(err.response?.data?.detail || "Failed to load requests.");
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleApprove = async (row) => {
    if (!window.confirm(`Approve ${row.candidate_name} as admin of ${row.sangha_name}?`)) return;

    try {
      setActingId(row.id);
      await axios.patch(
        `${API_BASE}/admin-requests/${row.id}/approve`,
        {},
        { headers: { Authorization: `Bearer ${token()}` } }
      );
      setRequests((prev) =>
        prev.map((r) => (r.id === row.id ? { ...r, status: "APPROVED" } : r))
      );
    } catch (err) {
      console.error("Error approving request:", err);
      alert(err.response?.data?.detail || "Failed to approve request.");
    } finally {
      setActingId(null);
    }
  };

  const handleReject = async (row) => {
    const reason = window.prompt("Reason for rejecting this request (optional):", "");
    if (reason === null) return; // cancelled

    try {
      setActingId(row.id);
      await axios.patch(
        `${API_BASE}/admin-requests/${row.id}/reject`,
        { reason },
        { headers: { Authorization: `Bearer ${token()}` } }
      );
      setRequests((prev) =>
        prev.map((r) =>
          r.id === row.id ? { ...r, status: "REJECTED", rejection_reason: reason } : r
        )
      );
    } catch (err) {
      console.error("Error rejecting request:", err);
      alert(err.response?.data?.detail || "Failed to reject request.");
    } finally {
      setActingId(null);
    }
  };

  return (
    <div className="sa-page">
      <h2 className="sa-section__title">Admin Requests</h2>

      {error && (
        <p style={{ color: "var(--pink-700)", marginBottom: "1rem" }}>{error}</p>
      )}

      <DataTable
        columns={[
          { key: "candidate_name", label: "Member" },
          { key: "sangha_name", label: "Sangha" },
          { key: "requested_by", label: "Requested By" },
          {
            key: "status",
            label: "Status",
            render: (row) => {
              const status = (row.status || "").toLowerCase();
              return (
                <span className={`sa-badge ${badgeClass[status] || ""}`}>
                  {status}
                </span>
              );
            },
          },
        ]}
        rows={requests}
        emptyText={fetching ? "Loading..." : "No records found"}
        actions={(row) =>
          (row.status || "").toLowerCase() === "pending" ? (
            <>
              <button
                className="sa-btn-primary"
                style={{ marginRight: "0.5rem" }}
                disabled={actingId === row.id}
                onClick={() => handleApprove(row)}
              >
                {actingId === row.id ? "Working..." : "Approve"}
              </button>
              <button
                className="sa-btn-outline"
                disabled={actingId === row.id}
                onClick={() => handleReject(row)}
              >
                Reject
              </button>
            </>
          ) : (
            <span style={{ color: "var(--muted)" }}>—</span>
          )
        }
      />
    </div>
  );
}