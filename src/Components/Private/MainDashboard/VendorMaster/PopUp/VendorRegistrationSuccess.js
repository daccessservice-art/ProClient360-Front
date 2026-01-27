import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const VendorRegistrationSuccess = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [vendorData, setVendorData] = useState(null);

  useEffect(() => {
    // Check if vendor data is passed in location state
    if (location.state && location.state.vendor) {
      setVendorData(location.state.vendor);
    }
    
    setTimeout(() => {
      setLoading(false);
    }, 1000);
  }, [location]);

  return (
    <div
      className="container-fluid d-flex align-items-center justify-content-center"
      style={{ minHeight: '100vh', background: '#f8f9fa' }}
    >
      <div className="row w-100 justify-content-center">
        <div className="col-lg-7 col-md-9 col-sm-11">
          <div className="card shadow-lg">
            <div className="card-body text-center p-4">

              <div className="mb-4">
                <i
                  className="fa fa-check-circle text-success"
                  style={{ fontSize: '4rem' }}
                ></i>
              </div>

              <h4 className="card-title mb-2">Registration Successful!</h4>
              <p className="text-muted">
                Thank you for submitting your information.
              </p>

              {loading ? (
                <div className="my-4">
                  <div className="spinner-border text-primary" role="status"></div>
                  <p className="mt-2">Loading your registration details...</p>
                </div>
              ) : (
                <div className="text-start mt-4">
                  {vendorData && (
                    <div className="alert alert-info">
                      <h5>Registration Details:</h5>
                      <p><strong>Vendor Name:</strong> {vendorData.vendorName}</p>
                      <p><strong>Email:</strong> {vendorData.email}</p>
                      <p><strong>Type of Vendor:</strong> {vendorData.typeOfVendor}</p>
                      <p><strong>Registration ID:</strong> {vendorData._id || 'Processing...'}</p>
                    </div>
                  )}

                  <div className="alert alert-info">
                    Your vendor registration has been successfully submitted.
                    Our team will contact you within 2–3 business days.
                  </div>

                  <div className="row">
                    <div className="col-md-6">
                      <h6 className="text-muted">Next Steps</h6>
                      <ul>
                        <li>Submission review</li>
                        <li>Email confirmation</li>
                        <li>Vendor onboarding</li>
                      </ul>
                    </div>

                    <div className="col-md-6">
                      <h6 className="text-muted">Contact Us</h6>
                      <p className="mb-1">
                        <strong>Email:</strong> info@daccess.co.in
                      </p>
                      <p>
                        <strong>Phone:</strong> 1800-209-7799
                      </p>
                    </div>
                  </div>

                </div>
              )}

              <div className="mt-4">
                <button
                  className="btn btn-outline-secondary me-2"
                  onClick={() => window.print()}
                >
                  Print Confirmation
                </button>
                <button
                  className="btn btn-primary"
                  onClick={() => window.close()}
                >
                  Close Window
                </button>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VendorRegistrationSuccess;