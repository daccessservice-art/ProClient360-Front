import React from 'react';

const ViewVendorPopUp = ({ vendor, handleViewClose }) => {
  return (
    <div className="popup-overlay" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000
    }}>
      <div className="popup-container" style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: '20px',
        width: '90%',
        maxWidth: '800px',
        maxHeight: '80vh',
        overflow: 'auto',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
      }}>
        <div className="popup-header" style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid #eee',
          paddingBottom: '10px',
          marginBottom: '20px'
        }}>
          <h4 style={{ margin: 0 }}>
            Vendor Details 
            {vendor.registeredFromLink && (
              <span className="badge bg-info ms-2">
                <i className="fa fa-link me-1"></i> Registered via Link
              </span>
            )}
          </h4>
          <button 
            className="close-btn" 
            onClick={handleViewClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '20px',
              cursor: 'pointer'
            }}
          >
            <i className="fa fa-times"></i>
          </button>
        </div>
        
        <div className="popup-body">
          <div className="row">
            <div className="col-md-6 mb-3">
              <h6 className="text-muted">Vendor Information</h6>
              <table className="table table-sm table-borderless">
                <tbody>
                  <tr>
                    <td style={{ width: '40%' }}><strong>Vendor Name:</strong></td>
                    <td>{vendor.vendorName}</td>
                  </tr>
                  <tr>
                    <td><strong>Email:</strong></td>
                    <td>{vendor.email}</td>
                  </tr>
                  <tr>
                    <td><strong>GST No:</strong></td>
                    <td>{vendor.GSTNo}</td>
                  </tr>
                  <tr>
                    <td><strong>Type of Vendor:</strong></td>
                    <td>
                      <span className={`badge ${
                        vendor.typeOfVendor === 'Import' ? 'bg-primary' : 
                        vendor.typeOfVendor === 'B2B Material' ? 'bg-success' :
                        vendor.typeOfVendor === 'Labour Contractor' ? 'bg-info' :
                        vendor.typeOfVendor === 'Turnkey Contractor' ? 'bg-warning' :
                        vendor.typeOfVendor === 'Logistics' ? 'bg-secondary' :
                        vendor.typeOfVendor === 'Service' ? 'bg-danger' : 'bg-dark'
                      }`}>
                        {vendor.typeOfVendor}
                      </span>
                    </td>
                  </tr>
                  {vendor.typeOfVendor === 'Other' && (
                    <tr>
                      <td><strong>Custom Vendor Type:</strong></td>
                      <td>{vendor.customVendorType}</td>
                    </tr>
                  )}
                  <tr>
                    <td><strong>Material Category:</strong></td>
                    <td>
                      <span className={`badge ${
                        vendor.materialCategory === 'Raw Material' ? 'bg-primary' : 
                        vendor.materialCategory === 'Finished Goods' ? 'bg-success' :
                        'bg-warning'
                      }`}>
                        {vendor.materialCategory}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td><strong>Rating:</strong></td>
                    <td>
                      <div>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <span
                            key={star}
                            className={`fa fa-star ${star <= vendor.vendorRating ? 'text-warning' : 'text-secondary'}`}
                          ></span>
                        ))}
                      </div>
                    </td>
                  </tr>
                  {vendor.typeOfVendor === 'B2B Material' && (
                    <tr>
                      <td><strong>Brands Work With:</strong></td>
                      <td>{vendor.brandsWorkWith}</td>
                    </tr>
                  )}
                  {vendor.typeOfVendor === 'Import' && (
                    <tr>
                      <td><strong>Manual Address:</strong></td>
                      <td>{vendor.manualAddress}</td>
                    </tr>
                  )}
                  {vendor.remarks && (
                    <tr>
                      <td><strong>Remarks:</strong></td>
                      <td>{vendor.remarks}</td>
                    </tr>
                  )}
                  {vendor.linkId && (
                    <tr>
                      <td><strong>Registration Link ID:</strong></td>
                      <td>{vendor.linkId}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            <div className="col-md-6 mb-3">
              <h6 className="text-muted">Contact Information</h6>
              <table className="table table-sm table-borderless">
                <tbody>
                  <tr>
                    <td style={{ width: '40%' }}><strong>Contact Person 1:</strong></td>
                    <td>{vendor.vendorContactPersonName1}</td>
                  </tr>
                  <tr>
                    <td><strong>Phone Number 1:</strong></td>
                    <td>{vendor.phoneNumber1}</td>
                  </tr>
                  {vendor.vendorContactPersonName2 && (
                    <>
                      <tr>
                        <td><strong>Contact Person 2:</strong></td>
                        <td>{vendor.vendorContactPersonName2}</td>
                      </tr>
                      <tr>
                        <td><strong>Phone Number 2:</strong></td>
                        <td>{vendor.phoneNumber2}</td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>
            
            {vendor.typeOfVendor !== 'Import' && vendor.typeOfVendor !== 'Other' && (
              <div className="col-md-12 mb-3">
                <h6 className="text-muted">Billing Address</h6>
                <table className="table table-sm table-borderless">
                  <tbody>
                    <tr>
                      <td style={{ width: '20%' }}><strong>Address:</strong></td>
                      <td>{vendor.billingAddress?.add}</td>
                    </tr>
                    <tr>
                      <td><strong>City:</strong></td>
                      <td>{vendor.billingAddress?.city}</td>
                    </tr>
                    <tr>
                      <td><strong>State:</strong></td>
                      <td>{vendor.billingAddress?.state}</td>
                    </tr>
                    <tr>
                      <td><strong>Country:</strong></td>
                      <td>{vendor.billingAddress?.country}</td>
                    </tr>
                    <tr>
                      <td><strong>Pincode:</strong></td>
                      <td>{vendor.billingAddress?.pincode}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
            
            {vendor.registeredFromLink && (
              <div className="col-md-12 mb-3">
                <div className="alert alert-info">
                  <i className="fa fa-info-circle me-2"></i>
                  This vendor was registered using a registration link. Editing is not allowed for vendors registered via link.
                </div>
              </div>
            )}
          </div>
          
          <div className="text-center mt-4">
            <button 
              className="btn btn-secondary" 
              onClick={handleViewClose}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewVendorPopUp;