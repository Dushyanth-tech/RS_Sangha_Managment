import React, { useState } from "react";
import Sidebar from "./components/Sidebar";
import Topbar from "../../../Common_Component/Topbar";
import Overview from "./pages/Overview";
import ManageAdmins from "./pages/ManageAdmins";
import ManageSanghas from "./pages/ManageSanghas";
import ManageMembers from "./pages/ManageMembers";
import SanghaSavingsAccount from "./pages/SanghaSavingsAccount";
import SubadminRequests from "./pages/SubadminRequests";
import ActivityLog from "./pages/ActivityLog";
import ManageNotifications from "./pages/ManageNotifications";
import "./SuperAdminDashboard.css";

const PAGE_TITLES = {
  overview: "Dashboard",
  admins: "Manage Admins",
  sanghas: "Manage Sanghas",
  members:"Manage Members",
  SavingsAccount:"Sanghas Savings Account",
  "subadmin-requests": "Subadmin Requests",
  notifications:"Manage Notification",
  "activity-log": "Activity Log",
};

const PAGES = {
  overview: Overview,
  admins: ManageAdmins,
  sanghas: ManageSanghas,
  members:ManageMembers,
  SavingsAccount:SanghaSavingsAccount,
  "subadmin-requests": SubadminRequests,
  notifications:ManageNotifications,
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
