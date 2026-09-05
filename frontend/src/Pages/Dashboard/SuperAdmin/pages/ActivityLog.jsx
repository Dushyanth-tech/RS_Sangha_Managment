import React, { useState } from "react";
import DataTable from "../components/DataTable";

const initialLog = [
  { id: 1, actor: "Ramesh Kulkarni", role: "Admin", action: "Promoted Anita Joshi to subadmin", timestamp: "2026-09-02 09:14" },
  { id: 2, actor: "Superadmin", role: "Superadmin", action: "Created admin account for Suresh Patil", timestamp: "2026-09-01 18:02" },
  { id: 3, actor: "Anita Joshi", role: "Subadmin", action: "Added 3 new members to Shanti Sangha", timestamp: "2026-09-01 11:47" },
];

export default function ActivityLog() {
  const [log] = useState(initialLog);

  return (
    <div className="sa-page">
      <h2 className="sa-section__title">Activity Log</h2>

      <DataTable
        columns={[
          { key: "actor", label: "Actor" },
          { key: "role", label: "Role" },
          { key: "action", label: "Action" },
          { key: "timestamp", label: "Timestamp" },
        ]}
        rows={log}
      />
    </div>
  );
}
