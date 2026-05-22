import { useState, useEffect, useCallback, useContext } from "react";
import { Header } from "../Header/Header";
import { Sidebar } from "../Sidebar/Sidebar";
import toast from 'react-hot-toast';
import DeletePopUP from "../../CommonPopUp/DeletePopUp";
import AddProjectPurchasePopup from "./PopUp/AddProjectPurchasePopup";
import MaterialCheckPopup from "./PopUp/MaterialCheckPopup";
import PurchaseProcessPopup from "./PopUp/PurchaseProcessPopup";
import AccountVerifyPopup from "./PopUp/AccountVerifyPopup";
import ProjectPurchaseDetailsPopup from "./PopUp/ProjectPurchaseDetailsPopup";
import {
    getProjectPurchases,
    deleteProjectPurchase,
    getProjectPurchaseStats
} from "../../../../hooks/useProjectPurchase";
import { formatDate } from "../../../../utils/formatDate";
import { UserContext } from "../../../../context/UserContext";

export const ProjectPurchaseMasterGrid = () => {
    const { user } = useContext(UserContext);

    const [isopen, setIsOpen] = useState(false);
    const toggle = () => setIsOpen(!isopen);

    const [activeView, setActiveView] = useState("project");

    const [projectPurchases, setProjectPurchases] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedPurchase, setSelectedPurchase] = useState(null);

    const [refreshTrigger, setRefreshTrigger] = useState(0);

    // Popups
    const [addPopupShow, setAddPopupShow] = useState(false);
    const [deletePopupShow, setDeletePopupShow] = useState(false);
    const [materialCheckPopupShow, setMaterialCheckPopupShow] = useState(false);
    const [purchaseProcessPopupShow, setPurchaseProcessPopupShow] = useState(false);
    const [accountVerifyPopupShow, setAccountVerifyPopupShow] = useState(false);
    const [detailsPopupShow, setDetailsPopupShow] = useState(false);
    const [selectedId, setSelectedId] = useState(null);

    // Filters
    const [searchTerm, setSearchTerm] = useState("");
    const [search, setSearch] = useState("");
    const [filters, setFilters] = useState({
        status: null,
        stockStatus: null,
        paymentTermsMatch: null
    });

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [paginationMeta, setPaginationMeta] = useState({
        totalPages: 0,
        totalRecords: 0,
        hasNextPage: false,
        hasPrevPage: false,
    });

    // Stats
    const [stats, setStats] = useState({
        totalRequests: 0,
        storeCheckPending: 0,
        purchasePending: 0,
        readyForInvoice: 0,
        invoiceGenerated: 0,
        paymentMatched: 0,
        paymentNotMatched: 0,
        pendingProjectPurchaseCount: 0
    });

    const ITEMS_PER_PAGE = 20;

    const handlePageChange = (page) => {
        setCurrentPage(page);
    };

    const handleSearchChange = (e) => setSearchTerm(e.target.value);
    const handleSearchKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            setSearch(searchTerm.trim());
            setCurrentPage(1);
        }
    };
    const handleSearchClear = () => {
        setSearchTerm("");
        setSearch("");
        setCurrentPage(1);
    };

    const handleChange = (filterType, value) => {
        setFilters(prev => ({ ...prev, [filterType]: value || null }));
        setCurrentPage(1);
    };

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const data = await getProjectPurchases(
                currentPage,
                ITEMS_PER_PAGE,
                filters,
                search
            );
            if (data?.success) {
                setProjectPurchases(data.projectPurchases || []);
                const serverPagination = data.pagination || {};
                setPaginationMeta({
                    totalPages: serverPagination.totalPages || 0,
                    totalRecords: serverPagination.totalRecords || 0,
                    hasNextPage: serverPagination.hasNextPage || false,
                    hasPrevPage: serverPagination.hasPrevPage || false,
                });

                if (currentPage > (serverPagination.totalPages || 0) && (serverPagination.totalPages || 0) > 0) {
                    setCurrentPage(serverPagination.totalPages);
                }
            } else {
                toast.error(data?.error || 'Failed to fetch data');
            }
        } catch (error) {
            console.error("Error fetching:", error);
        } finally {
            setLoading(false);
        }
    }, [currentPage, filters, search]);

    const fetchStats = useCallback(async () => {
        try {
            const data = await getProjectPurchaseStats();
            if (data?.success) setStats(data.stats);
        } catch (error) {
            console.error("Error fetching stats:", error);
        }
    }, []);

    useEffect(() => {
        fetchData();
        fetchStats();
    }, [currentPage, filters, search, refreshTrigger, fetchData, fetchStats]);

    const handleAddOpen = () => setAddPopupShow(true);

    const handleAddClose = () => {
        setAddPopupShow(false);
        setRefreshTrigger(prev => prev + 1);
    };

    const handleDeleteOpen = (id) => {
        setSelectedId(id);
        setDeletePopupShow(!deletePopupShow);
    };

    const handleDeleteConfirm = async () => {
        const data = await deleteProjectPurchase(selectedId);
        if (data?.success) {
            toast.success(data.message);
            setDeletePopupShow(false);
            setSelectedId(null);
            setRefreshTrigger(prev => prev + 1);
        } else {
            toast.error(data?.error || 'Delete failed');
        }
    };

    const handleMaterialCheck = (purchase) => {
        setSelectedPurchase(purchase);
        setMaterialCheckPopupShow(true);
    };

    const handlePurchaseProcess = (purchase) => {
        setSelectedPurchase(purchase);
        setPurchaseProcessPopupShow(true);
    };

    const handleAccountVerify = (purchase) => {
        setSelectedPurchase(purchase);
        setAccountVerifyPopupShow(true);
    };

    const handleDetails = (purchase) => {
        setSelectedPurchase(purchase);
        setDetailsPopupShow(true);
    };

    const closeMaterialCheck = () => {
        setMaterialCheckPopupShow(false);
        setSelectedPurchase(null);
        setRefreshTrigger(prev => prev + 1);
    };

    const closePurchaseProcess = () => {
        setPurchaseProcessPopupShow(false);
        setSelectedPurchase(null);
        setRefreshTrigger(prev => prev + 1);
    };

    const closeAccountVerify = () => {
        setAccountVerifyPopupShow(false);
        setSelectedPurchase(null);
        setRefreshTrigger(prev => prev + 1);
    };

    const closeDetails = () => {
        setDetailsPopupShow(false);
        setSelectedPurchase(null);
    };

    const getStatusBadge = (status) => {
        const map = {
            'Draft': 'bg-secondary', 'Store Check Pending': 'bg-info',
            'Store Verified - Available': 'bg-primary', 'Store Verified - Not Available': 'bg-warning text-dark',
            'Purchase Pending': 'bg-warning text-dark', 'Purchase Ordered': 'bg-info',
            'Purchase Delivered': 'bg-info', 'Ready for Invoice': 'bg-success',
            'Invoice Generated': 'bg-success', 'Completed': 'bg-success'
        };
        return map[status] || 'bg-secondary';
    };

    const getPaymentTermsBadge = (match) => {
        const map = { 'Pending': 'bg-secondary', 'Matched': 'bg-success', 'Not Matched': 'bg-danger', 'Partial': 'bg-warning text-dark' };
        return map[match] || 'bg-secondary';
    };

    const canStoreCheck = (status) => ['Draft', 'Store Check Pending'].includes(status);
    const canPurchaseProcess = (status) => ['Purchase Pending', 'Purchase Ordered', 'Store Verified - Not Available'].includes(status);
    const canAccountVerify = (status) => ['Store Verified - Available', 'Ready for Invoice', 'Purchase Delivered'].includes(status);

    // ─── NEW: Clear visual breakdown of material status ──────────────
    const renderMaterialStatusBadge = (materials) => {
        if (!materials || materials.length === 0) return <span className="badge bg-secondary">N/A</span>;

        const total = materials.length;
        const available = materials.filter(m => m.stockStatus === 'Available').length;
        const notAvailable = materials.filter(m => m.stockStatus === 'Not Available').length;
        const partial = materials.filter(m => m.stockStatus === 'Partial').length;
        const pending = materials.filter(m => m.stockStatus === 'Pending').length;

        if (available === total) {
            return <span className="badge bg-success rounded-pill">✅ All Available ({total})</span>;
        }

        return (
            <div className="d-flex flex-wrap gap-1" style={{ fontSize: '10px' }}>
                {available > 0 && <span className="badge bg-success rounded-pill">✅ {available} Available</span>}
                {notAvailable > 0 && <span className="badge bg-danger rounded-pill">❌ {notAvailable} Not Available</span>}
                {partial > 0 && <span className="badge bg-warning text-dark rounded-pill">⚠️ {partial} Partial</span>}
                {pending > 0 && <span className="badge bg-secondary rounded-pill">⏳ {pending} Pending</span>}
            </div>
        );
    };

    return (
        <>
            {loading && (
                <div className="overlay"><span className="loader"></span></div>
            )}

            <div className="container-scroller">
                <div className="row background_main_all">
                    <Header toggle={toggle} isopen={isopen} />
                    <div className="container-fluid page-body-wrapper">
                        <Sidebar isopen={isopen} active="ProjectPurchaseMasterGrid" />
                        <div className="main-panel" style={{ width: isopen ? "" : "calc(100% - 120px)", marginLeft: isopen ? "" : "125px" }}>
                            <div className="content-wrapper ps-3 ps-md-0 pt-3">

                                {/* Header Row with Toggle */}
                                <div className="row px-2 py-1">
                                    <div className="col-12 col-lg-3">
                                        <h5 className="text-white py-2">Project Purchase Master</h5>
                                    </div>

                                    <div className="col-12 col-lg-3 d-flex align-items-center py-2">
                                        <div className="btn-group w-100" role="group">
                                            <button
                                                type="button"
                                                className={`btn ${activeView === 'project' ? 'btn-light fw-bold text-primary' : 'btn-outline-light text-white'}`}
                                                onClick={() => setActiveView('project')}
                                                style={{ borderRadius: '4px 0 0 4px' }}
                                            >
                                                <i className="fa-solid fa-list-check me-1"></i> Project
                                            </button>
                                            <button
                                                type="button"
                                                className={`btn ${activeView === 'purchase' ? 'btn-light fw-bold text-warning' : 'btn-outline-light text-white'}`}
                                                onClick={() => setActiveView('purchase')}
                                                style={{ borderRadius: '0 4px 4px 0' }}
                                            >
                                                <i className="fa-solid fa-cart-shopping me-1"></i> Purchase
                                            </button>
                                        </div>
                                    </div>

                                    <div className="col-12 col-lg-6 ms-auto text-end">
                                        <div className="row g-2">
                                            <div className="col-12 col-lg-5">
                                                <div className="input-group">
                                                    <input type="text" className="form-control bg_edit" placeholder="Search Project/PO..." value={searchTerm} onChange={handleSearchChange} onKeyDown={handleSearchKeyDown} />
                                                    {searchTerm && (
                                                        <button type="button" className="btn btn-light border-start-0" onClick={handleSearchClear}>
                                                            <i className="fa-solid fa-xmark"></i>
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                            {activeView === 'purchase' && (
                                                <>
                                                    <div className="col-4 col-lg-3">
                                                        <select className="form-select bg_edit" onChange={(e) => handleChange('status', e.target.value)} value={filters.status || ''}>
                                                            <option value="">All Status</option>
                                                            <option value="Store Check Pending">Store Check</option>
                                                            <option value="Purchase Pending">Purchase Pending</option>
                                                            <option value="Purchase Ordered">Ordered</option>
                                                            <option value="Ready for Invoice">Ready Invoice</option>
                                                            <option value="Invoice Generated">Invoiced</option>
                                                            <option value="Completed">Completed</option>
                                                        </select>
                                                    </div>
                                                    <div className="col-4 col-lg-2">
                                                        <select className="form-select bg_edit" onChange={(e) => handleChange('stockStatus', e.target.value)} value={filters.stockStatus || ''}>
                                                            <option value="">Material</option>
                                                            <option value="Available">Available</option>
                                                            <option value="Not Available">Not Available</option>
                                                            <option value="Pending">Pending</option>
                                                        </select>
                                                    </div>
                                                </>
                                            )}
                                            {activeView === 'project' && (
                                                <div className="col-4 col-lg-3">
                                                    <select className="form-select bg_edit" onChange={(e) => handleChange('paymentTermsMatch', e.target.value)} value={filters.paymentTermsMatch || ''}>
                                                        <option value="">Payment Match</option>
                                                        <option value="Matched">Matched</option>
                                                        <option value="Not Matched">Not Matched</option>
                                                        <option value="Partial">Partial</option>
                                                    </select>
                                                </div>
                                            )}
                                            {user?.permissions?.includes("createProjectPurchase") || user?.user === 'company' ? (
                                                <div className="col-8 col-lg-4">
                                                    <button 
                                                        onClick={handleAddOpen} 
                                                        type="button" 
                                                        className="btn adbtn btn-dark w-100 position-relative"
                                                    >
                                                        <i className="fa-solid fa-plus me-1"></i> Add Purchase Request
                                                        {stats.pendingProjectPurchaseCount > 0 && (
                                                            <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
                                                                {stats.pendingProjectPurchaseCount} new
                                                            </span>
                                                        )}
                                                    </button>
                                                </div>
                                            ) : null}
                                        </div>
                                    </div>
                                </div>

                                {/* Stats Cards */}
                                <div className="row px-2 mb-3">
                                    {activeView === 'project' ? (
                                        <>
                                            {[
                                                { label: 'Total Projects', value: stats.totalRequests, bg: 'bg-primary', icon: 'fa-list' },
                                                { label: 'Material Available', value: stats.readyForInvoice, bg: 'bg-success', icon: 'fa-check-circle' },
                                                { label: 'Material Not Available', value: stats.purchasePending, bg: 'bg-danger', icon: 'fa-times-circle' },
                                                { label: 'Payment Matched', value: stats.paymentMatched, bg: 'bg-success', icon: 'fa-check' },
                                                { label: 'Payment Not Matched', value: stats.paymentNotMatched, bg: 'bg-danger', icon: 'fa-exclamation' },
                                                { label: 'Store Check Pending', value: stats.storeCheckPending, bg: 'bg-info', icon: 'fa-warehouse' },
                                            ].map((card, i) => (
                                                <div key={i} className="col-12 col-lg-2 mb-2">
                                                    <div className={`card ${card.bg} text-white`}>
                                                        <div className="card-body p-2 text-center">
                                                            <i className={`fa-solid ${card.icon} mb-1`}></i>
                                                            <h6 className="card-title mb-1" style={{ fontSize: '11px' }}>{card.label}</h6>
                                                            <h4 className="mb-0">{card.value}</h4>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </>
                                    ) : (
                                        <>
                                            {[
                                                { label: 'Total Requests', value: stats.totalRequests, bg: 'bg-primary', icon: 'fa-list' },
                                                { label: 'Store Check Pending', value: stats.storeCheckPending, bg: 'bg-info', icon: 'fa-warehouse' },
                                                { label: 'Purchase Pending', value: stats.purchasePending, bg: 'bg-warning text-dark', icon: 'fa-cart-shopping' },
                                                { label: 'Ready for Invoice', value: stats.readyForInvoice, bg: 'bg-success', icon: 'fa-file-invoice' },
                                                { label: 'Invoice Generated', value: stats.invoiceGenerated, bg: 'bg-success', icon: 'fa-file-invoice-dollar' },
                                                { label: 'Payment Not Matched', value: stats.paymentNotMatched, bg: 'bg-danger', icon: 'fa-times-circle' },
                                            ].map((card, i) => (
                                                <div key={i} className="col-12 col-lg-2 mb-2">
                                                    <div className={`card ${card.bg} ${card.bg.includes('text-dark') ? '' : 'text-white'}`}>
                                                        <div className="card-body p-2 text-center">
                                                            <i className={`fa-solid ${card.icon} mb-1`}></i>
                                                            <h6 className="card-title mb-1" style={{ fontSize: '11px' }}>{card.label}</h6>
                                                            <h4 className="mb-0">{card.value}</h4>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </>
                                    )}
                                </div>

                                {/* Data Table */}
                                <div className="row bg-white p-2 m-1 border rounded">
                                    <div className="col-12 py-2">
                                        <div className="table-responsive">
                                            <table className="table table-striped table-class" id="table-id">
                                                <thead>
                                                    {activeView === 'project' && (
                                                        <tr className="th_border">
                                                            <th>Sr. No</th>
                                                            <th className="align_left_td">Customer Name</th>
                                                            <th className="align_left_td">Project Name</th>
                                                            <th>PO Number</th>
                                                            <th>PO Value</th>
                                                            <th>Material Status</th>
                                                            <th>Payment Terms Match</th>
                                                            <th>Advance Received</th>
                                                            <th>Invoice Generated</th>
                                                            <th>Action</th>
                                                        </tr>
                                                    )}
                                                    {activeView === 'purchase' && (
                                                        <tr className="th_border">
                                                            <th>Sr. No</th>
                                                            <th className="align_left_td">Customer Name</th>
                                                            <th className="align_left_td">Project Name</th>
                                                            <th>PO Number</th>
                                                            <th>Material Status</th>
                                                            <th>Purchase Status</th>
                                                            <th>Store Check</th>
                                                            <th>Account Verify</th>
                                                            <th>Created Date</th>
                                                            <th>Action</th>
                                                        </tr>
                                                    )}
                                                </thead>
                                                <tbody>
                                                    {projectPurchases.length > 0 ? (
                                                        projectPurchases.map((pp, index) => (
                                                            <tr key={pp._id}>
                                                                {activeView === 'project' && (
                                                                    <>
                                                                        <td>{index + 1 + (currentPage - 1) * ITEMS_PER_PAGE}</td>
                                                                        <td className="align_left_td wrap-text-of-col">{pp.customerName || "N/A"}</td>
                                                                        <td className="align_left_td wrap-text-of-col">{pp.projectId?.name || "N/A"}</td>
                                                                        <td>{pp.projectId?.purchaseOrderNo || "N/A"}</td>
                                                                        <td>₹{(pp.projectId?.purchaseOrderValue || 0).toLocaleString()}</td>
                                                                        {/* ─── UPDATED: Visual multi-badge status ─── */}
                                                                        <td>{renderMaterialStatusBadge(pp.materials)}</td>
                                                                        <td>
                                                                            <span className={`badge rounded-pill px-2 py-1 ${getPaymentTermsBadge(pp.accountVerification?.paymentTermsMatch)}`}>
                                                                                {pp.accountVerification?.paymentTermsMatch || 'Pending'}
                                                                            </span>
                                                                        </td>
                                                                        <td>
                                                                            {pp.accountVerification?.advancePaymentReceived ? (
                                                                                <span className="text-success fw-bold">₹{(pp.accountVerification.advancePaymentAmount || 0).toLocaleString()}</span>
                                                                            ) : (
                                                                                <span className="text-danger">No</span>
                                                                            )}
                                                                        </td>
                                                                        <td>
                                                                            {pp.accountVerification?.invoiceGenerated ? (
                                                                                <span className="badge bg-success">✅ Yes</span>
                                                                            ) : (
                                                                                <span className="badge bg-secondary">No</span>
                                                                            )}
                                                                        </td>
                                                                        <td>
                                                                            <div className="d-flex gap-1">
                                                                                <button className="btn btn-sm btn-outline-info" onClick={() => handleDetails(pp)} title="View Details">
                                                                                    <i className="fa-solid fa-eye"></i>
                                                                                </button>
                                                                                {canAccountVerify(pp.status) && (user?.permissions?.includes("updateAccountMaster") || user?.user === 'company') && (
                                                                                    <button className="btn btn-sm btn-outline-success" onClick={() => handleAccountVerify(pp)} title="Account Verify & Invoice">
                                                                                        <i className="fa-solid fa-file-invoice"></i>
                                                                                    </button>
                                                                                )}
                                                                            </div>
                                                                        </td>
                                                                    </>
                                                                )}

                                                                {activeView === 'purchase' && (
                                                                    <>
                                                                        <td>{index + 1 + (currentPage - 1) * ITEMS_PER_PAGE}</td>
                                                                        <td className="align_left_td wrap-text-of-col">{pp.customerName || "N/A"}</td>
                                                                        <td className="align_left_td wrap-text-of-col">{pp.projectId?.name || "N/A"}</td>
                                                                        <td>{pp.projectId?.purchaseOrderNo || "N/A"}</td>
                                                                        {/* ─── UPDATED: Visual multi-badge status ─── */}
                                                                        <td>{renderMaterialStatusBadge(pp.materials)}</td>
                                                                        <td>
                                                                            <span className={`badge rounded-pill px-2 py-1 ${getStatusBadge(pp.status)}`} style={{ fontSize: '10px' }}>
                                                                                {pp.status}
                                                                            </span>
                                                                        </td>
                                                                        <td>
                                                                            {canStoreCheck(pp.status) && (user?.permissions?.includes("updateProjectPurchase") || user?.user === 'company') ? (
                                                                                <button className="btn btn-sm btn-outline-primary" onClick={() => handleMaterialCheck(pp)} title="Store Check">
                                                                                    <i className="fa-solid fa-warehouse me-1"></i>Check
                                                                                </button>
                                                                            ) : (
                                                                                <span className="text-muted small">Done</span>
                                                                            )}
                                                                        </td>
                                                                        <td>
                                                                            {canPurchaseProcess(pp.status) && (user?.permissions?.includes("updateProjectPurchase") || user?.user === 'company') ? (
                                                                                <button className="btn btn-sm btn-outline-warning" onClick={() => handlePurchaseProcess(pp)} title="Process Purchase">
                                                                                    <i className="fa-solid fa-cart-shopping me-1"></i>Process
                                                                                </button>
                                                                            ) : (
                                                                                <span className="text-muted small">—</span>
                                                                            )}
                                                                        </td>
                                                                        <td>{formatDate(pp.createdAt)}</td>
                                                                        <td>
                                                                            <div className="d-flex gap-1">
                                                                                <button className="btn btn-sm btn-outline-info" onClick={() => handleDetails(pp)} title="View Details">
                                                                                    <i className="fa-solid fa-eye"></i>
                                                                                </button>
                                                                                {(user?.permissions?.includes("deleteProjectPurchase") || user?.user === 'company') && pp.status !== 'Completed' && (
                                                                                    <button className="btn btn-sm btn-outline-danger" onClick={() => handleDeleteOpen(pp._id)} title="Delete">
                                                                                        <i className="fa-solid fa-trash"></i>
                                                                                    </button>
                                                                                )}
                                                                            </div>
                                                                        </td>
                                                                    </>
                                                                )}
                                                            </tr>
                                                        ))
                                                    ) : (
                                                        <tr>
                                                            <td colSpan="10" className="text-center py-4">No data found</td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>

                                {/* Pagination */}
                                {!loading && paginationMeta.totalPages > 1 && (
                                    <div className="pagination-container text-center my-3">
                                        <button onClick={() => handlePageChange(1)} disabled={!paginationMeta.hasPrevPage} className="btn btn-dark btn-sm me-1" style={{ borderRadius: "4px" }}>First</button>
                                        <button disabled={!paginationMeta.hasPrevPage} onClick={() => handlePageChange(currentPage - 1)} className="btn btn-dark btn-sm me-1" style={{ borderRadius: "4px" }}>Previous</button>
                                        {(() => {
                                            const maxPagesToShow = 5;
                                            let startPage, endPage;
                                            const totalPages = paginationMeta.totalPages;
                                            if (totalPages <= maxPagesToShow) { startPage = 1; endPage = totalPages; }
                                            else if (currentPage <= 3) { startPage = 1; endPage = maxPagesToShow; }
                                            else if (currentPage >= totalPages - 2) { startPage = totalPages - maxPagesToShow + 1; endPage = totalPages; }
                                            else { startPage = currentPage - 2; endPage = currentPage + 2; }
                                            return Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i).map(number => (
                                                <button key={number} onClick={() => handlePageChange(number)} className={`btn btn-sm me-1 ${currentPage === number ? "btn-primary" : "btn-dark"}`} style={{ minWidth: "35px", borderRadius: "4px" }}>{number}</button>
                                            ));
                                        })()}
                                        <button disabled={!paginationMeta.hasNextPage} onClick={() => handlePageChange(currentPage + 1)} className="btn btn-dark btn-sm me-1">Next</button>
                                        <button onClick={() => handlePageChange(paginationMeta.totalPages)} disabled={!paginationMeta.hasNextPage} className="btn btn-dark btn-sm" style={{ borderRadius: "4px" }}>Last</button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Popups */}
            {deletePopupShow && (
                <DeletePopUP message="Are you sure you want to delete this purchase request?" cancelBtnCallBack={handleDeleteOpen} confirmBtnCallBack={handleDeleteConfirm} heading="Delete" />
            )}
            {addPopupShow && (
                <AddProjectPurchasePopup handleClose={handleAddClose} />
            )}
            {materialCheckPopupShow && selectedPurchase && (
                <MaterialCheckPopup purchase={selectedPurchase} handleClose={closeMaterialCheck} />
            )}
            {purchaseProcessPopupShow && selectedPurchase && (
                <PurchaseProcessPopup purchase={selectedPurchase} handleClose={closePurchaseProcess} />
            )}
            {accountVerifyPopupShow && selectedPurchase && (
                <AccountVerifyPopup purchase={selectedPurchase} handleClose={closeAccountVerify} />
            )}
            {detailsPopupShow && selectedPurchase && (
                <ProjectPurchaseDetailsPopup purchase={selectedPurchase} handleClose={closeDetails} />
            )}
        </>
    );
};