import { useState } from "react";
import HRReviewMasterGrid from "../HRReviewMaster/HRReviewMasterGrid";

export const DashboardGroupBtn = ({ custCount }) => {
    const [showReviewModal, setShowReviewModal] = useState(false);

    return (
        <>
            <div className="row p-2">
                <div className="col-12 col-lg-6">
                    <h5 className="text-white fw-bold py-2">
                        Dashboard
                    </h5>
                </div>

                <div className="col-12 col-lg-6 ms-auto">
                    <div className="d-flex align-items-center justify-content-end gap-3">

                        <button
                            onClick={() => setShowReviewModal(true)}
                            style={{
                                background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                                border: "none",
                                borderRadius: "8px",
                                padding: "8px 18px",
                                color: "#fff",
                                fontWeight: 700,
                                fontSize: "0.82rem",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                gap: "6px",
                                boxShadow: "0 4px 14px rgba(245,158,11,0.4)",
                            }}
                        >
                            📋 Monthly Review
                        </button>

                        <img src="static/assets/img/people.png" className="customer_img" alt="logo" />
                        <span className="Customer_fs ps-3 text-white">
                            Customer |
                            <span className="Customer_count ms-2">{custCount}</span>
                        </span>
                    </div>
                </div>
            </div>

            {showReviewModal && (
                <HRReviewMasterGrid onClose={() => setShowReviewModal(false)} />
            )}
        </>
    );
};