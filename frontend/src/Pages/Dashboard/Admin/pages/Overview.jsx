import React, { useState, useEffect } from "react";
import api from "../../../../api/axiosInstance"
import {
  Users,
  Building2,
  Mail,
} from "lucide-react";
import StatsCard from "../../../../Common_Component/StatsCard";


export default function Overview() {
  const [sanghas, setSanghas] = useState([]);
  const [requests, setRequests] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);


useEffect(() => {
  api.get(`/sanghas`).then((res) => setSanghas(res.data)).catch(() => {});
  api.get(`/admin-requests/pending-count`)
    .then((res) => setPendingCount(res.data.pending_count))
    .catch(() => {});
}, []);

  const totalMembers = sanghas.reduce((sum, s) => sum + (s.membersCount ?? s.members_count ?? 0), 0);
  // const pending = requests.filter((r) => r.status === "pending").length;

  return (
    <div className="sa-page">
      <div className="sa-stats-grid">
        <StatsCard label="Sanghas Managed" value={sanghas.length} icon={<Building2 size={20}/>} />
        <StatsCard label="Total Members" value={totalMembers} icon={<Users size={20}/>} />
        <StatsCard label="Pending Admin Requests" value={pendingCount} icon={<Mail size={20}/>} />
      </div>
    </div>
  );
}
