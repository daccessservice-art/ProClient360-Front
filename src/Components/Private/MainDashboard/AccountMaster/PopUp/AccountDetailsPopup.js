import { useState, useEffect } from "react";
import { getAccountByProject, updateAccountActions } from "../../../../../hooks/useAccountMaster";
import { getMaterialStatusByProject } from "../../../../../hooks/useProjectPurchase";
import { formatDate, formatCurrency } from "../../../../../utils/formatDate";
import toast from "react-hot-toast";
import { RequiredStar } from "../../../RequiredStar/RequiredStar";

// ─── Material Status Sub-Component ────────────────────────────────
const MaterialStatusTab = ({ projectId }) => {
    const [materialData, setMaterialData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!projectId) return;
        const fetchMaterialStatus = async () => {
            try {
                const data = await getMaterialStatusByProject(projectId);
                if (data?.success) setMaterialData(data);
            } catch (error) {
                console.error("Error fetching material status:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchMaterialStatus();
    }, [projectId]);

    if (loading) return <div className="text-center py-3"><div className="spinner-border text-primary spinner-border-sm"></div></div>;
    if (!materialData) return <p className="text-muted text-center py-3">No material data available</p>;

    return (
        <div className="row border p-3 bg-light">
            <div className="col-12 mb-3"><h6 className="text-primary">Material Availability</h6></div>
            <div className="col-6 mb-3">
                <small className="text-muted">Overall Material Status</small>
                <h5><span className={`badge ${materialData.materialAvailable ? 'bg-success' : 'bg-danger'}`}>{materialData.materialStatus || 'N/A'}</span></h5>
            </div>
            <div className="col-6 mb-3">
                <small className="text-muted">Payment Terms Match</small>
                <h5><span className={`badge ${materialData.paymentTermsMatch === 'Matched' ? 'bg-success' : materialData.paymentTermsMatch === 'Not Matched' ? 'bg-danger' : 'bg-warning text-dark'}`}>{materialData.paymentTermsMatch || 'Pending'}</span></h5>
            </div>
            {(materialData.materials || []).length > 0 && (
                <div className="col-12 mt-2">
                    <h6 className="text-primary mb-2">Material Details</h6>
                    <div className="table-responsive">
                        <table className="table table-bordered table-sm">
                            <thead className="table-dark"><tr><th>#</th><th>Product</th><th>Qty</th><th>Stock</th><th>Purchase</th></tr></thead>
                            <tbody>
                                {materialData.materials.map((m, i) => (
                                    <tr key={i} className={m.stockStatus === 'Available' ? 'table-success' : m.stockStatus === 'Not Available' ? 'table-danger' : ''}>
                                        <td>{i + 1}</td><td>{m.productName}</td><td>{m.quantity} {m.unit}</td>
                                        <td><span className={`badge ${m.stockStatus === 'Available' ? 'bg-success' : 'bg-danger'}`}>{m.stockStatus}</span></td>
                                        <td><span className={`badge ${m.purchaseStatus === 'Delivered' ? 'bg-success' : 'bg-secondary'}`}>{m.purchaseStatus}</span></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
            {!materialData.materials || materialData.materials.length === 0 ? (
                <div className="col-12 text-center py-3">
                    <p className="text-muted mb-2">No purchase request found.</p>
                    <a href="/ProjectPurchaseMasterGrid" className="btn btn-sm btn-outline-primary"><i className="fa-solid fa-plus me-1"></i> Create Request</a>
                </div>
            ) : null}
        </div>
    );
};

// ─── Main Popup Component ─────────────────────────────────────────
const AccountDetailsPopup = ({ account, handleClose }) => {
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [accountData, setAccountData] = useState(account);
    const [activeTab, setActiveTab] = useState('project');

    const projectId = account.projectId?._id || account.projectId;

    const fetchAccountDetails = async () => {
        if (!projectId) return;
        try {
            setFetching(true);
            const data = await getAccountByProject(projectId);
            if (data?.success) setAccountData(data.account);
        } catch (error) {
            console.error("Error fetching account details:", error);
        } finally {
            setFetching(false);
        }
    };

    useEffect(() => { fetchAccountDetails(); }, []);

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
            if (data?.success) { toast.success(data.message); setAccountData(data.account); }
            else { toast.error(data?.error || 'Failed to update'); }
        } catch (error) { toast.error('Failed to update account'); }
        finally { setLoading(false); }
    };

    const handleChange = (field, value) => {
        setAccountData(prev => ({ ...prev, accountActions: { ...prev.accountActions, [field]: value } }));
    };

    const totalInvoicedAmount = (accountData.invoiceHistory || []).reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);

    const TABS = [
        { key: 'project', label: 'Project Info' },
        { key: 'materials', label: 'Material Status' },
        { key: 'delivery', label: 'Delivery' },
        { key: 'installation', label: 'Installation' },
        { key: 'accounts', label: 'Account Actions' },
        { key: 'invoices', label: `Invoices (${(accountData.invoiceHistory || []).length})` },
        { key: 'history', label: 'Follow-Up' },
    ];

    return (
        <div className="modal fade show" style={{ display: "flex", alignItems: 'center', backgroundColor: "#00000090" }}>
            <div className="modal-dialog modal-xl">
                <div className="modal-content p-3">
                    <div className="modal-header pt-0">
                        <h5 className="card-title fw-bold">Account Details - {accountData.customerName}</h5>
                        <button onClick={handleClose} type="button" className="close px-3" style={{ marginLeft: "auto" }}><span aria-hidden="true">&times;</span></button>
                    </div>
                    <div className="modal-body">
                        {fetching ? (
                            <div className="text-center py-4"><div className="spinner-border text-primary"></div></div>
                        ) : (
                            <>
                                <ul className="nav nav-tabs mb-3">
                                    {TABS.map(tab => (<li key={tab.key} className="nav-item"><button className={`nav-link ${activeTab === tab.key ? 'active' : ''}`} onClick={() => setActiveTab(tab.key)}>{tab.label}</button></li>))}
                                </ul>

                                {/* Project Info */}
                                {activeTab === 'project' && (
                                    <div className="row border p-3 bg-light">
                                        <div className="col-6 mb-3"><small className="text-muted">Customer</small><p className="fw-bold mb-0">{accountData.customerName}</p></div>
                                        <div className="col-6 mb-3"><small className="text-muted">Project</small><p className="fw-bold mb-0">{accountData.projectName}</p></div>
                                        <div className="col-6 mb-3"><small className="text-muted">PO Number</small><p className="mb-0">{accountData.poNumber || 'N/A'}</p></div>
                                        <div className="col-6 mb-3"><small className="text-muted">PO Value</small><p className="mb-0 text-primary fw-bold">{formatCurrency(accountData.basicAmount)}</p></div>
                                        <div className="col-12 mt-2 border-top pt-2">
                                            <small className="text-muted fw-bold">Payment Terms:</small>
                                            <div className="row mt-1">
                                                <div className="col-3"><small className="text-muted">Advance</small><p className="mb-0">{accountData.paymentTerms?.advancePay || 0}%</p></div>
                                                <div className="col-3"><small className="text-muted">Delivery</small><p className="mb-0">{accountData.paymentTerms?.payAgainstDelivery || 0}%</p></div>
                                                <div className="col-3"><small className="text-muted">Completion</small><p className="mb-0">{accountData.paymentTerms?.payAfterCompletion || 0}%</p></div>
                                                <div className="col-3"><small className="text-muted">Retention</small><p className="mb-0">{accountData.paymentTerms?.retention || 0}%</p></div>
                                            </div>
                                        </div>
                                        <div className="col-12 mt-3 border-top pt-2">
                                            <div className="row">
                                                <div className="col-4"><small className="text-muted">Total Invoiced</small><p className="mb-0 text-primary fw-bold">{formatCurrency(totalInvoicedAmount)}</p></div>
                                                <div className="col-4"><small className="text-muted">Received</small><p className="mb-0 text-success fw-bold">{formatCurrency(accountData.accountActions?.receivedAmount || 0)}</p></div>
                                                <div className="col-4"><small className="text-muted">Outstanding</small><p className="mb-0 text-danger fw-bold">{formatCurrency(accountData.accountActions?.pendingAmount || 0)}</p></div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Materials */}
                                {activeTab === 'materials' && <MaterialStatusTab projectId={projectId} />}

                                {/* Delivery */}
                                {activeTab === 'delivery' && (
                                    <div className="row border p-3 bg-light">
                                        <div className="col-6 mb-3"><small className="text-muted">Material Delivered</small>
                                            <div className="progress mt-2"><div className="progress-bar" style={{ width: `${accountData.deliveryStatus?.materialDeliveredPercentage || 0}%` }}>{accountData.deliveryStatus?.materialDeliveredPercentage || 0}%</div></div>
                                        </div>
                                        <div className="col-6 mb-3"><small className="text-muted">Pending Material</small><p className="mb-0">{accountData.deliveryStatus?.pendingMaterial || 'N/A'}</p></div>
                                    </div>
                                )}

                                {/* Installation */}
                                {activeTab === 'installation' && (
                                    <div className="row border p-3 bg-light">
                                        <div className="col-6 mb-3"><small className="text-muted">Status</small>
                                            <p className="mb-0"><span className={`badge rounded-pill px-3 py-2 ${accountData.installationStatus?.installationStatus === 'Completed' ? 'bg-success' : accountData.installationStatus?.installationStatus === 'In Progress' ? 'bg-warning text-dark' : 'bg-secondary'}`}>{accountData.installationStatus?.installationStatus || 'N/A'}</span></p>
                                        </div>
                                        <div className="col-6 mb-3"><small className="text-muted">Work Completed</small>
                                            <div className="progress mt-2"><div className="progress-bar bg-success" style={{ width: `${accountData.installationStatus?.workCompletedPercentage || 0}%` }}>{accountData.installationStatus?.workCompletedPercentage || 0}%</div></div>
                                        </div>
                                    </div>
                                )}

                                {/* Account Actions */}
                                {activeTab === 'accounts' && (
                                    <form onSubmit={handleUpdateActions}>
                                        <div className="row border p-3 bg-light">
                                            <div className="col-12 mb-3"><h6 className="text-primary">Payment Information</h6></div>
                                            <div className="col-4 mb-3"><label className="form-label">PO Value (Without GST)</label><input type="text" className="form-control" value={formatCurrency(accountData.basicAmount)} readOnly style={{ backgroundColor: '#e9ecef' }} /></div>
                                            <div className="col-4 mb-3"><label className="form-label">Tax Amount(₹)<RequiredStar /></label><input type="number" className="form-control" value={accountData.accountActions?.taxAmount || 0} onChange={(e) => handleChange('taxAmount', Number(e.target.value))} step="0.01" min="0" required /></div>
                                            <div className="col-4 mb-3"><label className="form-label">Total Invoice Amount (Auto)</label><input type="text" className="form-control" value={formatCurrency(totalInvoicedAmount || (accountData.basicAmount + (accountData.accountActions?.taxAmount || 0)))} readOnly style={{ backgroundColor: '#e9ecef' }} /></div>
                                            <div className="col-4 mb-3"><label className="form-label">Advance Received</label><input type="number" className="form-control" value={accountData.accountActions?.advancePaymentReceived || 0} onChange={(e) => handleChange('advancePaymentReceived', Number(e.target.value))} step="0.01" min="0" /></div>
                                            <div className="col-4 mb-3"><label className="form-label">Total Received <RequiredStar /></label><input type="number" className="form-control" value={accountData.accountActions?.receivedAmount || 0} onChange={(e) => handleChange('receivedAmount', Number(e.target.value))} step="0.01" min="0" required /></div>
                                            <div className="col-4 mb-3"><label className="form-label">Outstanding (Auto)</label><input type="text" className="form-control bg-danger text-white" value={formatCurrency(accountData.accountActions?.pendingAmount || 0)} readOnly /></div>
                                            <div className="col-6 mb-3"><label className="form-label">Next Follow-up</label><input type="date" className="form-control" value={accountData.accountActions?.nextFollowUpDate ? new Date(accountData.accountActions.nextFollowUpDate).toISOString().split('T')[0] : ''} onChange={(e) => handleChange('nextFollowUpDate', e.target.value ? new Date(e.target.value) : null)} /></div>
                                            <div className="col-12 mb-3"><label className="form-label">Remark</label><textarea className="form-control" rows="2" value={accountData.accountActions?.customerPaymentRemark || ''} onChange={(e) => handleChange('customerPaymentRemark', e.target.value)} maxLength={1000} /></div>
                                            <div className="col-12"><button type="submit" disabled={loading} className="btn btn-primary me-2">{loading ? 'Saving...' : 'Save Changes'}</button><button type="button" onClick={handleClose} className="btn btn-secondary">Close</button></div>
                                        </div>
                                    </form>
                                )}

                                {/* Invoices Tab (Multiple PDFs) */}
                                {activeTab === 'invoices' && (
                                    <div className="row">
                                        <div className="col-12 mb-3 d-flex justify-content-between align-items-center">
                                            <h6 className="text-primary mb-0">All Invoices ({(accountData.invoiceHistory || []).length})</h6>
                                            <div className="text-end">
                                                <small className="text-muted me-3">Total Invoiced: <strong className="text-primary">{formatCurrency(totalInvoicedAmount)}</strong></small>
                                                <small className="text-muted me-3">Received: <strong className="text-success">{formatCurrency(accountData.accountActions?.receivedAmount || 0)}</strong></small>
                                                <small className="text-muted">Pending: <strong className="text-danger">{formatCurrency(accountData.accountActions?.pendingAmount || 0)}</strong></small>
                                            </div>
                                        </div>
                                        {(accountData.invoiceHistory || []).length > 0 ? (
                                            <div className="col-12">
                                                <div className="table-responsive">
                                                    <table className="table table-bordered table-sm">
                                                        <thead className="table-dark">
                                                            <tr><th>#</th><th>Invoice No</th><th>Date</th><th>Amount</th><th>Tax</th><th>Total</th><th>Status</th><th>PDFs</th></tr>
                                                        </thead>
                                                        <tbody>
                                                            {accountData.invoiceHistory.map((invoice, idx) => (
                                                                <tr key={idx}>
                                                                    <td>{idx + 1}</td>
                                                                    <td className="fw-bold">{invoice.invoiceNumber}</td>
                                                                    <td>{formatDate(invoice.invoiceDate)}</td>
                                                                    <td>{formatCurrency(invoice.invoiceAmount)}</td>
                                                                    <td>{formatCurrency(invoice.taxAmount)}</td>
                                                                    <td className="fw-bold">{formatCurrency(invoice.totalAmount)}</td>
                                                                    <td><span className={`badge ${invoice.status === 'Paid' ? 'bg-success' : 'bg-warning text-dark'}`}>{invoice.status}</span></td>
                                                                    <td>
                                                                        {(invoice.invoicePdfs || []).length > 0 ? (
                                                                            <div className="d-flex flex-wrap gap-1">
                                                                                {invoice.invoicePdfs.map((pdf, pIdx) => (
                                                                                    <a key={pIdx} href={pdf} target="_blank" rel="noreferrer" className="btn btn-sm btn-outline-primary">
                                                                                        <i className="fa-solid fa-file-pdf me-1"></i>{pIdx + 1}
                                                                                    </a>
                                                                                ))}
                                                                            </div>
                                                                        ) : <span className="text-muted">N/A</span>}
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                        <tfoot className="table-light">
                                                            <tr className="fw-bold">
                                                                <td colSpan="3" className="text-end">Grand Total:</td>
                                                                <td>{formatCurrency(accountData.invoiceHistory.reduce((s, i) => s + (i.invoiceAmount || 0), 0))}</td>
                                                                <td>{formatCurrency(accountData.invoiceHistory.reduce((s, i) => s + (i.taxAmount || 0), 0))}</td>
                                                                <td>{formatCurrency(totalInvoicedAmount)}</td>
                                                                <td colSpan="2"></td>
                                                            </tr>
                                                        </tfoot>
                                                    </table>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="col-12 text-center py-4">
                                                <i className="fa-solid fa-file-invoice fa-3x text-muted mb-3"></i>
                                                <p className="text-muted">No invoices created yet.</p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* History */}
                                {activeTab === 'history' && (
                                    <div className="row">
                                        <div className="col-12">
                                            <h6 className="text-primary mb-3">Follow-up History</h6>
                                            {accountData.followUpHistory?.length > 0 ? (
                                                <div className="table-responsive">
                                                    <table className="table table-sm">
                                                        <thead><tr><th>Date</th><th>Next Follow-up</th><th>Contact</th><th>Remark</th></tr></thead>
                                                        <tbody>
                                                            {accountData.followUpHistory.map((f, idx) => (
                                                                <tr key={idx}><td>{formatDate(f.followUpDate)}</td><td>{formatDate(f.nextFollowUpDate)}</td><td>{f.contactPerson || 'N/A'}</td><td>{f.remark}</td></tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            ) : <p className="text-muted">No follow-up history</p>}
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