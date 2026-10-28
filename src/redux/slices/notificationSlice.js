import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    notifications: [],
    unreadCount: 0,       // ✅ NEW: server-side badge count
    salesUnreadCount: 0,  // ✅ NEW: only lead/sales notifications
};

const notificationSlice = createSlice({
    name: "notifications",
    initialState,
    reducers: {
        setNotifications: (state, action) => {
            state.notifications = action.payload;
            state.unreadCount = action.payload.filter((n) => !n.isSeen).length;
        },
        // ✅ NEW
        setUnreadCount: (state, action) => {
            state.unreadCount = action.payload.unreadCount ?? 0;
            state.salesUnreadCount = action.payload.salesUnreadCount ?? 0;
        },
        markAsSeen: (state, action) => {
            const target = state.notifications.find((n) => n._id === action.payload);
            if (target && !target.isSeen) {
                target.isSeen = true;
                state.unreadCount = Math.max(0, state.unreadCount - 1);
                if (target.type && target.type !== "general") {
                    state.salesUnreadCount = Math.max(0, state.salesUnreadCount - 1);
                }
            }
        },
        // ✅ NEW
        markAllSeen: (state) => {
            state.notifications = state.notifications.map((n) => ({ ...n, isSeen: true }));
            state.unreadCount = 0;
            state.salesUnreadCount = 0;
        },
        removeNotification: (state, action) => {
            const target = state.notifications.find((n) => n._id === action.payload);
            if (target && !target.isSeen) state.unreadCount = Math.max(0, state.unreadCount - 1);
            state.notifications = state.notifications.filter((notif) => notif._id !== action.payload);
        },
        clearAllNotifications: (state) => {
            state.notifications = [];
            state.unreadCount = 0;
            state.salesUnreadCount = 0;
        },
    },
});

export const {
    setNotifications,
    setUnreadCount,
    markAsSeen,
    markAllSeen,
    removeNotification,
    clearAllNotifications,
} = notificationSlice.actions;
export default notificationSlice.reducer;