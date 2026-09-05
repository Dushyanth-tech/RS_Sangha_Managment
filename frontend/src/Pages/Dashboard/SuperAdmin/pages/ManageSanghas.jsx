import React, { useState, useEffect } from "react";
import axios from "axios";
import DataTable from "../components/DataTable";
import CreateSanghaModal from "../components/CreateSanghaModal";
import AddMembersModal from "../components/AddMembersModal";
import "./ManageSanghas.css";

const API_BASE = "http://localhost:8000";

export default function ManageSanghas() {
  const [sanghas, setSanghas] = useState([]);
  const [fetching, setFetching] = useState(true);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [activeSangha, setActiveSangha] = useState(null);

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
  fetchSanghas();   // pulls fresh data, including joined admin_name
};

  const handleOpenMembersModal = (row) => {
    setActiveSangha(row);
    setShowMembersModal(true);
  };

  const handleCloseMembersModal = () => {
    setShowMembersModal(false);
    setActiveSangha(null);
  };

  const handleMemberAdded = (sanghaId, newCount) => {
    setSanghas((prev) =>
      prev.map((s) =>
        s.id === sanghaId ? { ...s, membersCount: newCount } : s
      )
    );
  };

  return (
    <div className="sa-page">
      <div className="sa-section__header">
        <h2 className="sa-section__title">Manage Sanghas</h2>
        <button className="sa-btn-primary" onClick={() => setShowCreateModal(true)}>
          + Create Sangha
        </button>
      </div>
        <div className="sa-scroll-table">
        <DataTable
          columns={[
            { key: "name", label: "Sangha Name" },
            { key: "code", label: "Code" },
            { key: "admin", label: "Admin", render: (row) => row.admin_name || "-" },
            { key: "subadmin", label: "Subadmin", render: (row) => row.subadmin_name || "-" },
            { key: "members", label: "Members", render: (row) => row.membersCount ?? 0 },
          ]}
          rows={sanghas}
          emptyText={fetching ? "Loading..." : "No records found"}
          actions={(row) => (
            <>
              <button
                className="sa-btn-outline"
                style={{ marginRight: "0.5rem" }}
                onClick={() => handleOpenMembersModal(row)}
              >
                Add Members
              </button>
              <button className="sa-btn-outline">Edit</button>
            </>
          )}
        />
      </div>

      {showCreateModal && (
        <CreateSanghaModal
          onClose={() => setShowCreateModal(false)}
          onCreated={handleCreated}
        />
      )}

      {showMembersModal && activeSangha && (
        <AddMembersModal
          sangha={activeSangha}
          onClose={handleCloseMembersModal}
          onMemberAdded={handleMemberAdded}
        />
      )}
    </div>
  );
}