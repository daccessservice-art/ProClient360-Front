import { useState } from "react";
import { convertToInvoice } from "../../../../../hooks/useAccountMaster";
import { formatCurrency } from "../../../../../utils/formatDate";
import toast from "react-hot-toast";
import { RequiredStar } from "../../../RequiredStar/RequiredStar";

const ConvertToInvoicePopup = ({ account, handleClose }) => {
    const [loading, setLoading] = useState(false);
    const [invoiceData, setInvoiceData] = useState({
        invoiceNumber: '',
        invoiceDate: new Date().toISOString().split('T')[0],
        taxAmount: 0,
        invoicePdf: ''
    });

    const handleChange = (field, value) => {
        setInvoiceData(prev => ({ ...prev, [field]: value }));
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
        reader.onloadend = () => {
            handleChange('invoicePdf', reader.result);
        };
        reader.readAsDataURL(file);
    };

    const calculateTotal = () => {
        return (account.basicAmount || 0) + Number(invoiceData.taxAmount || 0);
    };

    const calculatePending = () => {
        return calculateTotal() - (account.accountActions?.receivedAmount || 0);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!invoiceData.invoiceNumber.trim()) {
            return toast.error('Invoice number is required');
        }
        if (!invoiceData.invoiceDate) {
            return toast.error('Invoice date is required');
        }
        if (!invoiceData.invoicePdf) {
            return toast.error('Invoice PDF is required');
        }

        setLoading(true);

        try {
            const data = await convertToInvoice(account._id, invoiceData);

            if (data?.success) {
                toast.success('Invoice created successfully');
                handleClose();
            } else {
                toast.error(data?.error || 'Failed to create invoice');
            }
        } catch (error) {
            toast.error('Failed to create invoice');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal fade show" style={{ display: "flex", alignItems: 'center', backgroundColor: "#00000090" }}>
            <div className="modal-dialog modal-lg">
                <div className="modal-content p-3">
                    <div className="modal-header pt-0">
                        <h5 className="card-title fw-bold">
                            Convert to Invoice — {account.customerName}
                        </h5>
                        <button onClick={handleClose} type="button" className="close px-3" style={{ marginLeft: "auto" }}>
                            <span aria-hidden="true">&times;</span>
                        </button>
                    </div>

                    <div className="modal-body">
                        <form onSubmit={handleSubmit}>

                            {/* Project Summary */}
                            <div className="row border p-3 mb-3 bg-light">
                                <div className="col-12 mb-3">
                                    <h6 className="text-primary mb-0">Project Summary</h6>
                                </div>
                                <div className="col-12 col-lg-6 mb-2">
                                    <small className="text-muted">Customer Name</small>
                                    <p className="fw-bold mb-0">{account.customerName}</p>
                                </div>
                                <div className="col-12 col-lg-6 mb-2">
                                    <small className="text-muted">Project Name</small>
                                    <p className="mb-0">{account.projectName}</p>
                                </div>
                                <div className="col-12 col-lg-6 mb-2">
                                    <small className="text-muted">PO Number</small>
                                    <p className="mb-0">{account.poNumber || 'N/A'}</p>
                                </div>
                                <div className="col-12 col-lg-6 mb-2">
                                    <small className="text-muted">Purchase Order Value (Without GST)</small>
                                    <p className="mb-0 text-primary fw-bold">{formatCurrency(account.basicAmount)}</p>
                                </div>
                            </div>

                            {/* Invoice Details */}
                            <div className="row border p-3 mb-3">
                                <div className="col-12 mb-3">
                                    <h6 className="text-success mb-0">Invoice Details</h6>
                                </div>

                                <div className="col-12 col-lg-6 mb-3">
                                    <label className="form-label">Invoice Number <RequiredStar /></label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        value={invoiceData.invoiceNumber}
                                        onChange={(e) => handleChange('invoiceNumber', e.target.value)}
                                        placeholder="Enter invoice number"
                                        required
                                    />
                                </div>

                                <div className="col-12 col-lg-6 mb-3">
                                    <label className="form-label">Invoice Date <RequiredStar /></label>
                                    <input
                                        type="date"
                                        className="form-control"
                                        value={invoiceData.invoiceDate}
                                        onChange={(e) => handleChange('invoiceDate', e.target.value)}
                                        required
                                    />
                                </div>

                                <div className="col-12 col-lg-6 mb-3">
                                    <label className="form-label">Purchase Order Value (Without GST)</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        value={formatCurrency(account.basicAmount)}
                                        readOnly
                                        style={{ backgroundColor: '#e9ecef' }}
                                    />
                                </div>

                                <div className="col-12 col-lg-6 mb-3">
                                    <label className="form-label">Applicable Tax (%) <RequiredStar /></label>
                                    <input
                                        type="number"
                                        className="form-control"
                                        value={invoiceData.taxAmount}
                                        onChange={(e) => handleChange('taxAmount', Number(e.target.value))}
                                        step="0.01"
                                        min="0"
                                        placeholder="Enter tax amount"
                                        required
                                    />
                                </div>

                                <div className="col-12 col-lg-6 mb-3">
                                    <label className="form-label">Total Invoice Amount (Auto)</label>
                                    <input
                                        type="text"
                                        className="form-control bg-success text-white fw-bold"
                                        value={formatCurrency(calculateTotal())}
                                        readOnly
                                    />
                                </div>

                                <div className="col-12 col-lg-6 mb-3">
                                    <label className="form-label">Already Received</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        value={formatCurrency(account.accountActions?.receivedAmount || 0)}
                                        readOnly
                                        style={{ backgroundColor: '#e9ecef' }}
                                    />
                                </div>

                                <div className="col-12 col-lg-6 mb-3">
                                    <label className="form-label">Pending Amount (Auto)</label>
                                    <input
                                        type="text"
                                        className={`form-control fw-bold ${calculatePending() > 0 ? 'bg-danger text-white' : 'bg-success text-white'}`}
                                        value={formatCurrency(Math.max(0, calculatePending()))}
                                        readOnly
                                    />
                                </div>
                            </div>

                            {/* Invoice PDF Upload */}
                            <div className="row border p-3 mb-3">
                                <div className="col-12 mb-3">
                                    <h6 className="text-warning mb-0">Upload Invoice PDF</h6>
                                </div>
                                <div className="col-12">
                                    <label className="form-label">Attach Invoice PDF <RequiredStar /></label>
                                    <input
                                        type="file"
                                        className="form-control"
                                        accept=".pdf"
                                        onChange={handleFileChange}
                                    />
                                    {invoiceData.invoicePdf && (
                                        <small className="text-success mt-1 d-block">
                                            <i className="fa-solid fa-check-circle me-1"></i>
                                            PDF selected successfully
                                        </small>
                                    )}
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="row">
                                <div className="col-12">
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="btn btn-success me-2"
                                    >
                                        {loading ? (
                                            <>
                                                <span className="spinner-border spinner-border-sm me-2" role="status" />
                                                Creating Invoice...
                                            </>
                                        ) : (
                                            <>
                                                <i className="fa-solid fa-file-invoice me-2"></i>
                                                Create Invoice
                                            </>
                                        )}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleClose}
                                        className="btn btn-secondary"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>

                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ConvertToInvoicePopup;