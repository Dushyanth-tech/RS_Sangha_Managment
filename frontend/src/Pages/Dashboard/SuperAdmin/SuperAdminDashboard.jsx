import React, { useState } from "react";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import Overview from "./pages/Overview";
import ManageAdmins from "./pages/ManageAdmins";
import ManageSanghas from "./pages/ManageSanghas";
import SubadminRequests from "./pages/SubadminRequests";
import ActivityLog from "./pages/ActivityLog";
import "./SuperAdminDashboard.css";

const PAGE_TITLES = {
  overview: "Dashboard",
  admins: "Manage Admins",
  sanghas: "Manage Sanghas",
  "subadmin-requests": "Subadmin Requests",
  "activity-log": "Activity Log",
};

const PAGES = {
  overview: Overview,
  admins: ManageAdmins,
  sanghas: ManageSanghas,
  "subadmin-requests": SubadminRequests,
  "activity-log": ActivityLog,
};

const SuperAdminDashboard = () => {
  const [activePage, setActivePage] = useState("overview");
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user");
    window.location.href = "/auth"; // Redirect to login page
  };

  const ActivePageComponent = PAGES[activePage] ?? Overview;

  return (
    <div className="sa-shell">
      <Sidebar activePage={activePage} onNavigate={setActivePage} collapsed={collapsed} />
      <div className="sa-shell__main">
        <Topbar
          title={PAGE_TITLES[activePage]}
          onToggleSidebar={() => setCollapsed((c) => !c)}
          onLogout={handleLogout}
        />
        <main className="sa-shell__content">
          <ActivePageComponent />
        </main>
      </div>
    </div>
  );
};

export default SuperAdminDashboard;
