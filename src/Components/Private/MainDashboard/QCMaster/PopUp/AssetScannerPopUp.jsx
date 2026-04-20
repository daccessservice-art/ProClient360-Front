// Components/Private/MainDashboard/QCMaster/PopUp/AssetScannerPopUp.jsx
import { useState, useEffect, useRef } from "react";
import toast from "react-hot-toast";
import { getAssetByQR, updateAssetStatus } from "../../../../../hooks/useQC";
import { RequiredStar } from "../../../RequiredStar/RequiredStar";
import QRCode from "qrcode";

const AssetScannerPopUp = ({ handleClose, qcId, preselectedAssetId }) => {
  const [assetId, setAssetId] = useState(preselectedAssetId || "");
  const [assetData, setAssetData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showUpdateForm, setShowUpdateForm] = useState(false);
  const [updateData, setUpdateData] = useState({
    status: "",
    outDate: "",
    serviceNote: "",
  });
  const canvasRef = useRef(null);

  useEffect(() => {
    if (preselectedAssetId) {
      handleSearch(preselectedAssetId);
    }
  }, [preselectedAssetId]);

  // Generate QR code on canvas when assetData changes
  useEffect(() => {
    if (assetData?.qrCodeData && canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, assetData.qrCodeData, {
        width: 200,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#ffffff",
        },
        errorCorrectionLevel: "H",
      }, (error) => {
        if (error) console.error("QR Code Error:", error);
      });
    }
  }, [assetData]);

  const handleSearch = async (searchId) => {
    if (!searchId) {
      toast.error("Please enter Asset ID or scan QR code");
      return;
    }

    setIsLoading(true);
    try {
      const data = await getAssetByQR(searchId);
      
      if (data.success) {
        setAssetData(data.asset);
        setUpdateData({
          status: data.asset.status || "",
          outDate: data.asset.outDate ? new Date(data.asset.outDate).toISOString().split('T')[0] : "",
          serviceNote: "",
        });
        setShowUpdateForm(false);
        toast.success("Asset found!");
      } else {
        setAssetData(null);
        toast.error(data.error || "Asset not found");
      }
    } catch (error) {
      toast.error("Failed to fetch asset");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (!assetData || !qcId) {
      toast.error("Missing required data");
      return;
    }

    if (!updateData.status) {
      toast.error("Please select a status");
      return;
    }

    setIsLoading(true);
    try {
      const data = await updateAssetStatus(qcId, assetData.assetId, {
        status: updateData.status,
        outDate: updateData.outDate || null,
        serviceNote: updateData.serviceNote || null,
      });

      if (data.success) {
        toast.success("Asset status updated successfully");
        handleSearch(assetData.assetId);
        setShowUpdateForm(false);
      } else {
        toast.error(data.error || "Failed to update asset");
      }
    } catch (error) {
      toast.error("Failed to update asset status");
    } finally {
      setIsLoading(false);
    }
  };

  const downloadQRCode = () => {
    if (canvasRef.current) {
      const link = document.createElement("a");
      link.download = `${assetData?.assetId || "qr-code"}.png`;
      link.href = canvasRef.current.toDataURL("image/png");
      link.click();
      toast.success("QR Code downloaded!");
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'In Warehouse': return 'bg-primary';
      case 'Dispatched': return 'bg-info';
      case 'In Service': return 'bg-success';
      case 'Warranty Expired': return 'bg-danger';
      case 'Damaged': return 'bg-dark';
      default: return 'bg-secondary';
    }
  };

  const isWarrantyExpired = () => {
    if (!assetData?.warrantyExpiryDate) return false;
    return new Date() > new Date(assetData.warrantyExpiryDate);
  };

  const getWarrantyDaysRemaining = () => {
    if (!assetData?.warrantyExpiryDate) return null;
    const expiry = new Date(assetData.warrantyExpiryDate);
    const now = new Date();
    const diffTime = expiry - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <div className="modal fade show" style={{ display: "flex", alignItems: "center", backgroundColor: "#00000090" }}>
      <div className="modal-dialog modal-lg">
        <div className="modal-content p-3">
          <div className="modal-header pt-0">
            <h5 className="card-title fw-bold">
              <i className="fa fa-qrcode me-2"></i>
              Asset Scanner / Viewer
            </h5>
            <button onClick={handleClose} type="button" className="close px-3" style={{ marginLeft: "auto" }}>
              <span aria-hidden="true">&times;</span>
            </button>
          </div>

          <div className="modal-body">
            {/* Search Section */}
            <div className="row mb-4">
              <div className="col-12">
                <div className="input-group">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Enter Asset ID or paste QR data..."
                    value={assetId}
                    onChange={(e) => setAssetId(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch(assetId)}
                  />
                  <button 
                    className="btn btn-primary" 
                    onClick={() => handleSearch(assetId)}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <span className="spinner-border spinner-border-sm"></span>
                    ) : (
                      <i className="fa fa-search"></i>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Asset Display */}
            {assetData && (
              <>
                <div className="row">
                  {/* QR Code Section */}
                  <div className="col-md-4 text-center mb-3">
                    <div className="card">
                      <div className="card-body">
                        <h6 className="card-title">QR Code</h6>
                        <div className="mb-3 d-flex justify-content-center">
                          <canvas ref={canvasRef}></canvas>
                        </div>
                        <button className="btn btn-sm btn-outline-primary w-100" onClick={downloadQRCode}>
                          <i className="fa fa-download me-1"></i> Download QR
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Asset Info Section */}
                  <div className="col-md-8">
                    <div className="card">
                      <div className="card-header d-flex justify-content-between align-items-center">
                        <h6 className="mb-0">Asset Information</h6>
                        <span className={`badge ${getStatusBadgeClass(assetData.status)}`}>
                          {assetData.status}
                        </span>
                      </div>
                      <div className="card-body">
                        <div className="row">
                          <div className="col-6 mb-2">
                            <small className="text-muted">Asset ID</small>
                            <p className="font-monospace mb-1 fw-bold">{assetData.assetId}</p>
                          </div>
                          <div className="col-6 mb-2">
                            <small className="text-muted">QC Number</small>
                            <p className="mb-1">{assetData.qcNumber}</p>
                          </div>
                          <div className="col-6 mb-2">
                            <small className="text-muted">GRN Number</small>
                            <p className="mb-1">{assetData.grnNumber}</p>
                          </div>
                          <div className="col-6 mb-2">
                            <small className="text-muted">Box Number</small>
                            <p className="mb-1">{assetData.boxNumber || 'Single Item'}</p>
                          </div>
                          <div className="col-4 mb-2">
                            <small className="text-muted">Brand</small>
                            <p className="mb-1 fw-bold">{assetData.brandName}</p>
                          </div>
                          <div className="col-4 mb-2">
                            <small className="text-muted">Model</small>
                            <p className="mb-1 fw-bold">{assetData.modelNo}</p>
                          </div>
                          <div className="col-4 mb-2">
                            <small className="text-muted">Unit</small>
                            <p className="mb-1">{assetData.unit}</p>
                          </div>
                        </div>

                        <hr />

                        <div className="row">
                          <div className="col-4 mb-2">
                            <small className="text-muted">In Date (Warehouse)</small>
                            <p className="mb-1 text-primary fw-bold">
                              <i className="fa fa-arrow-down me-1"></i>
                              {new Date(assetData.inDate).toLocaleDateString('en-GB')}
                            </p>
                          </div>
                          <div className="col-4 mb-2">
                            <small className="text-muted">Out Date</small>
                            <p className="mb-1 text-danger fw-bold">
                              <i className="fa fa-arrow-up me-1"></i>
                              {assetData.outDate ? new Date(assetData.outDate).toLocaleDateString('en-GB') : 'Not Dispatched'}
                            </p>
                          </div>
                          <div className="col-4 mb-2">
                            <small className="text-muted">Warranty Period</small>
                            <p className="mb-1 fw-bold">
                              <i className="fa fa-shield me-1"></i>
                              {assetData.serviceWarrantyMonths > 0 ? `${assetData.serviceWarrantyMonths} Months` : 'No Warranty'}
                            </p>
                          </div>
                          <div className="col-6 mb-2">
                            <small className="text-muted">Warranty Expiry Date</small>
                            <p className={`mb-1 fw-bold ${isWarrantyExpired() ? 'text-danger' : 'text-success'}`}>
                              {assetData.warrantyExpiryDate 
                                ? new Date(assetData.warrantyExpiryDate).toLocaleDateString('en-GB')
                                : 'N/A'}
                            </p>
                          </div>
                          <div className="col-6 mb-2">
                            <small className="text-muted">Warranty Status</small>
                            <p className="mb-1">
                              {!assetData.warrantyExpiryDate ? (
                                <span className="badge bg-secondary">No Warranty</span>
                              ) : isWarrantyExpired() ? (
                                <span className="badge bg-danger">
                                  <i className="fa fa-exclamation-triangle me-1"></i>
                                  Expired
                                </span>
                              ) : (
                                <span className="badge bg-success">
                                  <i className="fa fa-check me-1"></i>
                                  Active ({getWarrantyDaysRemaining()} days left)
                                </span>
                              )}
                            </p>
                          </div>
                        </div>

                        {/* Service History */}
                        {assetData.serviceHistory && assetData.serviceHistory.length > 0 && (
                          <>
                            <hr />
                            <h6 className="mb-2">
                              <i className="fa fa-wrench me-1"></i>
                              Service History
                            </h6>
                            <div className="table-responsive">
                              <table className="table table-sm table-bordered">
                                <thead className="table-secondary">
                                  <tr>
                                    <th>Date</th>
                                    <th>Description</th>
                                    <th>Serviced By</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {assetData.serviceHistory.map((history, idx) => (
                                    <tr key={idx}>
                                      <td>{new Date(history.date).toLocaleDateString('en-GB')}</td>
                                      <td>{history.description}</td>
                                      <td>{history.servicedBy}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </>
                        )}

                        {/* Update Button */}
                        <div className="mt-3">
                          <button 
                            className="btn btn-primary btn-sm"
                            onClick={() => setShowUpdateForm(!showUpdateForm)}
                          >
                            <i className="fa fa-edit me-1"></i>
                            {showUpdateForm ? 'Hide Update Form' : 'Update Asset Status'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Update Form */}
                {showUpdateForm && (
                  <div className="row mt-3">
                    <div className="col-12">
                      <div className="card border-primary">
                        <div className="card-header bg-primary text-white">
                          <h6 className="mb-0">
                            <i className="fa fa-edit me-1"></i>
                            Update Asset Status
                          </h6>
                        </div>
                        <div className="card-body">
                          <div className="row">
                            <div className="col-md-4 mb-3">
                              <label className="form-label">Status <RequiredStar /></label>
                              <select 
                                className="form-select"
                                value={updateData.status}
                                onChange={(e) => setUpdateData({...updateData, status: e.target.value})}
                              >
                                <option value="">Select Status...</option>
                                <option value="In Warehouse">In Warehouse</option>
                                <option value="Dispatched">Dispatched</option>
                                <option value="In Service">In Service</option>
                                <option value="Warranty Expired">Warranty Expired</option>
                                <option value="Damaged">Damaged</option>
                              </select>
                            </div>
                            <div className="col-md-4 mb-3">
                              <label className="form-label">Out Date (Dispatch Date)</label>
                              <input 
                                type="date"
                                className="form-control"
                                value={updateData.outDate}
                                onChange={(e) => setUpdateData({...updateData, outDate: e.target.value})}
                              />
                            </div>
                            <div className="col-md-4 mb-3">
                              <label className="form-label">Service Note</label>
                              <textarea
                                className="form-control"
                                rows="1"
                                value={updateData.serviceNote}
                                onChange={(e) => setUpdateData({...updateData, serviceNote: e.target.value})}
                                placeholder="Add service note..."
                              />
                            </div>
                            <div className="col-12">
                              <button 
                                className="btn btn-success"
                                onClick={handleUpdateStatus}
                                disabled={isLoading}
                              >
                                {isLoading ? (
                                  <span className="spinner-border spinner-border-sm me-1"></span>
                                ) : (
                                  <i className="fa fa-save me-1"></i>
                                )}
                                Update Status
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* No Asset Found */}
            {!assetData && !isLoading && (
              <div className="text-center py-5">
                <i className="fa fa-qrcode fa-3x text-muted mb-3 d-block"></i>
                <p className="text-muted">Enter Asset ID or scan QR code to view asset details</p>
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" onClick={handleClose} className="btn btn-secondary">
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssetScannerPopUp;