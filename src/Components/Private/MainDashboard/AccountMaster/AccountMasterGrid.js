import { useState, useContext, useEffect, useCallback } from "react";
import { Header } from "../Header/Header";
import { Sidebar } from "../Sidebar/Sidebar";
import toast from 'react-hot-toast';
import AccountDetailsPopup from "./PopUp/AccountDetailsPopup";
import ConvertToInvoicePopup from "./PopUp/ConvertToInvoicePopup";
import FollowUpPopup from "./PopUp/FollowUpPopup";
import { getAccounts, getFollowUpAlerts, getAccountStats } from "../../../../hooks/useAccountMaster";
import { formatDate, formatCurrency } from "../../../../utils/formatDate";
import { UserContext } from "../../../../context/UserContext";

export const AccountMasterGrid = () => {
    const { user } = useContext(UserContext);

    const [isopen, setIsOpen] = useState(false);
    const toggle = () => setIsOpen(!isopen);

    const [accounts, setAccounts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [selectedAccount, setSelectedAccount] = useState(null);

    // Popups
    const [detailsPopupShow, setDetailsPopupShow] = useState(false);
    const [convertPopupShow, setConvertPopupShow] = useState(false);
    const [followUpPopupShow, setFollowUpPopupShow] = useState(false);

    // Filters
    const [searchTerm, setSearchTerm] = useState("");
    const [search, setSearch] = useState("");
    const [filters, setFilters] = useState({
        invoiceStatus: null,
        followUpDue: null
    });

    // Pagination
    const [pagination, setPagination] = useState({
        currentPage: 1,
        totalPages: 0,
        totalRecords: 0,
        limit: 20,
        hasNextPage: false,
        hasPrevPage: false,
    });

    // Stats
    const [stats, setStats] = useState({
        totalAccounts: 0,
        totalBasicAmount: 0,
        totalReceivedAmount: 0,
        totalPendingAmount: 0,
        paidCount: 0,
        pendingCount: 0,
        partialCount: 0,
        overdueCount: 0
    });

    // Alerts
    const [todayAlerts, setTodayAlerts] = useState([]);
    const [overdueAlerts, setOverdueAlerts] = useState([]);
    const [showAlerts, setShowAlerts] = useState(false);

    const ITEMS_PER_PAGE = 20;

    const handlePageChange = (page) => {
        setPagination((prev) => ({ ...prev, currentPage: page }));
    };

    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value);
    };

    const handleSearchKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            setSearch(searchTerm.trim());
            setPagination((prev) => ({ ...prev, currentPage: 1 }));
        }
    };

    const handleSearchClear = () => {
        setSearchTerm("");
        setSearch("");
        setPagination((prev) => ({ ...prev, currentPage: 1 }));
    };

    const handleChange = (filterType, value) => {
        setFilters((prev) => ({ ...prev, [filterType]: value || null }));
        setPagination((prev) => ({ ...prev, currentPage: 1 }));
    };

    // ─── Fetch Functions ────────────────────────────────────────────────────────

    const fetchAccounts = useCallback(async () => {
        try {
            setLoading(true);
            const data = await getAccounts(
                pagination.currentPage,
                ITEMS_PER_PAGE,
                filters,
                search
            );
            if (data?.success) {
                setAccounts(data.accounts || []);
                setPagination(data.pagination || pagination);
            } else {
                toast.error(data?.error || 'Failed to fetch accounts');
            }
        } catch (error) {
            console.error("Error fetching accounts:", error);
            toast.error("Failed to fetch accounts");
        } finally {
            setLoading(false);
        }
    }, [pagination.currentPage, filters, search]);

    const fetchStats = useCallback(async () => {
        try {
            const data = await getAccountStats();
            if (data?.success) setStats(data.stats);
        } catch (error) {
            console.error("Error fetching stats:", error);
        }
    }, []);

    const fetchAlerts = useCallback(async () => {
        try {
            const data = await getFollowUpAlerts();
            if (data?.success) {
                setTodayAlerts(data.todayAlerts || []);
                setOverdueAlerts(data.overdueAlerts || []);
            }
        } catch (error) {
            console.error("Error fetching alerts:", error);
        }
    }, []);

    // Fetch accounts + stats on filter/page/search change
    useEffect(() => {
        fetchAccounts();
        fetchStats();
    }, [pagination.currentPage, filters, search]);

    // Fetch alerts only on mount
    useEffect(() => {
        fetchAlerts();
    }, []);

    // ─── Popup Handlers ─────────────────────────────────────────────────────────

    const handleDetails = (account) => {
        setSelectedAccount(account);
        setDetailsPopupShow(true);
    };

    const handleConvertToInvoice = (account) => {
        setSelectedAccount(account);
        setConvertPopupShow(true);
    };

    const handleAddFollowUp = (account) => {
        setSelectedAccount(account);
        setFollowUpPopupShow(true);
    };

    const handleCloseDetails = () => {
        setDetailsPopupShow(false);
        setSelectedAccount(null);
        fetchAccounts();
        fetchStats();
    };

    const handleCloseConvert = () => {
        setConvertPopupShow(false);
        setSelectedAccount(null);
        fetchAccounts();
        fetchStats();
    };

    const handleCloseFollowUp = () => {
        setFollowUpPopupShow(false);
        setSelectedAccount(null);
        fetchAccounts();
        fetchAlerts();
    };

    // ─── Bulk Sync ───────────────────────────────────────────────────────────────

    const handleBulkSync = async () => {
        try {
            setSyncing(true);
            const toastId = toast.loading('Syncing all projects...');
            const response = await fetch(`${process.env.REACT_APP_API_URL}/api/account/bulk-sync`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                }
            });
            const data = await response.json();
            toast.dismiss(toastId);
            if (data.success) {
                toast.success(data.message);
                fetchAccounts();
                fetchStats();
            } else {
                toast.error(data.error || 'Sync failed');
            }
        } catch (error) {
            toast.dismiss();
            toast.error('Sync failed');
        } finally {
            setSyncing(false);
        }
    };

    // ─── Badge Helpers ───────────────────────────────────────────────────────────

    const getInvoiceStatusBadge = (status) => {
        switch (status) {
            case "Paid":    return "bg-success";
            case "Partial": return "bg-warning text-dark";
            case "Pending": return "bg-info";
            case "Overdue": return "bg-danger";
            default:        return "bg-secondary";
        }
    };

    const getInstallationStatusBadge = (status) => {
        switch (status) {
            case "Completed":   return "bg-success";
            case "In Progress": return "bg-warning text-dark";
            case "Not Started": return "bg-secondary";
            case "Pending":     return "bg-danger";
            default:            return "bg-secondary";
        }
    };

    const isFollowUpDue = (date) => {
        if (!date) return false;
        const d = new Date(date);
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
        return d >= today && d < tomorrow;
    };

    const isOverdue = (date) => {
        if (!date) return false;
        const d = new Date(date);
        const today = new Date(); today.setHours(0, 0, 0, 0);
        return d < today;
    };

    // ─── Render ──────────────────────────────────────────────────────────────────

    return (
        <>
            {loading && (
                <div className="overlay">
                    <span className="loader"></span>
                </div>
            )}

            <div className="container-scroller">
                <div className="row background_main_all">
                    <Header toggle={toggle} isopen={isopen} />
                    <div className="container-fluid page-body-wrapper">
                        <Sidebar isopen={isopen} active="AccountMasterGrid" />
                        <div
                            className="main-panel"
                            style={{
                                width: isopen ? "" : "calc(100% - 120px)",
                                marginLeft: isopen ? "" : "125px",
                            }}
                        >
                            <div className="content-wrapper ps-3 ps-md-0 pt-3">

                                {/* ── Header Row ───────────────────────────────── */}
                                <div className="row px-2 py-1">
                                    <div className="col-12 col-lg-4">
                                        <h5 className="text-white py-2">Accounts Master</h5>
                                    </div>
                                    <div className="col-12 col-lg-8 ms-auto text-end">
                                        <div className="row g-2">

                                            {/* Search */}
                                            <div className="col-12 col-lg-4">
                                                <div className="input-group">
                                                    <input
                                                        type="text"
                                                        className="form-control bg_edit"
                                                        placeholder="Search Customer/Project/PO..."
                                                        value={searchTerm}
                                                        onChange={handleSearchChange}
                                                        onKeyDown={handleSearchKeyDown}
                                                    />
                                                    {searchTerm && (
                                                        <button
                                                            type="button"
                                                            className="btn btn-light border-start-0"
                                                            onClick={handleSearchClear}
                                                        >
                                                            <i className="fa-solid fa-xmark"></i>
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Invoice Status Filter */}
                                            <div className="col-6 col-lg-2">
                                                <select
                                                    className="form-select bg_edit"
                                                    onChange={(e) => handleChange('invoiceStatus', e.target.value)}
                                                    value={filters.invoiceStatus || ''}
                                                >
                                                    <option value="">Invoice Status</option>
                                                    <option value="Pending">Pending</option>
                                                    <option value="Partial">Partial</option>
                                                    <option value="Paid">Paid</option>
                                                    <option value="Overdue">Overdue</option>
                                                </select>
                                            </div>

                                            {/* Follow-up Filter */}
                                            <div className="col-6 col-lg-2">
                                                <select
                                                    className="form-select bg_edit"
                                                    onChange={(e) => handleChange('followUpDue', e.target.value)}
                                                    value={filters.followUpDue || ''}
                                                >
                                                    <option value="">Follow-up</option>
                                                    <option value="today">Due Today</option>
                                                    <option value="overdue">Overdue</option>
                                                </select>
                                            </div>

                                            {/* Sync Projects */}
                                            <div className="col-6 col-lg-2">
                                                <button
                                                    className="btn btn-success w-100"
                                                    onClick={handleBulkSync}
                                                    disabled={syncing}
                                                    title="Sync all projects into Account Master"
                                                >
                                                    <i className={`fa-solid fa-rotate me-1 ${syncing ? 'fa-spin' : ''}`}></i>
                                                    {syncing ? 'Syncing...' : 'Sync Projects'}
                                                </button>
                                            </div>

                                            {/* Alert Bell */}
                                            {(todayAlerts.length > 0 || overdueAlerts.length > 0) && (
                                                <div className="col-6 col-lg-2">
                                                    <button
                                                        className="btn btn-warning w-100 position-relative"
                                                        onClick={() => setShowAlerts(!showAlerts)}
                                                    >
                                                        <i className="fa-solid fa-bell"></i>
                                                        <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
                                                            {todayAlerts.length + overdueAlerts.length}
                                                        </span>
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* ── Stats Cards ───────────────────────────────── */}
                                <div className="row px-2 mb-3">
                                    {[
                                        { label: 'Total Invoice Accounts', value: stats.totalAccounts, bg: 'bg-primary', currency: false },
                                        { label: 'Total Received',         value: stats.totalReceivedAmount, bg: 'bg-success', currency: true },
                                        { label: 'Total Pending',          value: stats.totalPendingAmount, bg: 'bg-danger', currency: true },
                                        { label: 'Paid',                   value: stats.paidCount, bg: 'bg-info', currency: false },
                                        { label: 'Partial',                value: stats.partialCount, bg: 'bg-warning text-dark', currency: false },
                                        { label: 'Pending',                value: stats.pendingCount, bg: 'bg-secondary', currency: false },
                                    ].map((card, i) => (
                                        <div key={i} className="col-12 col-lg-2 mb-2">
                                            <div className={`card ${card.bg} ${card.bg.includes('text-dark') ? '' : 'text-white'}`}>
                                                <div className="card-body p-2">
                                                    <h6 className="card-title mb-1">{card.label}</h6>
                                                    <h4 className="mb-0">
                                                        {card.currency ? formatCurrency(card.value) : card.value}
                                                    </h4>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* ── Alerts Panel ─────────────────────────────── */}
                                {showAlerts && (
                                    <div className="row px-2 mb-3">
                                        <div className="col-12">
                                            <div className="card border-warning">
                                                <div className="card-header bg-warning text-dark d-flex justify-content-between align-items-center">
                                                    <h6 className="mb-0">
                                                        <i className="fa-solid fa-bell me-2"></i>
                                                        Follow-up Alerts ({todayAlerts.length + overdueAlerts.length})
                                                    </h6>
                                                    <button className="btn btn-sm btn-dark" onClick={() => setShowAlerts(false)}>
                                                        <i className="fa-solid fa-xmark"></i>
                                                    </button>
                                                </div>
                                                <div className="card-body p-2">
                                                    {todayAlerts.length > 0 && (
                                                        <>
                                                            <h6 className="text-primary">Today's Follow-ups ({todayAlerts.length})</h6>
                                                            <div className="row">
                                                                {todayAlerts.slice(0, 4).map((alert, idx) => (
                                                                    <div key={idx} className="col-12 col-lg-3 mb-2">
                                                                        <div className="card bg-light border-primary">
                                                                            <div className="card-body p-2">
                                                                                <small className="text-muted">Customer</small>
                                                                                <p className="mb-1 fw-bold">{alert.customerName}</p>
                                                                                <small className="text-muted">Project</small>
                                                                                <p className="mb-1 small">{alert.projectName}</p>
                                                                                <small className="text-muted">Follow-up Date</small>
                                                                                <p className="mb-0 small text-primary">
                                                                                    {formatDate(alert.accountActions?.nextFollowUpDate)}
                                                                                </p>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </>
                                                    )}
                                                    {overdueAlerts.length > 0 && (
                                                        <>
                                                            <h6 className="text-danger mt-3">Overdue Follow-ups ({overdueAlerts.length})</h6>
                                                            <div className="row">
                                                                {overdueAlerts.slice(0, 4).map((alert, idx) => (
                                                                    <div key={idx} className="col-12 col-lg-3 mb-2">
                                                                        <div className="card bg-light border-danger">
                                                                            <div className="card-body p-2">
                                                                                <small className="text-muted">Customer</small>
                                                                                <p className="mb-1 fw-bold">{alert.customerName}</p>
                                                                                <small className="text-muted">Project</small>
                                                                                <p className="mb-1 small">{alert.projectName}</p>
                                                                                <small className="text-muted">Due Date</small>
                                                                                <p className="mb-0 small text-danger">
                                                                                    {formatDate(alert.accountActions?.nextFollowUpDate)}
                                                                                </p>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* ── Data Table ───────────────────────────────── */}
                                <div className="row bg-white p-2 m-1 border rounded">
                                    <div className="col-12 py-2">
                                        <div className="table-responsive">
                                            <table className="table table-striped table-class" id="table-id">
                                                <thead>
                                                    <tr className="th_border">
                                                        <th>Sr. No</th>
                                                        <th className="align_left_td">Customer Name</th>
                                                        <th className="align_left_td">Project Name</th>
                                                        <th>PO Number</th>
                                                        <th>PO Value (Without GST)</th>
                                                        <th>Received</th>
                                                        <th>Pending</th>
                                                        <th>Invoice Status</th>
                                                        <th>Installation</th>
                                                        <th>Follow-up</th>
                                                        <th>Action</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {accounts.length > 0 ? (
                                                        accounts.map((account, index) => (
                                                            <tr
                                                                key={account._id}
                                                                className={isFollowUpDue(account.accountActions?.nextFollowUpDate) ? 'table-warning' : ''}
                                                            >
                                                                <td className="w-10">
                                                                    {index + 1 + (pagination.currentPage - 1) * ITEMS_PER_PAGE}
                                                                </td>
                                                                <td className="align_left_td wrap-text-of-col">
                                                                    {account.customerName || "N/A"}
                                                                </td>
                                                                <td className="align_left_td wrap-text-of-col">
                                                                    {account.projectName || "N/A"}
                                                                </td>
                                                                <td className="w-20">{account.poNumber || "N/A"}</td>
                                                                <td className="w-20">{formatCurrency(account.basicAmount)}</td>
                                                                <td className="w-20 text-success">
                                                                    {formatCurrency(account.accountActions?.receivedAmount)}
                                                                </td>
                                                                <td className="w-20 text-danger">
                                                                    {formatCurrency(account.accountActions?.pendingAmount)}
                                                                </td>
                                                                <td className="w-20">
                                                                    <span className={`badge rounded-pill px-2 py-1 ${getInvoiceStatusBadge(account.accountActions?.invoiceStatus)}`}>
                                                                        {account.accountActions?.invoiceStatus || 'N/A'}
                                                                    </span>
                                                                </td>
                                                                <td className="w-20">
                                                                    <span className={`badge rounded-pill px-2 py-1 ${getInstallationStatusBadge(account.installationStatus?.installationStatus)}`}>
                                                                        {account.installationStatus?.installationStatus || 'N/A'}
                                                                    </span>
                                                                    <br />
                                                                    <small className="text-muted">
                                                                        {account.installationStatus?.workCompletedPercentage || 0}% Complete
                                                                    </small>
                                                                </td>
                                                                <td className="w-20">
                                                                    {account.accountActions?.nextFollowUpDate ? (
                                                                        <>
                                                                            <small className={isOverdue(account.accountActions.nextFollowUpDate) ? 'text-danger fw-bold' : 'text-muted'}>
                                                                                {formatDate(account.accountActions.nextFollowUpDate)}
                                                                            </small>
                                                                            {isFollowUpDue(account.accountActions.nextFollowUpDate) && (
                                                                                <i className="fa-solid fa-bell text-warning ms-1"></i>
                                                                            )}
                                                                            {isOverdue(account.accountActions.nextFollowUpDate) && (
                                                                                <i className="fa-solid fa-exclamation-triangle text-danger ms-1"></i>
                                                                            )}
                                                                        </>
                                                                    ) : (
                                                                        <span className="text-muted">N/A</span>
                                                                    )}
                                                                </td>
                                                                <td className="w-20">
                                                                    <div className="d-flex gap-1">
                                                                        <button
                                                                            className="btn btn-sm btn-outline-primary"
                                                                            onClick={() => handleDetails(account)}
                                                                            title="View Details"
                                                                        >
                                                                            <i className="fa-solid fa-eye"></i>
                                                                        </button>
                                                                        <button
                                                                            className="btn btn-sm btn-outline-success"
                                                                            onClick={() => handleConvertToInvoice(account)}
                                                                            title="Create / Update Invoice"
                                                                        >
                                                                            <i className="fa-solid fa-file-invoice"></i>
                                                                        </button>
                                                                        <button
                                                                            className="btn btn-sm btn-outline-warning"
                                                                            onClick={() => handleAddFollowUp(account)}
                                                                            title="Add Follow-up"
                                                                        >
                                                                            <i className="fa-solid fa-phone"></i>
                                                                        </button>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        ))
                                                    ) : (
                                                        <tr>
                                                            <td colSpan="11" className="text-center py-4">
                                                                {syncing
                                                                    ? 'Syncing projects...'
                                                                    : 'No accounts found. Click "Sync Projects" to load data.'}
                                                            </td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>

                                {/* ── Pagination ───────────────────────────────── */}
                                {!loading && pagination.totalPages > 1 && (
                                    <div className="pagination-container text-center my-3">
                                        <button
                                            onClick={() => handlePageChange(1)}
                                            disabled={!pagination.hasPrevPage}
                                            className="btn btn-dark btn-sm me-1"
                                            style={{ borderRadius: "4px" }}
                                        >
                                            First
                                        </button>
                                        <button
                                            disabled={!pagination.hasPrevPage}
                                            onClick={() => handlePageChange(pagination.currentPage - 1)}
                                            className="btn btn-dark btn-sm me-1"
                                            style={{ borderRadius: "4px" }}
                                        >
                                            Previous
                                        </button>
                                        {(() => {
                                            const maxPagesToShow = 5;
                                            let startPage, endPage;
                                            if (pagination.totalPages <= maxPagesToShow) {
                                                startPage = 1; endPage = pagination.totalPages;
                                            } else if (pagination.currentPage <= 3) {
                                                startPage = 1; endPage = maxPagesToShow;
                                            } else if (pagination.currentPage >= pagination.totalPages - 2) {
                                                startPage = pagination.totalPages - maxPagesToShow + 1;
                                                endPage = pagination.totalPages;
                                            } else {
                                                startPage = pagination.currentPage - 2;
                                                endPage = pagination.currentPage + 2;
                                            }
                                            return Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i).map((number) => (
                                                <button
                                                    key={number}
                                                    onClick={() => handlePageChange(number)}
                                                    className={`btn btn-sm me-1 ${pagination.currentPage === number ? "btn-primary" : "btn-dark"}`}
                                                    style={{ minWidth: "35px", borderRadius: "4px" }}
                                                >
                                                    {number}
                                                </button>
                                            ));
                                        })()}
                                        <button
                                            disabled={!pagination.hasNextPage}
                                            onClick={() => handlePageChange(pagination.currentPage + 1)}
                                            className="btn btn-dark btn-sm me-1"
                                        >
                                            Next
                                        </button>
                                        <button
                                            onClick={() => handlePageChange(pagination.totalPages)}
                                            disabled={!pagination.hasNextPage}
                                            className="btn btn-dark btn-sm"
                                            style={{ borderRadius: "4px" }}
                                        >
                                            Last
                                        </button>
                                    </div>
                                )}

                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Popups ───────────────────────────────────────────────────────── */}
            {detailsPopupShow && selectedAccount && (
                <AccountDetailsPopup
                    account={selectedAccount}
                    handleClose={handleCloseDetails}
                />
            )}
            {convertPopupShow && selectedAccount && (
                <ConvertToInvoicePopup
                    account={selectedAccount}
                    handleClose={handleCloseConvert}
                />
            )}
            {followUpPopupShow && selectedAccount && (
                <FollowUpPopup
                    account={selectedAccount}
                    handleClose={handleCloseFollowUp}
                />
            )}
        </>
    );
};