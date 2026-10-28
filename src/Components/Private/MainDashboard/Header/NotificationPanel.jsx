import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { RiDeleteBin6Line } from "react-icons/ri";
import toast from "react-hot-toast";
import {
  setNotifications,
  markAsSeen,
  markAllSeen,
  clearAllNotifications,
  removeNotification,
} from "../../../../redux/slices/notificationSlice";
import {
  getNotifications,
  deleteNotification,
  markAsRead,
  markAllAsRead,
  clearAllNotificationsApi,
} from "../../../../hooks/useNotification";
import "./Notification.css";

// ✅ Sales / lead notification types → icon + label + where to open
const TYPE_META = {
  lead_assigned:    { icon: "fa-user-plus",      label: "New lead",        cls: "nt-tag-green",  route: "/SalesMasterGrid" },
  lead_reassigned:  { icon: "fa-share",          label: "Lead reassigned", cls: "nt-tag-amber",  route: "/SalesMasterGrid" },
  lead_transferred: { icon: "fa-right-left",     label: "Leads transferred", cls: "nt-tag-amber", route: "/SalesMasterGrid" },
  survey_assigned:  { icon: "fa-clipboard-list", label: "Survey",          cls: "nt-tag-blue",   route: "/SurveyEngineerDashboard" },
  survey_submitted: { icon: "fa-file-circle-check", label: "Survey report", cls: "nt-tag-blue", route: "/SalesMasterGrid" },
};

const FILTERS = [
  { key: "all",   label: "All" },
  { key: "sales", label: "Sales leads" },
  { key: "unread", label: "Unread" },
];

// ── avatar with initials fallback when the photo is missing or fails to load ──
const SenderAvatar = ({ src, name }) => {
  const [failed, setFailed] = useState(false);
  const initials = (name || "?")
    .split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();

  if (!src || failed) {
    return <div className="nt-avatar nt-avatar-fallback">{initials}</div>;
  }
  return <img className="nt-avatar" src={src} alt="" onError={() => setFailed(true)} />;
};

const NotificationPanel = ({ closePopUp }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const notifications = useSelector((state) => state.notifications.notifications);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    const fetchNotifications = async () => {
      setLoading(true);
      try {
        const fetchedNotifications = await getNotifications();
        if (fetchedNotifications?.success && fetchedNotifications.notifications) {
          dispatch(setNotifications(fetchedNotifications.notifications));
        }
      } catch (error) {
        console.error("Error fetching notifications:", error);
        toast.error("Failed to fetch notifications");
      } finally {
        setLoading(false);
      }
    };
    fetchNotifications();
  }, [dispatch]);

  // ── close with Esc key ──
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && closePopUp();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [closePopUp]);

  // ✅ FIX: mark as read on the server too (old code only changed redux)
  const handleNotificationClick = async (notification) => {
    if (!notification.isSeen) {
      dispatch(markAsSeen(notification._id));
      markAsRead(notification._id);
    }
    const meta = TYPE_META[notification.type];
    if (meta?.route) {
      closePopUp();
      navigate(meta.route);
    }
  };

  const handleMarkAllRead = async () => {
    const res = await markAllAsRead();
    if (res?.success) dispatch(markAllSeen());
  };

  const handleDeleteNotification = async (id) => {
    try {
      const result = await deleteNotification(id);
      if (result && result.success) {
        dispatch(removeNotification(id));
        toast.success("Notification deleted successfully");
      } else {
        toast.error(result?.error || "Failed to delete notification");
      }
    } catch (error) {
      console.error("Error deleting notification:", error);
      toast.error("Failed to delete notification");
    }
  };

  // ✅ FIX: clear all in DB (old code only cleared redux → came back after refresh)
  const handleClearAll = async () => {
    const res = await clearAllNotificationsApi();
    if (res?.success) {
      dispatch(clearAllNotifications());
      toast.success("All notifications cleared");
    }
  };

  const getTimeAgo = (timestamp) => {
    if (!timestamp) return "Just now";
    const time = new Date(timestamp).getTime();
    if (isNaN(time)) return "Just now";

    const seconds = Math.floor((Date.now() - time) / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} day${days !== 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    if (minutes > 0) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
    return "Just now";
  };

  const unseenCount = notifications.filter((n) => !n.isSeen).length;
  const salesUnread = notifications.filter((n) => !n.isSeen && TYPE_META[n.type]).length;

  const visible = notifications.filter((n) => {
    if (filter === "sales") return !!TYPE_META[n.type];
    if (filter === "unread") return !n.isSeen;
    return true;
  });

  return (
    <div
      className="nt-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="nt-title"
      onClick={(e) => e.target === e.currentTarget && closePopUp()}
    >
      <div className="nt-panel">

        {/* ── Header ── */}
        <div className="nt-head">
          <div>
            <div className="nt-title" id="nt-title">
              Notifications
              {unseenCount > 0 && <span className="nt-count">{unseenCount}</span>}
            </div>
            <div className="nt-sub">
              {unseenCount > 0
                ? `You have ${unseenCount} unread notification${unseenCount !== 1 ? "s" : ""}`
                : "You're all caught up"}
            </div>
          </div>
          <div className="nt-head-actions">
            {unseenCount > 0 && (
              <button type="button" className="nt-link" onClick={handleMarkAllRead}>
                Mark all read
              </button>
            )}
            <button type="button" className="nt-close" onClick={closePopUp} aria-label="Close notifications">
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>
        </div>

        {/* ── Filter tabs ── */}
        <div className="nt-tabs" role="tablist">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              role="tab"
              aria-selected={filter === f.key}
              className={`nt-tab ${filter === f.key ? "active" : ""}`}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
              {f.key === "sales" && salesUnread > 0 && <span className="nt-tab-count">{salesUnread}</span>}
            </button>
          ))}
        </div>

        {/* ── List ── */}
        <div className="nt-body">
          {loading ? (
            <div className="nt-empty">
              <span className="nt-spinner"></span>
              <div>Loading notifications…</div>
            </div>
          ) : visible.length > 0 ? (
            visible.map((notification) => {
              const meta = TYPE_META[notification.type];
              return (
                <div
                  key={notification._id}
                  className={`nt-item ${!notification.isSeen ? "unread" : ""}`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <SenderAvatar
                    src={notification?.sender?.profilePic}
                    name={notification?.sender?.name || notification?.senderName}
                  />

                  <div className="nt-content">
                    <div className="nt-sender">
                      <span>{notification?.sender?.name || notification?.senderName || "System"}</span>
                      {!notification.isSeen && <span className="nt-dot" aria-label="Unread" />}
                    </div>
                    {meta && (
                      <span className={`nt-tag ${meta.cls}`}>
                        <i className={`fa-solid ${meta.icon}`}></i> {meta.label}
                      </span>
                    )}
                    <p className="nt-msg">{notification?.message}</p>
                    <div className="nt-time">
                      <i className="fa-regular fa-clock"></i>
                      {getTimeAgo(notification?.createdAt)}
                      {meta && <span className="nt-open">Open <i className="fa-solid fa-arrow-right"></i></span>}
                    </div>
                  </div>

                  <button
                    type="button"
                    className="nt-del"
                    title="Delete notification"
                    aria-label="Delete notification"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteNotification(notification._id);
                    }}
                  >
                    <RiDeleteBin6Line size={17} />
                  </button>
                </div>
              );
            })
          ) : (
            <div className="nt-empty">
              <i className="fa-solid fa-bell-slash"></i>
              <div className="nt-empty-title">
                {filter === "sales" ? "No lead notifications" : filter === "unread" ? "No unread notifications" : "No notifications"}
              </div>
              <div>New leads assigned to you will appear here.</div>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        {notifications && notifications.length > 0 && (
          <div className="nt-foot">
            <button type="button" className="nt-clear" onClick={handleClearAll}>
              <i className="fa-solid fa-trash"></i> Clear all notifications
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationPanel;