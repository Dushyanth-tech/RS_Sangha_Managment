import React, { useState, useEffect } from "react";
import axios from "axios";
import StatsCard from "../components/StatsCard";
import DataTable from "../components/DataTable";

const API_BASE = "http://localhost:8000";

const recentActivity = [
  { id: 1, actor: "Admin - Ramesh", action: "Promoted member to subadmin", sangha: "Shanti Sangha", time: "2h ago" },
  { id: 2, actor: "Superadmin", action: "Created new admin account", sangha: "—", time: "5h ago" },
  { id: 3, actor: "Admin - Kavita", action: "Approved subadmin request", sangha: "Prem Sangha", time: "1d ago" },
];

export default function Overview() {
  const [stats, setStats] = useState({
    totalAdmins: null,
    totalSanghas: null,
    pendingRequests: null,
    totalMembers: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const token = () => localStorage.getItem("access_token");

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/overview`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      setStats(res.data);
      console.log("Fetched stats:", res.data);
      setError(null);
    } catch (error) {
      console.error("Error fetching stats:", error);
      if (error.response) console.log("Backend error:", error.response.data);
      setError("Could not load dashboard stats");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <div className="sa-page">
      {error && <p className="sa-error">{error}</p>}

      <div className="sa-stats-grid">
        <StatsCard label="Total Admins" value={loading ? "…" : stats.totalAdmins} icon="👤" />
        <StatsCard label="Total Sanghas" value={loading ? "…" : stats.totalSanghas} icon="🏛️" />
        <StatsCard label="Pending Requests" value={loading ? "…" : stats.pendingRequests} icon="📩" />
        <StatsCard label="Total Members" value={loading ? "…" : stats.totalMembers} icon="👥" />
      </div>

      <div className="sa-section">
        <h2 className="sa-section__title">Recent Activity</h2>
        <DataTable
          columns={[
            { key: "actor", label: "Actor" },
            { key: "action", label: "Action" },
            { key: "sangha", label: "Sangha" },
            { key: "time", label: "Time" },
          ]}
          rows={recentActivity}
        />
      </div>
    </div>
  );
}