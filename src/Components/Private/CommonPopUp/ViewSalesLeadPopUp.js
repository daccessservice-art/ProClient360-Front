import React from 'react';

const formatDate = (dateString) => {
  if (!dateString) return "N/A";
  try {
    const options = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  } catch (error) {
    return dateString;
  }
};

const formatCallDate = (dateString) => {
  if (!dateString) return "N/A";
  try {
    const options = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  } catch (error) {
    return dateString;
  }
};

const ViewSalesLeadPopUp = ({ closePopUp, selectedLead }) => {
  if (!selectedLead) {
    return null;
  }

  console.log("Selected Lead Data:", selectedLead);

  const fullAddress = [
    selectedLead.SENDER_ADDRESS,
    selectedLead.SENDER_CITY,
    selectedLead.SENDER_STATE,
    selectedLead.SENDER_PINCODE,
    selectedLead.SENDER_COUNTRY_ISO,
  ]
    .filter(Boolean)
    .join(", ");

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
        <div className="modal-dialog modal-xl modal-dialog-centered">
          <div className="modal-content p-3">
            <div className="modal-header pt-0 border-0">
              <h5 className="card-title fw-bold" id="exampleModalLongTitle">
                <i className="fa-solid fa-eye me-2"></i>
                Sales Lead Details{" "}
                {selectedLead?.SOURCE?.toLowerCase().includes("indiamart") && (
                  <img src="/static/assets/img/Indiamart.png" alt="Indiamart" style={{ height: "40px", marginLeft:"23px" }} />
                )}
                {selectedLead?.SOURCE?.toLowerCase().includes("tradeindia") && (
                  <img src="/static/assets/img/tradeindia.png" alt="TradeIndia" style={{ width: "60px", marginLeft:"23px"}} />
                )}
                {selectedLead?.SOURCE?.toLowerCase().includes("facebook") && (
                  <img src="/static/assets/img/facebook.png" alt="facebook" style={{ height: "40px", marginLeft:"23px" }} />
                )}
                {selectedLead?.SOURCE?.toLowerCase().includes("google") && (
                  <img src="/static/assets/img/google.png" alt="google" style={{ height: "40px", marginLeft:"23px" }} />
                )}
                {selectedLead?.SOURCE?.toLowerCase().includes("linkedin") && (
                  <img src="/static/assets/img/linkedin.png" alt="linkedin" style={{ height: "40px",marginLeft:"23px" }} />
                )}
                {selectedLead?.SOURCE?.toLowerCase().includes("direct") && (
                  <img src="/static/assets/img/nav/DACCESS.png" alt="direct" style={{ height: "40px",marginLeft:"23px" }} />
                )}
              </h5>

              <button
                onClick={closePopUp}
                type="button"
                className="btn-close"
                aria-label="Close"
              ></button>
            </div>
            <div className="modal-body pt-0">
              <div className="row">
                <div className="col-md-6 mb-3">
                  <h6 className="text-muted border-bottom pb-2 mb-3">
                    <i className="fa-solid fa-user me-2"></i>
                    Sender Information
                  </h6>

                  <h6 className="mt-3 d-flex align-items-center gap-2">
                    <span className="fw-bold">Source:</span>

                    {selectedLead?.SOURCE?.toLowerCase() === "indiamart" && (
                      <>
                        <span>IndiaMart</span>
                      </>
                    )}

                    {selectedLead?.SOURCE?.toLowerCase() === "tradeindia" && (
                      <>
                        <span>TradeIndia</span>
                      </>
                    )}

                    {selectedLead?.SOURCE?.toLowerCase() === "facebook" && (
                      <>
                        <span>Facebook</span>
                      </>
                    )}

                    {selectedLead?.SOURCE?.toLowerCase() === "google" && (
                      <>
                        <span>Google</span>
                      </>
                    )}

                    {selectedLead?.SOURCE?.toLowerCase() === "linkedin" && (
                      <>
                        <span>LinkedIn</span>
                      </>
                    )}

                    { selectedLead?.SOURCE.toLowerCase() === "direct" && (
                      <>
                      <span>Direct</span>
                      </>
                    )}

                    {!["indiamart", "tradeindia", "facebook", "google", "linkedin", "direct"].includes(selectedLead?.SOURCE?.toLowerCase()) && (
                      <span>{selectedLead?.SOURCE || "-"}</span>
                    )}

                  </h6>

                  <h6 className='mt-3'>
                    <p className="fw-bold d-inline">Name: </p>
                    {selectedLead?.SENDER_NAME || "-"}
                  </h6>
                  <h6 className="mt-3">
                    <p className="fw-bold d-inline">Company: </p>
                    {selectedLead?.SENDER_COMPANY || "-"}
                  </h6>
                  <h6 className="mt-3">
                    <p className="fw-bold d-inline">Email: </p>
                    {selectedLead?.SENDER_EMAIL || "-"}
                  </h6>
                  <h6 className="mt-3">
                    <p className="fw-bold d-inline">Mobile: </p>
                    {selectedLead?.SENDER_MOBILE || "-"}
                  </h6>
                  <h6 className="mt-3">
                    <p className="fw-bold d-inline">Address: </p>
                    {fullAddress || "-"}
                  </h6>
                </div>

                <div className="col-md-6 mb-3">
                  <h6 className="text-muted border-bottom pb-2 mb-3">
                    <i className="fa-solid fa-clipboard-question me-2"></i>
                    Query Information
                  </h6>
                  <h6>
                    <p className="fw-bold d-inline">Product: </p>
                    {selectedLead?.QUERY_PRODUCT_NAME || "-"}
                  </h6>
                  <h6 className="mt-3">
                    <p className="fw-bold d-inline">Subject: </p>
                    {selectedLead?.SUBJECT || "-"}
                  </h6>
                  <h6 className="mt-3">
                    <p className="fw-bold d-inline">Query Time: </p>
                    {formatDate(selectedLead?.createdAt) || "-"}
                  </h6>

                  <h6 className="mt-3">
                    <p className="fw-bold d-inline">Assigned By: </p>
                    {selectedLead?.assignedBy?.name || "None"}
                  </h6>

                  <h6 className="mt-3">
                    <p className="fw-bold d-inline">Assigned To: </p>
                    {selectedLead?.assignedTo?.name || "None"}
                  </h6>

                  <h6 className="mt-3">
                    <p className="fw-bold d-inline">Status: </p>
                    <span className={`badge ms-2 ${
                      selectedLead?.STATUS === 'Won' ? 'bg-success' :
                      selectedLead?.STATUS === 'Lost' ? 'bg-danger' :
                      selectedLead?.STATUS === 'Ongoing' ? 'bg-primary' :
                      'bg-secondary'
                    }`}>
                      {selectedLead?.STATUS || "-"}
                    </span>
                  </h6>

                  <h6 className="mt-3">
                    <p className="fw-bold d-inline">Current Stage: </p>
                    {selectedLead?.step || "-"}
                  </h6>

                  <h6 className="mt-3">
                    <p className="fw-bold d-inline">Completed: </p>
                    <span className="badge bg-info ms-2">{selectedLead?.complated || 0}%</span>
                  </h6>
                </div>

                <div className="col-12 mt-2">
                  <h6 className="text-muted border-bottom pb-2 mb-2">
                    <i className="fa-solid fa-message me-2"></i>
                    Message
                  </h6>
                  <p className="text-wrap" style={{ whiteSpace: "pre-wrap" }}>
                    {selectedLead?.QUERY_MESSAGE || "No message provided."}
                  </p>
                </div>

                {/* Enhanced Call History Section */}
                {selectedLead?.callHistory && selectedLead.callHistory.length > 0 && (
                  <div className="col-12 mt-4">
                    <h6 className="text-muted border-bottom pb-2 mb-3">
                      <i className="fa-solid fa-phone-volume me-2"></i>
                      Call History 
                      <span className="badge bg-primary ms-2">
                        {selectedLead.callHistory.length} Total Calls
                      </span>
                    </h6>
                    
                    {/* Summary Stats */}
                    <div className="row mb-3">
                      <div className="col-md-4">
                        <div className="card border-info">
                          <div className="card-body py-2">
                            <div className="d-flex justify-content-between align-items-center">
                              <span className="text-muted small">Days with Calls</span>
                              <span className="fw-bold text-info">
                                {[...new Set(selectedLead.callHistory.map(c => c.day))].length}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="col-md-4">
                        <div className="card border-warning">
                          <div className="card-body py-2">
                            <div className="d-flex justify-content-between align-items-center">
                              <span className="text-muted small">Total Attempts</span>
                              <span className="fw-bold text-warning">
                                {selectedLead.callHistory.length}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="col-md-4">
                        <div className="card border-success">
                          <div className="card-body py-2">
                            <div className="d-flex justify-content-between align-items-center">
                              <span className="text-muted small">Answered Calls</span>
                              <span className="fw-bold text-success">
                                {selectedLead.callHistory.filter(c => c.status === 'answered').length}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Group calls by day */}
                    {(() => {
                      const callsByDay = {};
                      selectedLead.callHistory.forEach(call => {
                        if (!callsByDay[call.day]) {
                          callsByDay[call.day] = [];
                        }
                        callsByDay[call.day].push(call);
                      });
                      
                      return Object.keys(callsByDay).sort((a, b) => a - b).map(day => (
                        <div key={day} className="mb-4">
                          <div className="d-flex align-items-center mb-2">
                            <span className="badge bg-primary me-2" style={{ fontSize: '0.9rem' }}>
                              <i className="fa-solid fa-calendar-day me-1"></i>
                              Day {day}
                            </span>
                            <span className="text-muted small">
                              {callsByDay[day].length} attempt{callsByDay[day].length > 1 ? 's' : ''}
                            </span>
                          </div>
                          <div className="table-responsive">
                            <table className="table table-sm table-bordered table-hover">
                              <thead className="table-light">
                                <tr>
                                  <th style={{ width: '100px' }}>Attempt #</th>
                                  <th>Date & Time</th>
                                  <th style={{ width: '120px' }}>Status</th>
                                  <th>Remarks</th>
                                </tr>
                              </thead>
                              <tbody>
                                {callsByDay[day].sort((a, b) => a.attempt - b.attempt).map((call, index) => (
                                  <tr key={index}>
                                    <td className="text-center fw-bold">
                                      <i className="fa-solid fa-phone me-1 text-primary"></i>
                                      Call {call.attempt}
                                    </td>
                                    <td>
                                      <i className="fa-regular fa-clock me-1 text-muted"></i>
                                      {formatCallDate(call.date)}
                                    </td>
                                    <td>
                                      <span className={`badge w-100 ${call.status === 'answered' ? 'bg-success' : 'bg-warning'}`}>
                                        {call.status === 'answered' ? (
                                          <>
                                            <i className="fa-solid fa-check me-1"></i>
                                            Answered
                                          </>
                                        ) : (
                                          <>
                                            <i className="fa-solid fa-phone-slash me-1"></i>
                                            Attempted
                                          </>
                                        )}
                                      </span>
                                    </td>
                                    <td className="text-muted">
                                      {call.remarks || '-'}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ));
                    })()}
                    
                    {/* Warning for 9 calls */}
                    {selectedLead.callHistory.length >= 9 && (
                      <div className="alert alert-danger d-flex align-items-center mt-3">
                        <i className="fa-solid fa-exclamation-triangle me-3" style={{ fontSize: '1.5rem' }}></i>
                        <div>
                          <strong>Maximum Call Attempts Reached</strong>
                          <p className="mb-0 small">
                            This lead has been called for 3 days with 3 attempts each day (9 total calls) 
                            and should be marked as Call Unanswered or Not Feasible.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Show message if no call history */}
                {(!selectedLead?.callHistory || selectedLead.callHistory.length === 0) && (
                  <div className="col-12 mt-3">
                    <div className="alert alert-secondary">
                      <i className="fa-solid fa-info-circle me-2"></i>
                      No call attempts have been recorded for this lead yet.
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ViewSalesLeadPopUp;