import React from "react";
import {
  House,
  ShieldCheck,
  Users,
  Building2,
  Mail,
  ClipboardList,
  Bell,
} from "lucide-react";

const NAV_ITEMS = [
  { key: "overview", label: "Overview", icon: House },
  { key: "sanghas", label: "My Sanghas", icon: Building2 },
  { key: "verify", label: "Members Verifications", icon: Users },
  { key: "notifications", label: "Manage Notifications", icon: Bell },
  { key: "admin-requests", label: "Make Admin", icon: Mail },
];

export default function Sidebar({ activePage, onNavigate, collapsed }) {
  return (
    <aside
      className={`sa-sidebar ${
        collapsed ? "sa-sidebar--collapsed" : ""
      }`}
    >
      <div className="sa-sidebar__brand">
        <span className="sa-sidebar__mark">RS</span>

        {!collapsed && (
          <span className="sa-sidebar__brand-text">
            Super Admin
          </span>
        )}
      </div>

      <nav className="sa-sidebar__nav">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;

          return (
            <button
              key={item.key}
              className={`sa-sidebar__link ${
                activePage === item.key
                  ? "sa-sidebar__link--active"
                  : ""
              }`}
              onClick={() => onNavigate(item.key)}
            >
              <span className="sa-sidebar__icon">
                <Icon size={20} strokeWidth={2} />
              </span>

              {!collapsed && <span>{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {!collapsed && (
        <div className="sa-sidebar__footer">
          <span className="sa-sidebar__badge">Superadmin</span>
        </div>
      )}
    </aside>
  );
}