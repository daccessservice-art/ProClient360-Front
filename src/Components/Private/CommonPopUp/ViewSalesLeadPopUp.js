import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { checkCustomerExists, createCustomer, getEmployees, getCustomersForBranch } from '../../../hooks/useCustomer';
import useUpdateLead from '../../../hooks/leads/useUpdateLead';

const industryOptions = [
  "IT & Software", "Manufacturing", "Construction & Infrastructure",
  "Healthcare", "Education", "Retail", "Banking & Finance",
  "Logistics & Supply Chain", "Hospitality", "Real Estate",
  "Government & Public Sector", "Energy & Utilities", "Telecom",
  "Pharmaceuticals", "Automotive", "Dealer", "Hotel", "Gym & Club",
  "Facility Services", "Labour Contractor", "Security Systems Dealer", "Other"
];

const ViewSalesLeadPopUp = ({ closePopUp, selectedLead }) => {
  const [activeTab, setActiveTab] = useState('details');
  const { updateLeadEmail } = useUpdateLead();

  const [leadEmail, setLeadEmail] = useState(selectedLead?.SENDER_EMAIL || '');

  // ── Email add / edit state ──
  // showEmailInput now covers BOTH cases:
  //   1) no email saved yet on the lead  -> "Add Email"
  //   2) email already saved but user wants to correct it -> "Edit Email"
  const [showEmailInput, setShowEmailInput] = useState(false);
  const [emailInputValue, setEmailInputValue] = useState('');
  const [savingEmail, setSavingEmail] = useState(false);

  const [customerCheck, setCustomerCheck] = useState({ checking: false, exists: false, customer: null, matchedField: null, checked: false });

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creatingCustomer, setCreatingCustomer] = useState(false);

  const [employees, setEmployees] = useState([]);
  const [employeesLoading, setEmployeesLoading] = useState(false);

  const [createForm, setCreateForm] = useState({
    custName: '',
    customerContactPersonName1: '',
    phoneNumber1: '',
    customerContactPersonEmail1: '',
    customerContactPersonDesignation1: '',
    ownedBy: '',
    GSTNo: '',
    zone: '',
    industryType: '',
    industryTypeOther: '',
    customerPriority: '',
    billingAddress: { add: '', city: '', state: '', country: '', pincode: '' },
  });

  useEffect(() => {
    const runCheck = async () => {
      if (!selectedLead || selectedLead.STATUS !== 'Won' || !leadEmail) {
        setCustomerCheck({ checking: false, exists: false, customer: null, matchedField: null, checked: false });
        return;
      }
      setCustomerCheck(prev => ({ ...prev, checking: true }));
      const res = await checkCustomerExists(leadEmail);
      if (res?.success) {
        setCustomerCheck({
          checking: false,
          exists: !!res.exists,
          customer: res.customer || null,
          matchedField: res.exists ? 'email' : null,
          checked: true,
        });
      } else {
        setCustomerCheck({ checking: false, exists: false, customer: null, matchedField: null, checked: true });
      }
    };
    runCheck();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLead?._id, selectedLead?.STATUS, leadEmail]);

  if (!selectedLead) return null;

  const validateEmail = (val) => /^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/.test(val);

  // ── Open the email input to ADD a brand-new email (lead currently has none) ──
  const handleOpenAddEmail = () => {
    setEmailInputValue('');
    setShowEmailInput(true);
  };

  // ── Open the email input to EDIT / correct an email the lead already has ──
  const handleOpenEditEmail = () => {
    setEmailInputValue(leadEmail || '');
    setShowEmailInput(true);
    // If a create-customer form was open under the old email, close it —
    // the customer-exists check needs to re-run for the new email first.
    setShowCreateForm(false);
  };

  const handleCancelEmailEdit = () => {
    setShowEmailInput(false);
    setEmailInputValue('');
  };

  const handleSaveEmail = async () => {
    const trimmed = emailInputValue.trim().toLowerCase();
    if (!trimmed || !validateEmail(trimmed)) {
      toast.error("Please enter a valid email address");
      return;
    }
    if (trimmed === leadEmail) {
      // Nothing changed — just close the editor
      setShowEmailInput(false);
      setEmailInputValue('');
      return;
    }
    setSavingEmail(true);
    const res = await updateLeadEmail(selectedLead._id, trimmed);
    setSavingEmail(false);
    if (res?.success) {
      toast.success("Lead email updated");
      setLeadEmail(trimmed);
      setShowEmailInput(false);
      setEmailInputValue('');
      // customerCheck effect re-runs automatically because leadEmail changed
    } else {
      toast.error(res?.error || "Failed to update lead email");
    }
  };

  const fetchEmployeesForForm = async () => {
    setEmployeesLoading(true);
    try {
      const data = await getEmployees();
      if (data.success && data.employees) setEmployees(data.employees);
    } catch (err) {
      console.error('Error fetching employees:', err);
    } finally {
      setEmployeesLoading(false);
    }
  };

  const handleOpenCreateForm = () => {
    if (!leadEmail) {
      handleOpenAddEmail();
      return;
    }
    setCreateForm({
      custName: selectedLead.SENDER_COMPANY || selectedLead.SENDER_NAME || '',
      customerContactPersonName1: selectedLead.SENDER_NAME || '',
      phoneNumber1: selectedLead.SENDER_MOBILE || '',
      customerContactPersonEmail1: '',
      customerContactPersonDesignation1: '',
      ownedBy: selectedLead.assignedTo?.name || '',
      GSTNo: '',
      zone: '',
      industryType: selectedLead.industryType || '',
      industryTypeOther: selectedLead.industryTypeOther || '',
      customerPriority: selectedLead.customerPriority || '',
      billingAddress: {
        add: selectedLead.SENDER_ADDRESS || '',
        city: selectedLead.SENDER_CITY || '',
        state: selectedLead.SENDER_STATE || '',
        country: selectedLead.SENDER_COUNTRY_ISO || '',
        pincode: selectedLead.SENDER_PINCODE || '',
      },
    });
    fetchEmployeesForForm();
    setShowCreateForm(true);
  };

  const handleFormChange = (field, value) => {
    setCreateForm(prev => ({ ...prev, [field]: value }));
  };

  const handleAddressChange = (field, value) => {
    setCreateForm(prev => ({ ...prev, billingAddress: { ...prev.billingAddress, [field]: value } }));
  };

  const handleConfirmCreate = async () => {
    if (!createForm.custName.trim()) return toast.error("Customer name is required");
    if (!createForm.customerContactPersonName1.trim()) return toast.error("Contact Person Name is required");
    if (!createForm.ownedBy) return toast.error("Please select Owned By");
    if (!createForm.GSTNo.trim()) return toast.error("GST Number is required");
    if (!createForm.zone) return toast.error("Please select a Zone");
    if (!createForm.industryType) return toast.error("Please select an Industry Type");
    if (createForm.industryType === 'Other' && !createForm.industryTypeOther.trim()) {
      return toast.error("Please specify the industry type");
    }
    if (!createForm.customerPriority) return toast.error("Please select a Customer Priority");

    // ── Guard: re-verify duplicates right before submit ──
    // 1) Email — in case it got linked to a customer elsewhere in the meantime
    const dupCheck = await checkCustomerExists(leadEmail);
    if (dupCheck?.success && dupCheck.exists) {
      toast.error(
        `Email already used by customer "${dupCheck.customer?.custName || 'Unknown'}". Refreshing status...`
      );
      setCustomerCheck({
        checking: false,
        exists: true,
        customer: dupCheck.customer || null,
        matchedField: 'email',
        checked: true,
      });
      setShowCreateForm(false);
      return;
    }

    // 2) GST Number — not enforced server-side, so we check it here so you
    //    know WHICH field is causing the duplicate before submitting.
    const gstValue = createForm.GSTNo.trim().toUpperCase();
    if (gstValue !== 'NA') {
      const gstSearch = await getCustomersForBranch(gstValue);
      const gstDup = gstSearch?.success && gstSearch.customers?.find(
        (c) => (c.GSTNo || '').trim().toUpperCase() === gstValue
      );
      if (gstDup) {
        toast.error(`GST Number already used by customer "${gstDup.custName}". Please verify.`);
        return;
      }
    }

    setCreatingCustomer(true);
    const customerData = {
      custName: createForm.custName.trim(),
      email: leadEmail,
      customerContactPersonName1: createForm.customerContactPersonName1.trim(),
      phoneNumber1: createForm.phoneNumber1.trim(),
      customerContactPersonEmail1: createForm.customerContactPersonEmail1.trim(),
      customerContactPersonDesignation1: createForm.customerContactPersonDesignation1.trim(),
      ownedBy: createForm.ownedBy,
      billingAddress: createForm.billingAddress,
      zone: createForm.zone,
      GSTNo: createForm.GSTNo.trim().toUpperCase(),
      industryType: createForm.industryType,
      industryTypeOther: createForm.industryType === 'Other' ? createForm.industryTypeOther.trim() : undefined,
      customerPriority: createForm.customerPriority,
      customerType: 'main',
    };

    const data = await createCustomer(customerData);
    setCreatingCustomer(false);

    if (data?.success) {
      toast.success(data.message || "Customer created successfully");
      setShowCreateForm(false);
      setCustomerCheck({ checking: false, exists: true, customer: data.customer, checked: true });
    } else {
      // Handles server-side duplicate (409) or any other creation error
      toast.error(data?.error || "Failed to create customer");
      if (data?.error && /already exist/i.test(data.error)) {
        setCustomerCheck({ checking: false, exists: true, customer: null, matchedField: 'email', checked: true });
        setShowCreateForm(false);
      }
    }
  };

  const getPriorityBadge = (priority) => {
    if (!priority) return <span className="text-muted">—</span>;
    switch (priority) {
      case 'P1':
        return (
          <span className="badge" style={{ backgroundColor: '#dc3545', color: '#fff', fontSize: '0.78rem', padding: '5px 12px' }}>
            🔴 P1 — High Priority
          </span>
        );
      case 'P2':
        return (
          <span className="badge" style={{ backgroundColor: '#ffc107', color: '#000', fontSize: '0.78rem', padding: '5px 12px' }}>
            🟡 P2 — Medium Priority
          </span>
        );
      case 'P3':
        return (
          <span className="badge" style={{ backgroundColor: '#198754', color: '#fff', fontSize: '0.78rem', padding: '5px 12px' }}>
            🟢 P3 — Low Priority
          </span>
        );
      default:
        return <span className="text-muted">—</span>;
    }
  };

  const getIndustryDisplay = (industryType, industryTypeOther) => {
    if (!industryType) return <span className="text-muted">—</span>;
    if (industryType === 'Other' && industryTypeOther) {
      return <span className="fw-semibold">{industryTypeOther}</span>;
    }
    return <span className="fw-semibold">{industryType}</span>;
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return dateString;
    }
  };

  const formatShortDate = (dateString) => {
    if (!dateString) return "—";
    try {
      return new Date(dateString).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return "—";
    }
  };

  const getStatusBadge = (status) => {
    if (!status) return <span className="badge bg-secondary">—</span>;
    switch (status) {
      case 'Won':
        return <span className="badge bg-success">Won</span>;
      case 'Lost':
        return <span className="badge bg-danger">Lost</span>;
      case 'Ongoing':
        return <span className="badge bg-primary">Ongoing</span>;
      case 'Pending':
        return <span className="badge bg-warning text-dark">Pending</span>;
      case 'HotLeads':
        return <span className="badge bg-danger">Hot Leads</span>;
      default:
        return <span className="badge bg-secondary">{status}</span>;
    }
  };

  const getCallLeadsBadge = (callLeads) => {
    if (!callLeads) return <span className="text-muted">Warm Leads</span>;
    switch (callLeads) {
      case 'Hot Leads':
        return <span className="badge bg-danger">🔥 Hot</span>;
      case 'Warm Leads':
        return <span className="badge bg-warning text-dark">🌤️ Warm</span>;
      case 'Cold Leads':
        return <span className="badge bg-info text-dark">❄️ Cold</span>;
      case 'Invalid Leads':
        return <span className="badge bg-secondary">⛔ Invalid</span>;
      default:
        return <span className="text-muted">{callLeads}</span>;
    }
  };

  const getFeasibilityBadge = (feasibility) => {
    if (!feasibility || feasibility === 'none') return null;
    switch (feasibility) {
      case 'feasible':
        return <span className="badge bg-success me-2">✅ Feasible</span>;
      case 'not-feasible':
        return <span className="badge bg-danger me-2">❌ Not Feasible</span>;
      case 'call-unanswered':
        return <span className="badge bg-warning text-dark me-2">📞 Call Unanswered</span>;
      default:
        return null;
    }
  };

  const formatAmount = (val) => {
    if (!val || val <= 0) return null;
    return '₹' + Number(val).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const InfoRow = ({ label, value, colSpan = 6, badge, isLink, linkHref }) => (
    <div className={colSpan === 12 ? 'col-12' : `col-md-${colSpan}`}>
      <div className="mb-2">
        <span className="text-muted small d-block" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          {label}
        </span>
        {badge ? (
          badge
        ) : isLink && linkHref ? (
          <a href={linkHref} target="_blank" rel="noopener noreferrer" className="fw-semibold" style={{ fontSize: '0.88rem', color: '#0d6efd', textDecoration: 'none' }}>
            {value || '—'}
            <i className="fa-solid fa-external-link ms-1" style={{ fontSize: '0.7rem' }}></i>
          </a>
        ) : (
          <div className="fw-semibold" style={{ fontSize: '0.88rem', color: '#1e293b', wordBreak: 'break-word' }}>
            {value || '—'}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      <div
        className="modal fade show"
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          backgroundColor: '#00000050',
          zIndex: 1070,
          paddingTop: '40px',
          paddingBottom: '40px',
        }}
      >
        <div className="modal-dialog modal-xl" style={{ maxWidth: '960px', width: '96%' }}>
          <div className="modal-content">
            <div
              className="modal-header py-2 px-3"
              style={{
                background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
                color: '#fff',
                borderRadius: 0,
              }}
            >
              <div className="d-flex align-items-center gap-2">
                <i className="fa-solid fa-eye" style={{ fontSize: '1.1rem' }}></i>
                <h6 className="mb-0 fw-bold" style={{ fontSize: '1rem' }}>
                  Lead Details
                </h6>
                {selectedLead.SOURCE && (
                  <span
                    className="badge ms-2"
                    style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: '#fff', fontSize: '0.72rem' }}
                  >
                    {selectedLead.SOURCE}
                  </span>
                )}
                {getFeasibilityBadge(selectedLead.feasibility)}
              </div>
              <button
                onClick={closePopUp}
                type="button"
                className="btn-close btn-close-white"
                aria-label="Close"
              ></button>
            </div>

            <div className="px-3 pt-3 pb-0">
              <ul className="nav nav-tabs" style={{ borderBottom: '2px solid #e2e8f0' }}>
                <li className="nav-item">
                  <button
                    className={`nav-link ${activeTab === 'details' ? 'active' : ''}`}
                    onClick={() => setActiveTab('details')}
                    style={{ fontSize: '0.85rem', fontWeight: 600, color: activeTab === 'details' ? '#1e40af' : '#64748b' }}
                  >
                    <i className="fa-solid fa-user me-1"></i> Details
                  </button>
                </li>
                <li className="nav-item">
                  <button
                    className={`nav-link ${activeTab === 'classification' ? 'active' : ''}`}
                    onClick={() => setActiveTab('classification')}
                    style={{ fontSize: '0.85rem', fontWeight: 600, color: activeTab === 'classification' ? '#1e40af' : '#64748b' }}
                  >
                    <i className="fa-solid fa-tags me-1"></i> Classification
                  </button>
                </li>
                <li className="nav-item">
                  <button
                    className={`nav-link ${activeTab === 'project' ? 'active' : ''}`}
                    onClick={() => setActiveTab('project')}
                    style={{ fontSize: '0.85rem', fontWeight: 600, color: activeTab === 'project' ? '#1e40af' : '#64748b' }}
                  >
                    <i className="fa-solid fa-clipboard-list me-1"></i> Project & Survey
                  </button>
                </li>
                <li className="nav-item">
                  <button
                    className={`nav-link ${activeTab === 'history' ? 'active' : ''}`}
                    onClick={() => setActiveTab('history')}
                    style={{ fontSize: '0.85rem', fontWeight: 600, color: activeTab === 'history' ? '#1e40af' : '#64748b' }}
                  >
                    <i className="fa-solid fa-clock-rotate-left me-1"></i> Action History
                    {selectedLead.previousActions?.length > 0 && (
                      <span className="badge bg-primary ms-1" style={{ fontSize: '0.65rem' }}>
                        {selectedLead.previousActions.length}
                      </span>
                    )}
                  </button>
                </li>
                <li className="nav-item">
                  <button
                    className={`nav-link ${activeTab === 'calls' ? 'active' : ''}`}
                    onClick={() => setActiveTab('calls')}
                    style={{ fontSize: '0.85rem', fontWeight: 600, color: activeTab === 'calls' ? '#1e40af' : '#64748b' }}
                  >
                    <i className="fa-solid fa-phone me-1"></i> Call History
                    {selectedLead.callHistory?.length > 0 && (
                      <span className="badge bg-warning text-dark ms-1" style={{ fontSize: '0.65rem' }}>
                        {selectedLead.callHistory.length}
                      </span>
                    )}
                  </button>
                </li>
              </ul>
            </div>

            <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>

              {activeTab === 'details' && (
                <div className="py-3">
                  <div className="row g-2 mb-3">
                    <div className="col-6 col-md-3">
                      <div className="p-2 rounded text-center" style={{ background: '#f0f9ff', border: '1px solid #bae6fd' }}>
                        <small className="text-muted d-block" style={{ fontSize: '0.7rem' }}>Status</small>
                        {getStatusBadge(selectedLead.STATUS)}
                      </div>
                    </div>
                    <div className="col-6 col-md-3">
                      <div className="p-2 rounded text-center" style={{ background: '#fefce8', border: '1px solid #fde68a' }}>
                        <small className="text-muted d-block" style={{ fontSize: '0.7rem' }}>Lead Type</small>
                        {getCallLeadsBadge(selectedLead.callLeads)}
                      </div>
                    </div>
                    <div className="col-6 col-md-3">
                      <div className="p-2 rounded text-center" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                        <small className="text-muted d-block" style={{ fontSize: '0.7rem' }}>Completion</small>
                        <span className="fw-bold" style={{ color: '#15803d' }}>
                          {selectedLead.complated || 0}%
                        </span>
                      </div>
                    </div>
                    <div className="col-6 col-md-3">
                      <div className="p-2 rounded text-center" style={{ background: '#fdf2f8', border: '1px solid #fbcfe8' }}>
                        <small className="text-muted d-block" style={{ fontSize: '0.7rem' }}>Amount</small>
                        <span className="fw-bold" style={{ color: '#be185d', fontSize: '0.85rem' }}>
                          {formatAmount(selectedLead.quotation) || '—'}
                        </span>
                      </div>
                    </div>

                    {/* ── Create Customer / Already Customer (Won leads only) ── */}
                    {selectedLead.STATUS === 'Won' && (
                      <div className="col-12">
                        <div className="p-2 rounded" style={{ background: '#fff7ed', border: '1px solid #fed7aa' }}>
                          <div className="d-flex align-items-center flex-wrap gap-2">
                            <small className="text-muted fw-semibold" style={{ fontSize: '0.72rem' }}>
                              <i className="fa-solid fa-user-tag me-1"></i>Customer:
                            </small>

                            {showEmailInput ? (
                              <div className="d-flex align-items-center gap-2 flex-grow-1" style={{ minWidth: '260px' }}>
                                <input
                                  type="email"
                                  className="form-control form-control-sm"
                                  placeholder="Enter customer email..."
                                  value={emailInputValue}
                                  onChange={(e) => setEmailInputValue(e.target.value)}
                                  style={{ fontSize: '0.78rem', maxWidth: '260px' }}
                                  disabled={savingEmail}
                                  autoFocus
                                />
                                <button
                                  type="button"
                                  className="btn btn-sm btn-success"
                                  style={{ fontSize: '0.72rem' }}
                                  onClick={handleSaveEmail}
                                  disabled={savingEmail}
                                >
                                  {savingEmail ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-check"></i>}
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-secondary"
                                  style={{ fontSize: '0.72rem' }}
                                  onClick={handleCancelEmailEdit}
                                  disabled={savingEmail}
                                >
                                  <i className="fa-solid fa-xmark"></i>
                                </button>
                              </div>
                            ) : !leadEmail ? (
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-danger"
                                style={{ fontSize: '0.72rem' }}
                                onClick={handleOpenAddEmail}
                              >
                                <i className="fa-solid fa-envelope-circle-check me-1"></i>Add Email to Create Customer
                              </button>
                            ) : customerCheck.checking ? (
                              <span className="text-muted" style={{ fontSize: '0.75rem' }}>
                                <i className="fa-solid fa-spinner fa-spin me-1"></i>Checking Customer Master...
                              </span>
                            ) : customerCheck.exists ? (
                              <>
                                <span className="badge bg-success" style={{ fontSize: '0.72rem' }}>
                                  <i className="fa-solid fa-circle-check me-1"></i>
                                  Duplicate Email — matches customer "
                                  {customerCheck.customer?.custName || 'existing record'}" ({leadEmail})
                                </span>
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-secondary"
                                  style={{ fontSize: '0.7rem' }}
                                  onClick={handleOpenEditEmail}
                                  title="Wrong email? Edit it and re-check"
                                >
                                  <i className="fa-solid fa-pen"></i>
                                </button>
                              </>
                            ) : !showCreateForm ? (
                              <>
                                <span className="badge bg-secondary" style={{ fontSize: '0.7rem' }}>{leadEmail}</span>
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-secondary"
                                  style={{ fontSize: '0.7rem' }}
                                  onClick={handleOpenEditEmail}
                                  title="Edit email"
                                >
                                  <i className="fa-solid fa-pen"></i>
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-sm btn-warning"
                                  style={{ fontSize: '0.72rem', fontWeight: 600 }}
                                  onClick={handleOpenCreateForm}
                                >
                                  <i className="fa-solid fa-user-plus me-1"></i>Create Customer
                                </button>
                              </>
                            ) : (
                              <span className="text-muted" style={{ fontSize: '0.72rem' }}>Fill the form below to create customer</span>
                            )}
                          </div>

                          {/* ── Full inline create-customer form (mirrors Customer Master required fields) ── */}
                          {showCreateForm && (
                            <div className="mt-3 p-3 rounded" style={{ background: '#ffffff', border: '1px solid #fbbf24' }}>
                              <h6 className="fw-bold mb-2" style={{ fontSize: '0.82rem', color: '#92400e' }}>
                                <i className="fa-solid fa-user-plus me-1"></i>New Customer Details
                              </h6>

                              <div className="row g-2">
                                <div className="col-12 col-md-6">
                                  <label className="form-label mb-1" style={{ fontSize: '0.72rem', fontWeight: 600 }}>Customer Name *</label>
                                  <input
                                    type="text"
                                    className="form-control form-control-sm"
                                    value={createForm.custName}
                                    onChange={(e) => handleFormChange('custName', e.target.value)}
                                    style={{ fontSize: '0.78rem' }}
                                  />
                                </div>
                                <div className="col-12 col-md-6">
                                  <label className="form-label mb-1" style={{ fontSize: '0.72rem', fontWeight: 600 }}>Email (from lead)</label>
                                  <div className="input-group input-group-sm">
                                    <input
                                      type="email"
                                      className="form-control"
                                      value={leadEmail}
                                      disabled
                                      style={{ fontSize: '0.78rem', backgroundColor: '#f1f5f9' }}
                                    />
                                    <button
                                      type="button"
                                      className="btn btn-outline-secondary"
                                      onClick={handleOpenEditEmail}
                                      title="Edit email"
                                    >
                                      <i className="fa-solid fa-pen"></i>
                                    </button>
                                  </div>
                                </div>

                                <div className="col-12 col-md-6">
                                  <label className="form-label mb-1" style={{ fontSize: '0.72rem', fontWeight: 600 }}>Contact Person Name *</label>
                                  <input
                                    type="text"
                                    className="form-control form-control-sm"
                                    value={createForm.customerContactPersonName1}
                                    onChange={(e) => handleFormChange('customerContactPersonName1', e.target.value)}
                                    style={{ fontSize: '0.78rem' }}
                                  />
                                </div>
                                <div className="col-12 col-md-6">
                                  <label className="form-label mb-1" style={{ fontSize: '0.72rem', fontWeight: 600 }}>Contact Phone</label>
                                  <input
                                    type="text"
                                    className="form-control form-control-sm"
                                    value={createForm.phoneNumber1}
                                    onChange={(e) => handleFormChange('phoneNumber1', e.target.value)}
                                    style={{ fontSize: '0.78rem' }}
                                    maxLength={25}
                                  />
                                </div>

                                <div className="col-12 col-md-6">
                                  <label className="form-label mb-1" style={{ fontSize: '0.72rem', fontWeight: 600 }}>Contact Email</label>
                                  <input
                                    type="email"
                                    className="form-control form-control-sm"
                                    value={createForm.customerContactPersonEmail1}
                                    onChange={(e) => handleFormChange('customerContactPersonEmail1', e.target.value)}
                                    style={{ fontSize: '0.78rem' }}
                                  />
                                </div>
                                <div className="col-12 col-md-6">
                                  <label className="form-label mb-1" style={{ fontSize: '0.72rem', fontWeight: 600 }}>Designation</label>
                                  <input
                                    type="text"
                                    className="form-control form-control-sm"
                                    placeholder="e.g. Manager, Director..."
                                    value={createForm.customerContactPersonDesignation1}
                                    onChange={(e) => handleFormChange('customerContactPersonDesignation1', e.target.value)}
                                    style={{ fontSize: '0.78rem' }}
                                  />
                                </div>

                                <div className="col-12 col-md-6">
                                  <label className="form-label mb-1" style={{ fontSize: '0.72rem', fontWeight: 600 }}>Owned By *</label>
                                  <select
                                    className="form-select form-select-sm"
                                    value={createForm.ownedBy}
                                    onChange={(e) => handleFormChange('ownedBy', e.target.value)}
                                    style={{ fontSize: '0.78rem' }}
                                    disabled={employeesLoading}
                                  >
                                    <option value="">{employeesLoading ? "Loading..." : "-- Select Employee --"}</option>
                                    {employees.map((emp) => (
                                      <option key={emp._id} value={emp.name}>{emp.name}</option>
                                    ))}
                                  </select>
                                </div>
                                <div className="col-12 col-md-6">
                                  <label className="form-label mb-1" style={{ fontSize: '0.72rem', fontWeight: 600 }}>GST Number *</label>
                                  <input
                                    type="text"
                                    className="form-control form-control-sm text-uppercase"
                                    placeholder="Enter GST No. (or NA)"
                                    value={createForm.GSTNo}
                                    onChange={(e) => handleFormChange('GSTNo', e.target.value.toUpperCase())}
                                    style={{ fontSize: '0.78rem' }}
                                  />
                                </div>

                                <div className="col-6 col-md-3">
                                  <label className="form-label mb-1" style={{ fontSize: '0.72rem', fontWeight: 600 }}>Zone *</label>
                                  <select
                                    className="form-select form-select-sm"
                                    value={createForm.zone}
                                    onChange={(e) => handleFormChange('zone', e.target.value)}
                                    style={{ fontSize: '0.78rem' }}
                                  >
                                    <option value="">Select</option>
                                    <option value="North">North</option>
                                    <option value="South">South</option>
                                    <option value="East">East</option>
                                    <option value="West">West</option>
                                    <option value="Central">Central</option>
                                  </select>
                                </div>
                                <div className="col-6 col-md-3">
                                  <label className="form-label mb-1" style={{ fontSize: '0.72rem', fontWeight: 600 }}>Priority *</label>
                                  <select
                                    className="form-select form-select-sm"
                                    value={createForm.customerPriority}
                                    onChange={(e) => handleFormChange('customerPriority', e.target.value)}
                                    style={{ fontSize: '0.78rem' }}
                                  >
                                    <option value="">Select</option>
                                    <option value="P1">P1 - High</option>
                                    <option value="P2">P2 - Medium</option>
                                    <option value="P3">P3 - Low</option>
                                  </select>
                                </div>
                                <div className={createForm.industryType === 'Other' ? 'col-12 col-md-3' : 'col-12 col-md-6'}>
                                  <label className="form-label mb-1" style={{ fontSize: '0.72rem', fontWeight: 600 }}>Industry Type *</label>
                                  <select
                                    className="form-select form-select-sm"
                                    value={createForm.industryType}
                                    onChange={(e) => handleFormChange('industryType', e.target.value)}
                                    style={{ fontSize: '0.78rem' }}
                                  >
                                    <option value="">Select Industry</option>
                                    {industryOptions.map((opt) => (
                                      <option key={opt} value={opt}>{opt}</option>
                                    ))}
                                  </select>
                                </div>
                                {createForm.industryType === 'Other' && (
                                  <div className="col-12 col-md-3">
                                    <label className="form-label mb-1" style={{ fontSize: '0.72rem', fontWeight: 600 }}>Specify Industry *</label>
                                    <input
                                      type="text"
                                      className="form-control form-control-sm"
                                      value={createForm.industryTypeOther}
                                      onChange={(e) => handleFormChange('industryTypeOther', e.target.value)}
                                      style={{ fontSize: '0.78rem' }}
                                    />
                                  </div>
                                )}

                                <div className="col-12">
                                  <hr className="my-2" />
                                  <label className="form-label mb-1" style={{ fontSize: '0.72rem', fontWeight: 600 }}>Address (Optional)</label>
                                </div>
                                <div className="col-6 col-md-3">
                                  <input
                                    type="text"
                                    className="form-control form-control-sm"
                                    placeholder="Pincode"
                                    value={createForm.billingAddress.pincode}
                                    onChange={(e) => handleAddressChange('pincode', e.target.value)}
                                    style={{ fontSize: '0.78rem' }}
                                    maxLength={6}
                                  />
                                </div>
                                <div className="col-6 col-md-3">
                                  <input
                                    type="text"
                                    className="form-control form-control-sm"
                                    placeholder="City"
                                    value={createForm.billingAddress.city}
                                    onChange={(e) => handleAddressChange('city', e.target.value)}
                                    style={{ fontSize: '0.78rem' }}
                                  />
                                </div>
                                <div className="col-6 col-md-3">
                                  <input
                                    type="text"
                                    className="form-control form-control-sm"
                                    placeholder="State"
                                    value={createForm.billingAddress.state}
                                    onChange={(e) => handleAddressChange('state', e.target.value)}
                                    style={{ fontSize: '0.78rem' }}
                                  />
                                </div>
                                <div className="col-6 col-md-3">
                                  <input
                                    type="text"
                                    className="form-control form-control-sm"
                                    placeholder="Country"
                                    value={createForm.billingAddress.country}
                                    onChange={(e) => handleAddressChange('country', e.target.value)}
                                    style={{ fontSize: '0.78rem' }}
                                  />
                                </div>
                                <div className="col-12">
                                  <textarea
                                    className="form-control form-control-sm"
                                    placeholder="Address line"
                                    rows="1"
                                    value={createForm.billingAddress.add}
                                    onChange={(e) => handleAddressChange('add', e.target.value)}
                                    style={{ fontSize: '0.78rem' }}
                                  />
                                </div>
                              </div>

                              <div className="d-flex gap-2 mt-3">
                                <button
                                  type="button"
                                  className="btn btn-sm btn-success"
                                  style={{ fontSize: '0.75rem' }}
                                  onClick={handleConfirmCreate}
                                  disabled={creatingCustomer}
                                >
                                  {creatingCustomer ? (
                                    <><i className="fa-solid fa-spinner fa-spin me-1"></i>Creating...</>
                                  ) : (
                                    <><i className="fa-solid fa-check me-1"></i>Confirm & Create Customer</>
                                  )}
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-secondary"
                                  style={{ fontSize: '0.75rem' }}
                                  onClick={() => setShowCreateForm(false)}
                                  disabled={creatingCustomer}
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <h6 className="fw-bold border-bottom pb-2 mb-3" style={{ color: '#475569', fontSize: '0.85rem' }}>
                    <i className="fa-solid fa-user me-2"></i>Sender Information
                  </h6>
                  <div className="row g-3 mb-4">
                    <InfoRow label="Company Name" value={selectedLead.SENDER_COMPANY} colSpan={6} />
                    <InfoRow label="Contact Name" value={selectedLead.SENDER_NAME} colSpan={6} />
                    <InfoRow label="Email" value={leadEmail || selectedLead.SENDER_EMAIL} colSpan={6} />
                    <InfoRow label="Mobile" value={selectedLead.SENDER_MOBILE} colSpan={6} />
                    <InfoRow label="Subject" value={selectedLead.SUBJECT} colSpan={12} />
                  </div>

                  <h6 className="fw-bold border-bottom pb-2 mb-3" style={{ color: '#475569', fontSize: '0.85rem' }}>
                    <i className="fa-solid fa-location-dot me-2"></i>Address
                  </h6>
                  <div className="row g-3 mb-4">
                    <InfoRow label="Full Address" value={selectedLead.SENDER_ADDRESS} colSpan={12} />
                    <InfoRow label="City" value={selectedLead.SENDER_CITY} colSpan={4} />
                    <InfoRow label="State" value={selectedLead.SENDER_STATE} colSpan={4} />
                    <InfoRow label="Pincode" value={selectedLead.SENDER_PINCODE} colSpan={4} />
                    <InfoRow label="Country" value={selectedLead.SENDER_COUNTRY_ISO} colSpan={4} />
                  </div>

                  <h6 className="fw-bold border-bottom pb-2 mb-3" style={{ color: '#475569', fontSize: '0.85rem' }}>
                    <i className="fa-solid fa-circle-info me-2"></i>Query Information
                  </h6>
                  <div className="row g-3 mb-4">
                    <InfoRow label="Product" value={selectedLead.QUERY_PRODUCT_NAME} colSpan={12} />
                    <InfoRow label="Source" value={selectedLead.SOURCE} colSpan={4} />
                    <InfoRow label="Query Time" value={formatDate(selectedLead.QUERY_TIME || selectedLead.createdAt)} colSpan={4} />
                    <InfoRow label="Created At" value={formatDate(selectedLead.createdAt)} colSpan={4} />
                    {selectedLead.QUERY_MESSAGE && (
                      <div className="col-12">
                        <span className="text-muted small d-block" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          Message
                        </span>
                        <div
                          className="p-2 rounded mt-1"
                          style={{
                            background: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            fontSize: '0.85rem',
                            whiteSpace: 'pre-wrap',
                            maxHeight: '150px',
                            overflowY: 'auto',
                          }}
                        >
                          {selectedLead.QUERY_MESSAGE}
                        </div>
                      </div>
                    )}
                  </div>

                  <h6 className="fw-bold border-bottom pb-2 mb-3" style={{ color: '#475569', fontSize: '0.85rem' }}>
                    <i className="fa-solid fa-user-check me-2"></i>Assignment Information
                  </h6>
                  <div className="row g-3 mb-3">
                    <InfoRow
                      label="Assigned To"
                      value={selectedLead.assignedTo?.name || '—'}
                      colSpan={4}
                    />
                    <InfoRow
                      label="Assigned By"
                      value={selectedLead.assignedBy?.name || '—'}
                      colSpan={4}
                    />
                    <InfoRow
                      label="Assigned Time"
                      value={selectedLead.assignedTime ? formatDate(selectedLead.assignedTime) : '—'}
                      colSpan={4}
                    />
                    <InfoRow
                      label="Current Step"
                      value={selectedLead.step || '—'}
                      colSpan={4}
                    />
                    <InfoRow
                      label="Next Follow-up"
                      value={selectedLead.nextFollowUpDate ? formatDate(selectedLead.nextFollowUpDate) : '—'}
                      colSpan={4}
                    />
                    <InfoRow
                      label="Remark"
                      value={selectedLead.rem || '—'}
                      colSpan={4}
                    />
                    {selectedLead.customerType && (
                      <InfoRow
                        label="Customer Type"
                        value={selectedLead.customerType === 'existing' ? 'Existing Customer' : 'New Customer'}
                        colSpan={4}
                        badge={
                          <span className={`badge ${selectedLead.customerType === 'existing' ? 'bg-info' : 'bg-primary'}`}>
                            {selectedLead.customerType === 'existing' ? 'Existing' : 'New'}
                          </span>
                        }
                      />
                    )}
                    {selectedLead.customerId && (
                      <InfoRow
                        label="Customer ID"
                        value={selectedLead.customerId?.custName || selectedLead.customerId?.name || selectedLead.customerId}
                        colSpan={4}
                      />
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'classification' && (
                <div className="py-3">
                  <div className="mb-4">
                    <h6 className="fw-bold border-bottom pb-2 mb-3" style={{ color: '#475569', fontSize: '0.85rem' }}>
                      <i className="fa-solid fa-flag me-2"></i>Customer Priority
                    </h6>
                    <div className="p-3 rounded" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                      <div className="d-flex align-items-center gap-3">
                        <div style={{ fontSize: '2rem' }}>
                          {selectedLead.customerPriority === 'P1' && '🔴'}
                          {selectedLead.customerPriority === 'P2' && '🟡'}
                          {selectedLead.customerPriority === 'P3' && '🟢'}
                          {!selectedLead.customerPriority && '⚪'}
                        </div>
                        <div>
                          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1e293b' }}>
                            {getPriorityBadge(selectedLead.customerPriority)}
                          </div>
                          <small className="text-muted" style={{ fontSize: '0.78rem' }}>
                            {!selectedLead.customerPriority
                              ? 'No priority assigned to this lead'
                              : selectedLead.customerPriority === 'P1'
                              ? 'High priority lead — requires immediate attention'
                              : selectedLead.customerPriority === 'P2'
                              ? 'Medium priority lead — follow up within 24-48 hours'
                              : 'Low priority lead — can be addressed when capacity allows'}
                          </small>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mb-4">
                    <h6 className="fw-bold border-bottom pb-2 mb-3" style={{ color: '#475569', fontSize: '0.85rem' }}>
                      <i className="fa-solid fa-industry me-2"></i>Industry Type
                    </h6>
                    <div className="p-3 rounded" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                      <div className="d-flex align-items-center gap-3">
                        <div
                          className="d-flex align-items-center justify-content-center rounded-circle"
                          style={{
                            width: '48px',
                            height: '48px',
                            backgroundColor: selectedLead.industryType ? '#e0f2fe' : '#f1f5f9',
                            flexShrink: 0,
                          }}
                        >
                          <i
                            className="fa-solid fa-building"
                            style={{
                              fontSize: '1.2rem',
                              color: selectedLead.industryType ? '#0284c7' : '#94a3b8',
                            }}
                          ></i>
                        </div>
                        <div>
                          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1e293b' }}>
                            {getIndustryDisplay(selectedLead.industryType, selectedLead.industryTypeOther)}
                          </div>
                          {selectedLead.industryType === 'Other' && selectedLead.industryTypeOther && (
                            <small className="text-muted" style={{ fontSize: '0.78rem' }}>
                              Custom industry: {selectedLead.industryTypeOther}
                            </small>
                          )}
                          {!selectedLead.industryType && (
                            <small className="text-muted" style={{ fontSize: '0.78rem' }}>
                              No industry type assigned to this lead
                            </small>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="row g-3">
                    <div className="col-md-6">
                      <div
                        className="p-3 rounded h-100"
                        style={{ background: '#fef2f2', border: '1px solid #fecaca' }}
                      >
                        <div className="d-flex align-items-center gap-2 mb-2">
                          <span style={{ fontSize: '1.2rem' }}>🔥</span>
                          <span className="fw-bold" style={{ color: '#991b1b', fontSize: '0.85rem' }}>
                            High Priority Criteria
                          </span>
                        </div>
                        <ul className="mb-0" style={{ fontSize: '0.78rem', color: '#7f1d1d', paddingLeft: '1.2rem' }}>
                          <li>Large enterprise clients</li>
                          <li>Budget above ₹10 Lakhs</li>
                          <li>Urgent requirements</li>
                          <li>Repeat business opportunity</li>
                        </ul>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div
                        className="p-3 rounded h-100"
                        style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}
                      >
                        <div className="d-flex align-items-center gap-2 mb-2">
                          <span style={{ fontSize: '1.2rem' }}>🌱</span>
                          <span className="fw-bold" style={{ color: '#166534', fontSize: '0.85rem' }}>
                            Low Priority Criteria
                          </span>
                        </div>
                        <ul className="mb-0" style={{ fontSize: '0.78rem', color: '#14532d', paddingLeft: '1.2rem' }}>
                          <li>Small scale requirements</li>
                          <li>Budget below ₹1 Lakh</li>
                          <li>Information gathering stage</li>
                          <li>Long-term potential</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'project' && (
                <div className="py-3">
                  <h6 className="fw-bold border-bottom pb-2 mb-3" style={{ color: '#475569', fontSize: '0.85rem' }}>
                    <i className="fa-solid fa-project-diagram me-2"></i>Project Details
                  </h6>
                  <div className="row g-3 mb-4">
                    <InfoRow
                      label="Project Size"
                      value={selectedLead.projectSize ? selectedLead.projectSize.charAt(0).toUpperCase() + selectedLead.projectSize.slice(1) : '—'}
                      colSpan={4}
                      badge={
                        selectedLead.projectSize && (
                          <span
                            className="badge"
                            style={{
                              backgroundColor:
                                selectedLead.projectSize === 'big'
                                  ? '#dc2626'
                                  : selectedLead.projectSize === 'medium'
                                  ? '#f59e0b'
                                  : '#22c55e',
                              color: selectedLead.projectSize === 'medium' ? '#000' : '#fff',
                              textTransform: 'capitalize',
                            }}
                          >
                            {selectedLead.projectSize}
                          </span>
                        )
                      }
                    />
                    <InfoRow
                      label="Requirement Type"
                      value={selectedLead.requirementType ? selectedLead.requirementType.charAt(0).toUpperCase() + selectedLead.requirementType.slice(1) : '—'}
                      colSpan={4}
                    />
                    <InfoRow
                      label="Requirement Mode"
                      value={selectedLead.requirementMode ? selectedLead.requirementMode.charAt(0).toUpperCase() + selectedLead.requirementMode.slice(1) : '—'}
                      colSpan={4}
                    />
                    <InfoRow
                      label="Survey Needed"
                      value={selectedLead.surveyNeeded === 'yes' ? 'Yes' : selectedLead.surveyNeeded === 'no' ? 'No' : '—'}
                      colSpan={4}
                      badge={
                        selectedLead.surveyNeeded && (
                          <span
                            className="badge"
                            style={{
                              backgroundColor: selectedLead.surveyNeeded === 'yes' ? '#22c55e' : '#6b7280',
                              color: '#fff',
                            }}
                          >
                            {selectedLead.surveyNeeded === 'yes' ? '✅ Yes' : '❌ No'}
                          </span>
                        )
                      }
                    />
                  </div>

                  {selectedLead.surveyNeeded === 'yes' && (
                    <>
                      <h6 className="fw-bold border-bottom pb-2 mb-3" style={{ color: '#475569', fontSize: '0.85rem' }}>
                        <i className="fa-solid fa-clipboard-check me-2"></i>Survey Details
                      </h6>
                      <div className="row g-3 mb-4">
                        <InfoRow
                          label="Survey Date & Time"
                          value={selectedLead.surveyDetails?.dateTime ? formatDate(selectedLead.surveyDetails.dateTime) : '—'}
                          colSpan={4}
                        />
                        <InfoRow
                          label="Contact Person"
                          value={selectedLead.surveyDetails?.communicatePerson || '—'}
                          colSpan={4}
                        />
                        <InfoRow
                          label="Contact Email"
                          value={selectedLead.surveyDetails?.communicateEmail || '—'}
                          colSpan={4}
                        />
                        <InfoRow
                          label="Contact Number"
                          value={selectedLead.surveyDetails?.communicateContact || '—'}
                          colSpan={4}
                        />
                        <InfoRow
                          label="Assigned Survey Engineer"
                          value={selectedLead.assignedSurveyEngineer?.name || '—'}
                          colSpan={4}
                        />
                        <InfoRow
                          label="Engineer Assigned At"
                          value={selectedLead.surveyEngineerAssignedAt ? formatDate(selectedLead.surveyEngineerAssignedAt) : '—'}
                          colSpan={4}
                        />
                      </div>

                      {selectedLead.surveyReport && (
                        <>
                          <h6 className="fw-bold border-bottom pb-2 mb-3" style={{ color: '#475569', fontSize: '0.85rem' }}>
                            <i className="fa-solid fa-file-lines me-2"></i>Survey Report Status
                          </h6>
                          <div className="row g-3 mb-3">
                            <InfoRow
                              label="Report Status"
                              value={selectedLead.surveyReport.status}
                              colSpan={4}
                              badge={
                                <span
                                  className="badge"
                                  style={{
                                    backgroundColor:
                                      selectedLead.surveyReport.status === 'success'
                                        ? '#22c55e'
                                        : selectedLead.surveyReport.status === 'cancelled'
                                        ? '#ef4444'
                                        : '#f59e0b',
                                    color: '#fff',
                                    textTransform: 'capitalize',
                                  }}
                                >
                                  {selectedLead.surveyReport.status || 'Pending'}
                                </span>
                              }
                            />
                            <InfoRow
                              label="Survey Date"
                              value={selectedLead.surveyReport.surveyDate ? formatDate(selectedLead.surveyReport.surveyDate) : '—'}
                              colSpan={4}
                            />
                            <InfoRow
                              label="Submitted At"
                              value={selectedLead.surveyReport.submittedAt ? formatDate(selectedLead.surveyReport.submittedAt) : '—'}
                              colSpan={4}
                            />
                            {selectedLead.surveyReport.cancelReason && (
                              <InfoRow
                                label="Cancel Reason"
                                value={selectedLead.surveyReport.cancelReason}
                                colSpan={12}
                              />
                            )}
                            {selectedLead.surveyReport.reportFile && (
                              <div className="col-md-4">
                                <span className="text-muted small d-block" style={{ fontSize: '0.75rem', textTransform: 'uppercase' }}>
                                  Report File
                                </span>
                                <a className="btn btn-sm btn-outline-primary mt-1" href={`${process.env.REACT_APP_API_URL}/api/leads/survey-file/${selectedLead._id}/reportFile`} target="_blank" rel="noopener noreferrer">
                                  <i className="fa-solid fa-download me-1"></i> Download Report
                                </a>
                              </div>
                            )}
                            {selectedLead.surveyReport.drawingFile && (
                              <div className="col-md-4">
                                <span className="text-muted small d-block" style={{ fontSize: '0.75rem', textTransform: 'uppercase' }}>
                                  Drawing File
                                </span>
                                <a className="btn btn-sm btn-outline-success mt-1" href={`${process.env.REACT_APP_API_URL}/api/leads/survey-file/${selectedLead._id}/drawingFile`} target="_blank" rel="noopener noreferrer">
                                  <i className="fa-solid fa-download me-1"></i> Download Drawing
                                </a>
                              </div>
                            )}
                            {selectedLead.surveyReport.boqFile && (
                              <div className="col-md-4">
                                <span className="text-muted small d-block" style={{ fontSize: '0.75rem', textTransform: 'uppercase' }}>
                                  BOQ File
                                </span>
                                <a className="btn btn-sm btn-outline-warning mt-1" href={`${process.env.REACT_APP_API_URL}/api/leads/survey-file/${selectedLead._id}/boqFile`} target="_blank" rel="noopener noreferrer">
                                  <i className="fa-solid fa-download me-1"></i> Download BOQ
                                </a>
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </>
                  )}

                  {!selectedLead.surveyNeeded && (
                    <div className="text-center py-4">
                      <i className="fa-solid fa-clipboard-list fa-2x text-muted mb-2"></i>
                      <p className="text-muted mb-0">No project or survey details available for this lead.</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'history' && (
                <div className="py-3">
                  {selectedLead.previousActions && selectedLead.previousActions.length > 0 ? (
                    <>
                      <div className="table-responsive d-none d-md-block">
                        <table
                          className="table table-sm table-hover"
                          style={{ tableLayout: 'fixed', width: '100%' }}
                        >
                          <colgroup>
                            <col style={{ width: '40px' }} />
                            <col style={{ width: '90px' }} />
                            <col style={{ width: '180px' }} />
                            <col style={{ width: '90px' }} />
                            <col style={{ width: '100px' }} />
                            <col style={{ width: '90px' }} />
                            <col style={{ width: '100px' }} />
                            <col style={{ width: '220px' }} />
                            <col style={{ width: '100px' }} />
                            <col style={{ width: '150px' }} />
                          </colgroup>
                          <thead className="table-light">
                            <tr>
                              <th className="text-center">SR.NO.</th>
                              <th>Status</th>
                              <th>Step</th>
                              <th className="text-center">Completion</th>
                              <th>Amount</th>
                              <th>Lead Type</th>
                              <th>Follow-up Date</th>
                              <th>Remark</th>
                              <th>By</th>
                              <th>Time</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedLead.previousActions
                              .slice()
                              .reverse()
                              .map((action, index) => (
                                <tr key={action._id || index}>
                                  <td className="text-center">{selectedLead.previousActions.length - index}</td>
                                  <td>{getStatusBadge(action.status)}</td>
                                  <td style={{ fontSize: '0.82rem', wordBreak: 'break-word' }}>{action.step || '—'}</td>
                                  <td className="text-center">
                                    <span className="fw-bold" style={{ color: '#15803d' }}>
                                      {action.completion || 0}%
                                    </span>
                                  </td>
                                  <td>
                                    {action.quotation > 0 ? (
                                      <span style={{ color: '#15803d', fontWeight: 600, fontSize: '0.82rem' }}>
                                        {formatAmount(action.quotation)}
                                      </span>
                                    ) : (
                                      <span className="text-muted">—</span>
                                    )}
                                  </td>
                                  <td>{getCallLeadsBadge(action.callLeads)}</td>
                                  <td style={{ fontSize: '0.82rem' }}>{formatShortDate(action.nextFollowUpDate)}</td>
                                  <td
                                    style={{
                                      fontSize: '0.8rem',
                                      whiteSpace: 'normal',
                                      wordBreak: 'break-word',
                                      overflowWrap: 'break-word',
                                    }}
                                  >
                                    {action.rem || '—'}
                                  </td>
                                  <td style={{ fontSize: '0.8rem', wordBreak: 'break-word' }}>
                                    {action.actionBy?.name || '—'}
                                  </td>
                                  <td style={{ fontSize: '0.75rem', color: '#64748b', whiteSpace: 'normal' }}>
                                    {formatDate(action.createdAt)}
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="d-md-none">
                        {selectedLead.previousActions
                          .slice()
                          .reverse()
                          .map((action, index) => (
                            <div
                              key={action._id || index}
                              className="p-3 mb-3 rounded"
                              style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}
                            >
                              <div className="d-flex justify-content-between align-items-center mb-2">
                                <span className="fw-bold" style={{ fontSize: '0.85rem', color: '#1e293b' }}>
                                  #{selectedLead.previousActions.length - index}
                                </span>
                                {getStatusBadge(action.status)}
                              </div>

                              <div className="row g-2" style={{ fontSize: '0.8rem' }}>
                                <div className="col-6">
                                  <span className="text-muted d-block" style={{ fontSize: '0.7rem', textTransform: 'uppercase' }}>Step</span>
                                  <span className="fw-semibold">{action.step || '—'}</span>
                                </div>
                                <div className="col-6">
                                  <span className="text-muted d-block" style={{ fontSize: '0.7rem', textTransform: 'uppercase' }}>Completion</span>
                                  <span className="fw-bold" style={{ color: '#15803d' }}>{action.completion || 0}%</span>
                                </div>
                                <div className="col-6">
                                  <span className="text-muted d-block" style={{ fontSize: '0.7rem', textTransform: 'uppercase' }}>Amount</span>
                                  {action.quotation > 0 ? (
                                    <span style={{ color: '#15803d', fontWeight: 600 }}>{formatAmount(action.quotation)}</span>
                                  ) : (
                                    <span className="text-muted">—</span>
                                  )}
                                </div>
                                <div className="col-6">
                                  <span className="text-muted d-block" style={{ fontSize: '0.7rem', textTransform: 'uppercase' }}>Lead Type</span>
                                  {getCallLeadsBadge(action.callLeads)}
                                </div>
                                <div className="col-6">
                                  <span className="text-muted d-block" style={{ fontSize: '0.7rem', textTransform: 'uppercase' }}>Follow-up Date</span>
                                  <span>{formatShortDate(action.nextFollowUpDate)}</span>
                                </div>
                                <div className="col-6">
                                  <span className="text-muted d-block" style={{ fontSize: '0.7rem', textTransform: 'uppercase' }}>By</span>
                                  <span>{action.actionBy?.name || '—'}</span>
                                </div>
                                <div className="col-12">
                                  <span className="text-muted d-block" style={{ fontSize: '0.7rem', textTransform: 'uppercase' }}>Remark</span>
                                  <span style={{ wordBreak: 'break-word' }}>{action.rem || '—'}</span>
                                </div>
                                <div className="col-12">
                                  <span className="text-muted d-block" style={{ fontSize: '0.7rem', textTransform: 'uppercase' }}>Time</span>
                                  <span style={{ color: '#64748b', fontSize: '0.75rem' }}>{formatDate(action.createdAt)}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-4">
                      <i className="fa-solid fa-clock-rotate-left fa-2x text-muted mb-2"></i>
                      <p className="text-muted mb-0">No action history available for this lead.</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'calls' && (
                <div className="py-3">
                  {selectedLead.callHistory && selectedLead.callHistory.length > 0 ? (
                    <>
                      <div className="alert alert-info py-2 mb-3" style={{ fontSize: '0.82rem' }}>
                        <i className="fa-solid fa-phone-volume me-2"></i>
                        Total <strong>{selectedLead.callHistory.length}</strong> call attempt(s) recorded
                        {selectedLead.firstCallDate && (
                          <span className="ms-2">
                            | First call: <strong>{formatDate(selectedLead.firstCallDate)}</strong>
                          </span>
                        )}
                      </div>
                      <div className="table-responsive">
                        <table className="table table-sm table-hover">
                          <thead className="table-light">
                            <tr>
                              <th className="text-center">Day</th>
                              <th className="text-center">Attempt</th>
                              <th>Status</th>
                              <th>Date & Time</th>
                              <th>Remarks</th>
                              <th>Attempted By</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedLead.callHistory.map((call, index) => (
                              <tr key={index}>
                                <td className="text-center fw-bold">{call.day}</td>
                                <td className="text-center">{call.attempt}</td>
                                <td>
                                  {call.status === 'answered' ? (
                                    <span className="badge bg-success">
                                      <i className="fa-solid fa-phone-slash me-1"></i>Answered
                                    </span>
                                  ) : (
                                    <span className="badge bg-warning text-dark">
                                      <i className="fa-solid fa-phone me-1"></i>Attempted
                                    </span>
                                  )}
                                </td>
                                <td style={{ fontSize: '0.82rem' }}>{formatDate(call.date)}</td>
                                <td style={{ fontSize: '0.8rem', maxWidth: '200px' }}>{call.remarks || '—'}</td>
                                <td style={{ fontSize: '0.8rem' }}>
                                  {call.attemptedBy?.name || '—'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-4">
                      <i className="fa-solid fa-phone-slash fa-2x text-muted mb-2"></i>
                      <p className="text-muted mb-0">No call history available for this lead.</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div
              className="modal-footer py-2 px-3 justify-content-between"
              style={{ background: '#f8fafc', borderTop: '1px solid #e2e8f0' }}
            >
              <div className="d-flex align-items-center gap-3">
                <small className="text-muted" style={{ fontSize: '0.75rem' }}>
                  <i className="fa-solid fa-calendar me-1"></i>
                  Created: {formatDate(selectedLead.createdAt)}
                </small>
                <small className="text-muted" style={{ fontSize: '0.75rem' }}>
                  <i className="fa-solid fa-pen me-1"></i>
                  Updated: {formatDate(selectedLead.updatedAt)}
                </small>
              </div>
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                onClick={closePopUp}
              >
                <i className="fa-solid fa-xmark me-1"></i> Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ViewSalesLeadPopUp;