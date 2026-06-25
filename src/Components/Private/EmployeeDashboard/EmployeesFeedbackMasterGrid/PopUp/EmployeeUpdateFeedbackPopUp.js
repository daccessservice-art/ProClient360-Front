import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { updateFeedback } from "../../../../../hooks/useFeedback";
import { getAllServiceActions } from "../../../../../hooks/useServiceAction";
import { createCallLog, getCallLogsByService, updateCallLog, deleteCallLog } from "../../../../../hooks/useCallLog";

const CALL_STATUSES = ["Answered", "Not Answered", "Busy", "Wrong Number", "Switched Off", "No Network", "Callback Requested"];
const CUSTOMER_RESPONSES = ["", "Positive", "Neutral", "Negative"];

const EmployeeUpdateFeedbackPopUp = ({ handleUpdate, selectedFeedback }) => {
    const [formData, setFormData] = useState({
        rating: 0,
        message: "",
        service: "",
        submitBy: "Employee"
    });

    const [serviceActions, setServiceActions] = useState([]);
    const [actionsLoading, setActionsLoading] = useState(false);

    // ── Call Log States ──
    const [callLogs, setCallLogs] = useState([]);
    const [callSummary, setCallSummary] = useState({ totalCalls: 0, answeredCalls: 0, notAnsweredCalls: 0 });
    const [callLogsLoading, setCallLogsLoading] = useState(false);
    const [showCallForm, setShowCallForm] = useState(false);
    const [editingCallId, setEditingCallId] = useState(null);
    const [callFormLoading, setCallFormLoading] = useState(false);
    const [callLogRefresh, setCallLogRefresh] = useState(0);
    const [callFormData, setCallFormData] = useState({
        callDateTime: "",
        callStatus: "",
        callDuration: "",
        customerResponse: "",
        notes: ""
    });

    const messages = ["Good", "Very Good", "Excellent", "Outstanding", "Amazing"];

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

    const formatDateTimeLocal = (date) => {
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        const hours = String(d.getHours()).padStart(2, "0");
        const minutes = String(d.getMinutes()).padStart(2, "0");
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    };

    const formatDuration = (seconds) => {
        if (!seconds || seconds === 0) return "-";
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        if (m > 0 && s > 0) return `${m}m ${s}s`;
        if (m > 0) return `${m}m`;
        return `${s}s`;
    };

    const getNowLocal = () => {
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        return now.toISOString().slice(0, 16);
    };

    // ── Fetch service actions ──
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

    // ── Fetch call logs for this service ──
    useEffect(() => {
        const fetchCallLogs = async () => {
            if (!selectedFeedback?._id) return;
            try {
                setCallLogsLoading(true);
                const data = await getCallLogsByService(selectedFeedback._id);
                if (data && data.success) {
                    setCallLogs(data.callLogs || []);
                    setCallSummary(data.summary || { totalCalls: 0, answeredCalls: 0, notAnsweredCalls: 0 });
                } else {
                    setCallLogs([]);
                    setCallSummary({ totalCalls: 0, answeredCalls: 0, notAnsweredCalls: 0 });
                }
            } catch (error) {
                console.error("Error fetching call logs:", error);
                setCallLogs([]);
                setCallSummary({ totalCalls: 0, answeredCalls: 0, notAnsweredCalls: 0 });
            } finally {
                setCallLogsLoading(false);
            }
        };
        fetchCallLogs();
    }, [selectedFeedback?._id, callLogRefresh]);

    // ── Initialize form with existing feedback ──
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
        setShowCallForm(false);
        setEditingCallId(null);
        setCallFormData({ callDateTime: getNowLocal(), callStatus: "", callDuration: "", customerResponse: "", notes: "" });
    }, [selectedFeedback]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleFeedbackUpdate = async (event) => {
        event.preventDefault();
        if (formData.rating === 0) { toast.error("Please select a rating"); return; }
        if (!formData.message.trim()) { toast.error("Please enter a message"); return; }
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

    // ── Call Log Handlers ──
    const handleCallFormChange = (e) => {
        const { name, value } = e.target;
        setCallFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSaveCall = async () => {
        if (!callFormData.callDateTime) { toast.error("Please select call date and time"); return; }
        if (!callFormData.callStatus) { toast.error("Please select call status"); return; }
        if (callFormData.callStatus === "Answered" && !callFormData.callDuration) {
            toast.error("Please enter call duration for answered calls");
            return;
        }

        const payload = {
            service: selectedFeedback._id,
            callDateTime: callFormData.callDateTime,
            callStatus: callFormData.callStatus,
            callDuration: callFormData.callDuration ? Math.round(parseFloat(callFormData.callDuration) * 60) : 0,
            customerResponse: callFormData.callStatus === "Answered" ? (callFormData.customerResponse || "") : "",
            notes: callFormData.notes,
        };

        try {
            setCallFormLoading(true);
            let result;
            if (editingCallId) {
                result = await updateCallLog(editingCallId, payload);
            } else {
                result = await createCallLog(payload);
            }
            if (result && result.success) {
                setShowCallForm(false);
                setEditingCallId(null);
                setCallFormData({ callDateTime: getNowLocal(), callStatus: "", callDuration: "", customerResponse: "", notes: "" });
                setCallLogRefresh((prev) => prev + 1);
            }
        } catch (error) {
            console.error("Error saving call log:", error);
        } finally {
            setCallFormLoading(false);
        }
    };

    const handleEditCall = (callLog) => {
        setEditingCallId(callLog._id);
        setCallFormData({
            callDateTime: formatDateTimeLocal(callLog.callDateTime),
            callStatus: callLog.callStatus,
            callDuration: callLog.callDuration > 0 ? (callLog.callDuration / 60).toString() : "",
            customerResponse: callLog.customerResponse || "",
            notes: callLog.notes || "",
        });
        setShowCallForm(true);
    };

    const handleDeleteCall = async (id) => {
        if (!window.confirm("Are you sure you want to delete this call log?")) return;
        try {
            const result = await deleteCallLog(id);
            if (result && result.success) {
                setCallLogRefresh((prev) => prev + 1);
            }
        } catch (error) {
            console.error("Error deleting call log:", error);
        }
    };

    const handleCancelCallForm = () => {
        setShowCallForm(false);
        setEditingCallId(null);
        setCallFormData({ callDateTime: getNowLocal(), callStatus: "", callDuration: "", customerResponse: "", notes: "" });
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

    const getCallStatusStyle = (status) => {
        switch (status) {
            case "Answered":           return { bg: "#d4edda", color: "#155724", border: "#28a745", icon: "fa-phone-flip" };
            case "Not Answered":       return { bg: "#f8d7da", color: "#721c24", border: "#dc3545", icon: "fa-phone-slash" };
            case "Busy":               return { bg: "#fff3cd", color: "#856404", border: "#ffc107", icon: "fa-phone" };
            case "Wrong Number":       return { bg: "#e2d5f1", color: "#4a235a", border: "#8e44ad", icon: "fa-phone" };
            case "Switched Off":       return { bg: "#e2e3e5", color: "#383d41", border: "#6c757d", icon: "fa-power-off" };
            case "No Network":         return { bg: "#e2e3e5", color: "#383d41", border: "#6c757d", icon: "fa-ban" };
            case "Callback Requested": return { bg: "#d1ecf1", color: "#0c5460", border: "#17a2b8", icon: "fa-phone" };
            default:                   return { bg: "#e2e3e5", color: "#383d41", border: "#6c757d", icon: "fa-phone" };
        }
    };

    const getResponseBadge = (response) => {
        switch (response) {
            case "Positive": return "bg-success";
            case "Neutral":  return "bg-warning text-dark";
            case "Negative": return "bg-danger";
            default:         return "bg-secondary";
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
                            style={{ maxHeight: "80vh", overflowY: "auto", overflowX: "hidden" }}
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

                                {/* ══════════════════════════════════════════════════════════
                                    📞 CALL HISTORY — Track Every Customer Call Attempt
                                ══════════════════════════════════════════════════════════ */}
                                <div className="row mt-4">
                                    <div className="col-12">
                                        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
                                            <h6 className="fw-bold text-primary mb-0">
                                                <i className="fa-solid fa-phone-volume me-2"></i>
                                                Call History
                                            </h6>
                                            <div className="d-flex align-items-center gap-2 flex-wrap">
                                                <span className="badge bg-info" style={{ fontSize: "11px" }}>
                                                    <i className="fa fa-phone me-1"></i>Total: {callSummary.totalCalls}
                                                </span>
                                                <span className="badge bg-success" style={{ fontSize: "11px" }}>
                                                    <i className="fa fa-phone-flip me-1"></i>Answered: {callSummary.answeredCalls}
                                                </span>
                                                <span className="badge bg-danger" style={{ fontSize: "11px" }}>
                                                    <i className="fa fa-phone-slash me-1"></i>Not Answered: {callSummary.notAnsweredCalls}
                                                </span>
                                                <button
                                                    type="button"
                                                    className="btn btn-sm btn-outline-primary"
                                                    onClick={() => {
                                                        if (!showCallForm) {
                                                            setCallFormData({ callDateTime: getNowLocal(), callStatus: "", callDuration: "", customerResponse: "", notes: "" });
                                                            setEditingCallId(null);
                                                        }
                                                        setShowCallForm(!showCallForm);
                                                    }}
                                                >
                                                    <i className={`fa ${showCallForm ? 'fa-times' : 'fa-plus'} me-1`}></i>
                                                    {showCallForm ? "Cancel" : "Add Call"}
                                                </button>
                                            </div>
                                        </div>

                                        {/* ── Add / Edit Call Form ── */}
                                        {showCallForm && (
                                            <div className="card border-primary mb-3" style={{ backgroundColor: "#f0f7ff" }}>
                                                <div className="card-body py-3">
                                                    <h6 className="fw-bold text-primary mb-3" style={{ fontSize: "14px" }}>
                                                        <i className="fa-solid fa-phone-plus me-2"></i>
                                                        {editingCallId ? "Update Call Log" : "Log New Call"}
                                                    </h6>
                                                    <div className="row g-2">
                                                        <div className="col-md-3 col-sm-6">
                                                            <label className="form-label fw-bold" style={{ fontSize: "12px" }}>
                                                                Date & Time <span className="text-danger">*</span>
                                                            </label>
                                                            <input
                                                                type="datetime-local"
                                                                className="form-control form-control-sm"
                                                                name="callDateTime"
                                                                value={callFormData.callDateTime}
                                                                onChange={handleCallFormChange}
                                                            />
                                                        </div>
                                                        <div className="col-md-3 col-sm-6">
                                                            <label className="form-label fw-bold" style={{ fontSize: "12px" }}>
                                                                Call Status <span className="text-danger">*</span>
                                                            </label>
                                                            <select
                                                                className="form-select form-select-sm"
                                                                name="callStatus"
                                                                value={callFormData.callStatus}
                                                                onChange={handleCallFormChange}
                                                            >
                                                                <option value="">-- Select Status --</option>
                                                                {CALL_STATUSES.map((s) => (
                                                                    <option key={s} value={s}>{s}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                        {callFormData.callStatus === "Answered" && (
                                                            <>
                                                                <div className="col-md-2 col-sm-6">
                                                                    <label className="form-label fw-bold" style={{ fontSize: "12px" }}>
                                                                        Duration (min) <span className="text-danger">*</span>
                                                                    </label>
                                                                    <input
                                                                        type="number"
                                                                        className="form-control form-control-sm"
                                                                        name="callDuration"
                                                                        value={callFormData.callDuration}
                                                                        onChange={handleCallFormChange}
                                                                        placeholder="e.g. 5"
                                                                        min="0"
                                                                        step="0.5"
                                                                    />
                                                                </div>
                                                                <div className="col-md-2 col-sm-6">
                                                                    <label className="form-label fw-bold" style={{ fontSize: "12px" }}>
                                                                        Customer Response
                                                                    </label>
                                                                    <select
                                                                        className="form-select form-select-sm"
                                                                        name="customerResponse"
                                                                        value={callFormData.customerResponse}
                                                                        onChange={handleCallFormChange}
                                                                    >
                                                                        <option value="">-- Select --</option>
                                                                        {CUSTOMER_RESPONSES.filter(Boolean).map((r) => (
                                                                            <option key={r} value={r}>{r}</option>
                                                                        ))}
                                                                    </select>
                                                                </div>
                                                            </>
                                                        )}
                                                        <div className={callFormData.callStatus === "Answered" ? "col-md-2 col-sm-12" : "col-md-6 col-sm-12"}>
                                                            <label className="form-label fw-bold" style={{ fontSize: "12px" }}>Notes</label>
                                                            <input
                                                                type="text"
                                                                className="form-control form-control-sm"
                                                                name="notes"
                                                                value={callFormData.notes}
                                                                onChange={handleCallFormChange}
                                                                placeholder="Brief note..."
                                                                maxLength={300}
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="mt-2 d-flex gap-2">
                                                        <button
                                                            type="button"
                                                            className="btn btn-sm btn-primary"
                                                            onClick={handleSaveCall}
                                                            disabled={callFormLoading}
                                                        >
                                                            {callFormLoading ? (
                                                                <><span className="spinner-border spinner-border-sm me-1"></span>Saving...</>
                                                            ) : editingCallId ? (
                                                                <><i className="fa fa-save me-1"></i>Update</>
                                                            ) : (
                                                                <><i className="fa fa-phone me-1"></i>Save Call</>
                                                            )}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="btn btn-sm btn-outline-secondary"
                                                            onClick={handleCancelCallForm}
                                                        >
                                                            Cancel
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* ── Call Logs Table ── */}
                                        {callLogsLoading ? (
                                            <div className="text-center py-3">
                                                <div className="spinner-border spinner-border-sm text-primary me-2" role="status"></div>
                                                <span className="text-muted">Loading call history...</span>
                                            </div>
                                        ) : callLogs.length > 0 ? (
                                            <div
                                                className="table-responsive"
                                                style={{
                                                    maxHeight: "280px",
                                                    overflowY: "auto",
                                                    border: "1px solid #dee2e6",
                                                    borderRadius: "0.375rem"
                                                }}
                                            >
                                                <table className="table table-bordered table-hover mb-0" style={{ fontSize: "13px" }}>
                                                    <thead
                                                        className="sticky-top"
                                                        style={{ backgroundColor: "#e8f0fe", zIndex: 2 }}
                                                    >
                                                        <tr>
                                                            <th style={{ width: "35px" }}>#</th>
                                                            <th style={{ width: "145px" }}>Date & Time</th>
                                                            <th style={{ width: "110px" }}>Called By</th>
                                                            <th style={{ width: "120px" }}>Status</th>
                                                            <th style={{ width: "80px" }}>Duration</th>
                                                            <th style={{ width: "95px" }}>Response</th>
                                                            <th>Notes</th>
                                                            <th style={{ width: "70px" }}></th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {callLogs.map((log, index) => {
                                                            const st = getCallStatusStyle(log.callStatus);
                                                            const isAnswered = log.callStatus === "Answered";
                                                            return (
                                                                <tr key={log._id}>
                                                                    <td className="text-center">{index + 1}</td>
                                                                    <td style={{ whiteSpace: "nowrap" }}>
                                                                        <i className={`fa ${st.icon} me-1`} style={{ fontSize: "10px", color: st.border }}></i>
                                                                        {formatDateTime(log.callDateTime)}
                                                                    </td>
                                                                    <td>{log.calledBy?.name || "-"}</td>
                                                                    <td>
                                                                        <span
                                                                            className="badge"
                                                                            style={{
                                                                                backgroundColor: st.bg,
                                                                                color: st.color,
                                                                                border: `1px solid ${st.border}`,
                                                                                fontSize: "11px",
                                                                                fontWeight: "600"
                                                                            }}
                                                                        >
                                                                            {log.callStatus}
                                                                        </span>
                                                                    </td>
                                                                    <td className="text-center">
                                                                        {isAnswered && log.callDuration > 0 ? (
                                                                            <span className="fw-bold" style={{ color: "#155724", fontSize: "12px" }}>
                                                                                {formatDuration(log.callDuration)}
                                                                            </span>
                                                                        ) : isAnswered ? (
                                                                            <span className="text-muted" style={{ fontSize: "11px" }}>0s</span>
                                                                        ) : (
                                                                            <span className="text-muted" style={{ fontSize: "11px" }}>-</span>
                                                                        )}
                                                                    </td>
                                                                    <td>
                                                                        {log.customerResponse ? (
                                                                            <span className={`badge ${getResponseBadge(log.customerResponse)}`} style={{ fontSize: "11px", fontWeight: "600" }}>
                                                                                {log.customerResponse === "Positive" && "😊 "}
                                                                                {log.customerResponse === "Neutral" && "😐 "}
                                                                                {log.customerResponse === "Negative" && "😞 "}
                                                                                {log.customerResponse}
                                                                            </span>
                                                                        ) : (
                                                                            <span className="text-muted" style={{ fontSize: "11px" }}>-</span>
                                                                        )}
                                                                    </td>
                                                                    <td style={{ maxWidth: "180px" }}>
                                                                        <span style={{ fontSize: "12px" }} title={log.notes || "-"}>
                                                                            {log.notes ? (
                                                                                log.notes.length > 30 ? log.notes.substring(0, 30) + "..." : log.notes
                                                                            ) : "-"}
                                                                        </span>
                                                                    </td>
                                                                    <td className="text-center">
                                                                        <span onClick={() => handleEditCall(log)} style={{ cursor: "pointer", marginRight: "6px" }} title="Edit">
                                                                            <i className="fa fa-edit text-primary" style={{ fontSize: "12px" }}></i>
                                                                        </span>
                                                                        <span onClick={() => handleDeleteCall(log._id)} style={{ cursor: "pointer" }} title="Delete">
                                                                            <i className="fa fa-trash text-danger" style={{ fontSize: "12px" }}></i>
                                                                        </span>
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        ) : (
                                            <div className="alert alert-light border py-3 mb-0 text-center">
                                                <div style={{ fontSize: "1.5rem", marginBottom: "4px" }}>📞</div>
                                                <strong>No call logs yet.</strong> Click <span className="text-primary fw-bold">"Add Call"</span> above to log your first call attempt.
                                            </div>
                                        )}
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
                                            <div className="table-responsive" style={{ maxHeight: "220px", overflowY: "auto", border: "1px solid #dee2e6", borderRadius: "0.375rem" }}>
                                                <table className="table table-bordered table-striped mb-0">
                                                    <thead className="thead-light sticky-top" style={{ backgroundColor: "#f8f9fa" }}>
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
                                                                <td className="text-wrap" style={{ maxWidth: "22rem" }}>{action?.action || "-"}</td>
                                                                <td>{action?.actionBy?.name || "-"}</td>
                                                                <td>{formatDateTime(action?.startTime)}</td>
                                                                <td>{formatDateTime(action?.endTime)}</td>
                                                                <td>
                                                                    <span className={`badge ${getStatusBadgeColor(action?.actionStatus)}`}>{action?.actionStatus || "-"}</span>
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
                                            <label className="form-label fw-bold">Rating <span className="text-danger">*</span></label>
                                            <div className="d-flex justify-content-center gap-2 my-3">
                                                {Array.from({ length: 5 }, (_, i) => (
                                                    <span key={i} style={starStyle(formData.rating >= i + 1)} onClick={() => handleRating(i + 1)}>★</span>
                                                ))}
                                            </div>
                                            <p className="text-center fw-bold" style={{ color: "#fcc419", fontSize: "16px" }}>
                                                {messages[formData.rating - 1] || "Select a rating"}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="col-12">
                                        <div className="mb-3">
                                            <label htmlFor="message" className="form-label fw-bold">Message <span className="text-danger">*</span></label>
                                            <textarea id="message" name="message" className="form-control" rows="4" value={formData.message} onChange={handleInputChange} placeholder="Please share your feedback..." required />
                                        </div>
                                    </div>
                                </div>

                                {/* ── Action Buttons ── */}
                                <div className="row mt-4 mb-3">
                                    <div className="col-12 text-center">
                                        <button type="submit" className="btn addbtn rounded-0 add_button m-2 px-4">
                                            {selectedFeedback?.feedback ? "Update Feedback" : "Submit Feedback"}
                                        </button>
                                        <button type="button" onClick={handleUpdate} className="btn addbtn rounded-0 Cancel_button m-2 px-4">Cancel</button>
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