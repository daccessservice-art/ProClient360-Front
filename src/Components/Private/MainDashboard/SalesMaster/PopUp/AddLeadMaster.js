import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { RequiredStar } from "../../../RequiredStar/RequiredStar";
import { getAddress } from "../../../../../hooks/usePincode";
import { getCustomers, getCustomerById } from "../../../../../hooks/useCustomer";
import Select from "react-select";

const PAGE_SIZE = 15;

const AddLeadMaster = ({ onAddLead, onClose }) => {
  const [customerType, setCustomerType] = useState('new');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    contact: '',
    company: '',
    subject: '',
    products: '',
    sources: '',
    message: '',
    status: 'enquiry',
    value: '',
    address: {
      pincode: '',
      state: '',
      city: '',
      country: '',
      add: ''
    }
  });

  // Customer dropdown state
  const [custOptions, setCustOptions] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [custPage, setCustPage] = useState(1);
  const [custHasMore, setCustHasMore] = useState(true);
  const [custLoading, setCustLoading] = useState(false);
  const [custSearch, setCustSearch] = useState("");
  const [isLoadingCustomerAddress, setIsLoadingCustomerAddress] = useState(false);
  const [isLoadingAddress, setIsLoadingAddress] = useState(false);

  // Custom source and product states
  const [showCustomSource, setShowCustomSource] = useState(false);
  const [customSource, setCustomSource] = useState('');
  const [showCustomProduct, setShowCustomProduct] = useState(false);
  const [customProduct, setCustomProduct] = useState('');

  const products = ['surveillance System', 'Access Control System', 'TurnKey Project', 'Alleviz', 'CafeLive', 'WorksJoy', 'WorksJoy Blu', 'Fire Alarm System', 'Fire Hydrant System', 'IDS', 'AI Face Machines', 'Entrance Automation', 'Guard Tour System', 'Home Automation', 'IP PA and Communication System', 'CRM', 'Security Systems', 'KMS', 'VMS', 'PMS', 'Boom Barrier System', 'Tripod System', 'Flap Barrier System', 'EPBX System', 'CMS', 'Lift Eliviter System', 'AV6', 'Walky Talky System', 'Device Management System', 'Other'];

  const sources = ['Google', 'Tender', 'Exhibitions', 'JustDial', 'Facebook', 'LinkedIn', 'Twitter', 'YouTube', 'WhatsApp', 'Referral', 'Email Campaign', 'Cold Call', 'Website', 'Walk-In', 'Direct', 'Other'];

  const loadCustomers = useCallback(async (page, search) => {
    if (custLoading || !custHasMore) return;
    setCustLoading(true);

    try {
      const data = await getCustomers(page, PAGE_SIZE, search);
      console.log("Customer data response:", data);

      if (data.error) {
        toast.error(data.error || 'Failed to load customers');
        setCustLoading(false);
        return;
      }

      const customers = data.customers || data.data || [];
      console.log("Customers array:", customers);

      const newOpts = customers.map(c => ({
        value: c._id,
        label: c.custName || c.name || 'Unnamed Customer'
      }));

      setCustOptions(prev => page === 1 ? newOpts : [...prev, ...newOpts]);
      setCustHasMore(customers.length === PAGE_SIZE);
      setCustPage(page + 1);
    } catch (error) {
      console.error("Fetch customers error:", error);
      toast.error('Failed to load customers');
    } finally {
      setCustLoading(false);
    }
  }, [custLoading, custHasMore]);

  const handleCustomerSelect = async (selectedOption) => {
    console.log("Customer selected:", selectedOption);
    setSelectedCustomer(selectedOption);

    if (selectedOption) {
      setIsLoadingCustomerAddress(true);
      try {
        const customerData = await getCustomerById(selectedOption.value);
        console.log("Customer details response:", customerData);

        if (customerData && (customerData.customer || customerData.data)) {
          const customer = customerData.customer || customerData.data;
          console.log("Customer object:", customer);

          const billingAddress = customer.billingAddress || customer.address || {};
          console.log("Billing address:", billingAddress);

          setFormData(prev => ({
            ...prev,
            name: customer.custName || customer.name || customer.contactPerson || '',
            email: customer.email || customer.contactPersonEmail || '',
            contact: customer.phoneNumber1 || customer.contact || customer.contactNumber || '',
            company: customer.custName || customer.name || customer.companyName || '',
            address: {
              pincode: billingAddress.pincode || '',
              state: billingAddress.state || '',
              city: billingAddress.city || '',
              add: billingAddress.add || billingAddress.addressLine1 || billingAddress.address ||
                `${billingAddress.houseNo || ''}, ${billingAddress.buildingName || ''}, ${billingAddress.roadName || ''}, ${billingAddress.area || ''}, ${billingAddress.colony || ''}` || '',
              country: billingAddress.country || 'India'
            }
          }));

          toast.success("Customer details loaded successfully");
        } else {
          console.error("Invalid customer data:", customerData);
          resetFormData();
          toast("No details found for this customer");
        }
      } catch (error) {
        console.error("Error fetching customer details:", error);
        toast.error("Failed to load customer details");
        resetFormData();
      } finally {
        setIsLoadingCustomerAddress(false);
      }
    } else {
      resetFormData();
    }
  };

  // Helper function to reset form data
  const resetFormData = () => {
    setFormData(prev => ({
      ...prev,
      name: '',
      email: '',
      contact: '',
      company: '',
      address: {
        pincode: '',
        state: '',
        city: '',
        add: '',
        country: ''
      }
    }));
  };

  useEffect(() => {
    if (customerType === 'existing') {
      console.log("Loading customers for existing customer type");
      setCustPage(1);
      setCustHasMore(true);
      setCustOptions([]);
      loadCustomers(1, custSearch);
    }
  }, [customerType]);

  useEffect(() => {
    if (customerType === 'existing') {
      console.log("Search changed, reloading customers");
      const timer = setTimeout(() => {
        setCustPage(1);
        setCustHasMore(true);
        setCustOptions([]);
        loadCustomers(1, custSearch);
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [custSearch]);

  useEffect(() => {
    const fetchData = async () => {
      if (formData.address.pincode && formData.address.pincode.length === 6) {
        setIsLoadingAddress(true);
        try {
          const data = await getAddress(formData.address.pincode);

          if (data && data !== "Error") {
            setFormData(prev => ({
              ...prev,
              address: {
                ...prev.address,
                state: data.state || "",
                city: data.city || "",
                country: data.country || "India"
              }
            }));
          } else {
            setFormData(prev => ({
              ...prev,
              address: {
                ...prev.address,
                state: "",
                city: "",
                country: ""
              }
            }));
          }
        } catch (error) {
          console.error("Error fetching address:", error);
          setFormData(prev => ({
            ...prev,
            address: {
              ...prev.address,
              state: "",
              city: "",
              country: ""
            }
          }));
        } finally {
          setIsLoadingAddress(false);
        }
      } else if (formData.address.pincode.length < 6) {
        setFormData(prev => ({
          ...prev,
          address: {
            ...prev.address,
            state: "",
            city: "",
            country: ""
          }
        }));
      }
    };

    const timeoutId = setTimeout(() => {
      fetchData();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [formData.address.pincode]);

  const handleAddressChange = (e) => {
    const { name, value } = e.target;

    if (['state', 'city', 'country'].includes(name)) {
      if (!/^[A-Za-z\s]*$/.test(value)) return;
    }

    setFormData(prev => ({
      ...prev,
      address: {
        ...prev.address,
        [name]: value
      }
    }));
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    if (name === "sources") {
      if (value === "Other") {
        setShowCustomSource(true);
        setFormData(prev => ({ ...prev, [name]: '' }));
      } else {
        setShowCustomSource(false);
        setCustomSource('');
        setFormData(prev => ({ ...prev, [name]: value }));
      }
    } else if (name === "products") {
      if (value === "Other") {
        setShowCustomProduct(true);
        setFormData(prev => ({ ...prev, [name]: '' }));
      } else {
        setShowCustomProduct(false);
        setCustomProduct('');
        setFormData(prev => ({ ...prev, [name]: value }));
      }
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleCustomerTypeChange = (e) => {
    const type = e.target.value;
    setCustomerType(type);

    if (type === 'new') {
      resetFormData();
      setSelectedCustomer(null);
    }
  };

  const handleCustomSourceChange = (e) => {
    const value = e.target.value;
    setCustomSource(value);
    setFormData(prev => ({ ...prev, sources: value }));
  };

  const handleCustomProductChange = (e) => {
    const value = e.target.value;
    setCustomProduct(value);
    setFormData(prev => ({ ...prev, products: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const {
      name,
      email,
      contact,
      subject,
      company,
      products,
      sources,
      message,
      address
    } = formData;

    if (customerType === 'new') {
      if (!name || !company || !contact || !products || !address.pincode || !address.add || !sources) {
        toast.error('Please fill in all required fields, including Pincode, full address, and source.');
        return;
      }
    } else {
      if (!selectedCustomer || !products || !sources) {
        toast.error('Please select a customer and fill in all required fields.');
        return;
      }
    }

    // Validate custom source
    if (showCustomSource && !customSource.trim()) {
      toast.error('Please enter a custom source.');
      return;
    }

    // Validate custom product
    if (showCustomProduct && !customProduct.trim()) {
      toast.error('Please enter a custom product.');
      return;
    }

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
      QUERY_PRODUCT_NAME: products,
      QUERY_SOURCES_NAME: sources,
      QUERY_MESSAGE: message || ""
    };

    onAddLead(mappedData);
  };

  return (
    <>
      <div className="modal fade show" style={{ display: "flex", alignItems: "center", backgroundColor: "#00000090" }}>
        <div className="modal-dialog modal-lg">
          <div className="modal-content p-3">
            <form onSubmit={handleSubmit}>

              <div className="modal-header pt-0">
                <h5 className="card-title fw-bold" id="exampleModalLongTitle"> Add Lead</h5>
                <button onClick={onClose} type="button" className="btn-close" aria-label="Close" style={{ backgroundColor: 'red' }}></button>
              </div>

              <div className="modal-body" style={{ maxHeight: 'calc(80vh - 240px)', overflowY: 'auto' }}>
                <div className="row g-3">
                  <div className="col-12 mb-3">
                    <label className="form-label fw-bold">Customer Type <RequiredStar /></label>
                    <div className="d-flex gap-4">
                      <div className="form-check">
                        <input
                          className="form-check-input"
                          type="radio"
                          name="customerType"
                          id="newCustomer"
                          value="new"
                          checked={customerType === 'new'}
                          onChange={handleCustomerTypeChange}
                        />
                        <label className="form-check-label" htmlFor="newCustomer">
                          New Customer
                        </label>
                      </div>
                      <div className="form-check">
                        <input
                          className="form-check-input"
                          type="radio"
                          name="customerType"
                          id="existingCustomer"
                          value="existing"
                          checked={customerType === 'existing'}
                          onChange={handleCustomerTypeChange}
                        />
                        <label className="form-check-label" htmlFor="existingCustomer">
                          Existing Customer
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Customer Selection Field */}
                  {customerType === 'existing' && (
                    <div className="col-12">
                      <div className="mb-3">
                        <label htmlFor="existingCustomer" className="form-label">Select client <RequiredStar /></label>
                        <Select
                          options={custOptions}
                          value={selectedCustomer}
                          onChange={handleCustomerSelect}
                          onInputChange={val => setCustSearch(val)}
                          onMenuScrollToBottom={() => {
                            if (!custLoading && custHasMore) {
                              loadCustomers(custPage, custSearch);
                            }
                          }}
                          isLoading={custLoading}
                          placeholder="Search and select client..."
                          noOptionsMessage={({ inputValue }) =>
                            inputValue
                              ? 'No clients found. Try a different search.'
                              : 'Type to search clients...'
                          }
                          loadingMessage={() => 'Loading clients...'}
                          closeMenuOnSelect={true}
                          styles={{
                            control: (provided) => ({
                              ...provided,
                              borderRadius: 0,
                              borderColor: '#ced4da',
                              fontSize: '16px',
                              minHeight: '38px',
                            }),
                            option: (provided, state) => ({
                              ...provided,
                              backgroundColor: state.isSelected ? '#007bff' : state.isFocused ? '#f8f9fa' : 'white',
                              color: state.isSelected ? 'white' : '#212529',
                            }),
                          }}
                        />
                        <div className="mt-1">
                          {custLoading && (
                            <small className="text-info">Loading clients...</small>
                          )}
                          {isLoadingCustomerAddress && (
                            <small className="text-info">Loading client details...</small>
                          )}
                          {selectedCustomer && !isLoadingCustomerAddress && (
                            <small className="text-success">
                              Client selected: {selectedCustomer.label}
                            </small>
                          )}
                          {!custLoading && custOptions.length === 0 && custSearch && (
                            <small className="text-warning">No clients found for "{custSearch}"</small>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="col-md-6">
                    <label htmlFor="company" className="form-label">Customer Name<RequiredStar /></label>
                    <input
                      type="text"
                      className="form-control"
                      id="company"
                      name="company"
                      placeholder="Enter a Company Name...."
                      maxLength={100}
                      value={formData.company}
                      onChange={handleInputChange}
                      required
                      readOnly={customerType === 'existing'}
                      style={customerType === 'existing' ? { backgroundColor: '#f8f9fa' } : {}}
                    />
                  </div>

                  <div className="col-md-6">
                    <label htmlFor="name" className="form-label">Contact Name <RequiredStar /></label>
                    <input
                      type="text"
                      className="form-control"
                      id="name"
                      name="name"
                      placeholder="Enter a Contact Name...."
                      maxLength={50}
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                      readOnly={customerType === 'existing'}
                      style={customerType === 'existing' ? { backgroundColor: '#f8f9fa' } : {}}
                    />
                  </div>

                  <div className="col-md-6">
                    <label htmlFor="email" className="form-label">
                      Contact Email <RequiredStar />
                    </label>
                    <input
                      type="email"
                      className="form-control"
                      id="email"
                      name="email"
                      placeholder="Enter Email ID...."
                      maxLength={50}
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      pattern='[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
                      title="Please enter a valid email address (e.g., example@domain.com)"
                      readOnly={customerType === 'existing'}
                      style={customerType === 'existing' ? { backgroundColor: '#f8f9fa' } : {}}
                    />
                  </div>

                  <div className="col-md-6">
                    <label htmlFor="contact" className="form-label">
                      Contact Number <RequiredStar />
                    </label>
                    <input
                      type="tel"
                      className="form-control"
                      id="contact"
                      name="contact"
                      placeholder="Enter Contact Number...."
                      inputMode="numeric"
                      maxLength={10}
                      pattern="\d{10}"
                      value={formData.contact}
                      onChange={handleInputChange}
                      onInput={(e) => {
                        if (customerType === 'new') {
                          e.target.value = e.target.value.replace(/[^0-9]/g, "");
                        }
                      }}
                      required
                      readOnly={customerType === 'existing'}
                      style={customerType === 'existing' ? { backgroundColor: '#f8f9fa' } : {}}
                    />
                  </div>

                  <div className="col-md-6">
                    <label htmlFor="subject" className="form-label">Subject <RequiredStar /></label>
                    <textarea type="text" className="form-control" id="subject" name="subject" placeholder="Enter a Subject...." maxLength={200} value={formData.subject} onChange={handleInputChange} required ></textarea>
                  </div>

                  <div className='col-md-6'>
                    <label htmlFor="products" className="form-label">Products<RequiredStar /></label>
                    <select
                      id="products"
                      className="form-select"
                      name="products"
                      value={showCustomProduct ? "Other" : formData.products}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="">Select Products....</option>
                      {products.map(product => <option key={product} value={product}>{product}</option>)}
                    </select>

                    {showCustomProduct && (
                      <div className="mt-2">
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Enter custom product name"
                          value={customProduct}
                          onChange={handleCustomProductChange}
                          maxLength={100}
                          required
                        />
                      </div>
                    )}
                  </div>

                  <div className='col-md-6'>
                    <label htmlFor="sources" className="form-label">Sources<RequiredStar /></label>
                    <select
                      id="sources"
                      className="form-select"
                      name="sources"
                      value={showCustomSource ? "Other" : formData.sources}
                      onChange={handleInputChange}
                      style={{ width: '100%', height: '35px' }}
                      required
                    >
                      <option value="">Select Sources....</option>
                      {sources.map(source => <option key={source} value={source}>{source}</option>)}
                    </select>

                    {showCustomSource && (
                      <div className="mt-2">
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Enter custom source"
                          value={customSource}
                          onChange={handleCustomSourceChange}
                          maxLength={50}
                          required
                        />
                      </div>
                    )}
                  </div>

                  <div className="col-md-6">
                    <label htmlFor="message" className="form-label">Message</label>
                    <textarea
                      className="form-control"
                      id="message"
                      name="message"
                      placeholder="Enter a Message...."
                      value={formData.message}
                      onChange={handleInputChange}
                      style={{ width: '100%', height: '100px' }}
                      maxLength={500}
                    />
                  </div>

                  <div className="col-12">
                    <div className="row border rounded p-3 m-1" style={{ backgroundColor: '#FAF6F6' }}>
                      <div className="col-12 mb-2">
                        <label className="form-label fw-bold">Address {customerType === 'new' && <RequiredStar />}</label>
                        {isLoadingCustomerAddress && (
                          <small className="text-info ms-2">Loading customer address...</small>
                        )}
                      </div>

                      <div className="col-12 col-lg-6 mb-3">
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Pincode"
                          id="pincode"
                          name="pincode"
                          maxLength="6"
                          onChange={customerType === 'new' ? (e) => handleAddressChange(e) : undefined}
                          value={formData.address.pincode}
                          required={customerType === 'new'}
                          readOnly={customerType === 'existing'}
                          style={customerType === 'existing' ? { backgroundColor: '#f8f9fa' } : {}}
                        />
                        {isLoadingAddress && (
                          <small className="text-info">Loading address details...</small>
                        )}
                      </div>

                      <div className="col-12 col-lg-6 mb-3">
                        <input
                          type="text"
                          maxLength={50}
                          className="form-control"
                          placeholder="State"
                          id="state"
                          name="state"
                          onChange={customerType === 'new' ? (e) => handleAddressChange(e) : undefined}
                          value={formData.address.state}
                          required={customerType === 'new'}
                          readOnly={customerType === 'existing'}
                          style={customerType === 'existing' ? { backgroundColor: '#f8f9fa' } : {}}
                        />
                      </div>

                      <div className="col-12 col-lg-6 mb-3">
                        <input
                          type="text"
                          maxLength={50}
                          className="form-control"
                          placeholder="City"
                          id="city"
                          name="city"
                          onChange={customerType === 'new' ? (e) => handleAddressChange(e) : undefined}
                          value={formData.address.city}
                          required={customerType === 'new'}
                          readOnly={customerType === 'existing'}
                          style={customerType === 'existing' ? { backgroundColor: '#f8f9fa' } : {}}
                        />
                      </div>

                      <div className="col-12 col-lg-6 mb-3">
                        <input
                          type="text"
                          maxLength={50}
                          className="form-control"
                          placeholder="Country"
                          id="country"
                          name="country"
                          onChange={customerType === 'new' ? (e) => handleAddressChange(e) : undefined}
                          value={formData.address.country}
                          required={customerType === 'new'}
                          readOnly={customerType === 'existing'}
                          style={customerType === 'existing' ? { backgroundColor: '#f8f9fa' } : {}}
                        />
                      </div>

                      <div className="col-12">
                        <textarea
                          className="form-control"
                          id="add"
                          maxLength={500}
                          name="add"
                          placeholder="House No., Building Name, Road Name, Area, Colony"
                          onChange={customerType === 'new' ? (e) => handleAddressChange(e) : undefined}
                          value={formData.address.add}
                          rows="2"
                          required={customerType === 'new'}
                          readOnly={customerType === 'existing'}
                          style={customerType === 'existing' ? { backgroundColor: '#f8f9fa' } : {}}
                        ></textarea>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer border-0 justify-content-start">
                <button type="submit" className=" btn addbtn rounded-0 add_button px-4">Add</button>
                <button type="button" className=" btn addbtn rounded-0 Cancel_button px-4" onClick={onClose}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
};

export default AddLeadMaster;