import { useState, useEffect, useCallback, useContext } from "react";
import { Header } from "../Header/Header";
import { Sidebar } from "../Sidebar/Sidebar";
import toast from 'react-hot-toast';
import AccountFollowUpActionPopup from "./PopUp/AccountFollowUpActionPopup";
import { getAccounts, getFollowUpAlerts } from "../../../../hooks/useAccountMaster";
import { formatDate, formatCurrency } from "../../../../utils/formatDate";
import { UserContext } from "../../../../context/UserContext";

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
@keyframes pulseInvoiceBlue {
    0%   { box-shadow: 0 0 0 0 rgba(13, 110, 253, 0.9); transform: scale(1); }
    50%  { box-shadow: 0 0 0 8px rgba(13, 110, 253, 0); transform: scale(1.05); }
    100% { box-shadow: 0 0 0 0 rgba(13, 110, 253, 0); transform: scale(1); }
}
.badge-pulse-red      { animation: pulseRed 1.2s infinite; background-color: #dc3545 !important; }
.badge-pulse-dark-red { animation: pulseDarkRed 1.2s infinite; background-color: #8b0000 !important; }
.badge-pulse-invoice  { animation: pulseInvoiceBlue 1.5s infinite; background-color: #0d6efd !important; }
`;

export const AccountFollowUpMasterGrid = () => {
    const { user } = useContext(UserContext);

    const [isopen, setIsOpen] = useState(false);
    const toggle = () => setIsOpen(!isopen);

    const [accounts, setAccounts]   = useState([]);
    const [loading, setLoading]     = useState(true);
    const [selectedAccount, setSelectedAccount] = useState(null);
    const [actionPopupShow, setActionPopupShow] = useState(false);

    const [currentPage, setCurrentPage] = useState(1);
    const [paginationMeta, setPaginationMeta] = useState({
        totalPages: 0, totalRecords: 0, hasNextPage: false, hasPrevPage: false,
    });

    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [searchTerm, setSearchTerm] = useState("");
    const [search, setSearch]         = useState("");
    const [followUpDueFilter, setFollowUpDueFilter] = useState(null);

    const [todayAlerts, setTodayAlerts]     = useState([]);
    const [overdueAlerts, setOverdueAlerts] = useState([]);
    const [showAlerts, setShowAlerts]       = useState(false);

    const ITEMS_PER_PAGE = 20;

    const isTodayDate = (date) => {
        if (!date) return false;
        const d = new Date(date), t = new Date();
        return d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth() && d.getDate() === t.getDate();
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

    const getHasTodayAction = (account) => {
        const history = account.followUpHistory;
        if (!Array.isArray(history) || history.length === 0) return false;
        return history.some(e => isTodayDate(e.followUpDate || e.createdAt || e.date));
    };

    const needsInvoiceFollowUp = (account) => {
    const invoices = account.invoiceHistory || [];
    if (invoices.length === 0) return false;

    // Get the latest invoice's timestamp
    const latestInvoice = invoices[invoices.length - 1];
    const invDate = new Date(latestInvoice.createdAt || latestInvoice.invoiceDate);

    // Use accountActions.lastFollowUpDate — set by backend on every follow-up save
    const lastFollowUpDate = account.accountActions?.lastFollowUpDate;
    if (!lastFollowUpDate) return true; // Invoice exists but zero follow-ups ever done

    return invDate > new Date(lastFollowUpDate);
};

    const handlePageChange   = (page) => setCurrentPage(page);
    const handleSearchChange = (e)    => setSearchTerm(e.target.value);

    const handleSearchKeyDown = (e) => {
        if (e.key === 'Enter') { e.preventDefault(); setSearch(searchTerm.trim()); setCurrentPage(1); }
    };
    const handleSearchClear = () => { setSearchTerm(""); setSearch(""); setCurrentPage(1); };

    const handleOpenAction = (account) => { setSelectedAccount(account); setActionPopupShow(true); };

    const handleCloseAction = () => {
        setActionPopupShow(false);
        setSelectedAccount(null);
        setCurrentPage(1);
        setRefreshTrigger(p => p + 1);
        fetchAlerts();
    };

    const fetchAccounts = useCallback(async (page, limit, followUpDue, searchToUse) => {
        try {
            setLoading(true);
            const filters = { ...(followUpDue && { followUpDue }) };
            const data = await getAccounts(page, limit, filters, searchToUse);
            if (data?.success) {
                const active = (data.accounts || []).filter(
                    acc => acc.accountActions?.invoiceStatus !== 'Paid'
                );
                setAccounts(active);
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

    const fetchAlerts = useCallback(async () => {
        try {
            const data = await getFollowUpAlerts();
            if (data?.success) {
                setTodayAlerts(data.todayAlerts || []);
                setOverdueAlerts(data.overdueAlerts || []);
            }
        } catch (err) { console.error("Error fetching alerts:", err); }
    }, []);

    useEffect(() => {
        fetchAccounts(currentPage, ITEMS_PER_PAGE, followUpDueFilter, search);
    }, [currentPage, followUpDueFilter, search, refreshTrigger, fetchAccounts]);

    useEffect(() => { fetchAlerts(); }, [fetchAlerts]);

    const getInvoiceStatusBadge = (status) => {
        switch (status) {
            case "Partial": return "bg-warning text-dark";
            case "Pending": return "bg-info text-dark";
            case "Overdue": return "bg-danger";
            default:        return "bg-secondary";
        }
    };

    const pendingTodayCount = accounts.filter(a => {
        const d = a.accountActions?.nextFollowUpDate;
        return isFollowUpDue(d) && !getHasTodayAction(a);
    }).length;

    return (
        <>
            <style>{pulseStyles}</style>
            {loading && <div className="overlay"><span className="loader"></span></div>}

            <div className="container-scroller">
                <div className="row background_main_all">
                    <Header toggle={toggle} isopen={isopen} />
                    <div className="container-fluid page-body-wrapper">
                        <Sidebar isopen={isopen} active="AccountFollowUpMasterGrid" />
                        <div className="main-panel" style={{ width: isopen ? "" : "calc(100% - 120px)", marginLeft: isopen ? "" : "125px" }}>
                            <div className="content-wrapper ps-3 ps-md-0 pt-3">

                                {/* Header */}
                                <div className="row px-2 py-1">
                                    <div className="col-12 col-lg-4">
                                        <h5 className="text-white py-2">
                                            <i className="fa-solid fa-phone-volume me-2"></i>
                                            Account Follow-Up Master
                                            {pendingTodayCount > 0 && (
                                                <span className="badge bg-danger ms-2" style={{ fontSize: '11px' }}>
                                                    {pendingTodayCount} Due Today
                                                </span>
                                            )}
                                        </h5>
                                    </div>
                                    <div className="col-12 col-lg-8 ms-auto text-end">
                                        <div className="row g-2">
                                            <div className="col-12 col-lg-5">
                                                <div className="input-group">
                                                    <input
                                                        type="text"
                                                        className="form-control bg_edit text-dark"
                                                        placeholder="Search Customer/Project/PO..."
                                                        value={searchTerm}
                                                        onChange={handleSearchChange}
                                                        onKeyDown={handleSearchKeyDown}
                                                    />
                                                    {searchTerm && (
                                                        <button type="button" className="btn btn-light border-start-0 text-dark" onClick={handleSearchClear}>
                                                            <i className="fa-solid fa-xmark"></i>
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="col-6 col-lg-3">
                                                <select
                                                    className="form-select bg_edit text-dark"
                                                    onChange={(e) => { setFollowUpDueFilter(e.target.value || null); setCurrentPage(1); }}
                                                    value={followUpDueFilter || ''}
                                                >
                                                    <option value="">All Follow-ups</option>
                                                    <option value="today">Due Today</option>
                                                    <option value="overdue">Overdue</option>
                                                </select>
                                            </div>
                                            {(todayAlerts.length > 0 || overdueAlerts.length > 0) && (
                                                <div className="col-6 col-lg-2">
                                                    <button className="btn btn-warning w-100 position-relative text-dark" onClick={() => setShowAlerts(!showAlerts)}>
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

                                {/* Stats */}
                                <div className="row px-2 mb-3">
                                    {[
                                        { label: 'Active Accounts',    value: accounts.length, bg: 'bg-primary', currency: false },
                                        { label: 'Due Today',          value: accounts.filter(a => isFollowUpDue(a.accountActions?.nextFollowUpDate)).length, bg: 'bg-warning text-dark', currency: false },
                                        { label: 'Overdue Follow-ups', value: accounts.filter(a => isOverdue(a.accountActions?.nextFollowUpDate) && !isFollowUpDue(a.accountActions?.nextFollowUpDate)).length, bg: 'bg-danger', currency: false },
                                        { label: 'No Follow-up Set',   value: accounts.filter(a => !a.accountActions?.nextFollowUpDate).length, bg: 'bg-secondary', currency: false },
                                        { label: 'Total Outstanding',  value: accounts.reduce((s, a) => s + (a.accountActions?.pendingAmount || 0), 0), bg: 'bg-danger', currency: true },
                                        { label: 'Total Received',     value: accounts.reduce((s, a) => s + (a.accountActions?.receivedAmount || 0), 0), bg: 'bg-success', currency: true },
                                    ].map((card, i) => (
                                        <div key={i} className="col-12 col-lg-2 mb-2">
                                            <div className={`card ${card.bg} ${card.bg.includes('text-dark') ? '' : 'text-white'}`}>
                                                <div className="card-body p-2">
                                                    <h6 className="card-title mb-1 text-white" style={{ fontSize: '11px' }}>{card.label}</h6>
                                                    <h4 className="mb-0">{card.currency ? formatCurrency(card.value) : card.value}</h4>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
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
                                                <div className="card-body p-2 bg-white">
                                                    {todayAlerts.length > 0 && (
                                                        <>
                                                            <h6 className="text-primary">Today ({todayAlerts.length})</h6>
                                                            <div className="row">
                                                                {todayAlerts.slice(0, 4).map((alert, idx) => (
                                                                    <div key={idx} className="col-12 col-lg-3 mb-2">
                                                                        <div className="card bg-light border-primary p-2">
                                                                            <small className="text-muted">Customer</small>
                                                                            <p className="mb-1 fw-bold text-dark">{alert.customerName}</p>
                                                                            <small className="text-muted">Project</small>
                                                                            <p className="mb-0 small text-dark">{alert.projectName}</p>
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
                                                                            <p className="mb-1 fw-bold text-dark">{alert.customerName}</p>
                                                                            <small className="text-muted">Project</small>
                                                                            <p className="mb-0 small text-dark">{alert.projectName}</p>
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

                                {/* Table */}
                                <div className="row bg-white p-2 m-1 border rounded">
                                    <div className="col-12 py-2">
                                        <div className="table-responsive">
                                            <table className="table table-striped table-class" id="table-id">
                                                <thead>
                                                    <tr className="th_border text-white">
                                                        <th>Sr. No</th>
                                                        <th className="align_left_td">Customer Name</th>
                                                        <th className="align_left_td">Project Name</th>
                                                        <th>PO Number</th>
                                                        <th>Invoiced</th>
                                                        <th>Received</th>
                                                        <th>Outstanding</th>
                                                        <th>Invoice Status</th>
                                                        <th>Last Follow-Up</th>
                                                        <th>Next Follow-Up</th>
                                                        <th>Action</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {accounts.length > 0 ? (
                                                        accounts.map((account, index) => {
                                                            const followUpDate   = account.accountActions?.nextFollowUpDate;
                                                            const lastFollowUp   = account.accountActions?.lastFollowUpDate;
                                                            const isToday        = isFollowUpDue(followUpDate);
                                                            const isPastDue      = isOverdue(followUpDate);
                                                            const hasTodayAction = getHasTodayAction(account);
                                                            const totalInvoiced  = (account.invoiceHistory || []).reduce((s, inv) => s + (inv.totalAmount || 0), 0);
                                                            
                                                            // Check for new invoice alert
                                                            const isNewInvoice = needsInvoiceFollowUp(account);

                                                            return (
                                                                <tr
                                                                    key={account._id}
                                                                    className={
                                                                        (isToday && !hasTodayAction)   ? 'table-warning' :
                                                                        (isPastDue && !hasTodayAction) ? 'table-danger text-white' :
                                                                        (isNewInvoice ? 'table-info text-dark' : 'text-dark')
                                                                    }
                                                                >
                                                                    <td>{index + 1 + (currentPage - 1) * ITEMS_PER_PAGE}</td>
                                                                    <td className="align_left_td wrap-text-of-col">{account.customerName || "N/A"}</td>
                                                                    <td className="align_left_td wrap-text-of-col">{account.projectName  || "N/A"}</td>
                                                                    <td>{account.poNumber || "N/A"}</td>
                                                                    <td className="text-primary fw-bold">
                                                                        {totalInvoiced > 0 ? formatCurrency(totalInvoiced) : <span className="text-muted small">No Invoice</span>}
                                                                    </td>
                                                                    <td className="text-success fw-bold">{formatCurrency(account.accountActions?.receivedAmount)}</td>
                                                                    <td className="text-danger fw-bold">{formatCurrency(account.accountActions?.pendingAmount)}</td>
                                                                    <td>
                                                                        <span className={`badge rounded-pill px-2 py-1 ${getInvoiceStatusBadge(account.accountActions?.invoiceStatus)}`}>
                                                                            {account.accountActions?.invoiceStatus || 'N/A'}
                                                                        </span>
                                                                    </td>
                                                                    <td>
                                                                        {lastFollowUp
                                                                            ? <small className="text-muted">{formatDate(lastFollowUp)}</small>
                                                                            : <span className="text-muted small">N/A</span>}
                                                                    </td>
                                                                    <td>
                                                                        {followUpDate ? (
                                                                            <div className="d-flex flex-column gap-1">
                                                                                <small className={
                                                                                    (isPastDue && !hasTodayAction) ? 'text-white fw-bold' :
                                                                                    (isToday   && !hasTodayAction) ? 'text-dark fw-bold' : 'text-muted'
                                                                                }>
                                                                                    {formatDate(followUpDate)}
                                                                                </small>
                                                                                {!hasTodayAction && isToday && (
                                                                                    <span className="badge bg-danger text-white badge-pulse-red" style={{ fontSize: '9px' }}>
                                                                                        <i className="fa-solid fa-bell me-1"></i>TODAY
                                                                                    </span>
                                                                                )}
                                                                                {!hasTodayAction && isPastDue && !isToday && (
                                                                                    <span className="badge text-white badge-pulse-dark-red" style={{ fontSize: '9px', backgroundColor: '#8b0000' }}>
                                                                                        <i className="fa-solid fa-triangle-exclamation me-1"></i>OVERDUE
                                                                                    </span>
                                                                                )}
                                                                                {hasTodayAction && (
                                                                                    <span className="badge bg-success text-white" style={{ fontSize: '9px' }}>
                                                                                        <i className="fa-solid fa-check me-1"></i>DONE TODAY
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                        ) : (
                                                                            <span className="text-muted small">Not Set</span>
                                                                        )}
                                                                    </td>
                                                                    <td>
                                                                        <div className="d-flex flex-column align-items-center gap-1">
                                                                            {/* NEW INVOICE BLINKER BADGE */}
                                                                            {isNewInvoice && !isToday && !isPastDue && (
                                                                                <span className="badge badge-pulse-invoice text-white" style={{ fontSize: '9px', width: '100%', justifyContent: 'center' }}>
                                                                                    <i className="fa-solid fa-file-invoice me-1"></i>NEW INVOICE
                                                                                </span>
                                                                            )}
                                                                            
                                                                            <button
                                                                                className={`btn btn-sm ${
                                                                                    (isToday && !hasTodayAction)   ? 'btn-danger' :
                                                                                    (isPastDue && !hasTodayAction) ? 'btn-warning text-dark' : 
                                                                                    (isNewInvoice ? 'btn-primary' : 'btn-outline-primary')
                                                                                }`}
                                                                                onClick={() => handleOpenAction(account)}
                                                                                title="Add Follow-Up"
                                                                            >
                                                                                <i className="fa-solid fa-phone me-1"></i>Action
                                                                            </button>
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })
                                                    ) : (
                                                        <tr className="text-dark">
                                                            <td colSpan="11" className="text-center py-4">
                                                                {loading ? 'Loading...' : 'No active accounts found.'}
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
                                            const maxPagesToShow = 5, totalPages = paginationMeta.totalPages;
                                            let startPage, endPage;
                                            if (totalPages <= maxPagesToShow)        { startPage = 1; endPage = totalPages; }
                                            else if (currentPage <= 3)               { startPage = 1; endPage = maxPagesToShow; }
                                            else if (currentPage >= totalPages - 2)  { startPage = totalPages - maxPagesToShow + 1; endPage = totalPages; }
                                            else                                     { startPage = currentPage - 2; endPage = currentPage + 2; }
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

            {actionPopupShow && selectedAccount && (
                <AccountFollowUpActionPopup account={selectedAccount} handleClose={handleCloseAction} />
            )}
        </>
    );
};