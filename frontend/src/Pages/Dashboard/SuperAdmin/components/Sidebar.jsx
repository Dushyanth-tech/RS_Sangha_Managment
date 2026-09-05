import React from "react";

const NAV_ITEMS = [
  { key: "overview", label: "Overview", icon: "🏠" },
  { key: "admins", label: "Manage Admins", icon: "👤" },
  { key: "sanghas", label: "Manage Sanghas", icon: "🏛️" },
  { key: "subadmin-requests", label: "Subadmin Requests", icon: "📩" },
  { key: "activity-log", label: "Activity Log", icon: "📜" },
];

export default function Sidebar({ activePage, onNavigate, collapsed }) {
  return (
    <aside className={`sa-sidebar ${collapsed ? "sa-sidebar--collapsed" : ""}`}>
      <div className="sa-sidebar__brand">
        <span className="sa-sidebar__mark">RS</span>
        {!collapsed && <span className="sa-sidebar__brand-text">Super Admin</span>}
      </div>

      <nav className="sa-sidebar__nav">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.key}
            className={`sa-sidebar__link ${activePage === item.key ? "sa-sidebar__link--active" : ""}`}
            onClick={() => onNavigate(item.key)}
          >
            <span className="sa-sidebar__icon">{item.icon}</span>
            {!collapsed && <span>{item.label}</span>}
          </button>
        ))}
      </nav>

      {!collapsed && (
        <div className="sa-sidebar__footer">
          <span className="sa-sidebar__badge">Superadmin</span>
        </div>
      )}
    </aside>
  );
}
