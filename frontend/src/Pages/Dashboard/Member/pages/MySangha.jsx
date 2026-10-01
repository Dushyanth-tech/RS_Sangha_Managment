import React, { useEffect, useState } from "react";
import {
  Building2,
  X,
  Users,
  Loader2,
  MapPin,
  ArrowRight,
} from "lucide-react";

import api from "../../../../api/axiosInstance";
import MembersModal from "../Modal/MembersModal";
import "./MySangha.css";

const MAX_MEMBERS = 20;

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
          {error}{" "}
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
        <div className="md-sangha-list">
          {sanghas.map((sangha) => {
            const location =
              [sangha.city, sangha.state].filter(Boolean).join(", ") || "N/A";
            const count = sangha.membersCount ?? sangha.members_count ?? 0;

            return (
              <article key={sangha.id} className="md-sangha-card">
                <div className="md-sangha-card__top">
                  <h2>My Sangha</h2>
                  <button
                    type="button"
                    className="md-sangha-card__link"
                    onClick={() => handleViewMembers(sangha)}
                  >
                    View <ArrowRight size={14} />
                  </button>
                </div>

                <div className="md-sangha-card__identity">
                  <div className="md-sangha-card__icon">
                    <Building2 size={22} strokeWidth={1.8} />
                  </div>
                  <div>
                    <div className="md-sangha-card__name">{sangha.name}</div>
                    <div className="md-sangha-card__code">{sangha.code}</div>
                  </div>
                </div>

                <dl className="md-sangha-card__details">
                  <div>
                    <dt>Admin</dt>
                    <dd>{sangha.admin_name || "Not assigned"}</dd>
                  </div>
                  <div>
                    <dt>Location</dt>
                    <dd>
                      <MapPin size={14} /> {location}
                    </dd>
                  </div>
                  <div>
                    <dt>Members</dt>
                    <dd>
                      {count} / {sangha.maxMembers ?? MAX_MEMBERS}
                    </dd>
                  </div>
                </dl>

                <button
                  type="button"
                  className="md-view-members-btn"
                  onClick={() => handleViewMembers(sangha)}
                >
                  <Users size={16} />
                  View Members
                </button>
              </article>
            );
          })}
        </div>
      )}

      {/* Members Modal */}
      <MembersModal
  sangha={selectedSangha}
  members={members}
  loading={membersLoading}
  error={membersError}
  onClose={handleCloseModal}
/>
    </section>
  );
}