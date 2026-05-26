import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import Select from "react-select";
import { getCustomers, getCustomerById } from "../../../../../hooks/useCustomer";
import { createProject } from "../../../../../hooks/useProjects";
import { RequiredStar } from "../../../RequiredStar/RequiredStar";
import { getAddress } from "../../../../../hooks/usePincode";

const PAGE_SIZE = 15;

const AddProjectPopup = ({ handleAdd }) => {
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [purchaseOrderNo, setPurchaseOrderNo] = useState("");
  const [purchaseOrderDate, setPurchaseOrderDate] = useState("");
  const [purchaseOrderValue, setPurchaseOrderValue] = useState("");
  const [endDate, setEndDate] = useState("");
  const [advancePay, setAdvancePayment] = useState(0);
  const [payAgainstDelivery, setPayAgainstDelivery] = useState(0);
  const [payAfterCompletion, setPayAfterCompletion] = useState(0);
  const [remark, setRemark] = useState("");
  const [category, setCategory] = useState('');
  const [POCopy, setPOCopy] = useState("");
  const [loading, setLoading] = useState(false);
  const [retention, setRetention] = useState(0);
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
    pincode: "",
    state: "",
    city: "",
    add: "",
    country: "",
  });

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
        setAddress(prevAddress => ({
          ...prevAddress,
          state: "",
          city: "",
          country: ""
        }));
      }
    };
    
    const timeoutId = setTimeout(() => {
      fetchData();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [Address.pincode]);

  // Fetch customers with pagination & search
  const loadCustomers = useCallback(async (page, search) => {
    if (custLoading || (!custHasMore && page > 1)) return;
    
    setCustLoading(true);
    try {
      const data = await getCustomers(page, PAGE_SIZE, search);

      if (data.error) {
        toast.error(data.error || 'Failed to load customers');
        setCustLoading(false);
        return;
      }

      const newOpts = (data.customers || []).map(c => ({ value: c._id, label: c.custName }));
      setCustOptions(prev => page === 1 ? newOpts : [...prev, ...newOpts]);
      setCustHasMore(newOpts.length === PAGE_SIZE);
      setCustPage(page + 1);
    } catch (error) {
      console.error("Error loading customers:", error);
      toast.error("Failed to load customers");
    } finally {
      setCustLoading(false);
    }
  }, [custLoading, custHasMore]);

  // Handle customer selection - AUTO FETCH ADDRESS
  const handleCustomerSelect = async (selectedOption) => {
    setSelectedCustomer(selectedOption);
    
    if (selectedOption) {
      setIsLoadingCustomerAddress(true);
      try {
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
          toast.info("No address found for this customer");
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [custSearch]);

  const handleProjectAdd = async (event) => {
    event.preventDefault();

    // Validation
    if (!selectedCustomer) {
      return toast.error("Please select a customer");
    }

    if (!name.trim()) {
      return toast.error("Project name is required");
    }

    if (!category) {
      return toast.error("Please select project category");
    }

    if (!purchaseOrderNo.trim()) {
      return toast.error("Purchase order number is required");
    }

    if (!purchaseOrderDate) {
      return toast.error("Purchase order date is required");
    }

    if (!purchaseOrderValue || Number(purchaseOrderValue) <= 0) {
      return toast.error("Purchase order value should be greater than 0");
    }

    if (!startDate || !endDate) {
      return toast.error("Please select start and end dates");
    }

    if (new Date(startDate) > new Date(endDate)) {
      return toast.error("Start date should be less than end date");
    }

    // Payment validation
    const totalPayment = Number(advancePay) + Number(payAgainstDelivery) + Number(payAfterCompletion);
    if (totalPayment > 100) {
      return toast.error("The total payment percentage cannot exceed 100%");
    }

    // Address validation
    if (!Address.pincode || Address.pincode.length !== 6) {
      return toast.error("Please enter valid 6-digit pincode");
    }

    if (!Address.state || !Address.state.trim()) {
      return toast.error("State is required");
    }

    if (!Address.city || !Address.city.trim()) {
      return toast.error("City is required");
    }

    if (!Address.country || !Address.country.trim()) {
      return toast.error("Country is required");
    }

    if (!Address.add || !Address.add.trim()) {
      return toast.error("Complete address is required");
    }

    if (!POCopy) {
      return toast.error("Please upload Purchase Order copy (PDF)");
    }

    // Create project data object
    const projectData = {
      custId: selectedCustomer.value,
      name: name.trim(),
      purchaseOrderDate,
      purchaseOrderNo: purchaseOrderNo.trim(),
      purchaseOrderValue: Number(purchaseOrderValue),
      category,
      startDate,
      endDate,
      advancePay: Number(advancePay) || 0,
      payAgainstDelivery: Number(payAgainstDelivery) || 0,
      payAfterCompletion: Number(payAfterCompletion) || 0,
      retention: Number(retention) || 0,
      remark: remark.trim(),
      Address: {
        pincode: Address.pincode,
        state: Address.state.trim(),
        city: Address.city.trim(),
        add: Address.add.trim(),
        country: Address.country.trim()
      },
      POCopy
    };

    console.log("Project Data being sent:", projectData); // Debug log

    setLoading(true);
    const loadingToast = toast.loading("Creating Project...");
    
    try {
      const data = await createProject(projectData);
      toast.dismiss(loadingToast);
      
      if (data && data.success) {
        toast.success(data.message || "Project created successfully");
        handleAdd();
      } else {
        toast.error(data?.error || "Failed to create project");
        console.error("Project creation error:", data);
      }
    } catch (error) {
      toast.dismiss(loadingToast);
      console.error("Error creating project:", error);
      toast.error(error?.response?.data?.error || error?.message || "Failed to create project");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const retentionValue = 100 - (Number(advancePay) + Number(payAgainstDelivery) + Number(payAfterCompletion));
    if (retentionValue >= 0) {
      setRetention(retentionValue);
    } else {
      setRetention(0);
    }
  }, [advancePay, payAgainstDelivery, payAfterCompletion]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Check file type
      if (file.type !== 'application/pdf') {
        setPOCopy("");
        e.target.value = "";
        return toast.error("Only PDF files are allowed");
      }

      // Check file size (2MB = 2 * 1024 * 1024 bytes)
      if (file.size > 2 * 1024 * 1024) {
        setPOCopy("");
        e.target.value = "";
        return toast.error("File must be less than 2MB");
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setPOCopy(reader.result);
      };
      reader.onerror = () => {
        toast.error("Error reading file");
        setPOCopy("");
      };
      reader.readAsDataURL(file);
    }
  };

  // Address field handlers
  const handlePincodeChange = (e) => {
    const value = e.target.value;
    if (/^\d{0,6}$/.test(value)) {
      setAddress(prevAddress => ({
        ...prevAddress,
        pincode: value,
      }));
    }
  };

  const handleStateChange = (e) => {
    const value = e.target.value;
    if (/^[A-Za-z\s]*$/.test(value)) {
      setAddress(prevAddress => ({ 
        ...prevAddress, 
        state: value 
      }));
    }
  };

  const handleCityChange = (e) => {
    const value = e.target.value;
    if (/^[A-Za-z\s]*$/.test(value)) {
      setAddress(prevAddress => ({ 
        ...prevAddress, 
        city: value 
      }));
    }
  };

  const handleCountryChange = (e) => {
    const value = e.target.value;
    if (/^[A-Za-z\s]*$/.test(value)) {
      setAddress(prevAddress => ({ 
        ...prevAddress, 
        country: value 
      }));
    }
  };

  return (
    <div className="modal fade show" style={{ display: "flex", alignItems: 'center', backgroundColor: "#00000090" }}>
      <div className="modal-dialog modal-lg">
        <div className="modal-content p-3">
          <form onSubmit={handleProjectAdd}>
            <div className="modal-header pt-0">
              <h5 className="card-title fw-bold" id="exampleModalLongTitle">
                Create New Project
              </h5>
              <button onClick={() => { handleAdd() }} type="button" className="close px-3" style={{ marginLeft: "auto" }}>
                <span aria-hidden="true">&times;</span>
              </button>
            </div>
            <div className="modal-body">
              <div className="row modal_body_height">
                <div className="col-12">
                  <div className="mb-3">
                    <label htmlFor="customerSearch" className="form-label label_text">
                      Customer Name <RequiredStar />
                    </label>
                    <Select
                      options={custOptions}
                      value={selectedCustomer}
                      onChange={handleCustomerSelect}
                      onInputChange={val => setCustSearch(val)}
                      onMenuScrollToBottom={() => loadCustomers(custPage, custSearch)}
                      isLoading={custLoading}
                      placeholder="Search and select customer..."
                      noOptionsMessage={() => custLoading ? 'Loading...' : 'No customers found'}
                      closeMenuOnSelect={true}
                      isClearable={true}
                    />
                    {isLoadingCustomerAddress && (
                      <small className="text-info">Loading customer address...</small>
                    )}
                    {selectedCustomer && !isLoadingCustomerAddress && (
                      <small className="text-success">
                        ✓ Customer selected: {selectedCustomer.label}
                      </small>
                    )}
                  </div>
                </div>

                <div className="mb-3">
                  <label htmlFor="ProjectName" className="form-label label_text">Project Name <RequiredStar /></label>
                  <textarea 
                    type="text" 
                    className="form-control rounded-0" 
                    id="ProjectName" 
                    maxLength={1000} 
                    placeholder="Enter a Project Name..." 
                    onChange={(e) => setName(e.target.value)} 
                    value={name} 
                    required
                  ></textarea>
                </div>

                <div className="col-12 col-lg-6 mt-2">
                  <div className="mb-3">
                    <label htmlFor="purchaseOrderDate" className="form-label label_text">
                      Purchase Order Date <RequiredStar />
                    </label>
                    <input
                      onChange={(e) => setPurchaseOrderDate(e.target.value)}
                      value={purchaseOrderDate}
                      type="date"
                      className="form-control rounded-0"
                      id="purchaseOrderDate"
                      required
                    />
                  </div>
                </div>
                
                <div className="col-12 col-lg-6 mt-2">
                  <div className="mb-3">
                    <label htmlFor="purchaseOrderNo" className="form-label label_text">Purchase Order Number <RequiredStar /></label>
                    <input 
                      type="text" 
                      className="form-control rounded-0" 
                      maxLength={200} 
                      id="purchaseOrderNo"
                      onChange={(e) => setPurchaseOrderNo(e.target.value)}
                      value={purchaseOrderNo} 
                      required 
                    />
                  </div>
                </div>

                <div className="col-12 col-lg-6 mt-2">
                  <div className="mb-3">
                    <label htmlFor="purchaseOrderValue" className="form-label label_text">Purchase Order Value (Rs) <RequiredStar /> [Without GST]</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="form-control rounded-0"
                      id="purchaseOrderValue"
                      onChange={(e) => {
                        const value = e.target.value;
                        if (/^\d*\.?\d*$/.test(value)) {
                          setPurchaseOrderValue(value);
                        }
                      }}
                      value={purchaseOrderValue}
                      placeholder="Enter amount"
                      required
                    />
                  </div>
                </div>

                <div className="col-12 col-lg-6 mt-2">
                  <div className="mb-3">
                    <label htmlFor="CategoryofProject" className="form-label label_text">Category of Project <RequiredStar /></label>
                    <select
                      className="form-select rounded-0"
                      id="CategoryofProject"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      required
                    >
                      <option value="">-- Select Category Name --</option>
                      <option value="Surveillance System">Surveillance System</option>
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
                      <option value="LAN Cabling Activity">LAN Cabling Activity</option>
                    </select>
                  </div>
                </div>
                
                <div className="col-12 col-lg-6 mt-2">
                  <div className="mb-3">
                    <label htmlFor="ProjectStartDate" className="form-label label_text">Project Start Date <RequiredStar /></label>
                    <input
                      onChange={(e) => setStartDate(e.target.value)}
                      value={startDate}
                      type="date"
                      className="form-control rounded-0"
                      id="ProjectStartDate"
                      required
                    />
                  </div>
                </div>

                <div className="col-12 col-lg-6 mt-2">
                  <div className="mb-3">
                    <label htmlFor="ProjectEndDate" className="form-label label_text">Project End Date <RequiredStar /> [Expected]</label>
                    <input
                      onChange={(e) => setEndDate(e.target.value)}
                      value={endDate}
                      type="date"
                      className="form-control rounded-0"
                      id="ProjectEndDate"
                      min={startDate}
                      required
                    />
                  </div>
                </div>
                
                <div className="col-12 mt-2">
                  <div className="row border bg-gray mx-auto">
                    <div className="col-10 mb-3">
                      <span className="SecondaryInfo">Payment terms:</span>
                    </div>

                    <div className="col-12 col-lg-6 mt-2">
                      <div className="mb-3">
                        <label htmlFor="AdvancePayment" className="form-label label_text">Advance Payment (%) <RequiredStar /></label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          className="form-control rounded-0"
                          id="AdvancePayment"
                          onChange={(e) => {
                            const value = e.target.value;
                            if (/^\d*\.?\d*$/.test(value) && Number(value) <= 100) {
                              setAdvancePayment(value);
                            }
                          }}
                          value={advancePay}
                          placeholder="0"
                          required
                        />
                      </div>
                    </div>

                    <div className="col-12 col-lg-6 mt-2">
                      <div className="mb-3">
                        <label htmlFor="PayAgainstDelivery" className="form-label label_text">Pay Against Delivery (%) <RequiredStar /></label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          className="form-control rounded-0"
                          id="PayAgainstDelivery"
                          onChange={(e) => {
                            const value = e.target.value;
                            if (/^\d*\.?\d{0,2}$/.test(value) && Number(value) <= 100) {
                              setPayAgainstDelivery(value);
                            }
                          }}
                          value={payAgainstDelivery}
                          placeholder="0"
                          required
                        />
                      </div>
                    </div>

                    <div className="col-12 col-lg-6 mt-2">
                      <div className="mb-3">
                        <label htmlFor="PayAfterCompletion" className="form-label label_text">Pay After Completion (%) <RequiredStar /></label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          className="form-control rounded-0"
                          id="PayAfterCompletion"
                          onChange={(e) => {
                            const value = e.target.value;
                            if (/^\d*\.?\d{0,2}$/.test(value) && Number(value) <= 100) {
                              setPayAfterCompletion(value);
                            }
                          }}
                          value={payAfterCompletion}
                          placeholder="0"
                          required
                        />
                      </div>
                    </div>

                    <div className="col-12 col-lg-6 mt-2">
                      <div className="mb-3">
                        <label htmlFor="retention" className="form-label label_text">Retention (%) <RequiredStar /></label>
                        <input
                          type="number"
                          className="form-control rounded-0"
                          id="retention"
                          value={retention}
                          readOnly
                          style={{ backgroundColor: '#e9ecef' }}
                        />
                      </div>
                    </div>
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
                          maxLength={50}
                          className="form-control rounded-0"
                          placeholder="State"
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
                    <label htmlFor="PurchaseOrderCopy" className="form-label label_text">
                      Purchase Order Copy <RequiredStar /> [PDF only, max 2MB]
                    </label>
                    <input 
                      type="file" 
                      className="form-control rounded-0" 
                      id="PurchaseOrderCopy"
                      accept=".pdf,application/pdf"
                      onChange={handleFileChange}
                      required
                    />
                    {POCopy && (
                      <small className="text-success">✓ File uploaded successfully</small>
                    )}
                  </div>
                </div>

                <div className="col-12 col-lg-12 mt-2">
                  <div className="mb-3">
                    <label htmlFor="remark" className="form-label label_text">Remark</label>
                    <textarea
                      className="textarea_edit col-12"
                      id="remark"
                      maxLength={1000}
                      name="remark"
                      placeholder="Enter a Remark..."
                      onChange={(e) => setRemark(e.target.value)} 
                      value={remark}
                      rows="2"
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
                      {loading ? "Submitting..." : "Add Project"}
                    </button>
                    <button
                      type="button"
                      onClick={handleAdd}
                      disabled={loading}
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
  );
  
}

export default AddProjectPopup;