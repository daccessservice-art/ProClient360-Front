import { useState } from "react";
import { addFollowUp } from "../../../../../hooks/useAccountMaster";
import { formatDate, formatCurrency } from "../../../../../utils/formatDate";
import toast from "react-hot-toast";
import { RequiredStar } from "../../../RequiredStar/RequiredStar";

const FollowUpPopup = ({ account, handleClose }) => {
    const [loading, setLoading] = useState(false);
    const [followUpData, setFollowUpData] = useState({
        followUpDate: new Date().toISOString().split('T')[0],
        nextFollowUpDate: '',
        remark: '',
        contactPerson: ''
    });

    const handleChange = (field, value) => {
        setFollowUpData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!followUpData.nextFollowUpDate) {
            return toast.error('Next follow-up date is required');
        }
        if (!followUpData.remark.trim()) {
            return toast.error('Remark is required');
        }

        setLoading(true);

        try {
            const data = await addFollowUp(account._id, followUpData);

            if (data?.success) {
                toast.success('Follow-up added successfully');
                handleClose();
            } else {
                toast.error(data?.error || 'Failed to add follow-up');
            }
        } catch (error) {
            toast.error('Failed to add follow-up');
        } finally {
            setLoading(false);
        }
    };

    const getInvoiceStatusClass = (status) => {
        switch (status) {
            case 'Paid':    return 'bg-success';
            case 'Partial': return 'bg-warning text-dark';
            case 'Overdue': return 'bg-danger';
            default:        return 'bg-info';
        }
    };

    return (
        <div className="modal fade show" style={{ display: "flex", alignItems: 'center', backgroundColor: "#00000090" }}>
            <div className="modal-dialog modal-lg">
                <div className="modal-content p-3">
                    <div className="modal-header pt-0">
                        <h5 className="card-title fw-bold">
                            Add Follow-up — {account.customerName}
                        </h5>
                        <button onClick={handleClose} type="button" className="close px-3" style={{ marginLeft: "auto" }}>
                            <span aria-hidden="true">&times;</span>
                        </button>
                    </div>

                    <div className="modal-body">
                        <form onSubmit={handleSubmit}>

                            {/* Account Summary */}
                            <div className="row border p-3 mb-3 bg-light">
                                <div className="col-12 col-lg-6 mb-2">
                                    <small className="text-muted">Customer Name</small>
                                    <p className="fw-bold mb-0">{account.customerName}</p>
                                </div>
                                <div className="col-12 col-lg-6 mb-2">
                                    <small className="text-muted">Project Name</small>
                                    <p className="mb-0">{account.projectName}</p>
                                </div>
                                <div className="col-12 col-lg-6 mb-2">
                                    <small className="text-muted">Invoice Status</small>
                                    <p className="mb-0">
                                        <span className={`badge rounded-pill px-2 py-1 ${getInvoiceStatusClass(account.accountActions?.invoiceStatus)}`}>
                                            {account.accountActions?.invoiceStatus || 'N/A'}
                                        </span>
                                    </p>
                                </div>
                                <div className="col-12 col-lg-6 mb-2">
                                    <small className="text-muted">Pending Amount</small>
                                    <p className="mb-0 text-danger fw-bold">
                                        {formatCurrency(account.accountActions?.pendingAmount || 0)}
                                    </p>
                                </div>
                                {account.accountActions?.lastFollowUpDate && (
                                    <div className="col-12 col-lg-6 mb-2">
                                        <small className="text-muted">Last Follow-up</small>
                                        <p className="mb-0">{formatDate(account.accountActions.lastFollowUpDate)}</p>
                                    </div>
                                )}
                                {account.accountActions?.nextFollowUpDate && (
                                    <div className="col-12 col-lg-6 mb-2">
                                        <small className="text-muted">Scheduled Next Follow-up</small>
                                        <p className="mb-0 text-warning fw-bold">
                                            {formatDate(account.accountActions.nextFollowUpDate)}
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Follow-up Details */}
                            <div className="row border p-3 mb-3">
                                <div className="col-12 mb-3">
                                    <h6 className="text-primary mb-0">Follow-up Details</h6>
                                </div>

                                <div className="col-12 col-lg-6 mb-3">
                                    <label className="form-label">Follow-up Date <RequiredStar /></label>
                                    <input
                                        type="date"
                                        className="form-control"
                                        value={followUpData.followUpDate}
                                        onChange={(e) => handleChange('followUpDate', e.target.value)}
                                        required
                                    />
                                </div>

                                <div className="col-12 col-lg-6 mb-3">
                                    <label className="form-label">Next Follow-up Date <RequiredStar /></label>
                                    <input
                                        type="date"
                                        className="form-control"
                                        value={followUpData.nextFollowUpDate}
                                        onChange={(e) => handleChange('nextFollowUpDate', e.target.value)}
                                        min={followUpData.followUpDate}
                                        required
                                    />
                                </div>

                                <div className="col-12 col-lg-6 mb-3">
                                    <label className="form-label">Contact Person</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        value={followUpData.contactPerson}
                                        onChange={(e) => handleChange('contactPerson', e.target.value)}
                                        placeholder="Name of person contacted"
                                        maxLength={100}
                                    />
                                </div>

                                <div className="col-12 mb-3">
                                    <label className="form-label">Remark / Notes <RequiredStar /></label>
                                    <textarea
                                        className="form-control"
                                        rows="4"
                                        value={followUpData.remark}
                                        onChange={(e) => handleChange('remark', e.target.value)}
                                        placeholder="Enter details about the follow-up call / discussion..."
                                        maxLength={1000}
                                        required
                                    />
                                    <small className="text-muted float-end">
                                        {followUpData.remark.length}/1000
                                    </small>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="row">
                                <div className="col-12">
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="btn btn-primary me-2"
                                    >
                                        {loading ? (
                                            <>
                                                <span className="spinner-border spinner-border-sm me-2" role="status" />
                                                Saving...
                                            </>
                                        ) : (
                                            <>
                                                <i className="fa-solid fa-phone me-2"></i>
                                                Save Follow-up
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

export default FollowUpPopup;