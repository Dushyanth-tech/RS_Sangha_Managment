import React from "react";

export default function Topbar({ title, onToggleSidebar, adminName = "Superadmin", onLogout }) {
  return (
    <header className="sa-topbar">
      <div className="sa-topbar__left">
        <button className="sa-topbar__menu-btn" onClick={onToggleSidebar} aria-label="Toggle sidebar">
          ☰
        </button>
        <h1 className="sa-topbar__title">{title}</h1>
      </div>

      <div className="sa-topbar__right">
        <input className="sa-topbar__search" type="text" placeholder="Search admins, sanghas, members..." />
        <div className="sa-topbar__profile">
          <div className="sa-topbar__avatar">{adminName.charAt(0)}</div>
          <span className="sa-topbar__name">{adminName}</span>
        </div>
        <button className="sa-topbar__logout" onClick={onLogout}>
          Logout
        </button>
      </div>
    </header>
  );
}
