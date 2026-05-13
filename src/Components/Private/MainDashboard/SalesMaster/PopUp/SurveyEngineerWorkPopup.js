import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import axios from 'axios';

const SurveyEngineerWorkPopup = ({ selectedLead, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    status: 'pending',
    surveyDate: '',
    reportFile: null,
    drawingFile: null,
    boqFile: null,
    cancelReason: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [fileNames, setFileNames] = useState({
    reportFile: '',
    drawingFile: '',
    boqFile: ''
  });

  useEffect(() => {
    if (selectedLead?.surveyReport) {
      setFormData({
        status: selectedLead.surveyReport.status || 'pending',
        surveyDate: selectedLead.surveyReport.surveyDate
          ? new Date(selectedLead.surveyReport.surveyDate).toISOString().slice(0, 16)
          : '',
        reportFile: null,
        drawingFile: null,
        boqFile: null,
        cancelReason: selectedLead.surveyReport.cancelReason || ''
      });
    } else if (selectedLead?.surveyDetails?.dateTime) {
      setFormData(prev => ({
        ...prev,
        surveyDate: new Date(selectedLead.surveyDetails.dateTime).toISOString().slice(0, 16)
      }));
    }
  }, [selectedLead]);

  const handleFileChange = (e, fileType) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = {
      reportFile: [
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ],
      drawingFile: ['application/pdf'],
      boqFile: [
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      ]
    };

    const allowedExtensions = {
      reportFile: ['.doc', '.docx'],
      drawingFile: ['.pdf'],
      boqFile: ['.xls', '.xlsx']
    };

    // Check by extension (more reliable than MIME type)
    const fileName = file.name.toLowerCase();
    const fileExt = fileName.substring(fileName.lastIndexOf('.'));
    const isValidExt = allowedExtensions[fileType]?.includes(fileExt);
    const isValidMime = allowedTypes[fileType]?.includes(file.type);

    if (!isValidExt && !isValidMime) {
      const typeLabel = fileType === 'reportFile'
        ? 'Word (.doc, .docx)'
        : fileType === 'drawingFile'
          ? 'PDF (.pdf)'
          : 'Excel (.xls, .xlsx)';
      toast.error(`Invalid file type for ${typeLabel}. Please select a valid file.`);
      e.target.value = ''; // Reset input
      return;
    }

    // Check file size (50MB max)
    if (file.size > 50 * 1024 * 1024) {
      toast.error('File size must be less than 50MB.');
      e.target.value = '';
      return;
    }

    setFormData(prev => ({ ...prev, [fileType]: file }));
    setFileNames(prev => ({ ...prev, [fileType]: file.name }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.status === 'success') {
      if (!formData.reportFile) {
        toast.error('Please upload Survey Report (Word file)');
        return;
      }
      if (!formData.drawingFile) {
        toast.error('Please upload Drawing (PDF file)');
        return;
      }
      if (!formData.boqFile) {
        toast.error('Please upload BOQ (Excel file)');
        return;
      }
    }

    if (formData.status === 'cancelled' && !formData.cancelReason.trim()) {
      toast.error('Please provide a reason for cancellation');
      return;
    }

    setIsLoading(true);

    const submitData = new FormData();
    submitData.append('status', formData.status);
    submitData.append('surveyDate', formData.surveyDate || new Date().toISOString());
    submitData.append('cancelReason', formData.cancelReason || '');

    // ✅ CRITICAL: Append files with correct field names matching multer config
    if (formData.reportFile) {
      submitData.append('reportFile', formData.reportFile);
    }
    if (formData.drawingFile) {
      submitData.append('drawingFile', formData.drawingFile);
    }
    if (formData.boqFile) {
      submitData.append('boqFile', formData.boqFile);
    }

    try {
      const response = await axios.put(
        `${process.env.REACT_APP_API_URL}/api/leads/survey-report/${selectedLead._id}`,
        submitData,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
            // ✅ Do NOT set Content-Type here — axios auto-sets multipart/form-data with boundary
          }
        }
      );

      if (response.data.success) {
        toast.success(response.data.message);
        onSuccess?.();
        onClose();
      } else {
        toast.error(response.data.error || 'Failed to submit survey report');
      }
    } catch (error) {
      console.error('Survey report submit error:', error);
      const msg = error.response?.data?.error
        || error.response?.data?.message
        || error.message
        || 'Failed to submit survey report';
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="modal fade show" style={{
      display: "flex", alignItems: "center", backgroundColor: "#00000090", zIndex: 1070
    }}>
      <div className="modal-dialog modal-lg">
        <div className="modal-content p-3">
          <form onSubmit={handleSubmit}>
            <div className="modal-header">
              <h5 className="card-title fw-bold">
                <i className="fa-solid fa-clipboard-list me-2" style={{ color: '#6366f1' }}></i>
                Survey Report
              </h5>
              <h6 className="text-muted ms-3 mt-2">{selectedLead?.SENDER_COMPANY || 'Lead'}</h6>
              <button onClick={onClose} type="button" className="btn-close"></button>
            </div>

            <div className="modal-body">
              <div className="row g-3">
                {/* Lead Info Summary */}
                <div className="col-12">
                  <div className="p-2 rounded" style={{ background: '#f0f9ff', border: '1px solid #bae6fd' }}>
                    <div className="row">
                      <div className="col-6">
                        <small className="text-muted">Company:</small>
                        <div className="fw-bold" style={{ fontSize: '0.85rem' }}>{selectedLead?.SENDER_COMPANY || '—'}</div>
                      </div>
                      <div className="col-6">
                        <small className="text-muted">Contact:</small>
                        <div style={{ fontSize: '0.85rem' }}>{selectedLead?.SENDER_NAME || '—'} | {selectedLead?.SENDER_MOBILE || '—'}</div>
                      </div>
                      <div className="col-6">
                        <small className="text-muted">Product:</small>
                        <div style={{ fontSize: '0.85rem' }}>{selectedLead?.QUERY_PRODUCT_NAME || '—'}</div>
                      </div>
                      <div className="col-6">
                        <small className="text-muted">Survey Scheduled:</small>
                        <div style={{ fontSize: '0.85rem' }}>
                          {selectedLead?.surveyDetails?.dateTime
                            ? new Date(selectedLead.surveyDetails.dateTime).toLocaleString('en-IN')
                            : 'Not set'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Survey Status */}
                <div className="col-md-6">
                  <label className="form-label fw-bold">Survey Status</label>
                  <div className="d-flex gap-3 mt-2">
                    <div className="form-check">
                      <input className="form-check-input" type="radio" name="status" value="success"
                        checked={formData.status === 'success'}
                        onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))} />
                      <label className="form-check-label text-success fw-bold">✅ Success</label>
                    </div>
                    <div className="form-check">
                      <input className="form-check-input" type="radio" name="status" value="cancelled"
                        checked={formData.status === 'cancelled'}
                        onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))} />
                      <label className="form-check-label text-danger fw-bold">❌ Cancelled</label>
                    </div>
                  </div>
                </div>

                {/* Survey Date */}
                <div className="col-md-6">
                  <label className="form-label fw-bold">Survey Date & Time</label>
                  <input type="datetime-local" className="form-control"
                    value={formData.surveyDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, surveyDate: e.target.value }))} />
                </div>

                {/* File Uploads — only shown for Success status */}
                {formData.status === 'success' && (
                  <>
                    <div className="col-12">
                      <div className="alert alert-info py-2 px-3" style={{ fontSize: '0.82rem' }}>
                        <i className="fa-solid fa-circle-info me-1"></i>
                        Upload all three files: Survey Report (Word), Drawing (PDF), and BOQ (Excel).
                      </div>
                    </div>

                    {/* Report File — Word only */}
                    <div className="col-md-4">
                      <label className="form-label fw-bold">
                        Survey Report <span className="text-danger">*</span>
                      </label>
                      <input
                        type="file"
                        className="form-control"
                        accept=".doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                        onChange={(e) => handleFileChange(e, 'reportFile')}
                      />
                      {fileNames.reportFile && (
                        <small className="text-success d-block mt-1">
                          <i className="fa-solid fa-check-circle me-1"></i>{fileNames.reportFile}
                        </small>
                      )}
                      <small className="text-muted d-block mt-1">Word file only (.doc, .docx)</small>
                    </div>

                    {/* Drawing File — PDF only */}
                    <div className="col-md-4">
                      <label className="form-label fw-bold">
                        Drawing <span className="text-danger">*</span>
                      </label>
                      <input
                        type="file"
                        className="form-control"
                        accept=".pdf,application/pdf"
                        onChange={(e) => handleFileChange(e, 'drawingFile')}
                      />
                      {fileNames.drawingFile && (
                        <small className="text-success d-block mt-1">
                          <i className="fa-solid fa-check-circle me-1"></i>{fileNames.drawingFile}
                        </small>
                      )}
                      <small className="text-muted d-block mt-1">PDF file only</small>
                    </div>

                    {/* BOQ File — Excel only */}
                    <div className="col-md-4">
                      <label className="form-label fw-bold">
                        BOQ <span className="text-danger">*</span>
                      </label>
                      <input
                        type="file"
                        className="form-control"
                        accept=".xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                        onChange={(e) => handleFileChange(e, 'boqFile')}
                      />
                      {fileNames.boqFile && (
                        <small className="text-success d-block mt-1">
                          <i className="fa-solid fa-check-circle me-1"></i>{fileNames.boqFile}
                        </small>
                      )}
                      <small className="text-muted d-block mt-1">Excel file only (.xls, .xlsx)</small>
                    </div>
                  </>
                )}

                {/* Cancellation Reason — only shown for Cancelled status */}
                {formData.status === 'cancelled' && (
                  <div className="col-12">
                    <label className="form-label fw-bold">
                      Cancellation Reason <span className="text-danger">*</span>
                    </label>
                    <textarea
                      className="form-control"
                      rows="4"
                      maxLength="20000"
                      placeholder="Please provide detailed reason for cancellation..."
                      value={formData.cancelReason}
                      onChange={(e) => setFormData(prev => ({ ...prev, cancelReason: e.target.value }))}
                    />
                    <small className="text-muted">{formData.cancelReason.length}/20000 characters</small>
                  </div>
                )}
              </div>
            </div>

            <div className="modal-footer border-0">
              <button type="submit" className="btn btn-primary px-4" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                    Submitting...
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-paper-plane me-1"></i>
                    Submit Survey Report
                  </>
                )}
              </button>
              <button type="button" className="btn btn-outline-secondary px-4" onClick={onClose} disabled={isLoading}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SurveyEngineerWorkPopup;