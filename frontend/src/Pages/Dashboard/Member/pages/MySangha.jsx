import React, { useEffect, useState } from "react";
import { Building2, X, Users, Loader2 } from "lucide-react";

import api from "../../../../api/axiosInstance";
import DataTable from "../../../../Common_Component/DataTable";
import "./MySangha.css";

export default function MySangha() {
  const [sanghas, setSanghas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedSangha, setSelectedSangha] = useState(null);
  const [members, setMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersError, setMembersError] = useState("");

  // Fetch logged-in member's Sangha(s)
  const fetchSanghas = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/member/my-sangha");

      const data = response.data;

      const sanghaList = Array.isArray(data) ? data : (data.sanghas ?? []);

      setSanghas(sanghaList);
    } catch (err) {
      console.error("Failed to fetch Sanghas:", err);

      setError(
        err.response?.data?.detail || "Unable to fetch Sangha information.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSanghas();
  }, []);

  // Fetch members and open modal
  const handleViewMembers = async (sangha) => {
    setSelectedSangha(sangha);
    setMembers([]);
    setMembersError("");
    setMembersLoading(true);

    try {
      const response = await api.get("/member/my-sangha/members");

      const data = response.data;

      const memberList = Array.isArray(data) ? data : (data.members ?? []);

      setMembers(memberList);
    } catch (err) {
      console.error("Failed to fetch members:", err);

      setMembersError(
        err.response?.data?.detail || "Unable to fetch Sangha members.",
      );
    } finally {
      setMembersLoading(false);
    }
  };

  // Close modal
  const handleCloseModal = () => {
    setSelectedSangha(null);
    setMembers([]);
    setMembersError("");
  };

  // Table columns
  const columns = [
    {
      key: "code",
      label: "Sangha Code",
    },
    {
      key: "name",
      label: "Sangha Name",
    },
    {
      key: "address",
      label: "Sangha Address",
      render: (row) =>
        [row.address, row.city, row.state].filter(Boolean).join(", ") || "N/A",
    },
    {
      key: "admin_name",
      label: "Admin Name",
      render: (row) => row.admin_name || row.admin?.name || "Not assigned",
    },
    {
      key: "membersCount",
      label: "Members",
      render: (row) => row.membersCount ?? row.members_count ?? 0,
    },
  ];

  return (
    <section className="md-page">
      <div className="md-page__header">
        <h1 className="md-page__title">My Sangha</h1>

        <p className="md-page__subtitle">
          View your Sangha information and membership details.
        </p>
      </div>

      {error && (
        <div className="md-notif-error">
          {error}

          <button
            type="button"
            className="md-notif-error__retry"
            onClick={fetchSanghas}
          >
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <section className="md-panel">
          <div className="md-empty">
            <Loader2 className="md-loading-icon" size={28} />
            <p>Loading Sangha information...</p>
          </div>
        </section>
      ) : sanghas.length === 0 ? (
        <section className="md-panel">
          <div className="md-empty">
            <div className="md-empty__icon">
              <Building2 size={28} strokeWidth={1.8} />
            </div>

            <h3>No Sangha assigned</h3>

            <p>
              Your Sangha information will appear here once you are assigned to
              a Sangha.
            </p>
          </div>
        </section>
      ) : (
        <section className="md-panel">
          <DataTable
            columns={columns}
            rows={sanghas}
            emptyText="No Sanghas found"
            actions={(row) => (
              <button
                type="button"
                className="md-view-members-btn"
                onClick={() => handleViewMembers(row)}
              >
                <Users size={16} />
                View Members
              </button>
            )}
          />
        </section>
      )}

      {/* Members Modal */}
      {selectedSangha && (
        <div className="md-modal-overlay" onClick={handleCloseModal}>
          <div
            className="md-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="md-modal__header">
              <div>
                <h2>{selectedSangha.name || "Sangha Members"}</h2>

                <p>{selectedSangha.code || ""}</p>
              </div>

              <button
                type="button"
                className="md-modal__close"
                onClick={handleCloseModal}
                aria-label="Close modal"
              >
                <X size={20} />
              </button>
            </div>

            <div className="md-modal__body">
              {membersLoading ? (
                <div className="md-empty">
                  <Loader2 size={28} className="md-loading-icon" />
                  <p>Loading members...</p>
                </div>
              ) : membersError ? (
                <div className="md-notif-error">{membersError}</div>
              ) : members.length === 0 ? (
                <div className="md-empty">
                  <Users size={28} />
                  <p>No members found.</p>
                </div>
              ) : (
                <ol className="md-members-list">
                  {members.map((member, index) => (
                    <li
                      key={member.id ?? index}
                      className="md-member-list-item"
                    >
                      <div className="md-member-list-item__info">
                        <strong>
                          {member.name}

                          {member.is_current_user && " (You)"}
                        </strong>

                        <span>
                          {[member.address, member.city, member.state]
                            .filter(Boolean)
                            .join(", ") || "Address not available"}
                        </span>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </div>

            <div className="md-modal__footer">
              <button
                type="button"
                className="md-modal__done"
                onClick={handleCloseModal}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
