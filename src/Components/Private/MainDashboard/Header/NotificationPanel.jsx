import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RiDeleteBin6Line } from "react-icons/ri";
import toast from "react-hot-toast";
import {
  setNotifications,
  markAsSeen,
  clearAllNotifications,
  removeNotification,
} from "../../../../redux/slices/notificationSlice";
import { getNotifications, deleteNotification } from "../../../../hooks/useNotification";
import "./Notification.css";

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
  const notifications = useSelector((state) => state.notifications.notifications);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNotifications = async () => {
      setLoading(true);
      try {
        const fetchedNotifications = await getNotifications();
        console.log("Fetched notifications:", fetchedNotifications);

        if (fetchedNotifications.success && fetchedNotifications.notifications) {
          dispatch(setNotifications(fetchedNotifications.notifications));
        } else {
          console.error("Failed to fetch notifications:", fetchedNotifications);
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

  const handleNotificationClick = (id) => {
    dispatch(markAsSeen(id));
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

  const getTimeAgo = (timestamp) => {
    if (!timestamp) return "Just now";

    const timeNow = Date.now();
    const time = new Date(timestamp).getTime();

    if (isNaN(time)) {
      console.warn("Invalid timestamp:", timestamp);
      return "Just now";
    }

    const difference = timeNow - time;
    const seconds = Math.floor(difference / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} day${days !== 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    if (minutes > 0) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
    return `${seconds} second${seconds !== 1 ? 's' : ''} ago`;
  };

  // Count unseen notifications
  const unseenCount = notifications.filter(notification => !notification.isSeen).length;

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
          <button type="button" className="nt-close" onClick={closePopUp} aria-label="Close notifications">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        {/* ── List ── */}
        <div className="nt-body">
          {loading ? (
            <div className="nt-empty">
              <span className="nt-spinner"></span>
              <div>Loading notifications…</div>
            </div>
          ) : notifications && notifications.length > 0 ? (
            notifications.map((notification) => (
              <div
                key={notification._id}
                className={`nt-item ${!notification.isSeen ? "unread" : ""}`}
                onClick={() => handleNotificationClick(notification._id)}
              >
                <SenderAvatar
                  src={notification?.sender?.profilePic}
                  name={notification?.sender?.name}
                />

                <div className="nt-content">
                  <div className="nt-sender">
                    <span>{notification?.sender?.name || "System"}</span>
                    {!notification.isSeen && <span className="nt-dot" aria-label="Unread" />}
                  </div>
                  <p className="nt-msg">{notification?.message}</p>
                  <div className="nt-time">
                    <i className="fa-regular fa-clock"></i>
                    {getTimeAgo(notification?.createdAt)}
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
            ))
          ) : (
            <div className="nt-empty">
              <i className="fa-solid fa-bell-slash"></i>
              <div className="nt-empty-title">No notifications</div>
              <div>New updates about your work will appear here.</div>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        {notifications && notifications.length > 0 && (
          <div className="nt-foot">
            <button type="button" className="nt-clear" onClick={() => dispatch(clearAllNotifications())}>
              <i className="fa-solid fa-trash"></i> Clear all notifications
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationPanel;