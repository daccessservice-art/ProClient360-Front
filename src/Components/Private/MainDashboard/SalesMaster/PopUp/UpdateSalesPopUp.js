import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { RequiredStar } from '../../../RequiredStar/RequiredStar';
import useUpdateLead from '../../../../../hooks/leads/useUpdateLead';
import { ObjectId } from 'bson';
import Select from 'react-select';
import axios from 'axios';

const actionOptions = [
  '1. Call Not Connect/ Callback',
  '2. Requirement Understanding',
  '3. Site Visit',
  '4. Online Demo',
  '5. Proof of Concept (POC)',
  '6. Documentation & Planning',
  '7. Quotation Submission',
  '8. Quotation Discussion',
  '9. Follow-Up Call',
  '10. Negotiation Call',
  '11. Negotiation Meetings',
  '12. Deal Status',
  '15. Not Feasible'
];

const callLeadsOptions = ['Hot Leads', 'Warm Leads', 'Cold Leads', 'Invalid Leads'];

const amountSteps = [
  '7. Quotation Submission',
  '8. Quotation Discussion',
  '10. Negotiation Call',
  '11. Negotiation Meetings',
];

const sourceOptions = [
  'Direct', 'IndiaMart', 'TradeIndia', 'Google', 'Tender', 'Exhibitions',
  'JustDial', 'Facebook', 'LinkedIn', 'Twitter', 'YouTube', 'WhatsApp',
  'Referral', 'Email Campaign', 'Cold Call', 'Website', 'Walk-In', 'Other'
];

// Survey Engineer Select Component
const SurveyEngineerSelect = ({ selectedEngineer, onEngineerChange, disabled }) => {
  const [employeeOptions, setEmployeeOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadAllEmployees = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/employee/all`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      
      let employees = [];
      if (response.data.success) {
        employees = response.data.employees || response.data.data || [];
      } else if (Array.isArray(response.data)) {
        employees = response.data;
      } else if (response.data.employees) {
        employees = response.data.employees;
      }
      
      if (employees && employees.length > 0) {
        const options = employees.map(emp => ({ 
          value: emp._id, 
          label: `${emp.name}${emp.department?.name ? ` (${emp.department.name})` : ''}${emp.role ? ` - ${emp.role}` : ''}` 
        }));
        setEmployeeOptions(options);
      } else {
        setEmployeeOptions([]);
      }
    } catch (error) {
      console.error('Error loading employees:', error);
      setEmployeeOptions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllEmployees();
  }, []);

  return (
    <div className="mb-3">
      <label className="form-label fw-bold">Assign to Survey Engineer</label>
      <Select
        options={employeeOptions}
        value={selectedEngineer}
        onChange={onEngineerChange}
        isLoading={loading}
        placeholder={loading ? "Loading employees..." : "Select Employee for Survey..."}
        isClearable
        isDisabled={disabled || loading}
        noOptionsMessage={() => loading ? "Loading..." : "No employees found"}
        styles={{
          control: (provided) => ({
            ...provided,
            borderRadius: 0,
            borderColor: '#ced4da',
            fontSize: '14px',
          })
        }}
      />
      <small className="text-muted">Assign this lead to any employee for site survey</small>
    </div>
  );
};

/* Editable Sender Information */
const EditableSenderInfo = ({ senderInfo, onSenderChange }) => {
  return (
    <div className="row">
      <div className="col-md-6 mb-3">
        <h6 className="text-muted border-bottom pb-2 mb-3">
          <i className="fa-solid fa-user-pen me-2" style={{ color: '#6366f1' }}></i>
          Sender Information <small className="text-primary">(Editable)</small>
        </h6>

        <div className="mb-2">
          <label className="form-label fw-bold" style={{ fontSize: '0.82rem' }}>Source</label>
          <select className="form-select form-select-sm" value={senderInfo.source}
            onChange={(e) => onSenderChange('source', e.target.value)}>
            <option value="">Select Source...</option>
            {sourceOptions.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div className="mb-2">
          <label className="form-label fw-bold" style={{ fontSize: '0.82rem' }}>Name</label>
          <input type="text" className="form-control form-control-sm" value={senderInfo.name}
            onChange={(e) => onSenderChange('name', e.target.value)} placeholder="Contact Name"
            maxLength={50} />
        </div>

        <div className="mb-2">
          <label className="form-label fw-bold" style={{ fontSize: '0.82rem' }}>Company</label>
          <input type="text" className="form-control form-control-sm" value={senderInfo.company}
            onChange={(e) => onSenderChange('company', e.target.value)} placeholder="Company Name" maxLength={100} />
        </div>

        <div className="mb-2">
          <label className="form-label fw-bold" style={{ fontSize: '0.82rem' }}>Email</label>
          <input type="email" className="form-control form-control-sm" value={senderInfo.email}
            onChange={(e) => onSenderChange('email', e.target.value)} placeholder="Email ID" maxLength={100} />
        </div>

        <div className="mb-2">
          <label className="form-label fw-bold" style={{ fontSize: '0.82rem' }}>Mobile</label>
          <input type="tel" className="form-control form-control-sm" value={senderInfo.mobile}
            onChange={(e) => { const val = e.target.value.replace(/[^0-9]/g, ''); onSenderChange('mobile', val); }}
            placeholder="Mobile Number" maxLength={10} inputMode="numeric" />
        </div>
      </div>

      <div className="col-md-6 mb-3">
        <h6 className="text-muted border-bottom pb-2 mb-3">
          <i className="fa-solid fa-location-dot me-2" style={{ color: '#6366f1' }}></i>
          Address <small className="text-primary">(Editable)</small>
        </h6>

        <div className="mb-2">
          <label className="form-label fw-bold" style={{ fontSize: '0.82rem' }}>Address</label>
          <textarea className="form-control form-control-sm" rows="2" value={senderInfo.address}
            onChange={(e) => onSenderChange('address', e.target.value)} placeholder="Full Address" maxLength={500} />
        </div>

        <div className="row g-2 mb-2">
          <div className="col-6">
            <label className="form-label fw-bold" style={{ fontSize: '0.82rem' }}>City</label>
            <input type="text" className="form-control form-control-sm" value={senderInfo.city}
              onChange={(e) => onSenderChange('city', e.target.value)} placeholder="City" maxLength={50} />
          </div>
          <div className="col-6">
            <label className="form-label fw-bold" style={{ fontSize: '0.82rem' }}>State</label>
            <input type="text" className="form-control form-control-sm" value={senderInfo.state}
              onChange={(e) => onSenderChange('state', e.target.value)} placeholder="State" maxLength={50} />
          </div>
        </div>

        <div className="row g-2 mb-2">
          <div className="col-6">
            <label className="form-label fw-bold" style={{ fontSize: '0.82rem' }}>Pincode</label>
            <input type="text" className="form-control form-control-sm" value={senderInfo.pincode}
              onChange={(e) => { const val = e.target.value.replace(/[^0-9]/g, ''); onSenderChange('pincode', val); }}
              placeholder="Pincode" maxLength={6} inputMode="numeric" />
          </div>
          <div className="col-6">
            <label className="form-label fw-bold" style={{ fontSize: '0.82rem' }}>Country</label>
            <input type="text" className="form-control form-control-sm" value={senderInfo.country}
              onChange={(e) => onSenderChange('country', e.target.value)} placeholder="Country" maxLength={50} />
          </div>
        </div>

        <div className="mt-3 p-2 rounded" style={{ background: '#eff6ff', border: '1px solid #bfdbfe' }}>
          <small style={{ fontSize: '0.75rem', color: '#1d4ed8' }}>
            <i className="fa-solid fa-info-circle me-1"></i>
            Edit any field above — changes saved on <strong>Submit</strong>.
          </small>
        </div>
      </div>
    </div>
  );
};

/* Read-only Query Information */
const QueryInfoView = ({ lead }) => {
  if (!lead) return null;

  const fmtDate = (d) => {
    if (!d) return "N/A";
    try { return new Date(d).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }); }
    catch { return d; }
  };

  const fmtAssignedTime = (d) => {
    if (!d) return "N/A";
    try { return new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }); }
    catch { return d; }
  };

  return (
    <div className="row">
      <div className="col-md-6 mb-2">
        <h6 className="fw-bold" style={{ fontSize: '0.85rem' }}>
          <span className="fw-bold d-inline" style={{ color: '#1e293b' }}>Product: </span>
          <span style={{ color: '#3b82f6' }}>{lead.QUERY_PRODUCT_NAME || "—"}</span>
        </h6>
        <h6 className="fw-bold mt-2" style={{ fontSize: '0.85rem' }}>
          <span className="fw-bold d-inline" style={{ color: '#1e293b' }}>Subject: </span>
          {lead.SUBJECT || "—"}
        </h6>
        <h6 className="fw-bold mt-2" style={{ fontSize: '0.85rem' }}>
          <span className="fw-bold d-inline" style={{ color: '#1e293b' }}>Query Time: </span>
          {fmtDate(lead.createdAt)}
        </h6>
        <h6 className="fw-bold mt-2" style={{ fontSize: '0.85rem' }}>
          <span className="fw-bold d-inline" style={{ color: '#1e293b' }}>Assigned By: </span>
          {lead.assignedBy?.name || "Unknown"}
        </h6>
      </div>
      <div className="col-md-6 mb-2">
        <h6 className="fw-bold" style={{ fontSize: '0.85rem' }}>
          <span className="fw-bold d-inline" style={{ color: '#1e293b' }}>Assigned To: </span>
          {lead.assignedTo?.name || "Unknown"}
        </h6>
        <h6 className="fw-bold mt-2" style={{ fontSize: '0.85rem' }}>
          <span className="fw-bold d-inline" style={{ color: '#1e293b' }}>Assigned Time: </span>
          {fmtAssignedTime(lead.assignedTime)}
        </h6>
        <h6 className="fw-bold mt-2" style={{ fontSize: '0.85rem' }}>
          <span className="fw-bold d-inline" style={{ color: '#1e293b' }}>Status: </span>
          <span className={
            lead.STATUS === 'Won' ? 'badge bg-success' :
            lead.STATUS === 'Lost' ? 'badge bg-danger' :
            lead.STATUS === 'Ongoing' ? 'badge bg-primary' :
            'badge bg-warning text-dark'
          }>{lead.STATUS || "—"}</span>
        </h6>
        <h6 className="fw-bold mt-2" style={{ fontSize: '0.85rem' }}>
          <span className="fw-bold d-inline" style={{ color: '#1e293b' }}>Current Stage: </span>
          {lead.step || "—"}
        </h6>
      </div>
      <div className="col-md-6 mb-2">
        <h6 className="fw-bold mt-2" style={{ fontSize: '0.85rem' }}>
          <span className="fw-bold d-inline" style={{ color: '#1e293b' }}>Completed: </span>
          {lead.complated || "0"}%
        </h6>
        <h6 className="fw-bold mt-2" style={{ fontSize: '0.85rem' }}>
          <span className="fw-bold d-inline" style={{ color: '#1e293b' }}>Won Amount: </span>
          <span style={{ color: '#15803d', fontWeight: 700 }}>
            {lead.quotation > 0 ? '₹' + Number(lead.quotation).toLocaleString('en-IN') : "—"}
          </span>
        </h6>
      </div>
      <div className="col-md-6 mb-2">
        <h6 className="fw-bold mt-2" style={{ fontSize: '0.85rem' }}>
          <span className="fw-bold d-inline" style={{ color: '#1e293b' }}>Remark: </span>
          {lead.rem || "—"}
        </h6>
      </div>
      <div className="col-12 mt-2">
        <h6 className="text-muted bg-white border-bottom pb-2 mb-2 rounded-4 px-3" style={{ fontSize: '0.85rem' }}>Message</h6>
        <p className="text-wrap" style={{ whiteSpace: "pre-wrap", fontSize: '0.84rem', color: '#334155' }}>
          {lead.QUERY_MESSAGE || "No message provided."}
        </p>
      </div>
    </div>
  );
};

/* MAIN UPDATE POPUP */
const UpdateSalesPopUp = ({ selectedLead, onUpdate, onClose, isCompany }) => {
  const [showInfo, setShowInfo] = useState(isCompany);
  const [isLoading, setIsLoading] = useState(false);
  const [actionData, setActionData] = useState({
    actionType: '', date: '', completion: '', status: '', quotation: '', rem: '', callLeads: ''
  });

  const [assignedSurveyEngineer, setAssignedSurveyEngineer] = useState(null);

  const [senderInfo, setSenderInfo] = useState({
    source: '', name: '', company: '', email: '', mobile: '',
    address: '', city: '', state: '', pincode: '', country: '', subject: '',
  });

  const [additionalFields, setAdditionalFields] = useState({
    projectSize: '',
    requirementType: '',
    requirementMode: '',
    surveyNeeded: '',
    surveyDateTime: '',
    communicatePerson: '',
    communicateEmail: '',
    communicateContact: ''
  });

  const [previousActions, setPreviousActions] = useState([]);
  const useUpdate = useUpdateLead();

  const handleSenderChange = (field, value) => {
    setSenderInfo(prev => ({ ...prev, [field]: value }));
  };

  const handleAdditionalFieldChange = (field, value) => {
    setAdditionalFields(prev => ({ ...prev, [field]: value }));
  };

  useEffect(() => {
    if (selectedLead) {
      if (selectedLead.STATUS === 'Won' || selectedLead.STATUS === 'Lost') {
        toast.error(`Cannot update a lead with status "${selectedLead.STATUS}".`);
        onClose();
        return;
      }

      setActionData({
        actionType: selectedLead?.actionDetails?.step || selectedLead?.step || '',
        date: selectedLead?.actionDetails?.followUpDate || selectedLead?.nextFollowUpDate || '',
        completion: selectedLead?.complated?.toString() || selectedLead?.actionDetails?.completionPercentage?.toString() || '0',
        status: selectedLead.status || selectedLead?.STATUS || '',
        quotation: selectedLead?.quotation?.toString() || selectedLead?.actionDetails?.quotation?.toString() || '0',
        rem: selectedLead?.rem || selectedLead?.actionDetails?.rem || '',
        callLeads: selectedLead?.callLeads || ''
      });

      setSenderInfo({
        source: selectedLead.SOURCE || '',
        name: selectedLead.SENDER_NAME || '',
        company: selectedLead.SENDER_COMPANY || '',
        email: selectedLead.SENDER_EMAIL || '',
        mobile: selectedLead.SENDER_MOBILE || '',
        address: selectedLead.SENDER_ADDRESS || '',
        city: selectedLead.SENDER_CITY || '',
        state: selectedLead.SENDER_STATE || '',
        pincode: selectedLead.SENDER_PINCODE || '',
        country: selectedLead.SENDER_COUNTRY_ISO || '',
        subject: selectedLead.SUBJECT || '',
      });

      setAdditionalFields({
        projectSize: selectedLead.projectSize || '',
        requirementType: selectedLead.requirementType || '',
        requirementMode: selectedLead.requirementMode || '',
        surveyNeeded: selectedLead.surveyNeeded || '',
        surveyDateTime: selectedLead.surveyDetails?.dateTime ? new Date(selectedLead.surveyDetails.dateTime).toISOString().slice(0, 16) : '',
        communicatePerson: selectedLead.surveyDetails?.communicatePerson || '',
        communicateEmail: selectedLead.surveyDetails?.communicateEmail || '',
        communicateContact: selectedLead.surveyDetails?.communicateContact || ''
      });

      setAssignedSurveyEngineer(selectedLead.assignedSurveyEngineer ? 
        { value: selectedLead.assignedSurveyEngineer._id, label: selectedLead.assignedSurveyEngineer.name } : null);

      let actions = [];
      if (selectedLead.previousActions && selectedLead.previousActions.length > 0) {
        actions = [...selectedLead.previousActions];
      } else if (selectedLead.actionHistory && selectedLead.actionHistory.length > 0) {
        actions = [...selectedLead.actionHistory];
      }
      if (actions.length === 0) {
        const initialAction = {
          _id: new ObjectId(),
          status: selectedLead.status || selectedLead?.STATUS || 'Pending',
          step: selectedLead.step || 'Initial',
          nextFollowUpDate: selectedLead.nextFollowUpDate || null,
          rem: selectedLead.rem || '',
          completion: selectedLead.complated || 0,
          quotation: selectedLead.quotation || 0,
          createdAt: selectedLead.createdAt || new Date().toISOString(),
          actionBy: { name: selectedLead.assignedTo?.name || "System" }
        };
        actions.push(initialAction);
      }
      actions.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      setPreviousActions(actions);
    }
  }, [selectedLead, onClose]);

  const handleActionChange = (e) => {
    const { name, value } = e.target;
    if (name === 'status') {
      if (value === 'Won') { setActionData(prev => ({ ...prev, [name]: value, completion: '100', actionType: '12. Deal Status' })); }
      else if (value === 'Lost') { setActionData(prev => ({ ...prev, [name]: value, completion: '100', actionType: '15. Not Feasible' })); }
      else { setActionData(prev => ({ ...prev, [name]: value })); }
    } else if (name === 'completion') {
      if (/^\d{0,3}(\.\d{0,2})?$/.test(value)) {
        const num = parseFloat(value);
        if (value === "" || (num >= 0 && num <= 100)) { setActionData(prev => ({ ...prev, [name]: value })); }
      }
    } else if (name === 'quotation') {
      if (/^\d*\.?\d*$/.test(value)) { setActionData(prev => ({ ...prev, [name]: value })); }
    } else {
      setActionData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleActionSubmit = async (e) => {
    e.preventDefault();

    let requiredFields = ['status'];
    if (actionData.status === 'Won') { requiredFields.push('quotation', 'rem'); }
    else if (actionData.status === 'Lost') { requiredFields.push('rem'); }
    else {
      requiredFields.push('actionType', 'date', 'completion');
      if (actionData.actionType === '7. Quotation Submission') { requiredFields.push('quotation'); }
    }

    const hasEmptyRequiredField = requiredFields.some(field => !actionData[field]);
    if (hasEmptyRequiredField) { toast.error('Please fill in all required fields.'); return; }

    const updatedFormData = {
      status: actionData.status,
      step: actionData.actionType,
      complated: actionData.completion ? parseFloat(actionData.completion) : 0,
      nextFollowUpDate: actionData.date ? new Date(actionData.date).toISOString() : null,
      quotation: actionData.quotation ? parseFloat(actionData.quotation) : 0,
      rem: actionData.rem || '',
      callLeads: actionData.callLeads || 'Warm Leads',
      projectSize: additionalFields.projectSize && additionalFields.projectSize.trim() !== '' ? additionalFields.projectSize : null,
      requirementType: additionalFields.requirementType && additionalFields.requirementType.trim() !== '' ? additionalFields.requirementType : null,
      requirementMode: additionalFields.requirementMode && additionalFields.requirementMode.trim() !== '' ? additionalFields.requirementMode : null,
      surveyNeeded: additionalFields.surveyNeeded && additionalFields.surveyNeeded.trim() !== '' ? additionalFields.surveyNeeded : null,
      surveyDetails: {
        dateTime: additionalFields.surveyDateTime ? new Date(additionalFields.surveyDateTime) : null,
        communicatePerson: additionalFields.communicatePerson,
        communicateEmail: additionalFields.communicateEmail,
        communicateContact: additionalFields.communicateContact
      },
      assignedSurveyEngineer: assignedSurveyEngineer ? assignedSurveyEngineer.value : null,
      surveyEngineerAssignedAt: assignedSurveyEngineer ? new Date() : null,
      surveyEngineerAssignedBy: assignedSurveyEngineer ? selectedLead.assignedTo?._id : null
    };

    const newAction = {
      _id: new ObjectId(),
      status: actionData.status,
      step: actionData.actionType,
      nextFollowUpDate: actionData.date,
      rem: actionData.rem || '',
      completion: actionData.completion ? parseFloat(actionData.completion) : 0,
      quotation: actionData.quotation ? parseFloat(actionData.quotation) : 0,
      callLeads: actionData.callLeads || 'Warm Leads',
      actionBy: { name: "Current User" },
      createdAt: new Date().toISOString()
    };

    const updatedPreviousActions = [...previousActions, newAction];
    updatedPreviousActions.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    setPreviousActions(updatedPreviousActions);

    const formDataWithHistory = {
      ...updatedFormData,
      previousActions: updatedPreviousActions,
      SOURCE: senderInfo.source,
      SENDER_NAME: senderInfo.name,
      SENDER_COMPANY: senderInfo.company,
      SENDER_EMAIL: senderInfo.email,
      SENDER_MOBILE: senderInfo.mobile,
      SENDER_ADDRESS: senderInfo.address,
      SENDER_CITY: senderInfo.city,
      SENDER_STATE: senderInfo.state,
      SENDER_PINCODE: senderInfo.pincode,
      SENDER_COUNTRY_ISO: senderInfo.country,
      SUBJECT: senderInfo.subject,
    };

    setIsLoading(true);
    try {
      await useUpdate.updateLead(selectedLead?._id, formDataWithHistory);
      onUpdate(selectedLead._id, formDataWithHistory);
      onClose();
    } catch (error) {
      toast.error('Failed to update lead: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDateForDisplay = (dateString) => {
    if (!dateString) return "N/A";
    try { return new Date(dateString).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' }); }
    catch { return dateString; }
  };

  return (
    <div className="modal fade show" style={{
      display: "flex", alignItems: "flex-start", backgroundColor: "#00000050", zIndex: 1070,
      paddingTop: '40px', paddingBottom: '40px',
    }}>
      <div className="modal-dialog modal-xl" style={{ maxWidth: '960px', width: '96%' }}>
        <div className="modal-content p-3">
          <form onSubmit={handleActionSubmit}>
            <div className="modal-header">
              <h5 className="card-title fw-bold mb-0">
                <i className="fa-solid fa-pen-to-square me-2" style={{ color: '#6366f1' }}></i>
                Submit Work
              </h5>
              <div className="d-flex align-items-center ms-auto gap-2">
                <button
                  type="button"
                  className={`btn btn-sm d-flex align-items-center gap-1 ${showInfo ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => setShowInfo(!showInfo)}
                >
                  <i className={`fa-solid ${showInfo ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                  {showInfo ? "Hide Info" : "Show Info"}
                </button>
                <button onClick={onClose} type="button" className="btn-close" aria-label="Close"></button>
              </div>
            </div>

            <div className="modal-body" style={{ maxHeight: '55vh', overflowY: 'auto' }}>
              {/* Project Details & Survey Requirements */}
              <div className="mb-4 border rounded p-3" style={{ backgroundColor: '#f9fafb' }}>
                <h6 className="fw-bold mb-3" style={{ color: '#1e40af' }}>
                  <i className="fa-solid fa-clipboard-list me-2"></i>
                  Project & Survey Details
                </h6>
                <div className="row g-3">
                  <div className="col-md-4">
                    <label className="form-label fw-bold">Project Size</label>
                    <select 
                      className="form-select" 
                      value={additionalFields.projectSize || ''}
                      onChange={(e) => handleAdditionalFieldChange('projectSize', e.target.value)}
                    >
                      <option value="">Select Size...</option>
                      <option value="big">Big</option>
                      <option value="medium">Medium</option>
                      <option value="small">Small</option>
                    </select>
                  </div>

                  <div className="col-md-4">
                    <label className="form-label fw-bold">Requirement Type</label>
                    <div className="d-flex gap-3 mt-2">
                      <div className="form-check">
                        <input 
                          className="form-check-input" 
                          type="radio" 
                          name="requirementType" 
                          value="survey"
                          checked={additionalFields.requirementType === 'survey'}
                          onChange={(e) => handleAdditionalFieldChange('requirementType', e.target.value)}
                        />
                        <label className="form-check-label">Survey</label>
                      </div>
                      <div className="form-check">
                        <input 
                          className="form-check-input" 
                          type="radio" 
                          name="requirementType" 
                          value="demo"
                          checked={additionalFields.requirementType === 'demo'}
                          onChange={(e) => handleAdditionalFieldChange('requirementType', e.target.value)}
                        />
                        <label className="form-check-label">Demo</label>
                      </div>
                    </div>
                  </div>

                  <div className="col-md-4">
                    <label className="form-label fw-bold">Mode</label>
                    <div className="d-flex gap-3 mt-2">
                      <div className="form-check">
                        <input 
                          className="form-check-input" 
                          type="radio" 
                          name="requirementMode" 
                          value="online"
                          disabled={!additionalFields.requirementType}
                          checked={additionalFields.requirementMode === 'online'}
                          onChange={(e) => handleAdditionalFieldChange('requirementMode', e.target.value)}
                        />
                        <label className="form-check-label">Online</label>
                      </div>
                      <div className="form-check">
                        <input 
                          className="form-check-input" 
                          type="radio" 
                          name="requirementMode" 
                          value="offline"
                          disabled={!additionalFields.requirementType}
                          checked={additionalFields.requirementMode === 'offline'}
                          onChange={(e) => handleAdditionalFieldChange('requirementMode', e.target.value)}
                        />
                        <label className="form-check-label">Offline</label>
                      </div>
                    </div>
                  </div>

                  <div className="col-md-12">
                    <label className="form-label fw-bold">Survey Needed?</label>
                    <div className="d-flex gap-3 mt-2">
                      <div className="form-check">
                        <input 
                          className="form-check-input" 
                          type="radio" 
                          name="surveyNeeded" 
                          value="yes"
                          checked={additionalFields.surveyNeeded === 'yes'}
                          onChange={(e) => handleAdditionalFieldChange('surveyNeeded', e.target.value)}
                        />
                        <label className="form-check-label">Yes</label>
                      </div>
                      <div className="form-check">
                        <input 
                          className="form-check-input" 
                          type="radio" 
                          name="surveyNeeded" 
                          value="no"
                          checked={additionalFields.surveyNeeded === 'no'}
                          onChange={(e) => handleAdditionalFieldChange('surveyNeeded', e.target.value)}
                        />
                        <label className="form-check-label">No</label>
                      </div>
                    </div>
                  </div>

                  {additionalFields.surveyNeeded === 'yes' && (
                    <>
                      <div className="col-md-6">
                        <label className="form-label fw-bold">Survey Date & Time</label>
                        <input 
                          type="datetime-local" 
                          className="form-control"
                          value={additionalFields.surveyDateTime}
                          onChange={(e) => handleAdditionalFieldChange('surveyDateTime', e.target.value)}
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label fw-bold">Communicate Person Name</label>
                        <input 
                          type="text" 
                          className="form-control"
                          placeholder="Enter person name"
                          value={additionalFields.communicatePerson}
                          onChange={(e) => handleAdditionalFieldChange('communicatePerson', e.target.value)}
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label fw-bold">Communicate Email</label>
                        <input 
                          type="email" 
                          className="form-control"
                          placeholder="Enter email address"
                          value={additionalFields.communicateEmail}
                          onChange={(e) => handleAdditionalFieldChange('communicateEmail', e.target.value)}
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label fw-bold">Communicate Contact Number</label>
                        <input 
                          type="tel" 
                          className="form-control"
                          placeholder="Enter contact number"
                          value={additionalFields.communicateContact}
                          onChange={(e) => handleAdditionalFieldChange('communicateContact', e.target.value)}
                        />
                      </div>
                      <div className="col-12">
                        <SurveyEngineerSelect 
                          selectedEngineer={assignedSurveyEngineer}
                          onEngineerChange={setAssignedSurveyEngineer}
                          disabled={false}
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Sender Info & Query Info */}
              {showInfo && (
                <>
                  <EditableSenderInfo
                    senderInfo={senderInfo}
                    onSenderChange={handleSenderChange}
                  />
                  <hr style={{ margin: '16px 0 12px 0', borderColor: '#e2e8f0' }} />
                  <div style={{
                    background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px',
                    padding: '14px 18px', marginBottom: '8px',
                  }}>
                    <h6 className="text-muted border-bottom pb-2 mb-3" style={{ fontSize: '0.9rem' }}>
                      <i className="fa-solid fa-circle-info me-2" style={{ color: '#0ea5e9' }}></i>
                      Query Information
                    </h6>
                    <QueryInfoView lead={selectedLead} />
                  </div>
                </>
              )}

              {/* Work Data */}
              {!isCompany && (
                <div className={`text-muted border-top ${showInfo ? 'pt-3 mt-2' : 'pt-0 mt-0'} pb-2 mb-3`}>
                  <h5>
                    <i className="fa-solid fa-briefcase me-2" style={{ color: '#f59e0b' }}></i>
                    Work Data
                  </h5>
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label htmlFor="status" className="form-label fw-bold">Status<RequiredStar /></label>
                      <select id="status" className="form-select" name="status" onChange={handleActionChange} value={actionData.status} required>
                        <option value="" disabled>-- Select a status --</option>
                        <option value="Pending">Pending</option>
                        <option value="Ongoing">Ongoing</option>
                        <option value="Won">Won</option>
                        <option value="Lost">Lost</option>
                      </select>
                    </div>

                    {actionData.status !== 'Won' && actionData.status !== 'Lost' && (
                      <div className="col-md-6">
                        <label htmlFor="actionType" className="form-label fw-bold">Steps<RequiredStar /></label>
                        <select id="actionType" name="actionType" className="form-select" value={actionData.actionType} onChange={handleActionChange} required>
                          <option value="" disabled>-- Select an action --</option>
                          {actionOptions.map((action, index) => (
                            <option key={index} value={action}>{action}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div className="col-md-6">
                      <label htmlFor="callLeads" className="form-label fw-bold">Leads (Optional)</label>
                      <select id="callLeads" name="callLeads" className="form-select" value={actionData.callLeads} onChange={handleActionChange}>
                        <option value="">Select Leads....</option>
                        {callLeadsOptions.map((lead, index) => (
                          <option key={index} value={lead}>{lead}</option>
                        ))}
                      </select>
                    </div>

                    {actionData.status !== 'Won' && actionData.status !== 'Lost' && (
                      <div className="col-md-6">
                        <label htmlFor="completion" className="form-label fw-bold">Status (%)<RequiredStar /></label>
                        <input type="text" className="form-control" id="completion" name="completion"
                          placeholder="Enter work completion %" maxLength={6} value={actionData.completion}
                          onChange={handleActionChange} required />
                      </div>
                    )}

                    {actionData.status === 'Won' && (
                      <div className="col-md-6">
                        <label htmlFor="quotation" className="form-label fw-bold">Amount Show (₹)<RequiredStar /></label>
                        <input type="text" className="form-control" id="quotation" name="quotation"
                          placeholder="Enter quotation amount" value={actionData.quotation}
                          onChange={handleActionChange} required />
                      </div>
                    )}

                    {actionData.status !== 'Won' && actionData.status !== 'Lost' &&
                      amountSteps.includes(actionData.actionType) && (
                      <div className="col-md-6">
                        <label htmlFor="quotation" className="form-label fw-bold">
                          Amount Show (₹)
                          {actionData.actionType === '7. Quotation Submission' && <RequiredStar />}
                        </label>
                        <input type="text" className="form-control" id="quotation" name="quotation"
                          placeholder="Enter quotation amount" value={actionData.quotation}
                          onChange={handleActionChange}
                          required={actionData.actionType === '7. Quotation Submission'} />
                      </div>
                    )}

                    {actionData.status !== 'Won' && actionData.status !== 'Lost' && (
                      <div className="col-md-6">
                        <label htmlFor="date" className="form-label fw-bold">Next Follow-up Date<RequiredStar /></label>
                        <input id="date" type="datetime-local" className="form-control" name="date"
                          value={actionData.date || ''} onChange={handleActionChange}
                          min={new Date().toISOString().slice(0, 16)} required />
                      </div>
                    )}

                    <div className="col-12">
                      <label htmlFor="rem" className="form-label fw-bold">
                        Remark
                        {(actionData.status === 'Won' || actionData.status === 'Lost') && <RequiredStar />}
                      </label>
                      {actionData.status === 'Lost' && (
                        <div className="alert alert-danger py-1 px-2 mb-1" style={{ fontSize: '0.78rem' }}>
                          <i className="fa-solid fa-circle-exclamation me-1"></i>
                          Lost reason is <strong>required</strong>.
                        </div>
                      )}
                      <textarea id="rem" name="rem"
                        className={`form-control ${actionData.status === 'Lost' ? 'border-danger' : ''}`}
                        placeholder={
                          actionData.status === 'Lost'
                            ? 'Required: Why was this deal lost?'
                            : actionData.status === 'Won'
                            ? 'Required: Describe how the deal was won.'
                            : 'Enter your remarks here...'
                        }
                        rows="3" value={actionData.rem} onChange={handleActionChange}
                        required={actionData.status === 'Won' || actionData.status === 'Lost'} />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer border-0 justify-content-start mt-3">
              <button type="submit" className="btn addbtn rounded-0 add_button px-4" disabled={isLoading}>
                {isLoading ? 'Submitting...' : 'Submit'}
              </button>
              <button type="button" onClick={onClose} className="btn addbtn rounded-0 Cancel_button px-4">Cancel</button>
            </div>

            {previousActions.length > 0 && (
              <div className="px-3">
                <h6 className="text-muted border-bottom pb-2 mb-3">Action History</h6>
                <div className="table-responsive" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                  <table className="table table-sm table-hover">
                    <thead className="sticky-top bg-light">
                      <tr>
                        <th scope="col" className="text-center">Sr.No</th>
                        <th scope="col">Status</th>
                        <th scope="col">Steps</th>
                        <th scope="col" className="text-center">Completion</th>
                        <th scope="col">Next Follow-up Date</th>
                        <th scope="col">Remark</th>
                        <th scope="col">Quotation</th>
                        <th scope="col">Leads</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previousActions.map((action, index) => (
                        <tr key={action._id || index}>
                          <td className="text-center">{index + 1}</td>
                          <td>
                            <span className={
                              action.status === 'Won' ? 'badge bg-success' :
                              action.status === 'Lost' ? 'badge bg-danger' :
                              action.status === 'Ongoing' ? 'badge bg-primary' :
                              'badge bg-warning'
                            }>{action.status}</span>
                          </td>
                          <td>{action.step}</td>
                          <td className="text-center">{action.completion}%</td>
                          <td>{formatDateForDisplay(action.nextFollowUpDate)}</td>
                          <td>{action.rem}</td>
                          <td>₹{action.quotation || 0}</td>
                          <td>{action.callLeads || 'Warm Leads'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default UpdateSalesPopUp;