import React, { useState, useEffect, useRef } from "react";
import api from "../../../api/axiosInstance"; // ⚠️ verify this matches this file's actual depth
import {
  House,
  Building2,
  Bell,
  ChevronDown,
} from "lucide-react";

import "./MemberDashboard.css";
import ProfileWizard from "./pages/ProfileWizard";
import MySangha from "./pages/MySangha";
import Notifications from "./pages/Notifications";

export default function MemberDashboard() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [page, setPage] = useState("home");

  const menuRef = useRef(null);

  const user = JSON.parse(localStorage.getItem("user") || "{}");

  // ================= NOTIFICATIONS =================
  // Lifted here (rather than living inside Notifications.jsx) because the
  // unread count badge in the top nav needs this data too.

  const [notifications, setNotifications] = useState([]);
  const [notifLoading, setNotifLoading] = useState(true);
  const [notifError, setNotifError] = useState("");
  const [markingId, setMarkingId] = useState(null);

  const unreadNotifications = notifications.filter((n) => !n.isRead).length;

  const fetchNotifications = async () => {
    try {
      setNotifLoading(true);
      setNotifError("");
      const res = await api.get(`/me/notifications`);
      setNotifications(res.data);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      setNotifError(
        error.response?.data?.detail || "Failed to load notifications."
      );
    } finally {
      setNotifLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkRead = async (notification) => {
    if (notification.isRead) return;

    try {
      setMarkingId(notification.id);
      await api.patch(`/me/notifications/${notification.id}/read`, {});
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notification.id ? { ...n, isRead: true } : n
        )
      );
    } catch (error) {
      console.error("Error marking notification as read:", error);
    } finally {
      setMarkingId(null);
    }
  };

  // Close profile dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Logout
  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user");
    window.location.href = "/auth";
  };

  // User initials
  const initials = (user.fullname || "Member")
    .split(" ")
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  // Navigation
  const handleNavigation = (selectedPage) => {
    setPage(selectedPage);
    setMenuOpen(false);
  };

  return (
    <div className="md-shell">
      <header className="md-topbar">
        <div className="md-brand" onClick={() => handleNavigation("home")}>
          <div className="md-brand__mark">RS</div>
          <div className="md-brand__text">
            <span className="md-brand__title">R S Sangha</span>
            <span className="md-brand__subtitle">Member Portal</span>
          </div>
        </div>

        <nav className="md-navigation">
          <button
            type="button"
            className={`md-navigation__item ${page === "home" ? "md-navigation__item--active" : ""}`}
            onClick={() => handleNavigation("home")}
          >
            <House size={18} strokeWidth={2} />
            <span>Home</span>
          </button>

          <button
            type="button"
            className={`md-navigation__item ${page === "sangha" ? "md-navigation__item--active" : ""}`}
            onClick={() => handleNavigation("sangha")}
          >
            <Building2 size={18} strokeWidth={2} />
            <span>My Sangha</span>
          </button>

          <button
            type="button"
            className={`md-navigation__item ${page === "notifications" ? "md-navigation__item--active" : ""}`}
            onClick={() => handleNavigation("notifications")}
          >
            <span className="md-navigation__notification-icon">
              <Bell size={18} strokeWidth={2} />
              {unreadNotifications > 0 && (
                <span className="md-notification-badge">
                  {unreadNotifications > 9 ? "9+" : unreadNotifications}
                </span>
              )}
            </span>
            <span>Notifications</span>
          </button>
        </nav>

        <div className="md-profile" ref={menuRef}>
          <button
            type="button"
            className="md-profile__trigger"
            onClick={() => setMenuOpen((value) => !value)}
          >
            <span className="md-avatar">{initials}</span>
            <span className="md-profile__name">{user.fullname || "Member"}</span>
            <ChevronDown size={16} className="md-profile__caret" />
          </button>

          {menuOpen && (
            <div className="md-profile__menu">
              <div className="md-profile__menu-header">
                <div className="md-profile__menu-name">{user.fullname || "Member"}</div>
                <div className="md-profile__menu-email">{user.email || ""}</div>
              </div>

              <button type="button" className="md-profile__menu-item" onClick={() => handleNavigation("profile")}>
                My Profile
              </button>

              <button type="button" className="md-profile__menu-item" onClick={handleLogout}>
                Logout
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="md-content">
        {page === "home" && (
          <>
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
                <div className="md-card__value">{user.role || "member"}</div>
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

            <section className="md-panel">
              <h2 className="md-panel__title">Membership Information</h2>
              <div className="md-detail-grid">
                <div className="md-detail">
                  <span className="md-detail__label">Membership Status</span>
                  <span className="md-detail__value">Active</span>
                </div>

                <div className="md-detail">
                  <span className="md-detail__label">Member Role</span>
                  <span className="md-detail__value">{user.role || "member"}</span>
                </div>

                <div className="md-detail">
                  <span className="md-detail__label">Sangha</span>
                  <span className="md-detail__value">—</span>
                </div>

                <div className="md-detail">
                  <span className="md-detail__label">Member Since</span>
                  <span className="md-detail__value">—</span>
                </div>
              </div>
            </section>
          </>
        )}

        {page === "sangha" && <MySangha />}

        {page === "notifications" && (
          <Notifications
            notifications={notifications}
            loading={notifLoading}
            error={notifError}
            markingId={markingId}
            onRetry={fetchNotifications}
            onMarkRead={handleMarkRead}
          />
        )}

        {page === "profile" && (
          <section className="md-profile-page">
            <ProfileWizard onBack={() => setPage("home")} />
          </section>
        )}
      </main>
    </div>
  );
}