import React from "react";
import { Bell } from "lucide-react";

export default function Notifications({
  notifications,
  loading,
  error,
  markingId,
  onRetry,
  onMarkRead,
}) {
  return (
    <section className="md-page">
      <div className="md-page__header">
        <h1 className="md-page__title">Notifications</h1>
        <p className="md-page__subtitle">
          View your latest Sangha notifications and updates.
        </p>
      </div>

      {error && (
        <div className="md-notif-error">
          {error}{" "}
          <button type="button" className="md-notif-error__retry" onClick={onRetry}>
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <section className="md-panel">
          <div className="md-empty">
            <p>Loading notifications...</p>
          </div>
        </section>
      ) : notifications.length === 0 ? (
        <section className="md-panel">
          <div className="md-empty">
            <div className="md-empty__icon">
              <Bell size={28} strokeWidth={1.8} />
            </div>
            <h3>No notifications</h3>
            <p>Your notifications will appear here when you receive updates.</p>
          </div>
        </section>
      ) : (
        <div className="md-notif-list">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`md-notif-item ${!notification.isRead ? "md-notif-item--unread" : ""}`}
              onClick={() => onMarkRead(notification)}
            >
              <div className="md-notif-item__icon">
                <Bell size={18} strokeWidth={2} />
              </div>

              <div className="md-notif-item__body">
                <div className="md-notif-item__top">
                  <strong>{notification.title}</strong>
                  {!notification.isRead && (
                    <span className="md-notif-item__dot">
                      {markingId === notification.id ? "..." : "•"}
                    </span>
                  )}
                </div>

                <p>{notification.message}</p>

                {notification.path && notification.path.length > 0 && (
                  <div className="md-notif-item__path">
                    {notification.path.map((step, index) => (
                      <React.Fragment key={step}>
                        <span className="md-notif-item__path-step">{step}</span>
                        {index < notification.path.length - 1 && (
                          <span className="md-notif-item__path-arrow">→</span>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                )}

                <span className="md-notif-item__time">{notification.sentAt}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}