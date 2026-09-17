import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import "./RemoveAdminModal.css";

const API_BASE = "http://localhost:8000";

export default function RemoveAdminModal({ admin, onClose, onRemoved }) {
  const [sanghas, setSanghas] = useState([]);
  const [selected, setSelected] = useState([]);
  const [query, setQuery] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const wrapperRef = useRef(null);

  const token = () => localStorage.getItem("access_token");

  const fetchManagedSanghas = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/admins/${admin.id}/sanghas`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      setSanghas(res.data);
    } catch (error) {
      console.error("Error fetching managed sanghas:", error);
      setError("Could not load sanghas for this admin");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchManagedSanghas();
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredSanghas = sanghas.filter(
    (s) =>
      !selected.some((sel) => sel.id === s.id) &&
      s.name.toLowerCase().includes(query.toLowerCase())
  );

  const handleSelect = (sangha) => {
    setSelected((prev) => [...prev, sangha]);
    setQuery("");
    setDropdownOpen(false);
  };

  const handleUnselect = (id) => {
    setSelected((prev) => prev.filter((s) => s.id !== id));
  };

  const handleRemove = async () => {
    if (selected.length === 0) return;

    try {
      setSubmitting(true);
      await axios.delete(`${API_BASE}/admins/${admin.id}/sanghas`, {
        headers: { Authorization: `Bearer ${token()}` },
        data: { sangha_ids: selected.map((s) => s.id) },
      });
      onRemoved(admin.id, selected.map((s) => s.id));
      onClose();
    } catch (error) {
      console.error("Error removing admin from sanghas:", error);
      if (error.response) console.log("Backend error:", error.response.data);
      setError("Failed to remove admin from selected sanghas");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="sa-modal-overlay">
      <div className="sa-modal">
        <div className="sa-modal__header">
          <h3>Remove {admin.name} from Sanghas</h3>
          <button className="sa-modal__close" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="sa-modal__body">
          {error && <p className="sa-error">{error}</p>}

          {loading ? (
            <p>Loading sanghas...</p>
          ) : sanghas.length === 0 ? (
            <p className="sa-table__empty">This admin doesn't manage any sanghas.</p>
          ) : (
            <div className="sa-combobox" ref={wrapperRef}>
              <label className="sa-combobox__label">Select sanghas to remove</label>

              {selected.length > 0 && (
                <div className="sa-combobox__tags">
                  {selected.map((s) => (
                    <span key={s.id} className="sa-tag">
                      {s.name}
                      <button
                        type="button"
                        className="sa-tag__remove"
                        onClick={() => handleUnselect(s.id)}
                      >
                        &times;
                      </button>
                    </span>
                  ))}
                </div>
              )}

              <input
                className="sa-input"
                placeholder={
                  selected.length === sanghas.length
                    ? "All sanghas selected"
                    : "Search sanghas..."
                }
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setDropdownOpen(true);
                }}
                onFocus={() => setDropdownOpen(true)}
                disabled={selected.length === sanghas.length}
              />

              {dropdownOpen && filteredSanghas.length > 0 && (
                <ul className="sa-combobox__dropdown">
                  {filteredSanghas.map((s) => (
                    <li
                      key={s.id}
                      className="sa-combobox__option"
                      onClick={() => handleSelect(s)}
                    >
                      {s.name}
                    </li>
                  ))}
                </ul>
              )}

              {dropdownOpen && query && filteredSanghas.length === 0 && (
                <ul className="sa-combobox__dropdown">
                  <li className="sa-combobox__option sa-combobox__option--empty">
                    No matches found
                  </li>
                </ul>
              )}
            </div>
          )}
        </div>

        <div className="sa-modal__footer">
          <button className="sa-btn-outline" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button
            className="sa-btn-primary"
            onClick={handleRemove}
            disabled={submitting || selected.length === 0}
          >
            {submitting ? "Removing..." : `Remove from ${selected.length || 0} sangha(s)`}
          </button>
        </div>
      </div>
    </div>
  );
}