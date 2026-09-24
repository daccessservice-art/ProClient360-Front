import React, { useState, useContext, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { UserContext } from "../../../context/UserContext";
import { logout } from "../../../hooks/useAuth";
// ⚠️ Reuses the main header styles – adjust the path if your folder names differ
import "../MainDashboard/Header/Header.css";

// ── Profile photo with initials fallback if the image is missing or broken ──
const AdminAvatar = ({ name, size = 40 }) => {
	const [failed, setFailed] = useState(false);
	const initials =
		(name || "A").split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "A";

	if (failed) {
		return (
			<div
				className="hd-avatar"
				style={{
					width: size,
					height: size,
					display: "grid",
					placeItems: "center",
					background: "linear-gradient(135deg, #6d5dfc, #a996ff)",
					color: "#fff",
					fontSize: size > 40 ? "0.85rem" : "0.78rem",
					fontWeight: 700,
				}}
			>
				{initials}
			</div>
		);
	}

	return (
		<img
			src={process.env.PUBLIC_URL + "/static/assets/img/nav/man.png"}
			alt=""
			className="hd-avatar"
			width={size}
			height={size}
			onError={() => setFailed(true)}
		/>
	);
};

export const AdminHeader = (props) => {
	const { toggle, isopen } = props;
	const [sticky, setSticky] = useState(false);
	const [menuOpen, setMenuOpen] = useState(false);
	const menuRef = useRef(null);

	const { user, setUser } = useContext(UserContext);

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
			await logout();
			setUser(null);
			navigate("/");
		} catch (error) {
			console.error(error);
		}
	};

	const displayName = user ? user.name : "Guest";
	const role = "Super admin";

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
							<img
								src={process.env.PUBLIC_URL + "/static/assets/img/nav/Proclient360_RedPink.png"}
								alt="ProClient 360"
								className="hd-logo"
							/>
						</div>
					</div>

					{/* ── Right: profile ── */}
					<div className="hd-right">
						<div className="hd-profile" ref={menuRef}>
							<button
								type="button"
								id="profileDropdown"
								className={`hd-profile-btn ${menuOpen ? "open" : ""}`}
								onClick={() => setMenuOpen((o) => !o)}
								aria-haspopup="menu"
								aria-expanded={menuOpen}
							>
								<AdminAvatar name={displayName} size={40} />
								<span className="hd-profile-text">
									<span className="hd-name">{displayName}</span>
									<span className="hd-role">{role}</span>
								</span>
								<i className="fa-solid fa-chevron-down hd-chevron"></i>
							</button>

							{menuOpen && (
								<div id="userdata" className="hd-menu" role="menu">
									<div className="hd-menu-head">
										<AdminAvatar name={displayName} size={44} />
										<div style={{ minWidth: 0 }}>
											<div className="hd-name">{displayName}</div>
											<div className="hd-role">{role}</div>
										</div>
									</div>

									<Link to="/ChangePassword" className="hd-menu-item" role="menuitem" onClick={() => setMenuOpen(false)}>
										<i className="fa-solid fa-key"></i>
										Change password
									</Link>

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
		</div>
	);
};