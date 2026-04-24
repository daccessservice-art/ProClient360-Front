import React, { useState, useEffect, useRef } from 'react';
import Select from "react-select";
import toast from 'react-hot-toast';
import axios from 'axios';
import validator from "validator";
import { getProducts } from '../../../hooks/useProduct';
import { createPurchaseOrder } from '../../../hooks/usePurchaseOrder';
import { getAddress } from '../../../hooks/usePincode';
import { createCustomer, getCustomers, getEmployees, getCustomersForBranch } from '../../../hooks/useCustomer';
import { useUser } from '../../../context/UserContext';
import { RequiredStar } from "../RequiredStar/RequiredStar";

const formatDate = (dateString) => {
  if (!dateString) return "N/A";
  try {
    const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  } catch (error) { return dateString; }
};

const formatCallDate = (dateString) => {
  if (!dateString) return "N/A";
  try {
    const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  } catch (error) { return dateString; }
};

const resolveName = (field) => {
  if (!field) return 'None';
  if (typeof field === 'object') return field.name || field.empName || field.fullName || 'None';
  if (typeof field === 'string') {
    if (/^[a-fA-F0-9]{24}$/.test(field)) return 'None';
    return field;
  }
  return 'None';
};

const formatAssignedTime = (dateString) => {
  if (!dateString) return '-';
  try {
    return new Date(dateString).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true,
    });
  } catch { return '-'; }
};

// ─────────────────────────────────────────────
// Inline Add Customer Form
// ─────────────────────────────────────────────
const InlineAddCustomerForm = ({ selectedLead, onSuccess, onCancel }) => {
  const { user } = useUser();

  const [custName, setCustName] = useState(selectedLead?.SENDER_COMPANY || '');
  const [phoneNumber1, setPhoneNumber1] = useState(selectedLead?.SENDER_MOBILE || '');
  const [email, setEmail] = useState(selectedLead?.SENDER_EMAIL || '');
  const [customerContactPersonName1, setCustomerContactPersonName1] = useState(selectedLead?.SENDER_NAME || '');
  const [customerContactPersonEmail1, setCustomerContactPersonEmail1] = useState('');
  const [customerContactPersonDesignation1, setCustomerContactPersonDesignation1] = useState('');
  const [GSTNo, setGSTNo] = useState('');
  const [gstAutoFilled, setGstAutoFilled] = useState(false);
  const [zone, setZone] = useState('');
  const [ownedBy, setOwnedBy] = useState(user?.name || '');
  const [isLoadingAddress, setIsLoadingAddress] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [employees, setEmployees] = useState([]);
  const [employeesLoading, setEmployeesLoading] = useState(false);
  const [employeeError, setEmployeeError] = useState(null);

  const [industryType, setIndustryType] = useState('');
  const [industryTypeOther, setIndustryTypeOther] = useState('');
  const [customerPriority, setCustomerPriority] = useState('');

  const [customerType, setCustomerType] = useState('main');
  const [branchOf, setBranchOf] = useState('');
  const [selectedBranchCustomer, setSelectedBranchCustomer] = useState(null);
  const [allCustomers, setAllCustomers] = useState([]);
  const [allCustomersLoading, setAllCustomersLoading] = useState(false);
  const [branchSearchText, setBranchSearchText] = useState('');
  const branchSearchTimeout = useRef(null);

  const [extraContacts, setExtraContacts] = useState([]);

  const [existingCustomer, setExistingCustomer] = useState(null);
  const [checkingDuplicate, setCheckingDuplicate] = useState(false);
  const [duplicateChecked, setDuplicateChecked] = useState(false);

  const [billingAddress, setBillingAddress] = useState({
    pincode: selectedLead?.SENDER_PINCODE || '',
    state: selectedLead?.SENDER_STATE || '',
    city: selectedLead?.SENDER_CITY || '',
    add: selectedLead?.SENDER_ADDRESS || '',
    country: selectedLead?.SENDER_COUNTRY_ISO || '',
  });

  const industryOptions = [
    "IT & Software", "Manufacturing", "Construction & Infrastructure",
    "Healthcare", "Education", "Retail", "Banking & Finance",
    "Logistics & Supply Chain", "Hospitality", "Real Estate",
    "Government & Public Sector", "Energy & Utilities", "Telecom",
    "Pharmaceuticals", "Automotive", "Dealer", "Hotel", "Gym & Club",
    "Facility Services", "Labour Contractor", "Security Systems Dealer", "Other"
  ];

  // Load employees
  useEffect(() => {
    const fetchEmployees = async () => {
      setEmployeesLoading(true);
      setEmployeeError(null);
      try {
        const data = await getEmployees();
        if (data.success && data.employees && data.employees.length > 0) {
          setEmployees(data.employees);
        } else if (data.success && data.employees && data.employees.length === 0) {
          setEmployees([]);
          setEmployeeError("No employees found.");
        } else {
          setEmployees([]);
          setEmployeeError("Failed to load employees.");
        }
      } catch {
        setEmployees([]);
        setEmployeeError("Error loading employees.");
      } finally {
        setEmployeesLoading(false);
      }
    };
    fetchEmployees();
  }, []);

  // Load branch customers when type = branch
  useEffect(() => {
    if (customerType === 'branch') fetchBranchCustomers('');
  }, [customerType]);

  useEffect(() => {
    if (customerType !== 'branch') return;
    if (branchSearchTimeout.current) clearTimeout(branchSearchTimeout.current);
    branchSearchTimeout.current = setTimeout(() => fetchBranchCustomers(branchSearchText), 400);
    return () => { if (branchSearchTimeout.current) clearTimeout(branchSearchTimeout.current); };
  }, [branchSearchText]);

  const fetchBranchCustomers = async (search) => {
    setAllCustomersLoading(true);
    try {
      const data = await getCustomersForBranch(search);
      if (data.success && data.customers) setAllCustomers(data.customers);
      else setAllCustomers([]);
    } catch { setAllCustomers([]); }
    finally { setAllCustomersLoading(false); }
  };

  // Auto-fill address from pincode
  useEffect(() => {
    const fetchData = async () => {
      if (billingAddress.pincode && billingAddress.pincode.length === 6) {
        setIsLoadingAddress(true);
        try {
          const data = await getAddress(billingAddress.pincode);
          if (data) setBillingAddress(prev => ({ ...prev, state: data.state, city: data.city, country: data.country }));
          else setBillingAddress(prev => ({ ...prev, state: '', city: '', country: '' }));
        } catch { setBillingAddress(prev => ({ ...prev, state: '', city: '', country: '' })); }
        finally { setIsLoadingAddress(false); }
      } else if (billingAddress.pincode.length < 6) {
        setBillingAddress(prev => ({ ...prev, state: '', city: '', country: '' }));
      }
    };
    const t = setTimeout(fetchData, 500);
    return () => clearTimeout(t);
  }, [billingAddress.pincode]);

  const handleBranchSelect = (customerId) => {
    const selected = allCustomers.find(c => c._id === customerId);
    if (selected) {
      setBranchOf(customerId);
      setSelectedBranchCustomer(selected);
      setBranchSearchText('');
      if (selected.GSTNo) { setGSTNo(selected.GSTNo); setGstAutoFilled(true); }
      else { setGSTNo(''); setGstAutoFilled(false); }
    }
  };

  const handleClearBranchSelection = () => {
    setBranchOf(''); setSelectedBranchCustomer(null);
    setBranchSearchText(''); setGSTNo(''); setGstAutoFilled(false);
    fetchBranchCustomers('');
  };

  const handleAddExtraContact = () => {
    if (extraContacts.length < 4)
      setExtraContacts([...extraContacts, { name: '', phone: '', email: '', designation: '' }]);
  };

  const handleExtraContactChange = (index, field, value) => {
    const updated = [...extraContacts];
    if (field === 'phone') { if (value.length <= 25) updated[index][field] = value; }
    else if (field === 'name') { if (/^[a-zA-Z\s]*$/.test(value)) updated[index][field] = value; }
    else if (field === 'designation') { if (/^[a-zA-Z0-9\s&\-\/]*$/.test(value)) updated[index][field] = value; }
    else updated[index][field] = value;
    setExtraContacts(updated);
  };

  const handleRemoveExtraContact = (index) => {
    setExtraContacts(extraContacts.filter((_, i) => i !== index));
  };

  const checkDuplicate = async () => {
    if (!email && !custName) return toast.error('Enter email or company name to check');
    setCheckingDuplicate(true); setExistingCustomer(null); setDuplicateChecked(false);
    try {
      let found = null;
      if (email) {
        const r = await getCustomers(1, 5, email);
        if (r?.customers?.length > 0) found = r.customers.find(c => c.email?.toLowerCase() === email.toLowerCase());
      }
      if (!found && custName) {
        const r = await getCustomers(1, 5, custName);
        if (r?.customers?.length > 0) found = r.customers.find(c => c.custName?.toLowerCase() === custName.toLowerCase());
      }
      setExistingCustomer(found || null); setDuplicateChecked(true);
      if (!found) toast.success('No duplicate found — safe to create!');
    } catch { toast.error('Could not check for duplicates'); }
    finally { setCheckingDuplicate(false); }
  };

  const handleCustomerSubmit = async (e) => {
    e.preventDefault();

    if (!custName || !email || !zone || !GSTNo || !industryType || !ownedBy || !customerPriority) {
      return toast.error('Please fill all required fields');
    }
    if (customerType === 'branch' && !branchOf) return toast.error('Please select a customer for this branch');
    if (industryType === 'Other' && (!industryTypeOther || !industryTypeOther.trim()))
      return toast.error('Please specify the industry type');
    if (!validator.isEmail(email)) return toast.error('Enter valid Email');
    if (billingAddress.pincode && (billingAddress.pincode.length !== 6 || !/^\d{6}$/.test(billingAddress.pincode)))
      return toast.error('Enter valid 6-digit Pincode');

    for (let i = 0; i < extraContacts.length; i++) {
      if (extraContacts[i].email && !validator.isEmail(extraContacts[i].email))
        return toast.error(`Enter a valid email for Contact Person ${i + 2}`);
    }

    const extraContactData = {};
    extraContacts.forEach((c, i) => {
      extraContactData[`customerContactPersonName${i + 2}`] = c.name;
      extraContactData[`phoneNumber${i + 2}`] = c.phone;
      extraContactData[`customerContactPersonEmail${i + 2}`] = c.email;
      extraContactData[`customerContactPersonDesignation${i + 2}`] = c.designation;
    });

    setIsSubmitting(true);
    const loadingToast = toast.loading('Creating Customer...');
    const data = await createCustomer({
      custName, phoneNumber1, email,
      customerContactPersonName1, customerContactPersonEmail1,
      customerContactPersonDesignation1,
      billingAddress, zone, GSTNo, ownedBy,
      industryType, industryTypeOther: industryType === 'Other' ? industryTypeOther : undefined,
      customerPriority, customerType,
      branchOf: customerType === 'branch' ? branchOf : null,
      ...extraContactData,
    });
    toast.dismiss(loadingToast);
    setIsSubmitting(false);

    if (data?.success) {
      toast.success('Customer created successfully!', { duration: 4000 });
      onSuccess && onSuccess(data);
    } else {
      toast.error(data?.error || 'Failed to create customer', { duration: 5000 });
    }
  };

  // ✅ & allowed in State, City, Country
  const handleStateChange = (e) => { if (/^[a-zA-Z\s&]*$/.test(e.target.value)) setBillingAddress(prev => ({ ...prev, state: e.target.value })); };
  const handleCityChange = (e) => { if (/^[a-zA-Z\s&]*$/.test(e.target.value)) setBillingAddress(prev => ({ ...prev, city: e.target.value })); };
  const handleCountryChange = (e) => { if (/^[a-zA-Z\s&]*$/.test(e.target.value)) setBillingAddress(prev => ({ ...prev, country: e.target.value })); };

  return (
    <div className="border rounded p-3 mt-3" style={{ background: '#f8f9fa' }}>
      <h6 className="fw-bold text-primary border-bottom pb-2 mb-3">
        <i className="fa-solid fa-user-plus me-2"></i>Create Customer from this Lead
      </h6>
      <div className="alert alert-info py-2 mb-3">
        <small><i className="fa fa-info-circle me-2"></i>Lead data has been pre-filled. Please review and complete the form. Creating as: <strong>{user?.name}</strong></small>
      </div>

      {duplicateChecked && existingCustomer && (
        <div className="alert alert-warning border border-warning mb-3">
          <div className="fw-bold mb-2"><i className="fa-solid fa-triangle-exclamation me-2 text-warning"></i>Customer May Already Exist!</div>
          <div className="row g-2" style={{ fontSize: '13px' }}>
            <div className="col-md-6"><span className="text-muted">Company Name:</span> <strong>{existingCustomer.custName || '—'}</strong></div>
            <div className="col-md-6"><span className="text-muted">Email:</span> <strong>{existingCustomer.email || '—'}</strong></div>
            <div className="col-md-6"><span className="text-muted">Phone:</span> <strong>{existingCustomer.phoneNumber1 || '—'}</strong></div>
            <div className="col-md-6"><span className="text-muted">Contact Person:</span> <strong>{existingCustomer.customerContactPersonName1 || '—'}</strong></div>
          </div>
        </div>
      )}
      {duplicateChecked && !existingCustomer && (
        <div className="alert alert-success py-2 mb-3">
          <i className="fa-solid fa-circle-check me-2"></i><strong>No duplicate found</strong> — safe to create!
        </div>
      )}

      <form onSubmit={handleCustomerSubmit}>
        <div className="row g-3">

          {/* Customer Name */}
          <div className="col-md-6">
            <label className="form-label fw-bold">Customer Name <RequiredStar /></label>
            <input type="text" className="form-control" value={custName}
              onChange={(e) => { if (/^[a-zA-Z0-9\s()]*$/.test(e.target.value)) setCustName(e.target.value); }}
              placeholder="Company / Customer Name" maxLength={300} required />
          </div>

          {/* Email */}
          <div className="col-md-6">
            <label className="form-label fw-bold">Email <RequiredStar /></label>
            <input type="email" className="form-control" value={email}
              onChange={(e) => setEmail(e.target.value)} placeholder="Enter Email" maxLength={50} required />
          </div>

          {/* Owned By */}
          <div className="col-md-6">
            <label className="form-label fw-bold">Owned By <RequiredStar /></label>
            <select className="form-select" value={ownedBy} onChange={(e) => setOwnedBy(e.target.value)} required disabled={employeesLoading}>
              <option value="">{employeesLoading ? '⏳ Loading...' : '-- Select Employee --'}</option>
              <option value={user?.name}>{user?.name} (Current User)</option>
              {employees.length > 0 && employees.map(emp => emp.name !== user?.name && (
                <option key={emp._id} value={emp.name}>{emp.name}</option>
              ))}
            </select>
            {employeesLoading && <small className="text-info"><i className="fa fa-spinner fa-spin me-1"></i>Loading...</small>}
            {!employeesLoading && employeeError && <small className="text-warning"><i className="fa fa-exclamation-triangle me-1"></i>{employeeError}</small>}
          </div>

          {/* GST */}
          <div className="col-md-6">
            <label className="form-label fw-bold">GST Number <RequiredStar /> <small className="text-muted fw-normal">[If not available, put NA]</small></label>
            <input type="text" className="form-control text-uppercase" value={GSTNo}
              onChange={(e) => { setGSTNo(e.target.value.toUpperCase()); setGstAutoFilled(false); }}
              placeholder="Enter GST Number" maxLength={15} minLength={2} required
              style={{ backgroundColor: gstAutoFilled ? '#e8f5e9' : (GSTNo ? '#f8f9fa' : 'white'), borderColor: gstAutoFilled ? '#4caf50' : '' }} />
            {gstAutoFilled && selectedBranchCustomer && (
              <small className="text-success" style={{ fontSize: '11px' }}>
                <i className="fa-solid fa-bolt me-1"></i>Auto-filled from <strong>{selectedBranchCustomer.custName}</strong> — edit to change
              </small>
            )}
          </div>

          {/* Zone */}
          <div className="col-md-6">
            <label className="form-label fw-bold">Zone <RequiredStar /></label>
            <select className="form-select" value={zone} onChange={(e) => setZone(e.target.value)} required>
              <option value="">Select Zone</option>
              <option value="South">South</option>
              <option value="North">North</option>
              <option value="East">East</option>
              <option value="West">West</option>
              <option value="Central">Central</option>
            </select>
          </div>

          {/* Industry Type */}
          <div className="col-md-6">
            <label className="form-label fw-bold">Industry Type <RequiredStar /></label>
            <select className="form-select" value={industryType}
              onChange={(e) => { setIndustryType(e.target.value); if (e.target.value !== 'Other') setIndustryTypeOther(''); }}
              required>
              <option value="">Select Industry Type</option>
              {industryOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>

          {industryType === 'Other' && (
            <div className="col-md-6">
              <label className="form-label fw-bold">Specify Industry Type <RequiredStar /></label>
              <input type="text" className="form-control" value={industryTypeOther}
                onChange={(e) => { if (/^[a-zA-Z0-9\s&\-]*$/.test(e.target.value)) setIndustryTypeOther(e.target.value); }}
                placeholder="Enter industry type..." maxLength={100} required />
            </div>
          )}

          {/* Customer Priority */}
          <div className="col-md-6">
            <label className="form-label fw-bold">Customer Priority <RequiredStar /></label>
            <select className="form-select" value={customerPriority} onChange={(e) => setCustomerPriority(e.target.value)} required>
              <option value="" disabled>Select Priority</option>
              <option value="P1">🔴 P1 — High Priority</option>
              <option value="P2">🟡 P2 — Medium Priority</option>
              <option value="P3">🟢 P3 — Low Priority</option>
            </select>
            <small className="text-muted">P1 = High &nbsp;|&nbsp; P2 = Medium &nbsp;|&nbsp; P3 = Low</small>
          </div>

          {/* Customer Type */}
          <div className="col-md-6">
            <label className="form-label fw-bold">Customer Type <RequiredStar /></label>
            <div className="d-flex align-items-center gap-4 mt-1">
              <div className="form-check">
                <input className="form-check-input" type="radio" name="inlineCustomerType" id="inlineTypeMain"
                  value="main" checked={customerType === 'main'}
                  onChange={(e) => { setCustomerType(e.target.value); setBranchOf(''); setSelectedBranchCustomer(null); setBranchSearchText(''); setGSTNo(''); setGstAutoFilled(false); }} />
                <label className="form-check-label" htmlFor="inlineTypeMain"><i className="fa-solid fa-building me-1"></i> Main</label>
              </div>
              <div className="form-check">
                <input className="form-check-input" type="radio" name="inlineCustomerType" id="inlineTypeBranch"
                  value="branch" checked={customerType === 'branch'}
                  onChange={(e) => setCustomerType(e.target.value)} />
                <label className="form-check-label" htmlFor="inlineTypeBranch"><i className="fa-solid fa-code-branch me-1"></i> Branch</label>
              </div>
            </div>
          </div>

          {/* Branch Of */}
          {customerType === 'branch' && (
            <div className="col-12">
              <label className="form-label fw-bold">Branch Of (Customer) <RequiredStar /></label>
              {selectedBranchCustomer ? (
                <div className="border rounded p-2 mb-2" style={{ backgroundColor: '#e8f5e9', borderColor: '#4caf50' }}>
                  <div className="d-flex justify-content-between align-items-start">
                    <div className="d-flex align-items-start gap-2">
                      <div className="d-flex align-items-center justify-content-center rounded-circle mt-1" style={{ width: '28px', height: '28px', backgroundColor: '#4caf50', flexShrink: 0 }}>
                        <i className="fa-solid fa-check text-white" style={{ fontSize: '12px' }}></i>
                      </div>
                      <div>
                        <div className="fw-bold" style={{ fontSize: '14px', color: '#2e7d32' }}>{selectedBranchCustomer.custName}</div>
                        {selectedBranchCustomer.email && <div className="text-muted" style={{ fontSize: '12px' }}><i className="fa-solid fa-envelope me-1"></i>{selectedBranchCustomer.email}</div>}
                        {selectedBranchCustomer.GSTNo && <div className="text-muted" style={{ fontSize: '12px' }}><i className="fa-solid fa-file-invoice me-1"></i>{selectedBranchCustomer.GSTNo}</div>}
                      </div>
                    </div>
                    <button type="button" className="btn btn-sm btn-outline-danger rounded-0" onClick={handleClearBranchSelection} style={{ fontSize: '11px', padding: '2px 8px' }}>
                      <i className="fa-solid fa-xmark me-1"></i>Change
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="input-group mb-2">
                    <span className="input-group-text rounded-0 bg-white"><i className="fa-solid fa-magnifying-glass text-muted"></i></span>
                    <input type="text" className="form-control form-control-sm rounded-0"
                      placeholder="Search by name, email, GST number..."
                      value={branchSearchText} onChange={(e) => setBranchSearchText(e.target.value)}
                      style={{ fontSize: '13px' }} autoFocus />
                    {branchSearchText && (
                      <button type="button" className="btn btn-outline-secondary rounded-0" onClick={() => setBranchSearchText('')} style={{ fontSize: '11px' }}>
                        <i className="fa-solid fa-xmark"></i>
                      </button>
                    )}
                  </div>
                  {!allCustomersLoading && allCustomers.length === 0 && !branchSearchText && (
                    <div className="text-center py-3 border rounded" style={{ backgroundColor: '#fff8e1', borderColor: '#ffca28' }}>
                      <i className="fa-solid fa-triangle-exclamation text-warning me-1"></i>
                      <small className="text-muted">No customer selected yet. Search above to find and select one.</small>
                    </div>
                  )}
                  {allCustomers.length > 0 && (
                    <div className="border rounded" style={{ maxHeight: '180px', overflowY: 'auto' }}>
                      {allCustomers.map(cust => (
                        <div key={cust._id} className="d-flex align-items-center px-2 py-2"
                          style={{ cursor: 'pointer', borderBottom: '1px solid #f0f0f0', transition: 'background-color 0.15s' }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e3f2fd'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                          onClick={() => handleBranchSelect(cust._id)}>
                          <i className="fa-regular fa-building text-muted me-2" style={{ fontSize: '14px' }}></i>
                          <div className="flex-grow-1">
                            <div className="fw-semibold" style={{ fontSize: '13px' }}>{cust.custName}</div>
                            <div className="text-muted" style={{ fontSize: '11px' }}>
                              {cust.email && <span className="me-3"><i className="fa-solid fa-envelope me-1"></i>{cust.email}</span>}
                              {cust.GSTNo && <span><i className="fa-solid fa-file-invoice me-1"></i>{cust.GSTNo}</span>}
                            </div>
                          </div>
                          <i className="fa-solid fa-chevron-right text-muted" style={{ fontSize: '11px' }}></i>
                        </div>
                      ))}
                    </div>
                  )}
                  {!allCustomersLoading && branchSearchText && allCustomers.length === 0 && (
                    <div className="text-center py-3 border rounded" style={{ backgroundColor: '#ffebee', borderColor: '#ef9a9a' }}>
                      <i className="fa-solid fa-circle-xmark text-danger me-1"></i>
                      <small className="text-muted">No customers found for "<strong>{branchSearchText}</strong>"</small>
                    </div>
                  )}
                  {allCustomersLoading && (
                    <div className="text-center py-3 border rounded">
                      <span className="text-muted" style={{ fontSize: '13px' }}><i className="fa fa-spinner fa-spin me-2"></i>Searching customers...</span>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Contact Information */}
          <div className="col-12">
            <div className="border rounded p-3 bg-white">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="fw-bold text-muted small text-uppercase">Contact Information</span>
                {extraContacts.length < 4 && (
                  <button type="button" className="btn btn-sm btn-outline-primary" onClick={handleAddExtraContact}>
                    <i className="fa-solid fa-plus me-1"></i> Add Contact
                  </button>
                )}
              </div>
              <div className="row g-2">
                <div className="col-md-6">
                  <label className="form-label fw-bold">Contact Person 1 <RequiredStar /></label>
                  <input type="text" className="form-control" value={customerContactPersonName1}
                    onChange={(e) => { if (/^[a-zA-Z\s]*$/.test(e.target.value)) setCustomerContactPersonName1(e.target.value); }}
                    maxLength={50} required />
                </div>
                <div className="col-md-6">
                  <label className="form-label fw-bold">Phone 1</label>
                  <input type="tel" className="form-control" value={phoneNumber1}
                    onChange={(e) => { if (e.target.value.length <= 25) setPhoneNumber1(e.target.value); }}
                    maxLength={25} />
                </div>
                <div className="col-md-6">
                  <label className="form-label fw-bold">Contact Email 1</label>
                  <input type="email" className="form-control" value={customerContactPersonEmail1}
                    onChange={(e) => setCustomerContactPersonEmail1(e.target.value)}
                    placeholder="Contact person email..." maxLength={100} />
                </div>
                <div className="col-md-6">
                  <label className="form-label fw-bold">Designation 1</label>
                  <input type="text" className="form-control" value={customerContactPersonDesignation1}
                    onChange={(e) => { if (/^[a-zA-Z0-9\s&\-\/]*$/.test(e.target.value)) setCustomerContactPersonDesignation1(e.target.value); }}
                    placeholder="e.g. Manager, Director..." maxLength={100} />
                </div>

                {extraContacts.map((contact, index) => (
                  <div key={index} className="col-12 border-top pt-2 mt-1">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <small className="fw-bold text-muted">Contact Person {index + 2}</small>
                      <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => handleRemoveExtraContact(index)}>
                        <i className="fa-solid fa-xmark me-1"></i> Remove
                      </button>
                    </div>
                    <div className="row g-2">
                      <div className="col-md-6">
                        <input type="text" className="form-control form-control-sm" placeholder={`Name ${index + 2}`}
                          value={contact.name} maxLength={50}
                          onChange={(e) => handleExtraContactChange(index, 'name', e.target.value)} />
                      </div>
                      <div className="col-md-6">
                        <input type="text" className="form-control form-control-sm" placeholder={`Phone ${index + 2}`}
                          value={contact.phone} maxLength={25}
                          onChange={(e) => handleExtraContactChange(index, 'phone', e.target.value)} />
                      </div>
                      <div className="col-md-6">
                        <input type="email" className="form-control form-control-sm" placeholder={`Email ${index + 2}`}
                          value={contact.email} maxLength={100}
                          onChange={(e) => handleExtraContactChange(index, 'email', e.target.value)} />
                      </div>
                      <div className="col-md-6">
                        <input type="text" className="form-control form-control-sm" placeholder={`Designation ${index + 2}`}
                          value={contact.designation} maxLength={100}
                          onChange={(e) => handleExtraContactChange(index, 'designation', e.target.value)} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Address */}
          <div className="col-12">
            <div className="border rounded p-3 bg-white">
              <span className="fw-bold text-muted small text-uppercase">Address <small className="text-muted fw-normal">(Optional)</small></span>
              <div className="row g-2 mt-1">
                <div className="col-md-6">
                  <label className="form-label fw-bold">Pincode</label>
                  <input type="text" className="form-control" value={billingAddress.pincode}
                    onChange={(e) => { if (/^\d{0,6}$/.test(e.target.value)) setBillingAddress(prev => ({ ...prev, pincode: e.target.value })); }}
                    placeholder="6-digit Pincode" maxLength={6} />
                  {isLoadingAddress && <small className="text-info">Loading address...</small>}
                  {billingAddress.pincode.length === 6 && !isLoadingAddress && !billingAddress.state && (
                    <small className="text-danger">Invalid pincode</small>
                  )}
                </div>
                <div className="col-md-6">
                  <label className="form-label fw-bold">State</label>
                  <input type="text" className="form-control" value={billingAddress.state}
                    onChange={handleStateChange}
                    placeholder="State (Auto-filled)" style={{ backgroundColor: billingAddress.state ? '#f8f9fa' : 'white' }} />
                </div>
                <div className="col-md-6">
                  <label className="form-label fw-bold">City</label>
                  <input type="text" className="form-control" value={billingAddress.city}
                    onChange={handleCityChange}
                    placeholder="City (Auto-filled)" style={{ backgroundColor: billingAddress.city ? '#f8f9fa' : 'white' }} />
                </div>
                <div className="col-md-6">
                  <label className="form-label fw-bold">Country</label>
                  <input type="text" className="form-control" value={billingAddress.country}
                    onChange={handleCountryChange}
                    placeholder="Country (Auto-filled)" style={{ backgroundColor: billingAddress.country ? '#f8f9fa' : 'white' }} />
                </div>
                <div className="col-12">
                  <label className="form-label fw-bold">Full Address</label>
                  <textarea className="form-control" rows={2} value={billingAddress.add}
                    onChange={(e) => setBillingAddress(prev => ({ ...prev, add: e.target.value }))}
                    placeholder="House No., Building Name, Road, Area, Colony" maxLength={500} />
                </div>
              </div>
            </div>
          </div>

        </div>

        <div className="d-flex gap-2 mt-3 flex-wrap align-items-center">
          <button type="button" className="btn btn-warning px-4" onClick={checkDuplicate} disabled={checkingDuplicate || isSubmitting}>
            {checkingDuplicate ? <><span className="spinner-border spinner-border-sm me-1"></span> Checking...</> : <><i className="fa-solid fa-magnifying-glass me-1"></i> Check Duplicate</>}
          </button>
          <button type="submit" className="btn btn-primary px-4" disabled={checkingDuplicate || isSubmitting}>
            {isSubmitting ? <><span className="spinner-border spinner-border-sm me-1"></span> Adding...</> : <><i className="fa-solid fa-user-plus me-1"></i> Add Customer</>}
          </button>
          <button type="button" className="btn btn-secondary px-4" onClick={onCancel} disabled={isSubmitting}>Cancel</button>
          {!checkingDuplicate && duplicateChecked && !existingCustomer && (
            <span className="text-success fw-bold small"><i className="fa-solid fa-circle-check me-1"></i> No duplicate — safe to add</span>
          )}
        </div>
      </form>
    </div>
  );
};

// ─────────────────────────────────────────────
// Inline Purchase Order Form (MRF)
// ─────────────────────────────────────────────
const InlinePurchaseOrderForm = ({ selectedLead, onSuccess, onCancel }) => {
  const today = new Date().toISOString().split('T')[0];
  const [orderDate, setOrderDate] = useState(today);
  const [orderTime, setOrderTime] = useState(new Date().toTimeString().slice(0, 5));
  const [transactionType, setTransactionType] = useState('');
  const [purchaseType, setPurchaseType] = useState('');
  const [projects, setProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [warehouseLocation, setWarehouseLocation] = useState('');
  const [remark, setRemark] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [location, setLocation] = useState('');
  const [useDefaultAddress, setUseDefaultAddress] = useState(false);
  const [advancePay, setAdvancePay] = useState(0);
  const [payAgainstDelivery, setPayAgainstDelivery] = useState(0);
  const [payAfterCompletion, setPayAfterCompletion] = useState(0);
  const [retention, setRetention] = useState(0);
  const [creditPeriod, setCreditPeriod] = useState(0);
  const [deliveryDate, setDeliveryDate] = useState('');
  const [materialFollowupDate, setMaterialFollowupDate] = useState('');
  const [termsDocument, setTermsDocument] = useState(null);
  const [allBrands, setAllBrands] = useState([]);
  const [brandModelsMap, setBrandModelsMap] = useState(new Map());
  const [products, setProducts] = useState([]);
  const [allModels, setAllModels] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [showCreditPopup, setShowCreditPopup] = useState(false);
  const [showPaymentTermsPopup, setShowPaymentTermsPopup] = useState(false);

  const DEFAULT_DELIVERY_ADDRESS = 'Office No. - 05, 3rd Floor, Revati Arcade-II, Opposite to Kapil Malhar Society, Baner, Pune - 411045, Maharashtra, India';
  const DEFAULT_LOCATION = 'Baner, Pune';

  const [items, setItems] = useState([{
    brandName: '', modelNo: '', description: selectedLead?.QUERY_PRODUCT_NAME || '',
    unit: '', baseUOM: '', quantity: 1, price: selectedLead?.quotation || 0,
    discountPercent: 0, taxPercent: 0, netValue: selectedLead?.quotation || 0,
  }]);

  useEffect(() => {
    const v = 100 - (Number(advancePay) + Number(payAgainstDelivery) + Number(payAfterCompletion));
    setRetention(v >= 0 ? v : 0);
  }, [advancePay, payAgainstDelivery, payAfterCompletion]);

  useEffect(() => {
    const fetchProjects = async () => {
      setLoadingProjects(true);
      try {
        const baseUrl = process.env.REACT_APP_API_URL;
        const token = localStorage.getItem('token');
        const response = await axios.get(`${baseUrl}/api/project`, { params: { page: 1, limit: 100 }, headers: { Authorization: `Bearer ${token}` } });
        const projectList = response.data?.projects || [];
        setProjects(projectList.map(p => ({ value: p._id, label: p.name })));
      } catch (err) { console.error('Project fetch error:', err?.response?.data || err.message); }
      finally { setLoadingProjects(false); }
    };
    fetchProjects();
  }, []);

  useEffect(() => {
    const loadInitialData = async () => {
      const savedBrands = localStorage.getItem('productBrands');
      let brandsFromStorage = [];
      if (savedBrands) { brandsFromStorage = JSON.parse(savedBrands); setAllBrands(brandsFromStorage.map(brand => ({ value: brand, label: brand }))); }
      else { brandsFromStorage = ["Apple", "Samsung", "Sony", "LG", "Microsoft", "Dell"]; setAllBrands(brandsFromStorage.map(brand => ({ value: brand, label: brand }))); }
      setLoadingProducts(true);
      let allProducts = []; let currentPage = 1; const pageSize = 100; let hasMore = true;
      try {
        while (hasMore) {
          const data = await getProducts(currentPage, pageSize, "");
          if (data?.success && data.products && data.products.length > 0) { allProducts = [...allProducts, ...data.products]; if (data.products.length < pageSize) hasMore = false; else currentPage++; }
          else { hasMore = false; }
        }
        setProducts(allProducts);
        const newBrandModelsMap = new Map();
        allProducts.forEach(product => { if (product.brandName && product.model) { if (!newBrandModelsMap.has(product.brandName)) newBrandModelsMap.set(product.brandName, new Set()); newBrandModelsMap.get(product.brandName).add(product.model); } });
        brandsFromStorage.forEach(brand => { if (!newBrandModelsMap.has(brand)) newBrandModelsMap.set(brand, new Set()); });
        setBrandModelsMap(newBrandModelsMap);
        const productBrands = [...new Set(allProducts.map(p => p.brandName).filter(Boolean))];
        const mergedBrands = [...new Set([...brandsFromStorage, ...productBrands])];
        setAllBrands(mergedBrands.map(brand => ({ value: brand, label: brand })));
        const uniqueModels = [...new Set(allProducts.map(p => p.model).filter(Boolean))];
        setAllModels(uniqueModels.map(model => ({ value: model, label: model })));
      } catch (error) { console.error("[InlinePO] Error loading products:", error); toast.error("Failed to load products"); }
      finally { setLoadingProducts(false); }
    };
    loadInitialData();
  }, []);

  const calculateNetValue = (item) => { const base = item.quantity * item.price; const ad = base - base * (item.discountPercent / 100); return ad + ad * (item.taxPercent / 100); };
  const handleItemChange = (index, field, value) => {
    const ni = [...items]; ni[index][field] = value;
    if (field === 'brandName') { ni[index].modelNo = ''; ni[index].baseUOM = ''; }
    if (field === 'modelNo' && value && ni[index].brandName) { const p = products.find(p => p.brandName === ni[index].brandName && p.model === value); if (p) { ni[index].baseUOM = p.baseUOM || ''; ni[index].description = p.description || ''; ni[index].unit = p.baseUOM || ''; } }
    ni[index].netValue = calculateNetValue(ni[index]); setItems(ni);
  };
  const handleAddItem = () => setItems([...items, { brandName: '', modelNo: '', description: '', unit: '', baseUOM: '', quantity: 1, price: 0, discountPercent: 0, taxPercent: 0, netValue: 0 }]);
  const handleRemoveItem = (i) => { if (items.length > 1) setItems(items.filter((_, idx) => idx !== i)); };
  const calculateTotals = () => {
    const totalAmount = items.reduce((s, i) => { const b = i.quantity * i.price; return s + b - b * (i.discountPercent / 100); }, 0);
    const totalTax = items.reduce((s, i) => { const b = i.quantity * i.price; const ad = b - b * (i.discountPercent / 100); return s + ad * (i.taxPercent / 100); }, 0);
    return { totalAmount, totalTax, grandTotal: totalAmount + totalTax };
  };
  const { totalAmount, totalTax, grandTotal } = calculateTotals();
  const handleToggleDefaultAddress = () => {
    const next = !useDefaultAddress; setUseDefaultAddress(next);
    if (next) { setDeliveryAddress(DEFAULT_DELIVERY_ADDRESS); setLocation(DEFAULT_LOCATION); toast.success('Default address applied'); }
    else { setDeliveryAddress(''); setLocation(''); }
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    for (const item of items) { if (item.quantity < 1 || item.price < 0) return toast.error('Please fill all item details correctly'); }
    const orderDateTime = new Date(`${orderDate}T${orderTime}`);
    const poData = {
      customerName: selectedLead?.SENDER_COMPANY || '', orderDate: orderDateTime, transactionType, purchaseType,
      project: purchaseType === 'Project Purchase' ? selectedProject?.value : undefined,
      warehouseLocation: purchaseType === 'Stock' ? warehouseLocation : undefined,
      deliveryAddress, location, items, totalAmount, totalTax, grandTotal, remark,
      paymentTerms: { advance: advancePay, payAgainstDelivery, payAfterCompletion, creditPeriod },
      deliveryDate: deliveryDate ? new Date(deliveryDate) : undefined,
      materialFollowupDate: materialFollowupDate ? new Date(materialFollowupDate) : undefined,
      sourceLeadId: selectedLead?._id, sourceLeadCompany: selectedLead?.SENDER_COMPANY,
    };
    if (termsDocument) {
      const fd = new FormData(); fd.append('file', termsDocument); fd.append('poData', JSON.stringify(poData));
      toast.loading('Creating Purchase Order...');
      try {
        const r = await fetch(`${process.env.REACT_APP_API_URL}/api/purchaseOrder/upload`, { method: 'POST', headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }, body: fd });
        const data = await r.json(); toast.dismiss();
        if (data.success) { toast.success(data.message || 'Purchase Order created!'); onSuccess && onSuccess(data); }
        else toast.error(data.error || 'Failed to create purchase order');
      } catch { toast.dismiss(); toast.error('Failed to upload document'); }
    } else {
      toast.loading('Creating Purchase Order...');
      const data = await createPurchaseOrder(poData); toast.dismiss();
      if (data?.success) { toast.success(data.message || 'Purchase Order created!'); onSuccess && onSuccess(data); }
      else toast.error(data?.error || 'Failed to create purchase order');
    }
  };

  return (
    <div className="border rounded p-3 mt-3" style={{ background: '#f8f9fa' }}>
      <h6 className="fw-bold text-success border-bottom pb-2 mb-3"><i className="fa-solid fa-file-invoice me-2"></i>Create Purchase Order from this Lead</h6>
      <form onSubmit={handleSubmit}>
        <div className="row g-3">
          <div className="col-12">
            <div className="alert alert-info py-2 mb-0 d-flex align-items-center gap-2">
              <i className="fa-solid fa-building text-primary"></i>
              <div>
                <span className="fw-bold">Customer: </span><span>{selectedLead?.SENDER_COMPANY || '—'}</span>
                {selectedLead?.SENDER_NAME && (<span className="text-muted ms-2">({selectedLead.SENDER_NAME})</span>)}
                {selectedLead?.SENDER_MOBILE && (<span className="text-muted ms-3"><i className="fa-solid fa-phone me-1"></i>{selectedLead.SENDER_MOBILE}</span>)}
              </div>
            </div>
          </div>
          <div className="col-md-6"><label className="form-label fw-bold">Order Date</label><input type="date" className="form-control" value={orderDate} max={today} onChange={(e) => { if (new Date(e.target.value) <= new Date()) setOrderDate(e.target.value); else toast.error('Future dates not allowed'); }} /></div>
          <div className="col-md-6"><label className="form-label fw-bold">Order Time</label><input type="time" className="form-control" value={orderTime} onChange={(e) => setOrderTime(e.target.value)} /></div>
          <div className="col-md-6"><label className="form-label fw-bold">Transaction Type</label><select className="form-select" value={transactionType} onChange={(e) => setTransactionType(e.target.value)}><option value="">Select Transaction Type</option><option value="B2B">B2B</option><option value="Import">Import</option><option value="Asset">Asset</option></select></div>
          <div className="col-md-6"><label className="form-label fw-bold">Purchase Type</label><select className="form-select" value={purchaseType} onChange={(e) => setPurchaseType(e.target.value)}><option value="">Select Type</option><option value="Project Purchase">Project Purchase</option><option value="Stock">Stock</option></select></div>
          {purchaseType === 'Project Purchase' && (
            <div className="col-md-6">
              <label className="form-label fw-bold">Project Name</label>
              <Select value={selectedProject} onChange={setSelectedProject} options={projects} placeholder={loadingProjects ? 'Loading projects...' : projects.length === 0 ? 'No projects found' : 'Select Project...'} isClearable isLoading={loadingProjects} isDisabled={loadingProjects} menuPortalTarget={document.body} styles={{ menuPortal: (b) => ({ ...b, zIndex: 9999 }) }} />
            </div>
          )}
          {purchaseType === 'Stock' && (<div className="col-md-6"><label className="form-label fw-bold">Warehouse Location</label><input type="text" className="form-control" value={warehouseLocation} onChange={(e) => setWarehouseLocation(e.target.value)} placeholder="Ex: Baner / Amazon / Mumbai" maxLength={200} /></div>)}
          <div className="col-12"><div className="form-check form-switch"><input className="form-check-input" type="checkbox" id="defaultAddressTogglePO" checked={useDefaultAddress} onChange={handleToggleDefaultAddress} style={{ cursor: 'pointer' }} /><label className="form-check-label" htmlFor="defaultAddressTogglePO" style={{ cursor: 'pointer' }}>Use Default Office Address</label></div></div>
          <div className="col-md-6"><label className="form-label fw-bold">Delivery Address</label><textarea className="form-control" rows="2" value={deliveryAddress} onChange={(e) => { setDeliveryAddress(e.target.value); if (useDefaultAddress && e.target.value !== DEFAULT_DELIVERY_ADDRESS) setUseDefaultAddress(false); }} placeholder="Enter delivery address" maxLength={500} /></div>
          <div className="col-md-6"><label className="form-label fw-bold">Location</label><input type="text" className="form-control" value={location} onChange={(e) => { setLocation(e.target.value); if (useDefaultAddress && e.target.value !== DEFAULT_LOCATION) setUseDefaultAddress(false); }} placeholder="Enter location" maxLength={200} /></div>
          <div className="col-md-6"><label className="form-label fw-bold">Terms & Conditions Document</label><input type="file" className="form-control" onChange={(e) => setTermsDocument(e.target.files[0])} accept=".pdf,.doc,.docx" /></div>
        </div>
        <div className="mt-3">
          <div className="d-flex justify-content-between align-items-center mb-2"><h6 className="fw-bold mb-0">Item Details</h6><button type="button" className="btn btn-sm btn-primary" onClick={handleAddItem}><i className="fa fa-plus me-1"></i> Add Item</button></div>
          {loadingProducts && (<div className="text-center py-2"><div className="spinner-border spinner-border-sm text-primary me-2" role="status"></div>Loading products...</div>)}
          <div className="table-responsive">
            <table className="table table-bordered table-sm">
              <thead className="table-light"><tr><th>Brand</th><th>Model</th><th>Description</th><th>Base UOM</th><th>Qty</th><th>Price (₹)</th><th>Disc %</th><th>Tax %</th><th>Net Value</th><th>Action</th></tr></thead>
              <tbody>
                {items.map((item, index) => {
                  const bm = brandModelsMap.get(item.brandName);
                  const mo = bm ? Array.from(bm).map(m => ({ value: m, label: m })) : [];
                  return (
                    <tr key={index}>
                      <td style={{ minWidth: 140 }}><Select value={allBrands.find(b => b.value === item.brandName) || null} onChange={s => handleItemChange(index, 'brandName', s ? s.value : '')} options={allBrands} placeholder="Brand..." isClearable menuPortalTarget={document.body} styles={{ menuPortal: b => ({ ...b, zIndex: 9999 }) }} /></td>
                      <td style={{ minWidth: 140 }}><Select value={mo.find(m => m.value === item.modelNo) || null} onChange={s => handleItemChange(index, 'modelNo', s ? s.value : '')} options={mo} placeholder="Model..." isClearable isDisabled={!item.brandName} menuPortalTarget={document.body} styles={{ menuPortal: b => ({ ...b, zIndex: 9999 }) }} /></td>
                      <td><textarea className="form-control form-control-sm" style={{ width: 150 }} rows={1} value={item.description} onChange={e => handleItemChange(index, 'description', e.target.value)} /></td>
                      <td><input type="text" className="form-control form-control-sm" style={{ minWidth: 80 }} value={item.baseUOM} onChange={e => handleItemChange(index, 'baseUOM', e.target.value)} /></td>
                      <td><input type="number" className="form-control form-control-sm" style={{ minWidth: 60 }} value={item.quantity} onChange={e => handleItemChange(index, 'quantity', Number(e.target.value))} min="1" /></td>
                      <td><input type="number" className="form-control form-control-sm" style={{ minWidth: 90 }} value={item.price} onChange={e => handleItemChange(index, 'price', Number(e.target.value))} min="0" step="0.01" /></td>
                      <td><input type="number" className="form-control form-control-sm" style={{ minWidth: 60 }} value={item.discountPercent} onChange={e => handleItemChange(index, 'discountPercent', Number(e.target.value))} min="0" max="100" /></td>
                      <td><input type="number" className="form-control form-control-sm" style={{ minWidth: 60 }} value={item.taxPercent} onChange={e => handleItemChange(index, 'taxPercent', Number(e.target.value))} min="0" max="100" /></td>
                      <td><input type="text" className="form-control form-control-sm" style={{ minWidth: 90 }} value={item.netValue.toFixed(2)} readOnly /></td>
                      <td><button type="button" className="btn btn-sm btn-danger" onClick={() => handleRemoveItem(index)} disabled={items.length === 1}><i className="fa fa-trash"></i></button></td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr><td colSpan={8} className="text-end fw-bold">Total Amount</td><td className="fw-bold">₹{totalAmount.toFixed(2)}</td><td></td></tr>
                <tr><td colSpan={8} className="text-end fw-bold">Total Tax</td><td className="fw-bold">₹{totalTax.toFixed(2)}</td><td></td></tr>
                <tr className="table-success"><td colSpan={8} className="text-end fw-bold">Grand Total</td><td className="fw-bold">₹{grandTotal.toFixed(2)}</td><td></td></tr>
              </tfoot>
            </table>
          </div>
        </div>
        <div className="row g-3 mt-1">
          <div className="col-md-6"><label className="form-label fw-bold">Credit Period</label><div className="input-group"><input type="text" className="form-control" value={creditPeriod ? `${creditPeriod} days` : 'Click to set credit period'} onClick={() => setShowCreditPopup(true)} readOnly style={{ cursor: 'pointer' }} /><button className="btn btn-outline-secondary" type="button" onClick={() => setShowCreditPopup(true)}><i className="fa fa-calendar"></i></button></div></div>
          <div className="col-md-6"><label className="form-label fw-bold">Payment Terms</label><div className="input-group"><input type="text" className="form-control" value={`Advance: ${advancePay}%, Delivery: ${payAgainstDelivery}%, Completion: ${payAfterCompletion}%, Retention: ${retention}%`} onClick={() => setShowPaymentTermsPopup(true)} readOnly style={{ cursor: 'pointer' }} /><button className="btn btn-outline-secondary" type="button" onClick={() => setShowPaymentTermsPopup(true)}><i className="fa fa-percent"></i></button></div></div>
          <div className="col-md-6"><label className="form-label fw-bold">Expected Delivery Date</label><input type="date" className="form-control" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} /></div>
          <div className="col-md-6"><label className="form-label fw-bold">Material Followup Date</label><input type="date" className="form-control" value={materialFollowupDate} onChange={(e) => setMaterialFollowupDate(e.target.value)} /></div>
          <div className="col-12"><label className="form-label fw-bold">Remark</label><textarea className="form-control" rows="2" value={remark} onChange={(e) => setRemark(e.target.value)} maxLength={1000} /></div>
        </div>
        <div className="d-flex gap-2 mt-3">
          <button type="submit" className="btn btn-success px-4"><i className="fa-solid fa-file-invoice me-1"></i> Create MRF</button>
          <button type="button" className="btn btn-secondary px-4" onClick={onCancel}>Cancel</button>
        </div>
      </form>
      {showCreditPopup && (
        <div className="modal fade show" style={{ display: 'flex', alignItems: 'center', backgroundColor: '#00000090', zIndex: 9999 }}>
          <div className="modal-dialog modal-dialog-centered"><div className="modal-content p-3">
            <div className="modal-header pt-0"><h5 className="card-title fw-bold">Set Credit Period</h5><button onClick={() => setShowCreditPopup(false)} type="button" className="btn-close"></button></div>
            <div className="modal-body">
              <label className="form-label fw-bold">Credit Period (Days)</label>
              <input type="number" className="form-control" value={creditPeriod} onChange={(e) => setCreditPeriod(Number(e.target.value))} min="0" />
              <div className="d-flex justify-content-end mt-3 gap-2"><button type="button" className="btn btn-secondary" onClick={() => setShowCreditPopup(false)}>Cancel</button><button type="button" className="btn btn-primary" onClick={() => setShowCreditPopup(false)}>Save</button></div>
            </div>
          </div></div>
        </div>
      )}
      {showPaymentTermsPopup && (
        <div className="modal fade show" style={{ display: 'flex', alignItems: 'center', backgroundColor: '#00000090', zIndex: 9999 }}>
          <div className="modal-dialog modal-dialog-centered"><div className="modal-content p-3">
            <div className="modal-header pt-0"><h5 className="card-title fw-bold">Payment Terms</h5><button onClick={() => setShowPaymentTermsPopup(false)} type="button" className="btn-close"></button></div>
            <div className="modal-body">
              {[{ label: 'Advance Payment (%)', value: advancePay, setter: setAdvancePay }, { label: 'Pay Against Delivery (%)', value: payAgainstDelivery, setter: setPayAgainstDelivery }, { label: 'Pay After Completion (%)', value: payAfterCompletion, setter: setPayAfterCompletion }].map(({ label, value, setter }) => (
                <div className="mb-3" key={label}><label className="form-label fw-bold">{label}</label><input type="number" step="0.01" min="0" max="100" className="form-control" value={value} onChange={(e) => { const v = e.target.value; if (/^\d*\.?\d*$/.test(v) && Number(v) <= 100) setter(v); }} /></div>
              ))}
              <div className="mb-3"><label className="form-label fw-bold">Retention (%)</label><input type="number" className="form-control" value={retention} readOnly style={{ backgroundColor: '#e9ecef' }} /></div>
              <div className="d-flex justify-content-end gap-2"><button type="button" className="btn btn-secondary" onClick={() => setShowPaymentTermsPopup(false)}>Cancel</button><button type="button" className="btn btn-primary" onClick={() => setShowPaymentTermsPopup(false)}>Save</button></div>
            </div>
          </div></div>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────
// Main ViewSalesLeadPopUp Component
// ─────────────────────────────────────────────
const ViewSalesLeadPopUp = ({ closePopUp, selectedLead }) => {
  const { user } = useUser();
  const [showPOForm, setShowPOForm] = useState(false);
  const [poCreated, setPoCreated] = useState(false);
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [customerCreated, setCustomerCreated] = useState(false);

  if (!selectedLead) return null;

  const isWonLead  = selectedLead?.STATUS === 'Won';
  const isLostLead = selectedLead?.STATUS === 'Lost';

  const canCreateCustomer =
    user?.permissions?.includes('createCustomer') ||
    user?.permissions?.includes('createLead') ||
    user?.user === 'company';

  const fullAddress = [selectedLead.SENDER_ADDRESS, selectedLead.SENDER_CITY, selectedLead.SENDER_STATE, selectedLead.SENDER_PINCODE, selectedLead.SENDER_COUNTRY_ISO].filter(Boolean).join(', ');

  const handlePOSuccess = (data) => {
    setPoCreated(true); setShowPOForm(false);
    toast.success(`Purchase Order ${data.orderNumber || ''} created successfully!`);
  };

  const handleCustomerSuccess = () => { setCustomerCreated(true); setShowCustomerForm(false); };

  return (
    <>
      <div className="modal fade show" style={{ display: 'flex', alignItems: 'center', backgroundColor: '#00000090', zIndex: 1060 }}>
        <div className="modal-dialog modal-xl modal-dialog-centered" style={{ maxHeight: '95vh', maxWidth: '1100px' }}>
          <div className="modal-content p-3" style={{ maxHeight: '95vh', overflowY: 'auto' }}>
            <div className="modal-header pt-0 border-0">
              <h5 className="card-title fw-bold">
                <i className="fa-solid fa-eye me-2"></i>Sales Lead Details{' '}
                {selectedLead?.SOURCE?.toLowerCase().includes('indiamart')   && <img src="/static/assets/img/Indiamart.png"     alt="Indiamart"   style={{ height: '40px', marginLeft: '23px' }} />}
                {selectedLead?.SOURCE?.toLowerCase().includes('tradeindia')  && <img src="/static/assets/img/tradeindia.png"    alt="TradeIndia"  style={{ width:  '60px', marginLeft: '23px' }} />}
                {selectedLead?.SOURCE?.toLowerCase().includes('facebook')    && <img src="/static/assets/img/facebook.png"      alt="facebook"    style={{ height: '40px', marginLeft: '23px' }} />}
                {selectedLead?.SOURCE?.toLowerCase().includes('google')      && <img src="/static/assets/img/google.png"        alt="google"      style={{ height: '40px', marginLeft: '23px' }} />}
                {selectedLead?.SOURCE?.toLowerCase().includes('linkedin')    && <img src="/static/assets/img/linkedin.png"      alt="linkedin"    style={{ height: '40px', marginLeft: '23px' }} />}
                {selectedLead?.SOURCE?.toLowerCase().includes('direct')      && <img src="/static/assets/img/nav/DACCESS.png"   alt="direct"      style={{ height: '40px', marginLeft: '23px' }} />}
              </h5>
              <button onClick={closePopUp} type="button" className="btn-close" aria-label="Close"></button>
            </div>

            <div className="modal-body pt-0">
              <div className="row">

                <div className="col-md-6 mb-3">
                  <h6 className="text-muted border-bottom pb-2 mb-3"><i className="fa-solid fa-user me-2"></i>Sender Information</h6>
                  <h6 className="mt-3 d-flex align-items-center gap-2">
                    <span className="fw-bold">Source:</span>
                    {selectedLead?.SOURCE?.toLowerCase() === 'indiamart'  && <span>IndiaMart</span>}
                    {selectedLead?.SOURCE?.toLowerCase() === 'tradeindia' && <span>TradeIndia</span>}
                    {selectedLead?.SOURCE?.toLowerCase() === 'facebook'   && <span>Facebook</span>}
                    {selectedLead?.SOURCE?.toLowerCase() === 'google'     && <span>Google</span>}
                    {selectedLead?.SOURCE?.toLowerCase() === 'linkedin'   && <span>LinkedIn</span>}
                    {selectedLead?.SOURCE?.toLowerCase() === 'direct'     && <span>Direct</span>}
                    {!['indiamart','tradeindia','facebook','google','linkedin','direct'].includes(selectedLead?.SOURCE?.toLowerCase()) && <span>{selectedLead?.SOURCE || '-'}</span>}
                  </h6>
                  <h6 className="mt-3"><p className="fw-bold d-inline">Name: </p>{selectedLead?.SENDER_NAME || '-'}</h6>
                  <h6 className="mt-3"><p className="fw-bold d-inline">Company: </p>{selectedLead?.SENDER_COMPANY || '-'}</h6>
                  <h6 className="mt-3"><p className="fw-bold d-inline">Email: </p>{selectedLead?.SENDER_EMAIL || '-'}</h6>
                  <h6 className="mt-3"><p className="fw-bold d-inline">Mobile: </p>{selectedLead?.SENDER_MOBILE || '-'}</h6>
                  <h6 className="mt-3"><p className="fw-bold d-inline">Address: </p>{fullAddress || '-'}</h6>
                </div>

                <div className="col-md-6 mb-3">
                  <h6 className="text-muted border-bottom pb-2 mb-3"><i className="fa-solid fa-clipboard-question me-2"></i>Query Information</h6>
                  <h6><p className="fw-bold d-inline">Product: </p>{selectedLead?.QUERY_PRODUCT_NAME || '-'}</h6>
                  <h6 className="mt-3"><p className="fw-bold d-inline">Subject: </p>{selectedLead?.SUBJECT || '-'}</h6>
                  <h6 className="mt-3"><p className="fw-bold d-inline">Query Time: </p>{formatDate(selectedLead?.createdAt) || '-'}</h6>
                  <h6 className="mt-3"><p className="fw-bold d-inline">Assigned By: </p>{resolveName(selectedLead?.assignedBy)}</h6>
                  <h6 className="mt-3"><p className="fw-bold d-inline">Assigned To: </p>{resolveName(selectedLead?.assignedTo)}</h6>
                  <h6 className="mt-3"><p className="fw-bold d-inline">Assigned Time: </p><span className="text-muted">{formatAssignedTime(selectedLead?.assignedTime)}</span></h6>
                  <h6 className="mt-3">
                    <p className="fw-bold d-inline">Status: </p>
                    <span className={`badge ms-2 ${selectedLead?.STATUS === 'Won' ? 'bg-success' : selectedLead?.STATUS === 'Lost' ? 'bg-danger' : selectedLead?.STATUS === 'Ongoing' ? 'bg-primary' : 'bg-secondary'}`}>{selectedLead?.STATUS || '-'}</span>
                  </h6>
                  <h6 className="mt-3"><p className="fw-bold d-inline">Current Stage: </p>{selectedLead?.step || '-'}</h6>
                  <h6 className="mt-3"><p className="fw-bold d-inline">Completed: </p><span className="badge bg-info ms-2">{selectedLead?.complated || 0}%</span></h6>
                  {isWonLead && (<h6 className="mt-3"><p className="fw-bold d-inline">Won Amount: </p><span className="badge bg-success ms-2">₹{selectedLead?.quotation || 0}</span></h6>)}
                  {isLostLead && (
                    <div className="mt-3">
                      <div className="alert alert-danger py-2 px-3 mb-0" style={{ borderLeft: '4px solid #dc3545' }}>
                        <div className="d-flex align-items-center mb-1"><i className="fa-solid fa-circle-xmark me-2 text-danger"></i><span className="fw-bold text-danger" style={{ fontSize: '0.85rem' }}>Lost Reason</span></div>
                        <p className="mb-0 text-dark" style={{ fontSize: '0.875rem', whiteSpace: 'pre-wrap' }}>{selectedLead?.rem || <span className="text-muted fst-italic">No reason provided.</span>}</p>
                      </div>
                    </div>
                  )}
                  {!isLostLead && selectedLead?.rem && (<h6 className="mt-3"><p className="fw-bold d-inline">Remark: </p><span className="text-muted">{selectedLead.rem}</span></h6>)}
                </div>

                <div className="col-12 mt-2">
                  <h6 className="text-muted border-bottom pb-2 mb-2"><i className="fa-solid fa-message me-2"></i>Message</h6>
                  <p className="text-wrap" style={{ whiteSpace: 'pre-wrap' }}>{selectedLead?.QUERY_MESSAGE || 'No message provided.'}</p>
                </div>

                {isWonLead && (
                  <div className="col-12 mt-3">
                    <div className="d-flex align-items-center justify-content-between border-bottom pb-2 mb-2">
                      <h6 className="text-muted mb-0"><i className="fa-solid fa-user-plus me-2 text-primary"></i>Add Customer</h6>
                      {customerCreated && (<span className="badge bg-success px-3 py-2" style={{ fontSize: '0.85rem' }}><i className="fa-solid fa-check-circle me-1"></i> Customer Added Successfully</span>)}
                      {canCreateCustomer && !showCustomerForm && !customerCreated && (<button type="button" className="btn btn-primary btn-sm" onClick={() => setShowCustomerForm(true)}><i className="fa-solid fa-plus me-1"></i> Create Customer</button>)}
                      {canCreateCustomer && showCustomerForm && !customerCreated && (<button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setShowCustomerForm(false)}><i className="fa-solid fa-chevron-up me-1"></i> Hide Form</button>)}
                    </div>
                    {canCreateCustomer && !showCustomerForm && !customerCreated && (<p className="text-muted small">Click <em>Create Customer</em> to add <strong>{selectedLead?.SENDER_COMPANY || 'this lead'}</strong> as a customer. Lead details will be pre-filled automatically.</p>)}
                    {customerCreated && (
                      <div className="alert alert-success d-flex align-items-center gap-2 mt-2">
                        <i className="fa-solid fa-circle-check fs-5"></i>
                        <div><strong>Customer Added Successfully!</strong><div className="small"><strong>{selectedLead?.SENDER_COMPANY || 'Customer'}</strong> has been added to Customer Master.</div></div>
                      </div>
                    )}
                    {canCreateCustomer && showCustomerForm && !customerCreated && (
                      <InlineAddCustomerForm selectedLead={selectedLead} onSuccess={handleCustomerSuccess} onCancel={() => setShowCustomerForm(false)} />
                    )}
                  </div>
                )}

                {(selectedLead?.STATUS === 'Won' || selectedLead?.STATUS === 'Ongoing') && (
                  <div className="col-12 mt-3">
                    <div className="d-flex align-items-center justify-content-between border-bottom pb-2 mb-2">
                      <h6 className="text-muted mb-0"><i className="fa-solid fa-file-invoice-dollar me-2 text-success"></i>Purchase Order</h6>
                      {!showPOForm && !poCreated && (<button type="button" className="btn btn-success btn-sm" onClick={() => setShowPOForm(true)}><i className="fa-solid fa-plus me-1"></i> Create MRF</button>)}
                      {poCreated && (<span className="badge bg-success fs-6"><i className="fa-solid fa-check me-1"></i> Purchase Order Created</span>)}
                      {showPOForm && (<button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setShowPOForm(false)}><i className="fa-solid fa-chevron-up me-1"></i> Hide Form</button>)}
                    </div>
                    {showPOForm && (<InlinePurchaseOrderForm selectedLead={selectedLead} onSuccess={handlePOSuccess} onCancel={() => setShowPOForm(false)} />)}
                  </div>
                )}

                {selectedLead?.callHistory && selectedLead.callHistory.length > 0 && (
                  <div className="col-12 mt-4">
                    <h6 className="text-muted border-bottom pb-2 mb-3"><i className="fa-solid fa-phone-volume me-2"></i>Call History<span className="badge bg-primary ms-2">{selectedLead.callHistory.length} Total Calls</span></h6>
                    <div className="row mb-3">
                      <div className="col-md-4"><div className="card border-info"><div className="card-body py-2"><div className="d-flex justify-content-between align-items-center"><span className="text-muted small">Days with Calls</span><span className="fw-bold text-info">{[...new Set(selectedLead.callHistory.map(c => c.day))].length}</span></div></div></div></div>
                      <div className="col-md-4"><div className="card border-warning"><div className="card-body py-2"><div className="d-flex justify-content-between align-items-center"><span className="text-muted small">Total Attempts</span><span className="fw-bold text-warning">{selectedLead.callHistory.length}</span></div></div></div></div>
                      <div className="col-md-4"><div className="card border-success"><div className="card-body py-2"><div className="d-flex justify-content-between align-items-center"><span className="text-muted small">Answered Calls</span><span className="fw-bold text-success">{selectedLead.callHistory.filter(c => c.status === 'answered').length}</span></div></div></div></div>
                    </div>
                    {(() => {
                      const cbd = {};
                      selectedLead.callHistory.forEach(call => { if (!cbd[call.day]) cbd[call.day] = []; cbd[call.day].push(call); });
                      return Object.keys(cbd).sort((a, b) => a - b).map(day => (
                        <div key={day} className="mb-4">
                          <div className="d-flex align-items-center mb-2">
                            <span className="badge bg-primary me-2" style={{ fontSize: '0.9rem' }}><i className="fa-solid fa-calendar-day me-1"></i>Day {day}</span>
                            <span className="text-muted small">{cbd[day].length} attempt{cbd[day].length > 1 ? 's' : ''}</span>
                          </div>
                          <div className="table-responsive">
                            <table className="table table-sm table-bordered table-hover">
                              <thead className="table-light"><tr><th style={{ width: '100px' }}>Attempt #</th><th>Date & Time</th><th style={{ width: '120px' }}>Status</th><th>Remarks</th></tr></thead>
                              <tbody>
                                {cbd[day].sort((a, b) => a.attempt - b.attempt).map((call, index) => (
                                  <tr key={index}>
                                    <td className="text-center fw-bold"><i className="fa-solid fa-phone me-1 text-primary"></i>Call {call.attempt}</td>
                                    <td><i className="fa-regular fa-clock me-1 text-muted"></i>{formatCallDate(call.date)}</td>
                                    <td><span className={`badge w-100 ${call.status === 'answered' ? 'bg-success' : 'bg-warning'}`}>{call.status === 'answered' ? <><i className="fa-solid fa-check me-1"></i>Answered</> : <><i className="fa-solid fa-phone-slash me-1"></i>Attempted</>}</span></td>
                                    <td className="text-muted">{call.remarks || '-'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ));
                    })()}
                    {selectedLead.callHistory.length >= 9 && (
                      <div className="alert alert-danger d-flex align-items-center mt-3">
                        <i className="fa-solid fa-exclamation-triangle me-3" style={{ fontSize: '1.5rem' }}></i>
                        <div><strong>Maximum Call Attempts Reached</strong><p className="mb-0 small">This lead has been called for 3 days with 3 attempts each day (9 total calls) and should be marked as Call Unanswered or Not Feasible.</p></div>
                      </div>
                    )}
                  </div>
                )}
                {(!selectedLead?.callHistory || selectedLead.callHistory.length === 0) && (
                  <div className="col-12 mt-3">
                    <div className="alert alert-secondary"><i className="fa-solid fa-info-circle me-2"></i>No call attempts have been recorded for this lead yet.</div>
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