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
  const [customerContactPersonName2, setCustomerContactPersonName2] = useState("");
  const [phoneNumber2, setPhoneNumber2] = useState("");
  const [GSTNo, setGSTNo] = useState("");
  const [customerContactPersonName1, setCustomerContactPersonName1] = useState("");
  const [zone, setZone] = useState("");
  const [isLoadingAddress, setIsLoadingAddress] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [employeesLoading, setEmployeesLoading] = useState(false);
  const [employeeError, setEmployeeError] = useState(null);
  const [ownedBy, setOwnedBy] = useState(user?.name || "");

  // Industry Type states
  const [industryType, setIndustryType] = useState("");
  const [industryTypeOther, setIndustryTypeOther] = useState("");

  // Customer Priority state
  const [customerPriority, setCustomerPriority] = useState("P2");

  const [billingAddress, setBillingAddress] = useState({
    pincode: "",
    state: "",
    city: "",
    add: "",
    country: "",
  });

  // Industry type options
  const industryOptions = [
    "IT & Software",
    "Manufacturing",
    "Construction & Infrastructure",
    "Healthcare",
    "Education",
    "Retail",
    "Banking & Finance",
    "Logistics & Supply Chain",
    "Hospitality",
    "Real Estate",
    "Government & Public Sector",
    "Energy & Utilities",
    "Telecom",
    "Pharmaceuticals",
    "Automotive",
    "Other"
  ];

  // ✅ Fetch ALL employees for dropdown
  useEffect(() => {
    const fetchEmployees = async () => {
      setEmployeesLoading(true);
      setEmployeeError(null);
      
      try {
        console.log('🔄 Fetching employees for Owned By dropdown...');
        const data = await getEmployees();
        
        console.log('📡 Employee API response:', data);
        
        if (data.success && data.employees && data.employees.length > 0) {
          setEmployees(data.employees);
          console.log('✅ Loaded', data.employees.length, 'employees');
          
          // Auto-select first employee if ownedBy is not set
          if (!ownedBy || ownedBy === '') {
            setOwnedBy(data.employees[0].name);
          }
        } else if (data.success && data.employees && data.employees.length === 0) {
          console.log('⚠️ No employees found in database');
          setEmployees([]);
          setEmployeeError('No employees found. Please add employees first.');
        } else {
          console.log('❌ Failed to load employees:', data);
          setEmployees([]);
          setEmployeeError('Failed to load employees.');
        }
      } catch (error) {
        console.error('❌ Error fetching employees:', error);
        setEmployees([]);
        setEmployeeError('Error loading employees. Using current user.');
      } finally {
        setEmployeesLoading(false);
      }
    };
    
    fetchEmployees();
  }, []);

  // Auto-fill address from pincode
  useEffect(() => {
    const fetchData = async () => {
      if (billingAddress.pincode && billingAddress.pincode.length === 6) {
        setIsLoadingAddress(true);
        try {
          const data = await getAddress(billingAddress.pincode);
          if (data) {
            setBillingAddress(prevAddress => ({
              ...prevAddress,
              state: data.state,
              city: data.city,
              country: data.country
            }));
          } else {
            setBillingAddress(prevAddress => ({
              ...prevAddress,
              state: "",
              city: "",
              country: ""
            }));
          }
        } catch (error) {
          console.error("Error fetching address:", error);
          setBillingAddress(prevAddress => ({
            ...prevAddress,
            state: "",
            city: "",
            country: ""
          }));
        } finally {
          setIsLoadingAddress(false);
        }
      } else if (billingAddress.pincode.length < 6) {
        setBillingAddress(prevAddress => ({
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
  }, [billingAddress.pincode]);

  const handleCustomerAdd = async (event) => {
    event.preventDefault();

    const customerData = {
      custName,
      phoneNumber1,
      email,
      customerContactPersonName2,
      customerContactPersonName1,
      phoneNumber2,
      billingAddress,
      zone,
      GSTNo,
      ownedBy,
      industryType,
      industryTypeOther: industryType === 'Other' ? industryTypeOther : undefined,
      customerPriority,
    };

    if (
      !custName ||
      !phoneNumber1 ||
      !email ||
      !billingAddress.pincode ||
      !billingAddress.state ||
      !billingAddress.city ||
      !billingAddress.add ||
      !zone ||
      !GSTNo ||
      !industryType ||
      !ownedBy ||
      !customerPriority
    ) {
      return toast.error("Please fill all required fields");
    }

    if (industryType === 'Other' && (!industryTypeOther || industryTypeOther.trim() === '')) {
      return toast.error("Please specify the industry type");
    }

    if (!validator.isEmail(email)) {
      return toast.error("Enter valid Email");
    }
    if (billingAddress.pincode.length !== 6 || !/^\d{6}$/.test(billingAddress.pincode)) {
      return toast.error("Enter valid 6-digit Pincode");
    }
    if (!validator.isMobilePhone(phoneNumber1, 'any', { strictMode: false })) {
      return toast.error("Please enter valid 10-digit phone number for Contact Person 1.");
    }
    if (phoneNumber2 && !validator.isMobilePhone(phoneNumber2, 'any', { strictMode: false })) {
      return toast.error("Please enter valid 10-digit phone number for Contact Person 2.");
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
    const value = e.target.value;
    if (/^[a-zA-Z0-9\s]*$/.test(value)) setCustName(value);
  };

  const handleContactPersonName1Change = (e) => {
    const value = e.target.value;
    if (/^[a-zA-Z\s]*$/.test(value)) setCustomerContactPersonName1(value);
  };

  const handleContactPersonName2Change = (e) => {
    const value = e.target.value;
    if (/^[a-zA-Z\s]*$/.test(value)) setCustomerContactPersonName2(value);
  };

  const handleStateChange = (e) => {
    const value = e.target.value;
    if (/^[a-zA-Z\s]*$/.test(value)) setBillingAddress(prev => ({ ...prev, state: value }));
  };

  const handleCityChange = (e) => {
    const value = e.target.value;
    if (/^[a-zA-Z\s]*$/.test(value)) setBillingAddress(prev => ({ ...prev, city: value }));
  };

  const handleCountryChange = (e) => {
    const value = e.target.value;
    if (/^[a-zA-Z\s]*$/.test(value)) setBillingAddress(prev => ({ ...prev, country: value }));
  };

  const handlePincodeChange = (e) => {
    const value = e.target.value;
    if (/^\d{0,6}$/.test(value)) setBillingAddress(prev => ({ ...prev, pincode: value }));
  };

  const handleGSTChange = (e) => {
    setGSTNo(e.target.value.toUpperCase());
  };

  const handleIndustryTypeOtherChange = (e) => {
    const value = e.target.value;
    if (/^[a-zA-Z0-9\s&\-]*$/.test(value)) setIndustryTypeOther(value);
  };

  return (
    <>
      <div
        className="modal fade show"
        style={{ display: "flex", alignItems: "center", backgroundColor: "#00000090" }}
      >
        <div className="modal-dialog modal-lg modal-dialog-scrollable">
          <div className="modal-content p-3">
            <form onSubmit={handleCustomerAdd}>
              <div className="modal-header pt-0">
                <h5 className="card-title fw-bold" id="exampleModalLongTitle">
                  Create New Customer
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
                      <label htmlFor="FullName" className="form-label label_text">
                        Full Name <RequiredStar />
                      </label>
                      <input
                        type="text"
                        className="form-control rounded-0"
                        id="FullName"
                        maxLength={300}
                        value={custName}
                        onChange={handleCustNameChange}
                        placeholder="Enter a Full Name...."
                        required
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div className="col-12 col-lg-6">
                    <div className="mb-3">
                      <label htmlFor="email" className="form-label label_text">
                        Email <RequiredStar />
                      </label>
                      <input
                        type="email"
                        maxLength={50}
                        className="form-control rounded-0"
                        id="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter a Email...."
                        required
                      />
                    </div>
                  </div>

                  {/* ✅ Owned By - Load All Employees */}
                  <div className="col-12 col-lg-6">
                    <div className="mb-3">
                      <label htmlFor="ownedBy" className="form-label label_text">
                        Owned By <RequiredStar />
                      </label>
                      <select
                        className="form-select rounded-0"
                        id="ownedBy"
                        value={ownedBy}
                        onChange={(e) => setOwnedBy(e.target.value)}
                        required
                        disabled={employeesLoading}
                      >
                        <option value="">
                          {employeesLoading ? '⏳ Loading employees...' : '-- Select Employee --'}
                        </option>
                        
                        {/* Always show current user as fallback */}
                        <option value={user?.name}>
                          {user?.name} (Current User)
                        </option>
                        
                        {/* Show all loaded employees */}
                        {employees.length > 0 && employees.map((emp) => (
                          emp.name !== user?.name && (
                            <option key={emp._id} value={emp.name}>
                              {emp.name}
                            </option>
                          )
                        ))}
                      </select>
                      
                      {/* Status messages */}
                      {employeesLoading && (
                        <small className="text-info">
                          <i className="fa fa-spinner fa-spin me-1"></i>
                          Loading employees...
                        </small>
                      )}
                      
                      {!employeesLoading && employees.length > 0 && (
                        <small className="text-success">
                          <i className="fa fa-check-circle me-1"></i>
                          {employees.length} employees available
                        </small>
                      )}
                      
                      {!employeesLoading && employeeError && (
                        <small className="text-warning">
                          <i className="fa fa-exclamation-triangle me-1"></i>
                          {employeeError}
                        </small>
                      )}
                    </div>
                  </div>

                  {/* Industry Type */}
                  <div className="col-12 col-lg-6">
                    <div className="mb-3">
                      <label htmlFor="industryType" className="form-label label_text">
                        Industry Type <RequiredStar />
                      </label>
                      <select
                        className="form-select rounded-0"
                        id="industryType"
                        value={industryType}
                        onChange={(e) => {
                          setIndustryType(e.target.value);
                          if (e.target.value !== 'Other') setIndustryTypeOther('');
                        }}
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
                  {industryType === 'Other' && (
                    <div className="col-12 col-lg-6">
                      <div className="mb-3">
                        <label htmlFor="industryTypeOther" className="form-label label_text">
                          Specify Industry Type <RequiredStar />
                        </label>
                        <input
                          type="text"
                          className="form-control rounded-0"
                          id="industryTypeOther"
                          maxLength={100}
                          value={industryTypeOther}
                          onChange={handleIndustryTypeOtherChange}
                          placeholder="Enter industry type..."
                          required
                        />
                      </div>
                    </div>
                  )}

                  {/* Customer Priority */}
                  <div className="col-12 col-lg-6">
                    <div className="mb-3">
                      <label htmlFor="customerPriority" className="form-label label_text">
                        Customer Priority <RequiredStar />
                      </label>
                      <select
                        className="form-select rounded-0"
                        id="customerPriority"
                        value={customerPriority}
                        onChange={(e) => setCustomerPriority(e.target.value)}
                        required
                      >
                        <option value="">Select Priority</option>
                        <option value="P1">🔴 P1 — Priority</option>
                        <option value="P2">🟡 P2 — Priority</option>
                        <option value="P3">🟢 P3 — Priority</option>
                      </select>
                      <small className="text-muted">
                        P1 = High &nbsp;|&nbsp; P2 = Medium &nbsp;|&nbsp; P3 = Low
                      </small>
                    </div>
                  </div>

                  {/* Contact Information */}
                  <div className="col-12 mt-2">
                    <div className="row border bg-gray mx-auto">
                      <div className="col-10 mb-3">
                        <span className="SecondaryInfo">Contact Information</span>
                      </div>

                      <div className="col-12 col-lg-6 mt-2">
                        <div className="mb-3">
                          <label htmlFor="SecondaryPersonName" className="form-label label_text">
                            Contact Person Name 1 <RequiredStar />
                          </label>
                          <input
                            type="text"
                            maxLength={50}
                            className="form-control rounded-0"
                            id="SecondaryPersonName"
                            value={customerContactPersonName1}
                            onChange={handleContactPersonName1Change}
                            required
                          />
                        </div>
                      </div>

                      <div className="col-12 col-lg-6 mt-2">
                        <div className="mb-3">
                          <label htmlFor="SecondaryPersonName2" className="form-label label_text">
                            Contact Person Name 2
                          </label>
                          <input
                            type="text"
                            className="form-control rounded-0"
                            id="SecondaryPersonName2"
                            maxLength={50}
                            value={customerContactPersonName2}
                            onChange={handleContactPersonName2Change}
                          />
                        </div>
                      </div>

                      <div className="col-12 col-lg-6 mt-2">
                        <div className="mb-3">
                          <label htmlFor="MobileNumber" className="form-label label_text">
                            Contact Person No 1 <RequiredStar />
                          </label>
                          <input
                            type="tel"
                            pattern="[0-9]{10}"
                            className="form-control rounded-0"
                            id="MobileNumber"
                            value={phoneNumber1}
                            onChange={(e) => {
                              const value = e.target.value.replace(/[^0-9]/g, '');
                              if (value.length <= 10) setPhoneNumber1(value);
                            }}
                            maxLength={10}
                            required
                          />
                        </div>
                      </div>

                      <div className="col-12 col-lg-6 mt-2">
                        <div className="mb-3">
                          <label htmlFor="mobileNo" className="form-label label_text">
                            Contact Person No. 2
                          </label>
                          <input
                            type="tel"
                            pattern="[0-9]{10}"
                            maxLength={10}
                            className="form-control rounded-0"
                            id="mobileNo"
                            value={phoneNumber2}
                            onChange={(e) => {
                              const value = e.target.value.replace(/[^0-9]/g, '');
                              if (value.length <= 10) setPhoneNumber2(value);
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Address */}
                  <div className="col-12 mt-2">
                    <div className="row border mt-4 bg-gray mx-auto">
                      <div className="col-12 mb-3">
                        <span className="AddressInfo">Address <RequiredStar /></span>
                      </div>

                      <div className="col-12 col-lg-6 mt-2">
                        <div className="mb-3">
                          <input
                            type="text"
                            className="form-control rounded-0"
                            placeholder="Enter 6-digit Pincode"
                            maxLength={6}
                            onChange={handlePincodeChange}
                            value={billingAddress.pincode}
                          />
                          {isLoadingAddress && (
                            <small className="text-info">Loading address details...</small>
                          )}
                          {billingAddress.pincode.length === 6 && !isLoadingAddress && !billingAddress.state && (
                            <small className="text-danger">Invalid pincode or no data found</small>
                          )}
                        </div>
                      </div>

                      <div className="col-12 col-lg-6 mt-2">
                        <div className="mb-3">
                          <input
                            type="text"
                            className="form-control rounded-0"
                            placeholder="State (Auto-filled)"
                            maxLength={50}
                            onChange={handleStateChange}
                            value={billingAddress.state}
                            style={{ backgroundColor: billingAddress.state && !isLoadingAddress ? '#f8f9fa' : 'white' }}
                          />
                        </div>
                      </div>

                      <div className="col-12 col-lg-6 mt-2">
                        <div className="mb-3">
                          <input
                            type="text"
                            className="form-control rounded-0"
                            placeholder="City (Auto-filled)"
                            maxLength={50}
                            value={billingAddress.city}
                            onChange={handleCityChange}
                            style={{ backgroundColor: billingAddress.city && !isLoadingAddress ? '#f8f9fa' : 'white' }}
                          />
                        </div>
                      </div>

                      <div className="col-12 col-lg-6 mt-2">
                        <div className="mb-3">
                          <input
                            type="text"
                            className="form-control rounded-0"
                            placeholder="Country (Auto-filled)"
                            maxLength={50}
                            onChange={handleCountryChange}
                            value={billingAddress.country}
                            style={{ backgroundColor: billingAddress.country && !isLoadingAddress ? '#f8f9fa' : 'white' }}
                          />
                        </div>
                      </div>

                      <div className="col-12 col-lg-12 mt-2">
                        <div className="mb-3">
                          <textarea
                            className="textarea_edit col-12"
                            maxLength={500}
                            placeholder="House NO., Building Name, Road Name, Area, Colony"
                            onChange={(e) => setBillingAddress(prev => ({ ...prev, add: e.target.value }))}
                            value={billingAddress.add}
                            rows="2"
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
                        type="text"
                        className="form-control rounded-0 text-uppercase"
                        id="GSTNumber"
                        maxLength={15}
                        onChange={handleGSTChange}
                        value={GSTNo}
                        required
                        placeholder="Enter GST Number"
                        minLength={2}
                      />
                    </div>
                  </div>

                  <div className="col-12 col-lg-6 mt-2">
                    <div className="mb-3">
                      <label htmlFor="zone" className="form-label label_text">
                        Zone <RequiredStar />
                      </label>
                      <select
                        className="form-select rounded-0"
                        id="zone"
                        value={zone}
                        onChange={(e) => setZone(e.target.value)}
                        required
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
                      <button type="submit" className="w-80 btn addbtn rounded-0 add_button m-2 px-4">
                        Add
                      </button>
                      <button type="button" onClick={handleAdd} className="w-80 btn addbtn rounded-0 Cancel_button m-2 px-4">
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

export default AddCustomerPopUp;