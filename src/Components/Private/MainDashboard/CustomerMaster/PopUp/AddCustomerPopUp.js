import { useState, useEffect } from "react";
import validator from "validator";
import toast from "react-hot-toast";
import { RequiredStar } from "../../../RequiredStar/RequiredStar";
import { getAddress } from "../../../../../hooks/usePincode";
import { createCustomer, getEmployees } from "../../../../../hooks/useCustomer";
import { useUser } from "../../../../../context/UserContext";

const AddCustomerPopUp = ({ handleAdd }) => {
  const { user } = useUser();
  const [custName, setCustName] = useState("");
  const [phoneNumber1, setPhoneNumber1] = useState("");
  const [email, setEmail] = useState("");
  const [GSTNo, setGSTNo] = useState("");
  const [customerContactPersonName1, setCustomerContactPersonName1] = useState("");
  const [customerContactPersonEmail1, setCustomerContactPersonEmail1] = useState("");
  const [customerContactPersonDesignation1, setCustomerContactPersonDesignation1] = useState("");
  const [zone, setZone] = useState("");
  const [isLoadingAddress, setIsLoadingAddress] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [employeesLoading, setEmployeesLoading] = useState(false);
  const [employeeError, setEmployeeError] = useState(null);
  const [ownedBy, setOwnedBy] = useState(user?.name || "");

  // Extra contact persons (up to 4 more = 5 total)
  // Each: { name: "", phone: "", email: "", designation: "" }
  const [extraContacts, setExtraContacts] = useState([]);

  const [industryType, setIndustryType] = useState("");
  const [industryTypeOther, setIndustryTypeOther] = useState("");
  const [customerPriority, setCustomerPriority] = useState("");

  const [billingAddress, setBillingAddress] = useState({
    pincode: "", state: "", city: "", add: "", country: "",
  });

  const industryOptions = [
    "IT & Software", "Manufacturing", "Construction & Infrastructure",
    "Healthcare", "Education", "Retail", "Banking & Finance",
    "Logistics & Supply Chain", "Hospitality", "Real Estate",
    "Government & Public Sector", "Energy & Utilities", "Telecom",
    "Pharmaceuticals", "Automotive", "Dealer", "Other"
  ];

  useEffect(() => {
    const fetchEmployees = async () => {
      setEmployeesLoading(true);
      setEmployeeError(null);
      try {
        const data = await getEmployees();
        if (data.success && data.employees && data.employees.length > 0) {
          setEmployees(data.employees);
          if (!ownedBy || ownedBy === "") {
            setOwnedBy(data.employees[0].name);
          }
        } else if (data.success && data.employees && data.employees.length === 0) {
          setEmployees([]);
          setEmployeeError("No employees found. Please add employees first.");
        } else {
          setEmployees([]);
          setEmployeeError("Failed to load employees.");
        }
      } catch (error) {
        console.error("Error fetching employees:", error);
        setEmployees([]);
        setEmployeeError("Error loading employees. Using current user.");
      } finally {
        setEmployeesLoading(false);
      }
    };
    fetchEmployees();
  }, []);

  // Pincode auto-fill
  useEffect(() => {
    const fetchData = async () => {
      if (billingAddress.pincode && billingAddress.pincode.length === 6) {
        setIsLoadingAddress(true);
        try {
          const data = await getAddress(billingAddress.pincode);
          if (data) {
            setBillingAddress((prev) => ({ ...prev, state: data.state, city: data.city, country: data.country }));
          } else {
            setBillingAddress((prev) => ({ ...prev, state: "", city: "", country: "" }));
          }
        } catch (error) {
          setBillingAddress((prev) => ({ ...prev, state: "", city: "", country: "" }));
        } finally {
          setIsLoadingAddress(false);
        }
      } else if (billingAddress.pincode.length < 6) {
        setBillingAddress((prev) => ({ ...prev, state: "", city: "", country: "" }));
      }
    };
    const timeoutId = setTimeout(fetchData, 500);
    return () => clearTimeout(timeoutId);
  }, [billingAddress.pincode]);

  const handleAddExtraContact = () => {
    if (extraContacts.length < 4) {
      setExtraContacts([...extraContacts, { name: "", phone: "", email: "", designation: "" }]);
    }
  };

  const handleExtraContactChange = (index, field, value) => {
    const updated = [...extraContacts];
    if (field === "phone") {
      const cleaned = value.replace(/[^0-9]/g, "");
      if (cleaned.length <= 10) updated[index][field] = cleaned;
    } else if (field === "name") {
      if (/^[a-zA-Z\s]*$/.test(value)) updated[index][field] = value;
    } else if (field === "designation") {
      if (/^[a-zA-Z0-9\s&\-\/]*$/.test(value)) updated[index][field] = value;
    } else {
      // email — free text, validated on submit
      updated[index][field] = value;
    }
    setExtraContacts(updated);
  };

  const handleRemoveExtraContact = (index) => {
    setExtraContacts(extraContacts.filter((_, i) => i !== index));
  };

  const handleCustomerAdd = async (event) => {
    event.preventDefault();

    // Build extra contact fields
    const extraContactData = {};
    extraContacts.forEach((c, i) => {
      extraContactData[`customerContactPersonName${i + 2}`] = c.name;
      extraContactData[`phoneNumber${i + 2}`] = c.phone;
      extraContactData[`customerContactPersonEmail${i + 2}`] = c.email;
      extraContactData[`customerContactPersonDesignation${i + 2}`] = c.designation;
    });

    const customerData = {
      custName,
      phoneNumber1,
      email,
      customerContactPersonName1,
      customerContactPersonEmail1,
      customerContactPersonDesignation1,
      billingAddress,
      zone,
      GSTNo,
      ownedBy,
      industryType,
      industryTypeOther: industryType === "Other" ? industryTypeOther : undefined,
      customerPriority,
      ...extraContactData,
    };

    if (
      !custName || !phoneNumber1 || !email ||
      !billingAddress.pincode || !billingAddress.state || !billingAddress.city ||
      !billingAddress.add || !zone || !GSTNo || !industryType || !ownedBy || !customerPriority
    ) {
      return toast.error("Please fill all required fields");
    }

    if (industryType === "Other" && (!industryTypeOther || industryTypeOther.trim() === "")) {
      return toast.error("Please specify the industry type");
    }
    if (!validator.isEmail(email)) return toast.error("Enter valid Email");
    if (billingAddress.pincode.length !== 6 || !/^\d{6}$/.test(billingAddress.pincode)) {
      return toast.error("Enter valid 6-digit Pincode");
    }
    if (!validator.isMobilePhone(phoneNumber1, "any", { strictMode: false })) {
      return toast.error("Please enter valid 10-digit phone number for Contact Person 1.");
    }
    // Validate extra contact phones and emails
    for (let i = 0; i < extraContacts.length; i++) {
      if (extraContacts[i].phone && !validator.isMobilePhone(extraContacts[i].phone, "any", { strictMode: false })) {
        return toast.error(`Please enter valid phone number for Contact Person ${i + 2}.`);
      }
      if (extraContacts[i].email && !validator.isEmail(extraContacts[i].email)) {
        return toast.error(`Please enter valid email for Contact Person ${i + 2}.`);
      }
    }

    toast.loading("Creating Customer...");
    const data = await createCustomer(customerData);
    toast.dismiss();

    if (data.success) {
      toast.success(data.message);
      handleAdd();
    } else {
      toast.error(data.error || "Failed to create customer");
    }
  };

  const handleCustNameChange = (e) => {
    if (/^[a-zA-Z0-9\s]*$/.test(e.target.value)) setCustName(e.target.value);
  };
  const handleContactPersonName1Change = (e) => {
    if (/^[a-zA-Z\s]*$/.test(e.target.value)) setCustomerContactPersonName1(e.target.value);
  };
  const handleDesignation1Change = (e) => {
    if (/^[a-zA-Z0-9\s&\-\/]*$/.test(e.target.value)) setCustomerContactPersonDesignation1(e.target.value);
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
  const handlePincodeChange = (e) => {
    if (/^\d{0,6}$/.test(e.target.value)) setBillingAddress((prev) => ({ ...prev, pincode: e.target.value }));
  };
  const handleGSTChange = (e) => { setGSTNo(e.target.value.toUpperCase()); };
  const handleIndustryTypeOtherChange = (e) => {
    if (/^[a-zA-Z0-9\s&\-]*$/.test(e.target.value)) setIndustryTypeOther(e.target.value);
  };

  return (
    <>
      <div className="modal fade show" style={{ display: "flex", alignItems: "center", backgroundColor: "#00000090" }}>
        <div className="modal-dialog modal-lg modal-dialog-scrollable">
          <div className="modal-content p-3">
            <form onSubmit={handleCustomerAdd}>
              <div className="modal-header pt-0">
                <h5 className="card-title fw-bold">Create New Customer</h5>
                <button onClick={() => handleAdd()} type="button" className="close px-3" style={{ marginLeft: "auto" }}>
                  <span aria-hidden="true">&times;</span>
                </button>
              </div>

              <div className="modal-body">
                <div className="row modal_body_height">

                  {/* Info banner */}
                  <div className="col-12 mb-2">
                    <div className="alert alert-info py-2">
                      <small>
                        <i className="fa fa-info-circle me-2"></i>
                        Creating customer as: <strong>{user?.name}</strong>
                      </small>
                    </div>
                  </div>

                  {/* Full Name */}
                  <div className="col-12 col-lg-6">
                    <div className="">
                      <label htmlFor="FullName" className="form-label label_text">Full Name <RequiredStar /></label>
                      <input
                        type="text" className="form-control rounded-0" id="FullName"
                        maxLength={300} value={custName} onChange={handleCustNameChange}
                        placeholder="Enter a Full Name...." required
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div className="col-12 col-lg-6">
                    <div className="mb-3">
                      <label htmlFor="email" className="form-label label_text">Email <RequiredStar /></label>
                      <input
                        type="email" maxLength={50} className="form-control rounded-0" id="email"
                        value={email} onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter a Email...." required
                      />
                    </div>
                  </div>

                  {/* Owned By */}
                  <div className="col-12 col-lg-6">
                    <div className="mb-3">
                      <label htmlFor="ownedBy" className="form-label label_text">Owned By <RequiredStar /></label>
                      <select
                        className="form-select rounded-0" id="ownedBy"
                        value={ownedBy} onChange={(e) => setOwnedBy(e.target.value)}
                        required disabled={employeesLoading}
                      >
                        <option value="">{employeesLoading ? "⏳ Loading employees..." : "-- Select Employee --"}</option>
                        <option value={user?.name}>{user?.name} (Current User)</option>
                        {employees.length > 0 && employees.map((emp) => (
                          emp.name !== user?.name && (
                            <option key={emp._id} value={emp.name}>{emp.name}</option>
                          )
                        ))}
                      </select>
                      {employeesLoading && <small className="text-info"><i className="fa fa-spinner fa-spin me-1"></i>Loading employees...</small>}
                      {!employeesLoading && employees.length > 0 && <small className="text-success"><i className="fa fa-check-circle me-1"></i>{employees.length} employees available</small>}
                      {!employeesLoading && employeeError && <small className="text-warning"><i className="fa fa-exclamation-triangle me-1"></i>{employeeError}</small>}
                    </div>
                  </div>

                  {/* Industry Type */}
                  <div className="col-12 col-lg-6">
                    <div className="mb-3">
                      <label htmlFor="industryType" className="form-label label_text">Industry Type <RequiredStar /></label>
                      <select
                        className="form-select rounded-0" id="industryType" value={industryType}
                        onChange={(e) => { setIndustryType(e.target.value); if (e.target.value !== "Other") setIndustryTypeOther(""); }}
                        required
                      >
                        <option value="">Select Industry Type</option>
                        {industryOptions.map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Specify Industry (Other) */}
                  {industryType === "Other" && (
                    <div className="col-12 col-lg-6">
                      <div className="mb-3">
                        <label htmlFor="industryTypeOther" className="form-label label_text">Specify Industry Type <RequiredStar /></label>
                        <input
                          type="text" className="form-control rounded-0" id="industryTypeOther"
                          maxLength={100} value={industryTypeOther}
                          onChange={handleIndustryTypeOtherChange}
                          placeholder="Enter industry type..." required
                        />
                      </div>
                    </div>
                  )}

                  {/* Customer Priority */}
                  <div className="col-12 col-lg-6">
                    <div className="mb-3">
                      <label htmlFor="customerPriority" className="form-label label_text">Customer Priority <RequiredStar /></label>
                      <select
                        className="form-select rounded-0" id="customerPriority"
                        value={customerPriority} onChange={(e) => setCustomerPriority(e.target.value)} required
                      >
                        <option value="" disabled>Select Priority</option>
                        <option value="P1">🔴 P1 — High Priority</option>
                        <option value="P2">🟡 P2 — Medium Priority</option>
                        <option value="P3">🟢 P3 — Low Priority</option>
                      </select>
                      <small className="text-muted">P1 = High &nbsp;|&nbsp; P2 = Medium &nbsp;|&nbsp; P3 = Low</small>
                    </div>
                  </div>

                  {/* ── Contact Information ── */}
                  <div className="col-12 mt-2">
                    <div className="row border bg-gray mx-auto">
                      <div className="col-12 mb-2 d-flex justify-content-between align-items-center">
                        <span className="SecondaryInfo">Contact Information</span>
                        {extraContacts.length < 4 && (
                          <button type="button" className="btn btn-sm btn-outline-primary" onClick={handleAddExtraContact}>
                            <i className="fa-solid fa-plus me-1"></i> Add Contact
                          </button>
                        )}
                      </div>

                      {/* ── Contact Person 1 — always visible ── */}
                      <div className="col-12 col-lg-6 mt-2">
                        <div className="mb-3">
                          <label className="form-label label_text">Contact Person Name 1 <RequiredStar /></label>
                          <input
                            type="text" maxLength={50} className="form-control rounded-0"
                            value={customerContactPersonName1}
                            onChange={handleContactPersonName1Change} required
                          />
                        </div>
                      </div>
                      <div className="col-12 col-lg-6 mt-2">
                        <div className="mb-3">
                          <label className="form-label label_text">Contact Person No 1 <RequiredStar /></label>
                          <input
                            type="tel" pattern="[0-9]{10}" className="form-control rounded-0"
                            value={phoneNumber1}
                            onChange={(e) => {
                              const v = e.target.value.replace(/[^0-9]/g, "");
                              if (v.length <= 10) setPhoneNumber1(v);
                            }}
                            maxLength={10} required
                          />
                        </div>
                      </div>
                      <div className="col-12 col-lg-6 mt-2">
                        <div className="mb-3">
                          <label className="form-label label_text">Contact Person Email 1</label>
                          <input
                            type="email" maxLength={100} className="form-control rounded-0"
                            placeholder="Enter contact email..."
                            value={customerContactPersonEmail1}
                            onChange={(e) => setCustomerContactPersonEmail1(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="col-12 col-lg-6 mt-2">
                        <div className="mb-3">
                          <label className="form-label label_text">Designation 1</label>
                          <input
                            type="text" maxLength={100} className="form-control rounded-0"
                            placeholder="e.g. Manager, Director..."
                            value={customerContactPersonDesignation1}
                            onChange={handleDesignation1Change}
                          />
                        </div>
                      </div>

                      {/* ── Extra contact persons ── */}
                      {extraContacts.map((contact, index) => (
                        <div key={index} className="col-12 border-top pt-2 mt-1">
                          <div className="d-flex justify-content-between align-items-center mb-2">
                            <small className="fw-bold text-muted">Contact Person {index + 2}</small>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => handleRemoveExtraContact(index)}
                            >
                              <i className="fa-solid fa-xmark me-1"></i> Remove
                            </button>
                          </div>
                          <div className="row">
                            <div className="col-12 col-lg-6 mt-1">
                              <div className="mb-3">
                                <label className="form-label label_text">Name {index + 2}</label>
                                <input
                                  type="text" maxLength={50} className="form-control rounded-0"
                                  placeholder={`Contact Person ${index + 2} name`}
                                  value={contact.name}
                                  onChange={(e) => handleExtraContactChange(index, "name", e.target.value)}
                                />
                              </div>
                            </div>
                            <div className="col-12 col-lg-6 mt-1">
                              <div className="mb-3">
                                <label className="form-label label_text">Phone No. {index + 2}</label>
                                <input
                                  type="tel" pattern="[0-9]{10}" maxLength={10} className="form-control rounded-0"
                                  placeholder="10-digit phone"
                                  value={contact.phone}
                                  onChange={(e) => handleExtraContactChange(index, "phone", e.target.value)}
                                />
                              </div>
                            </div>
                            <div className="col-12 col-lg-6 mt-1">
                              <div className="mb-3">
                                <label className="form-label label_text">Email {index + 2}</label>
                                <input
                                  type="email" maxLength={100} className="form-control rounded-0"
                                  placeholder="Contact email..."
                                  value={contact.email}
                                  onChange={(e) => handleExtraContactChange(index, "email", e.target.value)}
                                />
                              </div>
                            </div>
                            <div className="col-12 col-lg-6 mt-1">
                              <div className="mb-3">
                                <label className="form-label label_text">Designation {index + 2}</label>
                                <input
                                  type="text" maxLength={100} className="form-control rounded-0"
                                  placeholder="e.g. Manager, Director..."
                                  value={contact.designation}
                                  onChange={(e) => handleExtraContactChange(index, "designation", e.target.value)}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* ── Address ── */}
                  <div className="col-12 mt-2">
                    <div className="row border mt-4 bg-gray mx-auto">
                      <div className="col-12 mb-3">
                        <span className="AddressInfo">Address <RequiredStar /></span>
                      </div>
                      <div className="col-12 col-lg-6 mt-2">
                        <div className="mb-3">
                          <input
                            type="text" className="form-control rounded-0"
                            placeholder="Enter 6-digit Pincode"
                            maxLength={6} onChange={handlePincodeChange}
                            value={billingAddress.pincode}
                          />
                          {isLoadingAddress && <small className="text-info">Loading address details...</small>}
                          {billingAddress.pincode.length === 6 && !isLoadingAddress && !billingAddress.state && (
                            <small className="text-danger">Invalid pincode or no data found</small>
                          )}
                        </div>
                      </div>
                      <div className="col-12 col-lg-6 mt-2">
                        <div className="mb-3">
                          <input
                            type="text" className="form-control rounded-0" placeholder="State (Auto-filled)"
                            maxLength={50} onChange={handleStateChange} value={billingAddress.state}
                            style={{ backgroundColor: billingAddress.state && !isLoadingAddress ? "#f8f9fa" : "white" }}
                          />
                        </div>
                      </div>
                      <div className="col-12 col-lg-6 mt-2">
                        <div className="mb-3">
                          <input
                            type="text" className="form-control rounded-0" placeholder="City (Auto-filled)"
                            maxLength={50} value={billingAddress.city} onChange={handleCityChange}
                            style={{ backgroundColor: billingAddress.city && !isLoadingAddress ? "#f8f9fa" : "white" }}
                          />
                        </div>
                      </div>
                      <div className="col-12 col-lg-6 mt-2">
                        <div className="mb-3">
                          <input
                            type="text" className="form-control rounded-0" placeholder="Country (Auto-filled)"
                            maxLength={50} onChange={handleCountryChange} value={billingAddress.country}
                            style={{ backgroundColor: billingAddress.country && !isLoadingAddress ? "#f8f9fa" : "white" }}
                          />
                        </div>
                      </div>
                      <div className="col-12 col-lg-12 mt-2">
                        <div className="mb-3">
                          <textarea
                            className="textarea_edit col-12" maxLength={500}
                            placeholder="House NO., Building Name, Road Name, Area, Colony"
                            onChange={(e) => setBillingAddress((prev) => ({ ...prev, add: e.target.value }))}
                            value={billingAddress.add} rows="2"
                          ></textarea>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* GST + Zone */}
                  <div className="col-12 col-lg-6 mt-2">
                    <div className="">
                      <label htmlFor="GSTNumber" className="form-label label_text">
                        GST Number <RequiredStar /> [If not available, put NA]
                      </label>
                      <input
                        type="text" className="form-control rounded-0 text-uppercase" id="GSTNumber"
                        maxLength={15} onChange={handleGSTChange} value={GSTNo}
                        required placeholder="Enter GST Number" minLength={2}
                      />
                    </div>
                  </div>
                  <div className="col-12 col-lg-6 mt-2">
                    <div className="mb-3">
                      <label htmlFor="zone" className="form-label label_text">Zone <RequiredStar /></label>
                      <select
                        className="form-select rounded-0" id="zone" value={zone}
                        onChange={(e) => setZone(e.target.value)} required
                      >
                        <option value="">Select Zone</option>
                        <option value="South">South</option>
                        <option value="North">North</option>
                        <option value="East">East</option>
                        <option value="West">West</option>
                        <option value="Central">Central</option>
                      </select>
                    </div>
                  </div>

                  {/* Buttons */}
                  <div className="row">
                    <div className="col-12 pt-3 mt-2">
                      <button type="submit" className="w-80 btn addbtn rounded-0 add_button m-2 px-4">Add</button>
                      <button type="button" onClick={handleAdd} className="w-80 btn addbtn rounded-0 Cancel_button m-2 px-4">Cancel</button>
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

export default AddCustomerPopUp;