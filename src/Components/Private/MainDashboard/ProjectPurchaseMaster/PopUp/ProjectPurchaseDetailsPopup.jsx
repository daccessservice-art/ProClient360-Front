import { useState, useEffect } from "react";
import { getProjectPurchase } from "../../../../../hooks/useProjectPurchase";
import { formatDate, formatCurrency } from "../../../../../utils/formatDate";

const ProjectPurchaseDetailsPopup = ({ purchase, handleClose }) => {
    const [fetching, setFetching] = useState(true);
    const [data, setData] = useState(purchase);
    const [activeTab, setActiveTab] = useState('overview');

    useEffect(() => {
        const fetchDetails = async () => {
            try {
                const result = await getProjectPurchase(purchase._id);
                if (result?.success) setData(result.projectPurchase);
            } catch (error) {
                console.error("Error fetching details:", error);
            } finally {
                setFetching(false);
            }
        };
        fetchDetails();
    }, [purchase._id]);

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

    const getStockBadge = (s) => {
        const map = { 'Available': 'bg-success', 'Not Available': 'bg-danger', 'Partial': 'bg-warning text-dark', 'Pending': 'bg-secondary' };
        return map[s] || 'bg-secondary';
    };

    const getPurchaseBadge = (s) => {
        const map = { 'Delivered': 'bg-success', 'Ordered': 'bg-info', 'Pending': 'bg-warning text-dark', 'Partially Delivered': 'bg-warning text-dark', 'Not Required': 'bg-secondary' };
        return map[s] || 'bg-secondary';
    };

    const getPaymentBadge = (s) => {
        const map = { 'Matched': 'bg-success', 'Not Matched': 'bg-danger', 'Partial': 'bg-warning text-dark', 'Pending': 'bg-secondary' };
        return map[s] || 'bg-secondary';
    };

    return (
        <div className="modal fade show" style={{ display: "flex", alignItems: 'center', backgroundColor: "#00000090" }}>
            <div className="modal-dialog modal-xl">
                <div className="modal-content p-3">
                    <div className="modal-header pt-0">
                        <h5 className="card-title fw-bold">
                            <i className="fa-solid fa-list me-2"></i>
                            Project Purchase Details
                        </h5>
                        <button onClick={handleClose} type="button" className="close px-3" style={{ marginLeft: "auto" }}>
                            <span aria-hidden="true">&times;</span>
                        </button>
                    </div>
                    <div className="modal-body">
                        {fetching ? (
                            <div className="text-center py-4"><div className="spinner-border text-primary"></div></div>
                        ) : (
                            <>
                                {/* Tabs */}
                                <ul className="nav nav-tabs mb-3">
                                    {['overview', 'materials', 'purchase', 'account'].map(tab => (
                                        <li key={tab} className="nav-item">
                                            <button className={`nav-link ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>
                                                {tab === 'overview' ? 'Overview' : tab === 'materials' ? 'Materials' : tab === 'purchase' ? 'Purchase' : 'Account'}
                                            </button>
                                        </li>
                                    ))}
                                </ul>

                                {/* Overview Tab */}
                                {activeTab === 'overview' && (
                                    <div className="row border p-3 bg-light">
                                        <div className="col-6 mb-2"><small className="text-muted">Customer:</small> <p className="fw-bold mb-0">{data.customerName || 'N/A'}</p></div>
                                        <div className="col-6 mb-2"><small className="text-muted">Project:</small> <p className="fw-bold mb-0">{data.projectId?.name || 'N/A'}</p></div>
                                        <div className="col-6 mb-2"><small className="text-muted">PO Number:</small> <p className="mb-0">{data.projectId?.purchaseOrderNo || 'N/A'}</p></div>
                                        <div className="col-6 mb-2"><small className="text-muted">PO Value:</small> <p className="mb-0 text-primary fw-bold">{formatCurrency(data.projectId?.purchaseOrderValue || 0)}</p></div>
                                        <div className="col-6 mb-2"><small className="text-muted">Status:</small> <span className={`badge ${getStatusBadge(data.status)}`}>{data.status}</span></div>
                                        <div className="col-6 mb-2"><small className="text-muted">Requested By:</small> <p className="mb-0">{data.requestedBy?.name || 'N/A'}</p></div>
                                        <div className="col-6 mb-2"><small className="text-muted">Request Date:</small> <p className="mb-0">{formatDate(data.requestDate)}</p></div>
                                        <div className="col-12 mt-3 border-top pt-2">
                                            <small className="text-muted fw-bold">Payment Terms (From Project Master):</small>
                                            <div className="row mt-1">
                                                <div className="col-3"><small className="text-muted">Advance</small><p className="mb-0 fw-bold">{data.paymentTerms?.advancePay || 0}%</p></div>
                                                <div className="col-3"><small className="text-muted">Against Delivery</small><p className="mb-0 fw-bold">{data.paymentTerms?.payAgainstDelivery || 0}%</p></div>
                                                <div className="col-3"><small className="text-muted">After Completion</small><p className="mb-0 fw-bold">{data.paymentTerms?.payAfterCompletion || 0}%</p></div>
                                                <div className="col-3"><small className="text-muted">Retention</small><p className="mb-0 fw-bold">{data.paymentTerms?.retention || 0}%</p></div>
                                            </div>
                                        </div>
                                        {data.remark && (
                                            <div className="col-12 mt-2"><small className="text-muted">Remark:</small> <p className="mb-0">{data.remark}</p></div>
                                        )}
                                    </div>
                                )}

                                {/* Materials Tab */}
                                {activeTab === 'materials' && (
                                    <div className="table-responsive">
                                        <table className="table table-bordered table-sm">
                                            <thead className="table-dark">
                                                <tr>
                                                    <th>#</th><th>Product</th><th>Qty</th><th>Est. Price</th><th>Stock Status</th><th>Available</th><th>Checked By</th><th>Checked Date</th><th>Remark</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {(data.materials || []).map((m, i) => (
                                                    <tr key={i} className={m.stockStatus === 'Available' ? 'table-success' : m.stockStatus === 'Not Available' ? 'table-danger' : ''}>
                                                        <td>{i + 1}</td>
                                                        <td><strong>{m.productName}</strong>{m.description && <><br /><small className="text-muted">{m.description}</small></>}</td>
                                                        <td>{m.quantity} {m.unit}</td>
                                                        <td>{formatCurrency(m.estimatedPrice)}</td>
                                                        <td><span className={`badge ${getStockBadge(m.stockStatus)}`}>{m.stockStatus}</span></td>
                                                        <td>{m.availableQuantity}</td>
                                                        <td>{m.stockCheckedBy?.name || 'N/A'}</td>
                                                        <td>{m.stockCheckedDate ? formatDate(m.stockCheckedDate) : 'N/A'}</td>
                                                        <td>{m.stockRemark || 'N/A'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}

                                {/* Purchase Tab */}
                                {activeTab === 'purchase' && (
                                    <div className="table-responsive">
                                        <table className="table table-bordered table-sm">
                                            <thead className="table-dark">
                                                <tr>
                                                    <th>#</th><th>Product</th><th>Qty</th><th>Purchase Required</th><th>Purchase Status</th><th>Vendor</th><th>PO Ref</th><th>Order Date</th><th>Expected Delivery</th><th>Actual Delivery</th><th>Remark</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {(data.materials || []).map((m, i) => (
                                                    <tr key={i}>
                                                        <td>{i + 1}</td>
                                                        <td><strong>{m.productName}</strong></td>
                                                        <td>{m.quantity} {m.unit}</td>
                                                        <td>{m.purchaseRequired ? '✅ Yes' : '❌ No'}</td>
                                                        <td><span className={`badge ${getPurchaseBadge(m.purchaseStatus)}`}>{m.purchaseStatus}</span></td>
                                                        <td>{m.vendorId?.vendorName || 'N/A'}</td>
                                                        <td>{m.purchaseOrderRef || 'N/A'}</td>
                                                        <td>{m.purchaseDate ? formatDate(m.purchaseDate) : 'N/A'}</td>
                                                        <td>{m.expectedDeliveryDate ? formatDate(m.expectedDeliveryDate) : 'N/A'}</td>
                                                        <td>{m.actualDeliveryDate ? formatDate(m.actualDeliveryDate) : 'N/A'}</td>
                                                        <td>{m.purchaseRemark || 'N/A'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}

                                {/* Account Tab */}
                                {activeTab === 'account' && (
                                    <div className="row border p-3 bg-light">
                                        <div className="col-12 mb-3"><h6 className="text-primary mb-0">Account Verification</h6></div>
                                        <div className="col-6 mb-2"><small className="text-muted">Advance Payment Received:</small> <p className="mb-0">{data.accountVerification?.advancePaymentReceived ? '✅ Yes' : '❌ No'}</p></div>
                                        <div className="col-6 mb-2"><small className="text-muted">Advance Amount:</small> <p className="mb-0 fw-bold">{formatCurrency(data.accountVerification?.advancePaymentAmount || 0)}</p></div>
                                        <div className="col-6 mb-2"><small className="text-muted">Payment Date:</small> <p className="mb-0">{data.accountVerification?.advancePaymentDate ? formatDate(data.accountVerification.advancePaymentDate) : 'N/A'}</p></div>
                                        <div className="col-6 mb-2">
                                            <small className="text-muted">Payment Terms Match:</small>
                                            <span className={`badge ms-1 ${getPaymentBadge(data.accountVerification?.paymentTermsMatch)}`}>{data.accountVerification?.paymentTermsMatch || 'Pending'}</span>
                                        </div>
                                        <div className="col-6 mb-2"><small className="text-muted">Invoice Generated:</small> <p className="mb-0">{data.accountVerification?.invoiceGenerated ? '✅ Yes' : '❌ No'}</p></div>
                                        {data.accountVerification?.invoiceNumber && (
                                            <div className="col-6 mb-2"><small className="text-muted">Invoice Number:</small> <p className="mb-0 fw-bold">{data.accountVerification.invoiceNumber}</p></div>
                                        )}
                                        {data.accountVerification?.invoiceDate && (
                                            <div className="col-6 mb-2"><small className="text-muted">Invoice Date:</small> <p className="mb-0">{formatDate(data.accountVerification.invoiceDate)}</p></div>
                                        )}
                                        {data.accountVerification?.invoicePdf && (
                                            <div className="col-6 mb-2">
                                                <small className="text-muted">Invoice PDF:</small>
                                                <a href={data.accountVerification.invoicePdf} target="_blank" rel="noreferrer" className="btn btn-sm btn-outline-primary ms-2">
                                                    <i className="fa-solid fa-file-pdf me-1"></i>View
                                                </a>
                                            </div>
                                        )}
                                        {data.accountVerification?.accountRemark && (
                                            <div className="col-12 mb-2"><small className="text-muted">Account Remark:</small> <p className="mb-0">{data.accountVerification.accountRemark}</p></div>
                                        )}
                                        <div className="col-6 mb-2"><small className="text-muted">Verified By:</small> <p className="mb-0">{data.accountVerification?.verifiedBy?.name || 'N/A'}</p></div>
                                        <div className="col-6 mb-2"><small className="text-muted">Verified Date:</small> <p className="mb-0">{data.accountVerification?.verifiedDate ? formatDate(data.accountVerification.verifiedDate) : 'N/A'}</p></div>
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

export default ProjectPurchaseDetailsPopup;