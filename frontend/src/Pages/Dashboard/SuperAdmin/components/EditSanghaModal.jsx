import React, { useState, useEffect, useRef } from "react";
import axios from "axios";

const API_BASE = "http://localhost:8000";

export default function EditSanghaModal({ sangha, onClose, onChanged }) {
  const [tab, setTab] = useState("details"); // "details" | "add" | "remove"
  const token = () => localStorage.getItem("access_token");

  // ---------- Details tab ----------
  const [name, setName] = useState(sangha.name || "");
  const [address, setAddress] = useState(sangha.address || "");
  const [city, setCity] = useState(sangha.city || "");
  const [state, setState] = useState(sangha.state || "");
  const [savingDetails, setSavingDetails] = useState(false);
  const [detailsError, setDetailsError] = useState("");

  const handleSaveDetails = async () => {
    const payload = {};
    if (name.trim() && name.trim() !== (sangha.name || "")) payload.name = name.trim();
    if (address.trim() && address.trim() !== (sangha.address || "")) payload.address = address.trim();
    if (city.trim() && city.trim() !== (sangha.city || "")) payload.city = city.trim();
    if (state.trim() && state.trim() !== (sangha.state || "")) payload.state = state.trim();

    if (Object.keys(payload).length === 0) {
      onClose(); // nothing changed, just close
      return;
    }

    try {
      setSavingDetails(true);
      setDetailsError("");
      await axios.patch(`${API_BASE}/sanghas/${sangha.id}`, payload, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      onChanged();
      onClose();
    } catch (err) {
      console.error("Error updating sangha:", err);
      setDetailsError(err.response?.data?.detail || "Failed to update sangha.");
    } finally {
      setSavingDetails(false);
    }
  };

  // ---------- Add members tab ----------
  const [addQuery, setAddQuery] = useState("");
  const [addResults, setAddResults] = useState([]);
  const [addLoading, setAddLoading] = useState(false);
  const [addingId, setAddingId] = useState(null);
  const addDebounceRef = useRef(null);

  const fetchAddResults = async (q) => {
    try {
      setAddLoading(true);
      const res = await axios.get(`${API_BASE}/users/search`, {
        params: { q, role: "member" },
        headers: { Authorization: `Bearer ${token()}` },
      });
      setAddResults(res.data);
    } catch (err) {
      console.error("Error searching members:", err);
    } finally {
      setAddLoading(false);
    }
  };

  useEffect(() => {
    if (tab !== "add") return;
    fetchAddResults("");
  }, [tab]);

  useEffect(() => {
    if (tab !== "add") return;
    if (addDebounceRef.current) clearTimeout(addDebounceRef.current);
    addDebounceRef.current = setTimeout(() => fetchAddResults(addQuery), 350);
    return () => clearTimeout(addDebounceRef.current);
  }, [addQuery, tab]);

  const handleAddMember = async (member) => {
    try {
      setAddingId(member.id);
      await axios.post(
        `${API_BASE}/sanghas/${sangha.id}/members`,
        { member_id: member.id },
        { headers: { Authorization: `Bearer ${token()}` } }
      );
      onChanged();
      fetchAddResults(addQuery);
    } catch (err) {
      console.error("Error adding member:", err);
    } finally {
      setAddingId(null);
    }
  };

  // ---------- Remove members tab ----------
  const [removeQuery, setRemoveQuery] = useState("");
  const [currentMembers, setCurrentMembers] = useState([]);
  const [removeLoading, setRemoveLoading] = useState(false);
  const [removingId, setRemovingId] = useState(null);
  const [removedIds, setRemovedIds] = useState(new Set());
  const removeDebounceRef = useRef(null);

  const fetchCurrentMembers = async (q) => {
    try {
      setRemoveLoading(true);
      const res = await axios.get(`${API_BASE}/sanghas/${sangha.id}/members`, {
        params: { q },
        headers: { Authorization: `Bearer ${token()}` },
      });
      setCurrentMembers(res.data);
    } catch (err) {
      console.error("Error fetching sangha members:", err);
    } finally {
      setRemoveLoading(false);
    }
  };

  useEffect(() => {
    if (tab !== "remove") return;
    fetchCurrentMembers("");
  }, [tab]);


  const handleRemoveMember = async (member) => {
    try {
      setRemovingId(member.id);
      await axios.delete(`${API_BASE}/sanghas/${sangha.id}/members/${member.id}`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      setRemovedIds((prev) => new Set(prev).add(member.id));
      onChanged();
    } catch (err) {
      console.error("Error removing member:", err);
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="sa-modal-overlay">
      <div className="sa-modal">
        <div className="sa-modal__header">
          <h3>Edit — {sangha.name}</h3>
          <button className="sa-modal__close" onClick={onClose}>&times;</button>
        </div>

        <div className="sa-modal__tabs" style={{ display: "flex", gap: "0.5rem", padding: "0 1rem" }}>
          {["details", "add", "remove"].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={tab === t ? "sa-btn-primary" : "sa-btn-outline"}
              style={{ fontSize: "0.85rem" }}
            >
              {t === "details" ? "Details" : t === "add" ? "Add Members" : "Remove Members"}
            </button>
          ))}
        </div>

        <div className="sa-modal__body">
          {tab === "details" && (
            <>
              {detailsError && <div className="sa-error">{detailsError}</div>}

              <div className="rs-field">
                <label>Sangha Name</label>
                <input className="sa-input" value={name} onChange={(e) => setName(e.target.value)} />
              </div>

              <div className="rs-field">
                <label>Address</label>
                <input className="sa-input" value={address} onChange={(e) => setAddress(e.target.value)} />
              </div>

              <div className="rs-field">
                <label>City</label>
                <input className="sa-input" value={city} onChange={(e) => setCity(e.target.value)} />
              </div>

              <div className="rs-field">
                <label>State</label>
                <input className="sa-input" value={state} onChange={(e) => setState(e.target.value)} />
              </div>
            </>
          )}

          {tab === "add" && (
            <>
              <input
                className="sa-input"
                placeholder="Search members to add..."
                value={addQuery}
                onChange={(e) => setAddQuery(e.target.value)}
                autoFocus
              />
              <div className="sa-table-wrapper" style={{ marginTop: "1rem" }}>
                <table className="sa-table">
                  <thead>
                    <tr><th>Name</th><th>Email</th><th>Phone</th><th></th></tr>
                  </thead>
                  <tbody>
                    {addLoading ? (
                      <tr><td colSpan={4} className="sa-table__empty">Loading...</td></tr>
                    ) : addResults.length === 0 ? (
                      <tr><td colSpan={4} className="sa-table__empty">No members found</td></tr>
                    ) : (
                      addResults.map((m) => (
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
                                onClick={() => handleAddMember(m)}
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
            </>
          )}

          {tab === "remove" && (
            <>
              <input
                className="sa-input"
                placeholder="Search current members to remove..."
                value={removeQuery}
                onChange={(e) => setRemoveQuery(e.target.value)}
                autoFocus
              />
              <div className="sa-table-wrapper" style={{ marginTop: "1rem" }}>
                <table className="sa-table">
                  <thead>
                    <tr><th>Name</th><th>Email</th><th>Phone</th><th></th></tr>
                  </thead>
                  <tbody>
                    {removeLoading ? (
                      <tr><td colSpan={4} className="sa-table__empty">Loading...</td></tr>
                    ) : currentMembers.length === 0 ? (
                      <tr><td colSpan={4} className="sa-table__empty">No members found</td></tr>
                    ) : (
                      currentMembers.map((m) => {
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
                                onClick={() => handleRemoveMember(m)}
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
            </>
          )}
        </div>

        {tab === "details" && (
          <div className="sa-modal__footer">
            <button className="sa-btn-outline" onClick={onClose} disabled={savingDetails}>
              Cancel
            </button>
            <button className="sa-btn-primary" onClick={handleSaveDetails} disabled={savingDetails}>
              {savingDetails ? "Saving..." : "Save Changes"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}