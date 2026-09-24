import { useState, useContext, useEffect, useRef, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import { UserContext } from "../../../../context/UserContext";
import { logout } from "../../../../hooks/useAuth";
import { setNotifications } from "../../../../redux/slices/notificationSlice";
import { getNotifications } from "../../../../hooks/useNotification";
import NotificationPanel from "./NotificationPanel";
import "./Header.css";

// ── Built-in male / female avatar (no image file needed) ──
const DefaultAvatar = ({ gender, size = 40 }) => {
	const isFemale = String(gender || "").toLowerCase().startsWith("f");
	return (
		<svg
			className="hd-avatar"
			width={size}
			height={size}
			viewBox="0 0 64 64"
			role="img"
			aria-label={isFemale ? "Female avatar" : "Male avatar"}
		>
			<defs>
				<clipPath id="hdAvatarClip">
					<circle cx="32" cy="32" r="32" />
				</clipPath>
			</defs>
			<g clipPath="url(#hdAvatarClip)">
				<rect width="64" height="64" fill={isFemale ? "#fde7f1" : "#e8e5ff"} />
				{isFemale && (
					<path d="M15 50V32c0-11 7.5-19 17-19s17 8 17 19v18z" fill="#4a2c22" />
				)}
				<path
					d="M10 66c1-12 10-19 22-19s21 7 22 19z"
					fill={isFemale ? "#ec6aa0" : "#6d5dfc"}
				/>
				<rect x="28" y="36" width="8" height="9" rx="3" fill="#eab896" />
				<circle cx="32" cy="27" r="11" fill="#f5c9a8" />
				{isFemale ? (
					<path d="M21 27c0-8 5-13 11-13s11 5 11 13c-3-4-7-7-11-7s-8 3-11 7z" fill="#4a2c22" />
				) : (
					<path d="M21 25c0-7 5-11.5 11-11.5S43 18 43 25c-3-2.5-6.5-3.5-11-3.5S24 22.5 21 25z" fill="#2f2320" />
				)}
			</g>
		</svg>
	);
};

// ── Shows the profile photo; falls back to the male/female avatar if missing or broken ──
const UserAvatar = ({ src, gender, size = 40 }) => {
	const [failed, setFailed] = useState(false);

	useEffect(() => {
		setFailed(false);
	}, [src]);

	if (!src || failed) return <DefaultAvatar gender={gender} size={size} />;

	return (
		<img
			src={src}
			alt=""
			className="hd-avatar"
			width={size}
			height={size}
			onError={() => setFailed(true)}
		/>
	);
};

export const Header = (props) => {
	const { toggle, isopen } = props;
	const [sticky, setSticky] = useState(false);
	const { user, setUser } = useContext(UserContext);
	const [showNotification, setShowNotification] = useState(false);
	const [menuOpen, setMenuOpen] = useState(false);
	const menuRef = useRef(null);

	const dispatch = useDispatch();
	const notifications = useSelector((state) => state.notifications.notifications);
	const unseenCount = notifications?.filter(notification => !notification.isSeen).length || 0;

	// Fetch notifications when component mounts (user logs in)
	useEffect(() => {
		const fetchNotifications = async () => {
			try {
				const fetchedNotifications = await getNotifications();
				if (fetchedNotifications.success && fetchedNotifications.notifications) {
					dispatch(setNotifications(fetchedNotifications.notifications));
				}
			} catch (error) {
				console.error("Error fetching notifications:", error);
			}
		};

		if (user) {
			fetchNotifications();
		}
	}, [user, dispatch]);

	// ── sticky header on scroll ──
	useEffect(() => {
		const change = () => {
			const scrollValue = document.documentElement.scrollTop;
			setSticky(scrollValue > 50);
		};
		window.addEventListener("scroll", change);
		return () => window.removeEventListener("scroll", change);
	}, []);

	// ── close profile menu on outside click or Esc ──
	useEffect(() => {
		if (!menuOpen) return;
		const onDown = (e) => {
			if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
		};
		const onKey = (e) => {
			if (e.key === "Escape") setMenuOpen(false);
		};
		document.addEventListener("mousedown", onDown);
		document.addEventListener("keydown", onKey);
		return () => {
			document.removeEventListener("mousedown", onDown);
			document.removeEventListener("keydown", onKey);
		};
	}, [menuOpen]);

	const navigate = useNavigate();

	const handleLogout = async () => {
		setMenuOpen(false);
		try {
			const data = await logout();
			if (data?.success) {
				toast.success(data?.message);
				setUser(null);
				navigate("/");
			} else {
				toast.error(data?.error);
			}
		} catch (error) {
			console.error(error);
		}
	};

	const handleNotification = () => {
		setShowNotification(!showNotification);
	};

	// ── display info for the profile button ──
	const storedUser = useMemo(() => {
		try {
			return JSON.parse(localStorage.getItem("user") || "{}");
		} catch {
			return {};
		}
	}, [user]);

	const displayName = user?.name || "Guest";
	const role =
		user?.designation ||
		storedUser?.designation ||
		(user?.user === "company" ? "Administrator" : user ? "Employee" : "");
	const gender = user?.gender || storedUser?.gender || "";
	const avatarSrc = user?.profilePic || "";

	return (
		<div className="wrapper mb-5">
			<nav
				className={`navbar fixed-top header hd-bar ${sticky ? "hd-scrolled" : ""}`}
				style={{ width: isopen ? "" : "calc(100% - 144px)", marginLeft: isopen ? "" : "120px", marginTop: sticky ? "1px" : "" }}
			>
				<div className="hd-inner">

					{/* ── Left: menu toggle + logo ── */}
					<div className="hd-left">
						<button
							type="button"
							onClick={toggle}
							className="hd-icon-btn"
							data-toggle="minimize"
							aria-label={isopen ? "Collapse menu" : "Expand menu"}
							title={isopen ? "Collapse menu" : "Expand menu"}
						>
							<i className={`fa-solid ${isopen ? "fa-outdent" : "fa-bars"}`}></i>
						</button>
						<div className="nav_swaraj_slogon hd-logo-wrap">
							<img src="./static/assets/img/nav/Proclient360_RedPink.png" className="Header_Logo hd-logo" alt="ProClient360" />
						</div>
					</div>

					{/* ── Right: notifications + profile ── */}
					<div className="hd-right">
						<button
							type="button"
							className={`hd-icon-btn ${showNotification ? "active" : ""}`}
							onClick={handleNotification}
							aria-label={unseenCount > 0 ? `Notifications, ${unseenCount} unread` : "Notifications"}
							title="Notifications"
						>
							<i className="fa-solid fa-bell"></i>
							{unseenCount > 0 && (
								<span className="hd-badge">{unseenCount > 9 ? "9+" : unseenCount}</span>
							)}
						</button>

						<span className="hd-sep" />

						<div className="hd-profile" ref={menuRef}>
							<button
								type="button"
								id="profileDropdown"
								className={`hd-profile-btn ${menuOpen ? "open" : ""}`}
								onClick={() => setMenuOpen((o) => !o)}
								aria-haspopup="menu"
								aria-expanded={menuOpen}
							>
								<UserAvatar src={avatarSrc} gender={gender} size={40} />
								<span className="hd-profile-text">
									<span className="hd-name">{displayName}</span>
									{role && <span className="hd-role">{role}</span>}
								</span>
								<i className="fa-solid fa-chevron-down hd-chevron"></i>
							</button>

							{menuOpen && (
								<div id="userdata" className="hd-menu" role="menu">
									<div className="hd-menu-head">
										<UserAvatar src={avatarSrc} gender={gender} size={44} />
										<div style={{ minWidth: 0 }}>
											<div className="hd-name">{displayName}</div>
											{role && <div className="hd-role">{role}</div>}
										</div>
									</div>

									{user?.user === "employee" && (
										<Link to="/UserProfile" className="hd-menu-item" role="menuitem" onClick={() => setMenuOpen(false)}>
											<i className="fa-solid fa-user"></i>
											My profile
										</Link>
									)}

									<Link to="/ChangePassword" className="hd-menu-item" role="menuitem" onClick={() => setMenuOpen(false)}>
										<i className="fa-solid fa-key"></i>
										Change password
									</Link>

									{user?.user === "company" && (
										<Link to="/LeadApis" className="hd-menu-item" role="menuitem" onClick={() => setMenuOpen(false)}>
											<i className="fa-solid fa-plug"></i>
											Lead APIs
										</Link>
									)}

									<div className="hd-menu-sep" />

									<button type="button" className="hd-menu-item danger" role="menuitem" onClick={handleLogout}>
										<i className="fa-solid fa-power-off"></i>
										Log out
									</button>
								</div>
							)}
						</div>
					</div>

				</div>
			</nav>

			{showNotification ? <NotificationPanel closePopUp={handleNotification} /> : null}
		</div>
	);
};