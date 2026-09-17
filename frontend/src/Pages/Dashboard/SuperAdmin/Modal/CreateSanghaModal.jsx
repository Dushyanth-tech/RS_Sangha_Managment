import React, { useState, useEffect, useRef } from "react";
import axios from "axios";

const API_BASE = "http://localhost:8000";

export default function CreateSanghaModal({ onClose, onCreated }) {
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    city: "",
    state: "",
  });
  const [loading, setLoading] = useState(false);

  // Admin picker state
  const [adminQuery, setAdminQuery] = useState("");
  const [adminResults, setAdminResults] = useState([]);
  const [searchingAdmin, setSearchingAdmin] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const debounceRef = useRef(null);

  const token = () => localStorage.getItem("access_token");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!adminQuery.trim()) {
      setAdminResults([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      try {
        setSearchingAdmin(true);
        const res = await axios.get(`${API_BASE}/users/search`, {
          params: { q: adminQuery, role: "admin" },
          headers: { Authorization: `Bearer ${token()}` },
        });
        setAdminResults(res.data);
      } catch (error) {
        console.error("Error searching admins:", error);
      } finally {
        setSearchingAdmin(false);
      }
    }, 350);

    return () => clearTimeout(debounceRef.current);
  }, [adminQuery]);

  const handleSelectAdmin = (admin) => {
    setSelectedAdmin(admin);
    setAdminQuery("");
    setAdminResults([]);
  };

  const handleSubmit = async (e) => {
  e.preventDefault();
  try {
    setLoading(true);
    await axios.post(
      `${API_BASE}/sanghas`,
      { ...formData, admin_id: selectedAdmin?.id ?? null },
      { headers: { Authorization: `Bearer ${token()}` } }
    );
    onCreated();   // no argument now — just a "done" signal
  } catch (error) {
    console.error("Error creating sangha:", error);
    if (error.response) console.log("Backend error:", error.response.data);
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="sa-modal-overlay">
      <div className="sa-modal">
        <div className="sa-modal__header">
          <h3>Create Sangha</h3>
          <button className="sa-modal__close" onClick={onClose}>&times;</button>
        </div>

        <form className="sa-modal__body" onSubmit={handleSubmit}>
          <label>Name</label>
          <input className="sa-input" name="name" value={formData.name} onChange={handleChange} required />

          <label style={{ marginTop: "0.9rem", display: "block" }}>Address</label>
          <input className="sa-input" name="address" value={formData.address} onChange={handleChange} required />

          <label style={{ marginTop: "0.9rem", display: "block" }}>City</label>
          <input className="sa-input" name="city" value={formData.city} onChange={handleChange} required />

          <label style={{ marginTop: "0.9rem", display: "block" }}>State</label>
          <input className="sa-input" name="state" value={formData.state} onChange={handleChange} required />

          <label style={{ marginTop: "0.9rem", display: "block" }}>Admin (optional)</label>
          {selectedAdmin ? (
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span>{selectedAdmin.name} ({selectedAdmin.email})</span>
              <button type="button" className="sa-btn-outline" onClick={() => setSelectedAdmin(null)}>
                Change
              </button>
            </div>
          ) : (
            <>
              <input
                className="sa-input"
                placeholder="Search admin by name..."
                value={adminQuery}
                onChange={(e) => setAdminQuery(e.target.value)}
              />
              {searchingAdmin && <div className="sa-table__empty">Searching...</div>}
              {adminResults.length > 0 && (
                <div className="sa-table-wrapper" style={{ marginTop: "0.5rem" }}>
                  <table className="sa-table">
                    <tbody>
                      {adminResults.map((a) => (
                        <tr key={a.id} style={{ cursor: "pointer" }} onClick={() => handleSelectAdmin(a)}>
                          <td>{a.name}</td>
                          <td>{a.email}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          <button className="sa-btn-primary" type="submit" disabled={loading} style={{ marginTop: "1.25rem" }}>
            {loading ? "Creating..." : "Create Sangha"}
          </button>
        </form>
      </div>
    </div>
  );
}