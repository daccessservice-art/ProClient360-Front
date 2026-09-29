import "./utils/axiosInterceptor";
import React from "react";
import ReactDOM from "react-dom";
import App from "./App";
import { Provider } from "react-redux";
import store from "./redux/store";
import {
  isTokenValid,
  isIdleExpired,
  clearSession,
  SESSION_EXPIRED_MSG,
  IDLE_LOGOUT_MSG,
} from "./utils/authSession";

// ✅ Before the app opens: remove expired / idle session
const hasToken = !!localStorage.getItem("token");

if (hasToken && !isTokenValid()) {
  clearSession();
  sessionStorage.setItem("logoutMsg", SESSION_EXPIRED_MSG);
} else if (hasToken && isIdleExpired()) {
  // e.g. closed browser yesterday → open today → login page
  clearSession();
  sessionStorage.setItem("logoutMsg", IDLE_LOGOUT_MSG);
}

ReactDOM.render(
  <Provider store={store}>
    <App />
  </Provider>,
  document.getElementById("root")
);