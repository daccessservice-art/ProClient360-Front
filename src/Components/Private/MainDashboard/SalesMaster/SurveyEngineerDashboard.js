import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Header } from "../Header/Header";
import { Sidebar } from "../Sidebar/Sidebar";
import SurveyEngineerWorkPopup from './PopUp/SurveyEngineerWorkPopup';
import { UserContext } from "../../../../context/UserContext";
import { useContext } from "react";

const SurveyEngineerDashboard = () => {
  const [isopen, setIsOpen] = useState(false);
  const toggle = () => setIsOpen(!isopen);
  const { user } = useContext(UserContext);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [showSurveyPopup, setShowSurveyPopup] = useState(false);
  const [showHistoryPopup, setShowHistoryPopup] = useState(false);
  const [historyLead, setHistoryLead] = useState(null);
  const [activeCard, setActiveCard] = useState('pending');
  const [downloadingFile, setDownloadingFile] = useState(null);

  const fetchMySurveyLeads = async () => {
    setLoading(true);
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/leads/my-survey-leads`,
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      if (response.data.success) {
        setLeads(response.data.leads);
      } else {
        setLeads([]);
      }
    } catch (error) {
      console.error('Error fetching survey leads:', error);
      toast.error('Failed to fetch assigned leads');
      setLeads([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMySurveyLeads();
  }, []);

  // ✅ KEY FIX: Download file through authenticated API route
  // This works on Render/production because it goes through Express
  // which reads the file from disk and streams it back.
  const handleDownloadFile = async (leadId, fileType, fileName) => {
    const key = `${leadId}_${fileType}`;
    setDownloadingFile(key);
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/leads/survey-file/${leadId}/${fileType}`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
          responseType: 'blob', // ← critical: get binary file data
        }
      );

      // Create blob URL and trigger download
      const blob = new Blob([response.data]);
      const url  = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href  = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success(`${fileName} downloaded!`);
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download file. Please try again.');
    } finally {
      setDownloadingFile(null);
    }
  };

  const handleSurveyWork = (lead) => {
    setSelectedLead(lead);
    setShowSurveyPopup(true);
  };

  const handleSurveySuccess = () => {
    fetchMySurveyLeads();
    setShowSurveyPopup(false);
    setSelectedLead(null);
  };

  const handleShowHistory = (lead) => {
    setHistoryLead(lead);
    setShowHistoryPopup(true);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleDateString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric'
      });
    } catch { return "N/A"; }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true
      });
    } catch { return "N/A"; }
  };

  const getSurveyReportStatusBadge = (lead) => {
    const status = lead.surveyReport?.status;
    if (status === 'success')   return <span className="badge bg-success">Completed</span>;
    if (status === 'cancelled') return <span className="badge bg-danger">Cancelled</span>;
    return <span className="badge bg-warning text-dark">Pending</span>;
  };

  const getSurveyNeededBadge = (lead) => {
    if (lead.surveyNeeded === 'yes') return <span className="badge bg-primary">Survey Required</span>;
    if (lead.surveyNeeded === 'no')  return <span className="badge bg-secondary">Not Required</span>;
    return <span className="badge bg-light text-dark border">—</span>;
  };

  const isPending = (lead) => {
    const s = lead.surveyReport?.status;
    return !s || s === 'pending';
  };

  // ✅ Document buttons component — reused in table and history popup
  const DocumentButtons = ({ lead, compact = false }) => {
    if (lead.surveyReport?.status !== 'success') return null;

    const files = [
      {
        type:     'reportFile',
        label:    'Report',
        fileName: 'Survey_Report.docx',
        color:    'primary',
        icon:     'fa-file-word',
      },
      {
        type:     'drawingFile',
        label:    'Drawing',
        fileName: 'Drawing.pdf',
        color:    'danger',
        icon:     'fa-file-pdf',
      },
      {
        type:     'boqFile',
        label:    'BOQ',
        fileName: 'BOQ.xlsx',
        color:    'success',
        icon:     'fa-file-excel',
      },
    ];

    const hasAnyFile = files.some(f => lead.surveyReport?.[f.type]);
    if (!hasAnyFile) return <small className="text-muted">No files</small>;

    return (
      <div className={`d-flex ${compact ? 'flex-column' : 'flex-wrap'} gap-1`}>
        {files.map(f => {
          if (!lead.surveyReport?.[f.type]) return null;
          const key = `${lead._id}_${f.type}`;
          const isDownloading = downloadingFile === key;
          return (
            <button
              key={f.type}
              className={`btn btn-${f.color} btn-sm`}
              style={{ fontSize: compact ? '0.68rem' : '0.72rem', padding: compact ? '3px 7px' : '4px 10px' }}
              onClick={() => handleDownloadFile(lead._id, f.type, f.fileName)}
              disabled={isDownloading}
              title={`Download ${f.label}`}
            >
              {isDownloading
                ? <span className="spinner-border spinner-border-sm me-1" style={{ width: '10px', height: '10px' }}></span>
                : <i className={`fa-solid ${f.icon} me-1`}></i>
              }
              {f.label}
            </button>
          );
        })}
      </div>
    );
  };

  const counts = {
    all:       leads.length,
    pending:   leads.filter(l => isPending(l)).length,
    completed: leads.filter(l => l.surveyReport?.status === 'success').length,
    cancelled: leads.filter(l => l.surveyReport?.status === 'cancelled').length,
  };

  const filteredLeads = leads.filter(lead => {
    if (activeCard === 'all')       return true;
    if (activeCard === 'pending')   return isPending(lead);
    if (activeCard === 'completed') return lead.surveyReport?.status === 'success';
    if (activeCard === 'cancelled') return lead.surveyReport?.status === 'cancelled';
    return true;
  });

  return (
    <>
      {loading && (<div className="overlay"><span className="loader"></span></div>)}

      <div className="container-scroller">
        <div className="row background_main_all">
          <Header toggle={toggle} isopen={isopen} />
          <div className="container-fluid page-body-wrapper">
            <Sidebar isopen={isopen} active="SurveyEngineerDashboard" />
            <div className="main-panel" style={{ width: isopen ? "" : "calc(100% - 120px)", marginLeft: isopen ? "" : "125px" }}>
              <div className="content-wrapper ps-3 ps-md-0 pt-3">

                {/* Header */}
                <div className="row px-2 py-1 mb-3">
                  <div className="col-12 col-lg-6">
                    <h5 className="text-white py-2">
                      <i className="fa-solid fa-clipboard-list me-2"></i>
                      My Survey Assignments
                    </h5>
                    <p className="text-white-50 small mb-0">Leads assigned to you for site survey</p>
                  </div>
                  <div className="col-12 col-lg-6 d-flex align-items-center justify-content-end gap-2 pe-4">
                    <button className="btn btn-outline-light btn-sm" onClick={fetchMySurveyLeads} title="Refresh">
                      <i className="fa-solid fa-refresh me-1"></i> Refresh
                    </button>
                  </div>
                </div>

                {/* Stats Cards */}
                <div className="row mb-4 px-2">
                  {[
                    { key: 'all',       label: 'Total Assigned', color: 'primary', icon: 'fa-list',         textDark: false },
                    { key: 'pending',   label: 'Pending',        color: 'warning', icon: 'fa-clock',        textDark: true  },
                    { key: 'completed', label: 'Completed',      color: 'success', icon: 'fa-check-circle', textDark: false },
                    { key: 'cancelled', label: 'Cancelled',      color: 'danger',  icon: 'fa-ban',          textDark: false },
                  ].map(card => (
                    <div className="col-md-3 col-6 mb-2" key={card.key}>
                      <div
                        className={`card bg-${card.color} ${card.textDark ? 'text-dark' : 'text-white'}`}
                        onClick={() => setActiveCard(card.key)}
                        style={{
                          cursor: 'pointer',
                          border: activeCard === card.key ? '3px solid #fff' : '3px solid transparent',
                          boxShadow: activeCard === card.key ? '0 0 16px rgba(0,0,0,0.3)' : '0 2px 10px rgba(0,0,0,0.1)',
                          transition: 'all 0.2s',
                          transform: activeCard === card.key ? 'scale(1.03)' : 'scale(1)',
                          borderRadius: '10px',
                        }}
                      >
                        <div className="card-body py-3">
                          <div className="d-flex justify-content-between align-items-center">
                            <div>
                              <div style={{ fontSize: '0.8rem', fontWeight: 600, opacity: 0.85 }}>{card.label}</div>
                              <h3 className="mb-0 fw-bold">{counts[card.key]}</h3>
                            </div>
                            <i className={`fa-solid ${card.icon}`} style={{ fontSize: '1.8rem', opacity: 0.4 }}></i>
                          </div>
                          {activeCard === card.key && (
                            <div style={{ fontSize: '0.7rem', marginTop: '4px', opacity: 0.85 }}>
                              <i className="fa-solid fa-filter me-1"></i>Filtered
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Active filter label */}
                {activeCard !== 'all' && (
                  <div className="px-3 mb-2 d-flex align-items-center gap-2">
                    <span className="badge bg-secondary">
                      Showing: {activeCard.charAt(0).toUpperCase() + activeCard.slice(1)} ({filteredLeads.length})
                    </span>
                    <button className="btn btn-sm btn-outline-secondary" onClick={() => setActiveCard('all')}>
                      <i className="fa-solid fa-times me-1"></i>Clear Filter
                    </button>
                  </div>
                )}

                {/* Leads Table */}
                <div className="row bg-white p-3 m-1 border rounded shadow-sm">
                  <div className="col-12">
                    {loading ? (
                      <div className="text-center py-5">
                        <div className="spinner-border text-primary mb-3" role="status"></div>
                        <div className="text-muted">Loading your assigned leads...</div>
                      </div>
                    ) : filteredLeads.length === 0 ? (
                      <div className="text-center py-5">
                        <i className="fa-solid fa-inbox fa-3x text-muted mb-3"></i>
                        <h5 className="text-muted">No Leads Found</h5>
                        <p className="text-muted">
                          {activeCard === 'pending'   ? "No pending survey leads. All done!" :
                           activeCard === 'all'       ? "You don't have any leads assigned for survey." :
                           `No ${activeCard} survey leads found.`}
                        </p>
                        {activeCard !== 'all' && (
                          <button className="btn btn-outline-primary btn-sm" onClick={() => setActiveCard('all')}>
                            Show All Leads
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="table-responsive">
                        <table className="table table-hover table-striped">
                          <thead className="table-dark">
                            <tr>
                              <th style={{ width: '45px' }}>SR.</th>
                              <th style={{ minWidth: '180px' }}>Company / Contact</th>
                              <th style={{ minWidth: '150px' }}>Product</th>
                              <th style={{ minWidth: '140px' }}>Sales Employee</th>
                              <th style={{ width: '150px' }}>Assigned At</th>
                              <th style={{ width: '120px' }}>Survey Date</th>
                              <th style={{ width: '100px' }}>Project Size</th>
                              <th style={{ width: '110px' }}>Survey Needed</th>
                              <th style={{ width: '110px' }}>Report Status</th>
                              <th style={{ width: '160px' }}>Documents</th>
                              <th className="text-center" style={{ width: '120px' }}>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredLeads.map((lead, index) => (
                              <tr key={lead._id}>
                                <td>{index + 1}</td>
                                <td>
                                  <strong>{lead.SENDER_COMPANY || '—'}</strong><br />
                                  <small className="text-muted">{lead.SENDER_NAME || '—'}</small><br />
                                  <small className="text-muted">{lead.SENDER_MOBILE || '—'}</small>
                                </td>
                                <td>
                                  <span>{lead.QUERY_PRODUCT_NAME || '—'}</span><br />
                                  <small className="text-muted">{lead.SOURCE || '—'}</small>
                                </td>
                                <td>
                                  <span className="fw-bold text-primary">
                                    <i className="fa-solid fa-user me-1" style={{ fontSize: '0.75rem' }}></i>
                                    {lead.assignedTo?.name || '—'}
                                  </span><br />
                                  <small className="text-muted">By: {lead.assignedBy?.name || '—'}</small>
                                </td>
                                <td>
                                  <small className="text-muted">{formatDateTime(lead.surveyEngineerAssignedAt)}</small>
                                </td>
                                <td>
                                  <small>
                                    {lead.surveyDetails?.dateTime
                                      ? formatDate(lead.surveyDetails.dateTime)
                                      : <span className="text-danger">Not scheduled</span>}
                                  </small>
                                </td>
                                <td>
                                  {lead.projectSize ? (
                                    <span className={`badge ${
                                      lead.projectSize === 'big'    ? 'bg-danger' :
                                      lead.projectSize === 'medium' ? 'bg-warning text-dark' :
                                                                      'bg-info text-dark'
                                    }`}>
                                      {lead.projectSize.charAt(0).toUpperCase() + lead.projectSize.slice(1)}
                                    </span>
                                  ) : '—'}
                                </td>
                                <td>{getSurveyNeededBadge(lead)}</td>
                                <td>{getSurveyReportStatusBadge(lead)}</td>

                                {/* ✅ Documents — download via API route */}
                                <td>
                                  {lead.surveyReport?.status === 'success'
                                    ? <DocumentButtons lead={lead} compact={true} />
                                    : lead.surveyReport?.status === 'cancelled'
                                    ? <small className="text-danger"><i className="fa-solid fa-ban me-1"></i>Cancelled</small>
                                    : <small className="text-muted">—</small>
                                  }
                                </td>

                                <td className="text-center">
                                  <div className="btn-group" role="group">
                                    <button
                                      className="btn btn-sm btn-outline-secondary"
                                      onClick={() => handleShowHistory(lead)}
                                      title="View Work History">
                                      <i className="fa-solid fa-history"></i>
                                    </button>
                                    {isPending(lead) ? (
                                      <button
                                        className="btn btn-sm btn-primary"
                                        onClick={() => handleSurveyWork(lead)}
                                        title="Submit Survey Report">
                                        <i className="fa-solid fa-clipboard-list me-1"></i>Submit
                                      </button>
                                    ) : lead.surveyReport?.status === 'success' ? (
                                      <button className="btn btn-sm btn-success" disabled>
                                        <i className="fa-solid fa-check me-1"></i>Done
                                      </button>
                                    ) : (
                                      <button className="btn btn-sm btn-secondary" disabled>
                                        <i className="fa-solid fa-ban me-1"></i>Cancelled
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Survey Work Popup */}
      {showSurveyPopup && selectedLead && (
        <SurveyEngineerWorkPopup
          selectedLead={selectedLead}
          onClose={() => { setShowSurveyPopup(false); setSelectedLead(null); }}
          onSuccess={handleSurveySuccess}
        />
      )}

      {/* History Popup */}
      {showHistoryPopup && historyLead && (
        <div className="modal fade show" style={{ display: 'flex', alignItems: 'center', backgroundColor: '#00000090', zIndex: 1080 }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content p-3">
              <div className="modal-header">
                <h5 className="fw-bold mb-0">
                  <i className="fa-solid fa-history me-2 text-primary"></i>
                  Work History — {historyLead.SENDER_COMPANY || 'Lead'}
                </h5>
                <button className="btn-close" onClick={() => { setShowHistoryPopup(false); setHistoryLead(null); }}></button>
              </div>
              <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>

                {/* Lead Summary */}
                <div className="p-2 mb-3 rounded" style={{ background: '#f0f9ff', border: '1px solid #bae6fd' }}>
                  <div className="row">
                    <div className="col-6">
                      <small className="text-muted">Sales Employee:</small>
                      <div className="fw-bold">{historyLead.assignedTo?.name || '—'}</div>
                    </div>
                    <div className="col-6">
                      <small className="text-muted">Survey Assigned At:</small>
                      <div className="fw-bold">{formatDateTime(historyLead.surveyEngineerAssignedAt)}</div>
                    </div>
                    <div className="col-6 mt-2">
                      <small className="text-muted">Product:</small>
                      <div>{historyLead.QUERY_PRODUCT_NAME || '—'}</div>
                    </div>
                    <div className="col-6 mt-2">
                      <small className="text-muted">Survey Scheduled:</small>
                      <div>
                        {historyLead.surveyDetails?.dateTime
                          ? formatDateTime(historyLead.surveyDetails.dateTime)
                          : <span className="text-danger">Not scheduled</span>}
                      </div>
                    </div>
                  </div>
                </div>

                {/* ✅ Documents section in history popup */}
                {historyLead.surveyReport?.status === 'success' && (
                  <div className="mb-3">
                    <h6 className="fw-bold mb-2 border-bottom pb-2">
                      <i className="fa-solid fa-folder-open me-2 text-success"></i>
                      Survey Documents
                    </h6>
                    <div className="p-3 rounded" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                      <DocumentButtons lead={historyLead} compact={false} />
                      <small className="text-muted d-block mt-2">
                        <i className="fa-solid fa-clock me-1"></i>
                        Submitted: {formatDateTime(historyLead.surveyReport.submittedAt)}
                      </small>
                    </div>
                  </div>
                )}

                {/* Cancellation info */}
                {historyLead.surveyReport?.status === 'cancelled' && (
                  <div className="mb-3">
                    <h6 className="fw-bold mb-2 border-bottom pb-2">
                      <i className="fa-solid fa-ban me-2 text-danger"></i>
                      Cancellation Details
                    </h6>
                    <div className="p-3 rounded" style={{ background: '#fef2f2', border: '1px solid #fecaca' }}>
                      <div className="d-flex align-items-center gap-2 mb-2">
                        <span className="badge bg-danger">Cancelled</span>
                        <small className="text-muted">{formatDateTime(historyLead.surveyReport.submittedAt)}</small>
                      </div>
                      {historyLead.surveyReport.cancelReason && (
                        <div style={{ fontSize: '0.85rem', color: '#7f1d1d', whiteSpace: 'pre-wrap' }}>
                          <strong>Reason:</strong> {historyLead.surveyReport.cancelReason}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Action History */}
                <h6 className="fw-bold mb-2 border-bottom pb-2">
                  <i className="fa-solid fa-timeline me-2 text-primary"></i>
                  Action History
                </h6>
                {historyLead.previousActions?.length > 0 ? (
                  <div className="table-responsive">
                    <table className="table table-sm table-striped">
                      <thead className="table-dark">
                        <tr>
                          <th>#</th>
                          <th>Status</th>
                          <th>Step</th>
                          <th>Completion</th>
                          <th>Remark</th>
                          <th>By</th>
                          <th>Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...historyLead.previousActions]
                          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                          .map((action, idx) => (
                            <tr key={action._id || idx}>
                              <td>{idx + 1}</td>
                              <td>
                                <span className={`badge ${
                                  action.status === 'Won'     ? 'bg-success' :
                                  action.status === 'Lost'    ? 'bg-danger'  :
                                  action.status === 'Ongoing' ? 'bg-primary' : 'bg-warning text-dark'
                                }`}>{action.status}</span>
                              </td>
                              <td style={{ fontSize: '0.8rem' }}>{action.step || '—'}</td>
                              <td>{action.completion || 0}%</td>
                              <td style={{ fontSize: '0.8rem', maxWidth: '200px' }}>{action.rem || '—'}</td>
                              <td style={{ fontSize: '0.8rem' }}>{action.actionBy?.name || '—'}</td>
                              <td style={{ fontSize: '0.75rem' }}>{formatDateTime(action.createdAt)}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center text-muted py-3">
                    <i className="fa-solid fa-inbox me-2"></i>No action history found.
                  </div>
                )}

              </div>
              <div className="modal-footer border-0">
                <button className="btn btn-outline-secondary"
                  onClick={() => { setShowHistoryPopup(false); setHistoryLead(null); }}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .table th { border-top: none; font-weight: 600; font-size: .875rem; white-space: nowrap; }
        .table td { vertical-align: middle; font-size: .875rem; }
        .card { border-radius: 10px; }
        .btn-group .btn { padding: .25rem .5rem; font-size: .75rem; }
      `}</style>
    </>
  );
};

export default SurveyEngineerDashboard;