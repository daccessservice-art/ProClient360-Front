import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import Select from "react-select";
import { getProjects } from "../../../../../hooks/useProjects";
import { createProjectPurchase } from "../../../../../hooks/useProjectPurchase";
import { RequiredStar } from "../../../RequiredStar/RequiredStar";

const PAGE_SIZE = 15;

const AddProjectPurchasePopup = ({ handleClose }) => {
    const [loading, setLoading] = useState(false);
    const [selectedProject, setSelectedProject] = useState(null);
    const [remark, setRemark] = useState("");

    // Project dropdown
    const [projOptions, setProjOptions] = useState([]);
    const [projPage, setProjPage] = useState(1);
    const [projHasMore, setProjHasMore] = useState(true);
    const [projLoading, setProjLoading] = useState(false);
    const [projSearch, setProjSearch] = useState("");

    // Materials
    const [materials, setMaterials] = useState([
        { productName: "", description: "", quantity: 1, unit: "Nos", estimatedPrice: 0 }
    ]);

    // Load projects
    const loadProjects = useCallback(async (page, search) => {
        if (projLoading || (!projHasMore && page > 1)) return;
        setProjLoading(true);
        try {
            const data = await getProjects(page, PAGE_SIZE, {}, search);
            if (data?.success) {
                const newOpts = (data.projects || []).map(p => ({
                    value: p._id,
                    label: `${p.name} - ${p.purchaseOrderNo || 'No PO'}`,
                    project: p
                }));
                setProjOptions(prev => page === 1 ? newOpts : [...prev, ...newOpts]);
                setProjHasMore(newOpts.length === PAGE_SIZE);
                setProjPage(page + 1);
            }
        } catch (error) {
            toast.error("Failed to load projects");
        } finally {
            setProjLoading(false);
        }
    }, [projLoading, projHasMore]);

    useEffect(() => {
        setProjPage(1);
        setProjHasMore(true);
        setProjOptions([]);
        loadProjects(1, projSearch);
    }, [projSearch]);

    const handleProjectSelect = (option) => {
        setSelectedProject(option);
    };

    // Material handlers
    const addMaterialRow = () => {
        setMaterials([...materials, { productName: "", description: "", quantity: 1, unit: "Nos", estimatedPrice: 0 }]);
    };

    const removeMaterialRow = (index) => {
        if (materials.length === 1) return toast.error("At least one material is required");
        setMaterials(materials.filter((_, i) => i !== index));
    };

    const handleMaterialChange = (index, field, value) => {
        const updated = [...materials];
        updated[index][field] = value;
        setMaterials(updated);
    };

    // Submit
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!selectedProject) {
            return toast.error("Please select a project");
        }

        // Validate materials
        for (let i = 0; i < materials.length; i++) {
            if (!materials[i].productName.trim()) {
                return toast.error(`Product name is required for material #${i + 1}`);
            }
            if (!materials[i].quantity || materials[i].quantity < 1) {
                return toast.error(`Valid quantity is required for material #${i + 1}`);
            }
        }

        setLoading(true);
        const toastId = toast.loading("Creating purchase request...");

        try {
            const data = await createProjectPurchase({
                projectId: selectedProject.value,
                materials,
                remark
            });

            toast.dismiss(toastId);

            if (data?.success) {
                toast.success(data.message);
                handleClose();
            } else {
                toast.error(data?.error || "Failed to create purchase request");
            }
        } catch (error) {
            toast.dismiss(toastId);
            toast.error("Failed to create purchase request");
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
                            <h5 className="card-title fw-bold">Create Project Purchase Request</h5>
                            <button onClick={handleClose} type="button" className="close px-3" style={{ marginLeft: "auto" }}>
                                <span aria-hidden="true">&times;</span>
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="row modal_body_height">

                                {/* Project Selection */}
                                <div className="col-12">
                                    <div className="mb-3">
                                        <label className="form-label label_text">Select Project <RequiredStar /></label>
                                        <Select
                                            options={projOptions}
                                            value={selectedProject}
                                            onChange={handleProjectSelect}
                                            onInputChange={val => setProjSearch(val)}
                                            onMenuScrollToBottom={() => loadProjects(projPage, projSearch)}
                                            isLoading={projLoading}
                                            placeholder="Search and select project..."
                                            noOptionsMessage={() => projLoading ? 'Loading...' : 'No projects found'}
                                            closeMenuOnSelect={true}
                                            isClearable={true}
                                        />
                                    </div>
                                </div>

                                {/* Project Info (read-only) */}
                                {selectedProject?.project && (
                                    <div className="col-12 mb-3">
                                        <div className="border p-3 bg-light rounded">
                                            <h6 className="text-primary mb-2">Project Details (Read-Only)</h6>
                                            <div className="row">
                                                <div className="col-6 mb-1"><small className="text-muted">PO Number:</small> <strong>{selectedProject.project.purchaseOrderNo || 'N/A'}</strong></div>
                                                <div className="col-6 mb-1"><small className="text-muted">PO Value:</small> <strong>₹{(selectedProject.project.purchaseOrderValue || 0).toLocaleString()}</strong></div>
                                                <div className="col-6 mb-1"><small className="text-muted">Category:</small> {selectedProject.project.category || 'N/A'}</div>
                                                <div className="col-6 mb-1"><small className="text-muted">Status:</small> {selectedProject.project.projectStatus || 'N/A'}</div>
                                            </div>
                                            <div className="row mt-2 border-top pt-2">
                                                <div className="col-12 mb-1"><small className="text-muted fw-bold">Payment Terms:</small></div>
                                                <div className="col-3"><small className="text-muted">Advance:</small> <strong>{selectedProject.project.advancePay || 0}%</strong></div>
                                                <div className="col-3"><small className="text-muted">Delivery:</small> <strong>{selectedProject.project.payAgainstDelivery || 0}%</strong></div>
                                                <div className="col-3"><small className="text-muted">Completion:</small> <strong>{selectedProject.project.payAfterCompletion || 0}%</strong></div>
                                                <div className="col-3"><small className="text-muted">Retention:</small> <strong>{selectedProject.project.retention || 0}%</strong></div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Materials Section */}
                                <div className="col-12 mb-3">
                                    <div className="d-flex justify-content-between align-items-center mb-2">
                                        <h6 className="mb-0">Materials <RequiredStar /></h6>
                                        <button type="button" className="btn btn-sm btn-outline-primary" onClick={addMaterialRow}>
                                            <i className="fa-solid fa-plus me-1"></i> Add Material
                                        </button>
                                    </div>
                                    <div className="table-responsive">
                                        <table className="table table-sm table-bordered">
                                            <thead className="table-dark">
                                                <tr>
                                                    <th style={{ width: '5%' }}>#</th>
                                                    <th style={{ width: '25%' }}>Product Name <RequiredStar /></th>
                                                    <th style={{ width: '20%' }}>Description</th>
                                                    <th style={{ width: '10%' }}>Qty <RequiredStar /></th>
                                                    <th style={{ width: '10%' }}>Unit</th>
                                                    <th style={{ width: '15%' }}>Est. Price</th>
                                                    <th style={{ width: '5%' }}>Action</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {materials.map((mat, idx) => (
                                                    <tr key={idx}>
                                                        <td className="text-center">{idx + 1}</td>
                                                        <td>
                                                            <input type="text" className="form-control form-control-sm" value={mat.productName} onChange={(e) => handleMaterialChange(idx, 'productName', e.target.value)} placeholder="Product name" required />
                                                        </td>
                                                        <td>
                                                            <input type="text" className="form-control form-control-sm" value={mat.description} onChange={(e) => handleMaterialChange(idx, 'description', e.target.value)} placeholder="Description" />
                                                        </td>
                                                        <td>
                                                            <input type="number" className="form-control form-control-sm" value={mat.quantity} onChange={(e) => handleMaterialChange(idx, 'quantity', Number(e.target.value))} min="1" required />
                                                        </td>
                                                        <td>
                                                            <select className="form-select form-select-sm" value={mat.unit} onChange={(e) => handleMaterialChange(idx, 'unit', e.target.value)}>
                                                                <option value="Nos">Nos</option>
                                                                <option value="Kg">Kg</option>
                                                                <option value="Mtr">Mtr</option>
                                                                <option value="Set">Set</option>
                                                                <option value="Pair">Pair</option>
                                                                <option value="Box">Box</option>
                                                                <option value="Lot">Lot</option>
                                                            </select>
                                                        </td>
                                                        <td>
                                                            <input type="number" className="form-control form-control-sm" value={mat.estimatedPrice} onChange={(e) => handleMaterialChange(idx, 'estimatedPrice', Number(e.target.value))} min="0" step="0.01" />
                                                        </td>
                                                        <td className="text-center">
                                                            <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => removeMaterialRow(idx)} title="Remove">
                                                                <i className="fa-solid fa-trash"></i>
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* Remark */}
                                <div className="col-12">
                                    <div className="mb-3">
                                        <label className="form-label label_text">Remark</label>
                                        <textarea className="form-control" rows="2" value={remark} onChange={(e) => setRemark(e.target.value)} placeholder="Enter remark..." maxLength={1000}></textarea>
                                    </div>
                                </div>

                                {/* Buttons */}
                                <div className="row">
                                    <div className="col-12 pt-3 mt-2">
                                        <button type="submit" disabled={loading} className="btn addbtn rounded-0 add_button m-2 px-4">
                                            {loading ? "Submitting..." : "Create Request"}
                                        </button>
                                        <button type="button" onClick={handleClose} disabled={loading} className="btn addbtn rounded-0 Cancel_button m-2 px-4">
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default AddProjectPurchasePopup;