import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";

const AssetView = () => {
  const { assetId } = useParams();
  const [assetData, setAssetData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAsset = async () => {
      try {
        const baseUrl = process.env.REACT_APP_API_URL;
        const response = await axios.get(`${baseUrl}/api/qc/public/asset/${assetId}`);
        
        if (response.data.success) {
          setAssetData(response.data.asset);
        } else {
          setError(response.data.error || "Asset not found");
        }
      } catch (err) {
        setError("Failed to load asset information");
      } finally {
        setIsLoading(false);
      }
    };

    if (assetId) {
      fetchAsset();
    }
  }, [assetId]);

  const isWarrantyExpired = () => {
    if (!assetData?.warrantyExpiryDate) return false;
    return new Date() > new Date(assetData.warrantyExpiryDate);
  };

  const getWarrantyDaysRemaining = () => {
    if (!assetData?.warrantyExpiryDate) return null;
    const expiry = new Date(assetData.warrantyExpiryDate);
    const now = new Date();
    const diffTime = expiry - now;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  if (isLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center min-vh-100 bg-light">
        <div className="text-center">
          <div className="spinner-border text-primary mb-3" role="status" style={{ width: '3rem', height: '3rem' }}>
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="text-muted">Fetching Asset Details...</p>
        </div>
      </div>
    );
  }

  if (error || !assetData) {
    return (
      <div className="d-flex justify-content-center align-items-center min-vh-100 bg-light">
        <div className="text-center p-4">
          <i className="fa fa-exclamation-triangle fa-3x text-danger mb-3"></i>
          <h4 className="text-danger">Asset Not Found</h4>
          <p className="text-muted">{error || "This asset does not exist or has been deleted."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-vh-100 bg-light">
      {/* Header */}
      <div className="bg-primary text-white py-3 px-4 shadow">
        <div className="container">
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h4 className="mb-0">
                <i className="fa fa-qrcode me-2"></i>
                Asset Details
              </h4>
              <small className="opacity-75">Scan verified successfully</small>
            </div>
            <span className={`badge ${isWarrantyExpired() ? 'bg-danger' : 'bg-success'} p-2`}>
              {isWarrantyExpired() ? '⚠️ Warranty Expired' : '✅ Active'}
            </span>
          </div>
        </div>
      </div>

      <div className="container py-4">
        {/* Asset ID Card */}
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-body text-center py-4">
            <div className="bg-dark text-white d-inline-block px-4 py-2 rounded mb-3">
              <span className="font-monospace fw-bold" style={{ fontSize: '1.1rem' }}>{assetData.assetId}</span>
            </div>
            <h5 className="mb-1">{assetData.brandName} - {assetData.modelNo}</h5>
            <p className="text-muted mb-0">{assetData.unit}</p>
            {assetData.boxNumber && (
              <span className="badge bg-info mt-2">{assetData.boxNumber}</span>
            )}
          </div>
        </div>

        {/* Main Info Grid */}
        <div className="row g-3 mb-4">
          <div className="col-6">
            <div className="card border-start border-4 border-primary h-100">
              <div className="card-body">
                <small className="text-muted d-block">In Date (Warehouse)</small>
                <h5 className="text-primary mb-0 mt-1">
                  <i className="fa fa-arrow-circle-down me-1"></i>
                  {new Date(assetData.inDate).toLocaleDateString('en-GB')}
                </h5>
              </div>
            </div>
          </div>

          <div className="col-6">
            <div className="card border-start border-4 border-danger h-100">
              <div className="card-body">
                <small className="text-muted d-block">Out Date (Dispatch)</small>
                <h5 className="text-danger mb-0 mt-1">
                  <i className="fa fa-arrow-circle-up me-1"></i>
                  {assetData.outDate ? new Date(assetData.outDate).toLocaleDateString('en-GB') : 'Not Dispatched'}
                </h5>
              </div>
            </div>
          </div>
        </div>

        {/* Reference Info */}
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-header bg-light">
            <h6 className="mb-0"><i className="fa fa-link me-2"></i>Reference Information</h6>
          </div>
          <div className="card-body p-0">
            <table className="table table-borderless mb-0">
              <tbody>
                <tr>
                  <td className="text-muted ps-3" style={{ width: '40%' }}>QC Number</td>
                  <td className="fw-bold ps-3">{assetData.qcNumber}</td>
                </tr>
                <tr className="border-top">
                  <td className="text-muted ps-3">GRN Number</td>
                  <td className="fw-bold ps-3">{assetData.grnNumber}</td>
                </tr>
                <tr className="border-top">
                  <td className="text-muted ps-3">Current Status</td>
                  <td className="ps-3">
                    <span className={`badge ${
                      assetData.status === 'In Warehouse' ? 'bg-primary' :
                      assetData.status === 'Dispatched' ? 'bg-info' :
                      assetData.status === 'In Service' ? 'bg-success' :
                      'bg-secondary'
                    }`}>
                      {assetData.status}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Warranty Card */}
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-header bg-light">
            <h6 className="mb-0"><i className="fa fa-shield-alt me-2"></i>Warranty Information</h6>
          </div>
          <div className="card-body text-center p-4">
            {assetData.serviceWarrantyMonths > 0 ? (
              <>
                <div className={`display-4 mb-2 ${isWarrantyExpired() ? 'text-danger' : 'text-success'}`}>
                  {isWarrantyExpired() ? (
                    <i className="fa fa-times-circle"></i>
                  ) : (
                    <i className="fa fa-check-circle"></i>
                  )}
                </div>
                <h5 className={isWarrantyExpired() ? 'text-danger' : 'text-success'}>
                  {isWarrantyExpired() ? 'Warranty Expired' : 'Under Warranty'}
                </h5>
                <p className="text-muted mb-1">
                  Duration: <strong>{assetData.serviceWarrantyMonths} Months</strong>
                </p>
                <p className="text-muted mb-0">
                  Expiry Date: <strong className={isWarrantyExpired() ? 'text-danger' : 'text-success'}>
                    {new Date(assetData.warrantyExpiryDate).toLocaleDateString('en-GB')}
                  </strong>
                </p>
                {!isWarrantyExpired() && (
                  <div className="mt-3">
                    <span className="badge bg-success p-2" style={{ fontSize: '1rem' }}>
                      {getWarrantyDaysRemaining()} Days Remaining
                    </span>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="display-4 mb-2 text-secondary">
                  <i className="fa fa-minus-circle"></i>
                </div>
                <h5 className="text-secondary">No Warranty</h5>
                <p className="text-muted mb-0">This asset does not have a service warranty.</p>
              </>
            )}
          </div>
        </div>

        {/* Service History */}
        {assetData.serviceHistory && assetData.serviceHistory.length > 0 && (
          <div className="card border-0 shadow-sm mb-4">
            <div className="card-header bg-light">
              <h6 className="mb-0"><i className="fa fa-wrench me-2"></i>Service History</h6>
            </div>
            <div className="card-body p-0">
              {assetData.serviceHistory.map((history, idx) => (
                <div key={idx} className="p-3 border-bottom">
                  <div className="d-flex justify-content-between align-items-start">
                    <div>
                      <p className="mb-1 fw-bold">{history.description}</p>
                      <small className="text-muted">By: {history.servicedBy}</small>
                    </div>
                    <small className="text-muted">
                      {new Date(history.date).toLocaleDateString('en-GB')}
                    </small>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="text-center text-muted mt-4 pb-4">
          <small>
            <i className="fa fa-info-circle me-1"></i>
            Scanned on {new Date().toLocaleString()} | Powered by ProClient360
          </small>
        </div>
      </div>
    </div>
  );
};

export default AssetView;