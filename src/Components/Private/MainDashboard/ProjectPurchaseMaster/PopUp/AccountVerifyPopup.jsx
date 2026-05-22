import { useState } from "react";
import toast from "react-hot-toast";
import { accountVerifyPurchase } from "../../../../../hooks/useProjectPurchase";
import { formatDate, formatCurrency } from "../../../../../utils/formatDate";
import { RequiredStar } from "../../../RequiredStar/RequiredStar";

const AccountVerifyPopup = ({ purchase, handleClose }) => {
    const [loading, setLoading] = useState(false);
    const [verificationData, setVerificationData] = useState({
        advancePaymentReceived: purchase.accountVerification?.advancePaymentReceived || false,
        advancePaymentAmount: purchase.accountVerification?.advancePaymentAmount || 0,
        advancePaymentDate: purchase.accountVerification?.advancePaymentDate
            ? new Date(purchase.accountVerification.advancePaymentDate).toISOString().split('T')[0]
            : new Date().toISOString().split('T')[0],
        advancePaymentRemark: purchase.accountVerification?.advancePaymentRemark || '',
        paymentTermsMatch: purchase.accountVerification?.paymentTermsMatch || 'Pending',
        accountRemark: purchase.accountVerification?.accountRemark || '',
        invoiceNumber: purchase.accountVerification?.invoiceNumber || '',
        invoiceDate: purchase.accountVerification?.invoiceDate
            ? new Date(purchase.accountVerification.invoiceDate).toISOString().split('T')[0]
            : new Date().toISOString().split('T')[0],
        invoicePdf: ''
    });

    const handleChange = (field, value) => {
        setVerificationData(prev => ({ ...prev, [field]: value }));
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.type !== 'application/pdf') {
            toast.error('Only PDF files are allowed');
            e.target.value = '';
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            toast.error('File must be less than 5MB');
            e.target.value = '';
            return;
        }
        const reader = new FileReader();
        reader.onloadend = () => handleChange('invoicePdf', reader.result);
        reader.readAsDataURL(file);
    };

    // Calculate expected advance
    const projectValue = purchase.projectId?.purchaseOrderValue || 0;
    const expectedAdvancePercent = purchase.paymentTerms?.advancePay || 0;
    const expectedAdvanceAmount = (projectValue * expectedAdvancePercent) / 100;

    // Check payment terms match
    const checkPaymentTerms = () => {
        if (expectedAdvancePercent === 0) return 'Matched';
        if (verificationData.advancePaymentReceived && verificationData.advancePaymentAmount >= expectedAdvanceAmount) return 'Matched';
        if (verificationData.advancePaymentReceived && verificationData.advancePaymentAmount > 0) return 'Partial';
        return 'Not Matched';
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const data = await accountVerifyPurchase(purchase._id, verificationData);
            if (data?.success) {
                toast.success(data.message);
                handleClose();
            } else {
                toast.error(data?.error || 'Failed to update verification');
            }
        } catch (error) {
            toast.error('Failed to update verification');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal fade show" style={{ display: "flex", alignItems: 'center', backgroundColor: "#00000090" }}>
            <div className="modal-dialog modal-lg">
                <div className="modal-content p-3">
                    <form onSubmit={handleSubmit}>
                        <div className="modal-header pt-0">
                            <h5 className="card-title fw-bold">
                                <i className="fa-solid fa-file-invoice me-2"></i>
                                Account Verification & Invoice
                            </h5>
                            <button onClick={handleClose} type="button" className="close px-3" style={{ marginLeft: "auto" }}>
                                <span aria-hidden="true">&times;</span>
                            </button>
                        </div>
                        <div className="modal-body">

                            {/* Project Info */}
                            <div className="row border p-3 mb-3 bg-light">
                                <div className="col-12 mb-2"><h6 className="text-primary mb-0">Project Information (Read-Only)</h6></div>
                                <div className="col-4 mb-1"><small className="text-muted">Customer:</small> <strong>{purchase.customerName || 'N/A'}</strong></div>
                                <div className="col-4 mb-1"><small className="text-muted">Project:</small> <strong>{purchase.projectId?.name || 'N/A'}</strong></div>
                                <div className="col-4 mb-1"><small className="text-muted">PO Number:</small> <strong>{purchase.projectId?.purchaseOrderNo || 'N/A'}</strong></div>
                                <div className="col-4 mb-1"><small className="text-muted">PO Value:</small> <strong>{formatCurrency(projectValue)}</strong></div>
                            </div>

                            {/* Payment Terms from Project Master */}
                            <div className="row border p-3 mb-3 border-primary">
                                <div className="col-12 mb-2"><h6 className="text-primary mb-0">Payment Terms (From Project Master)</h6></div>
                                <div className="col-3 mb-1">
                                    <div className="card text-center p-2">
                                        <small className="text-muted">Advance</small>
                                        <h5 className="mb-0 text-primary">{purchase.paymentTerms?.advancePay || 0}%</h5>
                                        <small className="text-muted">₹{expectedAdvanceAmount.toLocaleString()}</small>
                                    </div>
                                </div>
                                <div className="col-3 mb-1">
                                    <div className="card text-center p-2">
                                        <small className="text-muted">Against Delivery</small>
                                        <h5 className="mb-0 text-info">{purchase.paymentTerms?.payAgainstDelivery || 0}%</h5>
                                    </div>
                                </div>
                                <div className="col-3 mb-1">
                                    <div className="card text-center p-2">
                                        <small className="text-muted">After Completion</small>
                                        <h5 className="mb-0 text-warning">{purchase.paymentTerms?.payAfterCompletion || 0}%</h5>
                                    </div>
                                </div>
                                <div className="col-3 mb-1">
                                    <div className="card text-center p-2">
                                        <small className="text-muted">Retention</small>
                                        <h5 className="mb-0 text-danger">{purchase.paymentTerms?.retention || 0}%</h5>
                                    </div>
                                </div>
                            </div>

                            {/* Material Availability Summary */}
                            <div className="row border p-3 mb-3">
                                <div className="col-12 mb-2"><h6 className="text-success mb-0">Material Availability</h6></div>
                                {(purchase.materials || []).map((mat, idx) => (
                                    <div key={idx} className="col-12 col-lg-6 mb-1">
                                        <small className={`me-2 ${mat.stockStatus === 'Available' ? 'text-success' : 'text-danger'}`}>
                                            {mat.stockStatus === 'Available' ? '✅' : '❌'}
                                        </small>
                                        <strong>{mat.productName}</strong> - {mat.quantity} {mat.unit}
                                        <span className={`badge ms-2 ${mat.stockStatus === 'Available' ? 'bg-success' : mat.stockStatus === 'Not Available' ? 'bg-danger' : 'bg-warning text-dark'}`}>
                                            {mat.stockStatus}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            {/* Advance Payment Check */}
                            <div className="row border p-3 mb-3 border-warning">
                                <div className="col-12 mb-2"><h6 className="text-warning mb-0">Advance Payment Verification</h6></div>

                                <div className="col-12 col-lg-6 mb-3">
                                    <label className="form-label">Advance Payment Received? <RequiredStar /></label>
                                    <select className="form-select" value={verificationData.advancePaymentReceived ? 'yes' : 'no'} onChange={(e) => handleChange('advancePaymentReceived', e.target.value === 'yes')}>
                                        <option value="no">No - Not Received</option>
                                        <option value="yes">Yes - Received</option>
                                    </select>
                                </div>

                                {verificationData.advancePaymentReceived && (
                                    <>
                                        <div className="col-12 col-lg-6 mb-3">
                                            <label className="form-label">Advance Amount Received (₹) <RequiredStar /></label>
                                            <input type="number" className="form-control" value={verificationData.advancePaymentAmount} onChange={(e) => handleChange('advancePaymentAmount', Number(e.target.value))} min="0" step="0.01" required />
                                            <small className="text-muted">Expected as per terms: ₹{expectedAdvanceAmount.toLocaleString()} ({expectedAdvancePercent}%)</small>
                                        </div>
                                        <div className="col-12 col-lg-6 mb-3">
                                            <label className="form-label">Payment Date</label>
                                            <input type="date" className="form-control" value={verificationData.advancePaymentDate} onChange={(e) => handleChange('advancePaymentDate', e.target.value)} />
                                        </div>
                                    </>
                                )}

                                <div className="col-12 mb-3">
                                    <label className="form-label">Payment Terms Match Status</label>
                                    <div className={`alert ${checkPaymentTerms() === 'Matched' ? 'alert-success' : checkPaymentTerms() === 'Partial' ? 'alert-warning' : checkPaymentTerms() === 'Not Matched' ? 'alert-danger' : 'alert-secondary'}`}>
                                        <i className={`fa-solid ${checkPaymentTerms() === 'Matched' ? 'fa-check-circle' : checkPaymentTerms() === 'Not Matched' ? 'fa-times-circle' : 'fa-exclamation-triangle'} me-2`}></i>
                                        <strong>Payment Terms: {checkPaymentTerms()}</strong>
                                        {checkPaymentTerms() === 'Not Matched' && expectedAdvancePercent > 0 && (
                                            <div className="mt-1">
                                                <small>Advance of {expectedAdvancePercent}% (₹{expectedAdvanceAmount.toLocaleString()}) is required as per PO terms. Please ensure payment is received before generating invoice.</small>
                                            </div>
                                        )}
                                        {checkPaymentTerms() === 'Partial' && (
                                            <div className="mt-1">
                                                <small>Partial payment received. Expected: ₹{expectedAdvanceAmount.toLocaleString()}, Received: ₹{verificationData.advancePaymentAmount.toLocaleString()}</small>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Invoice Section */}
                            <div className="row border p-3 mb-3 border-success">
                                <div className="col-12 mb-2"><h6 className="text-success mb-0">Invoice Generation</h6></div>

                                <div className="col-12 col-lg-6 mb-3">
                                    <label className="form-label">Invoice Number</label>
                                    <input type="text" className="form-control" value={verificationData.invoiceNumber} onChange={(e) => handleChange('invoiceNumber', e.target.value)} placeholder="Enter invoice number (if generating)" />
                                </div>

                                <div className="col-12 col-lg-6 mb-3">
                                    <label className="form-label">Invoice Date</label>
                                    <input type="date" className="form-control" value={verificationData.invoiceDate} onChange={(e) => handleChange('invoiceDate', e.target.value)} />
                                </div>

                                <div className="col-12 col-lg-6 mb-3">
                                    <label className="form-label">Upload Invoice PDF</label>
                                    <input type="file" className="form-control" accept=".pdf" onChange={handleFileChange} />
                                    {verificationData.invoicePdf && (
                                        <small className="text-success"><i className="fa-solid fa-check me-1"></i>PDF selected</small>
                                    )}
                                </div>

                                <div className="col-12 mb-3">
                                    <label className="form-label">Account Remark</label>
                                    <textarea className="form-control" rows="2" value={verificationData.accountRemark} onChange={(e) => handleChange('accountRemark', e.target.value)} placeholder="Enter account-related remarks..." maxLength={1000}></textarea>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="row">
                                <div className="col-12">
                                    <button type="submit" disabled={loading} className="btn btn-success me-2">
                                        {loading ? <><span className="spinner-border spinner-border-sm me-2"></span>Saving...</> : <><i className="fa-solid fa-save me-2"></i>Save Verification</>}
                                    </button>
                                    <button type="button" onClick={handleClose} className="btn btn-secondary">Cancel</button>
                                </div>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default AccountVerifyPopup;