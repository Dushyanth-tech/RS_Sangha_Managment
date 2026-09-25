import React, { useEffect, useMemo, useState } from "react";
import api from "../../../../api/axiosInstance"; // ⚠️ verify this matches this file's actual depth
import {Bell, Send, FilePenLine } from "lucide-react"
import "./ManageNotifications.css";

const emptyForm = {
  title: "",
  type: "Account Verification",
  recipient: "All Members",
  sanghaMode: "all",
  selectedSanghaIds: [],
  message: "",
  includePath: true,
};

const verificationPath = [
  "Top Bar",
  "Profile",
  "Complete Personal Details",
  "Next",
  "Banking Details",
  "Save Changes",
];

export default function ManageNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [fetchError, setFetchError] = useState("");

  const [sanghas, setSanghas] = useState([]);
  const [sanghasLoading, setSanghasLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");

  const [showModal, setShowModal] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [selectedNotifications, setSelectedNotifications] = useState([]);
  const [clearing, setClearing] = useState(false);

  const fetchNotifications = async () => {
    try {
      setFetching(true);
      setFetchError("");
      const res = await api.get(`/notifications`);
      setNotifications(res.data);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      setFetchError(error.response?.data?.detail || "Failed to load notifications.");
    } finally {
      setFetching(false);
    }
  };

  const fetchSanghas = async () => {
    try {
      setSanghasLoading(true);
      const res = await api.get(`/sanghas`);
      setSanghas(res.data);
    } catch (error) {
      console.error("Error fetching sanghas:", error);
    } finally {
      setSanghasLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    fetchSanghas();
  }, []);

  const filteredNotifications = useMemo(() => {
    return notifications.filter((notification) => {
      const matchesSearch =
        notification.title.toLowerCase().includes(search.toLowerCase()) ||
        notification.message.toLowerCase().includes(search.toLowerCase());

      const matchesStatus = statusFilter === "All" || notification.status === statusFilter;
      const matchesType = typeFilter === "All" || notification.type === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [notifications, search, statusFilter, typeFilter]);

  const totalNotifications = notifications.length;
  const sentCount = notifications.filter((item) => item.status === "Sent").length;
  const draftCount = notifications.filter((item) => item.status === "Draft").length;

  const updateForm = (field, value) => {
    setForm((previous) => ({ ...previous, [field]: value }));
  };

  const toggleSangha = (sanghaId) => {
    setForm((previous) => {
      const already = previous.selectedSanghaIds.includes(sanghaId);
      return {
        ...previous,
        selectedSanghaIds: already
          ? previous.selectedSanghaIds.filter((id) => id !== sanghaId)
          : [...previous.selectedSanghaIds, sanghaId],
      };
    });
  };

  const closeModal = () => {
    setShowModal(false);
    setShowPreview(false);
    setForm(emptyForm);
    setFormError("");
  };

  const saveNotification = async (sendNow = false) => {
    if (!form.title.trim() || !form.message.trim()) {
      setFormError("Please enter notification title and message.");
      return;
    }

    if (form.sanghaMode === "specific" && form.selectedSanghaIds.length === 0) {
      setFormError('Please select at least one Sangha, or choose "All Sanghas".');
      return;
    }

    try {
      setSubmitting(true);
      setFormError("");

      const res = await api.post(`/notifications`, {
        title: form.title.trim(),
        type: form.type,
        recipient: form.recipient,
        sangha_ids: form.sanghaMode === "specific" ? form.selectedSanghaIds : null,
        message: form.message.trim(),
        include_path: form.includePath,
        navigation_path: form.includePath ? verificationPath : null,
        send_now: sendNow,
      });

      setNotifications((previous) => [res.data, ...previous]);
      closeModal();
    } catch (error) {
      console.error("Error saving notification:", error);
      setFormError(error.response?.data?.detail || "Failed to save notification.");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleNotificationSelection = (notificationId) => {
    setSelectedNotifications((previous) =>
      previous.includes(notificationId)
        ? previous.filter((id) => id !== notificationId)
        : [...previous, notificationId],
    );
  };

  const selectAllNotifications = () => {
    const filteredIds = filteredNotifications.map((notification) => notification.id);
    const allSelected = filteredIds.every((id) => selectedNotifications.includes(id));

    if (allSelected) {
      setSelectedNotifications((previous) => previous.filter((id) => !filteredIds.includes(id)));
    } else {
      setSelectedNotifications((previous) => [...new Set([...previous, ...filteredIds])]);
    }
  };

  const clearSelectedNotifications = async () => {
    if (selectedNotifications.length === 0) {
      alert("Please select at least one notification.");
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to clear ${selectedNotifications.length} notification(s)?`,
    );

    if (!confirmed) return;

    try {
      setClearing(true);

      await api.post(`/notifications/clear-selected`, {
        notification_ids: selectedNotifications.map(Number),
      });

      setNotifications((previous) =>
        previous.filter((notification) => !selectedNotifications.includes(notification.id)),
      );

      setSelectedNotifications([]);
    } catch (error) {
      console.error("Error clearing notifications:", error);
      alert(error.response?.data?.detail || "Failed to clear notifications.");
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="mn-page">
      <div className="mn-page-header">
        <div>
          <p className="mn-eyebrow">SUPERADMIN</p>
          <h1 className="mn-title">Manage Notifications</h1>
          <p className="mn-subtitle">
            Send important announcements and account-related instructions to members.
          </p>
        </div>

        <button className="sa-btn-primary mn-send-btn" onClick={() => setShowModal(true)}>
          <span>＋</span>
          Send Notification
        </button>
      </div>

      {fetchError && (
        <div className="sa-error" style={{ marginBottom: "1rem" }}>
          {fetchError}{" "}
          <button className="sa-btn-outline" onClick={fetchNotifications}>
            Retry
          </button>
        </div>
      )}

      <div className="sa-stats-grid mn-stats">
        <div className="sa-stat-card">
          <div className="sa-stat-card__icon"><Bell size={20} strokeWidth={2} /></div>
          <div className="sa-stat-card__body">
            <span className="sa-stat-card__label">Total Notifications</span>
            <span className="sa-stat-card__value">{fetching ? "..." : totalNotifications}</span>
          </div>
        </div>

        <div className="sa-stat-card">
          <div className="sa-stat-card__icon"><Send size={20} strokeWidth={2} /></div>
          <div className="sa-stat-card__body">
            <span className="sa-stat-card__label">Sent</span>
            <span className="sa-stat-card__value">{fetching ? "..." : sentCount}</span>
          </div>
        </div>

        <div className="sa-stat-card">
          <div className="sa-stat-card__icon"><FilePenLine size={20} strokeWidth={2} /></div>
          <div className="sa-stat-card__body">
            <span className="sa-stat-card__label">Drafts</span>
            <span className="sa-stat-card__value">{fetching ? "..." : draftCount}</span>
          </div>
        </div>
      </div>

      <section className="mn-featured">
        <div className="mn-featured-icon"><Send size={20} strokeWidth={2} /></div>

        <div className="mn-featured-content">
          <div className="mn-featured-top">
            <div>
              <span className="mn-featured-label">RECOMMENDED MEMBER NOTIFICATION</span>
              <h2>Please verify your account</h2>
            </div>
            <span className="sa-badge sa-badge--pending">Account Verification</span>
          </div>

          <p>
            Please complete your personal and banking details to verify your account and keep
            your RS-Sangha profile up to date.
          </p>

          <div className="mn-path">
            <span className="mn-path-label">Member navigation path</span>
            <div className="mn-path-steps">
              {verificationPath.map((step, index) => (
                <React.Fragment key={step}>
                  <div className="mn-path-step">
                    <span className="mn-path-number">{index + 1}</span>
                    <span>{step}</span>
                  </div>
                  {index < verificationPath.length - 1 && <span className="mn-path-arrow">→</span>}
                </React.Fragment>
              ))}
            </div>
          </div>

          <div className="mn-featured-actions">
            <button
              className="sa-btn-primary"
              onClick={() => {
                setForm({
                  title: "Please verify your account",
                  type: "Account Verification",
                  recipient: "Members Without Completed Profile or Banking Details",
                  sanghaMode: "all",
                  selectedSanghaIds: [],
                  message:
                    "Please complete your personal and banking details to verify your account and keep your RS-Sangha profile up to date.",
                  includePath: true,
                });
                setShowModal(true);
              }}
            >
              Send to Members
            </button>

            <button className="sa-btn-outline" onClick={() => setShowPreview(true)}>
              Preview
            </button>
          </div>
        </div>
      </section>

      <section className="sa-section">
        <div className="sa-section__header">
          <div>
            <h2 className="sa-section__title">Notification History</h2>
            <p className="mn-section-description">
              View and manage notifications created by the SuperAdmin.
            </p>
          </div>
        </div>

        <div className="mn-filter-bar">
          <div className="mn-search-wrapper">
            <span>⌕</span>
            <input
              type="text"
              placeholder="Search notifications..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="All">All Status</option>
            <option value="Sent">Sent</option>
            <option value="Draft">Draft</option>
          </select>

          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="All">All Types</option>
            <option value="Account Verification">Account Verification</option>
            <option value="Profile">Profile</option>
            <option value="Announcement">Announcement</option>
            <option value="Important">Important</option>
          </select>

          <button
            className="sa-btn-outline mn-clear-btn"
            onClick={clearSelectedNotifications}
            disabled={selectedNotifications.length === 0 || clearing}
          >
            {clearing ? "Clearing..." : `Clear Selected (${selectedNotifications.length})`}
          </button>
        </div>

        <div className="sa-table-wrapper mn-table-wrapper">
          <table className="sa-table">
            <thead>
              <tr>
                <th>
                  <div className="mn-select-all">
                    <input
                      type="checkbox"
                      checked={
                        filteredNotifications.length > 0 &&
                        filteredNotifications.every((notification) =>
                          selectedNotifications.includes(notification.id),
                        )
                      }
                      onChange={selectAllNotifications}
                    />
                    <span>All</span>
                  </div>
                </th>
                <th>Notification</th>
                <th>Type</th>
                <th>Sangha</th>
                <th>Recipient</th>
                <th>Status</th>
                <th>Sent / Created</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {fetching ? (
                <tr>
                  <td colSpan="7" className="sa-table__empty">
                    Loading notifications...
                  </td>
                </tr>
              ) : filteredNotifications.length === 0 ? (
                <tr>
                  <td colSpan="7" className="sa-table__empty">
                    No notifications found.
                  </td>
                </tr>
              ) : (
                filteredNotifications.map((notification) => (
                  <tr key={notification.id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedNotifications.includes(notification.id)}
                        onChange={() => toggleNotificationSelection(notification.id)}
                      />
                    </td>
                    <td>
                      <span className="mn-type">{notification.type}</span>
                    </td>
                    <td>{notification.sanghaLabel || "All Sanghas"}</td>
                    <td>{notification.recipient}</td>
                    <td>
                      <span
                        className={`sa-badge ${
                          notification.status === "Sent" ? "sa-badge--approved" : "sa-badge--pending"
                        }`}
                      >
                        {notification.status}
                      </span>
                    </td>
                    <td>{notification.sentAt}</td>
                    <td>
                      <button
                        className="mn-view-btn"
                        onClick={() => {
                          setForm({
                            title: notification.title,
                            type: notification.type,
                            recipient: notification.recipient,
                            sanghaMode: notification.sanghaIds?.length ? "specific" : "all",
                            selectedSanghaIds: notification.sanghaIds || [],
                            message: notification.message,
                            includePath: notification.path.length > 0,
                          });
                          setShowPreview(true);
                        }}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {showModal && (
        <div
          className="mn-modal-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !submitting) {
              closeModal();
            }
          }}
        >
          <div className="mn-modal">
            <div className="mn-modal-header">
              <div>
                <span className="mn-eyebrow">CREATE NOTIFICATION</span>
                <h2>Send Notification</h2>
                <p>Create an announcement for your members.</p>
              </div>

              <button className="mn-close" onClick={closeModal} disabled={submitting}>
                ×
              </button>
            </div>

            <div className="mn-modal-body">
              {formError && (
                <div className="sa-error" style={{ marginBottom: "1rem" }}>
                  {formError}
                </div>
              )}

              <div className="mn-form-group">
                <label>Notification Title</label>
                <input
                  type="text"
                  placeholder="Enter notification title"
                  value={form.title}
                  onChange={(e) => updateForm("title", e.target.value)}
                  disabled={submitting}
                />
              </div>

              <div className="mn-form-row">
                <div className="mn-form-group">
                  <label>Notification Type</label>
                  <select
                    value={form.type}
                    onChange={(e) => updateForm("type", e.target.value)}
                    disabled={submitting}
                  >
                    <option>Account Verification</option>
                    <option>Profile</option>
                    <option>Announcement</option>
                    <option>Important</option>
                  </select>
                </div>

                <div className="mn-form-group">
                  <label>Send To</label>
                  <select
                    value={form.recipient}
                    onChange={(e) => updateForm("recipient", e.target.value)}
                    disabled={submitting}
                  >
                    <option>All Members</option>
                    <option>Members Without Completed Profile</option>
                    <option>Members Without Banking Details</option>
                    <option>Members Without Completed Profile or Banking Details</option>
                  </select>
                </div>
              </div>

              <div className="mn-form-group">
                <label>Sangha</label>

                <div className="mn-sangha-mode">
                  <label className="mn-radio">
                    <input
                      type="radio"
                      name="sanghaMode"
                      checked={form.sanghaMode === "all"}
                      onChange={() => updateForm("sanghaMode", "all")}
                      disabled={submitting}
                    />
                    <span>All Sanghas</span>
                  </label>

                  <label className="mn-radio">
                    <input
                      type="radio"
                      name="sanghaMode"
                      checked={form.sanghaMode === "specific"}
                      onChange={() => updateForm("sanghaMode", "specific")}
                      disabled={submitting}
                    />
                    <span>Specific Sanghas</span>
                  </label>
                </div>

                {form.sanghaMode === "specific" && (
                  <div className="mn-sangha-list">
                    {sanghasLoading ? (
                      <div className="mn-sangha-list__empty">Loading sanghas...</div>
                    ) : sanghas.length === 0 ? (
                      <div className="mn-sangha-list__empty">No sanghas found.</div>
                    ) : (
                      sanghas.map((sangha) => (
                        <label key={sangha.id} className="mn-checkbox mn-sangha-item">
                          <input
                            type="checkbox"
                            checked={form.selectedSanghaIds.includes(sangha.id)}
                            onChange={() => toggleSangha(sangha.id)}
                            disabled={submitting}
                          />
                          <span>{sangha.name}</span>
                        </label>
                      ))
                    )}
                  </div>
                )}
              </div>

              <div className="mn-form-group">
                <label>Message</label>
                <textarea
                  rows="5"
                  placeholder="Write your notification..."
                  value={form.message}
                  onChange={(e) => updateForm("message", e.target.value)}
                  disabled={submitting}
                />
              </div>

              <label className="mn-checkbox">
                <input
                  type="checkbox"
                  checked={form.includePath}
                  onChange={(e) => updateForm("includePath", e.target.checked)}
                  disabled={submitting}
                />
                <span>Include member navigation instructions</span>
              </label>

              {form.includePath && (
                <div className="mn-form-path">
                  <div className="mn-form-path-title">Member navigation path</div>
                  <div className="mn-form-path-list">
                    {verificationPath.map((step, index) => (
                      <div className="mn-form-path-item" key={step}>
                        <span>{index + 1}</span>
                        {step}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="mn-modal-footer">
              <button className="sa-btn-outline" onClick={closeModal} disabled={submitting}>
                Cancel
              </button>

              <button
                className="sa-btn-outline"
                onClick={() => saveNotification(false)}
                disabled={submitting}
              >
                {submitting ? "Saving..." : "Save Draft"}
              </button>

              <button
                className="sa-btn-primary"
                onClick={() => saveNotification(true)}
                disabled={submitting}
              >
                {submitting ? "Sending..." : "Send Notification"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showPreview && (
        <div
          className="mn-modal-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setShowPreview(false);
            }
          }}
        >
          <div className="mn-preview-modal">
            <div className="mn-preview-header">
              <div>
                <span className="mn-eyebrow">MEMBER PREVIEW</span>
                <h2>Notification Preview</h2>
              </div>

              <button className="mn-close" onClick={() => setShowPreview(false)}>
                ×
              </button>
            </div>

            <div className="mn-member-notification">
              <div className="mn-member-notification-icon"><Bell size={20} strokeWidth={2} /></div>

              <div>
                <div className="mn-member-notification-meta">
                  RS-Sangha
                  <span>•</span>
                  Just now
                </div>

                <h3>{form.title || "Please verify your account"}</h3>

                <p>
                  {form.message ||
                    "Please complete your personal and banking details to verify your account."}
                </p>
              </div>
            </div>

            {form.includePath && (
              <div className="mn-preview-path">
                <h3>How to complete your details</h3>

                <div className="mn-preview-path-list">
                  {verificationPath.map((step, index) => (
                    <React.Fragment key={step}>
                      <div className="mn-preview-path-step">
                        <span>{index + 1}</span>
                        <strong>{step}</strong>
                      </div>
                      {index < verificationPath.length - 1 && (
                        <div className="mn-preview-arrow">↓</div>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            )}

            <div className="mn-preview-footer">
              <span>
                {form.sanghaMode === "all"
                  ? "All Sanghas"
                  : sanghas
                      .filter((s) => form.selectedSanghaIds.includes(s.id))
                      .map((s) => s.name)
                      .join(", ") || "No Sangha selected"}
                {" · "}
                {form.recipient}
              </span>

              <button
                className="sa-btn-primary"
                onClick={() => {
                  setShowPreview(false);
                  setShowModal(true);
                }}
              >
                Edit Notification
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}