import React, { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { removeNotification } from "../../../../redux/slices/notificationSlice";
import { Trash2 } from "lucide-react";
import "./Notification.css";

const Notification = ({ notification }) => {
    const dispatch = useDispatch();
    const [timeAgoRefresh, setTimeAgoRefresh] = useState(0);
    const [imgFailed, setImgFailed] = useState(false);

    useEffect(() => {
        const interval = setInterval(() => {
            setTimeAgoRefresh((prev) => prev + 1);
        }, 60000);
        return () => clearInterval(interval);
    }, []);

    const name = notification?.sender?.name || "System";
    const initials = name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
    const src = notification?.sender?.profilePic;

    return (
        <div className={`nt-toast ${!notification.isSeen ? "unread" : ""}`} data-refresh={timeAgoRefresh}>
            {src && !imgFailed ? (
                <img
                    className="nt-avatar"
                    src={src}
                    alt=""
                    loading="lazy"
                    onError={() => setImgFailed(true)}
                />
            ) : (
                <div className="nt-avatar nt-avatar-fallback">{initials}</div>
            )}

            <div className="nt-content">
                <div className="nt-sender">
                    <span>{name}</span>
                    {!notification.isSeen && <span className="nt-dot" aria-label="Unread" />}
                </div>
                <p className="nt-msg">{notification?.message}</p>
            </div>

            <button
                type="button"
                className="nt-del"
                onClick={() => dispatch(removeNotification(notification._id))}
                title="Dismiss notification"
                aria-label="Dismiss notification"
            >
                <Trash2 size={17} />
            </button>
        </div>
    );
};

export default Notification;