import React from "react";
import StatsCard from "../components/StatsCard";
import DataTable from "../components/DataTable";

const recentActivity = [
  { id: 1, actor: "Admin - Ramesh", action: "Promoted member to subadmin", sangha: "Shanti Sangha", time: "2h ago" },
  { id: 2, actor: "Superadmin", action: "Created new admin account", sangha: "—", time: "5h ago" },
  { id: 3, actor: "Admin - Kavita", action: "Approved subadmin request", sangha: "Prem Sangha", time: "1d ago" },
];

export default function Overview() {
  return (
    <div className="sa-page">
      <div className="sa-stats-grid">
        <StatsCard label="Total Admins" value="12" icon="👤" trend={{ direction: "up", value: "2 this month" }} />
        <StatsCard label="Total Sanghas" value="34" icon="🏛️" trend={{ direction: "up", value: "4 this month" }} />
        <StatsCard label="Pending Requests" value="6" icon="📩" />
        <StatsCard label="Total Members" value="1,208" icon="👥" trend={{ direction: "up", value: "56 this month" }} />
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
