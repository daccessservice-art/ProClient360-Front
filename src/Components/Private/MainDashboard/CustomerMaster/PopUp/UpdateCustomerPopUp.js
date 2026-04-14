import { useState, useEffect } from "react";
import validator from "validator";
import { updateCustomer, getEmployees } from "../../../../../hooks/useCustomer";
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

  // Extra contacts beyond contact 1 (up to 4 more)
  // Each: { name: "", phone: "" }
  const [extraContacts, setExtraContacts] = useState([]);

  const [billingAddress, setBillingAddress] = useState({
    add: "", city: "", state: "", country: "", pincode: "",
  });

  const industryOptions = [
    "IT & Software", "Manufacturing", "Construction & Infrastructure",
    "Healthcare", "Education", "Retail", "Banking & Finance",
    "Logistics & Supply Chain", "Hospitality", "Real Estate",
    "Government & Public Sector", "Energy & Utilities", "Telecom",
    "Pharmaceuticals", "Automotive", "Other"
  ];

  const isEmptyOrWhitespace = (value) =>
    value === undefined || value === null || value.toString().trim() === '';
  const isValidPincode = (pincode) =>
    pincode && pincode.toString().trim() !== '' && !isNaN(pincode) && parseInt(pincode) > 0;

  // Fetch employees
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
          setEmployeeError('No employees found.');
        } else {
          setEmployees([]);
          setEmployeeError('Failed to load employees.');
        }
      } catch (error) {
        setEmployees([]);
        setEmployeeError('Error loading employees.');
      } finally {
        setEmployeesLoading(false);
      }
    };
    fetchEmployees();
  }, []);

  // Pincode auto-fill
  useEffect(() => {
    const fetchData = async () => {
      if (billingAddress.pincode && billingAddress.pincode.toString().length === 6) {
        setIsLoadingAddress(true);
        try {
          const data = await getAddress(billingAddress.pincode);
          if (data) {
            setBillingAddress(prev => ({ ...prev, state: data.state, city: data.city, country: data.country }));
          } else {
            setBillingAddress(prev => ({ ...prev, state: "", city: "", country: "" }));
          }
        } catch (error) {
          setBillingAddress(prev => ({ ...prev, state: "", city: "", country: "" }));
        } finally {
          setIsLoadingAddress(false);
        }
      } else if (billingAddress.pincode.toString().length < 6) {
        setBillingAddress(prev => ({ ...prev, state: "", city: "", country: "" }));
      }
    };
    const timeoutId = setTimeout(fetchData, 500);
    return () => clearTimeout(timeoutId);
  }, [billingAddress.pincode]);

  // Load existing billing address and extra contacts
  useEffect(() => {
    if (customer) {
      setBillingAddress(customer.billingAddress || { add: "", city: "", state: "", country: "", pincode: "" });

      // Build extra contacts from existing data (contacts 2 through 5)
      const existing = [];
      for (let i = 2; i <= 5; i++) {
        const name = customer[`customerContactPersonName${i}`];
        const phone = customer[`phoneNumber${i}`];
        if (name || phone) {
          existing.push({ name: name || "", phone: phone || "" });
        }
      }
      setExtraContacts(existing);
    }
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setCustomer((prev) => ({ ...prev, [name]: value }));
  };

  const handleBillingChange = (e) => {
    const { name, value } = e.target;
    setBillingAddress((prev) => ({ ...prev, [name]: value }));
  };

  const handlePincodeChange = (e) => {
    const value = e.target.value;
    if (/^\d{0,6}$/.test(value)) setBillingAddress(prev => ({ ...prev, pincode: value }));
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

  const handleAddExtraContact = () => {
    if (extraContacts.length < 4) {
      setExtraContacts([...extraContacts, { name: "", phone: "" }]);
    }
  };

  const handleExtraContactChange = (index, field, value) => {
    const updated = [...extraContacts];
    if (field === "phone") {
      const cleaned = value.replace(/[^0-9]/g, '');
      if (cleaned.length <= 10) updated[index][field] = cleaned;
    } else {
      if (/^[a-zA-Z\s]*$/.test(value)) updated[index][field] = value;
    }
    setExtraContacts(updated);
  };

  const handleRemoveExtraContact = (index) => {
    setExtraContacts(extraContacts.filter((_, i) => i !== index));
  };

  const handleCustUpdate = async (e) => {
    e.preventDefault();

    // Build extra contact fields
    const extraContactData = {};
    for (let i = 2; i <= 5; i++) {
      extraContactData[`customerContactPersonName${i}`] = "";
      extraContactData[`phoneNumber${i}`] = "";
    }
    extraContacts.forEach((c, i) => {
      extraContactData[`customerContactPersonName${i + 2}`] = c.name;
      extraContactData[`phoneNumber${i + 2}`] = c.phone;
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
    };

    if (
      isEmptyOrWhitespace(updatedCustomer.custName) ||
      isEmptyOrWhitespace(updatedCustomer.phoneNumber1) ||
      isEmptyOrWhitespace(updatedCustomer.email) ||
      isEmptyOrWhitespace(updatedCustomer.customerContactPersonName1) ||
      !isValidPincode(updatedCustomer.billingAddress.pincode) ||
      isEmptyOrWhitespace(updatedCustomer.billingAddress.state) ||
      isEmptyOrWhitespace(updatedCustomer.billingAddress.city) ||
      isEmptyOrWhitespace(updatedCustomer.billingAddress.add) ||
      isEmptyOrWhitespace(updatedCustomer.GSTNo) ||
      isEmptyOrWhitespace(updatedCustomer.industryType) ||
      isEmptyOrWhitespace(updatedCustomer.ownedBy) ||
      isEmptyOrWhitespace(updatedCustomer.customerPriority)
    ) {
      toast.error("All required fields are mandatory");
      return;
    }

    if (updatedCustomer.industryType === 'Other' && isEmptyOrWhitespace(updatedCustomer.industryTypeOther)) {
      toast.error("Please specify the industry type when selecting 'Other'");
      return;
    }
    if (!validator.isEmail(updatedCustomer.email)) { toast.error("Enter valid Email"); return; }
    if (!validator.isMobilePhone(updatedCustomer.phoneNumber1)) { toast.error("Enter a valid phone number for Contact Person 1"); return; }
    for (let i = 0; i < extraContacts.length; i++) {
      if (extraContacts[i].phone && !validator.isMobilePhone(extraContacts[i].phone, 'any', { strictMode: false })) {
        toast.error(`Enter a valid phone number for Contact Person ${i + 2}`);
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

                  {/* Full Name */}
                  <div className="col-12 col-lg-6">
                    <div className="">
                      <label htmlFor="FullName" className="form-label label_text">Full Name <RequiredStar /></label>
                      <input type="text" className="form-control rounded-0" id="FullName" maxLength={300}
                        placeholder="Update a Full Name...." name="custName"
                        value={customer.custName || ""} onChange={handleChange} required />
                    </div>
                  </div>

                  {/* Email */}
                  <div className="col-12 col-lg-6">
                    <div className="mb-3">
                      <label htmlFor="Email" className="form-label label_text">Email <RequiredStar /></label>
                      <input type="email" name="email" maxLength={50} placeholder="Update a Email...."
                        className="form-control rounded-0" id="Email"
                        value={customer.email || ""} onChange={handleChange} required />
                    </div>
                  </div>

                  {/* Owned By */}
                  <div className="col-12 col-lg-6">
                    <div className="mb-3">
                      <label htmlFor="ownedBy" className="form-label label_text">Owned By <RequiredStar /></label>
                      <select className="form-select rounded-0" id="ownedBy" name="ownedBy"
                        value={customer.ownedBy?.name || customer.ownedBy || ""}
                        onChange={handleOwnedByChange} required disabled={employeesLoading}>
                        <option value="">{employeesLoading ? '⏳ Loading employees...' : '-- Select Employee --'}</option>
                        {employees.length > 0 ? (
                          employees.map((emp) => (<option key={emp._id} value={emp.name}>{emp.name}</option>))
                        ) : (
                          <option value={customer.ownedBy?.name || customer.ownedBy || ''}>
                            {customer.ownedBy?.name || customer.ownedBy || 'No employees found'}
                          </option>
                        )}
                      </select>
                      {employeesLoading && <small className="text-info"><i className="fa fa-spinner fa-spin me-1"></i> Loading employees...</small>}
                      {!employeesLoading && employees.length > 0 && <small className="text-success"><i className="fa fa-check-circle me-1"></i> {employees.length} employees available</small>}
                      {!employeesLoading && employeeError && <small className="text-warning"><i className="fa fa-exclamation-triangle me-1"></i> {employeeError}</small>}
                    </div>
                  </div>

                  {/* Industry Type */}
                  <div className="col-12 col-lg-6">
                    <div className="mb-3">
                      <label htmlFor="industryType" className="form-label label_text">Industry Type <RequiredStar /></label>
                      <select className="form-select rounded-0" id="industryType" name="industryType"
                        value={customer.industryType || ""}
                        onChange={(e) => setCustomer((prev) => ({
                          ...prev, industryType: e.target.value,
                          industryTypeOther: e.target.value !== 'Other' ? '' : prev.industryTypeOther
                        }))} required>
                        <option value="">Select Industry Type</option>
                        {industryOptions.map((option) => (<option key={option} value={option}>{option}</option>))}
                      </select>
                    </div>
                  </div>

                  {/* Specify Industry (Other) */}
                  {customer.industryType === 'Other' && (
                    <div className="col-12 col-lg-6">
                      <div className="mb-3">
                        <label htmlFor="industryTypeOther" className="form-label label_text">Specify Industry Type <RequiredStar /></label>
                        <input type="text" className="form-control rounded-0" id="industryTypeOther" name="industryTypeOther"
                          maxLength={100} value={customer.industryTypeOther || ""}
                          onChange={handleIndustryTypeOtherChange} placeholder="Enter industry type..." required />
                      </div>
                    </div>
                  )}

                  {/* Customer Priority */}
                  <div className="col-12 col-lg-6">
                    <div className="mb-3">
                      <label htmlFor="customerPriority" className="form-label label_text">Customer Priority <RequiredStar /></label>
                      <select className="form-select rounded-0" id="customerPriority" name="customerPriority"
                        value={customer.customerPriority || ""}
                        onChange={handlePriorityChange} required>
                        <option value="" disabled>Select Priority</option>
                        <option value="P1">🔴 P1 — High Priority</option>
                        <option value="P2">🟡 P2 — Medium Priority</option>
                        <option value="P3">🟢 P3 — Low Priority</option>
                      </select>
                      <small className="text-muted">P1 = High &nbsp;|&nbsp; P2 = Medium &nbsp;|&nbsp; P3 = Low</small>
                    </div>
                  </div>

                  {/* Contact Information */}
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

                      {/* Contact 1 — always visible */}
                      <div className="col-12 col-lg-6 mt-2">
                        <div className="mb-3">
                          <label htmlFor="ContactPerson1" className="form-label label_text">Contact Person 1 <RequiredStar /></label>
                          <input type="text" className="form-control rounded-0" id="ContactPerson1" maxLength={100}
                            name="customerContactPersonName1" onChange={handleChange}
                            value={customer.customerContactPersonName1 || ""} required />
                        </div>
                      </div>
                      <div className="col-12 col-lg-6 mt-2">
                        <div className="mb-3">
                          <label htmlFor="phoneNumber1" className="form-label label_text">Contact Number 1 <RequiredStar /></label>
                          <input type="tel" pattern="[0-9]{10}" maxLength={10} className="form-control rounded-0"
                            id="phoneNumber1" name="phoneNumber1" onChange={handleChange}
                            value={customer.phoneNumber1 || ""} required />
                        </div>
                      </div>

                      {/* Extra contacts */}
                      {extraContacts.map((contact, index) => (
                        <div key={index} className="col-12">
                          <div className="row">
                            <div className="col-12 col-lg-5 mt-2">
                              <div className="mb-3">
                                <label className="form-label label_text">Contact Person {index + 2}</label>
                                <input type="text" maxLength={100} className="form-control rounded-0"
                                  value={contact.name}
                                  onChange={(e) => handleExtraContactChange(index, "name", e.target.value)} />
                              </div>
                            </div>
                            <div className="col-12 col-lg-5 mt-2">
                              <div className="mb-3">
                                <label className="form-label label_text">Contact Number {index + 2}</label>
                                <input type="tel" pattern="[0-9]{10}" maxLength={10} className="form-control rounded-0"
                                  value={contact.phone}
                                  onChange={(e) => handleExtraContactChange(index, "phone", e.target.value)} />
                              </div>
                            </div>
                            <div className="col-12 col-lg-2 mt-2 d-flex align-items-center">
                              <button type="button" className="btn btn-sm btn-outline-danger mt-3"
                                onClick={() => handleRemoveExtraContact(index)}>
                                <i className="fa-solid fa-xmark"></i>
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Billing Address */}
                  <div className="col-12 mt-2">
                    <div className="row border mt-4 bg-gray mx-auto">
                      <div className="col-12 mb-3">
                        <span className="AddressInfo">Address <RequiredStar /></span>
                      </div>
                      <div className="col-12 col-lg-6 mt-2">
                        <div className="mb-3">
                          <input type="text" className="form-control rounded-0" placeholder="Enter 6-digit Pincode"
                            id="Pincode" name="pincode" onChange={handlePincodeChange}
                            value={billingAddress.pincode || ""} maxLength={6} required />
                          {isLoadingAddress && <small className="text-info"><i className="fa fa-spinner fa-spin me-1"></i> Loading address details...</small>}
                          {billingAddress.pincode?.toString().length === 6 && !isLoadingAddress && !billingAddress.state && (
                            <small className="text-danger">Invalid pincode or no data found</small>
                          )}
                        </div>
                      </div>
                      <div className="col-12 col-lg-6 mt-2">
                        <div className="mb-3">
                          <input type="text" className="form-control rounded-0" placeholder="State (Auto-filled)"
                            id="State" onChange={handleBillingChange} name="state" maxLength={50}
                            value={billingAddress.state || ""}
                            style={{ backgroundColor: billingAddress.state && !isLoadingAddress ? '#f8f9fa' : 'white' }} required />
                        </div>
                      </div>
                      <div className="col-12 col-lg-6 mt-2">
                        <div className="mb-3">
                          <input type="text" className="form-control rounded-0" placeholder="City (Auto-filled)"
                            id="city" onChange={handleBillingChange} name="city" maxLength={50}
                            value={billingAddress.city || ""}
                            style={{ backgroundColor: billingAddress.city && !isLoadingAddress ? '#f8f9fa' : 'white' }} required />
                        </div>
                      </div>
                      <div className="col-12 col-lg-6 mt-2">
                        <div className="mb-3">
                          <input type="text" className="form-control rounded-0" placeholder="Country (Auto-filled)"
                            id="country" name="country" maxLength={50} onChange={handleBillingChange}
                            value={billingAddress.country || ""}
                            style={{ backgroundColor: billingAddress.country && !isLoadingAddress ? '#f8f9fa' : 'white' }} />
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

                  {/* GST Number */}
                  <div className="col-12 col-lg-6 mt-2">
                    <div className="">
                      <label htmlFor="GSTNo" className="form-label label_text">GST Number <RequiredStar /></label>
                      <input type="text" className="form-control rounded-0" id="GSTNo"
                        placeholder="Update GST Number...." maxLength={15} name="GSTNo"
                        onChange={handleChange} value={customer.GSTNo || ""} required />
                    </div>
                  </div>

                  {/* Buttons */}
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