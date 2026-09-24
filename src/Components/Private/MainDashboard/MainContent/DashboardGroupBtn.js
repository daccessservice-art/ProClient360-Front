import { useState } from "react";
import HRReviewMasterGrid from "../HRReviewMaster/HRReviewMasterGrid";
import "./MainDashboard.css";
import "../../EmployeeDashboard/EmployeeDashboard.css";

const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
};

export const DashboardGroupBtn = ({ custCount }) => {
    const [showReviewModal, setShowReviewModal] = useState(false);

    const todayLabel = new Date().toLocaleDateString("en-GB", {
        weekday: "short", day: "2-digit", month: "short", year: "numeric",
    });

    return (
        <>
            <div className="ed-pagehead">
                <div>
                    <div className="ed-title">Dashboard</div>
                    <div className="ed-welcome">
                        {getGreeting()}! Here's an overview of your projects and customers.
                    </div>
                </div>

                <div className="ed-head-actions">
                    <span className="ed-date-chip">
                        <i className="fa-solid fa-calendar-days"></i>
                        {todayLabel}
                    </span>

                    <span className="md-cust-chip" title="Total customers">
                        <span className="md-cust-icon">
                            <i className="fa-solid fa-users"></i>
                        </span>
                        <span>
                            <span className="md-cust-label">Customers</span>
                            <span className="md-cust-value">{custCount ?? 0}</span>
                        </span>
                    </span>

                    <button
                        type="button"
                        className="md-review-btn"
                        onClick={() => setShowReviewModal(true)}
                    >
                        <i className="fa-solid fa-clipboard-list"></i>
                        Monthly review
                    </button>
                </div>
            </div>

            {showReviewModal && (
                <HRReviewMasterGrid onClose={() => setShowReviewModal(false)} />
            )}
        </>
    );
};