import { useState, useEffect, useRef } from "react";
import validator from "validator";
import { updateCustomer, getEmployees, getCustomersForBranch } from "../../../../../hooks/useCustomer";
import { RequiredStar } from "../../../RequiredStar/RequiredStar";
import { getAddress } from "../../../../../hooks/usePincode";
import { toast } from "react-hot-toast";
import { useUser } from "../../../../../context/UserContext";

const UpdateCustomerPopUp = ({ handleUpdate, selectedCust }) => {
  const { user } = useUser();
  const [customer, setCustomer] = useState(selectedCust);
  const [employees, setEmployees] = useState([]);
  const [employeesLoading, setEmployeesLoading] = useState(false);
  const [employeeError, setEmployeeError] = useState(null);
  const [isLoadingAddress, setIsLoadingAddress] = useState(false);
  const [gstAutoFilled, setGstAutoFilled] = useState(false);

  const [showLocationInput, setShowLocationInput] = useState(false);
  const [locationText, setLocationText] = useState("");
  const locationInputRef = useRef(null);

  const [customerType, setCustomerType] = useState(selectedCust?.customerType || "main");
  const [branchOf, setBranchOf] = useState(selectedCust?.branchOf?._id || selectedCust?.branchOf || "");
  const [selectedBranchCustomer, setSelectedBranchCustomer] = useState(null);
  const [allCustomers, setAllCustomers] = useState([]);
  const [allCustomersLoading, setAllCustomersLoading] = useState(false);
  const [branchSearchText, setBranchSearchText] = useState("");
  const branchSearchTimeout = useRef(null);

  const [extraContacts, setExtraContacts] = useState([]);

  const [billingAddress, setBillingAddress] = useState({
    add: "", city: "", state: "", country: "", pincode: "",
  });

  const industryOptions = [
    "IT & Software", "Manufacturing", "Construction & Infrastructure",
    "Healthcare", "Education", "Retail", "Banking & Finance",
    "Logistics & Supply Chain", "Hospitality", "Real Estate",
    "Government & Public Sector", "Energy & Utilities", "Telecom",
    "Pharmaceuticals", "Automotive", "Dealer", "Hotel", "Gym & Club",
    "Facility Services", "Labour Contractor", "Security Systems Dealer", "Other"
  ];

  const isEmptyOrWhitespace = (value) =>
    value === undefined || value === null || value.toString().trim() === "";

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
      } catch (error) {
        setEmployees([]);
        setEmployeeError("Error loading employees.");
      } finally {
        setEmployeesLoading(false);
      }
    };
    fetchEmployees();
  }, []);

  useEffect(() => {
    if (customerType === "branch") {
      fetchBranchCustomers("");
    }
  }, [customerType]);

  useEffect(() => {
    if (customerType !== "branch") return;

    if (branchSearchTimeout.current) {
      clearTimeout(branchSearchTimeout.current);
    }

    branchSearchTimeout.current = setTimeout(() => {
      fetchBranchCustomers(branchSearchText);
    }, 400);

    return () => {
      if (branchSearchTimeout.current) {
        clearTimeout(branchSearchTimeout.current);
      }
    };
  }, [branchSearchText]);

  const fetchBranchCustomers = async (search) => {
    setAllCustomersLoading(true);
    try {
      const data = await getCustomersForBranch(search);
      if (data.success && data.customers) {
        setAllCustomers(data.customers);
        if (branchOf && !selectedBranchCustomer) {
          const existing = data.customers.find((c) => c._id === branchOf);
          if (existing) {
            setSelectedBranchCustomer(existing);
          }
        }
      } else {
        setAllCustomers([]);
      }
    } catch (error) {
      console.error("Error fetching branch customers:", error);
      setAllCustomers([]);
    } finally {
      setAllCustomersLoading(false);
    }
  };

  useEffect(() => {
    if (showLocationInput && locationInputRef.current) {
      locationInputRef.current.focus();
    }
  }, [showLocationInput]);

  useEffect(() => {
    const fetchData = async () => {
      if (billingAddress.pincode && billingAddress.pincode.toString().length === 6) {
        setIsLoadingAddress(true);
        try {
          const data = await getAddress(billingAddress.pincode);
          if (data) {
            setBillingAddress((prev) => ({ ...prev, state: data.state, city: data.city, country: data.country }));
          }
        } catch (error) {
        } finally {
          setIsLoadingAddress(false);
        }
      }
    };
    const timeoutId = setTimeout(fetchData, 500);
    return () => clearTimeout(timeoutId);
  }, [billingAddress.pincode]);

  useEffect(() => {
    if (customer) {
      setBillingAddress(customer.billingAddress || { add: "", city: "", state: "", country: "", pincode: "" });
      setCustomerType(customer.customerType || "main");
      const existingBranchId = customer.branchOf?._id || customer.branchOf || "";
      setBranchOf(existingBranchId);

      if (existingBranchId && customer.branchOf && typeof customer.branchOf === "object" && customer.branchOf.custName) {
        setSelectedBranchCustomer(customer.branchOf);
        // Mark GST as auto-filled if it matches the branch customer's GST
        if (customer.branchOf.GSTNo && customer.GSTNo === customer.branchOf.GSTNo) {
          setGstAutoFilled(true);
        }
      }

      const existing = [];
      for (let i = 2; i <= 5; i++) {
        const name = customer[`customerContactPersonName${i}`];
        const phone = customer[`phoneNumber${i}`];
        const email = customer[`customerContactPersonEmail${i}`];
        const designation = customer[`customerContactPersonDesignation${i}`];
        if (name || phone || email || designation) {
          existing.push({ name: name || "", phone: phone || "", email: email || "", designation: designation || "" });
        }
      }
      setExtraContacts(existing);
    }
  }, []);

  const custNameValue = customer?.custName || "";
  const hasLocation = /\([^)]+\)$/.test(custNameValue);

  const handleLocationToggle = () => {
    if (showLocationInput && locationText.trim()) {
      applyLocation();
    } else {
      setShowLocationInput(!showLocationInput);
      setLocationText("");
    }
  };

  const applyLocation = () => {
    if (!locationText.trim()) return;
    const loc = locationText.trim();
    const currentName = customer?.custName || "";
    const parenRegex = /\s*\([^)]*\)\s*$/;
    let newName;
    if (parenRegex.test(currentName)) {
      newName = currentName.replace(parenRegex, ` (${loc})`);
    } else {
      newName = `${currentName} (${loc})`;
    }
    setCustomer((prev) => ({ ...prev, custName: newName }));
    setShowLocationInput(false);
    setLocationText("");
  };

  const handleLocationKeyDown = (e) => {
    if (e.key === "Enter") { e.preventDefault(); applyLocation(); }
    if (e.key === "Escape") { setShowLocationInput(false); setLocationText(""); }
  };

  const handleRemoveLocation = () => {
    const currentName = customer?.custName || "";
    const parenRegex = /\s*\([^)]*\)\s*$/;
    if (parenRegex.test(currentName)) {
      setCustomer((prev) => ({ ...prev, custName: currentName.replace(parenRegex, "") }));
    }
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setCustomer((prev) => ({ ...prev, [name]: value }));
  };

  const handleCustNameChange = (e) => {
    if (/^[a-zA-Z0-9\s()]*$/.test(e.target.value)) {
      setCustomer((prev) => ({ ...prev, custName: e.target.value }));
    }
  };

  const handleBillingChange = (e) => {
    const { name, value } = e.target;
    setBillingAddress((prev) => ({ ...prev, [name]: value }));
  };

  const handlePincodeChange = (e) => {
    const value = e.target.value;
    if (/^\d{0,6}$/.test(value)) setBillingAddress((prev) => ({ ...prev, pincode: value }));
  };

  const handleOwnedByChange = (e) => {
    setCustomer((prev) => ({ ...prev, ownedBy: e.target.value }));
  };

  const handleIndustryTypeOtherChange = (e) => {
    const value = e.target.value;
    if (/^[a-zA-Z0-9\s&\-]*$/.test(value)) setCustomer((prev) => ({ ...prev, industryTypeOther: value }));
  };

  const handlePriorityChange = (e) => {
    setCustomer((prev) => ({ ...prev, customerPriority: e.target.value }));
  };

  const handleDesignation1Change = (e) => {
    if (/^[a-zA-Z0-9\s&\-\/]*$/.test(e.target.value)) {
      setCustomer((prev) => ({ ...prev, customerContactPersonDesignation1: e.target.value }));
    }
  };

  const handleStateChange = (e) => {
    if (/^[a-zA-Z\s]*$/.test(e.target.value)) setBillingAddress((prev) => ({ ...prev, state: e.target.value }));
  };
  const handleCityChange = (e) => {
    if (/^[a-zA-Z\s]*$/.test(e.target.value)) setBillingAddress((prev) => ({ ...prev, city: e.target.value }));
  };
  const handleCountryChange = (e) => {
    if (/^[a-zA-Z\s]*$/.test(e.target.value)) setBillingAddress((prev) => ({ ...prev, country: e.target.value }));
  };

  const handleGSTChange = (e) => {
    setCustomer((prev) => ({ ...prev, GSTNo: e.target.value.toUpperCase() }));
    setGstAutoFilled(false);
  };

  const handleBranchSelect = (customerId) => {
    const selected = allCustomers.find((c) => c._id === customerId);
    if (selected) {
      setBranchOf(customerId);
      setSelectedBranchCustomer(selected);
      setBranchSearchText("");
      // Auto-fill GST from selected branch customer
      if (selected.GSTNo) {
        setCustomer((prev) => ({ ...prev, GSTNo: selected.GSTNo }));
        setGstAutoFilled(true);
      } else {
        setCustomer((prev) => ({ ...prev, GSTNo: "" }));
        setGstAutoFilled(false);
      }
    }
  };

  const handleClearBranchSelection = () => {
    setBranchOf("");
    setSelectedBranchCustomer(null);
    setBranchSearchText("");
    setCustomer((prev) => ({ ...prev, GSTNo: "" }));
    setGstAutoFilled(false);
    fetchBranchCustomers("");
  };

  const handleAddExtraContact = () => {
    if (extraContacts.length < 4) {
      setExtraContacts([...extraContacts, { name: "", phone: "", email: "", designation: "" }]);
    }
  };

  const handleExtraContactChange = (index, field, value) => {
    const updated = [...extraContacts];
    if (field === "phone") {
      if (value.length <= 25) updated[index][field] = value;
    } else if (field === "name") {
      if (/^[a-zA-Z\s]*$/.test(value)) updated[index][field] = value;
    } else if (field === "designation") {
      if (/^[a-zA-Z0-9\s&\-\/]*$/.test(value)) updated[index][field] = value;
    } else {
      updated[index][field] = value;
    }
    setExtraContacts(updated);
  };

  const handleRemoveExtraContact = (index) => {
    setExtraContacts(extraContacts.filter((_, i) => i !== index));
  };

  const handleCustUpdate = async (e) => {
    e.preventDefault();

    const extraContactData = {};
    for (let i = 2; i <= 5; i++) {
      extraContactData[`customerContactPersonName${i}`] = "";
      extraContactData[`phoneNumber${i}`] = "";
      extraContactData[`customerContactPersonEmail${i}`] = "";
      extraContactData[`customerContactPersonDesignation${i}`] = "";
    }
    extraContacts.forEach((c, i) => {
      extraContactData[`customerContactPersonName${i + 2}`] = c.name;
      extraContactData[`phoneNumber${i + 2}`] = c.phone;
      extraContactData[`customerContactPersonEmail${i + 2}`] = c.email;
      extraContactData[`customerContactPersonDesignation${i + 2}`] = c.designation;
    });

    const updatedCustomer = {
      ...customer,
      ...extraContactData,
      custName: customer.custName?.trim(),
      email: customer.email?.trim(),
      GSTNo: customer.GSTNo?.trim(),
      customerContactPersonName1: customer.customerContactPersonName1?.trim(),
      phoneNumber1: customer.phoneNumber1?.trim(),
      billingAddress: {
        ...billingAddress,
        add: billingAddress.add?.trim(),
        city: billingAddress.city?.trim(),
        state: billingAddress.state?.trim(),
        country: billingAddress.country?.trim(),
      },
      customerType,
      branchOf: customerType === "branch" ? branchOf : null,
    };

    if (
      isEmptyOrWhitespace(updatedCustomer.custName) ||
      isEmptyOrWhitespace(updatedCustomer.email) ||
      isEmptyOrWhitespace(updatedCustomer.customerContactPersonName1) ||
      isEmptyOrWhitespace(updatedCustomer.GSTNo) ||
      isEmptyOrWhitespace(updatedCustomer.industryType) ||
      isEmptyOrWhitespace(updatedCustomer.ownedBy) ||
      isEmptyOrWhitespace(updatedCustomer.customerPriority)
    ) {
      toast.error("All required fields are mandatory");
      return;
    }

    if (customerType === "branch" && !branchOf) {
      toast.error("Please select a customer for this branch");
      return;
    }

    if (updatedCustomer.industryType === "Other" && isEmptyOrWhitespace(updatedCustomer.industryTypeOther)) {
      toast.error("Please specify the industry type when selecting 'Other'");
      return;
    }
    if (!validator.isEmail(updatedCustomer.email)) { toast.error("Enter valid Email"); return; }

    for (let i = 0; i < extraContacts.length; i++) {
      if (extraContacts[i].email && !validator.isEmail(extraContacts[i].email)) {
        toast.error(`Enter a valid email for Contact Person ${i + 2}`);
        return;
      }
    }

    try {
      toast.loading("Updating Customer.....");
      const data = await updateCustomer(updatedCustomer);
      toast.dismiss();
      if (data.success) {
        toast.success(data.message);
        handleUpdate();
      } else {
        toast.error(data.error || "Failed to update customer");
      }
    } catch (error) {
      toast.error("Error updating customer");
    }
  };

  const filteredCustomers = allCustomers.filter((cust) => cust._id !== customer?._id);

  return (
    <>
      <div className="modal fade show" style={{ display: "flex", alignItems: "center", backgroundColor: "#00000090" }}>
        <div className="modal-dialog modal-lg modal-dialog-scrollable">
          <div className="modal-content p-3">
            <form onSubmit={handleCustUpdate}>
              <div className="modal-header pt-0">
                <h5 className="card-title fw-bold">Update Customer</h5>
                <button onClick={() => handleUpdate()} type="button" className="close px-3" style={{ marginLeft: "auto" }}>
                  <span aria-hidden="true">&times;</span>
                </button>
              </div>

              <div className="modal-body">
                <div className="row modal_body_height">

                  <div className="col-12 col-lg-6">
                    <div className="">
                      <label htmlFor="FullName" className="form-label label_text">Full Name <RequiredStar /></label>
                      <div className="input-group">
                        <input
                          type="text" className="form-control rounded-0" id="FullName"
                          maxLength={300} placeholder="Update Full Name...." name="custName"
                          value={customer.custName || ""} onChange={handleCustNameChange} required
                        />
                        <button
                          type="button"
                          className="btn btn-outline-secondary rounded-0"
                          onClick={handleLocationToggle}
                          title={showLocationInput ? "Apply location" : "Add location (City)"}
                          style={{ minWidth: "42px" }}
                        >
                          {showLocationInput ? (
                            <i className="fa-solid fa-check text-success"></i>
                          ) : hasLocation ? (
                            <i className="fa-solid fa-location-dot text-primary"></i>
                          ) : (
                            <i className="fa-solid fa-location-dot"></i>
                          )}
                        </button>
                        {hasLocation && !showLocationInput && (
                          <button
                            type="button"
                            className="btn btn-outline-danger rounded-0"
                            onClick={handleRemoveLocation}
                            title="Remove location"
                            style={{ minWidth: "42px" }}
                          >
                            <i className="fa-solid fa-xmark"></i>
                          </button>
                        )}
                      </div>
                      {showLocationInput && (
                        <div className="mt-1 d-flex align-items-center gap-1">
                          <input
                            ref={locationInputRef}
                            type="text"
                            className="form-control form-control-sm rounded-0"
                            placeholder="Type city / location & press Enter..."
                            value={locationText}
                            onChange={(e) => setLocationText(e.target.value)}
                            onKeyDown={handleLocationKeyDown}
                            maxLength={100}
                            style={{ fontSize: "12px" }}
                          />
                          <button type="button" className="btn btn-sm btn-outline-secondary rounded-0"
                            onClick={() => { setShowLocationInput(false); setLocationText(""); }} title="Cancel">
                            <i className="fa-solid fa-xmark"></i>
                          </button>
                        </div>
                      )}
                      {hasLocation && (
                        <small className="text-muted" style={{ fontSize: "11px" }}>
                          <i className="fa-solid fa-circle-info me-1"></i>Name with location: <strong>{customer.custName}</strong>
                        </small>
                      )}
                    </div>
                  </div>

                  <div className="col-12 col-lg-6">
                    <div className="mb-3">
                      <label className="form-label label_text">Customer Type <RequiredStar /></label>
                      <div className="d-flex align-items-center gap-4 mt-1">
                        <div className="form-check">
                          <input className="form-check-input" type="radio" name="customerType" id="typeMain"
                            value="main" checked={customerType === "main"}
                            onChange={(e) => {
                              setCustomerType(e.target.value);
                              setBranchOf("");
                              setSelectedBranchCustomer(null);
                              setBranchSearchText("");
                              setCustomer((prev) => ({ ...prev, GSTNo: "" }));
                              setGstAutoFilled(false);
                            }} />
                          <label className="form-check-label" htmlFor="typeMain">
                            <i className="fa-solid fa-building me-1"></i> Main
                          </label>
                        </div>
                        <div className="form-check">
                          <input className="form-check-input" type="radio" name="customerType" id="typeBranch"
                            value="branch" checked={customerType === "branch"}
                            onChange={(e) => setCustomerType(e.target.value)} />
                          <label className="form-check-label" htmlFor="typeBranch">
                            <i className="fa-solid fa-code-branch me-1"></i> Branch
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>

                  {customerType === "branch" && (
                    <div className="col-12">
                      <div className="mb-3">
                        <label htmlFor="branchOf" className="form-label label_text">Branch Of (Customer) <RequiredStar /></label>

                        {selectedBranchCustomer ? (
                          <div className="border rounded p-2 mb-2" style={{ backgroundColor: "#e8f5e9", borderColor: "#4caf50" }}>
                            <div className="d-flex justify-content-between align-items-start">
                              <div className="d-flex align-items-start gap-2">
                                <div className="d-flex align-items-center justify-content-center rounded-circle mt-1" style={{ width: "28px", height: "28px", backgroundColor: "#4caf50", flexShrink: 0 }}>
                                  <i className="fa-solid fa-check text-white" style={{ fontSize: "12px" }}></i>
                                </div>
                                <div>
                                  <div className="fw-bold" style={{ fontSize: "14px", color: "#2e7d32" }}>
                                    {selectedBranchCustomer.custName}
                                  </div>
                                  {selectedBranchCustomer.email && (
                                    <div className="text-muted" style={{ fontSize: "12px" }}>
                                      <i className="fa-solid fa-envelope me-1"></i>{selectedBranchCustomer.email}
                                    </div>
                                  )}
                                  {selectedBranchCustomer.GSTNo && (
                                    <div className="text-muted" style={{ fontSize: "12px" }}>
                                      <i className="fa-solid fa-file-invoice me-1"></i>{selectedBranchCustomer.GSTNo}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-danger rounded-0"
                                onClick={handleClearBranchSelection}
                                title="Remove selection"
                                style={{ fontSize: "11px", padding: "2px 8px" }}
                              >
                                <i className="fa-solid fa-xmark me-1"></i>Change
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="input-group mb-2">
                              <span className="input-group-text rounded-0 bg-white">
                                <i className="fa-solid fa-magnifying-glass text-muted"></i>
                              </span>
                              <input
                                type="text"
                                className="form-control form-control-sm rounded-0"
                                placeholder="Search by name, email, GST number..."
                                value={branchSearchText}
                                onChange={(e) => setBranchSearchText(e.target.value)}
                                style={{ fontSize: "13px" }}
                                autoFocus
                              />
                              {branchSearchText && (
                                <button
                                  type="button"
                                  className="btn btn-outline-secondary rounded-0"
                                  onClick={() => setBranchSearchText("")}
                                  style={{ fontSize: "11px" }}
                                >
                                  <i className="fa-solid fa-xmark"></i>
                                </button>
                              )}
                            </div>

                            {!allCustomersLoading && filteredCustomers.length === 0 && !branchSearchText && (
                              <div className="text-center py-3 border rounded" style={{ backgroundColor: "#fff8e1", borderColor: "#ffca28" }}>
                                <i className="fa-solid fa-triangle-exclamation text-warning me-1"></i>
                                <small className="text-muted">No customer selected yet. Search above to find and select one.</small>
                              </div>
                            )}

                            {filteredCustomers.length > 0 && (
                              <div className="border rounded" style={{ maxHeight: "180px", overflowY: "auto" }}>
                                {filteredCustomers.map((cust) => (
                                  <div
                                    key={cust._id}
                                    className="d-flex align-items-center px-2 py-2"
                                    style={{
                                      cursor: "pointer",
                                      borderBottom: "1px solid #f0f0f0",
                                      transition: "background-color 0.15s",
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#e3f2fd"}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                                    onClick={() => handleBranchSelect(cust._id)}
                                  >
                                    <i className="fa-regular fa-building text-muted me-2" style={{ fontSize: "14px" }}></i>
                                    <div className="flex-grow-1">
                                      <div className="fw-semibold" style={{ fontSize: "13px" }}>{cust.custName}</div>
                                      <div className="text-muted" style={{ fontSize: "11px" }}>
                                        {cust.email && <span className="me-3"><i className="fa-solid fa-envelope me-1"></i>{cust.email}</span>}
                                        {cust.GSTNo && <span><i className="fa-solid fa-file-invoice me-1"></i>{cust.GSTNo}</span>}
                                      </div>
                                    </div>
                                    <i className="fa-solid fa-chevron-right text-muted" style={{ fontSize: "11px" }}></i>
                                  </div>
                                ))}
                              </div>
                            )}

                            {!allCustomersLoading && branchSearchText && filteredCustomers.length === 0 && (
                              <div className="text-center py-3 border rounded" style={{ backgroundColor: "#ffebee", borderColor: "#ef9a9a" }}>
                                <i className="fa-solid fa-circle-xmark text-danger me-1"></i>
                                <small className="text-muted">No customers found for "<strong>{branchSearchText}</strong>"</small>
                              </div>
                            )}

                            {allCustomersLoading && (
                              <div className="text-center py-3 border rounded">
                                <span className="text-muted" style={{ fontSize: "13px" }}>
                                  <i className="fa fa-spinner fa-spin me-2"></i>Searching customers...
                                </span>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {customerType === "main" && customer?.customerType === "branch" && customer?.branchOf && (
                    <div className="col-12">
                      <div className="alert alert-warning py-2">
                        <small>
                          <i className="fa fa-exclamation-triangle me-2"></i>
                          Changing from Branch to Main will remove the branch association. Currently branch of: <strong>{customer.branchOf?.custName || "Unknown"}</strong>
                        </small>
                      </div>
                    </div>
                  )}

                  <div className="col-12 col-lg-6">
                    <div className="mb-3">
                      <label htmlFor="Email" className="form-label label_text">Email <RequiredStar /></label>
                      <input type="email" name="email" maxLength={50} placeholder="Update Email...."
                        className="form-control rounded-0" id="Email"
                        value={customer.email || ""} onChange={handleChange} required />
                    </div>
                  </div>

                  <div className="col-12 col-lg-6">
                    <div className="mb-3">
                      <label htmlFor="ownedBy" className="form-label label_text">Owned By <RequiredStar /></label>
                      <select className="form-select rounded-0" id="ownedBy" name="ownedBy"
                        value={customer.ownedBy?.name || customer.ownedBy || ""}
                        onChange={handleOwnedByChange} required disabled={employeesLoading}>
                        <option value="">{employeesLoading ? "⏳ Loading..." : "-- Select Employee --"}</option>
                        {employees.length > 0 ? (
                          employees.map((emp) => (<option key={emp._id} value={emp.name}>{emp.name}</option>))
                        ) : (
                          <option value={customer.ownedBy?.name || customer.ownedBy || ""}>
                            {customer.ownedBy?.name || customer.ownedBy || "No employees found"}
                          </option>
                        )}
                      </select>
                      {employeesLoading && <small className="text-info"><i className="fa fa-spinner fa-spin me-1"></i>Loading...</small>}
                      {!employeesLoading && employees.length > 0 && <small className="text-success"><i className="fa fa-check-circle me-1"></i>{employees.length} employees</small>}
                      {!employeesLoading && employeeError && <small className="text-warning"><i className="fa fa-exclamation-triangle me-1"></i>{employeeError}</small>}
                    </div>
                  </div>

                  <div className="col-12 col-lg-6">
                    <div className="mb-3">
                      <label htmlFor="industryType" className="form-label label_text">Industry Type <RequiredStar /></label>
                      <select className="form-select rounded-0" id="industryType" name="industryType"
                        value={customer.industryType || ""}
                        onChange={(e) => setCustomer((prev) => ({
                          ...prev, industryType: e.target.value,
                          industryTypeOther: e.target.value !== "Other" ? "" : prev.industryTypeOther,
                        }))} required>
                        <option value="">Select Industry Type</option>
                        {industryOptions.map((option) => (<option key={option} value={option}>{option}</option>))}
                      </select>
                    </div>
                  </div>

                  {customer.industryType === "Other" && (
                    <div className="col-12 col-lg-6">
                      <div className="mb-3">
                        <label htmlFor="industryTypeOther" className="form-label label_text">Specify Industry Type <RequiredStar /></label>
                        <input type="text" className="form-control rounded-0" id="industryTypeOther" name="industryTypeOther"
                          maxLength={100} value={customer.industryTypeOther || ""}
                          onChange={handleIndustryTypeOtherChange} placeholder="Enter industry type..." required />
                      </div>
                    </div>
                  )}

                  <div className="col-12 col-lg-6">
                    <div className="mb-3">
                      <label htmlFor="customerPriority" className="form-label label_text">Customer Priority <RequiredStar /></label>
                      <select className="form-select rounded-0" id="customerPriority" name="customerPriority"
                        value={customer.customerPriority || ""} onChange={handlePriorityChange} required>
                        <option value="" disabled>Select Priority</option>
                        <option value="P1">🔴 P1 — High Priority</option>
                        <option value="P2">🟡 P2 — Medium Priority</option>
                        <option value="P3">🟢 P3 — Low Priority</option>
                      </select>
                    </div>
                  </div>

                  <div className="col-12 mt-2">
                    <div className="row border bg-gray mx-auto">
                      <div className="col-12 mb-2 d-flex justify-content-between align-items-center">
                        <span className="SecondaryInfo">Secondary Info</span>
                        {extraContacts.length < 4 && (
                          <button type="button" className="btn btn-sm btn-outline-primary" onClick={handleAddExtraContact}>
                            <i className="fa-solid fa-plus me-1"></i> Add Contact
                          </button>
                        )}
                      </div>

                      <div className="col-12 col-lg-6 mt-2">
                        <div className="mb-3">
                          <label htmlFor="ContactPerson1" className="form-label label_text">Contact Person 1 <RequiredStar /></label>
                          <input type="text" className="form-control rounded-0" id="ContactPerson1"
                            maxLength={100} name="customerContactPersonName1" onChange={handleChange}
                            value={customer.customerContactPersonName1 || ""} required />
                        </div>
                      </div>
                      <div className="col-12 col-lg-6 mt-2">
                        <div className="mb-3">
                          <label htmlFor="phoneNumber1" className="form-label label_text">Contact Number 1</label>
                          <input type="text" maxLength={25} className="form-control rounded-0"
                            id="phoneNumber1" name="phoneNumber1" onChange={handleChange}
                            value={customer.phoneNumber1 || ""} />
                        </div>
                      </div>
                      <div className="col-12 col-lg-6 mt-2">
                        <div className="mb-3">
                          <label htmlFor="contactEmail1" className="form-label label_text">Contact Email 1</label>
                          <input type="email" maxLength={100} className="form-control rounded-0"
                            id="contactEmail1" name="customerContactPersonEmail1"
                            placeholder="Contact person email..." onChange={handleChange}
                            value={customer.customerContactPersonEmail1 || ""} />
                        </div>
                      </div>
                      <div className="col-12 col-lg-6 mt-2">
                        <div className="mb-3">
                          <label htmlFor="designation1" className="form-label label_text">Designation 1</label>
                          <input type="text" maxLength={100} className="form-control rounded-0"
                            id="designation1" name="customerContactPersonDesignation1"
                            placeholder="e.g. Manager, Director..." onChange={handleDesignation1Change}
                            value={customer.customerContactPersonDesignation1 || ""} />
                        </div>
                      </div>

                      {extraContacts.map((contact, index) => (
                        <div key={index} className="col-12 border-top pt-2 mt-1">
                          <div className="d-flex justify-content-between align-items-center mb-2">
                            <small className="fw-bold text-muted">Contact Person {index + 2}</small>
                            <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => handleRemoveExtraContact(index)}>
                              <i className="fa-solid fa-xmark me-1"></i> Remove
                            </button>
                          </div>
                          <div className="row">
                            <div className="col-12 col-lg-6 mt-1">
                              <div className="mb-3">
                                <label className="form-label label_text">Name {index + 2}</label>
                                <input type="text" maxLength={100} className="form-control rounded-0"
                                  placeholder={`Contact Person ${index + 2} name`} value={contact.name}
                                  onChange={(e) => handleExtraContactChange(index, "name", e.target.value)} />
                              </div>
                            </div>
                            <div className="col-12 col-lg-6 mt-1">
                              <div className="mb-3">
                                <label className="form-label label_text">Phone No. {index + 2}</label>
                                <input type="text" maxLength={25} className="form-control rounded-0"
                                  placeholder="Enter phone number" value={contact.phone}
                                  onChange={(e) => handleExtraContactChange(index, "phone", e.target.value)} />
                              </div>
                            </div>
                            <div className="col-12 col-lg-6 mt-1">
                              <div className="mb-3">
                                <label className="form-label label_text">Email {index + 2}</label>
                                <input type="email" maxLength={100} className="form-control rounded-0"
                                  placeholder="Contact email..." value={contact.email}
                                  onChange={(e) => handleExtraContactChange(index, "email", e.target.value)} />
                              </div>
                            </div>
                            <div className="col-12 col-lg-6 mt-1">
                              <div className="mb-3">
                                <label className="form-label label_text">Designation {index + 2}</label>
                                <input type="text" maxLength={100} className="form-control rounded-0"
                                  placeholder="e.g. Manager, Director..." value={contact.designation}
                                  onChange={(e) => handleExtraContactChange(index, "designation", e.target.value)} />
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="col-12 mt-2">
                    <div className="row border mt-4 bg-gray mx-auto">
                      <div className="col-12 mb-3">
                        <span className="AddressInfo">Address <small className="text-muted">(Optional)</small></span>
                      </div>
                      <div className="col-12 col-lg-6 mt-2">
                        <div className="mb-3">
                          <input type="text" className="form-control rounded-0" placeholder="Enter 6-digit Pincode"
                            id="Pincode" name="pincode" onChange={handlePincodeChange}
                            value={billingAddress.pincode || ""} maxLength={6} />
                          {isLoadingAddress && <small className="text-info"><i className="fa fa-spinner fa-spin me-1"></i>Loading...</small>}
                        </div>
                      </div>
                      <div className="col-12 col-lg-6 mt-2">
                        <div className="mb-3">
                          <input type="text" className="form-control rounded-0" placeholder="State (Auto-filled / Editable)"
                            id="State" onChange={handleStateChange} name="state" maxLength={50}
                            value={billingAddress.state || ""}
                            style={{ backgroundColor: billingAddress.state && !isLoadingAddress ? "#f8f9fa" : "white" }} />
                        </div>
                      </div>
                      <div className="col-12 col-lg-6 mt-2">
                        <div className="mb-3">
                          <input type="text" className="form-control rounded-0" placeholder="City (Auto-filled / Editable)"
                            id="city" onChange={handleCityChange} name="city" maxLength={50}
                            value={billingAddress.city || ""}
                            style={{ backgroundColor: billingAddress.city && !isLoadingAddress ? "#f8f9fa" : "white" }} />
                        </div>
                      </div>
                      <div className="col-12 col-lg-6 mt-2">
                        <div className="mb-3">
                          <input type="text" className="form-control rounded-0" placeholder="Country (Auto-filled / Editable)"
                            id="country" name="country" maxLength={50} onChange={handleCountryChange}
                            value={billingAddress.country || ""
                            } style={{ backgroundColor: billingAddress.country && !isLoadingAddress ? "#f8f9fa" : "white" }} />
                        </div>
                      </div>
                      <div className="col-12 col-lg-12 mt-2">
                        <div className="mb-3">
                          <textarea className="textarea_edit col-12" id="add" name="add" maxLength={500}
                            placeholder="House NO., Building Name, Road Name, Area, Colony"
                            onChange={handleBillingChange} value={billingAddress.add || ""} rows="2"></textarea>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* GST Number — auto-filled from branch, editable */}
                  <div className="col-12 col-lg-6 mt-2">
                    <div className="">
                      <label htmlFor="GSTNo" className="form-label label_text">
                        GST Number <RequiredStar /> <small className="text-muted">[If not available, put NA]</small>
                      </label>
                      <input
                        type="text"
                        className="form-control rounded-0 text-uppercase"
                        id="GSTNo"
                        placeholder="Enter GST Number"
                        maxLength={15}
                        name="GSTNo"
                        onChange={handleGSTChange}
                        value={customer.GSTNo || ""}
                        required
                        minLength={2}
                        style={{
                          backgroundColor: gstAutoFilled ? "#e8f5e9" : (customer.GSTNo ? "#f8f9fa" : "white"),
                          borderColor: gstAutoFilled ? "#4caf50" : "",
                        }}
                      />
                      {gstAutoFilled && selectedBranchCustomer && (
                        <small className="text-success" style={{ fontSize: "11px" }}>
                          <i className="fa-solid fa-bolt me-1"></i>Auto-filled from <strong>{selectedBranchCustomer.custName}</strong> — edit to change
                        </small>
                      )}
                      {!gstAutoFilled && customer.GSTNo && (
                        <small className="text-muted" style={{ fontSize: "11px" }}>
                          <i className="fa-solid fa-circle-info me-1"></i>Current: <strong>{customer.GSTNo}</strong> — edit to update
                        </small>
                      )}
                    </div>
                  </div>

                  <div className="col-12 col-lg-6 mt-2">
                    <div className="mb-3">
                      <label htmlFor="zone" className="form-label label_text">Zone <RequiredStar /></label>
                      <input type="text" className="form-control rounded-0" id="zone" name="zone"
                        value={customer.zone || ""} onChange={handleChange} required readOnly />
                    </div>
                  </div>

                  <div className="row">
                    <div className="col-12 pt-3 mt-2">
                      <button type="submit" className="w-80 btn addbtn rounded-0 add_button m-2 px-4">Update</button>
                      <button type="button" onClick={handleUpdate} className="w-80 btn addbtn rounded-0 Cancel_button m-2 px-4">Cancel</button>
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

export default UpdateCustomerPopUp;