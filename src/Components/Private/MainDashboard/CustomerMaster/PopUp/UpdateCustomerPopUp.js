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

  // ✅ FIX: Added isLoadingAddress state
  const [isLoadingAddress, setIsLoadingAddress] = useState(false);

  const [billingAddress, setBillingAddress] = useState({
    add: "",
    city: "",
    state: "",
    country: "",
    pincode: "",
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

  const isEmptyOrWhitespace = (value) =>
    value === undefined || value === null || value.toString().trim() === '';

  const isValidPincode = (pincode) =>
    pincode && pincode.toString().trim() !== '' && !isNaN(pincode) && parseInt(pincode) > 0;

  // ✅ Fetch ALL employees for dropdown
  useEffect(() => {
    const fetchEmployees = async () => {
      setEmployeesLoading(true);
      setEmployeeError(null);

      try {
        console.log('🔄 Fetching employees for Update Owned By dropdown...');
        const data = await getEmployees();

        console.log('📡 Employee API response:', data);

        if (data.success && data.employees && data.employees.length > 0) {
          setEmployees(data.employees);
          console.log('✅ Loaded', data.employees.length, 'employees');
        } else if (data.success && data.employees && data.employees.length === 0) {
          console.log('⚠️ No employees found in database');
          setEmployees([]);
          setEmployeeError('No employees found.');
        } else {
          console.log('❌ Failed to load employees:', data);
          setEmployees([]);
          setEmployeeError('Failed to load employees.');
        }
      } catch (error) {
        console.error('❌ Error fetching employees:', error);
        setEmployees([]);
        setEmployeeError('Error loading employees.');
      } finally {
        setEmployeesLoading(false);
      }
    };

    fetchEmployees();
  }, []);

  // ✅ FIX: Corrected field names + debounce + loading state (mirrors AddCustomerPopUp)
  useEffect(() => {
    const fetchData = async () => {
      if (billingAddress.pincode && billingAddress.pincode.toString().length === 6) {
        setIsLoadingAddress(true);
        try {
          const data = await getAddress(billingAddress.pincode);
          if (data) {
            // ✅ FIXED: was data.State, data.District, data.Country (wrong capitalization)
            setBillingAddress(prevAddress => ({
              ...prevAddress,
              state: data.state,
              city: data.city,
              country: data.country,
            }));
          } else {
            setBillingAddress(prevAddress => ({
              ...prevAddress,
              state: "",
              city: "",
              country: "",
            }));
          }
        } catch (error) {
          console.error("Error fetching address:", error);
          setBillingAddress(prevAddress => ({
            ...prevAddress,
            state: "",
            city: "",
            country: "",
          }));
        } finally {
          setIsLoadingAddress(false);
        }
      } else if (billingAddress.pincode.toString().length < 6) {
        // ✅ Clear auto-filled fields if pincode is incomplete
        setBillingAddress(prevAddress => ({
          ...prevAddress,
          state: "",
          city: "",
          country: "",
        }));
      }
    };

    // ✅ FIX: Added 500ms debounce (same as AddCustomerPopUp)
    const timeoutId = setTimeout(() => {
      fetchData();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [billingAddress.pincode]);

  // Load existing customer billing address
  useEffect(() => {
    if (customer) {
      setBillingAddress(customer.billingAddress || {
        add: "",
        city: "",
        state: "",
        country: "",
        pincode: "",
      });
    }
  }, [customer]);

  const handleBillingChange = (e) => {
    const { name, value } = e.target;
    setBillingAddress({
      ...billingAddress,
      [name]: name === 'pincode' ? value : value.trim()
    });
  };

  // ✅ FIX: Pincode-specific handler to allow only digits, max 6
  const handlePincodeChange = (e) => {
    const value = e.target.value;
    if (/^\d{0,6}$/.test(value)) {
      setBillingAddress(prev => ({ ...prev, pincode: value }));
    }
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setCustomer((prevCustomer) => ({
      ...prevCustomer,
      [name]: value.trim(),
    }));
  };

  const handleOwnedByChange = (e) => {
    setCustomer((prevCustomer) => ({
      ...prevCustomer,
      ownedBy: e.target.value,
    }));
  };

  const handleIndustryTypeOtherChange = (e) => {
    const value = e.target.value;
    if (/^[a-zA-Z0-9\s&\-]*$/.test(value)) {
      setCustomer((prevCustomer) => ({
        ...prevCustomer,
        industryTypeOther: value,
      }));
    }
  };

  const handlePriorityChange = (e) => {
    setCustomer((prevCustomer) => ({
      ...prevCustomer,
      customerPriority: e.target.value,
    }));
  };

  const handleCustUpdate = async (e) => {
    e.preventDefault();

    const updatedCustomer = {
      ...customer,
      billingAddress,
    };

    // Validate required fields
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

    // Validate industry type "Other"
    if (updatedCustomer.industryType === 'Other' && isEmptyOrWhitespace(updatedCustomer.industryTypeOther)) {
      toast.error("Please specify the industry type when selecting 'Other'");
      return;
    }

    if (!validator.isEmail(updatedCustomer.email)) {
      toast.error("Enter valid Email");
      return;
    }

    if (!validator.isMobilePhone(updatedCustomer.phoneNumber1)) {
      toast.error("Enter a valid phone number for Contact Person 1");
      return;
    }

    if (updatedCustomer.phoneNumber2 && !validator.isMobilePhone(updatedCustomer.phoneNumber2)) {
      toast.error("Enter a valid phone number for Contact Person 2");
      return;
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
      console.error("Update error:", error);
    }
  };

  return (
    <>
      <div
        className="modal fade show"
        style={{ display: "flex", alignItems: "center", backgroundColor: "#00000090" }}
      >
        <div className="modal-dialog modal-lg modal-dialog-scrollable">
          <div className="modal-content p-3">
            <form onSubmit={handleCustUpdate}>
              <div className="modal-header pt-0">
                <h5 className="card-title fw-bold" id="exampleModalLongTitle">
                  Update Customer
                </h5>
                <button
                  onClick={() => handleUpdate()}
                  type="button"
                  className="close px-3"
                  style={{ marginLeft: "auto" }}
                >
                  <span aria-hidden="true">&times;</span>
                </button>
              </div>

              <div className="modal-body">
                <div className="row modal_body_height">

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
                        placeholder="Update a Full Name...."
                        name="custName"
                        value={customer.custName || ""}
                        onChange={handleChange}
                        required
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div className="col-12 col-lg-6">
                    <div className="mb-3">
                      <label htmlFor="Email" className="form-label label_text">
                        Email <RequiredStar />
                      </label>
                      <input
                        type="email"
                        name="email"
                        maxLength={50}
                        placeholder="Update a Email...."
                        className="form-control rounded-0"
                        id="Email"
                        value={customer.email || ""}
                        onChange={handleChange}
                        required
                      />
                    </div>
                  </div>

                  {/* Owned By */}
                  <div className="col-12 col-lg-6">
                    <div className="mb-3">
                      <label htmlFor="ownedBy" className="form-label label_text">
                        Owned By <RequiredStar />
                      </label>
                      <select
                        className="form-select rounded-0"
                        id="ownedBy"
                        name="ownedBy"
                        value={customer.ownedBy?.name || customer.ownedBy || ""}
                        onChange={handleOwnedByChange}
                        required
                        disabled={employeesLoading}
                      >
                        <option value="">
                          {employeesLoading ? '⏳ Loading employees...' : '-- Select Employee --'}
                        </option>

                        {employees.length > 0 ? (
                          employees.map((emp) => (
                            <option key={emp._id} value={emp.name}>
                              {emp.name}
                            </option>
                          ))
                        ) : (
                          <option value={customer.ownedBy?.name || customer.ownedBy || ''}>
                            {customer.ownedBy?.name || customer.ownedBy || 'No employees found'}
                          </option>
                        )}
                      </select>

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
                        name="industryType"
                        value={customer.industryType || ""}
                        onChange={(e) => {
                          setCustomer((prevCustomer) => ({
                            ...prevCustomer,
                            industryType: e.target.value,
                            industryTypeOther: e.target.value !== 'Other' ? '' : prevCustomer.industryTypeOther
                          }));
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
                  {customer.industryType === 'Other' && (
                    <div className="col-12 col-lg-6">
                      <div className="mb-3">
                        <label htmlFor="industryTypeOther" className="form-label label_text">
                          Specify Industry Type <RequiredStar />
                        </label>
                        <input
                          type="text"
                          className="form-control rounded-0"
                          id="industryTypeOther"
                          name="industryTypeOther"
                          maxLength={100}
                          value={customer.industryTypeOther || ""}
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
                        name="customerPriority"
                        value={customer.customerPriority || "P2"}
                        onChange={handlePriorityChange}
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

                  {/* Secondary Info */}
                  <div className="col-12 mt-2">
                    <div className="row border bg-gray mx-auto">
                      <div className="col-10 mb-3">
                        <span className="SecondaryInfo">Secondary Info</span>
                      </div>

                      <div className="col-12 col-lg-6 mt-2">
                        <div className="mb-3">
                          <label htmlFor="ContactPerson1" className="form-label label_text">
                            Contact Person 1 <RequiredStar />
                          </label>
                          <input
                            type="text"
                            className="form-control rounded-0"
                            id="ContactPerson1"
                            maxLength={100}
                            name="customerContactPersonName1"
                            onChange={handleChange}
                            value={customer.customerContactPersonName1 || ""}
                            required
                          />
                        </div>
                      </div>

                      <div className="col-12 col-lg-6 mt-2">
                        <div className="mb-3">
                          <label htmlFor="phoneNumber1" className="form-label label_text">
                            Contact Number 1 <RequiredStar />
                          </label>
                          <input
                            type="tel"
                            pattern="[0-9]{10}"
                            max={9999999999}
                            maxLength={10}
                            className="form-control rounded-0"
                            id="phoneNumber1"
                            name="phoneNumber1"
                            onChange={handleChange}
                            value={customer.phoneNumber1 || ""}
                            required
                          />
                        </div>
                      </div>

                      <div className="col-12 col-lg-6 mt-2">
                        <div className="mb-3">
                          <label htmlFor="ContactPerson2" className="form-label label_text">
                            Contact Person 2
                          </label>
                          <input
                            type="text"
                            className="form-control rounded-0"
                            id="ContactPerson2"
                            maxLength={100}
                            name="customerContactPersonName2"
                            onChange={handleChange}
                            value={customer.customerContactPersonName2 || ""}
                          />
                        </div>
                      </div>

                      <div className="col-12 col-lg-6 mt-2">
                        <div className="mb-3">
                          <label htmlFor="phoneNumber2" className="form-label label_text">
                            Contact Number 2
                          </label>
                          <input
                            type="tel"
                            pattern="[0-9]{10}"
                            max={9999999999}
                            maxLength={10}
                            className="form-control rounded-0"
                            id="phoneNumber2"
                            onChange={handleChange}
                            name="phoneNumber2"
                            value={customer.phoneNumber2 || ""}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Billing Address */}
                  <div className="col-12 mt-2">
                    <div className="row border mt-4 bg-gray mx-auto">
                      <div className="col-12 mb-3">
                        <span className="AddressInfo">Address <RequiredStar /></span>
                      </div>

                      {/* ✅ FIX: type="text" instead of "number", uses handlePincodeChange */}
                      <div className="col-12 col-lg-6 mt-2">
                        <div className="mb-3">
                          <input
                            type="text"
                            className="form-control rounded-0"
                            placeholder="Enter 6-digit Pincode"
                            id="Pincode"
                            name="pincode"
                            onChange={handlePincodeChange}
                            value={billingAddress.pincode || ""}
                            maxLength={6}
                            required
                          />
                          {/* ✅ FIX: Loading & error indicators like AddCustomerPopUp */}
                          {isLoadingAddress && (
                            <small className="text-info">
                              <i className="fa fa-spinner fa-spin me-1"></i>
                              Loading address details...
                            </small>
                          )}
                          {billingAddress.pincode?.toString().length === 6 && !isLoadingAddress && !billingAddress.state && (
                            <small className="text-danger">Invalid pincode or no data found</small>
                          )}
                        </div>
                      </div>

                      {/* ✅ FIX: bg highlight when auto-filled, same as AddCustomerPopUp */}
                      <div className="col-12 col-lg-6 mt-2">
                        <div className="mb-3">
                          <input
                            type="text"
                            className="form-control rounded-0"
                            placeholder="State (Auto-filled)"
                            id="State"
                            onChange={handleBillingChange}
                            name="state"
                            maxLength={50}
                            value={billingAddress.state || ""}
                            style={{ backgroundColor: billingAddress.state && !isLoadingAddress ? '#f8f9fa' : 'white' }}
                            required
                          />
                        </div>
                      </div>

                      <div className="col-12 col-lg-6 mt-2">
                        <div className="mb-3">
                          <input
                            type="text"
                            className="form-control rounded-0"
                            placeholder="City (Auto-filled)"
                            id="city"
                            onChange={handleBillingChange}
                            name="city"
                            maxLength={50}
                            value={billingAddress.city || ""}
                            style={{ backgroundColor: billingAddress.city && !isLoadingAddress ? '#f8f9fa' : 'white' }}
                            required
                          />
                        </div>
                      </div>

                      <div className="col-12 col-lg-6 mt-2">
                        <div className="mb-3">
                          <input
                            type="text"
                            className="form-control rounded-0"
                            placeholder="Country (Auto-filled)"
                            id="country"
                            name="country"
                            maxLength={50}
                            onChange={handleBillingChange}
                            value={billingAddress.country || ""}
                            style={{ backgroundColor: billingAddress.country && !isLoadingAddress ? '#f8f9fa' : 'white' }}
                          />
                        </div>
                      </div>

                      <div className="col-12 col-lg-12 mt-2">
                        <div className="mb-3">
                          <textarea
                            className="textarea_edit col-12"
                            id="add"
                            name="add"
                            maxLength={500}
                            placeholder="House NO., Building Name, Road Name, Area, Colony"
                            onChange={handleBillingChange}
                            value={billingAddress.add || ""}
                            rows="2"
                          ></textarea>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* GST Number */}
                  <div className="col-12 col-lg-6 mt-2">
                    <div className="">
                      <label htmlFor="GSTNo" className="form-label label_text">
                        GST Number <RequiredStar />
                      </label>
                      <input
                        type="text"
                        className="form-control rounded-0"
                        id="GSTNo"
                        placeholder="Update GST Number...."
                        maxLength={15}
                        name="GSTNo"
                        onChange={handleChange}
                        value={customer.GSTNo || ""}
                        required
                      />
                    </div>
                  </div>

                  {/* Buttons */}
                  <div className="row">
                    <div className="col-12 pt-3 mt-2">
                      <button type="submit" className="w-80 btn addbtn rounded-0 add_button m-2 px-4">
                        Update
                      </button>
                      <button type="button" onClick={handleUpdate} className="w-80 btn addbtn rounded-0 Cancel_button m-2 px-4">
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

export default UpdateCustomerPopUp;