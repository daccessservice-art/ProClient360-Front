// Components/Private/MainDashboard/QCMaster/PopUp/AssetScannerPopUp.jsx
import { useState, useEffect, useRef, useContext } from "react";
import toast from "react-hot-toast";
import { getAssetByQR, updateAssetStatus } from "../../../../../hooks/useQC";
import { RequiredStar } from "../../../RequiredStar/RequiredStar";
import { UserContext } from "../../../../../context/UserContext";
import QRCode from "qrcode";

const AssetScannerPopUp = ({ handleClose, qcId, preselectedAssetId }) => {
  const { user } = useContext(UserContext);
  const [assetId, setAssetId] = useState(preselectedAssetId || "");
  const [assetData, setAssetData] = useState(null);
  const [boxData, setBoxData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showUpdateForm, setShowUpdateForm] = useState(false);
  const [updateData, setUpdateData] = useState({
    status: "",
    outDate: "",
    serviceNote: "",
  });
  const canvasRef = useRef(null);

  // Check if user is Quality Engineer
  const isQualityEngineer = user?.user === 'company' || user?.permissions?.includes('updateQC');

  useEffect(() => {
    if (preselectedAssetId) {
      handleSearch(preselectedAssetId);
    }
  }, [preselectedAssetId]);

  // Generate QR code on canvas when assetData changes
  useEffect(() => {
    if (assetData?.qrCodeData && canvasRef.current && !boxData) {
      QRCode.toCanvas(canvasRef.current, assetData.qrCodeData, {
        width: 200,
        margin: 2,
        color: { dark: "#000000", light: "#ffffff" },
        errorCorrectionLevel: "H",
      }, (error) => {
        if (error) console.error("QR Code Error:", error);
      });
    }
  }, [assetData, boxData]);

  const handleSearch = async (searchId) => {
    if (!searchId) {
      toast.error("Please enter Asset ID or scan QR code");
      return;
    }

    setIsLoading(true);
    setBoxData(null);
    setAssetData(null);
    
    try {
      const data = await getAssetByQR(searchId);
      
      if (data.success) {
        if (data.isBox) {
          // Box QR scanned
          setBoxData(data);
          setAssetData(null);
          toast.success(`Box found with ${data.box?.assetCount} assets!`);
        } else {
          // Individual asset QR scanned
          setAssetData(data.asset);
          setBoxData(null);
          setUpdateData({
            status: data.asset.status || "",
            outDate: data.asset.outDate ? new Date(data.asset.outDate).toISOString().split('T')[0] : "",
            serviceNote: "",
          });
          setShowUpdateForm(false);
          toast.success("Asset found!");
        }
      } else {
        setAssetData(null);
        setBoxData(null);
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
      toast.error(error?.response?.data?.error || "Failed to update asset status");
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

  const isWarrantyExpired = (expiryDate) => {
    if (!expiryDate) return false;
    return new Date() > new Date(expiryDate);
  };

  const getWarrantyDaysRemaining = (expiryDate) => {
    if (!expiryDate) return null;
    const expiry = new Date(expiryDate);
    const now = new Date();
    const diffTime = expiry - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const fmt = (d) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <div className="modal fade show" style={{ display: "flex", alignItems: "center", backgroundColor: "#00000090" }}>
      <div className="modal-dialog modal-xl modal-dialog-scrollable">
        <div className="modal-content p-3">
          <div className="modal-header pt-0">
            <h5 className="card-title fw-bold">
              <i className="fa fa-qrcode me-2"></i>
              Asset / Box Scanner
            </h5>
            <div className="d-flex align-items-center gap-2" style={{ marginLeft: "auto" }}>
              <span className={`badge ${isQualityEngineer ? 'bg-success' : 'bg-warning'}`}>
                {isQualityEngineer ? 'Quality Engineer - Full Access' : 'View Only Mode'}
              </span>
              <button onClick={handleClose} type="button" className="close px-3">
                <span aria-hidden="true">&times;</span>
              </button>
            </div>
          </div>

          <div className="modal-body">
            {/* Search Section */}
            <div className="row mb-4">
              <div className="col-12">
                <div className="input-group">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Enter Asset ID, Box ID (BOX-...) or paste QR data..."
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

            {/* BOX VIEW */}
            {boxData && (
              <>
                <div className="card mb-3 border-primary">
                  <div className="card-header bg-primary text-white">
                    <div className="d-flex justify-content-between align-items-center">
                      <h6 className="mb-0">
                        <i className="fa fa-box me-2"></i>
                        {boxData.box?.boxNumber}
                      </h6>
                      <span className="badge bg-light text-dark">
                        {boxData.box?.assetCount} Assets
                      </span>
                    </div>
                  </div>
                  <div className="card-body">
                    <div className="row mb-3">
                      <div className="col-md-4">
                        <small className="text-muted">Brand</small>
                        <p className="fw-bold mb-1">{boxData.box?.brandName}</p>
                      </div>
                      <div className="col-md-4">
                        <small className="text-muted">Model</small>
                        <p className="fw-bold mb-1">{boxData.box?.modelNo}</p>
                      </div>
                      <div className="col-md-4">
                        <small className="text-muted">QC Number</small>
                        <p className="font-monospace mb-1">{boxData.qcNumber}</p>
                      </div>
                    </div>

                    {/* Only show In Date for Quality Engineer */}
                    {isQualityEngineer && boxData.showInDate && (
                      <div className="row mb-3">
                        <div className="col-md-4">
                          <small className="text-muted">In Date (Warehouse)</small>
                          <p className="text-primary fw-bold mb-1">
                            <i className="fa fa-arrow-down me-1"></i>
                            {fmt(boxData.qcDate)}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Assets in Box Table */}
                    <div className="table-responsive">
                      <table className="table table-sm table-bordered">
                        <thead className="table-secondary">
                          <tr>
                            <th>Asset ID</th>
                            {isQualityEngineer && <th>In Date</th>}
                            <th>Out Date</th>
                            <th>Warranty</th>
                            <th>Warranty Expiry</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {boxData.assets?.map((asset, idx) => (
                            <tr key={idx}>
                              <td>
                                <small className="font-monospace">{asset.assetId}</small>
                              </td>
                              {isQualityEngineer && boxData.showInDate && (
                                <td>{fmt(asset.inDate)}</td>
                              )}
                              <td>{asset.outDate ? fmt(asset.outDate) : '-'}</td>
                              <td>{asset.serviceWarrantyMonths > 0 ? `${asset.serviceWarrantyMonths}M` : 'No Warranty'}</td>
                              <td>
                                {asset.warrantyExpiryDate ? (
                                  <span className={isWarrantyExpired(asset.warrantyExpiryDate) ? 'text-danger' : 'text-success'}>
                                    {fmt(asset.warrantyExpiryDate)}
                                  </span>
                                ) : '-'}
                              </td>
                              <td>
                                <span className={`badge ${getStatusBadgeClass(asset.status)}`}>
                                  {asset.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* SINGLE ASSET VIEW */}
            {assetData && !boxData && (
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
                          {/* IN DATE - Only for Quality Engineer */}
                          {isQualityEngineer && assetData.showInDate && (
                            <div className="col-4 mb-2">
                              <small className="text-muted">In Date (Warehouse)</small>
                              <p className="mb-1 text-primary fw-bold">
                                <i className="fa fa-arrow-down me-1"></i>
                                {fmt(assetData.inDate)}
                              </p>
                            </div>
                          )}
                          
                          <div className={`mb-2 ${isQualityEngineer && assetData.showInDate ? 'col-4' : 'col-6'}`}>
                            <small className="text-muted">Out Date</small>
                            <p className="mb-1 text-danger fw-bold">
                              <i className="fa fa-arrow-up me-1"></i>
                              {assetData.outDate ? fmt(assetData.outDate) : 'Not Dispatched'}
                            </p>
                          </div>
                          
                          <div className={`mb-2 ${isQualityEngineer && assetData.showInDate ? 'col-4' : 'col-6'}`}>
                            <small className="text-muted">Warranty Period</small>
                            <p className="mb-1 fw-bold">
                              <i className="fa fa-shield me-1"></i>
                              {assetData.serviceWarrantyMonths > 0 ? `${assetData.serviceWarrantyMonths} Months` : 'No Warranty'}
                            </p>
                          </div>
                          
                          <div className="col-6 mb-2">
                            <small className="text-muted">Warranty Expiry Date</small>
                            <p className={`mb-1 fw-bold ${isWarrantyExpired(assetData.warrantyExpiryDate) ? 'text-danger' : 'text-success'}`}>
                              {assetData.warrantyExpiryDate 
                                ? fmt(assetData.warrantyExpiryDate)
                                : 'N/A'}
                            </p>
                          </div>
                          <div className="col-6 mb-2">
                            <small className="text-muted">Warranty Status</small>
                            <p className="mb-1">
                              {!assetData.warrantyExpiryDate ? (
                                <span className="badge bg-secondary">No Warranty</span>
                              ) : isWarrantyExpired(assetData.warrantyExpiryDate) ? (
                                <span className="badge bg-danger">
                                  <i className="fa fa-exclamation-triangle me-1"></i>
                                  Expired
                                </span>
                              ) : (
                                <span className="badge bg-success">
                                  <i className="fa fa-check me-1"></i>
                                  Active ({getWarrantyDaysRemaining(assetData.warrantyExpiryDate)} days left)
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
                                      <td>{fmt(history.date)}</td>
                                      <td>{history.description}</td>
                                      <td>{history.servicedBy}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </>
                        )}

                        {/* Update Button - Only for Quality Engineer */}
                        {isQualityEngineer && assetData.canUpdate && (
                          <div className="mt-3">
                            <button 
                              className="btn btn-primary btn-sm"
                              onClick={() => setShowUpdateForm(!showUpdateForm)}
                            >
                              <i className="fa fa-edit me-1"></i>
                              {showUpdateForm ? 'Hide Update Form' : 'Update Asset Status'}
                            </button>
                          </div>
                        )}

                        {/* Show message for non-QE users */}
                        {!isQualityEngineer && (
                          <div className="mt-3">
                            <div className="alert alert-warning mb-0 py-2">
                              <small>
                                <i className="fa fa-lock me-1"></i>
                                View only mode. Only Quality Engineer can update asset status.
                              </small>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Update Form - Only for Quality Engineer */}
                {showUpdateForm && isQualityEngineer && (
                  <div className="row mt-3">
                    <div className="col-12">
                      <div className="card border-success">
                        <div className="card-header bg-success text-white">
                          <h6 className="mb-0">
                            <i className="fa fa-edit me-1"></i>
                            Update Asset Status (Quality Engineer Only)
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

            {/* No Data Found */}
            {!assetData && !boxData && !isLoading && (
              <div className="text-center py-5">
                <i className="fa fa-qrcode fa-3x text-muted mb-3 d-block"></i>
                <p className="text-muted">Enter Asset ID or Box ID (BOX-...) to view details</p>
                <div className="mt-3">
                  <small className="text-muted">
                    <i className="fa fa-info-circle me-1"></i>
                    {isQualityEngineer 
                      ? "You have full access to view and update assets" 
                      : "You can view assets but cannot update them"}
                  </small>
                </div>
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