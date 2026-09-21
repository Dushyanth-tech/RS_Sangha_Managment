import React, { useState, useEffect } from "react";
import api from "../../../../api/axiosInstance"; // ⚠️ verify depth
import "./modal.css";

export default function RequestAdminModal({ onClose, onSubmitted }) {
  const [sanghas, setSanghas] = useState([]);
  const [members, setMembers] = useState([]);

  const [sanghaId, setSanghaId] = useState("");
  const [memberId, setMemberId] = useState("");
  const [message, setMessage] = useState("");

  const [loadingSanghas, setLoadingSanghas] = useState(true);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState("");

  useEffect(() => {
    const fetchSanghas = async () => {
      try {
        const res = await api.get(`/sanghas/managed`);
        setSanghas(res.data);
      } catch (err) {
        console.error(err);
        setError(err.response?.data?.detail || "Failed to load Sanghas.");
      } finally {
        setLoadingSanghas(false);
      }
    };

    fetchSanghas();
  }, []);

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const res = await api.get(`/admin/members`);
        setMembers(res.data);
      } catch (err) {
        console.error(err);
        setError(err.response?.data?.detail || "Failed to load members.");
      } finally {
        setLoadingMembers(false);
      }
    };

    fetchMembers();
  }, []);

  const selectedMember = members.find(
    (member) => String(member.id) === String(memberId)
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!sanghaId) {
      setError("Please select a Sangha.");
      return;
    }
    if (!memberId) {
      setError("Please select the member.");
      return;
    }
    if (!message.trim()) {
      setError("Please provide a reason for making this member an Admin.");
      return;
    }

    try {
      setSubmitting(true);
      await api.post(`/admin-requests`, {
        sangha_id: Number(sanghaId),
        requester_id: Number(memberId),
        message: message.trim(),
      });
      onSubmitted();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || "Failed to create Admin request.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rs-modal-overlay" onClick={onClose}>
      <div className="rs-modal" onClick={(e) => e.stopPropagation()}>
        <div className="rs-modal__header">
          <h3 className="rs-modal__title">Make Admin</h3>
          <button className="rs-modal__close" onClick={onClose} disabled={submitting}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="rs-modal__body">
            {error && <div className="rs-field__error">{error}</div>}

            <div className="rs-field">
              <label htmlFor="sangha">Sangha Name</label>
              <select
                id="sangha"
                value={sanghaId}
                onChange={(e) => setSanghaId(e.target.value)}
                disabled={loadingSanghas || submitting}
              >
                <option value="">
                  {loadingSanghas ? "Loading Sanghas..." : "Select Sangha"}
                </option>
                {sanghas.map((sangha) => (
                  <option key={sangha.id} value={sangha.id}>
                    {sangha.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="rs-field">
              <label htmlFor="member">Name of Admin</label>
              <select
                id="member"
                value={memberId}
                onChange={(e) => setMemberId(e.target.value)}
                disabled={loadingMembers || submitting}
              >
                <option value="">
                  {loadingMembers ? "Loading members..." : "Select Member"}
                </option>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="rs-field">
              <label>Email</label>
              <input type="email" value={selectedMember?.email || ""} readOnly placeholder="Member email" />
            </div>

            <div className="rs-field">
              <label>Phone</label>
              <input type="text" value={selectedMember?.phone || ""} readOnly placeholder="Member phone" />
            </div>

            <div className="rs-field">
              <label htmlFor="message">Reason</label>
              <textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Why should this member be made an Admin?"
                rows={5}
                disabled={submitting}
              />
            </div>
          </div>

          <div className="rs-modal__footer">
            <button type="button" className="sa-btn-outline" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="sa-btn-primary" disabled={submitting}>
              {submitting ? "Submitting..." : "Admin Request"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}