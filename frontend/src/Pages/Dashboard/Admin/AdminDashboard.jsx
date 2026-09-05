import React, { useState } from "react";
import Sidebar from "./components/Sidebar";
import Topbar from "../SuperAdmin/components/Topbar";
import Overview from "./pages/Overview";
import ManageSanghas from "./pages/ManageSanghas";
import AdminRequests from "./pages/AdminRequests";
import "../SuperAdmin/SuperAdminDashboard.css"; // reuse the sa- theme tokens/layout

const PAGE_TITLES = {
  overview: "Dashboard",
  sanghas: "My Sanghas",
  "admin-requests": "Make Admin",
};

const PAGES = {
  overview: Overview,
  sanghas: ManageSanghas,
  "admin-requests": AdminRequests,
};

const AdminDashboard = () => {
  const [activePage, setActivePage] = useState("overview");
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user");
    window.location.href = "/auth";
  };

  const ActivePageComponent = PAGES[activePage] ?? Overview;

  return (
    <div className="sa-shell">
      <Sidebar activePage={activePage} onNavigate={setActivePage} collapsed={collapsed} />
      <div className="sa-shell__main">
        <Topbar
          title={PAGE_TITLES[activePage]}
          adminName="Admin"
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

export default AdminDashboard;
