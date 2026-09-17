import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Users,
  Building2,
  Mail,
} from "lucide-react";
import StatsCard from "../../../../Common_Component/StatsCard";

const API_BASE = "http://localhost:8000";

export default function Overview() {
  const [sanghas, setSanghas] = useState([]);
  const [requests, setRequests] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);
  const token = () => localStorage.getItem("access_token");

  useEffect(() => {
  const headers = { Authorization: `Bearer ${token()}` };
  axios.get(`${API_BASE}/sanghas`, { headers }).then((res) => setSanghas(res.data)).catch(() => {});
  axios.get(`${API_BASE}/admin-requests/pending-count`, { headers })
    .then((res) => setPendingCount(res.data.pending_count))
    .catch(() => {});
}, []);

  const totalMembers = sanghas.reduce((sum, s) => sum + (s.membersCount ?? s.members_count ?? 0), 0);
  // const pending = requests.filter((r) => r.status === "pending").length;

  return (
    <div className="sa-page">
      <div className="sa-stats-grid">
        <StatsCard label="Sanghas Managed" value={sanghas.length} icon={Building2} />
        <StatsCard label="Total Members" value={totalMembers} icon={Users} />
        <StatsCard label="Pending Admin Requests" value={pendingCount} icon={Mail} />
      </div>
    </div>
  );
}
