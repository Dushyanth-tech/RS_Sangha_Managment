import React from "react";
import { X, Users, Loader2 } from "lucide-react";
import "../pages/MySangha.css";

export default function MembersModal({
  sangha,
  members,
  loading,
  error,
  onClose,
}) {
  if (!sangha) return null;

  return (
    <div className="md-modal-overlay" onClick={onClose}>
      <div className="md-modal" onClick={(e) => e.stopPropagation()}>
        <div className="md-modal__header">
          <div>
            <h2>{sangha.name || "Sangha Members"}</h2>
            <p>{sangha.code || ""}</p>
          </div>
          <button
            type="button"
            className="md-modal__close"
            onClick={onClose}
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        <div className="md-modal__body">
          {loading ? (
            <div className="md-empty">
              <Loader2 size={28} className="md-loading-icon" />
              <p>Loading members...</p>
            </div>
          ) : error ? (
            <div className="md-notif-error">{error}</div>
          ) : members.length === 0 ? (
            <div className="md-empty">
              <Users size={28} />
              <p>No members found.</p>
            </div>
          ) : (
            <ol className="md-members-list">
              {members.map((member, index) => (
                <li key={member.id ?? index} className="md-member-list-item">
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
          <button type="button" className="md-modal__done" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}