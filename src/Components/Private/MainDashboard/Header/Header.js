import { useState, useContext, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import { UserContext } from "../../../../context/UserContext";
import { logout } from "../../../../hooks/useAuth";
import { setNotifications } from "../../../../redux/slices/notificationSlice";
import { getNotifications } from "../../../../hooks/useNotification";
import NotificationPanel from "./NotificationPanel";

export const Header = (props) => {
	const { toggle, isopen } = props;
	const [sticky, setSticky] = useState(false);
	const { user, setUser } = useContext(UserContext);
	const [showNotification, setShowNotification] = useState(false);
	
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

	const change = () => {
		const scrollValue = document.documentElement.scrollTop;
		if (scrollValue > 50) {
			setSticky(true);
		} else {
			setSticky(false);
		}
	};

	function toggleuser(event) {
		event.stopPropagation();
		let side = document.getElementById("userdata");
		side.classList.toggle("hidden1");
		side.classList.toggle("visible");
	}

	document.addEventListener("click", function (event) {
		const side = document.getElementById("userdata");
		const toggleButton = document.getElementById("profileDropdown");

		if (toggleButton?.contains(event.target) === false && side?.contains(event.target) === false) {
			side?.classList.add("visible");
			side?.classList.remove("hidden1");
		}
	});

	window.addEventListener("scroll", change);

	const navigate = useNavigate();

	const handleLogout = async () => {
		try {
			const data = await logout();
			if(data?.success) {
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

	return (
		<div className="wrapper mb-5">
			<nav className="navbar fixed-top d-flex header dark-shadow" style={{ width: isopen ? "" : "calc(100% - 144px)", marginLeft: isopen ? "" : "120px", marginTop: sticky ? "1px" : "" }}>
				<div className="navbar-menu-wrapper d-flex align-items-center justify-content-between">
					<button onClick={toggle} className="navbar-toggler align-self-center" type="button" data-toggle="minimize">
						<span className="icon-menu"></span>
					</button>
					<div className="nav_swaraj_slogon pl-3">
						<img src="./static/assets/img/nav/Proclient360_RedPink.png" className="Header_Logo" alt="img not found" srcSet="" />
					</div>

					<ul className="navbar-nav navbar-nav-right">
						<li className="nav-item position-relative" style={{ marginRight: "20px" }}>
							<i className="fa-solid fa-bell pointer-cursor" onClick={handleNotification} style={{ fontSize: "24px", cursor: "pointer" }}></i>
							{unseenCount > 0 && (
								<span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger" style={{ fontSize: "10px", padding: "3px 6px", minWidth: "18px" }}>
									{unseenCount > 9 ? '9+' : unseenCount}
									<span className="visually-hidden">unread notifications</span>
								</span>
							)}
						</li>

						<li className="nav-item nav-profile dropdown">
							<a onClick={toggleuser} className="nav-link dropdown-toggle me-4" href="#" data-toggle="dropdown" id="profileDropdown">
								<div className="text-start">
									<img src={user?.profilePic || "/static/assets/img/nav/man.png"} alt="profile" className="rounded-circle d-block" width="60" height="60" />
									<div className="drop_item_one mt-1">{user ? user.name : "Guest"}</div>
								</div>
								<i className="align-self-center ml-1"></i>
							</a>
							<div id="userdata" className="dropdown-menu dropdown-menu-right navbar-dropdown" aria-labelledby="profileDropdown">
								<Link to={user?.user === 'employee' ? '/UserProfile' : '#'} className="dropdown-item">
									<div className="drop_item_one my-1">{user ? user.name : "Guest"}</div>
								</Link>
								<Link to="/ChangePassword" className="dropdown-item">
									<div className="drop_item_one my-1">Change Password</div>
								</Link>
								{user?.user === 'company' ? (
									<Link to="/LeadApis" className="dropdown-item">
										<div className="drop_item_one my-1">Lead APIs</div>
									</Link>
								) : null}
								<Link to="/" className="dropdown-item" onClick={handleLogout}>
									<div className="drop_item_two my-1">
										<i className="text-danger mr-2"><i className="fa-solid fa-power-off"></i> Log Out</i>
									</div>
								</Link>
							</div>
						</li>
					</ul>
				</div>
			</nav>

			{showNotification ? <NotificationPanel closePopUp={handleNotification} /> : null}
		</div>
	);
};