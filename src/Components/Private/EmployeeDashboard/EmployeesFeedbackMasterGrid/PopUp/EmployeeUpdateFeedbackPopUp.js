import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { updateFeedback } from "../../../../../hooks/useFeedback";
import { formatDate } from "../../../../../utils/formatDate";

const EmployeeUpdateFeedbackPopUp = ({ handleUpdate, selectedFeedback }) => {
    const [formData, setFormData] = useState({
        rating: 0,
        message: "",
        service: "",
        submitBy: "Employee"
    });
    
    const messages = ["Good", "Very Good", "Excellent", "Outstanding", "Amazing"];
    
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
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleFeedbackUpdate = async (event) => {
        event.preventDefault();
        
        // Validate form
        if (formData.rating === 0) {
            toast.error("Please select a rating");
            return;
        }
        
        if (!formData.message.trim()) {
            toast.error("Please enter a message");
            return;
        }
        
        try {
            console.log("Updating feedback:", formData);
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
        setFormData((prev) => ({
            ...prev,
            rating: newRating,
        }));
    };

    const hasRemarks =
        selectedFeedback &&
        selectedFeedback.remarks &&
        selectedFeedback.remarks.length > 0;

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
                style={{
                    display: "flex",
                    alignItems: "center",
                    backgroundColor: "#00000090",
                }}
            >
                <div className="modal-dialog modal-xl">
                    <div className="modal-content p-3">
                        <div className="modal-header pt-0">
                            <h5 className="card-title fw-bold" id="exampleModalLongTitle">
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
                        
                        {/* Scrollable Modal Body */}
                        <div 
                            className="modal-body" 
                            style={{ 
                                maxHeight: "70vh", 
                                overflowY: "auto",
                                overflowX: "hidden"
                            }}
                        >
                            <form onSubmit={handleFeedbackUpdate}>
                                {/* Service Details Section */}
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
                                            <span className="text-muted">{formatDate(selectedFeedback?.actualCompletionDate) || "-"}</span>
                                        </h6>
                                        <h6 className="mt-3">
                                            <p className="fw-bold mb-1">Allotment Date:</p>
                                            <span className="text-muted">{formatDate(selectedFeedback?.allotmentDate) || "-"}</span>
                                        </h6>
                                        <h6 className="mt-3">
                                            <p className="fw-bold mb-1">Assigned Engineer:</p>
                                            <span className="text-muted">
                                                {selectedFeedback?.allotTo?.map(person => person?.name).join(', ') || "-"}
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
                                            <span className="text-muted">{formatDate(selectedFeedback?.ticket?.date) || "-"}</span>
                                        </h6>
                                        <h6 className="mt-3">
                                            <p className="fw-bold mb-1">Completion Date:</p>
                                            <span className="text-muted">{formatDate(selectedFeedback?.completionDate) || "-"}</span>
                                        </h6>
                                    </div>
                                </div>

                                <hr />

                                {/* Feedback Form Section */}
                                <div className="row mt-4">
                                    <div className="col-12">
                                        <h6 className="fw-bold text-primary mb-3">Provide Your Feedback</h6>
                                    </div>
                                    <div className="col-12">
                                        <div className="mb-3">
                                            <label className="form-label fw-bold">Rating <span className="text-danger">*</span></label>
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

                                {/* Past Actions Section */}
                                {hasRemarks && (
                                    <div className="row mt-4">
                                        <div className="col-12">
                                            <hr />
                                            <h6 className="fw-bold text-primary mb-3">Past Actions</h6>
                                            <div className="table-responsive">
                                                <table className="table table-bordered table-striped">
                                                    <thead className="thead-light">
                                                        <tr>
                                                            <th scope="col" style={{ width: "80px" }}>Sr. No</th>
                                                            <th scope="col">Action</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {selectedFeedback.remarks.map((remark, index) => (
                                                            <tr key={index}>
                                                                <td>{index + 1}</td>
                                                                <td>{remark}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Action Buttons */}
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