import { useState, useContext, useEffect, useCallback } from "react";
import { Header } from "../Header/Header";
import { Sidebar } from "../Sidebar/Sidebar";
import toast from 'react-hot-toast';
import AccountDetailsPopup from "./PopUp/AccountDetailsPopup";
import ConvertToInvoicePopup from "./PopUp/ConvertToInvoicePopup";
import FollowUpPopup from "./PopUp/FollowUpPopup";
import { getAccounts, getFollowUpAlerts, getAccountStats } from "../../../../hooks/useAccountMaster";
import { getMaterialStatusByProject } from "../../../../hooks/useProjectPurchase";
import { formatDate, formatCurrency } from "../../../../utils/formatDate";
import { UserContext } from "../../../../context/UserContext";

// ─── Blinking Badge Styles ─────────────────────────────────────────
const pulseStyles = `
@keyframes pulseRed {
    0%   { box-shadow: 0 0 0 0 rgba(220,53,69,0.7); opacity: 1; }
    50%  { box-shadow: 0 0 0 6px rgba(220,53,69,0); opacity: 0.6; }
    100% { box-shadow: 0 0 0 0 rgba(220,53,69,0); opacity: 1; }
}
@keyframes pulseDarkRed {
    0%   { box-shadow: 0 0 0 0 rgba(139,0,0,0.8); opacity: 1; }
    50%  { box-shadow: 0 0 0 6px rgba(139,0,0,0); opacity: 0.5; }
    100% { box-shadow: 0 0 0 0 rgba(139,0,0,0); opacity: 1; }
}
.badge-pulse-red {
    animation: pulseRed 1.2s infinite;
    background-color: #dc3545 !important;
}
.badge-pulse-dark-red {
    animation: pulseDarkRed 1.2s infinite;
    background-color: #8b0000 !important;
}
`;

// ─── Material Status Badge ─────────────────────────────────────────
const MaterialStatusBadge = ({ projectId }) => {
    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!projectId) { setLoading(false); return; }
        setLoading(true);
        getMaterialStatusByProject(projectId)
            .then(data => { if (data?.success) setStatus(data); })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [projectId]);

    if (loading) return <small className="text-muted">...</small>;
    if (!status) return <span className="badge bg-secondary" style={{ fontSize: '10px' }}>No Request</span>;

    const badgeClass = status.materialAvailable ? 'bg-success' :
        status.materialStatus === 'Not Available' ? 'bg-danger' :
        status.materialStatus === 'Check Pending' ? 'bg-warning text-dark' : 'bg-info';

    return (
        <div>
            <span className={`badge rounded-pill px-2 py-1 ${badgeClass}`} style={{ fontSize: '10px' }}>
                {status.materialStatus || 'N/A'}
            </span>
            {status.paymentTermsMatch && status.paymentTermsMatch !== 'Pending' && (
                <div style={{ fontSize: '9px' }} className={status.paymentTermsMatch === 'Matched' ? 'text-success' : 'text-danger'}>
                    Pay: {status.paymentTermsMatch}
                </div>
            )}
        </div>
    );
};

export const AccountMasterGrid = () => {
    const { user } = useContext(UserContext);

    const [isopen, setIsOpen] = useState(false);
    const toggle = () => setIsOpen(!isopen);

    const [accounts, setAccounts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [selectedAccount, setSelectedAccount] = useState(null);

    const [currentPage, setCurrentPage] = useState(1);
    const [paginationMeta, setPaginationMeta] = useState({
        totalPages: 0,
        totalRecords: 0,
        hasNextPage: false,
        hasPrevPage: false,
    });

    const [refreshTrigger, setRefreshTrigger] = useState(0);

    const [detailsPopupShow, setDetailsPopupShow] = useState(false);
    const [convertPopupShow, setConvertPopupShow] = useState(false);
    const [followUpPopupShow, setFollowUpPopupShow] = useState(false);

    const [searchTerm, setSearchTerm] = useState("");
    const [search, setSearch] = useState("");
    const [filters, setFilters] = useState({ invoiceStatus: null, followUpDue: null });

    const [stats, setStats] = useState({
        totalAccounts: 0,
        totalBasicAmount: 0,
        totalReceivedAmount: 0,
        totalPendingAmount: 0,
        totalTaxAmount: 0,
        paidCount: 0,
        pendingCount: 0,
        partialCount: 0,
        overdueCount: 0
    });

    const [todayAlerts, setTodayAlerts] = useState([]);
    const [overdueAlerts, setOverdueAlerts] = useState([]);
    const [showAlerts, setShowAlerts] = useState(false);

    const ITEMS_PER_PAGE = 20;

    // ─── Date Helpers ──────────────────────────────────────────────
    const isTodayDate = (date) => {
        if (!date) return false;
        const d = new Date(date);
        const today = new Date();
        return (
            d.getFullYear() === today.getFullYear() &&
            d.getMonth() === today.getMonth() &&
            d.getDate() === today.getDate()
        );
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

    // ─── FIX: followUpHistory is on account ROOT, not inside accountActions ──
    const getHasTodayAction = (account) => {
        const history = account.followUpHistory; // ✅ FIXED: was account.accountActions?.followUpHistory
        if (!Array.isArray(history) || history.length === 0) return false;
        return history.some(entry =>
            isTodayDate(entry.followUpDate || entry.createdAt || entry.date)
        );
    };

    const handlePageChange = (page) => setCurrentPage(page);

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
        setFilters((prev) => ({ ...prev, [filterType]: value || null }));
        setCurrentPage(1);
    };

    const fetchAccounts = useCallback(async (page, limit, filtersToUse, searchToUse) => {
        try {
            setLoading(true);
            const data = await getAccounts(page, limit, filtersToUse, searchToUse);
            if (data?.success) {
                setAccounts(data.accounts || []);
                const serverPagination = data.pagination || {};
                setPaginationMeta({
                    totalPages: serverPagination.totalPages || 0,
                    totalRecords: serverPagination.totalRecords || 0,
                    hasNextPage: serverPagination.hasNextPage || false,
                    hasPrevPage: serverPagination.hasPrevPage || false,
                });
                const totalPages = serverPagination.totalPages || 0;
                if (page > totalPages && totalPages > 0) {
                    setCurrentPage(totalPages);
                }
            } else {
                toast.error(data?.error || 'Failed to fetch accounts');
            }
        } catch (error) {
            console.error("Error fetching accounts:", error);
        } finally {
            setLoading(false);
        }
    }, []);

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

    useEffect(() => {
        fetchAccounts(currentPage, ITEMS_PER_PAGE, filters, search);
        fetchStats();
    }, [currentPage, filters, search, refreshTrigger, fetchAccounts, fetchStats]);

    useEffect(() => {
        const autoSync = async () => {
            try {
                await fetch(`${process.env.REACT_APP_API_URL}/api/account/bulk-sync`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`,
                        'Content-Type': 'application/json'
                    }
                });
            } catch (error) {
                console.error('Auto sync failed:', error);
            }
            setRefreshTrigger(prev => prev + 1);
        };
        autoSync();
        fetchAlerts();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleDetails = (account) => { setSelectedAccount(account); setDetailsPopupShow(true); };
    const handleConvertToInvoice = (account) => { setSelectedAccount(account); setConvertPopupShow(true); };
    const handleAddFollowUp = (account) => { setSelectedAccount(account); setFollowUpPopupShow(true); };

    // ─── FIX: Reset to page 1 after any popup close so updated record is visible ──
    const handleCloseDetails = () => {
        setDetailsPopupShow(false);
        setSelectedAccount(null);
        setCurrentPage(1); // ✅ FIXED
        setRefreshTrigger(prev => prev + 1);
    };

    const handleCloseConvert = () => {
        setConvertPopupShow(false);
        setSelectedAccount(null);
        setCurrentPage(1); // ✅ FIXED
        setRefreshTrigger(prev => prev + 1);
    };

    const handleCloseFollowUp = () => {
        setFollowUpPopupShow(false);
        setSelectedAccount(null);
        setCurrentPage(1); // ✅ FIXED
        setRefreshTrigger(prev => prev + 1);
        fetchAlerts();
    };

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
                setCurrentPage(1); // ✅ FIXED: go to page 1 after sync so new records are visible
                setRefreshTrigger(prev => prev + 1);
                fetchAlerts();
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

    return (
        <>
            <style>{pulseStyles}</style>

            {loading && <div className="overlay"><span className="loader"></span></div>}

            <div className="container-scroller">
                <div className="row background_main_all">
                    <Header toggle={toggle} isopen={isopen} />
                    <div className="container-fluid page-body-wrapper">
                        <Sidebar isopen={isopen} active="AccountMasterGrid" />
                        <div className="main-panel" style={{ width: isopen ? "" : "calc(100% - 120px)", marginLeft: isopen ? "" : "125px" }}>
                            <div className="content-wrapper ps-3 ps-md-0 pt-3">

                                {/* Header Row */}
                                <div className="row px-2 py-1">
                                    <div className="col-12 col-lg-4">
                                        <h5 className="text-white py-2">Accounts Master</h5>
                                    </div>
                                    <div className="col-12 col-lg-8 ms-auto text-end">
                                        <div className="row g-2">
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
                                                        <button type="button" className="btn btn-light border-start-0" onClick={handleSearchClear}>
                                                            <i className="fa-solid fa-xmark"></i>
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="col-6 col-lg-2">
                                                <select className="form-select bg_edit" onChange={(e) => handleChange('invoiceStatus', e.target.value)} value={filters.invoiceStatus || ''}>
                                                    <option value="">Invoice Status</option>
                                                    <option value="Pending">Pending</option>
                                                    <option value="Partial">Partial</option>
                                                    <option value="Paid">Paid</option>
                                                    <option value="Overdue">Overdue</option>
                                                </select>
                                            </div>
                                            <div className="col-6 col-lg-2">
                                                <select className="form-select bg_edit" onChange={(e) => handleChange('followUpDue', e.target.value)} value={filters.followUpDue || ''}>
                                                    <option value="">Follow-up</option>
                                                    <option value="today">Due Today</option>
                                                    <option value="overdue">Overdue</option>
                                                </select>
                                            </div>
                                            <div className="col-6 col-lg-2">
                                                <button className="btn btn-success w-100" onClick={handleBulkSync} disabled={syncing} title="Sync all projects">
                                                    <i className={`fa-solid fa-rotate me-1 ${syncing ? 'fa-spin' : ''}`}></i>
                                                    {syncing ? 'Syncing...' : 'Sync Projects'}
                                                </button>
                                            </div>
                                            {(todayAlerts.length > 0 || overdueAlerts.length > 0) && (
                                                <div className="col-6 col-lg-2">
                                                    <button className="btn btn-warning w-100 position-relative" onClick={() => setShowAlerts(!showAlerts)}>
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

                                {/* Stats Cards */}
                                <div className="row px-2 mb-3">
                                    {(() => {
                                        const totalPOWithTax = (stats.totalBasicAmount || 0) + (stats.totalTaxAmount || 0);
                                        return [
                                            { label: 'Total Accounts',  value: stats.totalAccounts,       bg: 'bg-primary',           currency: false },
                                            { label: 'Total PO Value',  value: totalPOWithTax,             bg: 'bg-secondary',          currency: true  },
                                            { label: 'Amount Received', value: stats.totalReceivedAmount,  bg: 'bg-success',            currency: true  },
                                            { label: 'Outstanding',     value: stats.totalPendingAmount,   bg: 'bg-danger',             currency: true  },
                                            { label: 'Paid',            value: stats.paidCount,            bg: 'bg-info',               currency: false },
                                            { label: 'Partial',         value: stats.partialCount,         bg: 'bg-warning text-dark',  currency: false },
                                        ].map((card, i) => (
                                            <div key={i} className="col-12 col-lg-2 mb-2">
                                                <div className={`card ${card.bg} ${card.bg.includes('text-dark') ? '' : 'text-white'}`}>
                                                    <div className="card-body p-2">
                                                        <h6 className="card-title mb-1" style={{ fontSize: '11px' }}>{card.label}</h6>
                                                        <h4 className="mb-0">{card.currency ? formatCurrency(card.value) : card.value}</h4>
                                                    </div>
                                                </div>
                                            </div>
                                        ));
                                    })()}
                                </div>

                                {/* Alerts Panel */}
                                {showAlerts && (
                                    <div className="row px-2 mb-3">
                                        <div className="col-12">
                                            <div className="card border-warning">
                                                <div className="card-header bg-warning text-dark d-flex justify-content-between align-items-center">
                                                    <h6 className="mb-0"><i className="fa-solid fa-bell me-2"></i>Follow-up Alerts ({todayAlerts.length + overdueAlerts.length})</h6>
                                                    <button className="btn btn-sm btn-dark" onClick={() => setShowAlerts(false)}><i className="fa-solid fa-xmark"></i></button>
                                                </div>
                                                <div className="card-body p-2">
                                                    {todayAlerts.length > 0 && (
                                                        <>
                                                            <h6 className="text-primary">Today ({todayAlerts.length})</h6>
                                                            <div className="row">
                                                                {todayAlerts.slice(0, 4).map((alert, idx) => (
                                                                    <div key={idx} className="col-12 col-lg-3 mb-2">
                                                                        <div className="card bg-light border-primary p-2">
                                                                            <small className="text-muted">Customer</small>
                                                                            <p className="mb-1 fw-bold">{alert.customerName}</p>
                                                                            <small className="text-muted">Project</small>
                                                                            <p className="mb-0 small">{alert.projectName}</p>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </>
                                                    )}
                                                    {overdueAlerts.length > 0 && (
                                                        <>
                                                            <h6 className="text-danger mt-3">Overdue ({overdueAlerts.length})</h6>
                                                            <div className="row">
                                                                {overdueAlerts.slice(0, 4).map((alert, idx) => (
                                                                    <div key={idx} className="col-12 col-lg-3 mb-2">
                                                                        <div className="card bg-light border-danger p-2">
                                                                            <small className="text-muted">Customer</small>
                                                                            <p className="mb-1 fw-bold">{alert.customerName}</p>
                                                                            <small className="text-muted">Project</small>
                                                                            <p className="mb-0 small">{alert.projectName}</p>
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

                                {/* Data Table */}
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
                                                        <th>PO Value</th>
                                                        <th>Received</th>
                                                        <th>Pending</th>
                                                        <th>Material</th>
                                                        <th>Invoice Status</th>
                                                        <th>Installation</th>
                                                        <th>Follow-up</th>
                                                        <th>Action</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {accounts.length > 0 ? (
                                                        accounts.map((account, index) => {
                                                            const followUpDate   = account.accountActions?.nextFollowUpDate;
                                                            const isToday        = isFollowUpDue(followUpDate);
                                                            const isPastDue      = isOverdue(followUpDate);
                                                            const hasTodayAction = getHasTodayAction(account);

                                                            return (
                                                                <tr key={account._id} className={isToday ? 'table-warning' : ''}>
                                                                    <td>{index + 1 + (currentPage - 1) * ITEMS_PER_PAGE}</td>
                                                                    <td className="align_left_td wrap-text-of-col">{account.customerName || "N/A"}</td>
                                                                    <td className="align_left_td wrap-text-of-col">{account.projectName || "N/A"}</td>
                                                                    <td>{account.poNumber || "N/A"}</td>
                                                                    <td>{formatCurrency(account.basicAmount)}</td>
                                                                    <td className="text-success">{formatCurrency(account.accountActions?.receivedAmount)}</td>
                                                                    <td className="text-danger">{formatCurrency(account.accountActions?.pendingAmount)}</td>
                                                                    <td><MaterialStatusBadge projectId={account.projectId?._id || account.projectId} /></td>
                                                                    <td>
                                                                        <span className={`badge rounded-pill px-2 py-1 ${getInvoiceStatusBadge(account.accountActions?.invoiceStatus)}`}>
                                                                            {account.accountActions?.invoiceStatus || 'N/A'}
                                                                        </span>
                                                                    </td>
                                                                    <td>
                                                                        <span className={`badge rounded-pill px-2 py-1 ${getInstallationStatusBadge(account.installationStatus?.installationStatus)}`}>
                                                                            {account.installationStatus?.installationStatus || 'N/A'}
                                                                        </span>
                                                                        <br />
                                                                        <small className="text-muted">{account.installationStatus?.workCompletedPercentage || 0}%</small>
                                                                    </td>

                                                                    {/* ─── Follow-up Column ─── */}
                                                                    <td>
                                                                        {followUpDate ? (
                                                                            <div className="d-flex flex-column gap-1">
                                                                                <small className={isPastDue ? 'text-danger fw-bold' : 'text-muted'}>
                                                                                    {formatDate(followUpDate)}
                                                                                </small>
                                                                                {!hasTodayAction && isToday && (
                                                                                    <span className="badge bg-danger text-white badge-pulse-red" style={{ fontSize: '9px' }}>
                                                                                        <i className="fa-solid fa-bell me-1"></i>TODAY FOLLOWUP
                                                                                    </span>
                                                                                )}
                                                                                {!hasTodayAction && isPastDue && (
                                                                                    <span className="badge text-white badge-pulse-dark-red" style={{ fontSize: '9px', backgroundColor: '#8b0000' }}>
                                                                                        <i className="fa-solid fa-triangle-exclamation me-1"></i>OVERDUE
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                        ) : (
                                                                            <span className="text-muted">N/A</span>
                                                                        )}
                                                                    </td>

                                                                    <td>
                                                                        <div className="d-flex gap-1">
                                                                            <button className="btn btn-sm btn-outline-primary" onClick={() => handleDetails(account)} title="View Details">
                                                                                <i className="fa-solid fa-eye"></i>
                                                                            </button>
                                                                            <button className="btn btn-sm btn-outline-success" onClick={() => handleConvertToInvoice(account)} title="Create Invoice">
                                                                                <i className="fa-solid fa-file-invoice"></i>
                                                                            </button>
                                                                            <button className="btn btn-sm btn-outline-warning" onClick={() => handleAddFollowUp(account)} title="Add Follow-up">
                                                                                <i className="fa-solid fa-phone"></i>
                                                                            </button>
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })
                                                    ) : (
                                                        <tr>
                                                            <td colSpan="12" className="text-center py-4">
                                                                {syncing ? 'Syncing projects...' : 'No accounts found. Click "Sync Projects" to load data.'}
                                                            </td>
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
                                            if (totalPages <= maxPagesToShow)          { startPage = 1; endPage = totalPages; }
                                            else if (currentPage <= 3)                 { startPage = 1; endPage = maxPagesToShow; }
                                            else if (currentPage >= totalPages - 2)    { startPage = totalPages - maxPagesToShow + 1; endPage = totalPages; }
                                            else                                       { startPage = currentPage - 2; endPage = currentPage + 2; }
                                            return Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i).map(number => (
                                                <button key={number} onClick={() => handlePageChange(number)} className={`btn btn-sm me-1 ${currentPage === number ? "btn-primary" : "btn-dark"}`} style={{ minWidth: "35px", borderRadius: "4px" }}>
                                                    {number}
                                                </button>
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
            {detailsPopupShow  && selectedAccount && <AccountDetailsPopup    account={selectedAccount} handleClose={handleCloseDetails}  />}
            {convertPopupShow  && selectedAccount && <ConvertToInvoicePopup  account={selectedAccount} handleClose={handleCloseConvert}  />}
            {followUpPopupShow && selectedAccount && <FollowUpPopup          account={selectedAccount} handleClose={handleCloseFollowUp} />}
        </>
    );
};