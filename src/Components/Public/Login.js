import { useState, useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "././login.css";
import toast from "react-hot-toast";
import { loginUser } from "../../hooks/useAuth";
import { UserContext } from "../../context/UserContext";
import { requestForToken } from '../../firebase';

// ✅ NEW: Customer Support Modal
import CustomerTicketModal from "./CustomerTicketModal";

export const LogIn = () => {
  const navigation = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // ✅ NEW: Customer Support modal state
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const openCustomerSupport = () => setIsCustomerModalOpen(true);
  const closeCustomerSupport = () => setIsCustomerModalOpen(false);

  const { setUser } = useContext(UserContext);

  const requestNotificationPermission = async () => {
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      console.log("Notification permission granted.");
    } else {
      console.warn("Notification permission denied.");
    }
  };

  useEffect(() => {
    requestNotificationPermission();
  });

  const getFcmToken = async () => {
    await requestForToken();
  };

  useEffect(() => {
    console.log("Requesting FCM token...");
    getFcmToken();
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    const fcmToken = localStorage.getItem("fcmToken");
    setLoading(true);
    try {
      const data = await loginUser(username, password, fcmToken);
      setUser(data);
      if (data.newUser === true) {
        toast.success("Please complete your profile to continue.");
        navigation("/ChangePassword");
      } else if (data.user === "employee" || data.user === "company") {
        navigation("/MainDashboard");
        toast.success("Welcome back " + data?.name);
      } else if (data.user === "admin") {
        navigation("/AdminMainDashboard");
      }
    } catch (error) {
      console.error(error);
      toast.error("Something Went Wrong...");
    } finally {
      setLoading(false);
    }
  };

  const toggleShowPassword = () => setShowPassword(!showPassword);

  const showForgotPassword = () => navigation("/ForgotPassword");

  const EyeIcon = () => (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
      <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
      <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
    </svg>
  );

  const EyeOffIcon = () => (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
      <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
    </svg>
  );

  return (
    <div className="login-page-wrapper loginbody_text">
      {/* Card Container */}
      <div className="login-card">

        {/* LEFT — Form Panel */}
        <div className="login-form-panel">
          <div className="login-form-inner">
            {/* Logo */}
            <img
              src="./static/assets/img/Proclient360_Originalon.svg"
              className="login-logo"
              alt="ProClient360 logo"
            />

            <h2 className="login-title">Welcome Back !</h2>
            <p className="login-subtitle">Login to ProClient360</p>

            <form onSubmit={handleLogin} className="login-form">
              {/* Email */}
              <div className="login-input-group">
                <span className="login-input-icon">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                    <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                  </svg>
                </span>
                <input
                  type="email"
                  name="username"
                  placeholder="Enter Your Email..."
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="login-input"
                />
              </div>

              {/* Password */}
              <div className="login-input-group">
                <span className="login-input-icon">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="Enter Your Password..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="login-input"
                />
                <button
                  type="button"
                  className="login-eye-btn"
                  onClick={toggleShowPassword}
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>

              {/* Forgot Password */}
              <div className="login-forgot-row">
                <button
                  type="button"
                  className="login-forgot-link"
                  onClick={showForgotPassword}
                >
                  Forgot Password?
                </button>
              </div>

              {/* Submit */}
              <button
                type="submit"
                className="login-submit-btn"
                disabled={loading}
              >
                {loading ? (
                  <span className="loader" style={{ height: "5px", width: "5px" }}></span>
                ) : (
                  "Log In"
                )}
              </button>

              {/* Footer links */}
              <div className="login-footer-links">
                <span>Privacy policy</span>
                <span className="login-divider">|</span>
                <span>Terms &amp; Conditions</span>
              </div>

              {/* ✅ NEW — Customer Support Link (small, below footer) */}
              <div className="customer-support-link-row">
                <button
                  type="button"
                  className="customer-support-link-btn"
                  onClick={openCustomerSupport}
                >
                  🎧 Customer? Raise a Complaint
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* RIGHT — Illustration Panel */}
        <div className="login-illustration-panel">
          <img
            src="./static/assets/img/Login/log.png"
            alt="Project management illustration"
            className="login-illustration-img"
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
        </div>

      </div>

      {/* ✅ NEW — Customer Ticket Modal */}
      {isCustomerModalOpen && (
        <CustomerTicketModal onClose={closeCustomerSupport} />
      )}
    </div>
  );  
};

// ✅ Keep default export too (in case any file imports it default)
export default LogIn;