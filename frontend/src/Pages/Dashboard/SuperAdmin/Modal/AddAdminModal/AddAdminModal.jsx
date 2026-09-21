import React, { useState, useEffect, useRef } from "react";
import api from "../../../../../api/axiosInstance"; // ⚠️ verify this matches this file's actual depth
import "./AddAdminModal.css";

export default function AddAdminModal({ onClose, onAssigned }) {
  const [sanghas, setSanghas] = useState([]);
  const [sanghaId, setSanghaId] = useState("");
  const [loadingSanghas, setLoadingSanghas] = useState(true);

  const [error, setError] = useState("");

  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const [selectedMember, setSelectedMember] = useState(null);
  const [assigning, setAssigning] = useState(false);

  const debounceRef = useRef(null);
  const justSelectedRef = useRef(false);

  // Search members
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (justSelectedRef.current) {
      justSelectedRef.current = false;
      return;
    }

    if (!query.trim()) {
      setResults([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      try {
        setSearching(true);
        const res = await api.get(`/users/search`, {
          params: { q: query, role: "member,admin" },
        });
        setResults(res.data);
      } catch (error) {
        console.error("Error searching members:", error);
        setError(error.response?.data?.detail || "Failed to search members.");
      } finally {
        setSearching(false);
      }
    }, 350);

    return () => clearTimeout(debounceRef.current);
  }, [query]);

  const handleSelectMember = (member) => {
    justSelectedRef.current = true;
    setSelectedMember(member);
    setQuery(member.name);
    setResults([]);
    setError("");
  };

  // Fetch unassigned Sanghas
  useEffect(() => {
    const fetchSanghas = async () => {
      try {
        const res = await api.get(`/sanghas/unassigned`);
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

  // Make selected member admin
  const handleMakeAdmin = async () => {
    if (!selectedMember) {
      setError("Please select a member.");
      return;
    }

    if (!sanghaId) {
      setError("Please select a Sangha.");
      return;
    }

    try {
      setAssigning(true);
      setError("");

      const res = await api.post(`/admins`, {
        member_id: selectedMember.id,
        sangha_id: Number(sanghaId),
      });

      onAssigned(res.data);
    } catch (error) {
      console.error("Error promoting member:", error);
      setError(error.response?.data?.detail || "Failed to make member admin.");
    } finally {
      setAssigning(false);
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
          <label
            htmlFor="member"
            style={{
              marginBottom: "1rem",
              fontWeight: "bold",
              fontSize: "0.8rem",
              color: "#898989",
            }}
          >
            Search Member Name
          </label>
          <input
            type="text"
            className="sa-input"
            placeholder="Search member by name..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedMember(null);
            }}
            autoFocus
            style={{ margingTop: "1rem" }}
          />
          {error && <div className="sa-error">{error}</div>}

          {query.trim() && !selectedMember && (
            <div className="sa-table-wrapper" style={{ marginTop: "1rem" }}>
              <table className="sa-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Status</th>
                  </tr>
                </thead>

                <tbody>
                  {searching ? (
                    <tr>
                      <td colSpan={4} className="sa-table__empty">
                        Searching...
                      </td>
                    </tr>
                  ) : results.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="sa-table__empty">
                        No members found
                      </td>
                    </tr>
                  ) : (
                    results.map((member) => (
                      <tr
                        key={member.id}
                        onClick={() => handleSelectMember(member)}
                        className={selectedMember?.id === member.id ? "selected-row" : ""}
                        style={{ cursor: "pointer" }}
                      >
                        <td>{member.name}</td>
                        <td>{member.email}</td>
                        <td>{member.phone}</td>
                        <td>{member.isActive ? "Active" : "Inactive"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          <div className="rs-field">
            <label htmlFor="sangha" style={{ marginTop: "1rem" }}>
              Sangha Name
            </label>

            <select
              id="sangha"
              value={sanghaId}
              onChange={(e) => setSanghaId(e.target.value)}
              disabled={loadingSanghas}
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

          <div className="sa-modal__footer">
            <button className="sa-btn-secondary" onClick={onClose} disabled={assigning}>
              Cancel
            </button>

            <button
              className="sa-btn-primary"
              onClick={handleMakeAdmin}
              disabled={assigning || !selectedMember || !sanghaId}
            >
              {assigning ? "Assigning..." : "Make Admin"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}