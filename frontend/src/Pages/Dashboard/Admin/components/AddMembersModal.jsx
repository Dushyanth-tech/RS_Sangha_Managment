import React, { useState, useEffect, useRef } from "react";
import axios from "axios";

const API_BASE = "http://localhost:8000";

export default function AddMembersModal({ sangha, onClose, onMemberAdded }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addingId, setAddingId] = useState(null);
  const debounceRef = useRef(null);

  const token = () => localStorage.getItem("access_token");

  const fetchMembers = async (q) => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/users/search`, {
        params: { q, role: "member" },
        headers: { Authorization: `Bearer ${token()}` },
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
      const res = await axios.post(
        `${API_BASE}/sanghas/${sangha.id}/members`,
        { member_id: member.id },
        { headers: { Authorization: `Bearer ${token()}` } }
      );
      onMemberAdded(sangha.id, res.data.membersCount);
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
                ) : results.length === 0 ? (
                  <tr><td colSpan={4} className="sa-table__empty">No members found</td></tr>
                ) : (
                  results.map((m) => (
                    <tr key={m.id}>
                      <td>{m.name}</td>
                      <td>{m.email}</td>
                      <td>{m.phone}</td>
                      <td>
                        <button
                          className="sa-btn-primary"
                          disabled={addingId === m.id}
                          onClick={() => handleAdd(m)}
                        >
                          {addingId === m.id ? "Adding..." : "Add"}
                        </button>
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