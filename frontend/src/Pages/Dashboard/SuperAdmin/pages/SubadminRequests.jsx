import React, { useState } from "react";
import DataTable from "../components/DataTable";

const initialRequests = [
  { id: 1, member: "Anita Joshi", sangha: "Shanti Sangha", requestedBy: "Ramesh Kulkarni", status: "pending" },
  { id: 2, member: "Deepak Shah", sangha: "Prem Sangha", requestedBy: "Kavita Rao", status: "approved" },
  { id: 3, member: "Neha Verma", sangha: "Karuna Sangha", requestedBy: "Ramesh Kulkarni", status: "rejected" },
];

const badgeClass = {
  pending: "sa-badge--pending",
  approved: "sa-badge--approved",
  rejected: "sa-badge--rejected",
};

export default function SubadminRequests() {
  const [requests] = useState(initialRequests);

  return (
    <div className="sa-page">
      <h2 className="sa-section__title">Subadmin Requests</h2>

      <DataTable
        columns={[
          { key: "member", label: "Member" },
          { key: "sangha", label: "Sangha" },
          { key: "requestedBy", label: "Requested By" },
          {
            key: "status",
            label: "Status",
            render: (row) => <span className={`sa-badge ${badgeClass[row.status]}`}>{row.status}</span>,
          },
        ]}
        rows={requests}
        actions={(row) =>
          row.status === "pending" ? (
            <>
              <button className="sa-btn-primary" style={{ marginRight: "0.5rem" }}>Approve</button>
              <button className="sa-btn-outline">Reject</button>
            </>
          ) : (
            <span style={{ color: "var(--muted)" }}>—</span>
          )
        }
      />
    </div>
  );
}
