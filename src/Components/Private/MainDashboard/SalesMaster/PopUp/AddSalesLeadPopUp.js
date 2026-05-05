import React, { useState, useEffect, useCallback, useContext, useRef } from 'react';
import toast from 'react-hot-toast';
import { RequiredStar } from "../../../RequiredStar/RequiredStar";
import { getAddress } from "../../../../../hooks/usePincode";
import { getCustomers, getCustomerById } from "../../../../../hooks/useCustomer";
import { getDepartment } from "../../../../../hooks/useDepartment";
import { getEmployee } from "../../../../../hooks/useEmployees";
import { UserContext } from "../../../../../context/UserContext";
import Select from "react-select";

const PAGE_SIZE = 15;

const isValidName = (value) => /^[A-Za-z\s]+$/.test(value.trim());
const isValidEmail = (value) =>
  /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/.test(value.trim());
const isValidSubject = (value) => /[A-Za-z]/.test(value.trim());
const isValidCustomText = (value) => /[A-Za-z]/.test(value.trim());
const isValidMessage = (value) => !value.trim() || /[A-Za-z]/.test(value.trim());
const isValidPincode = (value) => /^\d{6}$/.test(value.trim());
const isValidAddressText = (value) => !value.trim() || /^[A-Za-z\s&]+$/.test(value.trim());

const AddSalesLeadPopup = ({ onAddLead, onClose }) => {
  const { user } = useContext(UserContext);
  const [customerType, setCustomerType] = useState('new');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    contact: '',
    company: '',
    subject: '',
    products: [],
    sources: '',
    callLeads: '',
    message: '',
    status: 'Pending',
    value: '',
    address: { pincode: '', state: '', city: '', country: '', add: '' },
  });

  const [fieldErrors, setFieldErrors] = useState({
    name: '', email: '', subject: '', message: '',
    customProduct: '', customSource: '',
    pincode: '', state: '', city: '', country: '',
  });
  const [pincodeStatus, setPincodeStatus] = useState('');

  const setFieldError = (field, msg) => setFieldErrors(prev => ({ ...prev, [field]: msg }));
  const clearFieldError = (field) => setFieldErrors(prev => ({ ...prev, [field]: '' }));

  const [custOptions, setCustOptions] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [custPage, setCustPage] = useState(1);
  const [custHasMore, setCustHasMore] = useState(true);
  const [custLoading, setCustLoading] = useState(false);
  const [custSearch, setCustSearch] = useState('');
  const [debouncedCustSearch, setDebouncedCustSearch] = useState('');
  const [isLoadingCustomerAddress, setIsLoadingCustomerAddress] = useState(false);
  const [isLoadingAddress, setIsLoadingAddress] = useState(false);

  const latestCustRequestId = useRef(0);

  const [assignmentType, setAssignmentType] = useState('self');
  const [departments, setDepartments] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [hasMoreDepartments, setHasMoreDepartments] = useState(true);
  const [deptPage, setDeptPage] = useState(1);
  const [deptSearchTerm, setDeptSearchTerm] = useState('');
  const [assignedEmployee, setAssignedEmployee] = useState(null);
  const [employeeOptions, setEmployeeOptions] = useState([]);
  const [hasMoreEmployees, setHasMoreEmployees] = useState(true);
  const [empPage, setEmpPage] = useState(1);
  const [empSearchTerm, setEmpSearchTerm] = useState('');
  const [loadingEmployees, setLoadingEmployees] = useState(false);

  const [showCustomSource, setShowCustomSource] = useState(false);
  const [customSource, setCustomSource] = useState('');
  const [showCustomProduct, setShowCustomProduct] = useState(false);
  const [customProduct, setCustomProduct] = useState('');

  const productsList = [
    'surveillance System', 'Access Control System', 'TurnKey Project', 'Alleviz',
    'CafeLive', 'WorksJoy', 'WorksJoy Blu', 'Fire Alarm System', 'Fire Hydrant System',
    'IDS', 'AI Face Machines', 'Entrance Automation', 'Guard Tour System',
    'Home Automation', 'IP PA and Communication System', 'CRM', 'Security Systems',
    'KMS', 'VMS', 'PMS', 'Boom Barrier System', 'Tripod System', 'Flap Barrier System',
    'EPBX System', 'CMS', 'Lift Eliviter System', 'AV6', 'Walky Talky System',
    'Device Management System', 'VisionIQ','CineMind','Extracto','Virtual Agent', 'Other',
  ];

  const productOptions = productsList.map(p => ({ value: p, label: p }));

  const sources = [
    'Google', 'Tender', 'Exhibitions', 'JustDial', 'Facebook', 'LinkedIn',
    'Twitter', 'YouTube', 'WhatsApp', 'Referral', 'Email Campaign', 'Cold Call',
    'Website', 'Walk-In', 'Direct', 'Other',
  ];

  const callLeadOptions = ['Hot Leads', 'Warm Leads', 'Cold Leads', 'Invalid Leads'];

  const loadDepartments = useCallback(async (page = 1, search = '') => {
    try {
      const data = await getDepartment(page, PAGE_SIZE, search);
      if (data?.departments) {
        setDepartments(prev => page === 1 ? data.departments : [...prev, ...data.departments]);
        setHasMoreDepartments(data.departments.length === PAGE_SIZE);
      }
    } catch (error) { console.log(error); }
  }, []);

  const loadEmployees = useCallback(async (page = 1, search = '') => {
    if (!selectedDepartment) return;
    setLoadingEmployees(true);
    try {
      const data = await getEmployee(selectedDepartment.value, page, PAGE_SIZE, search);
      let arr = Array.isArray(data) ? data : data?.employee ?? data?.employees ?? data?.data ?? [];
      if (arr.length > 0) {
        const formatted = arr.map(e => ({ value: e._id, label: e.name, employeeData: e }));
        setEmployeeOptions(prev => page === 1 ? formatted : [...prev, ...formatted]);
        setHasMoreEmployees(arr.length === PAGE_SIZE);
      } else {
        if (page === 1) { setEmployeeOptions([]); if (!search) toast.info('No employees found for this department'); }
        setHasMoreEmployees(false);
      }
    } catch (error) {
      console.log('Error fetching employees:', error);
      if (page === 1) toast.error('Failed to fetch employees');
    } finally { setLoadingEmployees(false); }
  }, [selectedDepartment]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedCustSearch(custSearch), 400);
    return () => clearTimeout(t);
  }, [custSearch]);

  const loadCustomers = useCallback(async (page, search) => {
    const requestId = ++latestCustRequestId.current;
    setCustLoading(true);
    try {
      const searchParam = search && search.trim() !== '' ? search.trim() : null;
      const data = await getCustomers(page, PAGE_SIZE, searchParam);
      if (requestId !== latestCustRequestId.current) return;
      if (!data || data.error) {
        toast.error(data?.error || 'Failed to load customers');
        if (page === 1) setCustOptions([]);
        return;
      }
      const customers = data.customers || data.data || [];
      const newOpts = customers.map(c => ({ value: c._id, label: c.custName || c.name || 'Unnamed' }));
      setCustOptions(prev => page === 1 ? newOpts : [...prev, ...newOpts]);
      setCustHasMore(customers.length === PAGE_SIZE);
      setCustPage(page + 1);
    } catch (error) {
      if (requestId !== latestCustRequestId.current) return;
      toast.error('Failed to load customers');
    } finally {
      if (requestId === latestCustRequestId.current) setCustLoading(false);
    }
  }, []);

  useEffect(() => {
    if (customerType === 'existing') {
      setCustPage(1); setCustHasMore(true); setCustOptions([]);
      loadCustomers(1, debouncedCustSearch);
    }
  }, [customerType, debouncedCustSearch, loadCustomers]);

  const handleCustomerSelect = async (selectedOption) => {
    setSelectedCustomer(selectedOption);
    if (selectedOption) {
      setIsLoadingCustomerAddress(true);
      try {
        const customerData = await getCustomerById(selectedOption.value);
        if (customerData && (customerData.customer || customerData.data)) {
          const customer = customerData.customer || customerData.data;
          const billingAddress = customer.billingAddress || customer.address || {};
          setFormData(prev => ({
            ...prev,
            name: customer.customerContactPersonName1 || customer.customerContactPersonName2 || '',
            email: customer.email || customer.contactPersonEmail || '',
            contact: customer.phoneNumber1 || customer.contact || customer.contactNumber || '',
            company: customer.custName || customer.name || customer.companyName || '',
            address: {
              pincode: billingAddress.pincode || billingAddress.pin || billingAddress.zip || billingAddress.zipCode || customer.pincode || '',
              state: billingAddress.state || '',
              city: billingAddress.city || '',
              add: billingAddress.add || billingAddress.addressLine1 || billingAddress.address || '',
              country: billingAddress.country || 'India',
            },
          }));
          toast.success('Customer details loaded successfully');
        } else { resetFormData(); toast('No details found for this customer'); }
      } catch { toast.error('Failed to load customer details'); resetFormData(); }
      finally { setIsLoadingCustomerAddress(false); }
    } else { resetFormData(); }
  };

  const resetFormData = () => {
    setFormData(prev => ({
      ...prev, name: '', email: '', contact: '', company: '', products: [],
      address: { pincode: '', state: '', city: '', add: '', country: '' },
    }));
    setShowCustomProduct(false);
    setCustomProduct('');
    setPincodeStatus('');
    clearFieldError('pincode');
  };

  useEffect(() => { loadDepartments(1, deptSearchTerm); }, [loadDepartments, deptSearchTerm]);

  useEffect(() => {
    if (selectedDepartment) {
      setEmpPage(1); setEmployeeOptions([]); setAssignedEmployee(null);
      loadEmployees(1, empSearchTerm);
    } else { setEmployeeOptions([]); setAssignedEmployee(null); }
  }, [selectedDepartment, loadEmployees, empSearchTerm]);

  // ✅ FIXED: Smart pincode handling — works for BOTH new & existing customers
  useEffect(() => {
    const fetchData = async () => {
      const pin = formData.address.pincode || '';

      if (pin.length === 0) {
        clearFieldError('pincode');
        setPincodeStatus('');
        return;
      }

      if (pin.length > 0 && pin.length < 6) {
        // Only enforce errors for NEW customers
        if (customerType === 'new') {
          setFieldError('pincode', 'Pincode must be exactly 6 digits.');
          setPincodeStatus('');
          setFormData(prev => ({ ...prev, address: { ...prev.address, state: '', city: '', country: '' } }));
        }
        return;
      }

      if (pin.length === 6) {
        // ✅ Existing customer: if state & city already loaded from DB, trust them — skip API
        if (customerType === 'existing' && formData.address.state && formData.address.city) {
          setPincodeStatus('valid');
          clearFieldError('pincode');
          return;
        }

        clearFieldError('pincode');
        setPincodeStatus('loading');
        setIsLoadingAddress(true);
        try {
          const data = await getAddress(pin);
          if (data && data !== 'Error' && (data.state || data.city)) {
            setFormData(prev => ({
              ...prev,
              address: {
                ...prev.address,
                state: data.state || prev.address.state || '',
                city: data.city || prev.address.city || '',
                country: data.country || prev.address.country || 'India',
              },
            }));
            setPincodeStatus('valid');
            clearFieldError('pincode');
          } else {
            // ✅ Existing customer: keep saved data on API failure
            if (customerType === 'existing') {
              setPincodeStatus('');
              clearFieldError('pincode');
            } else {
              setFormData(prev => ({ ...prev, address: { ...prev.address, state: '', city: '', country: '' } }));
              setPincodeStatus('invalid');
              setFieldError('pincode', 'Invalid Pincode — no location found. Please check and try again.');
            }
          }
        } catch {
          // ✅ Existing customer: keep saved data on API error
          if (customerType === 'existing') {
            setPincodeStatus('');
            clearFieldError('pincode');
          } else {
            setFormData(prev => ({ ...prev, address: { ...prev.address, state: '', city: '', country: '' } }));
            setPincodeStatus('invalid');
            setFieldError('pincode', 'Could not verify pincode. Please check your connection.');
          }
        } finally { setIsLoadingAddress(false); }
      }
    };
    const t = setTimeout(fetchData, 600);
    return () => clearTimeout(t);
  }, [formData.address.pincode, customerType, formData.address.state, formData.address.city]);

  const handleAddressChange = (e) => {
    const { name, value } = e.target;
    if (['state', 'city', 'country'].includes(name)) {
      if (value && !isValidAddressText(value)) {
        setFieldError(name, `${name.charAt(0).toUpperCase() + name.slice(1)} must contain only letters and spaces.`);
        return;
      } else { clearFieldError(name); }
    }
    if (name === 'pincode') {
      const digitsOnly = value.replace(/[^0-9]/g, '');
      if (value !== digitsOnly) { setFieldError('pincode', 'Pincode must contain digits only.'); }
      else { clearFieldError('pincode'); }
      setFormData(prev => ({ ...prev, address: { ...prev.address, [name]: digitsOnly } }));
      return;
    }
    setFormData(prev => ({ ...prev, address: { ...prev.address, [name]: value } }));
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'name') {
      if (value && !isValidName(value)) { setFieldError('name', 'Contact Name must contain only letters and spaces.'); }
      else { clearFieldError('name'); }
      setFormData(prev => ({ ...prev, [name]: value })); return;
    }
    if (name === 'email') {
      if (value && !isValidEmail(value)) { setFieldError('email', 'Please enter a valid email address.'); }
      else { clearFieldError('email'); }
      setFormData(prev => ({ ...prev, [name]: value })); return;
    }
    if (name === 'subject') {
      if (value && !isValidSubject(value)) { setFieldError('subject', 'Subject must contain at least one letter.'); }
      else { clearFieldError('subject'); }
      setFormData(prev => ({ ...prev, [name]: value })); return;
    }
    if (name === 'message') {
      if (value && !isValidMessage(value)) { setFieldError('message', 'Message must contain at least one letter.'); }
      else { clearFieldError('message'); }
      setFormData(prev => ({ ...prev, [name]: value })); return;
    }
    if (name === 'sources') {
      if (value === 'Other') { setShowCustomSource(true); setFormData(prev => ({ ...prev, [name]: '' })); }
      else { setShowCustomSource(false); setCustomSource(''); clearFieldError('customSource'); setFormData(prev => ({ ...prev, [name]: value })); }
      return;
    }
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleProductsChange = (selectedOptions) => {
    const hasOther = selectedOptions?.some(opt => opt.value === 'Other') || false;
    if (hasOther) {
      setShowCustomProduct(true);
      const otherProducts = selectedOptions?.filter(opt => opt.value !== 'Other') || [];
      setFormData(prev => ({ ...prev, products: otherProducts }));
    } else {
      setShowCustomProduct(false);
      setCustomProduct('');
      clearFieldError('customProduct');
      setFormData(prev => ({ ...prev, products: selectedOptions || [] }));
    }
  };

  const handleCustomProductChange = (e) => {
    const value = e.target.value;
    setCustomProduct(value);
    if (value && !isValidCustomText(value)) {
      setFieldError('customProduct', 'Product name must contain at least one letter.');
    } else {
      clearFieldError('customProduct');
    }
  };

  const handleCustomSourceChange = (e) => {
    const value = e.target.value;
    setCustomSource(value); setFormData(prev => ({ ...prev, sources: value }));
    if (value && !isValidCustomText(value)) { setFieldError('customSource', 'Source must contain at least one letter.'); }
    else { clearFieldError('customSource'); }
  };

  const handleCustomerTypeChange = (e) => {
    const type = e.target.value;
    setCustomerType(type);
    setPincodeStatus('');
    clearFieldError('pincode');
    if (type === 'new') {
      resetFormData(); setSelectedCustomer(null);
      setCustPage(1); setCustHasMore(true); setCustOptions([]);
      setCustSearch(''); setDebouncedCustSearch('');
    }
  };

  const getFinalProducts = () => {
    const selectedProductNames = formData.products.map(p => p.value || p.label || p);
    if (showCustomProduct && customProduct.trim()) {
      selectedProductNames.push(customProduct.trim());
    }
    return selectedProductNames.join(', ');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const { name, email, contact, subject, company, products, sources, callLeads, message, address } = formData;
    const finalProducts = getFinalProducts();

    if (customerType === 'new') {
      if (!name || !company || !contact || !finalProducts || !address.pincode || !address.add || !sources) {
        toast.error('Please fill in all required fields, including Pincode, full address, and source.');
        return;
      }
    } else {
      if (!selectedCustomer || !finalProducts || !sources) {
        toast.error('Please select a customer and fill in all required fields.');
        return;
      }
    }

    if (name && !isValidName(name)) { toast.error('Contact Name must contain only letters and spaces.'); setFieldError('name', 'Contact Name must contain only letters and spaces.'); return; }
    if (email && !isValidEmail(email)) { toast.error('Please enter a valid email address.'); setFieldError('email', 'Please enter a valid email address.'); return; }
    if (subject && !isValidSubject(subject)) { toast.error('Subject must contain at least one letter.'); setFieldError('subject', 'Subject must contain at least one letter.'); return; }
    if (message && !isValidMessage(message)) { toast.error('Message must contain at least one letter.'); setFieldError('message', 'Message must contain at least one letter.'); return; }

    // ✅ Only validate pincode strictly for NEW customers
    if (customerType === 'new' && address.pincode) {
      if (!isValidPincode(address.pincode)) { toast.error('Pincode must be exactly 6 digits.'); setFieldError('pincode', 'Pincode must be exactly 6 digits.'); return; }
      if (pincodeStatus === 'invalid') { toast.error('Invalid Pincode — no location found.'); setFieldError('pincode', 'Invalid Pincode.'); return; }
    }
    if (address.state && !isValidAddressText(address.state)) { toast.error('State must contain only letters and spaces.'); setFieldError('state', 'State: letters only.'); return; }
    if (address.city && !isValidAddressText(address.city)) { toast.error('City must contain only letters and spaces.'); setFieldError('city', 'City: letters only.'); return; }
    if (address.country && !isValidAddressText(address.country)) { toast.error('Country must contain only letters and spaces.'); setFieldError('country', 'Country: letters only.'); return; }

    if (showCustomSource) {
      if (!customSource.trim()) { toast.error('Please enter a custom source.'); return; }
      if (!isValidCustomText(customSource)) { toast.error('Source must contain at least one letter.'); setFieldError('customSource', 'Source: must contain letters.'); return; }
    }
    if (showCustomProduct) {
      if (!customProduct.trim()) { toast.error('Please enter a custom product name.'); return; }
      if (!isValidCustomText(customProduct)) { toast.error('Product name must contain at least one letter.'); setFieldError('customProduct', 'Product: must contain letters.'); return; }
    }
    if (assignmentType === 'employee' && !assignedEmployee) { toast.error('Please select an employee to assign the lead to.'); return; }

    const hasErrors = Object.values(fieldErrors).some(msg => msg !== '');
    if (hasErrors) { toast.error('Please fix the highlighted errors before submitting.'); return; }

    const assignedTo = assignmentType === 'self' ? user._id : assignedEmployee;

    const mappedData = {
      customerType,
      customerId: customerType === 'existing' ? selectedCustomer.value : null,
      SENDER_NAME: name,
      SENDER_EMAIL: email,
      SENDER_MOBILE: contact,
      SUBJECT: subject,
      SENDER_COMPANY: company,
      SENDER_ADDRESS: address.add,
      SENDER_CITY: address.city,
      SENDER_STATE: address.state,
      SENDER_PINCODE: address.pincode,
      SENDER_COUNTRY_ISO: address.country,
      QUERY_PRODUCT_NAME: finalProducts,
      QUERY_SOURCES_NAME: sources,
      QUERY_MESSAGE: message || '',
      callLeads: callLeads || 'Warm Leads',
      feasibility: 'feasible',
      assignedTo,
      assignedBy: user._id,
      assignedTime: new Date().toISOString(),
    };

    onAddLead(mappedData);
  };

  const FieldError = ({ msg }) =>
    msg ? <small className="text-danger d-block mt-1"><i className="fa-solid fa-circle-exclamation me-1"></i>{msg}</small> : null;

  const selectStyles = {
    control: (p) => ({ ...p, borderRadius: 0, borderColor: '#ced4da', fontSize: '14px', minHeight: '38px' }),
    option: (p, s) => ({
      ...p,
      backgroundColor: s.isSelected ? '#007bff' : s.isFocused ? '#f8f9fa' : 'white',
      color: s.isSelected ? 'white' : '#212529',
    }),
    multiValue: (p) => ({ ...p, backgroundColor: '#007bff', borderRadius: '3px' }),
    multiValueLabel: (p) => ({ ...p, color: 'white', fontSize: '13px', padding: '2px 6px' }),
    multiValueRemove: (p) => ({
      ...p, color: 'white', paddingLeft: '4px', paddingRight: '4px',
      ':hover': { backgroundColor: '#0056b3', color: 'white' },
    }),
    placeholder: (p) => ({ ...p, color: '#6c757d', fontSize: '14px' }),
  };

  return (
    <>
      <div className="modal fade show" style={{ display: 'flex', alignItems: 'center', backgroundColor: '#00000090' }}>
        <div className="modal-dialog modal-lg">
          <div className="modal-content p-3">
            <form onSubmit={handleSubmit} noValidate>
              <div className="modal-header pt-0">
                <h5 className="card-title fw-bold">Add Sales Lead</h5>
                <button onClick={onClose} type="button" className="btn-close" aria-label="Close" style={{ backgroundColor: 'red' }}></button>
              </div>

              <div className="modal-body" style={{ maxHeight: 'calc(80vh - 240px)', overflowY: 'auto' }}>
                <div className="row g-3">

                  {/* Customer Type */}
                  <div className="col-12 mb-3">
                    <label className="form-label fw-bold">Customer Type <RequiredStar /></label>
                    <div className="d-flex gap-4">
                      <div className="form-check">
                        <input className="form-check-input" type="radio" name="customerType" id="newCustomer" value="new" checked={customerType === 'new'} onChange={handleCustomerTypeChange} />
                        <label className="form-check-label" htmlFor="newCustomer">New Customer</label>
                      </div>
                      <div className="form-check">
                        <input className="form-check-input" type="radio" name="customerType" id="existingCustomer" value="existing" checked={customerType === 'existing'} onChange={handleCustomerTypeChange} />
                        <label className="form-check-label" htmlFor="existingCustomer">Existing Customer</label>
                      </div>
                    </div>
                  </div>

                  {customerType === 'existing' && (
                    <div className="col-12">
                      <div className="mb-3">
                        <label className="form-label">Select client <RequiredStar /></label>
                        <Select
                          options={custOptions} value={selectedCustomer} onChange={handleCustomerSelect}
                          onInputChange={val => setCustSearch(val)}
                          onMenuScrollToBottom={() => { if (!custLoading && custHasMore) loadCustomers(custPage, debouncedCustSearch); }}
                          isLoading={custLoading} placeholder="Search and select client..."
                          noOptionsMessage={({ inputValue }) => inputValue ? 'No clients found.' : 'Type to search...'}
                          loadingMessage={() => 'Loading clients...'} closeMenuOnSelect filterOption={() => true}
                          styles={selectStyles}
                        />
                        <div className="mt-1">
                          {custLoading && <small className="text-info">Loading clients...</small>}
                          {isLoadingCustomerAddress && <small className="text-info">Loading client details...</small>}
                          {selectedCustomer && !isLoadingCustomerAddress && <small className="text-success">Client selected: {selectedCustomer.label}</small>}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Company / Customer Name */}
                  <div className="col-md-6">
                    <label className="form-label">Customer Name <RequiredStar /></label>
                    <input type="text" className="form-control" name="company" placeholder="Enter a Company Name...." maxLength={100}
                      value={formData.company} onChange={handleInputChange} required readOnly={customerType === 'existing'}
                      style={customerType === 'existing' ? { backgroundColor: '#f8f9fa' } : {}} />
                  </div>

                  {/* Contact Name */}
                  <div className="col-md-6">
                    <label className="form-label">Contact Name <RequiredStar /></label>
                    <input type="text" className={`form-control ${fieldErrors.name ? 'is-invalid' : ''}`} name="name"
                      placeholder="Enter a Contact Name...." maxLength={50} value={formData.name} onChange={handleInputChange}
                      onKeyPress={(e) => { if (!/[A-Za-z\s]/.test(e.key)) e.preventDefault(); }}
                      required readOnly={customerType === 'existing'}
                      style={customerType === 'existing' ? { backgroundColor: '#f8f9fa' } : {}} />
                    <FieldError msg={fieldErrors.name} />
                  </div>

                  {/* EMAIL */}
                  <div className="col-md-6">
                    <label className="form-label">Contact Email</label>
                    <input type="email" className={`form-control ${fieldErrors.email ? 'is-invalid' : ''}`} name="email"
                      placeholder="Enter Email ID (optional)...." maxLength={100} value={formData.email} onChange={handleInputChange}
                      onBlur={() => {
                        if (formData.email && !isValidEmail(formData.email)) { setFieldError('email', 'Please enter a valid email address.'); }
                        else { clearFieldError('email'); }
                      }}
                      readOnly={customerType === 'existing'}
                      style={customerType === 'existing' ? { backgroundColor: '#f8f9fa' } : {}} />
                    <FieldError msg={fieldErrors.email} />
                    <small className="text-muted d-block mt-1">Optional — leave blank if not available</small>
                  </div>

                  {/* Contact Number */}
                  <div className="col-md-6">
                    <label className="form-label">Contact Number <RequiredStar /></label>
                    <input type="tel" className="form-control" name="contact" placeholder="Enter Contact Number...."
                      inputMode="numeric" maxLength={10} pattern="\d{10}" value={formData.contact} onChange={handleInputChange}
                      onInput={e => { if (customerType === 'new') e.target.value = e.target.value.replace(/[^0-9]/g, ''); }}
                      required readOnly={customerType === 'existing'}
                      style={customerType === 'existing' ? { backgroundColor: '#f8f9fa' } : {}} />
                  </div>

                  {/* Subject */}
                  <div className="col-md-6">
                    <label className="form-label">Subject <RequiredStar /></label>
                    <textarea className={`form-control ${fieldErrors.subject ? 'is-invalid' : ''}`} name="subject"
                      placeholder="Enter a Subject...." maxLength={200} value={formData.subject} onChange={handleInputChange}
                      onBlur={() => {
                        if (formData.subject && !isValidSubject(formData.subject)) { setFieldError('subject', 'Subject must contain at least one letter.'); }
                        else { clearFieldError('subject'); }
                      }} required />
                    <FieldError msg={fieldErrors.subject} />
                  </div>

                  {/* Products - Multi Select */}
                  <div className="col-md-6">
                    <label className="form-label">Products <RequiredStar /></label>
                    <Select
                      isMulti
                      options={productOptions}
                      value={formData.products}
                      onChange={handleProductsChange}
                      placeholder="Select Products..."
                      noOptionsMessage={() => 'No products found'}
                      closeMenuOnSelect={false}
                      styles={selectStyles}
                      className={fieldErrors.customProduct ? 'is-invalid-select' : ''}
                    />
                    {showCustomProduct && (
                      <div className="mt-2">
                        <input type="text" className={`form-control ${fieldErrors.customProduct ? 'is-invalid' : ''}`}
                          placeholder="Enter custom product name" value={customProduct} onChange={handleCustomProductChange} maxLength={100} />
                        <FieldError msg={fieldErrors.customProduct} />
                      </div>
                    )}
                    <small className="text-muted d-block mt-1">Select multiple products. Choose "Other" to add a custom product.</small>
                  </div>

                  {/* Leads */}
                  <div className="col-md-6">
                    <label className="form-label">Leads (Optional)</label>
                    <select className="form-select" name="callLeads" value={formData.callLeads} onChange={handleInputChange}>
                      <option value="">Select Leads....</option>
                      {callLeadOptions.map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                    <small className="text-muted">If not selected, defaults to "Warm Leads"</small>
                  </div>

                  {/* Sources */}
                  <div className="col-md-6">
                    <label className="form-label">Sources <RequiredStar /></label>
                    <select className="form-select" name="sources" value={showCustomSource ? 'Other' : formData.sources} onChange={handleInputChange}
                      style={{ width: '100%', height: '35px' }} required>
                      <option value="">Select Sources....</option>
                      {sources.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    {showCustomSource && (
                      <div className="mt-2">
                        <input type="text" className={`form-control ${fieldErrors.customSource ? 'is-invalid' : ''}`}
                          placeholder="Enter custom source" value={customSource} onChange={handleCustomSourceChange} maxLength={50} required />
                        <FieldError msg={fieldErrors.customSource} />
                      </div>
                    )}
                  </div>

                  {/* Message */}
                  <div className="col-md-6">
                    <label className="form-label">Message</label>
                    <textarea className={`form-control ${fieldErrors.message ? 'is-invalid' : ''}`} name="message"
                      placeholder="Enter a Message...." value={formData.message} onChange={handleInputChange}
                      style={{ width: '100%', height: '100px' }} maxLength={500} />
                    <FieldError msg={fieldErrors.message} />
                  </div>

                  {/* Address */}
                  <div className="col-12">
                    <div className="row border rounded p-3 m-1" style={{ backgroundColor: '#FAF6F6' }}>
                      <div className="col-12 mb-2">
                        <label className="form-label fw-bold">Address {customerType === 'new' && <RequiredStar />}</label>
                        {isLoadingCustomerAddress && <small className="text-info ms-2">Loading customer address...</small>}
                      </div>
                      <div className="col-12 col-lg-6 mb-3">
                        <input type="text"
                          className={`form-control ${customerType === 'existing' ? '' : (fieldErrors.pincode ? 'is-invalid' : pincodeStatus === 'valid' ? 'is-valid' : '')}`}
                          name="pincode" placeholder="Pincode (6 digits only)" maxLength="6"
                          onChange={customerType === 'new' ? handleAddressChange : undefined}
                          value={formData.address.pincode}
                          required={customerType === 'new'}
                          readOnly={customerType === 'existing'}
                          style={customerType === 'existing' ? { backgroundColor: '#f8f9fa' } : {}} />
                        {customerType === 'new' && pincodeStatus === 'loading' && <small className="text-info"><i className="fa-solid fa-spinner fa-spin me-1"></i>Verifying pincode...</small>}
                        {customerType === 'new' && pincodeStatus === 'valid' && <small className="text-success"><i className="fa-solid fa-circle-check me-1"></i>Valid pincode — address auto-filled.</small>}
                        {customerType === 'existing' && formData.address.pincode && <small className="text-success"><i className="fa-solid fa-circle-check me-1"></i>Pincode loaded from customer record.</small>}
                        <FieldError msg={fieldErrors.pincode} />
                      </div>
                      <div className="col-12 col-lg-6 mb-3">
                        <input type="text" maxLength={50} className={`form-control ${fieldErrors.state ? 'is-invalid' : ''}`}
                          name="state" placeholder="State" onChange={customerType === 'new' ? handleAddressChange : undefined}
                          value={formData.address.state} required={customerType === 'new'} readOnly={customerType === 'existing'}
                          style={customerType === 'existing' ? { backgroundColor: '#f8f9fa' } : {}} />
                        <FieldError msg={fieldErrors.state} />
                      </div>
                      <div className="col-12 col-lg-6 mb-3">
                        <input type="text" maxLength={50} className={`form-control ${fieldErrors.city ? 'is-invalid' : ''}`}
                          name="city" placeholder="City" onChange={customerType === 'new' ? handleAddressChange : undefined}
                          value={formData.address.city} required={customerType === 'new'} readOnly={customerType === 'existing'}
                          style={customerType === 'existing' ? { backgroundColor: '#f8f9fa' } : {}} />
                        <FieldError msg={fieldErrors.city} />
                      </div>
                      <div className="col-12 col-lg-6 mb-3">
                        <input type="text" maxLength={50} className={`form-control ${fieldErrors.country ? 'is-invalid' : ''}`}
                          name="country" placeholder="Country" onChange={customerType === 'new' ? handleAddressChange : undefined}
                          value={formData.address.country} required={customerType === 'new'} readOnly={customerType === 'existing'}
                          style={customerType === 'existing' ? { backgroundColor: '#f8f9fa' } : {}} />
                        <FieldError msg={fieldErrors.country} />
                      </div>
                      <div className="col-12">
                        <textarea className="form-control" name="add" maxLength={500} rows="2"
                          placeholder="House No., Building Name, Road Name, Area, Colony"
                          onChange={customerType === 'new' ? handleAddressChange : undefined} value={formData.address.add}
                          required={customerType === 'new'} readOnly={customerType === 'existing'}
                          style={customerType === 'existing' ? { backgroundColor: '#f8f9fa' } : {}} />
                      </div>
                    </div>
                  </div>

                  {/* Assignment */}
                  <div className="col-12 mt-3">
                    <label className="form-label fw-bold">Assign Lead To <RequiredStar /></label>
                    <div className="d-flex gap-4 mb-3">
                      <div className="form-check">
                        <input className="form-check-input" type="radio" name="assignmentType" id="self" value="self" checked={assignmentType === 'self'} onChange={() => setAssignmentType('self')} />
                        <label className="form-check-label" htmlFor="self">Self (Assign to me)</label>
                      </div>
                      <div className="form-check">
                        <input className="form-check-input" type="radio" name="assignmentType" id="employee" value="employee" checked={assignmentType === 'employee'} onChange={() => setAssignmentType('employee')} />
                        <label className="form-check-label" htmlFor="employee">Another Sales Employee</label>
                      </div>
                    </div>
                    {assignmentType === 'employee' && (
                      <div className="row">
                        <div className="col-12 col-lg-6 mt-2">
                          <label className="form-label">Department <RequiredStar /></label>
                          <Select
                            options={departments.map(d => ({ value: d._id, label: d.name }))}
                            value={selectedDepartment} onChange={opt => { setSelectedDepartment(opt); setAssignedEmployee(null); setEmployeeOptions([]); }}
                            onInputChange={val => { setDeptSearchTerm(val); setDeptPage(1); }}
                            onMenuScrollToBottom={() => { if (hasMoreDepartments) { const np = deptPage + 1; setDeptPage(np); loadDepartments(np, deptSearchTerm); } }}
                            placeholder="Select Department..." isClearable
                            styles={selectStyles}
                          />
                        </div>
                        <div className="col-12 col-lg-6 mt-2">
                          <label className="form-label">Sales Employee <RequiredStar /></label>
                          <Select
                            options={employeeOptions} isClearable isLoading={loadingEmployees}
                            onChange={opt => setAssignedEmployee(opt ? opt.value : null)}
                            onInputChange={val => { setEmpSearchTerm(val); setEmpPage(1); }}
                            onMenuScrollToBottom={() => { if (hasMoreEmployees) { const np = empPage + 1; setEmpPage(np); loadEmployees(np, empSearchTerm); } }}
                            value={assignedEmployee ? employeeOptions.find(o => o.value === assignedEmployee) : null}
                            placeholder={loadingEmployees ? 'Loading employees...' : 'Select Employee...'}
                            noOptionsMessage={() => selectedDepartment ? 'No employees found' : 'Select a department first'}
                            isDisabled={!selectedDepartment || loadingEmployees}
                            styles={selectStyles}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="modal-footer border-0 justify-content-start">
                <button type="submit" className="btn addbtn rounded-0 add_button px-4">Add Sales Lead</button>
                <button type="button" className="btn addbtn rounded-0 Cancel_button px-4" onClick={onClose}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <style>{`
        .is-invalid-select .css-13cymwt-control {
          border-color: #dc3545 !important;
          box-shadow: 0 0 0 0.25rem rgba(220, 53, 69, 0.25) !important;
        }
      `}</style>
    </>
  );
};

export default AddSalesLeadPopup;