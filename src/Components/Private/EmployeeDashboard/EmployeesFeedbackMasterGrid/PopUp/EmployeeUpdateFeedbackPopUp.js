import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { updateFeedback } from "../../../../../hooks/useFeedback";
import { getAllServiceActions } from "../../../../../hooks/useServiceAction";

const EmployeeUpdateFeedbackPopUp = ({ handleUpdate, selectedFeedback }) => {
    const [formData, setFormData] = useState({
        rating: 0,
        message: "",
        service: "",
        submitBy: "Employee"
    });

    const [serviceActions, setServiceActions] = useState([]);
    const [actionsLoading, setActionsLoading] = useState(false);

    const messages = ["Good", "Very Good", "Excellent", "Outstanding", "Amazing"];

    // Format date as "15 Mar 2026 12:21"
    const formatDateTime = (value) => {
        if (!value) return "-";
        const date = new Date(value);
        if (isNaN(date)) return "-";

        const day = date.getDate();
        const month = date.toLocaleString("en-IN", { month: "short" });
        const year = date.getFullYear();
        const hours = String(date.getHours()).padStart(2, "0");
        const minutes = String(date.getMinutes()).padStart(2, "0");

        return `${day} ${month} ${year} ${hours}:${minutes}`;
    };

    // Fetch service actions for this service
    useEffect(() => {
        const fetchServiceActions = async () => {
            if (!selectedFeedback?._id) return;
            try {
                setActionsLoading(true);
                const data = await getAllServiceActions(selectedFeedback._id);
                if (data && data.success) {
                    setServiceActions(data.serviceActions || []);
                } else {
                    setServiceActions([]);
                }
            } catch (error) {
                console.error("Error fetching service actions:", error);
                setServiceActions([]);
            } finally {
                setActionsLoading(false);
            }
        };
        fetchServiceActions();
    }, [selectedFeedback?._id]);

    // Initialize form with existing feedback data
    useEffect(() => {
        if (selectedFeedback && selectedFeedback.feedback) {
            setFormData({
                rating: selectedFeedback.feedback.rating || 0,
                message: selectedFeedback.feedback.message || "",
                service: selectedFeedback._id,
                submitBy: "Employee"
            });
        } else {
            setFormData({
                rating: 0,
                message: "",
                service: selectedFeedback._id,
                submitBy: "Employee"
            });
        }
    }, [selectedFeedback]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleFeedbackUpdate = async (event) => {
        event.preventDefault();

        if (formData.rating === 0) {
            toast.error("Please select a rating");
            return;
        }
        if (!formData.message.trim()) {
            toast.error("Please enter a message");
            return;
        }

        try {
            toast.loading("Updating Feedback...");
            const result = await updateFeedback(formData);
            if (result && result.success) {
                toast.dismiss();
                toast.success(result.message || "Feedback updated successfully!");
                handleUpdate();
            } else {
                toast.dismiss();
                toast.error(result?.error || "Failed to update feedback");
            }
        } catch (error) {
            toast.dismiss();
            console.error("Error updating feedback:", error);
            toast.error(error.response?.data?.error || "Failed to update feedback");
        }
    };

    const handleRating = (newRating) => {
        setFormData((prev) => ({ ...prev, rating: newRating }));
    };

    const getStatusBadgeColor = (status) => {
        switch (status) {
            case "Completed":  return "bg-success";
            case "Inprogress": return "bg-primary";
            case "Pending":    return "bg-warning text-dark";
            case "Stuck":      return "bg-danger";
            default:           return "bg-secondary";
        }
    };

    const starStyle = (full) => ({
        fontSize: "30px",
        cursor: "pointer",
        color: full ? "#fcc419" : "#ccc",
        transition: "color 0.3s",
    });

    return (
        <>
            <div
                className="modal fade show"
                style={{ display: "flex", alignItems: "center", backgroundColor: "#00000090" }}
            >
                <div className="modal-dialog modal-xl">
                    <div className="modal-content p-3">
                        <div className="modal-header pt-0">
                            <h5 className="card-title fw-bold">
                                {selectedFeedback?.feedback ? "Update Feedback" : "Add Feedback"}
                            </h5>
                            <button
                                onClick={() => handleUpdate()}
                                type="button"
                                className="close px-3"
                                style={{ marginLeft: "auto", border: "none", background: "none" }}
                            >
                                <span aria-hidden="true">&times;</span>
                            </button>
                        </div>

                        <div
                            className="modal-body"
                            style={{ maxHeight: "75vh", overflowY: "auto", overflowX: "hidden" }}
                        >
                            <form onSubmit={handleFeedbackUpdate}>

                                {/* ── Service Details ── */}
                                <div className="row mb-4">
                                    <div className="col-12">
                                        <h6 className="fw-bold text-primary mb-3">Service Details</h6>
                                    </div>
                                    <div className="col-sm-12 col-md-6 col-lg-6">
                                        <h6>
                                            <p className="fw-bold mb-1">Complaint:</p>
                                            <span className="text-muted">{selectedFeedback?.ticket?.details || "-"}</span>
                                        </h6>
                                        <h6 className="mt-3">
                                            <p className="fw-bold mb-1">Client:</p>
                                            <span className="text-muted">{selectedFeedback?.ticket?.client?.custName || "-"}</span>
                                        </h6>
                                        <h6 className="mt-3">
                                            <p className="fw-bold mb-1">Product:</p>
                                            <span className="text-muted">{selectedFeedback?.ticket?.product || "-"}</span>
                                        </h6>
                                        <h6 className="mt-3">
                                            <p className="fw-bold mb-1">Contact Person Name:</p>
                                            <span className="text-muted">{selectedFeedback?.ticket?.contactPerson || "-"}</span>
                                        </h6>
                                        <h6 className="mt-3">
                                            <p className="fw-bold mb-1">Contact Person Email:</p>
                                            <span className="text-muted">{selectedFeedback?.ticket?.contactPersonEmail || "-"}</span>
                                        </h6>
                                        <h6 className="mt-3">
                                            <p className="fw-bold mb-1">Contact Person No:</p>
                                            <span className="text-muted">{selectedFeedback?.ticket?.contactNumber || "-"}</span>
                                        </h6>
                                    </div>
                                    <div className="col-sm-12 col-md-6 col-lg-6">
                                        <h6>
                                            <p className="fw-bold mb-1">Feedback Type:</p>
                                            <span className="text-muted">{selectedFeedback?.serviceType || "-"}</span>
                                        </h6>
                                        <h6 className="mt-3">
                                            <p className="fw-bold mb-1">Actual Completion Date:</p>
                                            <span className="text-muted">{formatDateTime(selectedFeedback?.actualCompletionDate)}</span>
                                        </h6>
                                        <h6 className="mt-3">
                                            <p className="fw-bold mb-1">Allotment Date:</p>
                                            <span className="text-muted">{formatDateTime(selectedFeedback?.allotmentDate)}</span>
                                        </h6>
                                        <h6 className="mt-3">
                                            <p className="fw-bold mb-1">Assigned Engineer:</p>
                                            <span className="text-muted">
                                                {selectedFeedback?.allotTo?.map(p => p?.name).join(', ') || "-"}
                                            </span>
                                        </h6>
                                        <h6 className="mt-3">
                                            <p className="fw-bold mb-1">Status:</p>
                                            <span className="text-muted">{selectedFeedback?.status || "-"}</span>
                                        </h6>
                                        <h6 className="mt-3">
                                            <p className="fw-bold mb-1">Priority:</p>
                                            <span className="text-muted">{selectedFeedback?.priority || "-"}</span>
                                        </h6>
                                        <h6 className="mt-3">
                                            <p className="fw-bold mb-1">Work Mode:</p>
                                            <span className="text-muted">{selectedFeedback?.workMode || "-"}</span>
                                        </h6>
                                        <h6 className="mt-3">
                                            <p className="fw-bold mb-1">Created At:</p>
                                            <span className="text-muted">{formatDateTime(selectedFeedback?.ticket?.date)}</span>
                                        </h6>
                                        <h6 className="mt-3">
                                            <p className="fw-bold mb-1">Completion Date:</p>
                                            <span className="text-muted">{formatDateTime(selectedFeedback?.completionDate)}</span>
                                        </h6>
                                    </div>
                                </div>

                                <hr />

                                {/* ── Engineer Actions ── */}
                                <div className="row mt-4">
                                    <div className="col-12">
                                        <h6 className="fw-bold text-primary mb-3">
                                            <i className="fa-solid fa-list-check me-2"></i>
                                            Engineer Actions
                                        </h6>

                                        {actionsLoading ? (
                                            <div className="text-center py-3">
                                                <div className="spinner-border spinner-border-sm text-primary me-2" role="status"></div>
                                                <span className="text-muted">Loading actions...</span>
                                            </div>
                                        ) : serviceActions.length > 0 ? (
                                            <div
                                                className="table-responsive"
                                                style={{
                                                    maxHeight: "220px",
                                                    overflowY: "auto",
                                                    border: "1px solid #dee2e6",
                                                    borderRadius: "0.375rem"
                                                }}
                                            >
                                                <table className="table table-bordered table-striped mb-0">
                                                    <thead
                                                        className="thead-light sticky-top"
                                                        style={{ backgroundColor: "#f8f9fa" }}
                                                    >
                                                        <tr>
                                                            <th style={{ width: "55px" }}>Sr.</th>
                                                            <th>Action</th>
                                                            <th style={{ width: "140px" }}>Action By</th>
                                                            <th style={{ width: "155px" }}>Start Date</th>
                                                            <th style={{ width: "155px" }}>End Date</th>
                                                            <th style={{ width: "110px" }}>Status</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {serviceActions.map((action, index) => (
                                                            <tr key={action._id}>
                                                                <td>{index + 1}</td>
                                                                <td className="text-wrap" style={{ maxWidth: "22rem" }}>
                                                                    {action?.action || "-"}
                                                                </td>
                                                                <td>{action?.actionBy?.name || "-"}</td>
                                                                <td>{formatDateTime(action?.startTime)}</td>
                                                                <td>{formatDateTime(action?.endTime)}</td>
                                                                <td>
                                                                    <span className={`badge ${getStatusBadgeColor(action?.actionStatus)}`}>
                                                                        {action?.actionStatus || "-"}
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        ) : (
                                            <div className="alert alert-info py-2 mb-0">
                                                <i className="fa-solid fa-info-circle me-2"></i>
                                                No engineer actions found for this service.
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <hr />

                                {/* ── Feedback Form ── */}
                                <div className="row mt-4">
                                    <div className="col-12">
                                        <h6 className="fw-bold text-primary mb-3">Provide Your Feedback</h6>
                                    </div>
                                    <div className="col-12">
                                        <div className="mb-3">
                                            <label className="form-label fw-bold">
                                                Rating <span className="text-danger">*</span>
                                            </label>
                                            <div className="d-flex justify-content-center gap-2 my-3">
                                                {Array.from({ length: 5 }, (_, i) => (
                                                    <span
                                                        key={i}
                                                        style={starStyle(formData.rating >= i + 1)}
                                                        onClick={() => handleRating(i + 1)}
                                                    >
                                                        ★
                                                    </span>
                                                ))}
                                            </div>
                                            <p className="text-center fw-bold" style={{ color: "#fcc419", fontSize: "16px" }}>
                                                {messages[formData.rating - 1] || "Select a rating"}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="col-12">
                                        <div className="mb-3">
                                            <label htmlFor="message" className="form-label fw-bold">
                                                Message <span className="text-danger">*</span>
                                            </label>
                                            <textarea
                                                id="message"
                                                name="message"
                                                className="form-control"
                                                rows="4"
                                                value={formData.message}
                                                onChange={handleInputChange}
                                                placeholder="Please share your feedback..."
                                                required
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* ── Action Buttons ── */}
                                <div className="row mt-4 mb-3">
                                    <div className="col-12 text-center">
                                        <button
                                            type="submit"
                                            className="btn addbtn rounded-0 add_button m-2 px-4"
                                        >
                                            {selectedFeedback?.feedback ? "Update Feedback" : "Submit Feedback"}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleUpdate}
                                            className="btn addbtn rounded-0 Cancel_button m-2 px-4"
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
        </>
    );
};

export default EmployeeUpdateFeedbackPopUp;