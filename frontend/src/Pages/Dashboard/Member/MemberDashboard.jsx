import React, { useState, useEffect, useRef } from "react";
import "./MemberDashboard.css";

export default function MemberDashboard() {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const user = JSON.parse(localStorage.getItem("user") || "{}");

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user");
    window.location.href = "/auth";
  };

  const initials = (user.fullname || "M")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="md-shell">
      {/* Sidebar */}
      <aside className="md-sidebar">
        <div className="md-sidebar__brand">R S Sangha</div>

        <nav className="md-nav">
          <a className="md-nav__item md-nav__item--active" href="#">
            <span className="md-nav__icon">⌂</span> Dashboard
          </a>
          <a className="md-nav__item" href="#">
            <span className="md-nav__icon">🏛</span> My Sangha
          </a>
          <a className="md-nav__item" href="#">
            <span className="md-nav__icon">👤</span> Profile
          </a>
        </nav>
      </aside>

      {/* Main column */}
      <div className="md-main">
        {/* Topbar */}
        <header className="md-topbar">
          <div className="md-topbar__title">Dashboard</div>

          <div className="md-profile" ref={menuRef}>
            <button className="md-profile__trigger" onClick={() => setMenuOpen((v) => !v)}>
              <span className="md-avatar">{initials}</span>
              <span className="md-profile__name">{user.fullname || "Member"}</span>
              <span className="md-profile__caret">▾</span>
            </button>

            {menuOpen && (
              <div className="md-profile__menu">
                <div className="md-profile__menu-header">
                  <div className="md-profile__menu-name">{user.fullname || "Member"}</div>
                  <div className="md-profile__menu-email">{user.email || ""}</div>
                </div>
                <button className="md-profile__menu-item" onClick={handleLogout}>
                  Logout
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Content */}
        <main className="md-content">
          <section className="md-welcome">
            <h1 className="md-welcome__title">
              Welcome back, {(user.fullname || "Member").split(" ")[0]}
            </h1>
            <p className="md-welcome__subtitle">
              Here's a quick look at your sangha membership.
            </p>
          </section>

          <section className="md-cards">
            <div className="md-card">
              <div className="md-card__label">Membership Status</div>
              <div className="md-card__value">Active</div>
            </div>
            <div className="md-card">
              <div className="md-card__label">Sangha</div>
              <div className="md-card__value">—</div>
            </div>
            <div className="md-card">
              <div className="md-card__label">Role</div>
              <div className="md-card__value">{user.role || "Member"}</div>
            </div>
          </section>

          <section className="md-panel">
            <h2 className="md-panel__title">My Details</h2>
            <div className="md-detail-grid">
              <div className="md-detail">
                <span className="md-detail__label">Full Name</span>
                <span className="md-detail__value">{user.fullname || "-"}</span>
              </div>
              <div className="md-detail">
                <span className="md-detail__label">Email</span>
                <span className="md-detail__value">{user.email || "-"}</span>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}