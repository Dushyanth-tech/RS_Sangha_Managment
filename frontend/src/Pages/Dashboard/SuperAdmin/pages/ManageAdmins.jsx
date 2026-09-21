import React, { useState, useEffect } from "react";
import api from "../../../../api/axiosInstance"; // ⚠️ verify this matches this file's actual depth
import DataTable from "../../../../Common_Component/DataTable";
import AddAdminModal from "../Modal/AddAdminModal/AddAdminModal";
import RemoveAdminModal from "../Modal/RemoveAdminModal/RemoveAdminModal";

export default function ManageAdmins() {
  const [admins, setAdmins] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [removeTarget, setRemoveTarget] = useState(null);

  const fetchAdmins = async () => {
    try {
      setFetching(true);
      const res = await api.get(`/admins`);
      setAdmins(res.data);
    } catch (error) {
      console.error("Error fetching admins:", error);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  const handleOpenAddModal = () => setShowAddModal(true);
  const handleCloseAddModal = () => setShowAddModal(false);

  const handleAdminAdded = (member) => {
    setAdmins((prev) => [
      ...prev,
      {
        id: member.id,
        name: member.name,
        email: member.email,
        sanghaCount: 0,
        status: member.isActive ? "active" : "inactive",
      },
    ]);
    setShowAddModal(false);
  };

  const handleOpenRemoveModal = (row) => setRemoveTarget(row);
  const handleCloseRemoveModal = () => setRemoveTarget(null);

  const handleSanghasRemoved = (adminId, removedSanghaIds) => {
    setAdmins((prev) =>
      prev.map((a) =>
        a.id === adminId
          ? { ...a, sanghaCount: Math.max(0, a.sanghaCount - removedSanghaIds.length) }
          : a
      )
    );
  };

  return (
    <div className="sa-page">
      <div className="sa-section__header">
        <h2 className="sa-section__title">Manage Admins</h2>
        <button className="sa-btn-primary" onClick={handleOpenAddModal}>
          + Add Admin
        </button>
      </div>

      <DataTable
        columns={[
          { key: "name", label: "Name" },
          { key: "email", label: "Email" },
          { key: "sanghaCount", label: "Sanghas Managed" },
          {
            key: "status",
            label: "Status",
            render: (row) => (
              <span
                className={`sa-badge ${
                  row.status === "active" ? "sa-badge--approved" : "sa-badge--rejected"
                }`}
              >
                {row.status}
              </span>
            ),
          },
        ]}
        rows={admins}
        emptyText={fetching ? "Loading..." : "No records found"}
        actions={(row) => (
          <>
            <button className="sa-btn-outline" style={{ marginRight: "0.5rem" }}>
              Edit
            </button>
            <button className="sa-btn-outline" onClick={() => handleOpenRemoveModal(row)}>
              Remove
            </button>
          </>
        )}
      />

      {showAddModal && (
        <AddAdminModal onClose={handleCloseAddModal} onAssigned={handleAdminAdded} />
      )}

      {removeTarget && (
        <RemoveAdminModal
          admin={removeTarget}
          onClose={handleCloseRemoveModal}
          onRemoved={handleSanghasRemoved}
        />
      )}
    </div>
  );
}