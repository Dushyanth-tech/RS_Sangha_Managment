import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import "./AddAdminModal.css";

const API_BASE = "http://localhost:8000";

export default function AddAdminModal({ onClose, onAssigned }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [assigningId, setAssigningId] = useState(null);
  const debounceRef = useRef(null);

  const token = () => localStorage.getItem("access_token");

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!query.trim()) {
      setResults([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      try {
        setSearching(true);
        const res = await axios.get(`${API_BASE}/users/search`, {
          params: { q: query, role: "member" },
          headers: { Authorization: `Bearer ${token()}` },
        });
        setResults(res.data);
      } catch (error) {
        console.error("Error searching members:", error);
      } finally {
        setSearching(false);
      }
    }, 350);

    return () => clearTimeout(debounceRef.current);
  }, [query]);

  const handleMakeAdmin = async (member) => {
    try {
      setAssigningId(member.id);
      await axios.post(
        `${API_BASE}/admins`,
        { member_id: member.id },
        { headers: { Authorization: `Bearer ${token()}` } }
      );
      onAssigned(member);
    } catch (error) {
      console.error("Error promoting member:", error);
      if (error.response) console.log("Backend error:", error.response.data);
    } finally {
      setAssigningId(null);
    }
  };

  return (
    <div className="sa-modal-overlay">
      <div className="sa-modal">
        <div className="sa-modal__header">
          <h3>Add Admin</h3>
          <button className="sa-modal__close" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="sa-modal__body">
          <input
            type="text"
            className="sa-input"
            placeholder="Search member by name..."
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
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {searching ? (
                  <tr>
                    <td colSpan={5} className="sa-table__empty">
                      Searching...
                    </td>
                  </tr>
                ) : results.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="sa-table__empty">
                      {query.trim() ? "No members found" : "Type to search"}
                    </td>
                  </tr>
                ) : (
                  results.map((member) => (
                    <tr key={member.id}>
                      <td>{member.name}</td>
                      <td>{member.email}</td>
                      <td>{member.phone}</td>
                      <td>{member.isActive ? "Active" : "Inactive"}</td>
                      <td>
                        <button
                          className="sa-btn-primary"
                          disabled={assigningId === member.id}
                          onClick={() => handleMakeAdmin(member)}
                        >
                          {assigningId === member.id
                            ? "Assigning..."
                            : "Make Admin"}
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