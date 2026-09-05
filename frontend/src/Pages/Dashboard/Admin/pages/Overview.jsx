import React, { useState, useEffect } from "react";
import axios from "axios";
import StatsCard from "../../SuperAdmin/components/StatsCard";

const API_BASE = "http://localhost:8000";

export default function Overview() {
  const [sanghas, setSanghas] = useState([]);
  const [requests, setRequests] = useState([]);
  const token = () => localStorage.getItem("access_token");

  useEffect(() => {
    const headers = { Authorization: `Bearer ${token()}` };
    axios.get(`${API_BASE}/sanghas`, { headers }).then((res) => setSanghas(res.data)).catch(() => {});
    axios.get(`${API_BASE}/admin-requests`, { headers }).then((res) => setRequests(res.data)).catch(() => {});
  }, []);

  const totalMembers = sanghas.reduce((sum, s) => sum + (s.membersCount ?? s.members_count ?? 0), 0);
  const pending = requests.filter((r) => r.status === "pending").length;

  return (
    <div className="sa-page">
      <div className="sa-stats-grid">
        <StatsCard label="Sanghas Managed" value={sanghas.length} icon="🏛️" />
        <StatsCard label="Total Members" value={totalMembers} icon="👥" />
        <StatsCard label="Pending Admin Requests" value={pending} icon="📩" />
      </div>
    </div>
  );
}
