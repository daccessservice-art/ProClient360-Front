import { useState } from "react";
import toast from "react-hot-toast";
import { storeCheckMaterials, getProjectPurchase } from "../../../../../hooks/useProjectPurchase";
import { formatDate } from "../../../../../utils/formatDate";
import { RequiredStar } from "../../../RequiredStar/RequiredStar";

const MaterialCheckPopup = ({ purchase, handleClose }) => {
    const [loading, setLoading] = useState(false);
    const [materials, setMaterials] = useState(
        (purchase.materials || []).map(m => ({
            materialId: m._id,
            productName: m.productName,
            description: m.description,
            quantity: m.quantity,
            unit: m.unit,
            stockStatus: m.stockStatus || 'Pending',
            availableQuantity: m.availableQuantity || 0,
            stockRemark: m.stockRemark || ''
        }))
    );

    const handleChange = (index, field, value) => {
        const updated = [...materials];
        updated[index][field] = value;

        // Auto-set available quantity
        if (field === 'stockStatus') {
            if (value === 'Available') {
                updated[index].availableQuantity = updated[index].quantity;
            } else if (value === 'Not Available') {
                updated[index].availableQuantity = 0;
            }
        }

        setMaterials(updated);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validate all materials are checked
        const unchecked = materials.filter(m => m.stockStatus === 'Pending');
        if (unchecked.length > 0) {
            return toast.error(`Please check stock status for all materials. ${unchecked.length} pending.`);
        }

        setLoading(true);
        try {
            const data = await storeCheckMaterials(purchase._id, materials);
            if (data?.success) {
                toast.success(data.message);
                handleClose();
            } else {
                toast.error(data?.error || 'Failed to update stock status');
            }
        } catch (error) {
            toast.error('Failed to update stock status');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal fade show" style={{ display: "flex", alignItems: 'center', backgroundColor: "#00000090" }}>
            <div className="modal-dialog modal-xl">
                <div className="modal-content p-3">
                    <form onSubmit={handleSubmit}>
                        <div className="modal-header pt-0">
                            <h5 className="card-title fw-bold">
                                <i className="fa-solid fa-warehouse me-2"></i>
                                Store Check - Material Availability
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
                                <div className="col-4 mb-1"><small className="text-muted">PO Value:</small> <strong>₹{(purchase.projectId?.purchaseOrderValue || 0).toLocaleString()}</strong></div>
                                <div className="col-8 mb-1">
                                    <small className="text-muted">Payment Terms:</small>
                                    <span className="ms-2">Advance: <strong>{purchase.paymentTerms?.advancePay || 0}%</strong></span>
                                    <span className="ms-2">Delivery: <strong>{purchase.paymentTerms?.payAgainstDelivery || 0}%</strong></span>
                                    <span className="ms-2">Completion: <strong>{purchase.paymentTerms?.payAfterCompletion || 0}%</strong></span>
                                    <span className="ms-2">Retention: <strong>{purchase.paymentTerms?.retention || 0}%</strong></span>
                                </div>
                            </div>

                            {/* Materials Table */}
                            <div className="row mb-3">
                                <div className="col-12">
                                    <h6 className="text-primary mb-2">Material Availability Check</h6>
                                    <div className="table-responsive">
                                        <table className="table table-bordered table-sm">
                                            <thead className="table-dark">
                                                <tr>
                                                    <th>#</th>
                                                    <th>Product Name</th>
                                                    <th>Required Qty</th>
                                                    <th>Stock Status <RequiredStar /></th>
                                                    <th>Available Qty</th>
                                                    <th>Remark</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {materials.map((mat, idx) => (
                                                    <tr key={idx} className={
                                                        mat.stockStatus === 'Available' ? 'table-success' :
                                                        mat.stockStatus === 'Not Available' ? 'table-danger' :
                                                        mat.stockStatus === 'Partial' ? 'table-warning' : ''
                                                    }>
                                                        <td>{idx + 1}</td>
                                                        <td>
                                                            <strong>{mat.productName}</strong>
                                                            {mat.description && <><br /><small className="text-muted">{mat.description}</small></>}
                                                        </td>
                                                        <td>{mat.quantity} {mat.unit}</td>
                                                        <td>
                                                            <select className="form-select form-select-sm" value={mat.stockStatus} onChange={(e) => handleChange(idx, 'stockStatus', e.target.value)} required>
                                                                <option value="Pending">-- Select --</option>
                                                                <option value="Available">✅ Available</option>
                                                                <option value="Not Available">❌ Not Available</option>
                                                                <option value="Partial">⚠️ Partial</option>
                                                            </select>
                                                        </td>
                                                        <td>
                                                            <input type="number" className="form-control form-control-sm" value={mat.availableQuantity} onChange={(e) => handleChange(idx, 'availableQuantity', Number(e.target.value))} min="0" />
                                                        </td>
                                                        <td>
                                                            <input type="text" className="form-control form-control-sm" value={mat.stockRemark} onChange={(e) => handleChange(idx, 'stockRemark', e.target.value)} placeholder="Remark" maxLength={500} />
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>

                            {/* Info */}
                            <div className="alert alert-info">
                                <i className="fa-solid fa-info-circle me-2"></i>
                                <strong>Note:</strong> If material is "Available", the request will be forwarded to the Accounts Team for invoice generation.
                                If "Not Available", it will be forwarded to the Purchase Team for procurement.
                            </div>

                            {/* Buttons */}
                            <div className="row">
                                <div className="col-12">
                                    <button type="submit" disabled={loading} className="btn btn-primary me-2">
                                        {loading ? (
                                            <><span className="spinner-border spinner-border-sm me-2"></span>Updating...</>
                                        ) : (
                                            <><i className="fa-solid fa-check me-2"></i>Submit Stock Status</>
                                        )}
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

export default MaterialCheckPopup;