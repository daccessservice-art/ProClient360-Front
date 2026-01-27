import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getAddress } from "../../../../../hooks/usePincode";

const VendorRegistrationForm = () => {
  const { linkId } = useParams();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    vendorName: '',
    email: '',
    typeOfVendor: '',
    GSTNo: '',
    brandName: '',
    modelName: '',
    price: '',
    websiteURL: '',
    linkedinURL: '',
    twitterProfile: '',
    vendorContactPersonName1: '',
    phoneNumber1: '',
    vendorContactPersonName2: '',
    phoneNumber2: '',
    billingAddress: {
      add: '',
      city: '',
      state: '',
      country: '',
      pincode: ''
    },
    companyProfile: null,
    materialCategory: 'Raw Material',
    vendorRating: 3,
    brandsWorkWith: '',
    customVendorType: '',
    remarks: '',
    manualAddress: ''
  });

  const [submitting, setSubmitting] = useState(false);
  const [linkValid, setLinkValid] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoadingAddress, setIsLoadingAddress] = useState(false);

  const [vendorExists, setVendorExists] = useState(false);
  const [existingVendor, setExistingVendor] = useState(null);
  const [checkingVendor, setCheckingVendor] = useState(false);

  useEffect(() => {
    const validateLink = async () => {
      try {
        if (!linkId) {
          setLinkValid(false);
          setErrorMessage("No registration link provided. Please check the URL and try again.");
          return;
        }

        const response = await fetch(`${process.env.REACT_APP_API_URL}/api/vendor/link/${linkId}`);

        if (!response.ok) {
          setLinkValid(false);
          setErrorMessage(`Server error: ${response.status}. Please try again later.`);
          return;
        }

        const data = await response.json();

        if (!data.success) {
          setLinkValid(false);
          setErrorMessage(data.error || "Invalid or expired registration link");
        } else {
          setLinkValid(true);
        }
      } catch (error) {
        setLinkValid(false);
        setErrorMessage("Network error. Please check your internet connection and try again.");
      } finally {
        setLoading(false);
      }
    };

    validateLink();
  }, [linkId]);

  const checkVendorExists = async (vendorName) => {
    if (!vendorName.trim()) {
      setVendorExists(false);
      setExistingVendor(null);
      return;
    }

    try {
      setCheckingVendor(true);
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/api/vendor/name/${encodeURIComponent(vendorName)}`
      );
      const data = await response.json();

      if (data.success) {
        setVendorExists(true);
        setExistingVendor(data.vendor);

        setFormData((prev) => ({
          ...prev,
          vendorName: data.vendor.vendorName,
          email: data.vendor.email,
          typeOfVendor: data.vendor.typeOfVendor,
          GSTNo: data.vendor.GSTNo,
          brandName: data.vendor.brandName || '',
          modelName: data.vendor.modelName || '',
          price: data.vendor.price || '',
          websiteURL: data.vendor.websiteURL || '',
          linkedinURL: data.vendor.linkedinURL || '',
          twitterProfile: data.vendor.twitterProfile || '',
          vendorContactPersonName1: data.vendor.vendorContactPersonName1,
          phoneNumber1: data.vendor.phoneNumber1,
          vendorContactPersonName2: data.vendor.vendorContactPersonName2 || '',
          phoneNumber2: data.vendor.phoneNumber2 || '',
          billingAddress: data.vendor.billingAddress || {
            add: '',
            city: '',
            state: '',
            country: '',
            pincode: ''
          },
          materialCategory: data.vendor.materialCategory || 'Raw Material',
          vendorRating: data.vendor.vendorRating || 3,
          brandsWorkWith: data.vendor.brandsWorkWith || '',
          customVendorType: data.vendor.customVendorType || '',
          remarks: data.vendor.remarks || '',
          manualAddress: data.vendor.manualAddress || ''
        }));
      } else {
        setVendorExists(false);
        setExistingVendor(null);
      }
    } catch (error) {
      console.error("Error checking vendor:", error);
    } finally {
      setCheckingVendor(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData((prev) => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value
      }));
    }

    if (name === 'vendorName') {
      checkVendorExists(value);
    }
  };

  // Handle pincode change to fetch address
  const handlePincodeChange = async (e) => {
    const value = e.target.value;
    
    // Update the pincode in the form data
    setFormData(prev => ({
      ...prev,
      billingAddress: {
        ...prev.billingAddress,
        pincode: value
      }
    }));

    // Fetch address when pincode is 6 digits
    if (value.length === 6) {
      setIsLoadingAddress(true);
      try {
        const addressData = await getAddress(value);
        
        if (addressData && addressData !== "Error") {
          setFormData(prev => ({
            ...prev,
            billingAddress: {
              ...prev.billingAddress,
              state: addressData.state || "",
              city: addressData.city || "",
              country: addressData.country || "India" // Default to India
            }
          }));
          toast.success("Address details fetched successfully");
        } else {
          toast.error("Invalid pincode or no data found");
        }
      } catch (error) {
        console.error("Error fetching address:", error);
        toast.error("Error fetching address details");
      } finally {
        setIsLoadingAddress(false);
      }
    } else if (value.length < 6) {
      // Reset address fields if pincode is less than 6 digits
      setFormData(prev => ({
        ...prev,
        billingAddress: {
          ...prev.billingAddress,
          state: "",
          city: "",
          country: ""
        }
      }));
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setFormData((prev) => ({
      ...prev,
      companyProfile: file
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (linkValid !== true) {
        toast.error("Cannot submit form with invalid link");
        return;
      }

      const submitData = new FormData();

      Object.keys(formData).forEach((key) => {
        if (key === 'billingAddress') {
          Object.keys(formData.billingAddress).forEach((addressKey) => {
            submitData.append(`billingAddress.${addressKey}`, formData.billingAddress[addressKey]);
          });
        } else if (key === 'companyProfile' && formData.companyProfile) {
          submitData.append('companyProfile', formData.companyProfile);
        } else {
          submitData.append(key, formData[key]);
        }
      });

      submitData.append('linkId', linkId);

      if (vendorExists && existingVendor) {
        submitData.append('vendorId', existingVendor._id);
      }

      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/vendor/register-from-link`, {
        method: 'POST',
        body: submitData
      });

      if (!response.ok) {
        const errorData = await response.json();
        toast.error(errorData.error || `Server error: ${response.status}`);
        return;
      }

      const data = await response.json();

      if (data.success) {
        toast.success(vendorExists ? "Vendor information updated successfully!" : "Vendor registration successful!");
        navigate('/vendor-registration-success', {
          state: {
            vendor: data.vendor || formData
          }
        });
      } else {
        toast.error(data.error || "Registration failed");
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      toast.error("An error occurred during registration");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        background: 'linear-gradient(135deg, #3b8c96 0%, #2d6b75 100%)'
      }}>
        <div style={{ textAlign: 'center', color: 'white' }}>
          <div className="spinner-border text-light mb-3" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p>Validating registration link...</p>
        </div>
      </div>
    );
  }

  if (linkValid === false) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        background: 'linear-gradient(135deg, #3b8c96 0%, #2d6b75 100%)'
      }}>
        <div style={{
          textAlign: 'center',
          color: 'white',
          padding: '30px',
          borderRadius: '8px',
          backgroundColor: 'rgba(0, 0, 0, 0.3)',
          maxWidth: '500px'
        }}>
          <i className="fa fa-exclamation-triangle fa-3x mb-3 text-warning"></i>
          <h3>Invalid Registration Link</h3>
          <p>{errorMessage}</p>
          <p>Please contact the company that sent you this link for a new one.</p>
          <div className="mt-3">
            <button
              className="btn btn-outline-light"
              onClick={() => window.location.reload()}
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #3b8c96 0%, #2d6b75 100%)',
      backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'100%25\' height=\'100%25\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cdefs%3E%3Cpattern id=\'a\' patternUnits=\'userSpaceOnUse\' width=\'100\' height=\'100\' patternTransform=\'scale(2) rotate(0)\'%3E%3Crect x=\'0\' y=\'0\' width=\'100%25\' height=\'100%25\' fill=\'hsla(0,0%,0%,0)\'/%3E%3Cpath d=\'M0 50h100M50 0v100\' stroke-linecap=\'square\' stroke-width=\'0.5\' stroke=\'hsla(0, 0%, 100%, 0.05)\' fill=\'none\'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width=\'800%25\' height=\'800%25\' transform=\'translate(0,0)\' fill=\'url(%23a)\'/%3E%3C/svg%3E")',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      padding: '40px 20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {/* CSS fix for labels and placeholders */}
      <style>{`
        /* All labels must be white */
        form label {
          color: white !important;
        }
        
        /* Placeholder styling */
        .vendor-input::placeholder {
          color: rgba(255,255,255,0.95) !important;
        }
        .vendor-input::-webkit-input-placeholder {
          color: rgba(255,255,255,0.95) !important;
        }
        .vendor-input::-moz-placeholder {
          color: rgba(255,255,255,0.95) !important;
        }
        .vendor-input:-ms-input-placeholder {
          color: rgba(255,255,255,0.95) !important;
        }
        
        /* Dropdown options should remain dark for readability */
        select.vendor-input option {
          color: #333 !important;
        }
      `}</style>

      <div style={{ maxWidth: '78%', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <img
            src="/static/assets/img/daccess.png"
            alt="Daccess Logo"
            style={{ width: '180px', height: 'auto' }}
          />
        </div>

        <div style={{
          backgroundImage: "url(/static/assets/img/vendorregback.png)",
          padding: '20px',
          textAlign: 'center',
          borderRadius: '12px 12px 12px 12px'
        }}>
          <h1 style={{
            color: 'white',
            margin: 0,
            fontWeight: '600',
            fontSize: '33px',
            letterSpacing: '2px'
          }}>
            VENDOR REGISTRATION FORM
          </h1>
        </div>

        <div style={{ padding: '15px 30px' }}></div>

        <form onSubmit={handleSubmit}>
          <div
            style={{
              backgroundImage: "url(/static/assets/img/vendorregback.png)",
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
              backgroundSize: "cover",
              borderRadius: "12px",
              boxShadow: "0 10px 40px rgba(0,0,0,0.3)",
              position: "relative",
              overflow: "hidden",
              padding: "30px"
            }}
          >
            <div style={{
              position: 'absolute',
              top: '10px',
              right: '10px',
              fontSize: '10px',
              color: 'rgba(255,255,255,0.5)'
            }}>
            </div>

            <img
              src="/static/assets/img/vendorreghand.png"
              alt="Registration illustration"
              style={{
                position: 'absolute',
                right: '0px',
                top: '130px',
                width: '380px',
                height: 'auto',
                zIndex: 2,
                pointerEvents: 'none',
                filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.2))'
              }}
            />

            <div style={{
              color: 'white',
              padding: '8px 0',
              marginBottom: '20px',
              fontSize: '16px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              borderBottom: '2px solid rgba(255, 255, 255, 0.2)'
            }}>
              <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#ff9933' }}>|</span>
              <span>Company Identity</span>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '13px', marginBottom: '5px', display: 'block' }}>
                Type of Vendor: <span style={{ color: '#ff9933' }}>*</span>
              </label>
              <select
                className="vendor-input"
                name="typeOfVendor"
                value={formData.typeOfVendor}
                onChange={handleChange}
                required
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  border: '1px solid rgba(255, 255, 255, 0.4)',
                  color: 'white',
                  padding: '12px 15px',
                  borderRadius: '4px',
                  width: '67%',
                  fontSize: '14px',
                  outline: 'none'
                }}
              >
                <option value="">Select Type*</option>
                <option value="Import">Import</option>
                <option value="B2B Material">B2B Material</option>
                <option value="Labour Contractor">Labour Contractor</option>
                <option value="Turnkey Contractor">Turnkey Contractor</option>
                <option value="Logistics">Logistics</option>
                <option value="Service">Service</option>
                <option value="Freelancer">Freelancer</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {formData.typeOfVendor === 'Other' && (
              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '13px', marginBottom: '5px', display: 'block' }}>
                  Specify Vendor Type: <span style={{ color: '#ff9933' }}>*</span>
                </label>
                <input
                  className="vendor-input"
                  type="text"
                  name="customVendorType"
                  placeholder="Enter custom vendor type"
                  value={formData.customVendorType}
                  onChange={handleChange}
                  required={formData.typeOfVendor === 'Other'}
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    border: '1px solid rgba(255, 255, 255, 0.4)',
                    color: 'white',
                    padding: '12px 15px',
                    borderRadius: '4px',
                    width: '67%',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                />
              </div>
            )}

            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '13px', marginBottom: '5px', display: 'block' }}>
                Material Category: <span style={{ color: '#ff9933' }}>*</span>
              </label>
              <select
                className="vendor-input"
                name="materialCategory"
                value={formData.materialCategory}
                onChange={handleChange}
                required
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  border: '1px solid rgba(255, 255, 255, 0.4)',
                  color: 'white',
                  padding: '12px 15px',
                  borderRadius: '4px',
                  width: '67%',
                  fontSize: '14px',
                  outline: 'none'
                }}
              >
                <option value="Raw Material">Raw Material</option>
                <option value="Finished Goods">Finished Goods</option>
                <option value="Scrap Material">Scrap Material</option>
              </select>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '13px', marginBottom: '5px', display: 'block' }}>
                Vendor Name: <span style={{ color: '#ff9933' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  className="vendor-input"
                  type="text"
                  name="vendorName"
                  placeholder="Enter Vendor Name*"
                  value={formData.vendorName}
                  onChange={handleChange}
                  required
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    border: '1px solid rgba(255, 255, 255, 0.4)',
                    color: 'white',
                    padding: '12px 15px',
                    borderRadius: '4px',
                    width: '67%',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                />
                {checkingVendor && (
                  <div style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)'
                  }}>
                    <div className="spinner-border spinner-border-sm text-light" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                  </div>
                )}
              </div>
              {vendorExists && (
                <div style={{
                  marginTop: '5px',
                  color: '#ff9933',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center'
                }}>
                  <i className="fa fa-info-circle me-1"></i>
                  Existing vendor found. Form populated with existing data.
                </div>
              )}
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '13px', marginBottom: '5px', display: 'block' }}>
                Vendor Email: <span style={{ color: '#ff9933' }}>*</span>
              </label>
              <input
                className="vendor-input"
                type="email"
                name="email"
                placeholder="Enter Vendor Email*"
                value={formData.email}
                onChange={handleChange}
                required
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  border: '1px solid rgba(255, 255, 255, 0.4)',
                  color: 'white',
                  padding: '12px 15px',
                  borderRadius: '4px',
                  width: '67%',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
            </div>

            <div style={{ marginBottom: '30px' }}>
              <label style={{ fontSize: '13px', marginBottom: '5px', display: 'block' }}>
                GST Number: <span style={{ color: '#ff9933' }}>*</span>
              </label>
              <input
                className="vendor-input"
                type="text"
                name="GSTNo"
                placeholder="Enter GST Number*"
                value={formData.GSTNo}
                onChange={handleChange}
                required
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  border: '1px solid rgba(255, 255, 255, 0.4)',
                  color: 'white',
                  padding: '12px 15px',
                  borderRadius: '4px',
                  width: '67%',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
            </div>

            <div style={{
              color: 'white',
              padding: '8px 0',
              marginBottom: '20px',
              fontSize: '16px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              borderBottom: '2px solid rgba(255, 255, 255, 0.2)'
            }}>
              <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#ff9933' }}>|</span>
              <span>Product Information</span>
            </div>

            {formData.typeOfVendor === 'B2B Material' && (
              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '13px', marginBottom: '5px', display: 'block' }}>
                  Brands Work With: <span style={{ color: '#ff9933' }}>*</span>
                </label>
                <input
                  className="vendor-input"
                  type="text"
                  name="brandsWorkWith"
                  placeholder="Enter brands you work with"
                  value={formData.brandsWorkWith}
                  onChange={handleChange}
                  required={formData.typeOfVendor === 'B2B Material'}
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    border: '1px solid rgba(255, 255, 255, 0.4)',
                    color: 'white',
                    padding: '12px 15px',
                    borderRadius: '4px',
                    width: '67%',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                />
              </div>
            )}

            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '13px', marginBottom: '5px', display: 'block' }}>
                Brand Name:
              </label>
              <input
                className="vendor-input"
                type="text"
                name="brandName"
                placeholder="Enter Brand Name"
                value={formData.brandName}
                onChange={handleChange}
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  border: '1px solid rgba(255, 255, 255, 0.4)',
                  color: 'white',
                  padding: '12px 15px',
                  borderRadius: '4px',
                  width: '67%',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '13px', marginBottom: '5px', display: 'block' }}>
                Model Name:
              </label>
              <input
                className="vendor-input"
                type="text"
                name="modelName"
                placeholder="Enter Model Name"
                value={formData.modelName}
                onChange={handleChange}
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  border: '1px solid rgba(255, 255, 255, 0.4)',
                  color: 'white',
                  padding: '12px 15px',
                  borderRadius: '4px',
                  width: '67%',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
            </div>

            <div style={{ marginBottom: '30px' }}>
              <label style={{ fontSize: '13px', marginBottom: '5px', display: 'block' }}>
                Price:
              </label>
              <input
                className="vendor-input"
                type="text"
                name="price"
                placeholder="Enter Price"
                value={formData.price}
                onChange={handleChange}
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  border: '1px solid rgba(255, 255, 255, 0.4)',
                  color: 'white',
                  padding: '12px 15px',
                  borderRadius: '4px',
                  width: '67%',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
            </div>

            <div style={{
              color: 'white',
              padding: '8px 0',
              marginBottom: '20px',
              fontSize: '16px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              borderBottom: '2px solid rgba(255, 255, 255, 0.2)'
            }}>
              <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#ff9933' }}>|</span>
              <span>Digital & Social Presence</span>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '13px', marginBottom: '5px', display: 'block' }}>
                Vendor Website (URL):
              </label>
              <input
                className="vendor-input"
                type="url"
                name="websiteURL"
                placeholder="Paste Vendor Website (URL)"
                value={formData.websiteURL}
                onChange={handleChange}
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  border: '1px solid rgba(255, 255, 255, 0.4)',
                  color: 'white',
                  padding: '12px 15px',
                  borderRadius: '4px',
                  width: '67%',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '13px', marginBottom: '5px', display: 'block' }}>
                Vendor LinkedIn (Profile Link):
              </label>
              <input
                className="vendor-input"
                type="url"
                name="linkedinURL"
                placeholder="Paste LinkedIn (Profile Link)"
                value={formData.linkedinURL}
                onChange={handleChange}
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  border: '1px solid rgba(255, 255, 255, 0.4)',
                  color: 'white',
                  padding: '12px 15px',
                  borderRadius: '4px',
                  width: '67%',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
            </div>

            <div style={{ marginBottom: '30px' }}>
              <label style={{ fontSize: '13px', marginBottom: '5px', display: 'block' }}>
                Twitter (X) Profile:
              </label>
              <input
                className="vendor-input"
                type="url"
                name="twitterProfile"
                placeholder="Paste Twitter (X) Profile"
                value={formData.twitterProfile}
                onChange={handleChange}
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  border: '1px solid rgba(255, 255, 255, 0.4)',
                  color: 'white',
                  padding: '12px 15px',
                  borderRadius: '4px',
                  width: '67%',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
            </div>

            <div style={{
              color: 'white',
              padding: '8px 0',
              marginBottom: '20px',
              fontSize: '16px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              borderBottom: '2px solid rgba(255, 255, 255, 0.2)'
            }}>
              <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#ff9933' }}>|</span>
              <span>Primary Contacts</span>
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ fontWeight: '600', fontSize: '14px' }}>
                Contact Person 1
              </label>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '13px', marginBottom: '5px', display: 'block' }}>
                Contact Person Name: <span style={{ color: '#ff9933' }}>*</span>
              </label>
              <input
                className="vendor-input"
                type="text"
                name="vendorContactPersonName1"
                placeholder="Enter Contact Person Name*"
                value={formData.vendorContactPersonName1}
                onChange={handleChange}
                required
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  border: '1px solid rgba(255, 255, 255, 0.4)',
                  color: 'white',
                  padding: '12px 15px',
                  borderRadius: '4px',
                  width: '67%',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
            </div>

            <div style={{ marginBottom: '25px' }}>
              <label style={{ fontSize: '13px', marginBottom: '5px', display: 'block' }}>
                Contact Person Mobile No.: <span style={{ color: '#ff9933' }}>*</span>
              </label>
              <input
                className="vendor-input"
                type="tel"
                name="phoneNumber1"
                placeholder="Enter Contact Person Mobile No.*"
                value={formData.phoneNumber1}
                onChange={handleChange}
                required
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  border: '1px solid rgba(255, 255, 255, 0.4)',
                  color: 'white',
                  padding: '12px 15px',
                  borderRadius: '4px',
                  width: '67%',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ fontWeight: '600', fontSize: '14px' }}>
                Contact Person 2 <span style={{ fontSize: '11px', color: '#aaa' }}>(Optional)</span>
              </label>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '13px', marginBottom: '5px', display: 'block' }}>
                Contact Person Name:
              </label>
              <input
                className="vendor-input"
                type="text"
                name="vendorContactPersonName2"
                placeholder="Enter Contact Person Name"
                value={formData.vendorContactPersonName2}
                onChange={handleChange}
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  border: '1px solid rgba(255, 255, 255, 0.4)',
                  color: 'white',
                  padding: '12px 15px',
                  borderRadius: '4px',
                  width: '67%',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '13px', marginBottom: '5px', display: 'block' }}>
                Contact Person Mobile No.:
              </label>
              <input
                className="vendor-input"
                type="tel"
                name="phoneNumber2"
                placeholder="Enter Contact Person Mobile No."
                value={formData.phoneNumber2}
                onChange={handleChange}
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  border: '1px solid rgba(255, 255, 255, 0.4)',
                  color: 'white',
                  padding: '12px 15px',
                  borderRadius: '4px',
                  width: '67%',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
            </div>

            <div style={{
              color: 'white',
              padding: '8px 0',
              marginBottom: '20px',
              fontSize: '16px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              borderBottom: '2px solid rgba(255, 255, 255, 0.2)'
            }}>
              <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#ff9933' }}>|</span>
              <span>Office Address</span>
            </div>

            {formData.typeOfVendor === 'Import' && (
              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '13px', marginBottom: '5px', display: 'block' }}>
                  Manual Address: <span style={{ color: '#ff9933' }}>*</span>
                </label>
                <textarea
                  className="vendor-input"
                  name="manualAddress"
                  placeholder="Enter manual address details"
                  value={formData.manualAddress}
                  onChange={handleChange}
                  required={formData.typeOfVendor === 'Import'}
                  rows={3}
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    border: '1px solid rgba(255, 255, 255, 0.4)',
                    color: 'white',
                    padding: '12px 15px',
                    borderRadius: '4px',
                    width: '67%',
                    fontSize: '14px',
                    outline: 'none',
                    resize: 'vertical'
                  }}
                />
              </div>
            )}

{formData.typeOfVendor !== 'Import' && formData.typeOfVendor !== 'Other' && (
  <>
    <div style={{ marginBottom: '20px' }}>
      <div style={{ display: 'flex', gap: '10px', width: '67%' }}>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: '13px', marginBottom: '5px', display: 'block' }}>
            Pincode: <span style={{ color: '#ff9933' }}>*</span>
          </label>
          <div style={{ position: 'relative' }}>
            <input
              className="vendor-input"
              type="text"
              name="pincode"
              placeholder="Enter 6-digit Pincode*"
              value={formData.billingAddress.pincode}
              onChange={handlePincodeChange}
              maxLength="6"
              required
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                border: '1px solid rgba(255, 255, 255, 0.4)',
                color: 'white',
                padding: '12px 15px',
                borderRadius: '4px',
                width: '100%',
                fontSize: '14px',
                outline: 'none'
              }}
            />
            {isLoadingAddress && (
              <div style={{
                position: 'absolute',
                right: '10px',
                top: '50%',
                transform: 'translateY(-50%)'
              }}>
                <div className="spinner-border spinner-border-sm text-light" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
              </div>
            )}
          </div>
          {formData.billingAddress.pincode.length === 6 && !isLoadingAddress && !formData.billingAddress.state && (
            <div style={{
              marginTop: '5px',
              color: '#ff9933',
              fontSize: '12px'
            }}>
              <i className="fa fa-exclamation-triangle me-1"></i>
              Invalid pincode or no data found
            </div>
          )}
        </div>

        <div style={{ flex: 1 }}>
          <label style={{ fontSize: '13px', marginBottom: '5px', display: 'block' }}>
            Country: <span style={{ color: '#ff9933' }}>*</span>
          </label>
          <input
            className="vendor-input"
            type="text"
            name="country"
            placeholder="Enter Country*"
            value={formData.billingAddress.country}
            onChange={(e) => handleChange({
              target: {
                name: 'billingAddress.country',
                value: e.target.value
              }
            })}
            required
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              border: '1px solid rgba(255, 255, 255, 0.4)',
              color: 'white',
              padding: '12px 15px',
              borderRadius: '4px',
              width: '100%',
              fontSize: '14px',
              outline: 'none'
            }}
          />
        </div>
      </div>
    </div>

    <div style={{ marginBottom: '20px' }}>
      <div style={{ display: 'flex', gap: '10px', width: '67%' }}>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: '13px', marginBottom: '5px', display: 'block' }}>
            State: <span style={{ color: '#ff9933' }}>*</span>
          </label>
          <input
            className="vendor-input"
            type="text"
            name="state"
            placeholder="Enter State*"
            value={formData.billingAddress.state}
            onChange={(e) => handleChange({
              target: {
                name: 'billingAddress.state',
                value: e.target.value
              }
            })}
            required
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              border: '1px solid rgba(255, 255, 255, 0.4)',
              color: 'white',
              padding: '12px 15px',
              borderRadius: '4px',
              width: '100%',
              fontSize: '14px',
              outline: 'none'
            }}
          />
        </div>

        <div style={{ flex: 1 }}>
          <label style={{ fontSize: '13px', marginBottom: '5px', display: 'block' }}>
            City: <span style={{ color: '#ff9933' }}>*</span>
          </label>
          <input
            className="vendor-input"
            type="text"
            name="city"
            placeholder="Enter City*"
            value={formData.billingAddress.city}
            onChange={(e) => handleChange({
              target: {
                name: 'billingAddress.city',
                value: e.target.value
              }
            })}
            required
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              border: '1px solid rgba(255, 255, 255, 0.4)',
              color: 'white',
              padding: '12px 15px',
              borderRadius: '4px',
              width: '100%',
              fontSize: '14px',
              outline: 'none'
            }}
          />
        </div>
      </div>
    </div>

    <div style={{ marginBottom: '20px' }}>
      <label style={{ fontSize: '13px', marginBottom: '5px', display: 'block' }}>
        Street Address: <span style={{ color: '#ff9933' }}>*</span>
      </label>
      <input
        className="vendor-input"
        type="text"
        name="add"
        placeholder="Enter Street Address*"
        value={formData.billingAddress.add}
        onChange={(e) => handleChange({
          target: {
            name: 'billingAddress.add',
            value: e.target.value
          }
        })}
        required
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.2)',
          border: '1px solid rgba(255, 255, 255, 0.4)',
          color: 'white',
          padding: '12px 15px',
          borderRadius: '4px',
          width: '67%',
          fontSize: '14px',
          outline: 'none'
        }}
      />
    </div>
  </>
)}
            <div style={{
              color: 'white',
              padding: '8px 0',
              marginBottom: '20px',
              fontSize: '16px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              borderBottom: '2px solid rgba(255, 255, 255, 0.2)'
            }}>
              <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#ff9933' }}>|</span>
              <span>Documentation</span>
            </div>

            <div style={{ marginBottom: '30px' }}>
              <label style={{ fontSize: '13px', marginBottom: '5px', display: 'block' }}>
                Company Profile/Business Card: <span style={{ fontSize: '11px', color: '#aaa' }}>(Optional)</span>
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  className="vendor-input"
                  type="file"
                  onChange={handleFileChange}
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    border: '1px solid rgba(255, 255, 255, 0.4)',
                    color: 'white',
                    padding: '10px 15px',
                    borderRadius: '4px',
                    width: '67%',
                    fontSize: '14px',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                />
              </div>
            </div>

            <div style={{
              color: 'white',
              padding: '8px 0',
              marginBottom: '20px',
              fontSize: '16px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              borderBottom: '2px solid rgba(255, 255, 255, 0.2)'
            }}>
              <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#ff9933' }}>|</span>
              <span>Additional Information</span>
            </div>

            <div style={{ marginBottom: '30px' }}>
              <label style={{ fontSize: '13px', marginBottom: '5px', display: 'block' }}>
                Remarks: <span style={{ fontSize: '11px', color: '#aaa' }}>(Optional)</span>
              </label>
              <textarea
                className="vendor-input"
                name="remarks"
                placeholder="Enter any additional information or remarks"
                value={formData.remarks}
                onChange={handleChange}
                rows={3}
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  border: '1px solid rgba(255, 255, 255, 0.4)',
                  color: 'white',
                  padding: '12px 15px',
                  borderRadius: '4px',
                  width: '67%',
                  fontSize: '14px',
                  outline: 'none',
                  resize: 'vertical'
                }}
              />
            </div>

            <div>
              <button
                type="submit"
                disabled={submitting}
                style={{
                  display: 'block',
                  margin: '0px',
                  background: 'white',
                  border: 'none',
                  color: '#2d6b75',
                  padding: '14px 50px',
                  borderRadius: '5px',
                  fontSize: '16px',
                  fontWeight: '700',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  width: '67%',
                  maxWidth: '800',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                  opacity: submitting ? 0.7 : 1,
                  transition: 'all 0.3s ease'
                }}
              >
                {submitting ? 'Submitting...' : (vendorExists ? 'Update Vendor' : 'Submit')}
              </button>
            </div>

          </div>
        </form>
      </div>
    </div>
  );
};

export default VendorRegistrationForm;