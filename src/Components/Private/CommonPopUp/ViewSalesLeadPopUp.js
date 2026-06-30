import React, { useState } from 'react';
import toast from 'react-hot-toast';

const ViewSalesLeadPopUp = ({ closePopUp, selectedLead }) => {
  const [activeTab, setActiveTab] = useState('details');

  if (!selectedLead) return null;

  // ✅ Priority badge helper
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

  // ✅ Industry type display helper
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
            {/* Header */}
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

            {/* Tabs */}
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

            {/* Tab Content */}
            <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>

              {/* ══════════════════════════════════════════════════════════════ */}
              {/* TAB: DETAILS */}
              {/* ══════════════════════════════════════════════════════════════ */}
              {activeTab === 'details' && (
                <div className="py-3">
                  {/* Quick Status Bar */}
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
                  </div>

                  {/* Sender Information */}
                  <h6 className="fw-bold border-bottom pb-2 mb-3" style={{ color: '#475569', fontSize: '0.85rem' }}>
                    <i className="fa-solid fa-user me-2"></i>Sender Information
                  </h6>
                  <div className="row g-3 mb-4">
                    <InfoRow label="Company Name" value={selectedLead.SENDER_COMPANY} colSpan={6} />
                    <InfoRow label="Contact Name" value={selectedLead.SENDER_NAME} colSpan={6} />
                    <InfoRow label="Email" value={selectedLead.SENDER_EMAIL} colSpan={6} />
                    <InfoRow label="Mobile" value={selectedLead.SENDER_MOBILE} colSpan={6} />
                    <InfoRow label="Subject" value={selectedLead.SUBJECT} colSpan={12} />
                  </div>

                  {/* Address */}
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

                  {/* Query Information */}
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

                  {/* Assignment Information */}
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

              {/* ══════════════════════════════════════════════════════════════ */}
              {/* TAB: CLASSIFICATION (NEW - Customer Priority & Industry Type) */}
              {/* ══════════════════════════════════════════════════════════════ */}
              {activeTab === 'classification' && (
                <div className="py-3">
                  {/* ✅ Customer Priority Section */}
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

                  {/* ✅ Industry Type Section */}
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

                  {/* Quick Summary Card */}
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

              {/* ══════════════════════════════════════════════════════════════ */}
              {/* TAB: PROJECT & SURVEY */}
              {/* ══════════════════════════════════════════════════════════════ */}
              {activeTab === 'project' && (
                <div className="py-3">
                  {/* Project Details */}
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

                  {/* Survey Details */}
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

                      {/* Survey Report Status */}
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
                                <a
                                  href={`${process.env.REACT_APP_API_URL}/api/leads/survey-file/${selectedLead._id}/reportFile`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="btn btn-sm btn-outline-primary mt-1"
                                >
                                  <i className="fa-solid fa-download me-1"></i> Download Report
                                </a>
                              </div>
                            )}
                            {selectedLead.surveyReport.drawingFile && (
                              <div className="col-md-4">
                                <span className="text-muted small d-block" style={{ fontSize: '0.75rem', textTransform: 'uppercase' }}>
                                  Drawing File
                                </span>
                                <a
                                  href={`${process.env.REACT_APP_API_URL}/api/leads/survey-file/${selectedLead._id}/drawingFile`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="btn btn-sm btn-outline-success mt-1"
                                >
                                  <i className="fa-solid fa-download me-1"></i> Download Drawing
                                </a>
                              </div>
                            )}
                            {selectedLead.surveyReport.boqFile && (
                              <div className="col-md-4">
                                <span className="text-muted small d-block" style={{ fontSize: '0.75rem', textTransform: 'uppercase' }}>
                                  BOQ File
                                </span>
                                <a
                                  href={`${process.env.REACT_APP_API_URL}/api/leads/survey-file/${selectedLead._id}/boqFile`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="btn btn-sm btn-outline-warning mt-1"
                                >
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

              {/* ══════════════════════════════════════════════════════════════ */}
              {/* TAB: ACTION HISTORY */}
              {/* ══════════════════════════════════════════════════════════════ */}
              {activeTab === 'history' && (
                <div className="py-3">
                  {selectedLead.previousActions && selectedLead.previousActions.length > 0 ? (
                    <div className="table-responsive">
                      <table className="table table-sm table-hover">
                        <thead className="table-light">
                          <tr>
                            <th className="text-center" style={{ width: '50px' }}>#</th>
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
                                <td style={{ fontSize: '0.82rem' }}>{action.step || '—'}</td>
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
                                <td style={{ fontSize: '0.8rem', maxWidth: '200px', wordBreak: 'break-word' }}>
                                  {action.rem || '—'}
                                </td>
                                <td style={{ fontSize: '0.8rem' }}>{action.actionBy?.name || '—'}</td>
                                <td style={{ fontSize: '0.75rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                                  {formatDate(action.createdAt)}
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <i className="fa-solid fa-clock-rotate-left fa-2x text-muted mb-2"></i>
                      <p className="text-muted mb-0">No action history available for this lead.</p>
                    </div>
                  )}
                </div>
              )}

              {/* ══════════════════════════════════════════════════════════════ */}
              {/* TAB: CALL HISTORY */}
              {/* ══════════════════════════════════════════════════════════════ */}
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

            {/* Footer */}
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