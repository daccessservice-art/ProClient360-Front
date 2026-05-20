import { useState, useEffect } from "react";
import { getAccountByProject, updateAccountActions } from "../../../../../hooks/useAccountMaster";
import { formatDate, formatCurrency } from "../../../../../utils/formatDate";
import toast from "react-hot-toast";
import { RequiredStar } from "../../../RequiredStar/RequiredStar";

const AccountDetailsPopup = ({ account, handleClose }) => {
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [accountData, setAccountData] = useState(account);
    const [activeTab, setActiveTab] = useState('project');

    // ✅ FIX: account.projectId is a populated object { _id, name, projectStatus, completeLevel }
    // We must extract the actual ID string for the API call
    const projectId = account.projectId?._id || account.projectId;

    const fetchAccountDetails = async () => {
        if (!projectId) return;
        try {
            setFetching(true);
            const data = await getAccountByProject(projectId);
            if (data?.success) {
                setAccountData(data.account);
            }
        } catch (error) {
            console.error("Error fetching account details:", error);
        } finally {
            setFetching(false);
        }
    };

    useEffect(() => {
        fetchAccountDetails();
    }, []);

    const handleUpdateActions = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const updateData = {
                advancePaymentReceived: accountData.accountActions.advancePaymentReceived,
                receivedAmount: accountData.accountActions.receivedAmount,
                taxAmount: accountData.accountActions.taxAmount,
                customerPaymentRemark: accountData.accountActions.customerPaymentRemark,
                nextFollowUpDate: accountData.accountActions.nextFollowUpDate,
            };

            const data = await updateAccountActions(accountData._id, updateData);

            if (data?.success) {
                toast.success(data.message);
                setAccountData(data.account);
            } else {
                toast.error(data?.error || 'Failed to update');
            }
        } catch (error) {
            toast.error('Failed to update account');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (field, value) => {
        setAccountData(prev => ({
            ...prev,
            accountActions: {
                ...prev.accountActions,
                [field]: value
            }
        }));
    };

    const viewInvoice = () => {
        if (accountData.accountActions?.invoicePdf) {
            window.open(accountData.accountActions.invoicePdf, '_blank');
        } else {
            toast.error('No invoice PDF available');
        }
    };

    const TABS = [
        { key: 'project',      label: 'Project Info' },
        { key: 'delivery',     label: 'Delivery Status' },
        { key: 'installation', label: 'Installation' },
        { key: 'accounts',     label: 'Account Actions' },
        { key: 'history',      label: 'History' },
    ];

    return (
        <div className="modal fade show" style={{ display: "flex", alignItems: 'center', backgroundColor: "#00000090" }}>
            <div className="modal-dialog modal-xl">
                <div className="modal-content p-3">
                    <div className="modal-header pt-0">
                        <h5 className="card-title fw-bold">
                            Account Details - {accountData.customerName}
                        </h5>
                        <button onClick={handleClose} type="button" className="close px-3" style={{ marginLeft: "auto" }}>
                            <span aria-hidden="true">&times;</span>
                        </button>
                    </div>

                    <div className="modal-body">
                        {fetching ? (
                            <div className="text-center py-4">
                                <div className="spinner-border text-primary" role="status">
                                    <span className="visually-hidden">Loading...</span>
                                </div>
                            </div>
                        ) : (
                            <>
                                {/* Tabs */}
                                <ul className="nav nav-tabs mb-3">
                                    {TABS.map(tab => (
                                        <li key={tab.key} className="nav-item">
                                            <button
                                                className={`nav-link ${activeTab === tab.key ? 'active' : ''}`}
                                                onClick={() => setActiveTab(tab.key)}
                                            >
                                                {tab.label}
                                            </button>
                                        </li>
                                    ))}
                                </ul>

                                {/* ── Project Info Tab ─────────────────────────── */}
                                {activeTab === 'project' && (
                                    <div className="row border p-3 bg-light">
                                        <div className="col-12 col-lg-6 mb-3">
                                            <label className="text-muted small">Customer Name</label>
                                            <p className="fw-bold mb-0">{accountData.customerName}</p>
                                        </div>
                                        <div className="col-12 col-lg-6 mb-3">
                                            <label className="text-muted small">Project Name</label>
                                            <p className="fw-bold mb-0">{accountData.projectName}</p>
                                        </div>
                                        <div className="col-12 col-lg-6 mb-3">
                                            <label className="text-muted small">PO Number</label>
                                            <p className="mb-0">{accountData.poNumber || 'N/A'}</p>
                                        </div>
                                        <div className="col-12 col-lg-6 mb-3">
                                            <label className="text-muted small">Product/Category</label>
                                            <p className="mb-0">{accountData.product || 'N/A'}</p>
                                        </div>
                                        <div className="col-12 col-lg-6 mb-3">
                                            <label className="text-muted small">Purchase Order Value (Without GST)</label>
                                            <p className="mb-0 text-primary fw-bold">{formatCurrency(accountData.basicAmount)}</p>
                                        </div>
                                        <div className="col-12">
                                            <label className="text-muted small">Payment Terms</label>
                                            <div className="row mt-2">
                                                <div className="col-3">
                                                    <small className="text-muted">Advance</small>
                                                    <p className="mb-0">{accountData.paymentTerms?.advancePay || 0}%</p>
                                                </div>
                                                <div className="col-3">
                                                    <small className="text-muted">Against Delivery</small>
                                                    <p className="mb-0">{accountData.paymentTerms?.payAgainstDelivery || 0}%</p>
                                                </div>
                                                <div className="col-3">
                                                    <small className="text-muted">After Completion</small>
                                                    <p className="mb-0">{accountData.paymentTerms?.payAfterCompletion || 0}%</p>
                                                </div>
                                                <div className="col-3">
                                                    <small className="text-muted">Retention</small>
                                                    <p className="mb-0">{accountData.paymentTerms?.retention || 0}%</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* ── Delivery Status Tab ──────────────────────── */}
                                {activeTab === 'delivery' && (
                                    <div className="row border p-3 bg-light">
                                        <div className="col-12 col-lg-6 mb-3">
                                            <label className="text-muted small">Material Delivered</label>
                                            <div className="progress mt-2">
                                                <div
                                                    className="progress-bar"
                                                    role="progressbar"
                                                    style={{ width: `${accountData.deliveryStatus?.materialDeliveredPercentage || 0}%` }}
                                                >
                                                    {accountData.deliveryStatus?.materialDeliveredPercentage || 0}%
                                                </div>
                                            </div>
                                        </div>
                                        <div className="col-12 col-lg-6 mb-3">
                                            <label className="text-muted small">Pending Material</label>
                                            <p className="mb-0">{accountData.deliveryStatus?.pendingMaterial || 'N/A'}</p>
                                        </div>
                                        <div className="col-12 col-lg-6 mb-3">
                                            <label className="text-muted small">Delivery Completed Date</label>
                                            <p className="mb-0">
                                                {accountData.deliveryStatus?.deliveryCompletedDate
                                                    ? formatDate(accountData.deliveryStatus.deliveryCompletedDate)
                                                    : 'N/A'}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* ── Installation Tab ─────────────────────────── */}
                                {activeTab === 'installation' && (
                                    <div className="row border p-3 bg-light">
                                        <div className="col-12 col-lg-6 mb-3">
                                            <label className="text-muted small">Installation Status</label>
                                            <p className="mb-0">
                                                <span className={`badge rounded-pill px-3 py-2 ${
                                                    accountData.installationStatus?.installationStatus === 'Completed' ? 'bg-success' :
                                                    accountData.installationStatus?.installationStatus === 'In Progress' ? 'bg-warning text-dark' :
                                                    'bg-secondary'
                                                }`}>
                                                    {accountData.installationStatus?.installationStatus || 'N/A'}
                                                </span>
                                            </p>
                                        </div>
                                        <div className="col-12 col-lg-6 mb-3">
                                            <label className="text-muted small">Work Completed</label>
                                            <div className="progress mt-2">
                                                <div
                                                    className="progress-bar bg-success"
                                                    role="progressbar"
                                                    style={{ width: `${accountData.installationStatus?.workCompletedPercentage || 0}%` }}
                                                >
                                                    {accountData.installationStatus?.workCompletedPercentage || 0}%
                                                </div>
                                            </div>
                                        </div>
                                        <div className="col-12 col-lg-6 mb-3">
                                            <label className="text-muted small">Pending Work</label>
                                            <p className="mb-0">{accountData.installationStatus?.pendingWork || 'N/A'}</p>
                                        </div>
                                    </div>
                                )}

                                {/* ── Account Actions Tab ──────────────────────── */}
                                {activeTab === 'accounts' && (
                                    <form onSubmit={handleUpdateActions}>
                                        <div className="row border p-3 bg-light">
                                            <div className="col-12 mb-3">
                                                <h6 className="text-primary">Payment Information</h6>
                                            </div>

                                            <div className="col-12 col-lg-4 mb-3">
                                                <label className="form-label">Purchase Order Value (Without GST)</label>
                                                <input
                                                    type="text"
                                                    className="form-control"
                                                    value={formatCurrency(accountData.basicAmount)}
                                                    readOnly
                                                    style={{ backgroundColor: '#e9ecef' }}
                                                />
                                            </div>

                                            <div className="col-12 col-lg-4 mb-3">
                                                <label className="form-label">Applicable Tax (%) <RequiredStar /></label>
                                                <input
                                                    type="number"
                                                    className="form-control"
                                                    value={accountData.accountActions?.taxAmount || 0}
                                                    onChange={(e) => handleChange('taxAmount', Number(e.target.value))}
                                                    step="0.01"
                                                    min="0"
                                                    required
                                                />
                                            </div>

                                            <div className="col-12 col-lg-4 mb-3">
                                                <label className="form-label">Total Invoice Amount (Auto)</label>
                                                <input
                                                    type="text"
                                                    className="form-control"
                                                    value={formatCurrency(accountData.basicAmount + (accountData.accountActions?.taxAmount || 0))}
                                                    readOnly
                                                    style={{ backgroundColor: '#e9ecef' }}
                                                />
                                            </div>

                                            <div className="col-12 col-lg-4 mb-3">
                                                <label className="form-label">Advance Amount Received</label>
                                                <input
                                                    type="number"
                                                    className="form-control"
                                                    value={accountData.accountActions?.advancePaymentReceived || 0}
                                                    onChange={(e) => handleChange('advancePaymentReceived', Number(e.target.value))}
                                                    step="0.01"
                                                    min="0"
                                                />
                                            </div>

                                            <div className="col-12 col-lg-4 mb-3">
                                                <label className="form-label">Total Amount Received <RequiredStar /></label>
                                                <input
                                                    type="number"
                                                    className="form-control"
                                                    value={accountData.accountActions?.receivedAmount || 0}
                                                    onChange={(e) => handleChange('receivedAmount', Number(e.target.value))}
                                                    step="0.01"
                                                    min="0"
                                                    required
                                                />
                                            </div>

                                            <div className="col-12 col-lg-4 mb-3">
                                                <label className="form-label">Outstanding Amount (Auto)</label>
                                                <input
                                                    type="text"
                                                    className="form-control bg-danger text-white"
                                                    value={formatCurrency(accountData.accountActions?.pendingAmount || 0)}
                                                    readOnly
                                                />
                                            </div>

                                            {/* <div className="col-12 col-lg-4 mb-3">
                                                <label className="form-label">Invoice Status</label>
                                                <input
                                                    type="text"
                                                    className="form-control"
                                                    value={accountData.accountActions?.invoiceStatus || 'N/A'}
                                                    readOnly
                                                    style={{ backgroundColor: '#e9ecef' }}
                                                />
                                            </div> */}

                                            {accountData.accountActions?.invoiceNumber && (
                                                <div className="col-12 col-lg-4 mb-3">
                                                    <label className="form-label">Invoice Number</label>
                                                    <input
                                                        type="text"
                                                        className="form-control"
                                                        value={accountData.accountActions.invoiceNumber}
                                                        readOnly
                                                        style={{ backgroundColor: '#e9ecef' }}
                                                    />
                                                </div>
                                            )}

                                            {accountData.accountActions?.invoicePdf && (
                                                <div className="col-12 col-lg-4 mb-3">
                                                    <label className="form-label">Invoice PDF</label>
                                                    <button
                                                        type="button"
                                                        className="btn btn-outline-primary w-100"
                                                        onClick={viewInvoice}
                                                    >
                                                        <i className="fa-solid fa-file-pdf me-2"></i>
                                                        View Invoice
                                                    </button>
                                                </div>
                                            )}

                                            <div className="col-12 mb-3 mt-3">
                                                <h6 className="text-primary">Follow-up Information</h6>
                                            </div>

                                            <div className="col-12 col-lg-6 mb-3">
                                                <label className="form-label">Next Follow-up Date</label>
                                                <input
                                                    type="date"
                                                    className="form-control"
                                                    value={
                                                        accountData.accountActions?.nextFollowUpDate
                                                            ? new Date(accountData.accountActions.nextFollowUpDate).toISOString().split('T')[0]
                                                            : ''
                                                    }
                                                    onChange={(e) => handleChange('nextFollowUpDate', e.target.value ? new Date(e.target.value) : null)}
                                                />
                                            </div>

                                            <div className="col-12 mb-3">
                                                <label className="form-label">Customer Payment Remark</label>
                                                <textarea
                                                    className="form-control"
                                                    rows="3"
                                                    value={accountData.accountActions?.customerPaymentRemark || ''}
                                                    onChange={(e) => handleChange('customerPaymentRemark', e.target.value)}
                                                    placeholder="Enter payment-related remarks..."
                                                    maxLength={1000}
                                                />
                                            </div>

                                            <div className="col-12">
                                                <button
                                                    type="submit"
                                                    disabled={loading}
                                                    className="btn btn-primary me-2"
                                                >
                                                    {loading ? 'Saving...' : 'Save Changes'}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={handleClose}
                                                    className="btn btn-secondary"
                                                >
                                                    Close
                                                </button>
                                            </div>
                                        </div>
                                    </form>
                                )}

                                {/* ── History Tab ──────────────────────────────── */}
                                {activeTab === 'history' && (
                                    <div className="row">
                                        {/* Invoice History */}
                                        <div className="col-12 mb-4">
                                            <h6 className="text-primary mb-3">Invoice History</h6>
                                            {accountData.invoiceHistory?.length > 0 ? (
                                                <div className="table-responsive">
                                                    <table className="table table-sm">
                                                        <thead>
                                                            <tr>
                                                                <th>Invoice No</th>
                                                                <th>Date</th>
                                                                <th>Amount</th>
                                                                <th>Tax</th>
                                                                <th>Total</th>
                                                                <th>Status</th>
                                                                <th>PDF</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {accountData.invoiceHistory.map((invoice, idx) => (
                                                                <tr key={idx}>
                                                                    <td>{invoice.invoiceNumber}</td>
                                                                    <td>{formatDate(invoice.invoiceDate)}</td>
                                                                    <td>{formatCurrency(invoice.invoiceAmount)}</td>
                                                                    <td>{formatCurrency(invoice.taxAmount)}</td>
                                                                    <td>{formatCurrency(invoice.totalAmount)}</td>
                                                                    <td>
                                                                        <span className={`badge ${invoice.status === 'Paid' ? 'bg-success' : 'bg-warning text-dark'}`}>
                                                                            {invoice.status}
                                                                        </span>
                                                                    </td>
                                                                    <td>
                                                                        {invoice.invoicePdf ? (
                                                                            <a href={invoice.invoicePdf} target="_blank" rel="noreferrer" className="btn btn-sm btn-outline-primary">
                                                                                <i className="fa-solid fa-file-pdf"></i>
                                                                            </a>
                                                                        ) : (
                                                                            <span className="text-muted">N/A</span>
                                                                        )}
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            ) : (
                                                <p className="text-muted">No invoice history</p>
                                            )}
                                        </div>

                                        {/* Follow-up History */}
                                        <div className="col-12">
                                            <h6 className="text-primary mb-3">Follow-up History</h6>
                                            {accountData.followUpHistory?.length > 0 ? (
                                                <div className="table-responsive">
                                                    <table className="table table-sm">
                                                        <thead>
                                                            <tr>
                                                                <th>Follow-up Date</th>
                                                                <th>Next Follow-up</th>
                                                                <th>Contact Person</th>
                                                                <th>Remark</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {accountData.followUpHistory.map((followUp, idx) => (
                                                                <tr key={idx}>
                                                                    <td>{formatDate(followUp.followUpDate)}</td>
                                                                    <td>{formatDate(followUp.nextFollowUpDate)}</td>
                                                                    <td>{followUp.contactPerson || 'N/A'}</td>
                                                                    <td>{followUp.remark}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            ) : (
                                                <p className="text-muted">No follow-up history</p>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AccountDetailsPopup;