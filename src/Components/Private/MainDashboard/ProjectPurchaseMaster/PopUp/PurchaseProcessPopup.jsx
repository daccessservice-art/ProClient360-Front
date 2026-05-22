import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import Select from "react-select";
import { updatePurchaseStatus } from "../../../../../hooks/useProjectPurchase";
import { getVendors } from "../../../../../hooks/useVendor";
import { formatDate } from "../../../../../utils/formatDate";
import { RequiredStar } from "../../../RequiredStar/RequiredStar";

const PurchaseProcessPopup = ({ purchase, handleClose }) => {
    const [loading, setLoading] = useState(false);
    const [materials, setMaterials] = useState(
        (purchase.materials || [])
            .filter(m => m.purchaseRequired || m.stockStatus === 'Not Available' || m.stockStatus === 'Partial')
            .map(m => ({
                materialId: m._id,
                productName: m.productName,
                description: m.description,
                quantity: m.quantity,
                unit: m.unit,
                stockStatus: m.stockStatus,
                purchaseStatus: m.purchaseStatus || 'Pending',
                vendorId: m.vendorId?._id || m.vendorId || null,
                purchaseOrderRef: m.purchaseOrderRef || '',
                purchaseDate: m.purchaseDate ? new Date(m.purchaseDate).toISOString().split('T')[0] : '',
                expectedDeliveryDate: m.expectedDeliveryDate ? new Date(m.expectedDeliveryDate).toISOString().split('T')[0] : '',
                actualDeliveryDate: m.actualDeliveryDate ? new Date(m.actualDeliveryDate).toISOString().split('T')[0] : '',
                purchaseRemark: m.purchaseRemark || ''
            }))
    );

    // Vendor dropdown
    const [vendorOptions, setVendorOptions] = useState([]);
    const [vendorPage, setVendorPage] = useState(1);
    const [vendorHasMore, setVendorHasMore] = useState(true);
    const [vendorLoading, setVendorLoading] = useState(false);
    const [vendorSearch, setVendorSearch] = useState("");

    const loadVendors = useCallback(async (page, search) => {
        if (vendorLoading || (!vendorHasMore && page > 1)) return;
        setVendorLoading(true);
        try {
            const data = await getVendors(page, 20, search);
            if (data?.success) {
                const newOpts = (data.vendors || []).map(v => ({ value: v._id, label: v.vendorName }));
                setVendorOptions(prev => page === 1 ? newOpts : [...prev, ...newOpts]);
                setVendorHasMore(newOpts.length === 20);
                setVendorPage(page + 1);
            }
        } catch (error) {
            console.error("Error loading vendors:", error);
        } finally {
            setVendorLoading(false);
        }
    }, [vendorLoading, vendorHasMore]);

    useEffect(() => {
        setVendorPage(1);
        setVendorHasMore(true);
        setVendorOptions([]);
        loadVendors(1, vendorSearch);
    }, [vendorSearch]);

    const handleChange = (index, field, value) => {
        const updated = [...materials];
        updated[index][field] = value;
        setMaterials(updated);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (materials.length === 0) {
            return toast.error("No materials require purchase");
        }

        setLoading(true);
        try {
            const data = await updatePurchaseStatus(purchase._id, materials);
            if (data?.success) {
                toast.success(data.message);
                handleClose();
            } else {
                toast.error(data?.error || 'Failed to update purchase status');
            }
        } catch (error) {
            toast.error('Failed to update purchase status');
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
                                <i className="fa-solid fa-cart-shopping me-2"></i>
                                Purchase Processing
                            </h5>
                            <button onClick={handleClose} type="button" className="close px-3" style={{ marginLeft: "auto" }}>
                                <span aria-hidden="true">&times;</span>
                            </button>
                        </div>
                        <div className="modal-body">

                            {/* Project Info */}
                            <div className="row border p-3 mb-3 bg-light">
                                <div className="col-4"><small className="text-muted">Customer:</small> <strong>{purchase.customerName || 'N/A'}</strong></div>
                                <div className="col-4"><small className="text-muted">Project:</small> <strong>{purchase.projectId?.name || 'N/A'}</strong></div>
                                <div className="col-4"><small className="text-muted">PO:</small> <strong>{purchase.projectId?.purchaseOrderNo || 'N/A'}</strong></div>
                            </div>

                            {materials.length === 0 ? (
                                <div className="alert alert-success text-center">
                                    <i className="fa-solid fa-check-circle me-2"></i>
                                    All materials are available. No purchase required.
                                </div>
                            ) : (
                                <>
                                    <h6 className="text-primary mb-2">Materials Requiring Purchase ({materials.length})</h6>
                                    <div className="table-responsive">
                                        <table className="table table-bordered table-sm">
                                            <thead className="table-dark">
                                                <tr>
                                                    <th>#</th>
                                                    <th>Product</th>
                                                    <th>Required</th>
                                                    <th>Purchase Status <RequiredStar /></th>
                                                    <th>Vendor</th>
                                                    <th>PO Reference</th>
                                                    <th>Order Date</th>
                                                    <th>Expected Delivery</th>
                                                    <th>Actual Delivery</th>
                                                    <th>Remark</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {materials.map((mat, idx) => (
                                                    <tr key={idx} className={
                                                        mat.purchaseStatus === 'Delivered' ? 'table-success' :
                                                        mat.purchaseStatus === 'Ordered' ? 'table-info' : ''
                                                    }>
                                                        <td>{idx + 1}</td>
                                                        <td><strong>{mat.productName}</strong></td>
                                                        <td>{mat.quantity} {mat.unit}</td>
                                                        <td>
                                                            <select className="form-select form-select-sm" value={mat.purchaseStatus} onChange={(e) => handleChange(idx, 'purchaseStatus', e.target.value)} required>
                                                                <option value="Pending">Pending</option>
                                                                <option value="Ordered">Ordered</option>
                                                                <option value="Partially Delivered">Partially Delivered</option>
                                                                <option value="Delivered">Delivered</option>
                                                                <option value="Not Required">Not Required</option>
                                                            </select>
                                                        </td>
                                                        <td style={{ minWidth: '150px' }}>
                                                            <Select
                                                                options={vendorOptions}
                                                                value={vendorOptions.find(v => v.value === mat.vendorId) || null}
                                                                onChange={(opt) => handleChange(idx, 'vendorId', opt?.value || null)}
                                                                onInputChange={val => setVendorSearch(val)}
                                                                onMenuScrollToBottom={() => loadVendors(vendorPage, vendorSearch)}
                                                                isLoading={vendorLoading}
                                                                placeholder="Select vendor..."
                                                                isClearable
                                                                menuPlacement="auto"
                                                                styles={{
                                                                    control: (provided) => ({ ...provided, fontSize: '13px', minHeight: '30px' }),
                                                                    menu: (provided) => ({ ...provided, zIndex: 9999 }),
                                                                }}
                                                            />
                                                        </td>
                                                        <td><input type="text" className="form-control form-control-sm" value={mat.purchaseOrderRef} onChange={(e) => handleChange(idx, 'purchaseOrderRef', e.target.value)} placeholder="PO Ref" /></td>
                                                        <td><input type="date" className="form-control form-control-sm" value={mat.purchaseDate} onChange={(e) => handleChange(idx, 'purchaseDate', e.target.value)} /></td>
                                                        <td><input type="date" className="form-control form-control-sm" value={mat.expectedDeliveryDate} onChange={(e) => handleChange(idx, 'expectedDeliveryDate', e.target.value)} /></td>
                                                        <td><input type="date" className="form-control form-control-sm" value={mat.actualDeliveryDate} onChange={(e) => handleChange(idx, 'actualDeliveryDate', e.target.value)} /></td>
                                                        <td><input type="text" className="form-control form-control-sm" value={mat.purchaseRemark} onChange={(e) => handleChange(idx, 'purchaseRemark', e.target.value)} placeholder="Remark" /></td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    <div className="alert alert-warning">
                                        <i className="fa-solid fa-triangle-exclamation me-2"></i>
                                        <strong>Note:</strong> When all materials are marked as "Delivered", the request will automatically move to "Ready for Invoice" status.
                                    </div>
                                </>
                            )}

                            <div className="row">
                                <div className="col-12">
                                    <button type="submit" disabled={loading || materials.length === 0} className="btn btn-primary me-2">
                                        {loading ? <><span className="spinner-border spinner-border-sm me-2"></span>Updating...</> : <><i className="fa-solid fa-save me-2"></i>Update Purchase Status</>}
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

export default PurchaseProcessPopup;