import { useEffect, useState } from "react";
import { CompanyInfEmployeeDashboardPieChartoPieChart } from "./EmployeeDashboardPieChart";

const isSalesDesignation = (designation = "") => {
    const d = designation.toLowerCase();
    return (
        d.includes("sales") ||
        d.includes("marketing") ||
        d.includes("amc") ||
        d.includes("bde") ||
        d.includes("bdm") ||
        d.includes("tender")
    );
};

export const EmployeeDasboardCards = ({ totalProjectCount, completedProjectCount, inproccessProjectCount }) => {
    const [isSalesEmployee, setIsSalesEmployee] = useState(false);

    useEffect(() => {
        try {
            const userData = JSON.parse(localStorage.getItem("user") || "{}");
            setIsSalesEmployee(isSalesDesignation(userData?.designation));
        } catch {
            setIsSalesEmployee(false);
        }
    }, []);

    // ── HIDE for Sales, Marketing, AMC, BDE, Sr.BDE, Tender ──
    if (isSalesEmployee) return null;

    return (
        <div className="row  bg-white p-2 m-1 border rounded">
            <div className="col-12 col-lg-8 py-1">
                <div className="row pt-3">

                    <div className="col-12 col-md-4 pb-3 cursor-pointer">
                        <div className="p-4 background_style bg_sky">
                            <div className="row">
                                <div className="col-9">
                                    <h6 className="text-dark card_heading">Total Projects</h6>
                                    <h2 className="pt-2 fw-bold card_count demo_bottom">{totalProjectCount}</h2>
                                </div>
                                <div className="col-3 d-flex align-items-center justify-content-center">
                                    <img src="./static/assets/img/planning.png" className="img_opacity all_card_img_size" alt="img not found" srcSet="" />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="col-12 col-md-4 pb-3 cursor-pointer">
                        <div className="p-4 background_style PurpleColor">
                            <div className="row">
                                <div className="col-9">
                                    <h6 className="text-dark card_heading">Completed Projects</h6>
                                    <h2 className="pt-2 fw-bold card_count">{completedProjectCount}</h2>
                                </div>
                                <div className="col-3 d-flex align-items-center justify-content-center">
                                    <img src="./static/assets/img/checked.png" className="img_opacity all_card_img_size" alt="img not found" srcSet="" />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="col-12 col-md-4 pb-3 cursor-pointer">
                        <div className="p-4 background_style pinkcolor">
                            <div className="row">
                                <div className="col-9">
                                    <h6 className="text-dark card_heading">Inprocess Projects</h6>
                                    <h2 className="pt-2 fw-bold card_count">{inproccessProjectCount}</h2>
                                </div>
                                <div className="col-3 d-flex align-items-center justify-content-center">
                                    <img src="./static/assets/img/Inprocess.png" className="img_opacity all_card_img_size" alt="" srcSet="" />
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>

            <CompanyInfEmployeeDashboardPieChartoPieChart
                totalProjectCount={totalProjectCount}
                completedProjectCount={completedProjectCount}
                inproccessProjectCount={inproccessProjectCount}
            />
        </div>
    );
};