import React, { useState, useEffect, useRef } from "react";
import api from "../../../../api/axiosInstance"; // ⚠️ verify this matches your actual folder depth

const MAX_MEMBERS = 20;

export default function AddMembersModal({ sangha, onClose, onMemberAdded }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addingId, setAddingId] = useState(null);
  const [error, setError] = useState("");
  const [memberCount, setMemberCount] = useState(sangha.membersCount ?? 0);
  const debounceRef = useRef(null);

  const isFull = memberCount >= MAX_MEMBERS;

  const fetchMembers = async (q) => {
    try {
      setLoading(true);
      const res = await api.get(`/users/search`, {
        params: { q, role: "member" },
      });
      setResults(res.data);
    } catch (err) {
      console.error("Error fetching members:", err);
    } finally {
      setLoading(false);
    }
  };

  // Load all members immediately on open
  useEffect(() => {
    fetchMembers("");
  }, []);

  // Debounced search on typing
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchMembers(query);
    }, 350);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  const handleAdd = async (member) => {
    if (isFull) return;

    try {
      setAddingId(member.id);
      setError("");
      const res = await api.post(`/sanghas/${sangha.id}/members`, {
        member_id: member.id,
      });
      setMemberCount(res.data.membersCount);
      onMemberAdded(sangha.id, res.data.membersCount);
      fetchMembers(query); // refresh so the row flips from Add to Member/Added state
    } catch (err) {
      console.error("Error adding member:", err);
      const detail = err.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Failed to add member.");
    } finally {
      setAddingId(null);
    }
  };

  return (
    <div className="sa-modal-overlay">
      <div className="sa-modal">
        <div className="sa-modal__header">
          <h3>Add Members — {sangha.name}</h3>
          <button className="sa-modal__close" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="sa-modal__body">
          <div style={{ marginBottom: "0.75rem" }}>
            <span className={`sa-badge ${isFull ? "sa-badge--rejected" : "sa-badge--approved"}`}>
              {memberCount} / {MAX_MEMBERS} members
            </span>
            {isFull && (
              <span style={{ marginLeft: "0.6rem", fontSize: "0.8rem" }} className="sa-error">
                This Sangha is full. Remove a member before adding another.
              </span>
            )}
          </div>

          {error && <div className="sa-error" style={{ marginBottom: "0.75rem" }}>{error}</div>}

          <input
            className="sa-input"
            placeholder="Search by name, email or phone..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />

          <div className="sa-table-wrapper" style={{ marginTop: "1rem" }}>
            <table className="sa-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={4} className="sa-table__empty">
                      Loading...
                    </td>
                  </tr>
                ) : results.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="sa-table__empty">
                      No members found
                    </td>
                  </tr>
                ) : (
                  results.map((m) => (
                    <tr key={m.id}>
                      <td>{m.name}</td>
                      <td>{m.email}</td>
                      <td>{m.phone}</td>
                      <td>
                        {m.sanghaId === sangha.id ? (
                          <span className="sa-badge sa-badge--member">Already added</span>
                        ) : m.sanghaId ? (
                          <span className="sa-badge sa-badge--member">
                            Member{m.sanghaName ? ` — ${m.sanghaName}` : ""}
                          </span>
                        ) : (
                          <button
                            className="sa-btn-primary"
                            disabled={addingId === m.id || isFull}
                            onClick={() => handleAdd(m)}
                            title={isFull ? "This Sangha is full" : undefined}
                          >
                            {addingId === m.id ? "Adding..." : "Add"}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}