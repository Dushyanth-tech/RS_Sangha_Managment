import React, { useState, useEffect } from "react";
import axios from "axios";
import DataTable from "../../SuperAdmin/components/DataTable";
import CreateSanghaModal from "../components/CreateSanghaModal";
import AddMembersModal from "../components/AddMembersModal";
import RemoveMembersModal from "../components/RemoveMembersModal";

const API_BASE = "http://localhost:8000";

export default function ManageSanghas() {
  const [sanghas, setSanghas] = useState([]);
  const [fetching, setFetching] = useState(true);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
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

  // Refetch-on-success everywhere, rather than hand-patching local state —
  // keeps this in sync with whatever shape the backend actually returns.
  const handleCreated = () => {
    setShowCreateModal(false);
    fetchSanghas();
  };

  const handleOpenMembersModal = (row) => {
    setActiveSangha(row);
    setShowMembersModal(true);
  };

  const handleCloseMembersModal = () => {
    setShowMembersModal(false);
    setActiveSangha(null);
  };

  const handleMemberAdded = () => {
    handleCloseMembersModal();
    fetchSanghas();
  };

  const handleOpenRemoveModal = (row) => {
    setActiveSangha(row);
    setShowRemoveModal(true);
  };

  const handleCloseRemoveModal = () => {
    setShowRemoveModal(false);
    setActiveSangha(null);
  };

  const handleMemberRemoved = () => {
    handleCloseRemoveModal();
    fetchSanghas();
  };

  return (
    <div className="sa-page">
      <div className="sa-section__header">
        <h2 className="sa-section__title">My Sanghas</h2>
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
              key: "subadmin",
              label: "Subadmin",
              render: (row) => row.subadmin_name || "-",
            },
            {
              key: "members",
              label: "Members",
              render: (row) => row.membersCount ?? row.members_count ?? 0,
            },
          ]}
          rows={sanghas}
          emptyText={
            fetching
              ? "Loading..."
              : "No sanghas yet — create one to get started"
          }
          actions={(row) => (
            <>
              <button
                className="sa-btn-outline"
                onClick={() => handleOpenMembersModal(row)}
              >
                Add Members
              </button>
              <button
                className="sa-btn-outline"
                onClick={() => handleOpenRemoveModal(row)}
              >
                Remove Member
              </button>
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
      {showRemoveModal && activeSangha && (
  <RemoveMembersModal
    sangha={activeSangha}
    onClose={handleCloseRemoveModal}
    onMemberRemoved={handleMemberRemoved}
  />
)}
    </div>
  );
}
