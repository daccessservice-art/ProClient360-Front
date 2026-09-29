import axios from 'axios';
import toast from 'react-hot-toast';
import { clearSession, notifyLogin } from '../utils/authSession';

const baseUrl = process.env.REACT_APP_API_URL;

export const loginUser = async (username, password, fcmToken, tokenCF) => {
    try {
        if (!username || !password) {
            toast.error("Username and password Required");
            return null;
        }

        // Remove any old token before new login
        clearSession();

        const res = await axios.post(`${baseUrl}/api/login`, {
            email: username,
            password: password,
            fcmToken: fcmToken,
            tokenCF: tokenCF
        });

        if (res.data.success) {
            localStorage.setItem('token', res.data.token);
            notifyLogin(); // ✅ reconnect socket with new token
            return res.data.user;
        }

        toast.error(res.data.message || res.data.error || "Login failed");
        return null;

    } catch (error) {
        const errorMsg = error.response?.data?.error || "Server connection failed. Is your backend running?";
        console.error("Login Error:", errorMsg);
        toast.error(errorMsg);
        return null;
    }
};

export const resetPassword = async (id, token, password, confirmPassword) => {
    try {
        const res = await axios.post(`${baseUrl}/api/reset-password/${id}/${token}`, {
            password,
            confirmPassword
        });

        if (res.data.error) {
            return toast.error(res.data.error);
        }
        toast.success("Password Reset Successfully...");
    } catch (error) {
        const errorMsg = error.response?.data?.error || "Failed to reset password";
        console.error(error);
        toast.error(errorMsg);
    }
};

export const logout = async () => {
    try {
        const res = await axios.get(`${baseUrl}/api/logout`, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem('token')}`
            }
        });
        return res.data;
    } catch (error) {
        console.error(error);
        return error?.response?.data || { error: error?.message || "Logout failed" };
    } finally {
        // ✅ Always clear token on logout, even if API fails
        clearSession();
    }
};

export const changePassword = async (oldPass, newPass, confirmPass) => {
    try {
        if (newPass !== confirmPass) {
            return toast.error("New Password and confirm password doesn't match...");
        }

        const token = localStorage.getItem('token');
        const res = await axios.post(`${baseUrl}/api/change-password`,
            { oldPass, newPass },
            {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );

        return res.data;
    } catch (error) {
        const errorMsg = error.response?.data?.error || error.message;
        console.log(errorMsg);
        toast.error(errorMsg);
        return error?.response?.data;
    }
};

export const forgetPassword = async (email) => {
    try {
        if (email === '') {
            return toast.error("Email is required");
        }
        const res = await axios.post(`${baseUrl}/api/forget-password`, { email });
        return res.data;
    } catch (error) {
        const errorMsg = error.response?.data?.error || "Failed to send reset email";
        console.log(errorMsg);
        toast.error(errorMsg);
        return error.response?.data || { error: errorMsg };
    }
};