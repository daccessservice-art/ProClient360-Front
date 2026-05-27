import { useState, useEffect } from "react";
import { getAccountByProject, addFollowUp, updateAccountActions } from "../../../../../hooks/useAccountMaster";
import { formatDate, formatCurrency } from "../../../../../utils/formatDate";
import toast from "react-hot-toast";
import { RequiredStar } from "../../../RequiredStar/RequiredStar";

const AccountFollowUpActionPopup = ({ account, handleClose }) => {
    const [fetching, setFetching]     = useState(true);
    const [accountData, setAccountData] = useState(account);
    const [activeTab, setActiveTab]   = useState('followup');

    const [followUpLoading, setFollowUpLoading] = useState(false);
    const [followUpData, setFollowUpData] = useState({
        followUpDate:     new Date().toISOString().split('T')[0],
        nextFollowUpDate: '',
        remark:           '',
        contacts:         []
    });

    const [contactForm, setContactForm] = useState({
        contactPerson: '',
        contactEmail:  '',
        contactPhone:  ''
    });

    // ─── Payment Edit State ────────────────────────────────────────
    const [paymentEditMode, setPaymentEditMode] = useState(false);
    const [paymentLoading, setPaymentLoading]   = useState(false);
    const [paymentForm, setPaymentForm] = useState({
        receivedAmount:         0,
        advancePaymentReceived: 0,
        taxAmount:              0,
        customerPaymentRemark:  '',
        nextFollowUpDate:       '',
    });

    const projectId = account.projectId?._id || account.projectId;

    useEffect(() => {
        const fetchLatest = async () => {
            if (!projectId) { setFetching(false); return; }
            try {
                setFetching(true);
                const data = await getAccountByProject(projectId);
                if (data?.success) {
                    setAccountData(data.account);
                    seedPaymentForm(data.account);
                }
            } catch (err) {
                console.error("Error fetching account:", err);
            } finally {
                setFetching(false);
            }
        };
        fetchLatest();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [projectId]);

    const seedPaymentForm = (acc) => {
        const a = acc.accountActions || {};
        setPaymentForm({
            receivedAmount:         a.receivedAmount         || 0,
            advancePaymentReceived: a.advancePaymentReceived || 0,
            taxAmount:              a.taxAmount              || 0,
            customerPaymentRemark:  a.customerPaymentRemark  || '',
            nextFollowUpDate: a.nextFollowUpDate
                ? new Date(a.nextFollowUpDate).toISOString().split('T')[0]
                : '',
        });
    };

    // ─── Derived totals ────────────────────────────────────────────
    const totalInvoiced = (accountData.invoiceHistory || []).reduce(
        (sum, inv) => sum + (inv.totalAmount || 0), 0
    );

    // Mirror the backend's computeTotalInvoiceAmount helper:
    // real invoices → use their sum; no invoices → PO + tax
    const effectiveTotalInvoice = (taxOverride) => {
        if (totalInvoiced > 0) return totalInvoiced;
        return (accountData.basicAmount || 0) + (Number(taxOverride) || 0);
    };

    // Live preview values while editing
    const previewTotal   = effectiveTotalInvoice(paymentForm.taxAmount);
    const previewPending = Math.max(0, previewTotal - (Number(paymentForm.receivedAmount) || 0));

    // ─── PAYMENT MILESTONE TRACKER ─────────────────────────────────
    const getPaymentMilestones = (receivedOverride) => {
        const poValue      = accountData.basicAmount || 0;
        const totalReceived = receivedOverride !== undefined
            ? receivedOverride
            : (accountData.accountActions?.receivedAmount || 0);
        const terms = accountData.paymentTerms || {};

        const milestones = [
            { label: 'Advance Payment', percent: terms.advancePay          || 0, icon: 'fa-hand-holding-dollar' },
            { label: 'On Delivery',     percent: terms.payAgainstDelivery  || 0, icon: 'fa-truck'               },
            { label: 'On Completion',   percent: terms.payAfterCompletion  || 0, icon: 'fa-circle-check'        },
            { label: 'Retention Money', percent: terms.retention           || 0, icon: 'fa-lock'                }
        ];

        let remaining = totalReceived;

        return milestones.map(m => {
            const expected = (poValue * m.percent) / 100;
            let received   = 0;
            let status     = 'Pending';
            let statusCls  = 'bg-secondary';
            let textCls    = 'text-muted';

            if (remaining >= expected && expected > 0) {
                received  = expected;
                remaining -= expected;
                status    = 'Received';
                statusCls = 'bg-success';
                textCls   = 'text-success';
            } else if (remaining > 0 && expected > 0) {
                received  = remaining;
                remaining = 0;
                status    = 'Partial';
                statusCls = 'bg-warning text-dark';
                textCls   = 'text-warning';
            }

            return {
                ...m,
                expectedAmount: expected,
                receivedAmount: received,
                balance:        expected - received,
                status, statusCls, textCls
            };
        });
    };

    // While editing, preview with live receivedAmount
    const paymentMilestones = getPaymentMilestones(
        paymentEditMode ? Number(paymentForm.receivedAmount) : undefined
    );

    // ─── Invoice Status Badge ──────────────────────────────────────
    const getInvoiceStatusBadge = (status) => {
        switch (status) {
            case 'Paid':    return 'bg-success';
            case 'Partial': return 'bg-warning text-dark';
            case 'Overdue': return 'bg-danger';
            default:        return 'bg-info';
        }
    };

    // Preview invoice status (mirrors backend computeInvoiceStatus)
    const previewInvoiceStatus = () => {
        if (previewTotal <= 0) return 'Pending';
        const rec = Number(paymentForm.receivedAmount) || 0;
        if (previewTotal - rec <= 0) return 'Paid';
        if (rec > 0)                 return 'Partial';
        return 'Pending';
    };

    // ─── Payment Save ──────────────────────────────────────────────
    const handlePaymentSave = async () => {
        const rec = Number(paymentForm.receivedAmount);
        if (isNaN(rec) || rec < 0) {
            return toast.error('Enter a valid received amount');
        }
        setPaymentLoading(true);
        try {
            const payload = {
                advancePaymentReceived: Number(paymentForm.advancePaymentReceived) || 0,
                receivedAmount:         rec,
                taxAmount:              Number(paymentForm.taxAmount)              || 0,
                customerPaymentRemark:  paymentForm.customerPaymentRemark          || '',
                nextFollowUpDate: paymentForm.nextFollowUpDate
                    ? new Date(paymentForm.nextFollowUpDate)
                    : null,
            };
            const data = await updateAccountActions(accountData._id, payload);
            if (data?.success) {
                toast.success('Payment updated successfully');
                setAccountData(data.account);
                seedPaymentForm(data.account);
                setPaymentEditMode(false);
            } else {
                toast.error(data?.error || 'Failed to update payment');
            }
        } catch {
            toast.error('Failed to update payment');
        } finally {
            setPaymentLoading(false);
        }
    };

    // ─── Contact Handlers ──────────────────────────────────────────
    const handleContactChange = (field, value) => {
        setContactForm(prev => ({ ...prev, [field]: value }));
    };

    const handleAddContact = () => {
        if (!contactForm.contactPerson.trim() && !contactForm.contactEmail.trim() && !contactForm.contactPhone.trim()) {
            return toast.error('Please fill at least Name, Email, or Phone');
        }
        setFollowUpData(prev => ({
            ...prev,
            contacts: [...prev.contacts, { ...contactForm, _tempId: Date.now() }]
        }));
        setContactForm({ contactPerson: '', contactEmail: '', contactPhone: '' });
        toast.success('Contact added to list');
    };

    const handleRemoveContact = (tempId) => {
        setFollowUpData(prev => ({
            ...prev,
            contacts: prev.contacts.filter(c => c._tempId !== tempId)
        }));
    };

    // ─── Follow-Up Submit ──────────────────────────────────────────
    const handleFollowUpSubmit = async (e) => {
        e.preventDefault();
        if (!followUpData.nextFollowUpDate) return toast.error('Next follow-up date is required');
        if (!followUpData.remark.trim())    return toast.error('Remark is required');
        if (followUpData.contacts.length === 0) return toast.error('Please add at least one contact person');

        setFollowUpLoading(true);
        try {
            const payloadToSend = {
                ...followUpData,
                contacts: followUpData.contacts.map(({ _tempId, ...rest }) => rest)
            };
            const data = await addFollowUp(accountData._id, payloadToSend);
            if (data?.success) {
                toast.success('Follow-up added successfully');
                handleClose();
            } else {
                toast.error(data?.error || 'Failed to add follow-up');
            }
        } catch {
            toast.error('Failed to add follow-up');
        } finally {
            setFollowUpLoading(false);
        }
    };

    const TABS = [
        { key: 'followup', label: <><i className="fa-solid fa-phone me-1"></i><span className="d-none d-md-inline">Add Follow-Up</span></> },
        { key: 'invoices', label: <><i className="fa-solid fa-file-invoice me-1"></i><span className="d-none d-md-inline">Invoices</span> ({(accountData.invoiceHistory || []).length})</> },
        { key: 'history',  label: <><i className="fa-solid fa-clock-rotate-left me-1"></i><span className="d-none d-md-inline">History</span></> },
    ];

    return (
        <div className="modal fade show" style={{ display: "flex", alignItems: 'center', backgroundColor: "#00000090" }}>
            <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
                <div className="modal-content p-3">

                    {/* ── Header ── */}
                    <div className="modal-header pt-0 pb-2">
                        <div className="w-100">
                            <h5 className="card-title fw-bold mb-1">
                                <i className="fa-solid fa-phone-volume me-2 text-primary"></i>
                                {accountData.customerName}
                            </h5>
                            <small className="text-muted">
                                {accountData.projectName} | PO: {accountData.poNumber || 'N/A'}
                            </small>
                        </div>
                        <button onClick={handleClose} type="button" className="close px-3" style={{ marginLeft: "auto" }}>
                            <span aria-hidden="true">&times;</span>
                        </button>
                    </div>

                    <div className="modal-body py-0" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
                        {fetching ? (
                            <div className="text-center py-5">
                                <div className="spinner-border text-primary"></div>
                                <p className="text-muted mt-2">Loading account details...</p>
                            </div>
                        ) : (
                            <div className="pt-3">

                                {/* ── Summary Banner ── */}
                                <div className="row g-2 mb-3">
                                    {[
                                        { label: 'PO Value',    value: formatCurrency(accountData.basicAmount),                         cls: 'text-primary' },
                                        { label: 'Invoiced',    value: totalInvoiced > 0 ? formatCurrency(totalInvoiced) : '—',         cls: 'text-info'    },
                                        { label: 'Received',    value: formatCurrency(accountData.accountActions?.receivedAmount || 0), cls: 'text-success' },
                                        { label: 'Outstanding', value: formatCurrency(accountData.accountActions?.pendingAmount  || 0), cls: 'text-danger'  },
                                        { label: 'Status',      value: (
                                            <span className={`badge ${getInvoiceStatusBadge(accountData.accountActions?.invoiceStatus)} mt-1`}>
                                                {accountData.accountActions?.invoiceStatus || 'N/A'}
                                            </span>
                                        ), cls: '' },
                                        { label: 'Next Follow-Up', value: (
                                            <strong className={`d-block mt-1 ${
                                                accountData.accountActions?.nextFollowUpDate
                                                    ? (new Date(accountData.accountActions.nextFollowUpDate) < new Date() ? 'text-danger' : 'text-warning')
                                                    : 'text-muted'
                                            }`} style={{ fontSize: '13px' }}>
                                                {accountData.accountActions?.nextFollowUpDate
                                                    ? formatDate(accountData.accountActions.nextFollowUpDate)
                                                    : 'Not Set'}
                                            </strong>
                                        ), cls: '' },
                                    ].map((card, i) => (
                                        <div key={i} className="col-6 col-md-4 col-xl-2">
                                            <div className="card bg-light border-0 p-2 h-100">
                                                <small className="text-muted d-block" style={{ fontSize: '11px' }}>{card.label}</small>
                                                {typeof card.value === 'string'
                                                    ? <strong className={`d-block fs-6 ${card.cls}`}>{card.value}</strong>
                                                    : card.value
                                                }
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* ── PAYMENT MILESTONES CARD ── */}
                                <div className="row mb-3">
                                    <div className="col-12">
                                        <div className="card border-dark shadow-sm">

                                            {/* Card Header */}
                                            <div className="card-header bg-dark text-white py-2 d-flex justify-content-between align-items-center flex-wrap gap-2">
                                                <h6 className="mb-0" style={{ fontSize: '14px' }}>
                                                    <i className="fa-solid fa-chart-pie me-2"></i>Payment Milestones
                                                </h6>
                                                <div className="d-flex align-items-center gap-2">
                                                    <span className="badge bg-light text-dark">
                                                        PO: {formatCurrency(accountData.basicAmount)}
                                                    </span>
                                                    {!paymentEditMode ? (
                                                        <button
                                                            className="btn btn-sm btn-warning text-dark"
                                                            onClick={() => setPaymentEditMode(true)}
                                                            style={{ fontSize: '12px' }}
                                                        >
                                                            <i className="fa-solid fa-pen me-1"></i>Update Payment
                                                        </button>
                                                    ) : (
                                                        <button
                                                            className="btn btn-sm btn-secondary"
                                                            onClick={() => { setPaymentEditMode(false); seedPaymentForm(accountData); }}
                                                            style={{ fontSize: '12px' }}
                                                        >
                                                            <i className="fa-solid fa-xmark me-1"></i>Cancel
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="card-body p-2">

                                                {/* ── PAYMENT EDIT FORM ── */}
                                                {paymentEditMode && (
                                                    <div className="border border-warning rounded p-3 mb-3 bg-light">
                                                        <h6 className="text-warning mb-3" style={{ fontSize: '13px' }}>
                                                            <i className="fa-solid fa-indian-rupee-sign me-2"></i>Update Payment Received
                                                        </h6>

                                                        <div className="row g-2">

                                                            {/* PO Value — read only */}
                                                            <div className="col-12 col-md-4">
                                                                <label className="form-label form-label-sm">PO Value (Without GST)</label>
                                                                <input
                                                                    type="text"
                                                                    className="form-control form-control-sm"
                                                                    value={formatCurrency(accountData.basicAmount)}
                                                                    readOnly
                                                                    style={{ backgroundColor: '#e9ecef' }}
                                                                />
                                                            </div>

                                                            {/* Tax Amount — only editable when no real invoices exist */}
                                                            <div className="col-12 col-md-4">
                                                                <label className="form-label form-label-sm">
                                                                    Tax Amount (₹)
                                                                    {totalInvoiced > 0 && (
                                                                        <span className="text-muted ms-1" style={{ fontSize: '10px' }}>
                                                                            (set by invoice)
                                                                        </span>
                                                                    )}
                                                                </label>
                                                                <input
                                                                    type="number"
                                                                    className="form-control form-control-sm"
                                                                    value={paymentForm.taxAmount}
                                                                    onChange={e => setPaymentForm(p => ({ ...p, taxAmount: e.target.value }))}
                                                                    min="0"
                                                                    step="0.01"
                                                                    // Tax is locked when real invoices exist — backend uses invoice totals
                                                                    readOnly={totalInvoiced > 0}
                                                                    style={totalInvoiced > 0 ? { backgroundColor: '#e9ecef' } : {}}
                                                                />
                                                            </div>

                                                            {/* Total Invoice Amount — auto */}
                                                            <div className="col-12 col-md-4">
                                                                <label className="form-label form-label-sm">
                                                                    {totalInvoiced > 0 ? 'Total Invoiced (from invoices)' : 'Total Invoice Amount (Auto)'}
                                                                </label>
                                                                <input
                                                                    type="text"
                                                                    className="form-control form-control-sm fw-bold"
                                                                    style={{ backgroundColor: '#0dcaf0', color: '#fff' }}
                                                                    value={formatCurrency(previewTotal)}
                                                                    readOnly
                                                                />
                                                            </div>

                                                            {/* Advance Received */}
                                                            <div className="col-12 col-md-4">
                                                                <label className="form-label form-label-sm">Advance Received (₹)</label>
                                                                <input
                                                                    type="number"
                                                                    className="form-control form-control-sm"
                                                                    value={paymentForm.advancePaymentReceived}
                                                                    onChange={e => setPaymentForm(p => ({ ...p, advancePaymentReceived: e.target.value }))}
                                                                    min="0"
                                                                    step="0.01"
                                                                />
                                                            </div>

                                                            {/* Total Received */}
                                                            <div className="col-12 col-md-4">
                                                                <label className="form-label form-label-sm">
                                                                    Total Received (₹) <RequiredStar />
                                                                </label>
                                                                <input
                                                                    type="number"
                                                                    className="form-control form-control-sm border-success"
                                                                    value={paymentForm.receivedAmount}
                                                                    onChange={e => setPaymentForm(p => ({ ...p, receivedAmount: e.target.value }))}
                                                                    min="0"
                                                                    step="0.01"
                                                                />
                                                                <small className="text-muted" style={{ fontSize: '10px' }}>
                                                                    Milestone table updates live ↓
                                                                </small>
                                                            </div>

                                                            {/* Outstanding — auto */}
                                                            <div className="col-12 col-md-4">
                                                                <label className="form-label form-label-sm">Outstanding (Auto)</label>
                                                                <input
                                                                    type="text"
                                                                    className={`form-control form-control-sm fw-bold ${previewPending > 0 ? 'bg-danger text-white' : 'bg-success text-white'}`}
                                                                    value={formatCurrency(previewPending)}
                                                                    readOnly
                                                                />
                                                            </div>

                                                            {/* Invoice Status — auto preview */}
                                                            <div className="col-12 col-md-4">
                                                                <label className="form-label form-label-sm">Invoice Status (Auto)</label>
                                                                <div className="mt-1">
                                                                    <span className={`badge px-3 py-2 ${getInvoiceStatusBadge(previewInvoiceStatus())}`}>
                                                                        {previewInvoiceStatus()}
                                                                    </span>
                                                                </div>
                                                            </div>

                                                            {/* Next Follow-Up */}
                                                            <div className="col-12 col-md-4">
                                                                <label className="form-label form-label-sm">Next Follow-Up Date</label>
                                                                <input
                                                                    type="date"
                                                                    className="form-control form-control-sm"
                                                                    value={paymentForm.nextFollowUpDate}
                                                                    onChange={e => setPaymentForm(p => ({ ...p, nextFollowUpDate: e.target.value }))}
                                                                />
                                                            </div>

                                                            {/* Payment Remark */}
                                                            <div className="col-12 col-md-4">
                                                                <label className="form-label form-label-sm">Payment Remark</label>
                                                                <textarea
                                                                    className="form-control form-control-sm"
                                                                    rows="2"
                                                                    value={paymentForm.customerPaymentRemark}
                                                                    onChange={e => setPaymentForm(p => ({ ...p, customerPaymentRemark: e.target.value }))}
                                                                    maxLength={1000}
                                                                    placeholder="Payment notes..."
                                                                />
                                                            </div>

                                                            {/* Save / Cancel */}
                                                            <div className="col-12 pt-1 d-flex gap-2">
                                                                <button
                                                                    type="button"
                                                                    className="btn btn-success btn-sm"
                                                                    onClick={handlePaymentSave}
                                                                    disabled={paymentLoading}
                                                                >
                                                                    {paymentLoading
                                                                        ? <><span className="spinner-border spinner-border-sm me-1"></span>Saving...</>
                                                                        : <><i className="fa-solid fa-floppy-disk me-1"></i>Save Payment</>
                                                                    }
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    className="btn btn-outline-secondary btn-sm"
                                                                    onClick={() => { setPaymentEditMode(false); seedPaymentForm(accountData); }}
                                                                >
                                                                    Cancel
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* ── MILESTONE TABLE ── */}
                                                <div className="table-responsive">
                                                    <table className="table table-sm table-bordered mb-0" style={{ fontSize: '13px' }}>
                                                        <thead className="table-light">
                                                            <tr>
                                                                <th className="text-center" style={{ width: '40px' }}>#</th>
                                                                <th>Stage</th>
                                                                <th className="text-center text-nowrap">% PO</th>
                                                                <th className="text-end text-nowrap">Expected</th>
                                                                <th className="text-end text-nowrap">Received</th>
                                                                <th className="text-end text-nowrap">Balance</th>
                                                                <th className="text-center" style={{ width: '120px' }}>Status</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {paymentMilestones.map((m, idx) => (
                                                                <tr
                                                                    key={idx}
                                                                    className={
                                                                        m.status === 'Received' ? 'table-success' :
                                                                        m.status === 'Partial'  ? 'table-warning' : ''
                                                                    }
                                                                >
                                                                    <td className="text-center fw-bold">{idx + 1}</td>
                                                                    <td>
                                                                        <i className={`fa-solid ${m.icon} me-1 ${m.textCls}`}></i>
                                                                        <span className="d-none d-md-inline">{m.label}</span>
                                                                        <span className="d-inline d-md-none">{m.label.split(' ')[0]}</span>
                                                                    </td>
                                                                    <td className="text-center">
                                                                        <span className="badge bg-dark">{m.percent}%</span>
                                                                    </td>
                                                                    <td className="text-end fw-bold text-nowrap">{formatCurrency(m.expectedAmount)}</td>
                                                                    <td className="text-end fw-bold text-success text-nowrap">
                                                                        {m.receivedAmount > 0 ? formatCurrency(m.receivedAmount) : '—'}
                                                                    </td>
                                                                    <td className="text-end fw-bold text-danger text-nowrap">
                                                                        {m.balance > 0 ? formatCurrency(m.balance) : '—'}
                                                                    </td>
                                                                    <td className="text-center">
                                                                        <span className={`badge ${m.statusCls} w-100`} style={{ fontSize: '10px' }}>
                                                                            {m.status === 'Partial'
                                                                                ? `₹${m.receivedAmount.toLocaleString('en-IN')}`
                                                                                : m.status}
                                                                        </span>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                        <tfoot className="table-dark">
                                                            <tr>
                                                                <td colSpan="2" className="fw-bold">Total</td>
                                                                <td className="text-center fw-bold">100%</td>
                                                                <td className="text-end fw-bold text-nowrap">
                                                                    {formatCurrency(accountData.basicAmount)}
                                                                </td>
                                                                <td className="text-end fw-bold text-success text-nowrap">
                                                                    {formatCurrency(
                                                                        paymentEditMode
                                                                            ? Number(paymentForm.receivedAmount) || 0
                                                                            : accountData.accountActions?.receivedAmount || 0
                                                                    )}
                                                                </td>
                                                                <td className="text-end fw-bold text-danger text-nowrap">
                                                                    {formatCurrency(
                                                                        paymentEditMode
                                                                            ? previewPending
                                                                            : accountData.accountActions?.pendingAmount || 0
                                                                    )}
                                                                </td>
                                                                <td className="text-center">
                                                                    <span className={`badge ${getInvoiceStatusBadge(
                                                                        paymentEditMode
                                                                            ? previewInvoiceStatus()
                                                                            : accountData.accountActions?.invoiceStatus
                                                                    )} w-100`}>
                                                                        {paymentEditMode
                                                                            ? previewInvoiceStatus()
                                                                            : (accountData.accountActions?.invoiceStatus || 'N/A')}
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        </tfoot>
                                                    </table>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* ── TABS ── */}
                                <ul className="nav nav-tabs mb-3">
                                    {TABS.map(tab => (
                                        <li key={tab.key} className="nav-item flex-fill text-center">
                                            <button
                                                className={`nav-link w-100 ${activeTab === tab.key ? 'active' : ''}`}
                                                onClick={() => setActiveTab(tab.key)}
                                                style={{ fontSize: '14px' }}
                                            >
                                                {tab.label}
                                            </button>
                                        </li>
                                    ))}
                                </ul>

                                {/* ── TAB 1: ADD FOLLOW-UP ── */}
                                {activeTab === 'followup' && (
                                    <form onSubmit={handleFollowUpSubmit}>
                                        <div className="row border p-3 mb-3 bg-light">
                                            <div className="col-12 mb-3">
                                                <h6 className="text-primary mb-0">
                                                    <i className="fa-solid fa-phone me-2"></i>Log Follow-Up Discussion
                                                </h6>
                                            </div>

                                            {accountData.accountActions?.lastFollowUpDate && (
                                                <div className="col-12 mb-3">
                                                    <div className="alert alert-secondary py-2 mb-0" style={{ fontSize: '13px' }}>
                                                        <i className="fa-solid fa-clock me-1"></i>
                                                        Last follow-up: <strong>{formatDate(accountData.accountActions.lastFollowUpDate)}</strong>
                                                    </div>
                                                </div>
                                            )}

                                            <div className="col-12 col-md-6 mb-3">
                                                <label className="form-label">Follow-Up Date <RequiredStar /></label>
                                                <input
                                                    type="date"
                                                    className="form-control"
                                                    value={followUpData.followUpDate}
                                                    onChange={e => setFollowUpData(p => ({ ...p, followUpDate: e.target.value }))}
                                                    required
                                                />
                                            </div>
                                            <div className="col-12 col-md-6 mb-3">
                                                <label className="form-label">Next Follow-Up Date <RequiredStar /></label>
                                                <input
                                                    type="date"
                                                    className="form-control"
                                                    value={followUpData.nextFollowUpDate}
                                                    onChange={e => setFollowUpData(p => ({ ...p, nextFollowUpDate: e.target.value }))}
                                                    min={followUpData.followUpDate}
                                                    required
                                                />
                                            </div>

                                            {/* Contact Persons */}
                                            <div className="col-12 mb-3">
                                                <div className="card border-primary shadow-sm">
                                                    <div className="card-header bg-primary text-white py-2 d-flex justify-content-between align-items-center">
                                                        <h6 className="mb-0" style={{ fontSize: '14px' }}>
                                                            <i className="fa-solid fa-users me-2"></i>Contact Persons <RequiredStar />
                                                        </h6>
                                                        <span className="badge bg-light text-primary">{followUpData.contacts.length} Added</span>
                                                    </div>
                                                    <div className="card-body p-3">
                                                        {/* Add Contact Form */}
                                                        <div className="row g-2 mb-3 p-2 bg-white border rounded align-items-end">
                                                            <div className="col-12">
                                                                <strong className="small text-muted">
                                                                    <i className="fa-solid fa-user-plus me-1 text-success"></i>Add New Contact
                                                                </strong>
                                                            </div>
                                                            <div className="col-12 col-md-4">
                                                                <label className="form-label small mb-1">Name</label>
                                                                <input type="text" className="form-control form-control-sm" placeholder="Contact Name"
                                                                    value={contactForm.contactPerson}
                                                                    onChange={e => handleContactChange('contactPerson', e.target.value)}
                                                                    maxLength={100} />
                                                            </div>
                                                            <div className="col-12 col-md-4">
                                                                <label className="form-label small mb-1">Email</label>
                                                                <input type="email" className="form-control form-control-sm" placeholder="Email Address"
                                                                    value={contactForm.contactEmail}
                                                                    onChange={e => handleContactChange('contactEmail', e.target.value)}
                                                                    maxLength={100} />
                                                            </div>
                                                            <div className="col-6 col-md-3">
                                                                <label className="form-label small mb-1">Phone</label>
                                                                <input type="tel" className="form-control form-control-sm" placeholder="Phone Number"
                                                                    value={contactForm.contactPhone}
                                                                    onChange={e => handleContactChange('contactPhone', e.target.value)}
                                                                    maxLength={15} />
                                                            </div>
                                                            <div className="col-6 col-md-1">
                                                                <button type="button" className="btn btn-success btn-sm w-100"
                                                                    onClick={handleAddContact} style={{ height: '38px' }}>
                                                                    <i className="fa-solid fa-plus"></i>
                                                                </button>
                                                            </div>
                                                        </div>

                                                        {/* Contacts Table */}
                                                        {followUpData.contacts.length > 0 ? (
                                                            <div className="table-responsive">
                                                                <table className="table table-sm table-bordered mb-0" style={{ fontSize: '13px' }}>
                                                                    <thead className="table-light">
                                                                        <tr>
                                                                            <th style={{ width: '40px' }}>#</th>
                                                                            <th>Name</th>
                                                                            <th className="d-none d-md-table-cell">Email</th>
                                                                            <th>Phone</th>
                                                                            <th style={{ width: '45px' }}></th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody>
                                                                        {followUpData.contacts.map((c, i) => (
                                                                            <tr key={c._tempId} className="table-success">
                                                                                <td className="fw-bold">{i + 1}</td>
                                                                                <td className="fw-bold">{c.contactPerson || '—'}</td>
                                                                                <td className="d-none d-md-table-cell">
                                                                                    {c.contactEmail
                                                                                        ? <a href={`mailto:${c.contactEmail}`} className="text-decoration-none text-primary"><i className="fa-solid fa-envelope me-1"></i>{c.contactEmail}</a>
                                                                                        : <span className="text-muted">—</span>}
                                                                                </td>
                                                                                <td>
                                                                                    {c.contactPhone
                                                                                        ? <a href={`tel:${c.contactPhone}`} className="text-decoration-none text-success"><i className="fa-solid fa-phone me-1"></i>{c.contactPhone}</a>
                                                                                        : <span className="text-muted">—</span>}
                                                                                </td>
                                                                                <td>
                                                                                    <button type="button" className="btn btn-outline-danger btn-sm"
                                                                                        onClick={() => handleRemoveContact(c._tempId)}>
                                                                                        <i className="fa-solid fa-trash-can"></i>
                                                                                    </button>
                                                                                </td>
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        ) : (
                                                            <div className="text-center py-3 text-muted">
                                                                <i className="fa-solid fa-user-slash fa-2x mb-2 d-block opacity-50"></i>
                                                                <small>No contacts added. Use the form above to add.</small>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="col-12 mb-3">
                                                <label className="form-label">Remark / Notes <RequiredStar /></label>
                                                <textarea className="form-control" rows="3"
                                                    value={followUpData.remark}
                                                    onChange={e => setFollowUpData(p => ({ ...p, remark: e.target.value }))}
                                                    placeholder="Enter discussion details, payment promises..."
                                                    maxLength={1000} required style={{ fontSize: '14px' }} />
                                                <small className="text-muted float-end">{followUpData.remark.length}/1000</small>
                                            </div>

                                            <div className="col-12 pt-2">
                                                <button type="submit" disabled={followUpLoading} className="btn btn-primary me-2">
                                                    {followUpLoading
                                                        ? <><span className="spinner-border spinner-border-sm me-2"></span>Saving...</>
                                                        : <><i className="fa-solid fa-phone me-2"></i>Save Follow-Up</>}
                                                </button>
                                                <button type="button" onClick={handleClose} className="btn btn-secondary">Cancel</button>
                                            </div>
                                        </div>
                                    </form>
                                )}

                                {/* ── TAB 2: INVOICES (READ ONLY) ── */}
                                {activeTab === 'invoices' && (
                                    <div className="row">
                                        <div className="col-12 mb-3">
                                            <div className="alert alert-info py-2 mb-0" style={{ fontSize: '13px' }}>
                                                <i className="fa-solid fa-circle-info me-1"></i>
                                                Invoices are created on the <strong>Account Master</strong> page. This is read-only.
                                            </div>
                                        </div>
                                        {(accountData.invoiceHistory || []).length > 0 ? (
                                            <div className="col-12">
                                                <div className="table-responsive">
                                                    <table className="table table-bordered table-sm" style={{ fontSize: '13px' }}>
                                                        <thead className="table-dark">
                                                            <tr>
                                                                <th>#</th><th>Invoice No</th><th>Date</th>
                                                                <th className="text-end">Amount</th>
                                                                <th className="text-end">Tax</th>
                                                                <th className="text-end">Total</th>
                                                                <th className="text-center">Status</th>
                                                                <th>PDFs</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {accountData.invoiceHistory.map((inv, idx) => (
                                                                <tr key={idx}>
                                                                    <td>{idx + 1}</td>
                                                                    <td className="fw-bold">{inv.invoiceNumber}</td>
                                                                    <td className="text-nowrap">{formatDate(inv.invoiceDate)}</td>
                                                                    <td className="text-end">{formatCurrency(inv.invoiceAmount)}</td>
                                                                    <td className="text-end">{formatCurrency(inv.taxAmount)}</td>
                                                                    <td className="text-end fw-bold">{formatCurrency(inv.totalAmount)}</td>
                                                                    <td className="text-center">
                                                                        <span className={`badge ${inv.status === 'Paid' ? 'bg-success' : 'bg-warning text-dark'}`}>
                                                                            {inv.status}
                                                                        </span>
                                                                    </td>
                                                                    <td>
                                                                        {(inv.invoicePdfs || []).map((pdf, pIdx) => (
                                                                            <a key={pIdx} href={pdf} target="_blank" rel="noreferrer"
                                                                                className="btn btn-sm btn-outline-primary me-1">
                                                                                <i className="fa-solid fa-file-pdf"></i>
                                                                            </a>
                                                                        ))}
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                        <tfoot className="table-light fw-bold">
                                                            <tr>
                                                                <td colSpan="5" className="text-end">Grand Total:</td>
                                                                <td className="text-end">{formatCurrency(totalInvoiced)}</td>
                                                                <td colSpan="2"></td>
                                                            </tr>
                                                        </tfoot>
                                                    </table>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="col-12 text-center py-4 text-muted">
                                                <i className="fa-solid fa-file-invoice fa-3x mb-3 d-block opacity-50"></i>
                                                No invoices created yet.
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* ── TAB 3: FOLLOW-UP HISTORY ── */}
                                {activeTab === 'history' && (
                                    <div className="row">
                                        <div className="col-12 mb-3">
                                            <h6 className="text-primary mb-0">
                                                Follow-Up History ({(accountData.followUpHistory || []).length})
                                            </h6>
                                        </div>
                                        {(accountData.followUpHistory || []).length > 0 ? (
                                            <div className="col-12">
                                                <div className="table-responsive">
                                                    <table className="table table-sm table-striped" style={{ fontSize: '13px' }}>
                                                        <thead className="table-dark">
                                                            <tr>
                                                                <th>#</th><th>Date</th><th>Next Date</th>
                                                                <th>Contacts</th><th>Remark</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {[...accountData.followUpHistory].reverse().map((f, idx) => (
                                                                <tr key={idx}>
                                                                    <td>{idx + 1}</td>
                                                                    <td className="text-nowrap">{formatDate(f.followUpDate)}</td>
                                                                    <td className="text-nowrap text-warning">{formatDate(f.nextFollowUpDate)}</td>
                                                                    <td style={{ maxWidth: '200px' }}>
                                                                        {f.contacts && f.contacts.length > 0 ? (
                                                                            f.contacts.map((c, i) => (
                                                                                <div key={i} className="mb-1 small border-bottom pb-1">
                                                                                    <div className="fw-bold">{c.contactPerson}</div>
                                                                                    <div className="text-muted">{c.contactPhone || c.contactEmail || ''}</div>
                                                                                </div>
                                                                            ))
                                                                        ) : (
                                                                            <small>{f.contactPerson || 'N/A'}</small>
                                                                        )}
                                                                    </td>
                                                                    <td style={{ maxWidth: '250px', whiteSpace: 'pre-wrap' }}>
                                                                        <small>{f.remark}</small>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="col-12 text-center py-4 text-muted">
                                                <i className="fa-solid fa-phone-slash fa-3x mb-3 d-block opacity-50"></i>
                                                No follow-up history yet.
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="pb-2"></div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AccountFollowUpActionPopup;