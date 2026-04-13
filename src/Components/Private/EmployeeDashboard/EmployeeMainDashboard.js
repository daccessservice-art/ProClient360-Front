import { useState, useEffect } from "react";
import axios from "axios";
import { Sidebar } from "../MainDashboard/Sidebar/Sidebar";
import { EmployeeDasboardCards } from "./EmployeeDasboardCards";
import { EmployeeSalesOverviewCards } from "./EmployeeSalesOverviewCards";
import { PerFormanceChart } from "./PerFormanceChart";
import { getEmployeeDashboard } from "../../../hooks/useEmployees";
import { getCustomerCountByOwner } from "../../../hooks/useCustomer";
import { Header } from "../MainDashboard/Header/Header";
import { EmployeeLeadFollowUpSection } from "./EmployeeLeadFollowUpSection";

const MY_LEADS_URL = `${process.env.REACT_APP_API_URL}/api/leads/my-leads`;

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

const formatAmountCompact = (amount) => {
    if (!amount || amount <= 0) return "₹0";
    if (amount >= 10000000) return `₹.${(amount / 10000000).toFixed(1)} Cr`;
    if (amount >= 100000) return `₹.${(amount / 100000).toFixed(1)} L`;
    if (amount >= 1000) return `₹.${(amount / 1000).toFixed(0)}K`;
    return `₹${amount.toLocaleString('en-IN')}`;
};

function EmployeeMainDashboard() {
    const [isopen, setIsOpen] = useState(false);
    const [totalProjectCount, setTotalProjectCount] = useState();
    const [completedProjectCount, setCompletedProjectCount] = useState();
    const [inproccessProjectCount, setInproccessProjectCount] = useState();

    const [assignedTasks, setAssignedTasks] = useState([]);
    const [inprocessTasks, setInproccessTasks] = useState([]);
    const [loading, setLoading] = useState(true);

    const [allMyLeads, setAllMyLeads] = useState([]);
    const [leadsLoading, setLeadsLoading] = useState(true);

    const [totalCustomers, setTotalCustomers] = useState(0);
    const [activeQuotationFunnel, setActiveQuotationFunnel] = useState("₹0");
    const [wonLeads, setWonLeads] = useState(0);
    const [lostLeads, setLostLeads] = useState(0);
    const [salesDataLoading, setSalesDataLoading] = useState(false);

    useEffect(() => {
        const fetchAllLeads = async () => {
            setLeadsLoading(true);
            try {
                const response = await axios.get(MY_LEADS_URL, {
                    params: { page: 1, limit: 99999 },
                    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
                });
                if (response.data.success) {
                    setAllMyLeads(response.data.leads || []);
                }
            } catch (err) {
                console.error("Error fetching all leads for dashboard:", err);
            } finally {
                setLeadsLoading(false);
            }
        };
        fetchAllLeads();
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const data = await getEmployeeDashboard();
                if (data) {
                    setTotalProjectCount(data.totalProjects);
                    setCompletedProjectCount(data.completedCount);
                    setInproccessProjectCount(data.inprocessCount);
                    setAssignedTasks(data.assignedTasks);
                    setInproccessTasks(data.inprocessTasks);
                }
            } catch (error) {
                console.error("Error fetching dashboard:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    useEffect(() => {
        const fetchSalesOverviewData = async () => {
            try {
                const userData = JSON.parse(localStorage.getItem("user") || "{}");

                if (!isSalesDesignation(userData?.designation)) return;

                setSalesDataLoading(true);

                const employeeName = userData?.name;
                if (employeeName) {
                    const custRes = await getCustomerCountByOwner(employeeName);
                    if (custRes?.success && custRes?.pagination) {
                        setTotalCustomers(custRes.pagination.totalCustomers || 0);
                    }
                }

                const leadsRes = await axios.get(MY_LEADS_URL, {
                    params: { page: 1, limit: 1 },
                    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
                });

                if (leadsRes.data?.success) {
                    const counts = leadsRes.data.leadCounts || {};
                    const funnel = leadsRes.data.quotationFunnel || {};

                    setWonLeads(counts.winCount || 0);
                    setLostLeads(counts.lostCount || 0);
                    setActiveQuotationFunnel(formatAmountCompact(funnel.totalActiveQuotationAmount || 0));
                }
            } catch (error) {
                console.error("Error fetching sales overview data:", error);
            } finally {
                setSalesDataLoading(false);
            }
        };
        fetchSalesOverviewData();
    }, []);

    const toggle = () => setIsOpen(!isopen);

    return (
        <>
            {(loading || leadsLoading || salesDataLoading) && (
                <div className="overlay">
                    <span className="loader"></span>
                </div>
            )}

            <div className="container-scroller">
                <div className="row background_main_all">
                    <Header toggle={toggle} isopen={isopen} />
                    <div className="container-fluid page-body-wrapper">
                        <Sidebar isopen={isopen} active="dashboard" />
                        <div className="main-panel" style={{ width: isopen ? "" : "calc(100%  - 120px)", marginLeft: isopen ? "" : "125px" }}>
                            <div className="content-wrapper ps-3 ps-md-0">

                                <div className="row p-2">
                                    <div className="col-12 col-lg-6">
                                        <h5 className="text-white fw-bold py-2">Dashboard</h5>
                                    </div>
                                    <div className="col-12 col-lg-6 ms-auto text-end">
                                        <span>
                                            <span className="Customer_fs ps-3 text-white">
                                                <span className="Customer_count ms-2"></span>
                                            </span>
                                        </span>
                                    </div>
                                </div>

                                <EmployeeDasboardCards
                                    totalProjectCount={totalProjectCount}
                                    completedProjectCount={completedProjectCount}
                                    inproccessProjectCount={inproccessProjectCount}
                                />

                                <EmployeeSalesOverviewCards
                                    targetAmount="0"
                                    totalCustomers={totalCustomers}
                                    activeQuotationFunnel={activeQuotationFunnel}
                                    wonLeads={wonLeads}
                                    lostLeads={lostLeads}
                                />

                                <EmployeeLeadFollowUpSection
                                    leads={allMyLeads}
                                    assignedTasks={assignedTasks}
                                    inprocessTasks={inprocessTasks}
                                />

                                <PerFormanceChart />

                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

export default EmployeeMainDashboard;