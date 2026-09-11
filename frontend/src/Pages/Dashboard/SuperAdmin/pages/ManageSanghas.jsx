import React, { useState, useEffect } from "react";
import axios from "axios";
import DataTable from "../components/DataTable";
import CreateSanghaModal from "../components/CreateSanghaModal";
import EditSanghaModal from "../components/EditSanghaModal";
import "./ManageSanghas.css";

const API_BASE = "http://localhost:8000";

export default function ManageSanghas() {
  const [sanghas, setSanghas] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [search, setSearch] = useState("");

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null);

  const [toast, setToast] = useState(null);
  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  const token = () => localStorage.getItem("access_token");

  const fetchSanghas = async () => {
    try {
      setFetching(true);
      const res = await axios.get(`${API_BASE}/sanghas`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      setSanghas(res.data);
    } catch (error) {
      console.error("Error fetching sanghas:", error);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchSanghas();
  }, []);

  const handleCreated = () => {
    setShowCreateModal(false);
    fetchSanghas();
    showToast("Sangha created successfully");
  };

  const handleOpenEditModal = (row) => setEditTarget(row);
  const handleCloseEditModal = () => setEditTarget(null);

  const handleChanged = () => {
    fetchSanghas(); // single source of truth — same fix as ManageAdmins
  };

  const filteredSanghas = sanghas.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="sa-page">
      <div className="sa-section__header">
        <h2 className="sa-section__title">Manage Sanghas</h2>
        <div className="sa-search">
          <svg
            className="sa-search__icon"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle
              cx="9"
              cy="9"
              r="6.5"
              stroke="currentColor"
              strokeWidth="1.6"
            />
            <path
              d="M14 14L18 18"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
          <input
            className="sa-input sa-search__input"
            placeholder="Search sanghas by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button
          className="sa-btn-primary"
          onClick={() => setShowCreateModal(true)}
        >
          + Create Sangha
        </button>
      </div>

      <div className="sa-scroll-table">
        <DataTable
          columns={[
            { key: "name", label: "Sangha Name" },
            { key: "code", label: "Code" },
            {
              key: "admin",
              label: "Admin",
              render: (row) => row.admin_name || "-",
            },
            {
              key: "members",
              label: "Members",
              render: (row) => row.membersCount ?? 0,
            },
          ]}
          rows={filteredSanghas}
          emptyText={
            fetching
              ? "Loading..."
              : search
                ? "No sanghas match your search"
                : "No records found"
          }
          actions={(row) => (
            <button
              className="sa-btn-outline"
              onClick={() => handleOpenEditModal(row)}
            >
              Edit
            </button>
          )}
        />
      </div>

      {showCreateModal && (
        <CreateSanghaModal
          onClose={() => setShowCreateModal(false)}
          onCreated={handleCreated}
        />
      )}

      {editTarget && (
        <EditSanghaModal
          sangha={editTarget}
          onClose={handleCloseEditModal}
          onChanged={handleChanged}
        />
      )}

      {toast && <div className="sa-toast">{toast}</div>}
    </div>
  );
}
