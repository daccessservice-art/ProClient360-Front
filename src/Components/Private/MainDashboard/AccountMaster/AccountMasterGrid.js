import { useState, useEffect, useContext, useCallback } from "react";
import { Header } from "../Header/Header";
import { Sidebar } from "../Sidebar/Sidebar";
import toast from 'react-hot-toast';
import AccountDetailsPopup from "./PopUp/AccountDetailsPopup";
import ConvertToInvoicePopup from "./PopUp/ConvertToInvoicePopup";
import { getAccounts, getAccountStats } from "../../../../hooks/useAccountMaster";
import { getMaterialStatusByProject } from "../../../../hooks/useProjectPurchase";
import { formatDate, formatCurrency } from "../../../../utils/formatDate";
import { UserContext } from "../../../../context/UserContext";

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

    const [accounts, setAccounts]     = useState([]);
    const [loading, setLoading]       = useState(true);
    const [syncing, setSyncing]       = useState(false);
    const [selectedAccount, setSelectedAccount] = useState(null);

    const [currentPage, setCurrentPage] = useState(1);
    const [paginationMeta, setPaginationMeta] = useState({
        totalPages: 0, totalRecords: 0, hasNextPage: false, hasPrevPage: false,
    });

    const [refreshTrigger, setRefreshTrigger] = useState(0);

    const [detailsPopupShow, setDetailsPopupShow]   = useState(false);
    const [convertPopupShow, setConvertPopupShow]   = useState(false);

    const [searchTerm, setSearchTerm] = useState("");
    const [search, setSearch]         = useState("");

    // Only invoice-status filter — no follow-up filter on this page
    const [invoiceStatusFilter, setInvoiceStatusFilter] = useState(null);

    const [stats, setStats] = useState({
        totalAccounts: 0, totalBasicAmount: 0, totalReceivedAmount: 0,
        totalPendingAmount: 0, totalTaxAmount: 0,
        paidCount: 0, pendingCount: 0, partialCount: 0, overdueCount: 0
    });

    const ITEMS_PER_PAGE = 20;

    // ─── Handlers ──────────────────────────────────────────────────
    const handlePageChange    = (page) => setCurrentPage(page);
    const handleSearchChange  = (e)    => setSearchTerm(e.target.value);

    const handleSearchKeyDown = (e) => {
        if (e.key === 'Enter') { e.preventDefault(); setSearch(searchTerm.trim()); setCurrentPage(1); }
    };

    const handleSearchClear = () => { setSearchTerm(""); setSearch(""); setCurrentPage(1); };

    const handleDetails         = (account) => { setSelectedAccount(account); setDetailsPopupShow(true); };
    const handleConvertToInvoice = (account) => { setSelectedAccount(account); setConvertPopupShow(true); };

    const handleCloseDetails = () => {
        setDetailsPopupShow(false); setSelectedAccount(null);
        setCurrentPage(1); setRefreshTrigger(p => p + 1);
    };
    const handleCloseConvert = () => {
        setConvertPopupShow(false); setSelectedAccount(null);
        setCurrentPage(1); setRefreshTrigger(p => p + 1);
    };

    // ─── Data Fetching ──────────────────────────────────────────────
    const fetchAccounts = useCallback(async (page, limit, invStatus, searchToUse) => {
        try {
            setLoading(true);
            const filters = invStatus ? { invoiceStatus: invStatus } : {};
            const data = await getAccounts(page, limit, filters, searchToUse);
            if (data?.success) {
                setAccounts(data.accounts || []);
                const sp = data.pagination || {};
                setPaginationMeta({
                    totalPages:   sp.totalPages  || 0,
                    totalRecords: sp.totalRecords || 0,
                    hasNextPage:  sp.hasNextPage  || false,
                    hasPrevPage:  sp.hasPrevPage  || false,
                });
                if (page > (sp.totalPages || 0) && (sp.totalPages || 0) > 0) setCurrentPage(sp.totalPages);
            } else {
                toast.error(data?.error || 'Failed to fetch accounts');
            }
        } catch (err) {
            console.error("Error fetching accounts:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchStats = useCallback(async () => {
        try {
            const data = await getAccountStats();
            if (data?.success) setStats(data.stats);
        } catch (err) { console.error("Error fetching stats:", err); }
    }, []);

    useEffect(() => {
        fetchAccounts(currentPage, ITEMS_PER_PAGE, invoiceStatusFilter, search);
        fetchStats();
    }, [currentPage, invoiceStatusFilter, search, refreshTrigger, fetchAccounts, fetchStats]);

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
            } catch (err) { console.error('Auto sync failed:', err); }
            setRefreshTrigger(p => p + 1);
        };
        autoSync();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

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
                setCurrentPage(1); setRefreshTrigger(p => p + 1);
            } else { toast.error(data.error || 'Sync failed'); }
        } catch { toast.dismiss(); toast.error('Sync failed'); }
        finally { setSyncing(false); }
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
            {loading && <div className="overlay"><span className="loader"></span></div>}

            <div className="container-scroller">
                <div className="row background_main_all">
                    <Header toggle={toggle} isopen={isopen} />
                    <div className="container-fluid page-body-wrapper">
                        <Sidebar isopen={isopen} active="AccountMasterGrid" />
                        <div
                            className="main-panel"
                            style={{ width: isopen ? "" : "calc(100% - 120px)", marginLeft: isopen ? "" : "125px" }}
                        >
                            <div className="content-wrapper ps-3 ps-md-0 pt-3">

                                {/* ─── Header Row ─── */}
                                <div className="row px-2 py-1">
                                    <div className="col-12 col-lg-4">
                                        <h5 className="text-white py-2">
                                            <i className="fa-solid fa-file-invoice me-2"></i>
                                            Accounts Master
                                        </h5>
                                    </div>
                                    <div className="col-12 col-lg-8 ms-auto text-end">
                                        <div className="row g-2">
                                            <div className="col-12 col-lg-5">
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
                                            <div className="col-6 col-lg-3">
                                                <select
                                                    className="form-select bg_edit"
                                                    onChange={(e) => { setInvoiceStatusFilter(e.target.value || null); setCurrentPage(1); }}
                                                    value={invoiceStatusFilter || ''}
                                                >
                                                    <option value="">All Invoice Status</option>
                                                    <option value="Pending">Pending</option>
                                                    <option value="Partial">Partial</option>
                                                    <option value="Paid">Paid</option>
                                                    <option value="Overdue">Overdue</option>
                                                </select>
                                            </div>
                                            <div className="col-6 col-lg-4">
                                                <button
                                                    className="btn btn-success w-100"
                                                    onClick={handleBulkSync}
                                                    disabled={syncing}
                                                    title="Sync all projects"
                                                >
                                                    <i className={`fa-solid fa-rotate me-1 ${syncing ? 'fa-spin' : ''}`}></i>
                                                    {syncing ? 'Syncing...' : 'Sync Projects'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* ─── Stats Cards ─── */}
                                <div className="row px-2 mb-3">
                                    {(() => {
                                        const totalPOWithTax = (stats.totalBasicAmount || 0) + (stats.totalTaxAmount || 0);
                                        return [
                                            { label: 'Total Accounts',  value: stats.totalAccounts,      bg: 'bg-primary',          currency: false },
                                            { label: 'Total PO Value',  value: totalPOWithTax,            bg: 'bg-secondary',        currency: true  },
                                            { label: 'Amount Received', value: stats.totalReceivedAmount, bg: 'bg-success',          currency: true  },
                                            { label: 'Outstanding',     value: stats.totalPendingAmount,  bg: 'bg-danger',           currency: true  },
                                            { label: 'Paid',            value: stats.paidCount,           bg: 'bg-info',             currency: false },
                                            { label: 'Partial',         value: stats.partialCount,        bg: 'bg-warning text-dark', currency: false },
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

                                {/* ─── Data Table ─── */}
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
                                                        <th>Action</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {accounts.length > 0 ? (
                                                        accounts.map((account, index) => (
                                                            <tr key={account._id}>
                                                                <td>{index + 1 + (currentPage - 1) * ITEMS_PER_PAGE}</td>
                                                                <td className="align_left_td wrap-text-of-col">{account.customerName || "N/A"}</td>
                                                                <td className="align_left_td wrap-text-of-col">{account.projectName  || "N/A"}</td>
                                                                <td>{account.poNumber || "N/A"}</td>
                                                                <td>{formatCurrency(account.basicAmount)}</td>
                                                                <td className="text-success">{formatCurrency(account.accountActions?.receivedAmount)}</td>
                                                                <td className="text-danger">{formatCurrency(account.accountActions?.pendingAmount)}</td>
                                                                <td>
                                                                    <MaterialStatusBadge projectId={account.projectId?._id || account.projectId} />
                                                                </td>
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
                                                                <td>
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
                                                                            title="Create Invoice"
                                                                        >
                                                                            <i className="fa-solid fa-file-invoice"></i>
                                                                        </button>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        ))
                                                    ) : (
                                                        <tr>
                                                            <td colSpan="11" className="text-center py-4">
                                                                {syncing ? 'Syncing projects...' : 'No accounts found. Click "Sync Projects" to load data.'}
                                                            </td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>

                                {/* ─── Pagination ─── */}
                                {!loading && paginationMeta.totalPages > 1 && (
                                    <div className="pagination-container text-center my-3">
                                        <button onClick={() => handlePageChange(1)} disabled={!paginationMeta.hasPrevPage} className="btn btn-dark btn-sm me-1" style={{ borderRadius: "4px" }}>First</button>
                                        <button disabled={!paginationMeta.hasPrevPage} onClick={() => handlePageChange(currentPage - 1)} className="btn btn-dark btn-sm me-1" style={{ borderRadius: "4px" }}>Previous</button>
                                        {(() => {
                                            const maxPagesToShow = 5;
                                            const totalPages = paginationMeta.totalPages;
                                            let startPage, endPage;
                                            if (totalPages <= maxPagesToShow)        { startPage = 1; endPage = totalPages; }
                                            else if (currentPage <= 3)               { startPage = 1; endPage = maxPagesToShow; }
                                            else if (currentPage >= totalPages - 2)  { startPage = totalPages - maxPagesToShow + 1; endPage = totalPages; }
                                            else                                     { startPage = currentPage - 2; endPage = currentPage + 2; }
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

            {/* ─── Popups ─── */}
            {detailsPopupShow && selectedAccount && (
                <AccountDetailsPopup account={selectedAccount} handleClose={handleCloseDetails} />
            )}
            {convertPopupShow && selectedAccount && (
                <ConvertToInvoicePopup account={selectedAccount} handleClose={handleCloseConvert} />
            )}
        </>
    );
};