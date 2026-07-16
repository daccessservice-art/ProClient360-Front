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
import { HRReviewMasterGrid } from "./Components/Private/MainDashboard/HRReviewMaster/HRReviewMasterGrid";

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

import { CallUnansweredLeadsPage } from './Components/Private/MainDashboard/MarketingMaster/PopUp/CallUnansweredLeadPage';

// Import Activity Log and Report Components
import ActivityLogReport from "./Components/Private/MainDashboard/ActivityLogReport/ActivityLogReport";
import AnnualReport from "./Components/Private/MainDashboard/AnnualReport/AnnualReport";

import { NotFeasibleLeadsPage } from './Components/Private/MainDashboard/MarketingMaster/PopUp/NotFeasibleLeadPage';

// ✅ Match exact filename case on disk
import { FeasibleLeadsPage } from './Components/Private/MainDashboard/MarketingMaster/PopUp/Feasibleleadspage';

import { ExhibitionMasterGrid } from "./Components/Private/MainDashboard/ExhibitionMaster/ExhibitionMasterGrid";
import { ExhibitionVisitMasterGrid } from "./Components/Private/MainDashboard/ExhibitionMaster/ExhibitionVisitMasterGrid";

import { AccountMasterGrid } from "./Components/Private/MainDashboard/AccountMaster/AccountMasterGrid";

import AssetView from "./Components/Public/AssetView";

import SurveyEngineerDashboard from "./Components/Private/MainDashboard/SalesMaster/SurveyEngineerDashboard";

import { OldSalesHistoryGrid } from './Components/Private/MainDashboard/SalesMaster/OldSalesHistoryGrid';

import { ProjectPurchaseMasterGrid } from "./Components/Private/MainDashboard/ProjectPurchaseMaster/ProjectPurchaseMasterGrid";

import { AccountFollowUpMasterGrid } from "./Components/Private/MainDashboard/AccountMaster/AccountFollowUpMasterGrid";

// ── NEW: Old AMC History (separate, read/write history page — does not touch AMCMasterGrid) ──
import { OldAMCHistoryGrid } from "./Components/Private/MainDashboard/OldAMCHistory/OldAMCHistoryGrid";


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

// Custom component for Activity Log Report with permission check
const ActivityLogReportRoute = () => {
    const { user } = useContext(UserContext);
    
    // Check if user has required permissions
    const hasPermission = user?.permissions?.includes("viewActivityLog") || 
                         user?.user === 'company';
    
    if (hasPermission) {
        return <ActivityLogReport />;
    }
    
    // If user doesn't have permission, show access denied
    return (
        <div className="container-fluid">
            <div className="row justify-content-center">
                <div className="col-md-6">
                    <div className="card mt-5">
                        <div className="card-body text-center">
                            <h4 className="card-title">Access Denied</h4>
                            <p className="card-text">You don't have permission to access the Activity Log Report.</p>
                            <p className="card-text">Please contact your administrator if you believe this is an error.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Custom component for Annual Report with permission check
const AnnualReportRoute = () => {
    const { user } = useContext(UserContext);
    
    // Check if user has required permissions
    const hasPermission = user?.permissions?.includes("viewAnnualReport") || 
                         user?.user === 'company';
    
    if (hasPermission) {
        return <AnnualReport />;
    }
    
    // If user doesn't have permission, show access denied
    return (
        <div className="container-fluid">
            <div className="row justify-content-center">
                <div className="col-md-6">
                    <div className="card mt-5">
                        <div className="card-body text-center">
                            <h4 className="card-title">Access Denied</h4>
                            <p className="card-text">You don't have permission to access the Annual Report.</p>
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
                <Route exact path="/reset-password/:id/:token" element={<ForgotPasswordConfirm />} />
                <Route exact path="/feedback/:id" element={<Feedback />} />
                
                {/* New Public Routes for Vendor Registration */}
                <Route exact path="/vendor-registration/:linkId" element={<VendorRegistrationForm />} />
                <Route exact path="/vendor-registration-success" element={<VendorRegistrationSuccess />} />
                
                <Route exact path="/asset/:assetId" element={<AssetView />} />

                {/* Protected Routes */}
                <Route exact path="/ChangePassword" element={<ProtectRoute Component={ChangePassword} />} />
                <Route exact path="/UserProfile" element={<ProtectRoute Component={UserProfile} />} />
                
                {/* Master Grid Routes */}
                <Route exact path="/CustomerMasterGrid" element={<ProtectRoute Component={CustomerMasterGrid} />} />
                <Route exact path="/EmployeeMasterGrid" element={<ProtectRoute Component={EmployeeMasterGrid} />} />
                <Route exact path="/ServiceMasterGrid" element={<ProtectRoute Component={ServiceMasterGrid} />} />
                <Route exact path="/TaskMasterGrid" element={<ProtectRoute Component={TaskMasterGrid} />} />
                <Route exact path="/TicketMasterGrid" element={<ProtectRoute Component={TicketMasterGrid} />} />
                <Route exact path="/ProjectMasterGrid" element={<ProtectRoute Component={ProjectMasterGrid} />} />
                <Route exact path="/DepartmentMasterGrid" element={<ProtectRoute Component={DepartmentMasterGrid} />} />
                <Route exact path="/DesignationMasterGird" element={<ProtectRoute Component={DesignationMasterGird} />} />
                <Route exact path="/project/:id" element={<ProtectRoute Component={TaskSheetMaster} />} />

                {/* Sales & Marketing Routes */}
                <Route exact path="/SalesMasterGrid" element={<ProtectRoute Component={SalesMasterGrid} />} />
                <Route exact path="/MarketingMasterGrid" element={<ProtectRoute Component={MarketingMasterGrid} />} />
                
                {/* Sales Manager Master Route with special permission check */}
                <Route exact path="/SalesManagerMasterGrid" element={<ProtectRoute Component={SalesManagerRoute} />} />

                <Route exact path="/HRReviewMasterGrid" element={<ProtectRoute Component={HRReviewMasterGrid} />} />
                
                {/* Inventory Management Routes */}
                <Route exact path="/AMCMasterGrid" element={<ProtectRoute Component={AMCMasterGrid} />} />
                <Route exact path="/InventoryMasterGrid" element={<ProtectRoute Component={InventoryMasterGrid} />} />
                <Route exact path="/VendorMasterGrid" element={<ProtectRoute Component={VendorMasterGrid} />} />
                <Route exact path="/ProductMasterGrid" element={<ProtectRoute Component={ProductMasterGrid} />} />
                <Route exact path="/PurchaseOrderMasterGrid" element={<ProtectRoute Component={PurchaseOrderMasterGrid} />} />
                <Route exact path="/GRNMasterGrid" element={<ProtectRoute Component={GRNMasterGrid} />} />
                <Route exact path="/QCMasterGrid" element={<ProtectRoute Component={QCMasterGrid} />} />
                <Route exact path="/DCMasterGrid" element={<ProtectRoute Component={DCMasterGrid} />} />
                <Route exact path="/MRFMasterGrid" element={<ProtectRoute Component={MRFMasterGrid} />} />
                
                <Route path="/call-unanswered-leads" element={<ProtectRoute Component={CallUnansweredLeadsPage} />} />

                {/* REPORT ROUTES - Permission Based */}
                <Route exact path="/ActivityLogReport" element={<ProtectRoute Component={ActivityLogReportRoute} />} />
                <Route exact path="/AnnualReport" element={<ProtectRoute Component={AnnualReportRoute} />} />
                <Route path="/not-feasible-leads" element={<ProtectRoute Component={NotFeasibleLeadsPage} />} />
                <Route path="/feasible-leads" element={<ProtectRoute Component={FeasibleLeadsPage} />} />
                
                <Route exact path="/ExhibitionMasterGrid" element={<ProtectRoute Component={ExhibitionMasterGrid} />} />
                <Route exact path="/ExhibitionVisitMasterGrid" element={<ProtectRoute Component={ExhibitionVisitMasterGrid} />} />
                <Route exact path="/AccountMasterGrid" element={<ProtectRoute Component={AccountMasterGrid} />} />
                
                <Route exact path="/SurveyEngineerDashboard" element={<ProtectRoute Component={SurveyEngineerDashboard} />} /> 
                
                <Route exact path="/OldSalesHistory" element={<ProtectRoute Component={OldSalesHistoryGrid} />} />
                
                <Route exact path="/ProjectPurchaseMasterGrid" element={<ProtectRoute Component={ProjectPurchaseMasterGrid} />} />

                <Route exact path="/AccountFollowUpMasterGrid" element={<ProtectRoute Component={AccountFollowUpMasterGrid} />} />
                
                <Route exact path="/OldAMCHistoryGrid" element={<ProtectRoute Component={OldAMCHistoryGrid} />} />

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