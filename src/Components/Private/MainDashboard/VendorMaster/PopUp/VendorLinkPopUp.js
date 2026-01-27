import React, { useState } from 'react';
import toast from 'react-hot-toast';

const VendorLinkPopUp = ({ handleVendorLink, generatedVendorLink, generateVendorLink, setGeneratedVendorLink }) => {
  const [linkCopied, setLinkCopied] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedVendorLink)
      .then(() => {
        setLinkCopied(true);
        toast.success("Link copied to clipboard!");
        setTimeout(() => setLinkCopied(false), 3000);
      })
      .catch(err => {
        console.error('Failed to copy: ', err);
        toast.error("Failed to copy link");
      });
  };

  const shareViaWhatsApp = () => {
    const message = `Please fill out your vendor information using this link: ${generatedVendorLink}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  const shareViaEmail = () => {
    const subject = "Vendor Registration Form";
    const body = `Please fill out your vendor information using this link: ${generatedVendorLink}`;
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

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
        maxWidth: '500px',
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
          <h4 style={{ margin: 0 }}>Generate Vendor Registration Link</h4>
          <button 
            className="close-btn" 
            onClick={handleVendorLink}
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
          {!generatedVendorLink ? (
            <div className="text-center py-4">
              <p>Generate a unique link that vendors can use to register themselves.</p>
              <button 
                className="btn btn-primary mt-3" 
                onClick={generateVendorLink}
              >
                Generate Link
              </button>
            </div>
          ) : (
            <div className="generated-link-container">
              <div className="form-group mb-3">
                <label htmlFor="vendor-link" className="form-label">Generated Link:</label>
                <div className="input-group">
                  <input 
                    type="text" 
                    id="vendor-link" 
                    className="form-control" 
                    value={generatedVendorLink} 
                    readOnly 
                    style={{ fontSize: '14px' }}
                  />
                  <div className="input-group-append">
                    <button 
                      className="btn btn-outline-secondary" 
                      type="button" 
                      onClick={copyToClipboard}
                    >
                      {linkCopied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="share-options mt-4">
                <h5>Share this link via:</h5>
                <div className="d-flex justify-content-around mt-3">
                  <button 
                    className="btn btn-success" 
                    onClick={shareViaWhatsApp}
                  >
                    <i className="fab fa-whatsapp me-2"></i> WhatsApp
                  </button>
                  <button 
                    className="btn btn-info" 
                    onClick={shareViaEmail}
                  >
                    <i className="fas fa-envelope me-2"></i> Email
                  </button>
                </div>
              </div>
              
              <div className="mt-4">
                <button 
                  className="btn btn-secondary w-100" 
                  onClick={() => {
                    handleVendorLink();
                    // Reset the link when closing
                    setTimeout(() => {
                      setGeneratedVendorLink('');
                    }, 300);
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VendorLinkPopUp;