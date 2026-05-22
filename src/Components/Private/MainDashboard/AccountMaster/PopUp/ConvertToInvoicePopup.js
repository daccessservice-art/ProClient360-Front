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
        invoiceAmount: account.basicAmount || 0,
        taxAmount: 0,
        invoicePdfs: [] // Changed to array
    });

    const handleChange = (field, value) => {
        setInvoiceData(prev => ({ ...prev, [field]: value }));
    };

    const handleFileChange = (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        const validFiles = files.filter(file => {
            if (file.type !== 'application/pdf') {
                toast.error(`${file.name} is not a PDF. Skipping.`);
                return false;
            }
            if (file.size > 5 * 1024 * 1024) {
                toast.error(`${file.name} is larger than 5MB. Skipping.`);
                return false;
            }
            return true;
        });

        if (validFiles.length === 0) {
            e.target.value = "";
            return;
        }

        let processed = 0;
        const newPdfs = [];

        validFiles.forEach(file => {
            const reader = new FileReader();
            reader.onloadend = () => {
                newPdfs.push({
                    name: file.name,
                    data: reader.result
                });
                processed++;
                if (processed === validFiles.length) {
                    setInvoiceData(prev => ({
                        ...prev,
                        invoicePdfs: [...(prev.invoicePdfs || []), ...newPdfs]
                    }));
                }
            };
            reader.readAsDataURL(file);
        });
    };

    const removeFile = (index) => {
        setInvoiceData(prev => ({
            ...prev,
            invoicePdfs: prev.invoicePdfs.filter((_, i) => i !== index)
        }));
    };

    const calculateInvoiceTotal = () => {
        return Number(invoiceData.invoiceAmount || 0) + Number(invoiceData.taxAmount || 0);
    };

    const calculatePending = () => {
        const previousInvoicedTotal = (account.invoiceHistory || []).reduce(
            (sum, inv) => sum + (inv.totalAmount || 0), 0
        );
        const allInvoicedTotal = previousInvoicedTotal + calculateInvoiceTotal();
        return allInvoicedTotal - (account.accountActions?.receivedAmount || 0);
    };

    const totalPreviousInvoices = (account.invoiceHistory || []).reduce(
        (sum, inv) => sum + (inv.totalAmount || 0), 0
    );

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!invoiceData.invoiceNumber.trim()) {
            return toast.error('Invoice number is required');
        }
        if (!invoiceData.invoiceDate) {
            return toast.error('Invoice date is required');
        }
        if (invoiceData.invoicePdfs.length === 0) {
            return toast.error('Please upload at least one Invoice PDF');
        }

        setLoading(true);

        try {
            // Send only the base64 data array to backend
            const payload = {
                ...invoiceData,
                invoicePdfs: invoiceData.invoicePdfs.map(p => p.data)
            };

            const data = await convertToInvoice(account._id, payload);

            if (data?.success) {
                toast.success(data.message);
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
                            Create Invoice — {account.customerName}
                        </h5>
                        <button onClick={handleClose} type="button" className="close px-3" style={{ marginLeft: "auto" }}>
                            <span aria-hidden="true">&times;</span>
                        </button>
                    </div>

                    <div className="modal-body">
                        <form onSubmit={handleSubmit}>

                            {/* Project Summary */}
                            <div className="row border p-3 mb-3 bg-light">
                                <div className="col-12 mb-3"><h6 className="text-primary mb-0">Project Summary</h6></div>
                                <div className="col-6 mb-2"><small className="text-muted">Customer:</small> <strong>{account.customerName}</strong></div>
                                <div className="col-6 mb-2"><small className="text-muted">Project:</small> <strong>{account.projectName}</strong></div>
                                <div className="col-6 mb-2"><small className="text-muted">PO Number:</small> <strong>{account.poNumber || 'N/A'}</strong></div>
                                <div className="col-6 mb-2"><small className="text-muted">PO Value:</small> <strong className="text-primary">{formatCurrency(account.basicAmount)}</strong></div>
                            </div>

                            {/* Previous Invoices */}
                            {(account.invoiceHistory || []).length > 0 && (
                                <div className="row border p-3 mb-3 border-warning">
                                    <div className="col-12 mb-2">
                                        <h6 className="text-warning mb-0"><i className="fa-solid fa-clock-rotate-left me-2"></i>Previous Invoices ({account.invoiceHistory.length})</h6>
                                    </div>
                                    <div className="col-12">
                                        <div className="table-responsive">
                                            <table className="table table-sm table-bordered">
                                                <thead className="table-warning">
                                                    <tr><th>Invoice #</th><th>Date</th><th>Amount</th><th>Tax</th><th>Total</th><th>PDFs</th></tr>
                                                </thead>
                                                <tbody>
                                                    {account.invoiceHistory.map((inv, idx) => (
                                                        <tr key={idx}>
                                                            <td>{inv.invoiceNumber}</td>
                                                            <td>{new Date(inv.invoiceDate).toLocaleDateString()}</td>
                                                            <td>{formatCurrency(inv.invoiceAmount)}</td>
                                                            <td>{formatCurrency(inv.taxAmount)}</td>
                                                            <td className="fw-bold">{formatCurrency(inv.totalAmount)}</td>
                                                            <td>
                                                                {(inv.invoicePdfs || []).map((pdf, pIdx) => (
                                                                    <a key={pIdx} href={pdf} target="_blank" rel="noreferrer" className="btn btn-sm btn-outline-primary me-1 mb-1">
                                                                        <i className="fa-solid fa-file-pdf"></i> {pIdx + 1}
                                                                    </a>
                                                                ))}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                    <tr className="table-light fw-bold">
                                                        <td colSpan="4" className="text-end">Previous Total:</td>
                                                        <td>{formatCurrency(totalPreviousInvoices)}</td>
                                                        <td></td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Invoice Details */}
                            <div className="row border p-3 mb-3">
                                <div className="col-12 mb-3"><h6 className="text-success mb-0"><i className="fa-solid fa-plus-circle me-2"></i>New Invoice Details</h6></div>
                                <div className="col-12 col-lg-6 mb-3">
                                    <label className="form-label">Invoice Number <RequiredStar /></label>
                                    <input type="text" className="form-control" value={invoiceData.invoiceNumber} onChange={(e) => handleChange('invoiceNumber', e.target.value)} placeholder="Enter invoice number" required />
                                </div>
                                <div className="col-12 col-lg-6 mb-3">
                                    <label className="form-label">Invoice Date <RequiredStar /></label>
                                    <input type="date" className="form-control" value={invoiceData.invoiceDate} onChange={(e) => handleChange('invoiceDate', e.target.value)} required />
                                </div>
                                <div className="col-12 col-lg-6 mb-3">
                                    <label className="form-label">Invoice Amount <RequiredStar /></label>
                                    <input type="number" className="form-control" value={invoiceData.invoiceAmount} onChange={(e) => handleChange('invoiceAmount', Number(e.target.value))} step="0.01" min="0" required />
                                </div>
                                <div className="col-12 col-lg-6 mb-3">
                                    <label className="form-label">Tax Amount <RequiredStar /></label>
                                    <input type="number" className="form-control" value={invoiceData.taxAmount} onChange={(e) => handleChange('taxAmount', Number(e.target.value))} step="0.01" min="0" required />
                                </div>
                                <div className="col-12 col-lg-6 mb-3">
                                    <label className="form-label">This Invoice Total (Auto)</label>
                                    <input type="text" className="form-control bg-success text-white fw-bold" value={formatCurrency(calculateInvoiceTotal())} readOnly />
                                </div>
                                <div className="col-12 col-lg-6 mb-3">
                                    <label className="form-label">Pending After This Invoice (Auto)</label>
                                    <input type="text" className={`form-control fw-bold ${calculatePending() > 0 ? 'bg-danger text-white' : 'bg-success text-white'}`} value={formatCurrency(Math.max(0, calculatePending()))} readOnly />
                                </div>
                            </div>

                            {/* Multiple Invoice PDF Upload */}
                            <div className="row border p-3 mb-3">
                                <div className="col-12 mb-3"><h6 className="text-warning mb-0">Upload Invoice PDFs <RequiredStar /></h6></div>
                                <div className="col-12 mb-3">
                                    <input type="file" className="form-control" accept=".pdf" multiple onChange={handleFileChange} />
                                    <small className="text-muted">You can select multiple PDF files. Max 5MB per file.</small>
                                </div>

                                {/* List of selected files */}
                                {invoiceData.invoicePdfs.length > 0 && (
                                    <div className="col-12">
                                        <label className="form-label">Selected Files ({invoiceData.invoicePdfs.length})</label>
                                        <div className="list-group">
                                            {invoiceData.invoicePdfs.map((pdf, idx) => (
                                                <div key={idx} className="list-group-item d-flex justify-content-between align-items-center py-2">
                                                    <div>
                                                        <i className="fa-solid fa-file-pdf text-danger me-2"></i>
                                                        <span className="small">{pdf.name}</span>
                                                    </div>
                                                    <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => removeFile(idx)}>
                                                        <i className="fa-solid fa-xmark"></i>
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="row">
                                <div className="col-12">
                                    <button type="submit" disabled={loading} className="btn btn-success me-2">
                                        {loading ? <><span className="spinner-border spinner-border-sm me-2"></span>Creating...</> : <><i className="fa-solid fa-file-invoice me-2"></i>Create Invoice</>}
                                    </button>
                                    <button type="button" onClick={handleClose} className="btn btn-secondary">Cancel</button>
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