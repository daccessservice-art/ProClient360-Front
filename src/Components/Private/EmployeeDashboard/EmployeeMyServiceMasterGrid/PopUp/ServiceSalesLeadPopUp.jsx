// ─── ServiceLeadPopup.jsx ────────────────────────────────────────────────────
// Updated:
//   1. Existing customer → searchable Select dropdown (mirrors AddSalesLeadPopup)
//   2. Assign Lead To → only "Another Sales Employee" (Self option removed)
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useCallback, useContext, useRef } from 'react';
import toast from 'react-hot-toast';
import { RequiredStar } from '../../../RequiredStar/RequiredStar';
import { UserContext } from '../../../../../context/UserContext';
import { getDepartment } from '../../../../../hooks/useDepartment';
import { getEmployee } from '../../../../../hooks/useEmployees';
import { getAddress } from '../../../../../hooks/usePincode';
import { getCustomers, getCustomerById } from '../../../../../hooks/useCustomer';
import Select from 'react-select';

const PAGE_SIZE = 15;

/* ─────────────────────────────────────────────────────────────
   VALIDATION HELPERS
   ───────────────────────────────────────────────────────────── */
const isValidName        = (v) => /^[A-Za-z\s]+$/.test(v.trim());
const isValidEmail       = (v) => /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/.test(v.trim());
const isValidSubject     = (v) => /[A-Za-z]/.test(v.trim());
const isValidCustomText  = (v) => /[A-Za-z]/.test(v.trim());
const isValidMessage     = (v) => !v.trim() || /[A-Za-z]/.test(v.trim());
const isValidPincode     = (v) => /^\d{6}$/.test(v.trim());
const isValidAddressText = (v) => !v.trim() || /^[A-Za-z\s]+$/.test(v.trim());

/* ─── Inline field error ─── */
const FieldError = ({ msg }) =>
  msg ? (
    <small className="text-danger d-block mt-1">
      <i className="fa-solid fa-circle-exclamation me-1" />
      {msg}
    </small>
  ) : null;

/* ─── Product / Service / Repair Item lists ─── */
const PRODUCT_LIST = [
  'Surveillance System', 'Access Control System', 'TurnKey Project', 'Alleviz',
  'CafeLive', 'WorksJoy', 'WorksJoy Blu', 'Fire Alarm System', 'Fire Hydrant System',
  'IDS', 'AI Face Machines', 'Entrance Automation', 'Guard Tour System',
  'Home Automation', 'IP PA and Communication System', 'CRM', 'Security Systems',
  'KMS', 'VMS', 'PMS', 'Boom Barrier System', 'Tripod System', 'Flap Barrier System',
  'EPBX System', 'CMS', 'Lift Eliviter System', 'AV6', 'Walky Talky System',
  'Device Management System','VisionIQ','CineMind','Extracto','Virtual Agent', 'LAN Cabling Activity', 'Other',
];

const SERVICE_LIST = [
  'Annual Maintenance Contract (AMC)', 'Warranty Service', 'One-Time Service',
  'On-Site Support', 'Remote Support', 'Preventive Maintenance',
  'Break-Fix Service', 'Installation & Commissioning', 'Other',
];

const REPAIR_ITEM_LIST = [
  'CCTV Camera', 'DVR / NVR', 'Access Control Panel', 'Biometric Device',
  'Fire Panel', 'UPS / Power Supply', 'Network Switch', 'IP Phone',
  'Barrier Motor', 'Flap Barrier Controller', 'PA Amplifier', 'Speaker',
  'Boom Gate', 'Guard Tour Wand', 'Video Door Phone', 'Other',
];

const SOURCES = [
  'Service Visit', 'AMC Renewal', 'Walk-In', 'Referral', 'Direct', 'Other',
];

const CALL_LEAD_OPTIONS = ['Hot Leads', 'Warm Leads', 'Cold Leads', 'Invalid Leads'];

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════════════════ */
const ServiceLeadPopup = ({ service, onClose, onLeadCreated }) => {
  const { user } = useContext(UserContext);

  /* ── Derive customer info from the service ticket ── */
  const ticket = service?.ticket || {};
  const client = ticket?.client  || {};

  /* ── Customer Type ── */
  const [customerType, setCustomerType] = useState('existing');

  /* ── Form data ── */
  const [formData, setFormData] = useState({
    name:    client.contactPerson || client.custName || '',
    email:   client.email || '',
    contact: client.phone || client.phoneNumber1 || client.contactNumber || '',
    company: client.custName || client.name || '',
    subject: ticket.details ? `Follow-up: ${ticket.details}` : '',
    products: '',
    sources:  'Service Visit',
    callLeads: 'Warm Leads',
    message:  '',
    status:   'Pending',
    value:    '',
    address: {
      pincode: client.billingAddress?.pincode || client.address?.pincode || '',
      state:   client.billingAddress?.state   || client.address?.state   || '',
      city:    client.billingAddress?.city    || client.address?.city    || '',
      country: client.billingAddress?.country || client.address?.country || 'India',
      add:     client.billingAddress?.add     || client.address?.add     || '',
    },
  });

  /* ── Category ── */
  const [category,       setCategory]       = useState('Product');
  const [selectedItem,   setSelectedItem]   = useState('');
  const [showCustomItem, setShowCustomItem] = useState(false);
  const [customItem,     setCustomItem]     = useState('');

  /* ── Custom source ── */
  const [showCustomSource, setShowCustomSource] = useState(false);
  const [customSource,     setCustomSource]     = useState('');

  /* ── Pincode ── */
  const [pincodeStatus,    setPincodeStatus]    = useState('');
  const [isLoadingAddress, setIsLoadingAddress] = useState(false);

  /* ── Existing customer search (mirrors AddSalesLeadPopup) ── */
  const [custOptions,              setCustOptions]              = useState([]);
  const [selectedCustomer,         setSelectedCustomer]         = useState(null);
  const [custPage,                 setCustPage]                 = useState(1);
  const [custHasMore,              setCustHasMore]              = useState(true);
  const [custLoading,              setCustLoading]              = useState(false);
  const [custSearch,               setCustSearch]               = useState('');
  const [debouncedCustSearch,      setDebouncedCustSearch]      = useState('');
  const [isLoadingCustomerAddress, setIsLoadingCustomerAddress] = useState(false);
  const latestCustRequestId = useRef(0);

  /* ── Field errors ── */
  const [fieldErrors, setFieldErrors] = useState({
    name:         '',
    email:        '',
    subject:      '',
    message:      '',
    customItem:   '',
    customSource: '',
    pincode:      '',
    state:        '',
    city:         '',
    country:      '',
  });

  const setFieldError   = (field, msg) => setFieldErrors(prev => ({ ...prev, [field]: msg }));
  const clearFieldError = (field)      => setFieldErrors(prev => ({ ...prev, [field]: '' }));

  /* ── Assignment — only "Another Sales Employee", default to 'employee' ── */
  const [departments,        setDepartments]        = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [hasMoreDepartments, setHasMoreDepartments] = useState(true);
  const [deptPage,           setDeptPage]           = useState(1);
  const [deptSearchTerm,     setDeptSearchTerm]     = useState('');
  const [assignedEmployee,   setAssignedEmployee]   = useState(null);
  const [employeeOptions,    setEmployeeOptions]    = useState([]);
  const [hasMoreEmployees,   setHasMoreEmployees]   = useState(true);
  const [empPage,            setEmpPage]            = useState(1);
  const [empSearchTerm,      setEmpSearchTerm]      = useState('');
  const [loadingEmployees,   setLoadingEmployees]   = useState(false);

  const [submitting, setSubmitting] = useState(false);

  /* ─── Item list based on category ─── */
  const itemList =
    category === 'Product'    ? PRODUCT_LIST     :
    category === 'Service'    ? SERVICE_LIST      :
    /* Repair Item */            REPAIR_ITEM_LIST;

  /* ─── Debounce customer search ─── */
  useEffect(() => {
    const t = setTimeout(() => setDebouncedCustSearch(custSearch), 400);
    return () => clearTimeout(t);
  }, [custSearch]);

  /* ─── Load customers (request-ID stale-response protection) ─── */
  const loadCustomers = useCallback(async (page, search) => {
    const requestId = ++latestCustRequestId.current;
    setCustLoading(true);
    try {
      const searchParam = search && search.trim() !== '' ? search.trim() : null;
      const data = await getCustomers(page, PAGE_SIZE, searchParam);

      if (requestId !== latestCustRequestId.current) return; // stale — discard

      if (!data || data.error) {
        toast.error(data?.error || 'Failed to load customers');
        if (page === 1) setCustOptions([]);
        return;
      }
      const customers = data.customers || data.data || [];
      const newOpts = customers.map(c => ({
        value: c._id,
        label: c.custName || c.name || 'Unnamed',
      }));
      setCustOptions(prev => page === 1 ? newOpts : [...prev, ...newOpts]);
      setCustHasMore(customers.length === PAGE_SIZE);
      setCustPage(page + 1);
    } catch {
      if (requestId !== latestCustRequestId.current) return;
      toast.error('Failed to load customers');
    } finally {
      if (requestId === latestCustRequestId.current) setCustLoading(false);
    }
  }, []);

  /* ─── Trigger customer load when type=existing or search changes ─── */
  useEffect(() => {
    if (customerType === 'existing') {
      setCustPage(1);
      setCustHasMore(true);
      setCustOptions([]);
      loadCustomers(1, debouncedCustSearch);
    }
  }, [customerType, debouncedCustSearch, loadCustomers]);

  /* ─── Handle customer selection — auto-fill fields ─── */
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
            name:    customer.customerContactPersonName1 || customer.customerContactPersonName2 || customer.contactPerson || '',
            email:   customer.email || customer.contactPersonEmail || '',
            contact: customer.phoneNumber1 || customer.contact || customer.contactNumber || '',
            company: customer.custName || customer.name || customer.companyName || '',
            address: {
              pincode: billingAddress.pincode || '',
              state:   billingAddress.state   || '',
              city:    billingAddress.city    || '',
              add:     billingAddress.add || billingAddress.addressLine1 || billingAddress.address || '',
              country: billingAddress.country || 'India',
            },
          }));
          toast.success('Customer details loaded successfully');
        } else {
          resetFormData();
          toast('No details found for this customer');
        }
      } catch {
        toast.error('Failed to load customer details');
        resetFormData();
      } finally {
        setIsLoadingCustomerAddress(false);
      }
    } else {
      resetFormData();
    }
  };

  const resetFormData = () => {
    setFormData(prev => ({
      ...prev,
      name: '', email: '', contact: '', company: '',
      address: { pincode: '', state: '', city: '', add: '', country: '' },
    }));
  };

  /* ─── Customer Type change ─── */
  const handleCustomerTypeChange = (e) => {
    const type = e.target.value;
    setCustomerType(type);
    setPincodeStatus('');
    if (type === 'new') {
      setSelectedCustomer(null);
      setCustPage(1);
      setCustHasMore(true);
      setCustOptions([]);
      setCustSearch('');
      setDebouncedCustSearch('');
      setFormData(prev => ({
        ...prev,
        name: '', email: '', contact: '', company: '',
        address: { pincode: '', state: '', city: '', country: '', add: '' },
      }));
    } else {
      // Restore from ticket/client data as default until customer is selected
      setFormData(prev => ({
        ...prev,
        name:    client.contactPerson || client.custName || '',
        email:   client.email || '',
        contact: client.phone || client.phoneNumber1 || client.contactNumber || '',
        company: client.custName || client.name || '',
        address: {
          pincode: client.billingAddress?.pincode || client.address?.pincode || '',
          state:   client.billingAddress?.state   || client.address?.state   || '',
          city:    client.billingAddress?.city    || client.address?.city    || '',
          country: client.billingAddress?.country || client.address?.country || 'India',
          add:     client.billingAddress?.add     || client.address?.add     || '',
        },
      }));
      setFieldErrors(prev => ({
        ...prev,
        name: '', email: '', pincode: '', state: '', city: '', country: '',
      }));
    }
  };

  /* ─── Category change ─── */
  const handleCategoryChange = (cat) => {
    setCategory(cat);
    setSelectedItem('');
    setCustomItem('');
    setShowCustomItem(false);
    clearFieldError('customItem');
    setFormData(prev => ({ ...prev, products: '' }));
  };

  /* ─── Item dropdown change ─── */
  const handleItemSelect = (e) => {
    const val = e.target.value;
    if (val === 'Other') {
      setShowCustomItem(true);
      setSelectedItem('Other');
      setCustomItem('');
      setFormData(prev => ({ ...prev, products: '' }));
    } else {
      setShowCustomItem(false);
      setSelectedItem(val);
      setCustomItem('');
      clearFieldError('customItem');
      setFormData(prev => ({ ...prev, products: val }));
    }
  };

  /* ─── Custom item change ─── */
  const handleCustomItemChange = (e) => {
    const value = e.target.value;
    setCustomItem(value);
    setFormData(prev => ({ ...prev, products: value }));
    if (value && !isValidCustomText(value)) {
      setFieldError('customItem', `${category} name must contain at least one letter (cannot be only numbers or special characters).`);
    } else {
      clearFieldError('customItem');
    }
  };

  /* ─── Load departments ─── */
  const loadDepartments = useCallback(async (page = 1, search = '') => {
    try {
      const data = await getDepartment(page, PAGE_SIZE, search);
      if (data?.departments) {
        setDepartments(prev => page === 1 ? data.departments : [...prev, ...data.departments]);
        setHasMoreDepartments(data.departments.length === PAGE_SIZE);
      }
    } catch (error) { console.log(error); }
  }, []);

  /* ─── Load employees ─── */
  const loadEmployees = useCallback(async (page = 1, search = '') => {
    if (!selectedDepartment) return;
    setLoadingEmployees(true);
    try {
      const data = await getEmployee(selectedDepartment.value, page, PAGE_SIZE, search);
      let arr = Array.isArray(data) ? data
        : data?.employee ?? data?.employees ?? data?.data ?? [];

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

  useEffect(() => { loadDepartments(1, deptSearchTerm); }, [loadDepartments, deptSearchTerm]);

  useEffect(() => {
    if (selectedDepartment) {
      setEmpPage(1); setEmployeeOptions([]); setAssignedEmployee(null);
      loadEmployees(1, empSearchTerm);
    } else { setEmployeeOptions([]); setAssignedEmployee(null); }
  }, [selectedDepartment, loadEmployees, empSearchTerm]);

  /* ─── Auto-fetch address from pincode (only for new customer) ─── */
  useEffect(() => {
    if (customerType !== 'new') return;

    const fetchData = async () => {
      const pin = formData.address.pincode || '';

      if (pin.length > 0 && pin.length < 6) {
        setFieldError('pincode', 'Pincode must be exactly 6 digits.');
        setPincodeStatus('');
        setFormData(prev => ({ ...prev, address: { ...prev.address, state: '', city: '', country: '' } }));
        return;
      }
      if (pin.length === 0) {
        clearFieldError('pincode');
        setPincodeStatus('');
        return;
      }
      if (pin.length === 6) {
        clearFieldError('pincode');
        setPincodeStatus('loading');
        setIsLoadingAddress(true);
        try {
          const data = await getAddress(pin);
          if (data && data !== 'Error' && (data.state || data.city)) {
            setFormData(prev => ({
              ...prev,
              address: { ...prev.address, state: data.state || '', city: data.city || '', country: data.country || 'India' },
            }));
            setPincodeStatus('valid');
            clearFieldError('pincode');
          } else {
            setFormData(prev => ({ ...prev, address: { ...prev.address, state: '', city: '', country: '' } }));
            setPincodeStatus('invalid');
            setFieldError('pincode', 'Invalid Pincode — no location found. Please check and try again.');
          }
        } catch {
          setFormData(prev => ({ ...prev, address: { ...prev.address, state: '', city: '', country: '' } }));
          setPincodeStatus('invalid');
          setFieldError('pincode', 'Could not verify pincode. Please check your connection.');
        } finally { setIsLoadingAddress(false); }
      }
    };
    const t = setTimeout(fetchData, 600);
    return () => clearTimeout(t);
  }, [formData.address.pincode, customerType]);

  /* ─── Address change ─── */
  const handleAddressChange = (e) => {
    const { name, value } = e.target;

    if (['state', 'city', 'country'].includes(name)) {
      if (value && !isValidAddressText(value)) {
        setFieldError(name, `${name.charAt(0).toUpperCase() + name.slice(1)} must contain only letters and spaces.`);
        return;
      } else {
        clearFieldError(name);
      }
    }

    if (name === 'pincode') {
      const digitsOnly = value.replace(/[^0-9]/g, '');
      if (value !== digitsOnly) {
        setFieldError('pincode', 'Pincode must contain digits only (no letters or special characters).');
      } else {
        clearFieldError('pincode');
      }
      setFormData(prev => ({ ...prev, address: { ...prev.address, [name]: digitsOnly } }));
      return;
    }

    setFormData(prev => ({ ...prev, address: { ...prev.address, [name]: value } }));
  };

  /* ─── Main input change ─── */
  const handleInputChange = (e) => {
    const { name, value } = e.target;

    if (name === 'name') {
      if (value && !isValidName(value)) {
        setFieldError('name', 'Contact Name must contain only letters and spaces (no numbers or special characters).');
      } else {
        clearFieldError('name');
      }
      setFormData(prev => ({ ...prev, [name]: value }));
      return;
    }

    if (name === 'email') {
      if (value && !isValidEmail(value)) {
        setFieldError('email', 'Please enter a valid email address (e.g., example@domain.com).');
      } else {
        clearFieldError('email');
      }
      setFormData(prev => ({ ...prev, [name]: value }));
      return;
    }

    if (name === 'subject') {
      if (value && !isValidSubject(value)) {
        setFieldError('subject', 'Subject must contain at least one letter (not just numbers or special characters).');
      } else {
        clearFieldError('subject');
      }
      setFormData(prev => ({ ...prev, [name]: value }));
      return;
    }

    if (name === 'message') {
      if (value && !isValidMessage(value)) {
        setFieldError('message', 'Message must contain at least one letter (cannot be only numbers or special characters).');
      } else {
        clearFieldError('message');
      }
      setFormData(prev => ({ ...prev, [name]: value }));
      return;
    }

    if (name === 'sources') {
      if (value === 'Other') {
        setShowCustomSource(true);
        setFormData(prev => ({ ...prev, [name]: '' }));
      } else {
        setShowCustomSource(false);
        setCustomSource('');
        clearFieldError('customSource');
        setFormData(prev => ({ ...prev, [name]: value }));
      }
      return;
    }

    setFormData(prev => ({ ...prev, [name]: value }));
  };

  /* ── Custom source change ── */
  const handleCustomSourceChange = (e) => {
    const value = e.target.value;
    setCustomSource(value);
    setFormData(prev => ({ ...prev, sources: value }));
    if (value && !isValidCustomText(value)) {
      setFieldError('customSource', 'Source must contain at least one letter.');
    } else {
      clearFieldError('customSource');
    }
  };

  /* ─── Form submit ─── */
  const handleSubmit = async (e) => {
    e.preventDefault();

    const { name, email, contact, subject, company, sources } = formData;
    const finalProduct = showCustomItem ? customItem.trim() : selectedItem;

    /* Required field check */
    if (customerType === 'new') {
      if (!name || !company || !contact || !finalProduct || !sources || !subject ||
          !formData.address.pincode || !formData.address.add) {
        toast.error('Please fill in all required fields, including Pincode and full address.');
        return;
      }
    } else {
      if (!selectedCustomer) {
        toast.error('Please select a customer.');
        return;
      }
      if (!finalProduct || !sources || !subject) {
        toast.error('Please fill in all required fields.');
        return;
      }
    }

    if (name && !isValidName(name)) {
      toast.error('Contact Name must contain only letters and spaces.');
      setFieldError('name', 'Contact Name must contain only letters and spaces (no numbers or special characters).');
      return;
    }

    if (email && !isValidEmail(email)) {
      toast.error('Please enter a valid email address (e.g., example@domain.com).');
      setFieldError('email', 'Please enter a valid email address (e.g., example@domain.com).');
      return;
    }

    if (subject && !isValidSubject(subject)) {
      toast.error('Subject must contain at least one letter (not just numbers or special characters).');
      setFieldError('subject', 'Subject must contain at least one letter (not just numbers or special characters).');
      return;
    }

    if (formData.message && !isValidMessage(formData.message)) {
      toast.error('Message must contain at least one letter (cannot be only numbers or special characters).');
      setFieldError('message', 'Message must contain at least one letter.');
      return;
    }

    if (customerType === 'new' && formData.address.pincode) {
      if (!isValidPincode(formData.address.pincode)) {
        toast.error('Pincode must be exactly 6 digits (no letters or special characters).');
        setFieldError('pincode', 'Pincode must be exactly 6 digits (no letters or special characters).');
        return;
      }
      if (pincodeStatus === 'invalid') {
        toast.error('Invalid Pincode — no location found. Please enter a valid pincode.');
        setFieldError('pincode', 'Invalid Pincode — no location found. Please check and try again.');
        return;
      }
    }

    if (formData.address.state && !isValidAddressText(formData.address.state)) {
      toast.error('State must contain only letters and spaces.');
      setFieldError('state', 'State must contain only letters and spaces.');
      return;
    }
    if (formData.address.city && !isValidAddressText(formData.address.city)) {
      toast.error('City must contain only letters and spaces.');
      setFieldError('city', 'City must contain only letters and spaces.');
      return;
    }
    if (formData.address.country && !isValidAddressText(formData.address.country)) {
      toast.error('Country must contain only letters and spaces.');
      setFieldError('country', 'Country must contain only letters and spaces.');
      return;
    }

    if (showCustomItem) {
      if (!customItem.trim()) { toast.error(`Please enter a custom ${category} name.`); return; }
      if (!isValidCustomText(customItem)) {
        toast.error(`${category} name must contain at least one letter.`);
        setFieldError('customItem', `${category} name must contain at least one letter.`);
        return;
      }
    }

    if (showCustomSource) {
      if (!customSource.trim()) { toast.error('Please enter a custom source.'); return; }
      if (!isValidCustomText(customSource)) {
        toast.error('Source must contain at least one letter.');
        setFieldError('customSource', 'Source must contain at least one letter.');
        return;
      }
    }

    /* Assignment — only employee, so always validate */
    if (!assignedEmployee) {
      toast.error('Please select an employee to assign the lead to.');
      return;
    }

    const hasErrors = Object.values(fieldErrors).some(msg => msg !== '');
    if (hasErrors) {
      toast.error('Please fix the highlighted errors before submitting.');
      return;
    }

    const payload = {
      customerType,
      customerId:         customerType === 'existing' ? (selectedCustomer?.value || client._id || null) : null,
      SENDER_NAME:        name,
      SENDER_EMAIL:       email,
      SENDER_MOBILE:      contact,
      SUBJECT:            subject,
      SENDER_COMPANY:     company,
      SENDER_ADDRESS:     formData.address.add,
      SENDER_CITY:        formData.address.city,
      SENDER_STATE:       formData.address.state,
      SENDER_PINCODE:     formData.address.pincode,
      SENDER_COUNTRY_ISO: formData.address.country,
      QUERY_PRODUCT_NAME: finalProduct,
      QUERY_SOURCES_NAME: formData.sources,
      QUERY_MESSAGE:      formData.message || '',
      callLeads:          formData.callLeads || 'Warm Leads',
      feasibility:        'feasible',
      assignedTo:         assignedEmployee,
      assignedBy:         user._id,
      assignedTime:       new Date().toISOString(),
    };

    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const res   = await fetch(
        `${process.env.REACT_APP_API_URL}/api/leads`,
        {
          method:  'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body:    JSON.stringify(payload),
        }
      );
      const json = await res.json();

      if (json.success) {
        toast.success('Sales lead created successfully!');
        if (onLeadCreated) onLeadCreated(json.data);
        onClose();
      } else {
        toast.error(json.error || 'Failed to create lead.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  /* ─── Select styles ─── */
  const selectStyles = {
    control: (p) => ({ ...p, borderRadius: 0, borderColor: '#ced4da', fontSize: '16px', minHeight: '38px' }),
    option:  (p, s) => ({
      ...p,
      backgroundColor: s.isSelected ? '#007bff' : s.isFocused ? '#f8f9fa' : 'white',
      color:           s.isSelected ? 'white' : '#212529',
    }),
  };

  /* ════════════════════════════════ JSX ══════════════════════════════════ */
  return (
    <>
      <div className="modal fade show" style={{ display: 'flex', alignItems: 'center', backgroundColor: '#00000090' }}>
        <div className="modal-dialog modal-lg">
          <div className="modal-content p-3">
            <form onSubmit={handleSubmit} noValidate>

              {/* ── Header ── */}
              <div className="modal-header pt-0">
                <h5 className="card-title fw-bold">Add Service Lead</h5>
                <button onClick={onClose} type="button" className="btn-close" aria-label="Close" style={{ backgroundColor: 'red' }} />
              </div>

              {/* ── Body ── */}
              <div className="modal-body" style={{ maxHeight: 'calc(80vh - 240px)', overflowY: 'auto' }}>
                <div className="row g-3">

                  {/* ── Service ticket info banner ── */}
                  {(ticket.details || ticket.product) && (
                    <div className="col-12">
                      <div
                        className="p-2 rounded"
                        style={{ background: '#eff6ff', border: '1px solid #bfdbfe', fontSize: '0.8rem' }}
                      >
                        <strong>📋 From Service Ticket · Customer: {client.custName || client.name || '—'}</strong>
                        {ticket.product && <span className="ms-2">Product: <em>{ticket.product}</em></span>}
                        {ticket.details && <span className="ms-2">· Complaint: <em>{ticket.details}</em></span>}
                      </div>
                    </div>
                  )}

                  {/* ── Customer Type ── */}
                  <div className="col-12 mb-3">
                    <label className="form-label fw-bold">Customer Type <RequiredStar /></label>
                    <div className="d-flex gap-4">
                      <div className="form-check">
                        <input
                          className="form-check-input" type="radio"
                          name="customerType" id="newCustomer"
                          value="new" checked={customerType === 'new'}
                          onChange={handleCustomerTypeChange}
                        />
                        <label className="form-check-label" htmlFor="newCustomer">New Customer</label>
                      </div>
                      <div className="form-check">
                        <input
                          className="form-check-input" type="radio"
                          name="customerType" id="existingCustomer"
                          value="existing" checked={customerType === 'existing'}
                          onChange={handleCustomerTypeChange}
                        />
                        <label className="form-check-label" htmlFor="existingCustomer">Existing Customer</label>
                      </div>
                    </div>
                  </div>

                  {/* ── Existing customer searchable Select ── */}
                  {customerType === 'existing' && (
                    <div className="col-12">
                      <div className="mb-3">
                        <label className="form-label">Select Client <RequiredStar /></label>
                        <Select
                          options={custOptions}
                          value={selectedCustomer}
                          onChange={handleCustomerSelect}
                          onInputChange={val => setCustSearch(val)}
                          onMenuScrollToBottom={() => {
                            if (!custLoading && custHasMore) loadCustomers(custPage, debouncedCustSearch);
                          }}
                          isLoading={custLoading}
                          placeholder="Search and select client..."
                          noOptionsMessage={({ inputValue }) => inputValue ? 'No clients found.' : 'Type to search...'}
                          loadingMessage={() => 'Loading clients...'}
                          closeMenuOnSelect
                          filterOption={() => true}
                          styles={selectStyles}
                        />
                        <div className="mt-1">
                          {custLoading && <small className="text-info">Loading clients...</small>}
                          {isLoadingCustomerAddress && <small className="text-info">Loading client details...</small>}
                          {selectedCustomer && !isLoadingCustomerAddress && (
                            <small className="text-success">Client selected: {selectedCustomer.label}</small>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ── Category ── */}
                  <div className="col-12 mb-3">
                    <label className="form-label fw-bold">Category <RequiredStar /></label>
                    <div className="d-flex gap-4">
                      {['Product', 'Service', 'Repair Item'].map(cat => (
                        <div className="form-check" key={cat}>
                          <input
                            className="form-check-input" type="radio"
                            id={`cat-${cat}`} name="category"
                            value={cat} checked={category === cat}
                            onChange={() => handleCategoryChange(cat)}
                          />
                          <label className="form-check-label" htmlFor={`cat-${cat}`}>{cat}</label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* ── Company / Customer Name ── */}
                  <div className="col-md-6">
                    <label className="form-label">Customer Name <RequiredStar /></label>
                    <input
                      type="text" className="form-control" name="company"
                      placeholder="Enter a Company Name...." maxLength={100}
                      value={formData.company} onChange={handleInputChange}
                      readOnly={customerType === 'existing'}
                      style={customerType === 'existing' ? { backgroundColor: '#f8f9fa' } : {}}
                    />
                  </div>

                  {/* ── Contact Name ── */}
                  <div className="col-md-6">
                    <label className="form-label">Contact Name <RequiredStar /></label>
                    <input
                      type="text"
                      className={`form-control ${fieldErrors.name ? 'is-invalid' : ''}`}
                      name="name"
                      placeholder="Enter a Contact Name...."
                      maxLength={50}
                      value={formData.name}
                      onChange={handleInputChange}
                      onKeyPress={(e) => { if (!/[A-Za-z\s]/.test(e.key)) e.preventDefault(); }}
                      required
                      readOnly={customerType === 'existing'}
                      style={customerType === 'existing' ? { backgroundColor: '#f8f9fa' } : {}}
                    />
                    <FieldError msg={fieldErrors.name} />
                  </div>

                  {/* ── Contact Email ── */}
                  <div className="col-md-6">
                    <label className="form-label">Contact Email <RequiredStar /></label>
                    <input
                      type="email"
                      className={`form-control ${fieldErrors.email ? 'is-invalid' : ''}`}
                      name="email"
                      placeholder="Enter Email ID...."
                      maxLength={100}
                      value={formData.email}
                      onChange={handleInputChange}
                      onBlur={() => {
                        if (formData.email && !isValidEmail(formData.email)) {
                          setFieldError('email', 'Please enter a valid email address (e.g., example@domain.com).');
                        } else {
                          clearFieldError('email');
                        }
                      }}
                      required
                      readOnly={customerType === 'existing'}
                      style={customerType === 'existing' ? { backgroundColor: '#f8f9fa' } : {}}
                    />
                    <FieldError msg={fieldErrors.email} />
                  </div>

                  {/* ── Contact Number ── */}
                  <div className="col-md-6">
                    <label className="form-label">Contact Number <RequiredStar /></label>
                    <input
                      type="tel" className="form-control" name="contact"
                      placeholder="Enter Contact Number...."
                      inputMode="numeric" maxLength={10} pattern="\d{10}"
                      value={formData.contact}
                      onChange={handleInputChange}
                      onInput={e => { if (customerType === 'new') e.target.value = e.target.value.replace(/[^0-9]/g, ''); }}
                      required
                      readOnly={customerType === 'existing'}
                      style={customerType === 'existing' ? { backgroundColor: '#f8f9fa' } : {}}
                    />
                  </div>

                  {/* ── Subject ── */}
                  <div className="col-md-6">
                    <label className="form-label">Subject <RequiredStar /></label>
                    <textarea
                      className={`form-control ${fieldErrors.subject ? 'is-invalid' : ''}`}
                      name="subject"
                      placeholder="Enter a Subject...."
                      maxLength={200}
                      value={formData.subject}
                      onChange={handleInputChange}
                      onBlur={() => {
                        if (formData.subject && !isValidSubject(formData.subject)) {
                          setFieldError('subject', 'Subject must contain at least one letter.');
                        } else {
                          clearFieldError('subject');
                        }
                      }}
                      required
                    />
                    <FieldError msg={fieldErrors.subject} />
                  </div>

                  {/* ── Category Item dropdown ── */}
                  <div className="col-md-6">
                    <label className="form-label">{category} <RequiredStar /></label>
                    <select
                      className="form-select"
                      value={showCustomItem ? 'Other' : selectedItem}
                      onChange={handleItemSelect}
                      required
                    >
                      <option value="">Select {category}....</option>
                      {itemList.map(item => <option key={item} value={item}>{item}</option>)}
                    </select>
                    {showCustomItem && (
                      <div className="mt-2">
                        <input
                          type="text"
                          className={`form-control ${fieldErrors.customItem ? 'is-invalid' : ''}`}
                          placeholder={`Enter custom ${category.toLowerCase()} name (must contain letters)`}
                          value={customItem}
                          onChange={handleCustomItemChange}
                          maxLength={100}
                          required
                        />
                        <FieldError msg={fieldErrors.customItem} />
                      </div>
                    )}
                  </div>

                  {/* ── Leads ── */}
                  <div className="col-md-6">
                    <label className="form-label">Leads (Optional)</label>
                    <select className="form-select" name="callLeads" value={formData.callLeads} onChange={handleInputChange}>
                      <option value="">Select Leads....</option>
                      {CALL_LEAD_OPTIONS.map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                    <small className="text-muted">If not selected, defaults to "Warm Leads"</small>
                  </div>

                  {/* ── Sources ── */}
                  <div className="col-md-6">
                    <label className="form-label">Sources <RequiredStar /></label>
                    <select
                      className="form-select" name="sources"
                      value={showCustomSource ? 'Other' : formData.sources}
                      onChange={handleInputChange}
                      style={{ width: '100%', height: '35px' }}
                      required
                    >
                      <option value="">Select Sources....</option>
                      {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    {showCustomSource && (
                      <div className="mt-2">
                        <input
                          type="text"
                          className={`form-control ${fieldErrors.customSource ? 'is-invalid' : ''}`}
                          placeholder="Enter custom source (must contain letters)"
                          value={customSource}
                          onChange={handleCustomSourceChange}
                          maxLength={50}
                          required
                        />
                        <FieldError msg={fieldErrors.customSource} />
                      </div>
                    )}
                  </div>

                  {/* ── Message ── */}
                  <div className="col-md-6">
                    <label className="form-label">Message</label>
                    <textarea
                      className={`form-control ${fieldErrors.message ? 'is-invalid' : ''}`}
                      name="message"
                      placeholder="Enter a Message.... (must contain letters if filled)"
                      value={formData.message}
                      onChange={handleInputChange}
                      style={{ width: '100%', height: '100px' }}
                      maxLength={500}
                    />
                    <FieldError msg={fieldErrors.message} />
                  </div>

                  {/* ── Address ── */}
                  <div className="col-12">
                    <div className="row border rounded p-3 m-1" style={{ backgroundColor: '#FAF6F6' }}>
                      <div className="col-12 mb-2">
                        <label className="form-label fw-bold">
                          Address {customerType === 'new' && <RequiredStar />}
                        </label>
                        {customerType === 'existing' && !isLoadingCustomerAddress && (
                          <small className="text-muted ms-2">(Auto-filled from selected customer)</small>
                        )}
                        {isLoadingCustomerAddress && (
                          <small className="text-info ms-2">Loading customer address...</small>
                        )}
                      </div>

                      {/* Pincode */}
                      <div className="col-12 col-lg-6 mb-3">
                        <input
                          type="text"
                          className={`form-control ${fieldErrors.pincode ? 'is-invalid' : pincodeStatus === 'valid' && customerType === 'new' ? 'is-valid' : ''}`}
                          name="pincode"
                          placeholder="Pincode (6 digits only)"
                          maxLength="6"
                          onChange={customerType === 'new' ? handleAddressChange : undefined}
                          value={formData.address.pincode}
                          required={customerType === 'new'}
                          readOnly={customerType === 'existing'}
                          style={customerType === 'existing' ? { backgroundColor: '#f8f9fa' } : {}}
                        />
                        {customerType === 'new' && pincodeStatus === 'loading' && (
                          <small className="text-info"><i className="fa-solid fa-spinner fa-spin me-1" />Verifying pincode...</small>
                        )}
                        {customerType === 'new' && pincodeStatus === 'valid' && (
                          <small className="text-success"><i className="fa-solid fa-circle-check me-1" />Valid pincode — address auto-filled.</small>
                        )}
                        <FieldError msg={fieldErrors.pincode} />
                      </div>

                      {/* State */}
                      <div className="col-12 col-lg-6 mb-3">
                        <input
                          type="text" maxLength={50}
                          className={`form-control ${fieldErrors.state ? 'is-invalid' : ''}`}
                          name="state" placeholder="State (letters only)"
                          onChange={customerType === 'new' ? handleAddressChange : undefined}
                          value={formData.address.state}
                          required={customerType === 'new'}
                          readOnly={customerType === 'existing'}
                          style={customerType === 'existing' ? { backgroundColor: '#f8f9fa' } : {}}
                        />
                        <FieldError msg={fieldErrors.state} />
                      </div>

                      {/* City */}
                      <div className="col-12 col-lg-6 mb-3">
                        <input
                          type="text" maxLength={50}
                          className={`form-control ${fieldErrors.city ? 'is-invalid' : ''}`}
                          name="city" placeholder="City (letters only)"
                          onChange={customerType === 'new' ? handleAddressChange : undefined}
                          value={formData.address.city}
                          required={customerType === 'new'}
                          readOnly={customerType === 'existing'}
                          style={customerType === 'existing' ? { backgroundColor: '#f8f9fa' } : {}}
                        />
                        <FieldError msg={fieldErrors.city} />
                      </div>

                      {/* Country */}
                      <div className="col-12 col-lg-6 mb-3">
                        <input
                          type="text" maxLength={50}
                          className={`form-control ${fieldErrors.country ? 'is-invalid' : ''}`}
                          name="country" placeholder="Country (letters only)"
                          onChange={customerType === 'new' ? handleAddressChange : undefined}
                          value={formData.address.country}
                          required={customerType === 'new'}
                          readOnly={customerType === 'existing'}
                          style={customerType === 'existing' ? { backgroundColor: '#f8f9fa' } : {}}
                        />
                        <FieldError msg={fieldErrors.country} />
                      </div>

                      {/* Address Line */}
                      <div className="col-12">
                        <textarea
                          className="form-control" name="add" maxLength={500} rows="2"
                          placeholder="House No., Building Name, Road Name, Area, Colony"
                          onChange={customerType === 'new' ? handleAddressChange : undefined}
                          value={formData.address.add}
                          required={customerType === 'new'}
                          readOnly={customerType === 'existing'}
                          style={customerType === 'existing' ? { backgroundColor: '#f8f9fa' } : {}}
                        />
                      </div>
                    </div>
                  </div>

                  {/* ── Assignment — only "Another Sales Employee" ── */}
                  <div className="col-12 mt-3">
                    <label className="form-label fw-bold">Assign Lead To <RequiredStar /></label>
                    <div className="row">
                      <div className="col-12 col-lg-6 mt-2">
                        <label className="form-label">Department <RequiredStar /></label>
                        <Select
                          options={departments.map(d => ({ value: d._id, label: d.name }))}
                          value={selectedDepartment}
                          onChange={opt => { setSelectedDepartment(opt); setAssignedEmployee(null); setEmployeeOptions([]); }}
                          onInputChange={val => { setDeptSearchTerm(val); setDeptPage(1); }}
                          onMenuScrollToBottom={() => {
                            if (hasMoreDepartments) {
                              const np = deptPage + 1; setDeptPage(np); loadDepartments(np, deptSearchTerm);
                            }
                          }}
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
                          onMenuScrollToBottom={() => {
                            if (hasMoreEmployees) {
                              const np = empPage + 1; setEmpPage(np); loadEmployees(np, empSearchTerm);
                            }
                          }}
                          value={assignedEmployee ? employeeOptions.find(o => o.value === assignedEmployee) : null}
                          placeholder={loadingEmployees ? 'Loading employees...' : 'Select Employee...'}
                          noOptionsMessage={() => selectedDepartment ? 'No employees found' : 'Select a department first'}
                          isDisabled={!selectedDepartment || loadingEmployees}
                          styles={selectStyles}
                        />
                      </div>
                    </div>
                  </div>

                </div>
              </div>

              {/* ── Footer ── */}
              <div className="modal-footer border-0 justify-content-start">
                <button
                  type="submit"
                  className="btn addbtn rounded-0 add_button px-4"
                  disabled={submitting}
                >
                  {submitting
                    ? <><span className="spinner-border spinner-border-sm me-2" />Creating Lead…</>
                    : 'Add Sales Lead'}
                </button>
                <button
                  type="button"
                  className="btn addbtn rounded-0 Cancel_button px-4"
                  onClick={onClose}
                  disabled={submitting}
                >
                  Cancel
                </button>
              </div>

            </form>
          </div>
        </div>
      </div>
    </>
  );
};

export default ServiceLeadPopup;