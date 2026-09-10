import React, { useState, useEffect, useRef } from "react";
import axios from "axios";

const API_BASE = "http://localhost:8000";

export default function RemoveMembersModal({ sangha, onClose, onMemberRemoved }) {
  const [query, setQuery] = useState("");
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState(null);
  const [removedIds, setRemovedIds] = useState(new Set());
  const debounceRef = useRef(null);

  const token = () => localStorage.getItem("access_token");

  const fetchMembers = async (q) => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/sanghas/${sangha.id}/members`, {
        params: { q },
        headers: { Authorization: `Bearer ${token()}` },
      });
      console.log("Fetched members:", res.data); // Debugging log
      setMembers(res.data);
    } catch (error) {
      console.error("Error fetching sangha members:", error);
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

  const handleRemove = async (member) => {
    try {
      setRemovingId(member.id);
      const res = await axios.delete(
        `${API_BASE}/sanghas/${sangha.id}/members/${member.id}`,
        { headers: { Authorization: `Bearer ${token()}` } }
      );
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