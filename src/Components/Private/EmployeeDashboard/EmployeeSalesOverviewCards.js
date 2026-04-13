import { useEffect, useState } from "react";

const isSalesDesignation = (designation = "") => {
    const d = designation.toLowerCase();
    return (
        d.includes("sales") ||
        d.includes("marketing") ||
        d.includes("amc") ||
        d.includes("bde") ||
        d.includes("tender")
    );
};

export const EmployeeSalesOverviewCards = ({
    targetAmount = 0,
    totalCustomers = 0,
    activeQuotationFunnel = "₹0",
    wonLeads = 0,
    lostLeads = 2,
}) => {
    const [isSalesEmployee, setIsSalesEmployee] = useState(false);

    useEffect(() => {
        try {
            const userData = JSON.parse(localStorage.getItem("user") || "{}");
            setIsSalesEmployee(isSalesDesignation(userData?.designation));
        } catch {
            setIsSalesEmployee(false);
        }
    }, []);

    if (!isSalesEmployee) return null;

    return (
        <div className="row bg-white p-2 m-1 border rounded">

            <div className="col-12 col-md-4 col-lg pb-3 cursor-pointer">
                <div className="p-4 background_style" style={{ background: "#FFC7C6" }}>
                    <div className="row">
                        <div className="col-9">
                            <h6 className="text-dark card_heading">Target</h6>
                            <h2 className="pt-2 fw-bold card_count demo_bottom">{targetAmount}</h2>
                        </div>
                        <div className="col-3 d-flex align-items-center justify-content-center">
                            <img src="./static/assets/img/target.png" className="img_opacity all_card_img_size" alt="Target" />
                        </div>
                    </div>
                </div>
            </div>

            <div className="col-12 col-md-4 col-lg pb-3 cursor-pointer">
                <div className="p-4 background_style PurpleColor">
                    <div className="row">
                        <div className="col-9">
                            <h6 className="text-dark card_heading">Total Customers</h6>
                            <h2 className="pt-2 fw-bold card_count">{totalCustomers}</h2>
                        </div>
                        <div className="col-3 d-flex align-items-center justify-content-center">
                            <img src="./static/assets/img/totalcustomer.png" className="img_opacity all_card_img_size" alt="Customers" />
                        </div>
                    </div>
                </div>
            </div>

            <div className="col-12 col-md-4 col-lg pb-3 cursor-pointer">
                <div className="p-4 background_style pinkcolor">
                    <div className="row">
                        <div className="col-9">
                            <h6 className="text-dark card_heading">Active Quotation Funnel</h6>
                            <h2 className="pt-2 fw-bold card_count demo_bottom">{activeQuotationFunnel}</h2>
                        </div>
                        <div className="col-3 d-flex align-items-center justify-content-center">
                            <img src="./static/assets/img/activequotation.png" className="img_opacity all_card_img_size" alt="Funnel" />
                        </div>
                    </div>
                </div>
            </div>

            <div className="col-12 col-md-4 col-lg pb-3 cursor-pointer">
                <div className="p-4 background_style bg_sky">
                    <div className="row">
                        <div className="col-9">
                            <h6 className="text-dark card_heading">Won Leads</h6>
                            <h2 className="pt-2 fw-bold card_count">{wonLeads}</h2>
                        </div>
                        <div className="col-3 d-flex align-items-center justify-content-center">
                            <img src="./static/assets/img/planning.png" className="img_opacity all_card_img_size" alt="Won" />
                        </div>
                    </div>
                </div>
            </div>

            <div className="col-12 col-md-4 col-lg pb-3 cursor-pointer">
                <div className="p-4 background_style" style={{ background: "#E0E0E0" }}>
                    <div className="row">
                        <div className="col-9">
                            <h6 className="text-dark card_heading">Lost Leads</h6>
                            <h2 className="pt-2 fw-bold card_count">{lostLeads}</h2>
                        </div>
                        <div className="col-3 d-flex align-items-center justify-content-center">
                            <img src="./static/assets/img/lost.png" className="img_opacity all_card_img_size" alt="Lost" />
                        </div>
                    </div>
                </div>
            </div>

        </div>
    );
};