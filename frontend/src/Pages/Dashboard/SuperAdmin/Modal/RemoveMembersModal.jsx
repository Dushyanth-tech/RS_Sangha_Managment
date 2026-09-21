import React, { useState, useEffect, useRef } from "react";
import api from "../../../../api/axiosInstance"; // ⚠️ verify depth

export default function RemoveMembersModal({ sangha, onClose, onMemberRemoved }) {
  const [query, setQuery] = useState("");
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState(null);
  const [removedIds, setRemovedIds] = useState(new Set());
  const debounceRef = useRef(null);

  const fetchMembers = async (q) => {
    try {
      setLoading(true);
      const res = await api.get(`/sanghas/${sangha.id}/members`, {
        params: { q },
      });
      setMembers(res.data);
    } catch (error) {
      console.error("Error fetching sangha members:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers("");
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchMembers(query);
    }, 350);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  const handleRemove = async (member) => {
    try {
      setRemovingId(member.id);
      const res = await api.delete(`/sanghas/${sangha.id}/members/${member.id}`);
      setRemovedIds((prev) => new Set(prev).add(member.id));
      onMemberRemoved(sangha.id, res.data.membersCount);
    } catch (error) {
      console.error("Error removing member:", error);
      if (error.response) console.log("Backend error:", error.response.data);
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="sa-modal-overlay">
      <div className="sa-modal">
        <div className="sa-modal__header">
          <h3>Remove Members — {sangha.name}</h3>
          <button className="sa-modal__close" onClick={onClose}>&times;</button>
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
                  <tr><td colSpan={4} className="sa-table__empty">Loading...</td></tr>
                ) : members.length === 0 ? (
                  <tr><td colSpan={4} className="sa-table__empty">No members found</td></tr>
                ) : (
                  members.map((m) => {
                    const isRemoved = removedIds.has(m.id);
                    return (
                      <tr key={m.id}>
                        <td>{m.name}</td>
                        <td>{m.email}</td>
                        <td>{m.phone}</td>
                        <td>
                          <button
                            className={isRemoved ? "sa-btn-disabled" : "sa-btn-outline"}
                            disabled={isRemoved || removingId === m.id}
                            onClick={() => handleRemove(m)}
                          >
                            {isRemoved ? "Removed" : removingId === m.id ? "Removing..." : "Remove"}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}