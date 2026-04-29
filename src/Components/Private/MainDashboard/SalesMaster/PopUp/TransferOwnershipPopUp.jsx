import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import axios from 'axios';
import Select from 'react-select';

const baseUrl = process.env.REACT_APP_API_URL;

const TransferOwnershipPopUp = ({ onClose, onSuccess }) => {
  const [fromEmployee, setFromEmployee]       = useState(null);
  const [toEmployee, setToEmployee]           = useState(null);
  const [employeeOptions, setEmployeeOptions] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [leads, setLeads]                     = useState([]);
  const [loadingLeads, setLoadingLeads]       = useState(false);
  const [selectedLeadIds, setSelectedLeadIds] = useState([]);
  const [transferring, setTransferring]       = useState(false);
  const [selectAll, setSelectAll]             = useState(false);

  // ── Load only Sales & Marketing employees ────────────────────────────────
  const fetchEmployees = useCallback(async () => {
    setLoadingEmployees(true);
    try {
      const res = await axios.get(`${baseUrl}/api/leads/sales-employees`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (res.data.success) {
        const salesAndMarketing = res.data.salesEmployees.filter(emp => {
          const deptName = (emp.department?.name || '').toLowerCase();
          return deptName.includes('sales') || deptName.includes('marketing');
        });
        setEmployeeOptions(
          salesAndMarketing.map(emp => ({
            value: emp._id,
            label: emp.name + (emp.department?.name ? ` (${emp.department.name})` : ''),
          }))
        );
      }
    } catch {
      toast.error('Failed to load employees');
    } finally {
      setLoadingEmployees(false);
    }
  }, []);

  useEffect(() => { fetchEmployees(); }, [fetchEmployees]);

  // ── Load leads for the selected "from" employee ───────────────────────────
  const fetchLeads = useCallback(async (employeeId) => {
    if (!employeeId) { setLeads([]); return; }
    setLoadingLeads(true);
    setSelectedLeadIds([]);
    setSelectAll(false);
    try {
      const res = await axios.get(`${baseUrl}/api/leads/employee-leads/${employeeId}`, {
        params: { page: 1, limit: 1000 },
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (res.data.success) setLeads(res.data.leads || []);
      else setLeads([]);
    } catch {
      toast.error('Failed to load leads for this employee');
      setLeads([]);
    } finally {
      setLoadingLeads(false);
    }
  }, []);

  useEffect(() => {
    if (fromEmployee) fetchLeads(fromEmployee.value);
    else { setLeads([]); setSelectedLeadIds([]); setSelectAll(false); }
  }, [fromEmployee, fetchLeads]);

  // ── Selection helpers ─────────────────────────────────────────────────────
  const handleSelectAll = (checked) => {
    setSelectAll(checked);
    setSelectedLeadIds(checked ? leads.map(l => l._id) : []);
  };

  const handleLeadToggle = (leadId, checked) => {
    setSelectedLeadIds(prev =>
      checked ? [...prev, leadId] : prev.filter(id => id !== leadId)
    );
    if (!checked) setSelectAll(false);
  };

  // ── Submit transfer ───────────────────────────────────────────────────────
  const handleTransfer = async () => {
    if (!fromEmployee)                         return toast.error('Please select the current owner.');
    if (!toEmployee)                           return toast.error('Please select the new owner.');
    if (fromEmployee.value === toEmployee.value) return toast.error('From and To employee cannot be the same.');
    if (selectedLeadIds.length === 0)          return toast.error('Please select at least one lead to transfer.');

    setTransferring(true);
    try {
      const res = await axios.put(
        `${baseUrl}/api/leads/transfer-ownership`,
        { fromEmployeeId: fromEmployee.value, toEmployeeId: toEmployee.value, leadIds: selectedLeadIds },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      if (res.data.success) {
        toast.success(res.data.message);
        onSuccess?.();
        onClose();
      } else {
        toast.error(res.data.error || 'Transfer failed');
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Transfer failed');
    } finally {
      setTransferring(false);
    }
  };

  // ── Helpers ───────────────────────────────────────────────────────────────
  const statusBadge = (s) => {
    switch (s) {
      case 'Won':     return 'bg-success';
      case 'Ongoing': return 'bg-primary';
      case 'Pending': return 'bg-warning text-dark';
      case 'Lost':    return 'bg-danger';
      default:        return 'bg-secondary';
    }
  };

  const selectStyles = {
    control: (p) => ({ ...p, borderRadius: '6px', borderColor: '#ced4da', fontSize: '14px', minHeight: '40px' }),
    option:  (p, s) => ({
      ...p,
      backgroundColor: s.isSelected ? '#0d6efd' : s.isFocused ? '#f0f7ff' : 'white',
      color: s.isSelected ? 'white' : '#212529',
    }),
  };

  const fromOptions = employeeOptions.filter(o => o.value !== toEmployee?.value);
  const toOptions   = employeeOptions.filter(o => o.value !== fromEmployee?.value);

  return (
    <div
      className="modal fade show"
      style={{ display: 'flex', alignItems: 'flex-start', backgroundColor: '#00000075', zIndex: 1080, paddingTop: '40px', paddingBottom: '40px' }}
    >
      <div className="modal-dialog modal-xl" style={{ maxWidth: '920px', width: '96%' }}>
        <div className="modal-content p-3">

          {/* Header */}
          <div className="modal-header" style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', borderRadius: '8px 8px 0 0', margin: '-1px -1px 0 -1px' }}>
            <h5 className="modal-title fw-bold text-white mb-0">
              <i className="fa-solid fa-people-arrows me-2"></i>
              Transfer Lead Ownership
            </h5>
            <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
          </div>

          <div className="modal-body pt-4">

            {/* Step 1 — Select employees */}
            <div className="row g-3 mb-4">
              <div className="col-md-6">
                <label className="form-label fw-bold" style={{ fontSize: '0.88rem' }}>
                  <span style={{ background: '#fee2e2', color: '#dc2626', borderRadius: '50%', width: '22px', height: '22px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginRight: '8px', fontSize: '0.75rem', fontWeight: 800 }}>1</span>
                  Current Owner <span className="text-danger">*</span>
                  <small className="text-muted fw-normal ms-2">(Sales & Marketing employee whose leads will be transferred)</small>
                </label>
                <Select
                  options={fromOptions}
                  value={fromEmployee}
                  onChange={(opt) => { setFromEmployee(opt); setToEmployee(null); }}
                  isLoading={loadingEmployees}
                  placeholder="Select Sales & Marketing employee..."
                  isClearable
                  styles={selectStyles}
                  noOptionsMessage={() => 'No Sales & Marketing employees found'}
                />
              </div>
              <div className="col-md-6">
                <label className="form-label fw-bold" style={{ fontSize: '0.88rem' }}>
                  <span style={{ background: '#dcfce7', color: '#16a34a', borderRadius: '50%', width: '22px', height: '22px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginRight: '8px', fontSize: '0.75rem', fontWeight: 800 }}>2</span>
                  New Owner <span className="text-danger">*</span>
                  <small className="text-muted fw-normal ms-2">(Sales & Marketing employee who will own the leads)</small>
                </label>
                <Select
                  options={toOptions}
                  value={toEmployee}
                  onChange={setToEmployee}
                  isLoading={loadingEmployees}
                  placeholder={fromEmployee ? 'Select new Sales & Marketing owner...' : 'Select current owner first...'}
                  isClearable
                  isDisabled={!fromEmployee}
                  styles={selectStyles}
                  noOptionsMessage={() => 'No Sales & Marketing employees found'}
                />
              </div>
            </div>

            {/* Transfer summary banner */}
            {fromEmployee && toEmployee && selectedLeadIds.length > 0 && (
              <div className="alert alert-primary d-flex align-items-center gap-3 py-2 px-3 mb-3" style={{ fontSize: '0.85rem', borderRadius: '8px' }}>
                <i className="fa-solid fa-circle-info fa-lg"></i>
                <span>
                  <strong>{selectedLeadIds.length}</strong> lead{selectedLeadIds.length !== 1 ? 's' : ''} will be transferred from&nbsp;
                  <strong style={{ color: '#dc2626' }}>{fromEmployee.label}</strong>
                  &nbsp;<i className="fa-solid fa-arrow-right mx-1"></i>&nbsp;
                  <strong style={{ color: '#16a34a' }}>{toEmployee.label}</strong>
                </span>
              </div>
            )}

            {/* Step 3 — Leads list */}
            {fromEmployee ? (
              <div>
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <h6 className="fw-bold mb-0" style={{ fontSize: '0.88rem' }}>
                    <span style={{ background: '#eff6ff', color: '#1d4ed8', borderRadius: '50%', width: '22px', height: '22px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginRight: '8px', fontSize: '0.75rem', fontWeight: 800 }}>3</span>
                    Leads owned by <span style={{ color: '#6366f1' }}>{fromEmployee.label}</span>
                    {!loadingLeads && (
                      <span className="badge bg-secondary ms-2">{leads.length}</span>
                    )}
                    {selectedLeadIds.length > 0 && (
                      <span className="badge ms-2" style={{ background: '#6366f1' }}>{selectedLeadIds.length} selected</span>
                    )}
                  </h6>
                  {leads.length > 0 && (
                    <div className="d-flex align-items-center gap-3">
                      {selectedLeadIds.length > 0 && (
                        <button
                          type="button"
                          className="btn btn-outline-danger btn-sm"
                          onClick={() => { setSelectedLeadIds([]); setSelectAll(false); }}
                          style={{ fontSize: '0.75rem' }}
                        >
                          <i className="fa-solid fa-times me-1"></i>Clear
                        </button>
                      )}
                      <div className="form-check mb-0">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id="selectAllLeads"
                          checked={selectAll}
                          onChange={e => handleSelectAll(e.target.checked)}
                        />
                        <label className="form-check-label fw-semibold" htmlFor="selectAllLeads" style={{ fontSize: '0.83rem', cursor: 'pointer' }}>
                          Select All ({leads.length})
                        </label>
                      </div>
                    </div>
                  )}
                </div>

                {loadingLeads ? (
                  <div className="text-center py-5">
                    <div className="spinner-border text-primary mb-2" role="status" style={{ width: 36, height: 36 }}></div>
                    <div className="text-muted" style={{ fontSize: '0.85rem' }}>Loading leads...</div>
                  </div>
                ) : leads.length === 0 ? (
                  <div className="text-center py-5" style={{ border: '1px dashed #e2e8f0', borderRadius: '8px', color: '#94a3b8' }}>
                    <i className="fa-solid fa-inbox fa-2x mb-2 d-block"></i>
                    <span style={{ fontSize: '0.88rem' }}>No active leads found for this employee.</span>
                  </div>
                ) : (
                  <div style={{ maxHeight: '340px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                    <table className="table table-hover table-sm mb-0" style={{ fontSize: '0.82rem' }}>
                      <thead className="table-dark" style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                        <tr>
                          <th style={{ width: '44px' }} className="text-center">
                            <input
                              type="checkbox"
                              className="form-check-input"
                              checked={selectAll}
                              onChange={e => handleSelectAll(e.target.checked)}
                            />
                          </th>
                          <th>Company</th>
                          <th>Contact</th>
                          <th>Product</th>
                          <th>Source</th>
                          <th>Status</th>
                          <th>Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {leads.map(lead => {
                          const isSelected = selectedLeadIds.includes(lead._id);
                          return (
                            <tr
                              key={lead._id}
                              style={{
                                cursor: 'pointer',
                                background: isSelected ? 'rgba(99,102,241,0.07)' : undefined,
                                boxShadow: isSelected ? 'inset 3px 0 0 #6366f1' : undefined,
                              }}
                              onClick={() => handleLeadToggle(lead._id, !isSelected)}
                            >
                              <td className="text-center">
                                <input
                                  type="checkbox"
                                  className="form-check-input"
                                  checked={isSelected}
                                  onChange={e => { e.stopPropagation(); handleLeadToggle(lead._id, e.target.checked); }}
                                />
                              </td>
                              <td className="fw-semibold">{lead.SENDER_COMPANY || '—'}</td>
                              <td>{lead.SENDER_NAME || '—'}</td>
                              <td style={{ maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {lead.QUERY_PRODUCT_NAME || '—'}
                              </td>
                              <td><small className="text-muted">{lead.SOURCE || '—'}</small></td>
                              <td>
                                <span className={`badge ${statusBadge(lead.STATUS)}`} style={{ fontSize: '0.68rem' }}>
                                  {lead.STATUS}
                                </span>
                              </td>
                              <td style={{ color: lead.quotation > 0 ? '#15803d' : '#cbd5e1', fontWeight: lead.quotation > 0 ? 700 : 400 }}>
                                {lead.quotation > 0 ? '₹' + Number(lead.quotation).toLocaleString('en-IN') : '—'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-5" style={{ border: '2px dashed #e2e8f0', borderRadius: '10px', color: '#94a3b8' }}>
                <i className="fa-solid fa-people-arrows fa-3x mb-3 d-block" style={{ color: '#c7d2fe' }}></i>
                <p className="fw-bold mb-1" style={{ color: '#64748b' }}>Select a current owner to view their leads</p>
                <small>Choose a Sales & Marketing employee from the "Current Owner" dropdown above</small>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="modal-footer border-0 justify-content-start gap-2">
            <button
              type="button"
              className="btn btn-primary px-4"
              onClick={handleTransfer}
              disabled={transferring || !fromEmployee || !toEmployee || selectedLeadIds.length === 0}
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', border: 'none' }}
            >
              {transferring ? (
                <><span className="spinner-border spinner-border-sm me-2"></span>Transferring...</>
              ) : (
                <>
                  <i className="fa-solid fa-people-arrows me-2"></i>
                  Transfer{selectedLeadIds.length > 0 ? ` (${selectedLeadIds.length}) Lead${selectedLeadIds.length !== 1 ? 's' : ''}` : ' Leads'}
                </>
              )}
            </button>
            <button type="button" className="btn btn-outline-secondary px-4" onClick={onClose}>
              Cancel
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default TransferOwnershipPopUp;