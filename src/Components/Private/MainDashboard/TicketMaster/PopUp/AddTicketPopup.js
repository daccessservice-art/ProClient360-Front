import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import { RequiredStar } from "../../../RequiredStar/RequiredStar";
import { createTicket } from "../../../../../hooks/useTicket";
import { getCustomers, getCustomerById } from "../../../../../hooks/useCustomer";
import { getAddress } from "../../../../../hooks/usePincode";
import Select from "react-select";

const PAGE_SIZE = 15;

const AddTicketPopup = ({ handleAdd }) => {
  const [client, setClient] = useState("");
  const [details, setDetails] = useState("");
  const [product, setProduct] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [source, setSource] = useState("Call");
  const [contactPersonEmail, setContactPersonEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [isLoadingAddress, setIsLoadingAddress] = useState(false);
  const [isLoadingCustomerAddress, setIsLoadingCustomerAddress] = useState(false);

  // Customer dropdown state
  const [custOptions, setCustOptions] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [custPage, setCustPage] = useState(1);
  const [custHasMore, setCustHasMore] = useState(true);
  const [custLoading, setCustLoading] = useState(false);
  const [custSearch, setCustSearch] = useState("");

  const [Address, setAddress] = useState({
    add: "",
    city: "",
    country: "",
    pincode: "",
    state: ""
  });

  // Auto-fetch address when pincode changes (with debounce)
  useEffect(() => {
    const fetchData = async () => {
      if (Address.pincode && Address.pincode.length === 6) {
        setIsLoadingAddress(true);
        try {
          const data = await getAddress(Address.pincode);

          if (data && data !== "Error") {
            setAddress(prevAddress => ({
              ...prevAddress,
              state: data.state || "",
              city: data.city || "",
              country: data.country || ""
            }));
          } else {
            // Clear other fields if pincode is invalid
            setAddress(prevAddress => ({
              ...prevAddress,
              state: "",
              city: "",
              country: ""
            }));
          }
        } catch (error) {
          console.error("Error fetching address:", error);
          setAddress(prevAddress => ({
            ...prevAddress,
            state: "",
            city: "",
            country: ""
          }));
        } finally {
          setIsLoadingAddress(false);
        }
      } else if (Address.pincode.length < 6) {
        // Clear fields when pincode is incomplete
        setAddress(prevAddress => ({
          ...prevAddress,
          state: "",
          city: "",
          country: ""
        }));
      }
    };
    
    // Add debounce to avoid too many API calls
    const timeoutId = setTimeout(() => {
      fetchData();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [Address.pincode]);

  // Fetch customers with pagination & search
  const loadCustomers = useCallback(async (page, search) => {
    if (custLoading || !custHasMore) return;
    setCustLoading(true);
    const data = await getCustomers(page, PAGE_SIZE, search);

    if (data.error) {
      toast.error(data.error || 'Failed to load customers');
      setCustLoading(false);
      return;
    }

    const newOpts = (data.customers || []).map(c => ({ value: c._id, label: c.custName }));
    setCustOptions(prev => page === 1 ? newOpts : [...prev, ...newOpts]);
    setCustHasMore(newOpts.length === PAGE_SIZE);
    setCustLoading(false);
    setCustPage(page + 1);
  }, [custLoading, custHasMore]);

  // Handle customer selection - AUTO FETCH ADDRESS
  const handleCustomerSelect = async (selectedOption) => {
    setSelectedCustomer(selectedOption);
    setClient(selectedOption ? selectedOption.value : "");
    
    if (selectedOption) {
      setIsLoadingCustomerAddress(true);
      try {
        // Fetch customer details including address
        const customerData = await getCustomerById(selectedOption.value);
        
        if (customerData && customerData.customer && customerData.customer.billingAddress) {
          const billingAddress = customerData.customer.billingAddress;
          setAddress({
            pincode: billingAddress.pincode || "",
            state: billingAddress.state || "",
            city: billingAddress.city || "",
            add: billingAddress.add || "",
            country: billingAddress.country || ""
          });
          toast.success("Customer address loaded successfully");
        } else {
          setAddress({
            pincode: "",
            state: "",
            city: "",
            add: "",
            country: ""
          });
          toast("No address found for this customer");
        }
      } catch (error) {
        console.error("Error fetching customer address:", error);
        toast.error("Failed to load customer address");
        setAddress({
          pincode: "",
          state: "",
          city: "",
          add: "",
          country: ""
        });
      } finally {
        setIsLoadingCustomerAddress(false);
      }
    } else {
      // Clear address if no customer selected
      setAddress({
        pincode: "",
        state: "",
        city: "",
        add: "",
        country: ""
      });
    }
  };

  // Initial & search-triggered load (reset on search)
  useEffect(() => {
    setCustPage(1);
    setCustHasMore(true);
    setCustOptions([]);
    loadCustomers(1, custSearch);
  }, [custSearch]);

  const handleEmployeeAdd = async (event) => {
    event.preventDefault();
    
    if (!client || !details || !product || !contactPerson || !contactNumber || !source) {
      return toast.error("Please fill all required fields");
    }
    
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactPersonEmail)) {
      return toast.error("Please Enter Valid Email");
    }
    
    if (contactNumber.length !== 10) {
      return toast.error("Please Enter Valid Contact Number");
    }
    
    if (/[a-zA-Z]/.test(contactNumber)) {
      return toast.error("Phone number should not contain alphabets");
    }

    if (Address.pincode.length !== 6 || Address.pincode < 0) {
      return toast.error("Please Re-Enter Pincode");
    }
    
    if(!Address.add || !Address.city || !Address.state || !Address.country) {
      return toast.error("Please fill all address fields");
    }

    const ticketData = {
      client,
      details,
      product,
      contactPerson,
      contactNumber,
      source,
      Address,
      contactPersonEmail
    };

    setLoading(true);
    toast.loading("Creating Ticket...");
    
    try {
      const data = await createTicket(ticketData);
      toast.dismiss();
      
      if (data.success) {
        handleAdd();
        toast.success(data?.message);
      } else {
        toast.error(data?.error || "Failed to create ticket");
      }
    } catch (error) {
      toast.dismiss();
      toast.error("Failed to create ticket");
    } finally {
      setLoading(false);
    }
  };

  // Validation functions
  const handlePincodeChange = (e) => {
    const value = e.target.value;
    if (/^\d{0,6}$/.test(value)) {
      setAddress(prevAddress => ({ 
        ...prevAddress, 
        pincode: value 
      }));
    }
  };

  const handleStateChange = (e) => {
    const value = e.target.value;
    if (/^[a-zA-Z\s]*$/.test(value)) {
      setAddress(prevAddress => ({ 
        ...prevAddress, 
        state: value 
      }));
    }
  };

  const handleCityChange = (e) => {
    const value = e.target.value;
    if (/^[a-zA-Z\s]*$/.test(value)) {
      setAddress(prevAddress => ({ 
        ...prevAddress, 
        city: value 
      }));
    }
  };

  const handleCountryChange = (e) => {
    const value = e.target.value;
    if (/^[a-zA-Z\s]*$/.test(value)) {
      setAddress(prevAddress => ({ 
        ...prevAddress, 
        country: value 
      }));
    }
  };

  const handleContactPersonName = (e) => {
    const value = e.target.value;
    if (/^[a-zA-Z\s]*$/.test(value)) {
      setContactPerson(value);
    }
  };

  const contactPersonNumber = (e) => {
    const value = e.target.value;
    if (/^\d{0,10}$/.test(value)) {
      setContactNumber(value);
    }
  };

  return (
    <>
      <div
        className="modal fade show"
        style={{
          display: "flex",
          alignItems: "center",
          backgroundColor: "#00000090",
        }}
      >
        <div className="modal-dialog modal-lg">
          <div className="modal-content p-3">
            <form onSubmit={handleEmployeeAdd}>
              <div className="modal-header pt-0">
                <h5 className="card-title fw-bold" id="exampleModalLongTitle">
                  Create New Ticket
                </h5>
                <button
                  onClick={() => handleAdd()}
                  type="button"
                  className="close px-3"
                  style={{ marginLeft: "auto" }}
                >
                  <span aria-hidden="true">&times;</span>
                </button>
              </div>
              <div className="modal-body">
                <div className="row modal_body_height">
                  <div className="col-12">
                    <div className="mb-3">
                      <label
                        htmlFor="clientName"
                        className="form-label label_text"
                      >
                        Client Name <RequiredStar />
                      </label>
                      <Select
                        options={custOptions}
                        value={selectedCustomer}
                        onChange={handleCustomerSelect}
                        onInputChange={val => setCustSearch(val)}
                        onMenuScrollToBottom={() => loadCustomers(custPage, custSearch)}
                        isLoading={custLoading}
                        placeholder="Search and select client..."
                        noOptionsMessage={() => custLoading ? 'Loading...' : 'No clients found'}
                        closeMenuOnSelect={true}
                        styles={{
                          control: (provided) => ({
                            ...provided,
                            borderRadius: 0,
                            borderColor: '#ced4da',
                            fontSize: '16px',
                          }),
                          option: (provided, state) => ({
                            ...provided,
                            backgroundColor: state.isSelected ? '#007bff' : state.isFocused ? '#f8f9fa' : 'white',
                            color: state.isSelected ? 'white' : '#212529',
                          }),
                        }}
                      />
                      {isLoadingCustomerAddress && (
                        <small className="text-info">Loading customer address...</small>
                      )}
                      {selectedCustomer && !isLoadingCustomerAddress && (
                        <small className="text-success">
                          Customer selected: {selectedCustomer.label}
                        </small>
                      )}
                    </div>
                  </div>
                  
                  <div className="col-12 mt-2">
                    <div className="row border mt-4 bg-gray mx-auto">
                      <div className="col-12 mb-3">
                        <span className="AddressInfo">Address <RequiredStar /></span>
                        {isLoadingCustomerAddress && (
                          <small className="text-info ms-2">Loading customer address...</small>
                        )}
                      </div>

                      <div className="col-12 col-lg-6 mt-2">
                        <div className="mb-3">
                          <input
                            type="text"
                            className="form-control rounded-0"
                            placeholder="Enter 6-digit Pincode"
                            maxLength={6}
                            onChange={handlePincodeChange}
                            value={Address.pincode}
                            required
                          />
                          {isLoadingAddress && (
                            <small className="text-info">Loading address details...</small>
                          )}
                          {Address.pincode.length === 6 && !isLoadingAddress && !Address.state && (
                            <small className="text-danger">Invalid pincode or no data found</small>
                          )}
                        </div>
                      </div>

                      <div className="col-12 col-lg-6 mt-2">
                        <div className="mb-3">
                          <input
                            type="text"
                            className="form-control rounded-0"
                            placeholder="State"
                            maxLength={50}
                            onChange={handleStateChange}
                            value={Address.state}
                            required
                          />
                        </div>
                      </div>

                      <div className="col-12 col-lg-6 mt-2">
                        <div className="mb-3">
                          <input
                            type="text"
                            maxLength={50}
                            className="form-control rounded-0"
                            placeholder="City"
                            onChange={handleCityChange}
                            value={Address.city}
                            required
                          />
                        </div>
                      </div>

                      <div className="col-12 col-lg-6 mt-2">
                        <div className="mb-3">
                          <input
                            type="text"
                            maxLength={50}
                            className="form-control rounded-0"
                            placeholder="Country"
                            onChange={handleCountryChange}
                            value={Address.country}
                            required
                          />
                        </div>
                      </div>

                      <div className="col-12 col-lg-12 mt-2">
                        <div className="mb-3">
                          <textarea
                            className="textarea_edit col-12"
                            maxLength={500}
                            placeholder="House NO., Building Name, Road Name, Area, Colony"
                            onChange={(e) => setAddress(prevAddress => ({ 
                              ...prevAddress, 
                              add: e.target.value 
                            }))}
                            value={Address.add}
                            rows="2"
                            required
                          ></textarea>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="col-12 col-lg-6 mt-2">
                    <div className="mb-3">
                      <label htmlFor="ContactPerson" className="form-label label_text">
                        Contact Person Name <RequiredStar />
                      </label>
                      <input
                        type="text"
                        maxLength={50}
                        value={contactPerson}
                        onChange={handleContactPersonName}
                        className="form-control rounded-0"
                        id="ContactPerson"
                        required
                      />
                    </div>
                  </div>

                  <div className="col-12 col-lg-6 mt-2">
                    <div className="mb-3">
                      <label
                        htmlFor="email"
                        className="form-label label_text"
                      >
                        Contact Person Email <RequiredStar />
                      </label>
                      <input
                        type="email"
                        maxLength={50}
                        value={contactPersonEmail}
                        onChange={(e) => setContactPersonEmail(e.target.value)}
                        className="form-control rounded-0"
                        id="email"
                        required
                      />
                    </div>
                  </div>

                  <div className="col-12 col-lg-6 mt-2">
                    <div className="mb-3">
                      <label
                        htmlFor="contactNumber"
                        className="form-label label_text"
                      >
                        Contact Person No. <RequiredStar />
                      </label>
                      <input
                        type="text"
                        maxLength={10}
                        value={contactNumber}
                        onChange={contactPersonNumber}
                        className="form-control rounded-0"
                        id="contactNumber"
                        required
                      />
                    </div>
                  </div>

                  <div className="col-12 col-lg-6 mt-2">
                    <div className="mb-3">
                      <label htmlFor="source" className="form-label label_text">
                        Complaint Source <RequiredStar />
                      </label>
                      <select
                        className="form-select rounded-0"
                        id="source"
                        value={source || "Call"}
                        onChange={(e) => setSource(e.target.value)}
                        required
                      >
                        <option value="">Select Source</option>
                        <option value="Email">Email</option>
                        <option value="Call">Call</option>
                        <option value="WhatsApp">WhatsApp</option>
                        <option value="SMS">SMS</option>
                        <option value="Direct">Direct</option>
                      </select>
                    </div>
                  </div>

                  <div className="col-12">
                    <div className="mb-3">
                      <label
                        htmlFor="product"
                        className="form-label label_text"
                      >
                        Product <RequiredStar />
                      </label>
                      <select
                        className="form-select rounded-0"
                        id="product"
                        onChange={(e) => setProduct(e.target.value)}
                        required
                      >
                        <option value="">Select Product</option>
                        <option value="CCTV System">CCTV System</option>
                        <option value="TA System">TA System</option>
                        <option value="Hajeri">Hajeri</option>
                        <option value="SmartFace">SmartFace</option>
                        <option value="ZKBioSecurity">ZKBioSecurity</option>
                        <option value="Access Control System">Access Control System</option>
                        <option value="Turnkey Project">Turnkey Project</option>
                        <option value="Alleviz">Alleviz</option>
                        <option value="CafeLive">CafeLive</option>
                        <option value="WorksJoy">WorksJoy</option>
                        <option value="WorksJoy Blu">WorksJoy Blu</option>
                        <option value="Fire Alarm System">Fire Alarm System</option>
                        <option value="Fire Hydrant System">Fire Hydrant System</option>
                        <option value="IDS">IDS</option>
                        <option value="AI Face Machines">AI Face Machines</option>
                        <option value="Entrance Automation">Entrance Automation</option>
                        <option value="Guard Tour System">Guard Tour System</option>
                        <option value="Home Automation">Home Automation</option>
                        <option value="IP PA and Communication System">IP PA and Communication System</option>
                        <option value="CRM">CRM</option>
                        <option value="KMS">KMS</option>
                        <option value="VMS">VMS</option>
                        <option value="PMS">PMS</option>
                        <option value="Boom Barrier System">Boom Barrier System</option> 
                        <option value="Tripod System">Tripod System</option>
                        <option value="Flap Barrier System">Flap Barrier System</option>
                        <option value="EPBX System">EPBX System</option>
                        <option value="CMS">CMS</option>
                        <option value="Lift Eliviter System">Lift Eliviter System</option>
                        <option value="AV6">AV6</option>
                        <option value="Walky Talky System">Walky Talky System</option>
                        <option value="Device Management System">Device Management System</option>
                        <option value="VisionIQ">VisionIQ</option>
                        <option value="CineMind">CineMind</option>
                        <option value="Extracto">Extracto</option>
                        <option value="Virtual Agent">Virtual Agent</option>
                      </select>
                    </div>
                  </div>

                  <div className="col-12">
                    <div className="mb-3">
                      <label
                        htmlFor="complaintDetails"
                        className="form-label label_text"
                      >
                        Complaint Details <RequiredStar />
                      </label>
                      <textarea
                        value={details}
                        onChange={(e) => setDetails(e.target.value)}
                        className="form-control rounded-0"
                        id="complaintDetails"
                        maxLength={300}
                        required
                      ></textarea>
                    </div>
                  </div>

                  <div className="row">
                    <div className="col-12 pt-3 mt-2">
                      <button
                        type="submit"
                        disabled={loading}
                        className="w-80 btn addbtn rounded-0 add_button m-2 px-4"
                      >
                        {!loading ? "Add" : "Submitting..."}
                      </button>
                      <button
                        type="button"
                        onClick={handleAdd}
                        className="w-80 btn addbtn rounded-0 Cancel_button m-2 px-4"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
};

export default AddTicketPopup;