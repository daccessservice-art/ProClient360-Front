import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { RequiredStar } from '../../../RequiredStar/RequiredStar';
import useUpdateLead from '../../../../../hooks/leads/useUpdateLead';
import { ObjectId } from 'bson';

const LeadInfoView = ({ selectedLead, actionData }) => {
  if (!selectedLead) {
    return null;
  }

  const formatDate = (dateString) => {  
    if (!dateString) return "N/A";
    try {
      const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
      return new Date(dateString).toLocaleDateString('en-IN', options);
    } catch (error) {
      return dateString;
    }
  };

  const fullAddress = [
    selectedLead.SENDER_ADDRESS,
    selectedLead.SENDER_CITY,
    selectedLead.SENDER_STATE,
    selectedLead.SENDER_PINCODE,
    selectedLead.SENDER_COUNTRY_ISO,
  ].filter(Boolean).join(", ");

  return (
    <div className="row">
      <div className="col-md-6 mb-3">
        <h6 className="text-muted border-bottom pb-2 mb-3">Sender Information</h6>

        <h6 className="mt-3 d-flex align-items-center">
          <span className="fw-bold me-2">Source:</span>

          {selectedLead?.SOURCE?.toLowerCase() === "indiamart" && (
            <span>
              <img src="/static/assets/img/indiamart.png" alt="Indiamart" style={{ height: "40px", marginLeft: "10px" }} />
            </span>
          )}

          {selectedLead?.SOURCE?.toLowerCase() === "tradeindia" && (
            <span>
              <img src="/static/assets/img/tradeindia.png" alt="TradeIndia" style={{ height: "40px", marginLeft: "10px" }} />
            </span>
          )}

          {selectedLead?.SOURCE?.toLowerCase() === "facebook" && (
            <span>
              <img src="/static/assets/img/facebook.png" alt="Facebook" style={{ height: "40px", marginLeft: "10px" }} />
            </span>
          )}

          {selectedLead?.SOURCE?.toLowerCase() === "google" && (
            <span>
              <img src="/static/assets/img/google.png" alt="Google" style={{ height: "40px", marginLeft: "10px" }} />
            </span>
          )}

          {selectedLead?.SOURCE?.toLowerCase() === "linkedin" && (
            <span>
              <img src="/static/assets/img/linkedin.png" alt="LinkedIn" style={{ height: "40px", marginLeft: "10px" }} />
            </span>
          )}

          {selectedLead?.SOURCE?.toLowerCase() === "direct" && (
            <span>
              <img src="/static/assets/img/nav/DACCESS.png" alt="direct" style={{ height: "40px", marginLeft: "10px" }} />
            </span>
          )}

          {!["indiamart", "tradeindia", "facebook", "google", "linkedin", "direct"].includes(selectedLead?.SOURCE?.toLowerCase()) && (
            <span>{selectedLead?.SOURCE || "-"}</span>
          )}
        </h6>

        <h6 className='mt-3'><p className="fw-bold d-inline">Name: </p>{selectedLead?.SENDER_NAME || "-"}</h6>
        <h6 className="mt-3"><p className="fw-bold d-inline">Company: </p>{selectedLead?.SENDER_COMPANY || "-"}</h6>
        <h6 className="mt-3"><p className="fw-bold d-inline">Email: </p>{selectedLead?.SENDER_EMAIL || "-"}</h6>
        <h6 className="mt-3"><p className="fw-bold d-inline">Mobile: </p>{selectedLead?.SENDER_MOBILE || "-"}</h6>
        <h6 className="mt-3"><p className="fw-bold d-inline">Address: </p>{fullAddress || "-"}</h6>
      </div>

      <div className="col-md-6 mb-3">
        <h6 className="text-muted border-bottom pb-2 mb-3">Query Information</h6>
        <h6><p className="fw-bold d-inline">Product: </p>{selectedLead?.QUERY_PRODUCT_NAME || "-"}</h6>
        <h6 className="mt-3"><p className="fw-bold d-inline">Subject: </p>{selectedLead?.SUBJECT || "-"}</h6>
        <h6 className="mt-3"><p className="fw-bold d-inline">Query Time: </p>{formatDate(selectedLead?.createdAt) || "-"}</h6>
        <h6 className="mt-3"><p className="fw-bold d-inline">Assigned By: </p>{selectedLead?.assignedBy?.name || "Unknown"}</h6> 
        <h6 className="mt-3"><p className="fw-bold d-inline">Assigned To: </p>{selectedLead?.assignedTo?.name || "Unknown"}</h6>
        <h6 className="mt-3"><p className="fw-bold d-inline">Status: </p>{selectedLead?.STATUS || "-"}</h6>
        <h6 className="mt-3"><p className="fw-bold d-inline">Completion: </p>{selectedLead?.complated || "0"}%</h6>
        <h6 className="mt-3"><p className="fw-bold d-inline">Quotation Amount: </p>₹{selectedLead?.quotation || " "}</h6>
        <h6 className="mt-3"><p className="fw-bold d-inline">Next Follow-up Date: </p>{formatDate(selectedLead?.nextFollowUpDate) || "Not set"}</h6>
        <h6 className="mt-3"><p className="fw-bold d-inline">Remark: </p>{selectedLead?.rem || " "}</h6>
      </div>

      <div className="col-12 mt-2">
        <h6 className="text-muted bg-white border-bottom pb-2 mb-2 rounded-4 px-4">Message</h6>
        <p className="text-wrap" style={{ whiteSpace: "pre-wrap" }}>{selectedLead?.QUERY_MESSAGE || "No message provided."}</p>
      </div>
    </div>
  );
};

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

const callLeadsOptions = [
  'Hot Leads',
  'Warm Leads',
  'Cold Leads',
  'Invalid Leads'
];

// Steps that show the Amount field
const amountSteps = [
  '7. Quotation Submission',
  '8. Quotation Discussion',
  '10. Negotiation Call',
  '11. Negotiation Meetings',
];

const UpdateSalesPopUp = ({ selectedLead, onUpdate, onClose, isCompany }) => {
  const [showInfo, setShowInfo] = useState(isCompany);
  const [isLoading, setIsLoading] = useState(false);
  const [actionData, setActionData] = useState({
    actionType: '', 
    date: '', 
    completion: '', 
    status: '', 
    quotation: '',
    rem: '',
    callLeads: ''
  });
  
  const [previousActions, setPreviousActions] = useState([]);

  const useUpdate = useUpdateLead();

  useEffect(() => {
    if (selectedLead) {
      if (selectedLead.STATUS === 'Won' || selectedLead.STATUS === 'Lost') {
        toast.error(`Cannot update a lead with status "${selectedLead.STATUS}". This lead is already finalized.`);
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
      
      let actions = [];
      
      if (selectedLead.previousActions && selectedLead.previousActions.length > 0) {
        actions = [...selectedLead.previousActions];
      } 
      else if (selectedLead.actionHistory && selectedLead.actionHistory.length > 0) {
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
          actionBy: {
            name: selectedLead.assignedTo?.name || "System"
          }
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
      if (value === 'Won') {
        setActionData(prev => ({ 
          ...prev, 
          [name]: value,
          completion: '100',
          actionType: '12. Deal Status'
        }));
      } 
      else if (value === 'Lost') {
        setActionData(prev => ({ 
          ...prev, 
          [name]: value,
          completion: '100',
          actionType: '15. Not Feasible'
        }));
      }
      else {
        setActionData(prev => ({ ...prev, [name]: value }));
      }
    } 
    else if (name === 'completion') {
      if (/^\d{0,3}(\.\d{0,2})?$/.test(value)) {
        const num = parseFloat(value);
        if (value === "" || (num >= 0 && num <= 100)) {
          setActionData(prev => ({ ...prev, [name]: value }));
        }
      }
    } else if (name === 'quotation') {
      if (/^\d*\.?\d*$/.test(value)) {
        setActionData(prev => ({ ...prev, [name]: value }));
      }
    } else {
      setActionData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleActionSubmit = async (e) => {
    e.preventDefault();
    
    let requiredFields = ['status'];
    
    if (actionData.status === 'Won') {
      requiredFields.push('quotation', 'rem');
    }
    else if (actionData.status === 'Lost') {
      requiredFields.push('rem');
    }
    else {
      requiredFields.push('actionType', 'date', 'completion');
      if (actionData.actionType === '7. Quotation Submission') {
        requiredFields.push('quotation');
      }
    }
    
    const hasEmptyRequiredField = requiredFields.some(field => !actionData[field]);
    
    if (hasEmptyRequiredField) {
      toast.error('Please fill in all required fields.');
      return;
    }

    const updatedFormData = {
      status: actionData.status,
      step: actionData.actionType,
      complated: actionData.completion ? parseFloat(actionData.completion) : 0,
      nextFollowUpDate: actionData.date ? new Date(actionData.date).toISOString() : null,
      quotation: actionData.quotation ? parseFloat(actionData.quotation) : 0,
      rem: actionData.rem || '',
      callLeads: actionData.callLeads || 'Warm Leads'
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
      actionBy: {
        name: "Current User"
      },
      createdAt: new Date().toISOString()
    };

    const updatedPreviousActions = [...previousActions, newAction];
    updatedPreviousActions.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    
    setPreviousActions(updatedPreviousActions);
    
    const formDataWithHistory = {
      ...updatedFormData,
      previousActions: updatedPreviousActions
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
    try {
      const options = { year: 'numeric', month: 'short', day: 'numeric' };
      return new Date(dateString).toLocaleDateString('en-IN', options);
    } catch (error) {
      return dateString;
    }
  };

  return (
    <div className="modal fade show" style={{
      display: "flex", alignItems: "center", backgroundColor: "#00000050", zIndex: 1070,
    }}>
      <div className="modal-dialog modal-lg" style={{ maxWidth: '680px' }}>
        <div className="modal-content p-3">
          <form onSubmit={handleActionSubmit}>

            <div className="modal-header">
              <h5 className="card-title fw-bold mb-0">Submit Work</h5>

              <div className="d-flex align-items-center ms-auto">
                <button
                  onClick={onClose}
                  type="button"
                  className="btn-close"
                  aria-label="Close"
                ></button>
              </div>
            </div>

            {!isCompany && (
              <button
                type="button"
                className="btn btn-sm rounded-0 btn-outline-success d-flex align-items-center ms-auto me-4 justify-content-end"
                onClick={() => setShowInfo(!showInfo)}
              >
                {showInfo ? "Hide Info" : "Show Info"}
              </button>
            )}

            <div className="modal-body" style={{ maxHeight: '45vh', overflowY: 'auto' }}>
              {showInfo && <LeadInfoView selectedLead={selectedLead} actionData={actionData} />}
              
              {!isCompany && (
                <>
                  <div className={`text-muted border-top pb-2 mb-3 ${showInfo ? 'pt-3 mt-4' : 'pt-0 mt-0'}`}>
                    <h5>Work Data</h5>
                    <div className="row g-3">
                      <div className="col-md-6">
                        <label htmlFor="status" className="form-label fw-bold">Status<RequiredStar /></label>
                        <select 
                          id="status" 
                          className="form-select bg_edit" 
                          name="status" 
                          onChange={handleActionChange} 
                          value={actionData.status} 
                          required
                        >
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
                          <select 
                            id="actionType" 
                            name="actionType" 
                            className="form-select" 
                            value={actionData.actionType} 
                            onChange={handleActionChange} 
                            required
                          >
                            <option value="" disabled>-- Select an action --</option>
                            {actionOptions.map((action, index) => (
                              <option key={index} value={action}>{action}</option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* Leads Field - Optional */}
                      <div className="col-md-6">
                        <label htmlFor="callLeads" className="form-label fw-bold">Leads (Optional)</label>
                        <select 
                          id="callLeads" 
                          name="callLeads" 
                          className="form-select" 
                          value={actionData.callLeads} 
                          onChange={handleActionChange}
                        >
                          <option value="">Select Leads....</option>
                          {callLeadsOptions.map((lead, index) => (
                            <option key={index} value={lead}>{lead}</option>
                          ))}
                        </select>
                      </div>

                      {actionData.status !== 'Won' && actionData.status !== 'Lost' && (
                        <div className="col-md-6">
                          <label htmlFor="completion" className="form-label fw-bold">Status (%)<RequiredStar /></label>
                          <input 
                            type="text" 
                            className="form-control" 
                            id="completion" 
                            name="completion" 
                            placeholder="Enter work completion %" 
                            maxLength={6} 
                            value={actionData.completion} 
                            onChange={handleActionChange} 
                            required
                          />
                        </div>
                      )}

                      {/* Amount field for Won status — required */}
                      {actionData.status === 'Won' && (
                        <div className="col-md-6">
                          <label htmlFor="quotation" className="form-label fw-bold">Amount Show (₹)<RequiredStar /></label>
                          <input 
                            type="text" 
                            className="form-control" 
                            id="quotation" 
                            name="quotation" 
                            placeholder="Enter quotation amount" 
                            value={actionData.quotation}
                            onChange={handleActionChange} 
                            required 
                          />
                        </div>
                      )}

                      {/* Amount field for Quotation Submission (required),
                          Quotation Discussion, Negotiation Call, Negotiation Meetings (optional) */}
                      {actionData.status !== 'Won' && actionData.status !== 'Lost' &&
                        amountSteps.includes(actionData.actionType) && (
                        <div className="col-md-6">
                          <label htmlFor="quotation" className="form-label fw-bold">
                            Amount Show (₹)
                            {actionData.actionType === '7. Quotation Submission' && <RequiredStar />}
                          </label>
                          <input 
                            type="text" 
                            className="form-control" 
                            id="quotation" 
                            name="quotation" 
                            placeholder="Enter quotation amount" 
                            value={actionData.quotation}
                            onChange={handleActionChange}
                            required={actionData.actionType === '7. Quotation Submission'}
                          />
                        </div>
                      )}

                      {actionData.status !== 'Won' && actionData.status !== 'Lost' && (
                        <div className="col-md-6">
                          <label htmlFor="date" className="form-label fw-bold">Next Follow-up Date<RequiredStar /></label>
                          <input 
  id="date" 
  type="datetime-local" 
  className="form-control bg_edit" 
  name="date" 
  value={actionData.date || ''} 
  onChange={handleActionChange}
  min={new Date().toISOString().slice(0, 16)}
  required
/>
                        </div>
                      )}

                      <div className="col-12">
                        <label htmlFor="remark" className="form-label fw-bold">
                          Remark
                          {(actionData.status === 'Won' || actionData.status === 'Lost') && <RequiredStar />}
                        </label>
                        <textarea 
                          id="rem" 
                          name="rem"
                          className="form-control" 
                          placeholder="Enter your remarks here..."
                          rows="3"
                          value={actionData.rem} 
                          onChange={handleActionChange}
                          required={actionData.status === 'Won' || actionData.status === 'Lost'}
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="modal-footer border-0 justify-content-start mt-3">
              <button 
                type="submit" 
                className="btn addbtn rounded-0 add_button px-4" 
                disabled={isLoading}
              >
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
                              action.status === 'Won'
                                ? 'badge bg-success'
                                : action.status === 'Lost'
                                ? 'badge bg-danger'
                                : action.status === 'Ongoing'
                                ? 'badge bg-primary'
                                : 'badge bg-warning'
                            }>
                              {action.status}
                            </span>
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