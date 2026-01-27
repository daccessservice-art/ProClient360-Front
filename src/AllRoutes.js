import {
    BrowserRouter as Router,
    Route,
    Routes,
} from "react-router-dom";
import { useContext } from "react";

import MainDashboard from "./Components/Private/MainDashboard/MainDashboard";
import { LogIn } from "./Components/Public/Login";
import { EmployeeMasterGrid } from "./Components/Private/MainDashboard/EmployeeMaster/EmployeeMasterGrid";
import { CustomerMasterGrid } from "./Components/Private/MainDashboard/CustomerMaster/CustomerMasterGrid";
import { ProjectMasterGrid } from "./Components/Private/MainDashboard/ProjectMaster/ProjectMasterGrid";
import { TaskMasterGrid } from "./Components/Private/MainDashboard/TaskMaster/TaskMasterGrid";
import { DepartmentMasterGrid } from "./Components/Private/MainDashboard/DepartmentMaster/DepartmentMasterGrid";
import { DesignationMasterGird } from "./Components/Private/MainDashboard/DesignationMaster/DesignationMasterGrid";
import { TaskSheetMaster } from "./Components/Private/MainDashboard/TaskSheetMaster/TaskSheetMaster";
import { ForgotPassword } from "./Components/Public/ForgotPassword";
import { Mailsentsuccessfully } from "./Components/Public/Mailsentsuccessfully";
import AdminMainDashboard from "./Components/Private/AdminDashboard/AdminMainDashboard";
import EmployeeMainDashboard from "./Components/Private/EmployeeDashboard/EmployeeMainDashboard";
import { EmployeeTaskGrid } from "./Components/Private/EmployeeDashboard/EmployeeTaskGrid/EmployeeTaskGrid";

import { UserContext } from "./context/UserContext";
import { AdminmasterGrid } from "./Components/Private/AdminDashboard/AdminmasterGrid/AdminmasterGrid";
import { AdminCompanyMasterGrid } from "./Components/Private/AdminDashboard/AdminCompanyMasterGrid/AdminCompanyMasterGrid";
import { UserProfile } from "./Components/Private/MainDashboard/UserProfile";
import NotFound from "./Components/NotFound";
import { TicketMasterGrid } from "./Components/Private/MainDashboard/TicketMaster/TicketMaserGrid";
import Feedback  from "./Components/Public/Feedback";
import { ServiceMasterGrid } from "./Components/Private/MainDashboard/ServiceMaster/ServiceMasterGrid";

import { SalesMasterGrid } from "./Components/Private/MainDashboard/SalesMaster/SalesMasterGrid";
import { MarketingMasterGrid } from "./Components/Private/MainDashboard/MarketingMaster/MarketingMasterGrid";
import { AMCMasterGrid } from "./Components/Private/MainDashboard/AMCMaster/AMCMasterGrid";
import { InventoryMasterGrid } from "./Components/Private/MainDashboard/InventryMaster/InventoryMasterGrid";
import { VendorMasterGrid } from "./Components/Private/MainDashboard/VendorMaster/VendorMasterGrid";
import { ProductMasterGrid } from "./Components/Private/MainDashboard/ProductMaster/ProductMasterGrid";
import { PurchaseOrderMasterGrid } from "./Components/Private/MainDashboard/PurchaseOrderMaster/PurchaseOrderMasterGrid";
import { GRNMasterGrid } from "./Components/Private/MainDashboard/GRNMaster/GRNMasterGrid";
import { QCMasterGrid } from "./Components/Private/MainDashboard/QCMaster/QCMasterGrid";
import { DCMasterGrid } from "./Components/Private/MainDashboard/DeliveryChallanMaster/DCMasterGrid";
import { MRFMasterGrid } from "./Components/Private/MainDashboard/MRFMaster/MRFMasterGrid";
import { SalesManagerMasterGrid } from './Components/Private/MainDashboard/SalesManagerMaster/SalesManagerMasterGrid';

import { EmployeeMyServiceMasterGrid } from "./Components/Private/EmployeeDashboard/EmployeeMyServiceMasterGrid/EmployeeMyServiceMasterGrid";
import { EmployeeFeedbackMasterGrid } from "./Components/Private/EmployeeDashboard/EmployeesFeedbackMasterGrid/EmployeeFeedbackMasterGrid";
import AutoLoggedIn from "./utils/AutoLoggedIn";
import LeadApis from "./Components/Private/MainDashboard/LeadApisMaster/LeadApis";
import { ChangePassword } from "./Components/Public/ChangePassword";
import { ForgotPasswordConfirm } from "./Components/Public/ForgotPasswordConfirm";
import ProtectRoute from "./utils/ProtectRoute";

// Import new vendor registration components
import VendorRegistrationForm from "./Components/Private/MainDashboard/VendorMaster/PopUp/VendorRegistrationForm";
import VendorRegistrationSuccess from "./Components/Private/MainDashboard/VendorMaster/PopUp/VendorRegistrationSuccess";

// Custom component to check if user has required permissions
const SalesManagerRoute = () => {
    const { user } = useContext(UserContext);
    
    // Check if user has required permissions (less strict - check for either permission)
    const hasPermission = user?.permissions?.includes("viewLead") || 
                         user?.permissions?.includes("viewSalesManagerMaster") ||
                         user?.user === 'company';
    
    if (hasPermission) {
        return <SalesManagerMasterGrid />;
    }
    
    // If user doesn't have permission, show access denied
    return (
        <div className="container-fluid">
            <div className="row justify-content-center">
                <div className="col-md-6">
                    <div className="card mt-5">
                        <div className="card-body text-center">
                            <h4 className="card-title">Access Denied</h4>
                            <p className="card-text">You don't have permission to access the Sales Manager Master page.</p>
                            <p className="card-text">Please contact your administrator if you believe this is an error.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const AllRoutes = () => {
    const { user } = useContext(UserContext);

    return (
        <Router>
            <Routes>
                {/* Public Routes */}
                <Route exact path="/" element={<AutoLoggedIn Component={LogIn} />} />
                <Route exact path="/ForgotPassword" element={<ForgotPassword />} />
                <Route exact path="/Mailsentsuccessfully" element={<Mailsentsuccessfully />} />
                <Route exact path="/ResetPassword/:id/:token" element={<ForgotPasswordConfirm />} />
                <Route exact path="/feedback/:id" element={<Feedback />} />
                
                {/* New Public Routes for Vendor Registration */}
                <Route exact path="/vendor-registration/:linkId" element={<VendorRegistrationForm />} />
                <Route exact path="/vendor-registration-success" element={<VendorRegistrationSuccess />} />

                {/* Protected Routes */}
                <Route exact path="/ChangePassword" element={<ProtectRoute Component={ChangePassword} />} />
                <Route exact path="/UserProfile" element={<ProtectRoute Component={UserProfile} />} />
                
                <Route exact path="/CustomerMasterGrid" element={<ProtectRoute Component={CustomerMasterGrid} />} />
                <Route exact path="/EmployeeMasterGrid" element={<ProtectRoute Component={EmployeeMasterGrid} />} />
                <Route exact path="/ServiceMasterGrid" element={<ProtectRoute Component={ServiceMasterGrid} />} />
                <Route exact path="/TaskMasterGrid" element={<ProtectRoute Component={TaskMasterGrid} />} />
                <Route exact path="/TicketMasterGrid" element={<ProtectRoute Component={TicketMasterGrid} />} />
                <Route exact path="/ProjectMasterGrid" element={<ProtectRoute Component={ProjectMasterGrid} />} />
                <Route exact path="/DepartmentMasterGrid" element={<ProtectRoute Component={DepartmentMasterGrid} />} />
                <Route exact path="/DesignationMasterGird" element={<ProtectRoute Component={DesignationMasterGird} />} />
                <Route exact path="/project/:id" element={<ProtectRoute Component={TaskSheetMaster} />} />

                <Route exact path="/SalesMasterGrid" element={<ProtectRoute Component={SalesMasterGrid} />} />
                <Route exact path="/MarketingMasterGrid" element={<ProtectRoute Component={MarketingMasterGrid} />} />
                <Route exact path="/AMCMasterGrid" element={<ProtectRoute Component={AMCMasterGrid} />} />
                <Route exact path="/InventoryMasterGrid" element={<ProtectRoute Component={InventoryMasterGrid} />} />
                <Route exact path="/VendorMasterGrid" element={<ProtectRoute Component={VendorMasterGrid} />} />
                <Route exact path="/ProductMasterGrid" element={<ProtectRoute Component={ProductMasterGrid} />} />
                <Route exact path="/PurchaseOrderMasterGrid" element={<ProtectRoute Component={PurchaseOrderMasterGrid} />} />
                <Route exact path="/GRNMasterGrid" element={<ProtectRoute Component={GRNMasterGrid} />} />
                <Route exact path="/QCMasterGrid" element={<ProtectRoute Component={QCMasterGrid} />} />
                <Route exact path="/DCMasterGrid" element={<ProtectRoute Component={DCMasterGrid} />} />
                <Route exact path="/MRFMasterGrid" element={<ProtectRoute Component={MRFMasterGrid} />} />

                {/* Sales Manager Master Route with special permission check */}
                <Route exact path="/SalesManagerMasterGrid" element={<ProtectRoute Component={SalesManagerRoute} />} />

                {/* Company Routes */}
                {user && user?.user === 'company' && (
                    <>
                        <Route exact path="/MainDashboard" element={<MainDashboard />} />
                        <Route exact path="/leadApis" element={<LeadApis />} />
                    </>
                )}

                {/* Admin Routes */}
                {user && user.user === 'admin' && (
                    <>
                        <Route exact path="/AdminMainDashboard" element={<AdminMainDashboard />} />
                        <Route exact path="/AdminCompanyMasterGrid" element={<AdminCompanyMasterGrid />} />
                        <Route exact path="/AdminmasterGrid" element={<AdminmasterGrid />} />
                    </>
                )}

                {/* Employee Routes */}
                {user && user.user === 'employee' && (
                    <>
                        <Route exact path="/EmployeeMainDashboard" element={<EmployeeMainDashboard />} />
                        <Route exact path="/EmployeeTaskGrid" element={<EmployeeTaskGrid />} />
                        <Route exact path="/EmployeeMyServiceMasterGrid" element={<EmployeeMyServiceMasterGrid />} />
                        <Route exact path="/EmployeeFeedbackMasterGrid" element={<EmployeeFeedbackMasterGrid />} />
                    </>
                )}

                {/* 404 Route */}
                <Route path="*" element={<NotFound />} />
            </Routes>
        </Router>
    );
};

export default AllRoutes;