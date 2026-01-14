import { Link } from "react-router-dom";
import { useContext, useState } from "react";
import { UserContext } from "../../../../context/UserContext";

export const Sidebar = ({ isopen, active }) => {
    const [Open, setOpen] = useState(false)
    const { user } = useContext(UserContext);

    return (
        <div
            className={
                isopen
                    ? "left-slidebar dark-shadow sidebar-block"
                    : "left-slidebar dark-shadow sidebar-none"
            }
            style={{ width: isopen ? "210px" : "97px" }}
        >
            <div className="navbar-brand-wrapper d-flex align-items-center justify-content-center">
                <span className="navbar-brand brand-logo">
                    <img
                        style={{ width: isopen ? "100%" : "100%" }}
                        src={user.logo || "/static/assets/img/nav/DACCESS.png"}
                        className="logo"
                        alt="logo"
                    />
                </span>
            </div>
            
            <nav
                className="sidebar sidebar-offcanvas" 
                id="sidebar"
                style={{ maxHeight: isopen ? "" : " calc(100vh - 150px)" }}
            >
                <ul className="nav d-block">
                    {user?.user === 'company' ? (
                        <li
                            title="Dashboard"
                            className={active === "dashboard" ? " nav-item active" : "nav-item sidebar_item"}>
                            <Link to='/MainDashboard' className="nav-link ">
                                <i className="fa-solid fa-house ps-3 side_icon_fs"></i>
                                <span className="menu-title_m" style={{ display: isopen ? "" : "none" }}>
                                    Dashboard
                                </span>
                            </Link>
                        </li>
                    ) : null}

                    {/* Employee Dashboard */}
                    {user?.user === 'employee' ? (
                        <li
                            title="Dashboard"
                            className={Open || active === "dashboard" ? " nav-item active" : "nav-item sidebar_item"}>
                            <Link to='/EmployeeMainDashboard' className="nav-link ">
                                <i className="fa-solid fa-house ps-3 side_icon_fs"></i>
                                <span className="menu-title_m" style={{ display: isopen ? "" : "none" }}>
                                    Dashboard 
                                </span>
                            </Link>
                        </li>
                    ) : null}

                    {/* Employee-specific items */}
                    {user?.user === 'employee' ? (
                        <>
                            {/* My Projects */}
                            <li
                                title="My Projects"
                                className={Open || active === "EmployeeTaskGrid" ? " nav-item active" : "nav-item sidebar_item"}>
                                <Link to='/EmployeeTaskGrid' className="nav-link ">
                                    <i className="fa-solid fa-bars-progress ps-3 side_icon_fs"></i>
                                    <span className="menu-title_m" style={{ display: isopen ? "" : "none" }}>
                                        My Projects
                                    </span>
                                </Link>
                            </li>
                            
                            {/* My Service - Only if employee has viewService permission */}
                            {user?.permissions?.includes("viewService") && (
                                <li
                                    title="My Service"
                                    className={Open || active === "EmployeeMyServiceMasterGrid" ? " nav-item active" : "nav-item sidebar_item"}>
                                    <Link to='/EmployeeMyServiceMasterGrid' className="nav-link ">
                                        <i className="fa-solid fa-envelope ps-3 side_icon_fs"></i>
                                        <span className="menu-title_m" style={{ display: isopen ? "" : "none" }}>
                                            My Service
                                        </span>
                                    </Link>
                                </li>
                            )}
                        </>
                    ) : null}

                    {/* Sales Master */}
                    {(user?.permissions?.includes("viewLead") || user?.user === 'company') && 
                    (!user?.permissions?.includes("viewMarketingDashboard")) ? (
                        <li title="Sales Master"
                            className={active === "SalesMasterGrid" ? "nav-item active" : "nav-item sidebar_item"}>
                            <Link to='/SalesMasterGrid' className="nav-link ">
                                <i className="fa-solid ps-3 fa-chart-pie side_icon_fs"></i>
                                <span className="menu-title_m" style={{ display: isopen ? "" : "none" }}>
                                    Sales Master
                                </span>
                            </Link>
                        </li>
                    ) : null}

                    {/* Marketing Master */}
                    {user?.permissions?.includes("viewMarketingDashboard") || user?.user === 'company' ? (
                        <li title="Marketing Master"
                            className={active === "MarketingMasterGrid" ? " nav-item active" : "nav-item sidebar_item"}>
                            <Link to='/MarketingMasterGrid' className="nav-link ">
                                <i className="fa-solid ps-3 fa-chart-simple side_icon_fs"></i>
                                <span className="menu-title_m" style={{ display: isopen ? "" : "none" }}>
                                    Marketing 
                                </span>
                            </Link>
                        </li>
                    ) : null}

                    {/* Sales Manager Master - Only for managers with viewLead permission */}
                    {(user?.permissions?.includes("viewLead") && user?.permissions?.includes("viewSalesManagerMaster")) || user?.user === 'company' ? (
                        <li title="Sales Manager Master"
                            className={active === "SalesManagerMasterGrid" ? "nav-item active" : "nav-item sidebar_item"}>
                            <Link to='/SalesManagerMasterGrid' className="nav-link ">
                                <i className="fa-solid ps-3 fa-users-gear side_icon_fs"></i>
                                <span className="menu-title_m" style={{ display: isopen ? "" : "none" }}>
                                    Sales Manager Master
                                </span>
                            </Link>
                        </li>
                    ) : null}

                    {/* Ticket Master - Only if user has viewService permission or is company */}
                    {user?.permissions?.includes("viewService") || user?.user === 'company' ? (
                        <li
                            title="Ticket Master"
                            className={active === "TicketMasterGrid" ? " nav-item active" : "nav-item sidebar_item"}>
                            <Link to='/TicketMasterGrid' className="nav-link ">
                                <i className="fa-solid fa-ticket ps-3 side_icon_fs"></i>
                                <span className="menu-title_m" style={{ display: isopen ? "" : "none" }}>
                                    Ticket Master
                                </span>
                            </Link>
                        </li>
                    ) : null}

                    {/* Service Master */}
                    {user?.permissions?.includes("viewService") || user?.user === 'company' ? (
                        <li
                            title="Service Master"
                            className={active === "ServiceMasterGrid" ? " nav-item active" : "nav-item sidebar_item"}>
                            <Link to='/ServiceMasterGrid' className="nav-link ">
                                <i className="fa fa-address-card ps-3 side_icon_fs"></i>
                                <span className="menu-title_m" style={{ display: isopen ? "" : "none" }}>
                                    Service Master
                                </span>
                            </Link>
                        </li>
                    ) : null}

                    {/* Inventory Master - NEW */}
                    {user?.permissions?.includes("viewInventory") || user?.user === 'company' ? (
                        <li
                            title="Inventory Master"
                            className={active === "InventoryMasterGrid" ? " nav-item active" : "nav-item sidebar_item"}>
                            <Link to='/InventoryMasterGrid' className="nav-link ">
                                <i className="fa-solid fa-boxes-stacked ps-3 side_icon_fs"></i>
                                <span className="menu-title_m" style={{ display: isopen ? "" : "none" }}>
                                    Inventory Master
                                </span>
                            </Link>
                        </li>
                    ) : null}


                    {user?.permissions?.includes("viewVendor") || user?.user === 'company' ? (
                       <li
                         title="Vendor Master"
                           className={active === "VendorMasterGrid" ? " nav-item active" : "nav-item sidebar_item"}>
                          <Link to='/VendorMasterGrid' className="nav-link ">
                         <i className="fa-solid fa-truck ps-3 side_icon_fs"></i>
                         <span className="menu-title_m" style={{ display: isopen ? "" : "none" }}>
                         Vendor Master
                       </span>
                     </Link>
                    </li>
                    ) : null}

                    {/* Product Master */}
{user?.permissions?.includes("viewProduct") || user?.user === 'company' ? (
  <li
    title="Product Master"
    className={active === "ProductMasterGrid" ? " nav-item active" : "nav-item sidebar_item"}>
    <Link to='/ProductMasterGrid' className="nav-link ">
      <i className="fa-solid fa-box ps-3 side_icon_fs"></i>
      <span className="menu-title_m" style={{ display: isopen ? "" : "none" }}>
        Product Master
      </span>
    </Link>
  </li>
) : null}
                    {/* Purchase Order Master */}
{user?.permissions?.includes("viewPurchaseOrder") || user?.user === 'company' ? (
  <li
    title="Purchase Order Master"
    className={active === "PurchaseOrderMasterGrid" ? " nav-item active" : "nav-item sidebar_item"}>
    <Link to='/PurchaseOrderMasterGrid' className="nav-link ">
      <i className="fa-solid fa-file-invoice ps-3 side_icon_fs"></i>
      <span className="menu-title_m" style={{ display: isopen ? "" : "none" }}>
        Purchase Order Master
      </span>
    </Link>
  </li>
) : null}

{/* GRN Master */}
{user?.permissions?.includes("viewGRN") || user?.user === 'company' ? (
  <li
    title="GRN Master"
    className={active === "GRNMasterGrid" ? " nav-item active" : "nav-item sidebar_item"}>
    <Link to='/GRNMasterGrid' className="nav-link ">
    
      <i className="fa-solid fa-clipboard-check ps-3 side_icon_fs"></i>
      <span className="menu-title_m" style={{ display: isopen ? "" : "none" }}>
        GRN Master
      </span>
    </Link>
  </li>
) : null}

{/* Quality Inspection Master */}
{user?.permissions?.includes("viewQC") || user?.user === 'company' ? (
  <li title="Quality Inspection" className={active === "QCMasterGrid" ? " nav-item active" : "nav-item sidebar_item"}>
    <Link to='/QCMasterGrid' className="nav-link ">
      <i className="fa-solid fa-ranking-star ps-3 side_icon_fs"></i>
      <span className="menu-title_m" style={{ display: isopen ? "" : "none" }}>
        Quality Inspection
      </span>
    </Link>
  </li>
) : null}

{/* Delivery Challan Master */}
{user?.permissions?.includes("viewDC") || user?.user === 'company' ? (
  <li
    title="Delivery Challan"
    className={active === "DCMasterGrid" ? " nav-item active" : "nav-item sidebar_item"}>
    <Link to='/DCMasterGrid' className="nav-link ">
      <i className="fa-solid fa-truck-fast ps-3 side_icon_fs"></i>
      <span className="menu-title_m" style={{ display: isopen ? "" : "none" }}>
        Delivery Challan
      </span>
    </Link>
  </li>
) : null}


{user?.permissions?.includes("viewMRF") || user?.user === 'company' ? (
  <li
    title="MRF Master"
    className={active === "MRFMasterGrid" ? " nav-item active" : "nav-item sidebar_item"}>
    <Link to='/MRFMasterGrid' className="nav-link ">
      <i className="fa-solid fa-file-lines ps-3 side_icon_fs"></i>
      <span className="menu-title_m" style={{ display: isopen ? "" : "none" }}>
        MRF Master
      </span>
    </Link>
  </li>
) : null}

                    {/* Employee Master */}
                    {user?.permissions?.includes("viewEmployee") || user?.user === 'company' ? (
                        <li
                            title="Employee Master"
                            className={active === "EmployeeMasterGrid" ? " nav-item active" : "nav-item sidebar_item"}>
                            <Link to='/EmployeeMasterGrid' className="nav-link ">
                                <i className="fa-solid fa-user-group ps-3 side_icon_fs"></i>
                                <span className="menu-title_m" style={{ display: isopen ? "" : "none" }}>
                                    Employee Master
                                </span>
                            </Link>
                        </li>
                    ) : null}

                    {/* Customer Master */}
                    {user?.permissions?.includes("viewCustomer") || user?.user === 'company' ? (
                        <li
                            title="Customer Master"
                            className={active === "CustomerMasterGrid" ? " nav-item active" : "nav-item sidebar_item"}>
                            <Link to='/CustomerMasterGrid' className="nav-link ">
                                <i className="fa-solid fa-people-line ps-3 side_icon_fs"></i>
                                <span className="menu-title_m" style={{ display: isopen ? "" : "none" }}>
                                    Customer Master
                                </span>
                            </Link>
                        </li>
                    ) : null}

                    {/* Project Master */}
                    <li
                        title="Project Master"
                        className={active === "ProjectMasterGrid" ? " nav-item active" : "nav-item sidebar_item"}>
                        <Link to='/ProjectMasterGrid' className="nav-link ">
                            <i className="fa-solid fa-list-check ps-3 side_icon_fs"></i>
                            <span className="menu-title_m" style={{ display: isopen ? "" : "none" }}>
                                Project Master
                            </span>
                        </Link>
                    </li>

                    {/* Department Master */}
                    {user?.permissions?.includes("viewDepartment") || user?.user === 'company' ? (
                        <li title="Department Master"
                            className={active === "DepartmentMasterGrid" ? " nav-item active" : "nav-item sidebar_item"}>
                            <Link to='/DepartmentMasterGrid' className="nav-link ">
                                <i className="fa-brands fa-medium  ps-3 side_icon_fs"></i>
                                <span className="menu-title_m" style={{ display: isopen ? "" : "none" }}>
                                    Department Master
                                </span>
                            </Link>
                        </li>
                    ) : null}

                    {/* Designation Master */}
                    {user?.permissions?.includes("viewDesignation") || user?.user === 'company' ? (
                        <li
                            title="Designation Master"
                            className={active === "DesignationMasterGird" ? " nav-item active" : "nav-item sidebar_item"}>
                            <Link to='/DesignationMasterGird' className="nav-link ">
                                <i className="fa-solid fa-diamond ps-3 side_icon_fs"></i>
                                <span className="menu-title_m" style={{ display: isopen ? "" : "none" }}>
                                    Designation Master
                                </span>
                            </Link>
                        </li>
                    ) : null}

                    {/* Task Master */}
                    {user?.permissions?.includes("viewTask") || user?.user === 'company' ? (
                        <li
                            title="Task Master"
                            className={active === "TaskMasterGrid" ? " nav-item active" : "nav-item sidebar_item"}>
                            <Link to='/TaskMasterGrid' className="nav-link ">
                                <i className="fa-solid fa-bars-progress ps-3 side_icon_fs"></i>
                                <span className="menu-title_m" style={{ display: isopen ? "" : "none" }}>
                                    Task Master
                                </span>
                            </Link>
                        </li>
                    ) : null}

                    {/* Feedback */}
                    {user?.permissions?.includes('viewFeedback') ? (
                        <li
                            title="Feedback"
                            className={Open || active === "EmployeeFeedbackMasterGrid" ? " nav-item active" : "nav-item sidebar_item"}>
                            <Link to='/EmployeeFeedbackMasterGrid' className="nav-link ">
                                <i className="fa-solid fa-comments ps-3 side_icon_fs"></i>
                                <span className="menu-title_m" style={{ display: isopen ? "" : "none" }}>
                                    Feedback
                                </span>
                            </Link>
                        </li>
                    ) : ('')}

                    {/* AMC */}
                    {user?.permissions?.includes('viewAMC') || user?.user === 'company' ? (
                        <li
                            title="AMC"
                            className={active === "AMCMasterGrid" ? " nav-item active" : "nav-item sidebar_item"}>
                            <Link to='/AMCMasterGrid' className="nav-link ">
                                <i className="fa-solid fa-arrow-up-right-dots ps-3 side_icon_fs"></i>
                                <span className="menu-title_m" style={{ display: isopen ? "" : "none" }}>
                                    AMC
                                </span>
                            </Link>
                        </li>
                    ) : null}
                </ul>
            </nav>
        </div>
    );
} 