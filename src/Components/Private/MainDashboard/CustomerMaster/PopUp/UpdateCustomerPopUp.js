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

  const isEmptyOrWhitespace = (value) => {
    return value === undefined || value === null || value.toString().trim() === '';
  };

  const isValidPincode = (pincode) => {
    return pincode && pincode.toString().trim() !== '' && !isNaN(pincode) && parseInt(pincode) > 0;
  };

  // ✅ FIXED: Fetch employees for dropdown with better error handling
  useEffect(() => {
    const fetchEmployees = async () => {
      setEmployeesLoading(true);
      try {
        console.log('Fetching employees for update dropdown...');
        const data = await getEmployees();
        console.log('Employees API response:', data);
        
        if (data.success && data.employees) {
          console.log('Employees loaded for update:', data.employees.length);
          setEmployees(data.employees);
        } else {
          console.log('No employees found or API returned non-success');
          setEmployees([]);
        }
      } catch (error) {
        console.error('Error fetching employees:', error);
        setEmployees([]);
      } finally {
        setEmployeesLoading(false);
      }
    };
    
    fetchEmployees();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      if (isValidPincode(billingAddress.pincode)) {
        const data = await getAddress(billingAddress.pincode);

        if (data !== "Error") {
          console.log(data);
          setBillingAddress(prevAddress => ({
            ...prevAddress, 
            state: data.State, 
            city: data.District,   
            country: data.Country 
          }));
        }
      }
    };
    
    fetchData();
  }, [billingAddress.pincode]);

  // Load existing customer data on component mount
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

  const handleChange = (event) => {
    const { name, value } = event.target;
    setCustomer((prevCustomer) => ({
      ...prevCustomer,
      [name]: value.trim(),
    }))
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

  const handleCustUpdate = async (e) => {
    e.preventDefault();
    
    const updatedCustomer = {
      ...customer,
      billingAddress,
    };

    // Validate required fields (Contact Person 2 and Phone 2 are NOT required)
    if(
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
      isEmptyOrWhitespace(updatedCustomer.ownedBy)
    ){
      toast.error("All required fields are mandatory");
      return;
    }

    // Validate industry type if "Other" is selected
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

    // Phone 2 is optional, but if provided, validate it
    if (updatedCustomer.phoneNumber2 && !validator.isMobilePhone(updatedCustomer.phoneNumber2)) {
      toast.error("Enter a valid phone number for Contact Person 2");
      return;
    }

    try {
      toast.loading("Updating Customer.....");
      const data = await updateCustomer(updatedCustomer);
      toast.dismiss();
      
      if(data.success) {
        toast.success(data.message);
        handleUpdate();
      } else {
        toast.error(data.error || "Failed to update customer");
      }
    } catch(error) {
      toast.error("Error updating customer");
      console.error("Update error:", error);
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
                        placeholder="Update a Full Name.... "
                        name="custName"
                        value={customer.custName || ""}
                        onChange={handleChange}
                        aria-describedby="nameHelp"
                        required
                      />
                    </div>
                  </div>

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
                        aria-describedby="emailHelp"
                        required
                      />
                    </div>
                  </div>

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
                          {employeesLoading ? 'Loading employees...' : 'Select Employee'}
                        </option>
                        {employees.length > 0 ? (
                          employees.map((emp) => (
                            <option key={emp._id} value={emp.name}>
                              {emp.name}
                            </option>
                          ))
                        ) : (
                          !employeesLoading && (
                            <option value={customer.ownedBy?.name || customer.ownedBy || ''}>
                              {customer.ownedBy?.name || customer.ownedBy || 'No employees found'}
                            </option>
                          )
                        )}
                      </select>
                      {employees.length === 0 && !employeesLoading && (
                        <small className="text-warning">
                          <i className="fa fa-exclamation-triangle me-1"></i>
                          Employees not loaded.
                        </small>
                      )}
                    </div>
                  </div>

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
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

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

                  <div className="col-12 mt-2">
                    <div className="row border bg-gray mx-auto">
                      <div className="col-10 mb-3">
                        <span className="SecondaryInfo">Secondary Info</span>
                      </div>

                      <div className="col-12 col-lg-6 mt-2">
                        <div className="mb-3">
                          <label
                            htmlFor="ContactPerson1"
                            className="form-label label_text"
                          >
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
                            aria-describedby="mobileNoHelp"
                            required
                          />
                        </div>
                      </div>

                      <div className="col-12 col-lg-6 mt-2">
                        <div className="mb-3">
                          <label
                            htmlFor="phoneNumber1"
                            className="form-label label_text"
                          >
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
                            aria-describedby="secemailHelp"
                            required
                          />
                        </div>
                      </div>

                      <div className="col-12 col-lg-6 mt-2">
                        <div className="mb-3">
                          <label
                            htmlFor="ContactPerson2"
                            className="form-label label_text"
                          >
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
                            aria-describedby="mobileNoHelp"
                          />
                        </div>
                      </div>

                      <div className="col-12 col-lg-6 mt-2">
                        <div className="mb-3">
                          <label
                            htmlFor="phoneNumber2"
                            className="form-label label_text"
                          >
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
                            aria-describedby="secemailHelp"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="col-12 mt-2">
                    <div className="row border mt-4 bg-gray mx-auto">
                      <div className="col-12 mb-3">
                        <span className="AddressInfo">Address <RequiredStar /></span>
                      </div>

                      <div className="col-12 col-lg-6 mt-2">
                        <div className="mb-3">
                          <input
                            type="number"
                            className="form-control rounded-0"
                            placeholder="Pincode"
                            id="Pincode"
                            name="pincode"
                            onChange={handleBillingChange}
                            value={billingAddress.pincode || ""}
                            aria-describedby="emailHelp"
                            required
                          />
                        </div>
                      </div>

                      <div className="col-12 col-lg-6 mt-2">
                        <div className="mb-3">
                          <input
                            type="text"
                            className="form-control rounded-0"
                            placeholder="State"
                            id="State"
                            onChange={handleBillingChange}
                            name="state"
                            maxLength={50}
                            value={billingAddress.state || ""}
                            aria-describedby="emailHelp"
                            required
                          />
                        </div>
                      </div>

                      <div className="col-12 col-lg-6 mt-2">
                        <div className="mb-3">
                          <input
                            type="text"
                            className="form-control rounded-0"
                            placeholder="City"
                            id="city"
                            onChange={handleBillingChange}
                            name="city"
                            maxLength={50}
                            value={billingAddress.city || ""}
                            aria-describedby="emailHelp"
                            required
                          />
                        </div>
                      </div>

                      <div className="col-12 col-lg-6 mt-2">
                        <div className="mb-3">
                          <input
                            type="text"
                            className="form-control rounded-0"
                            placeholder="Country"
                            id="country"
                            name="country"
                            maxLength={50}
                            onChange={handleBillingChange}
                            value={billingAddress.country || ""}
                            aria-describedby="emailHelp"
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
                            required
                          ></textarea>
                        </div>
                      </div>
                    </div>
                  </div>

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
                        aria-describedby="emailHelp"
                        required
                      />
                    </div>
                  </div>

                  <div className="row">
                    <div className="col-12 pt-3 mt-2">
                      <button
                        type="submit"
                        className="w-80 btn addbtn rounded-0 add_button m-2 px-4"
                      >
                        Update
                      </button>
                      <button
                        type="button"
                        onClick={handleUpdate}
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

export default UpdateCustomerPopUp;