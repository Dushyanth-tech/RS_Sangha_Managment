import React, { useState, useEffect, useRef } from "react";
import api from "../../../../api/axiosInstance"; // ⚠️ verify this matches your actual folder depth

export default function AddMembersModal({ sangha, onClose, onMemberAdded }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addingId, setAddingId] = useState(null);
  const debounceRef = useRef(null);

  const fetchMembers = async (q) => {
    try {
      setLoading(true);
      const res = await api.get(`/users/search`, {
        params: { q, role: "member" },
      });
      setResults(res.data);
    } catch (error) {
      console.error("Error fetching members:", error);
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
    try {
      setAddingId(member.id);
      const res = await api.post(`/sanghas/${sangha.id}/members`, {
        member_id: member.id,
      });
      onMemberAdded(sangha.id, res.data.membersCount);
      fetchMembers(query); // refresh so the row flips from Add to Member/Added state
    } catch (error) {
      console.error("Error adding member:", error);
      if (error.response) console.log("Backend error:", error.response.data);
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
                            disabled={addingId === m.id}
                            onClick={() => handleAdd(m)}
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