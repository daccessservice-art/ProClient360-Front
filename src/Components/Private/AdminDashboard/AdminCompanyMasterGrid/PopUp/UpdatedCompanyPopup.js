import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { updateCompany } from "../../../../../hooks/useCompany";
import { formatDateforupdateSubcription } from "../../../../../utils/formatDate";
import { RequiredStar } from "../../../RequiredStar/RequiredStar";
import { getAddress } from "../../../../../hooks/usePincode";

const UpdatedCompanyPopup = ({ handleUpdate, selectedCompany }) => {
  const [company, setCompany] = useState({
    ...selectedCompany,
  });

  const [Address, setAddress] = useState(company.Address || {
    add: "",
    pincode: "",
    state: "",
    city: "",
    country: "",
  });

  const [subDate, setSubDate] = useState(formatDateforupdateSubcription(company.subDate));
  const [loading, setLoading] = useState(false);
  const [validated, setValidated] = useState(false);

  const handleAddressChange = (e) => {
    const { name, value } = e.target;
    setAddress({ ...Address, [name]: value });
  };

  useEffect(() => {
    const fetchData = async () => {
      const data = await getAddress(Address.pincode);

      if (data !== "Error") {
        console.log(data);
        setAddress(data);
      }
    };
    if (Address.pincode.length === 6)
      fetchData();
  }, [Address.pincode]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setCompany((prevCompany) => ({ ...prevCompany, [name]: value }));

    if (name === "subDate") {
      setSubDate(value);
    }
  };

  // ✅ NEW: handles a new logo file selection, converts to base64,
  // and stores it on company.logo. The backend (updateCompany) detects
  // base64 data URLs and uploads them to Firebase Storage automatically.
  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const maxSize = 1 * 1024 * 1024;
      if (file.size > maxSize) {
        toast.error("File size must be less than or equal to 1MB.");
        e.target.value = "";
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setCompany((prev) => ({ ...prev, logo: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCompanyUpdate = async (event) => {
    event.preventDefault();

    const form = event.currentTarget;
    
    if (form.checkValidity() === false) {
      // Let browser show native validation messages
      return;
    }

    setLoading(true);

    const updatedCompany = {
      ...company,
      Address,
      subDate
    }

    try {
      toast.loading("Updating Company...");
      const data = await updateCompany(updatedCompany);
      toast.dismiss()
      if(data.success) {
        toast.dismiss();
        toast.success("Company Updated Successfully");
        handleUpdate();
      } else {
        toast.dismiss();
        toast.error("Failed to Update Company");
      }
      setLoading(false);
    } catch (error) {
      toast.dismiss();
      toast.error(error.message || "An error occurred");
      setLoading(false);
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
            <form onSubmit={handleCompanyUpdate}>
              <div className="modal-header pt-0">
                <h5 className="card-title fw-bold" id="exampleModalLongTitle">
                  Update Company
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
                  <div className="col-12 col-lg-6 mt-2">
                    <div className="mb-3">
                      <label htmlFor="name" className="form-label label_text">
                        Full Name <RequiredStar />
                      </label>
                      <input
                        name="name"
                        type="text"
                        placeholder="Update Full Name...."
                        maxLength={100}
                        value={company.name}
                        onChange={handleChange}
                        className="form-control rounded-0"
                        id="name"
                        required
                      />
                    </div>
                  </div>

                  <div className="col-12 col-lg-6 mt-2">
                    <div className="mb-3">
                      <label htmlFor="admin" className="form-label label_text">
                        Admin Name <RequiredStar />
                      </label>
                      <input
                        type="text"
                        name="admin"
                        placeholder="Update Admin Name...."
                        maxLength={50}
                        value={company.admin}
                        onChange={handleChange}
                        className="form-control rounded-0"
                        id="admin"
                        required
                      />
                    </div>
                  </div>

                  <div className="col-12 col-lg-6 mt-2">
                    <div className="mb-3">
                      <label htmlFor="MobileNumber" className="form-label label_text">
                        Contact Number <RequiredStar />
                      </label>
                      <input
                        type="tel"
                        id="MobileNumber"
                        name="mobileNo"
                        placeholder="Enter Contact Number...."
                        className="form-control rounded-0"
                        maxLength={10}
                        minLength={10}
                        pattern="[0-9]{10}"
                        value={company.mobileNo}
                        onChange={handleChange}
                        required
                      />
                    </div>
                  </div>

                  <div className="col-12 col-lg-6 mt-2">
                    <div className="mb-3">
                      <label htmlFor="landlineNo" className="form-label label_text">
                        Landline No/Support No
                      </label>
                      <input
                        type="tel"
                        name="landlineNo"
                        id="landlineNo"
                        placeholder="Enter Landline No/Support No..."
                        className="form-control rounded-0"
                        maxLength={13}
                        value={company.landlineNo}
                        onChange={handleChange}
                      />
                    </div>
                  </div>

                  <div className="col-12 col-lg-6 mt-2">
                    <div className="mb-3">
                      <label htmlFor="Email" className="form-label label_text">
                        Email <RequiredStar />
                      </label>
                      <input
                        type="email"
                        name="email"
                        maxLength={50}
                        placeholder="Enter Email...."
                        value={company.email}
                        onChange={handleChange}
                        className="form-control rounded-0"
                        id="Email"
                        required
                      />
                    </div>
                  </div>

                  <div className="col-12 col-lg-6 mt-2">
                    <div className="mb-3">
                      <label htmlFor="subDate" className="form-label label_text">
                        Subscription End Date <RequiredStar />
                      </label>
                      <input
                        onChange={handleChange}
                        value={subDate}
                        name="subDate"
                        type="date"
                        className="form-control rounded-0"
                        id="subDate"
                        min={new Date().toISOString().split("T")[0]}
                        required
                      />
                      <div className="invalid-feedback">
                        Please provide a valid subscription end date.
                      </div>
                    </div>
                  </div>

                  <div className="col-12 col-lg-6 mt-2">
                    <div className="mb-3">
                      <label htmlFor="subAmount" className="form-label label_text">
                        Subscription Amount <RequiredStar />
                      </label>
                      <div className="input-group border mb-3">
                        <span
                          className="input-group-text rounded-0 bg-white border-0"
                          id="basic-addon1"
                        >
                          <span>&#8377;</span>
                        </span>
                        <input
                          type="number"
                          id="subAmount"
                          name="subAmount"
                          placeholder="eg.1000"
                          value={company.subAmount}
                          onChange={handleChange}
                          className="form-control rounded-0 border-0"
                          min="1"
                          max="9999999999"
                          required
                        />
                        <div className="invalid-feedback">
                          Please provide a valid subscription amount (minimum ₹1).
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="col-12 col-lg-6 mt-2">
                    <div className="mb-3">
                      <label htmlFor="GST" className="form-label label_text">
                        GST No <RequiredStar />
                      </label>
                      <div className="input-group border mb-3">
                        <input
                          type="text"
                          id="GST"
                          name="GST"
                          maxLength={15}
                          minLength={15}
                          pattern="[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}"
                          placeholder="Update GST Number...."
                          value={company.GST}
                          onChange={handleChange}
                          className="form-control rounded-0 border-0"
                          required
                        />
                        <div className="invalid-feedback">
                          Please provide a valid 15-digit GST number.
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="col-12 col-lg-6 mt-2">
                    <div className="mb-3">
                      <label htmlFor="LOGO" className="form-label label_text">
                        Logo <span style={{ fontSize: '11px', color: '#888' }}>[Max size: 1MB — leave empty to keep current logo]</span>
                      </label>
                      <input
                        type="file"
                        className="form-control rounded-0"
                        id="LOGO"
                        accept="image/*"
                        onChange={handleLogoChange}
                      />
                    </div>
                  </div>

                  <div className="col-12 col-lg-6 mt-2">
                    <div className="mb-3">
                      <label className="form-label label_text">Current Logo Preview</label>
                      <div>
                        {company.logo &&
                          <img
                            src={company.logo}
                            alt="Company Logo"
                            className="img-fluid rounded"
                            style={{ maxWidth: '200px', maxHeight: '100px', display: 'block' }}
                          />
                        }
                        {!company.logo && (
                          <span className="text-muted" style={{ fontSize: '12px' }}>
                            No logo uploaded for this company yet.
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="col-12 mt-2">
                    <div className="row border mt-4 bg-gray mx-auto">
                      <div className="col-12 mb-3">
                        <span className="AddressInfo fw-bold">
                          Address <RequiredStar />
                        </span>
                      </div>

                      <div className="col-12 col-lg-6 mt-2">
                        <div className="mb-3">
                          <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]{6}"
                            maxLength={6}
                            minLength={6}
                            className="form-control rounded-0"
                            placeholder="Pincode"
                            name="pincode"
                            id="pincode"
                            onChange={(e) => {
                              const value = e.target.value;
                              if (/^\d{0,6}$/.test(value)) {
                                handleAddressChange(e);
                              }
                            }}
                            value={Address.pincode}
                            required
                          />
                          <div className="invalid-feedback">
                            Please provide a valid 6-digit pincode.
                          </div>
                        </div>
                      </div>

                      <div className="col-12 col-lg-6 mt-2">
                        <div className="mb-3">
                          <input
                            type="text"
                            className="form-control rounded-0"
                            placeholder="State"
                            name="state"
                            maxLength={50}
                            id="state"
                            onChange={handleAddressChange}
                            value={Address.state}
                            required
                          />
                          <div className="invalid-feedback">
                            Please provide a valid state.
                          </div>
                        </div>
                      </div>

                      <div className="col-12 col-lg-6 mt-2">
                        <div className="mb-3">
                          <input
                            type="text"
                            className="form-control rounded-0"
                            placeholder="City"
                            name="city"
                            maxLength={50}
                            id="city"
                            onChange={handleAddressChange}
                            value={Address.city}
                            required
                          />
                          <div className="invalid-feedback">
                            Please provide a valid city.
                          </div>
                        </div>
                      </div>

                      <div className="col-12 col-lg-6 mt-2">
                        <div className="mb-3">
                          <input
                            type="text"
                            className="form-control rounded-0"
                            placeholder="Country"
                            name="country"
                            maxLength={50}
                            id="country"
                            onChange={handleAddressChange}
                            value={Address.country}
                            required
                          />
                          <div className="invalid-feedback">
                            Please provide a valid country.
                          </div>
                        </div>
                      </div>

                      <div className="col-12 col-lg-12 mt-2">
                        <div className="mb-3">
                          <textarea
                            className="form-control textarea_edit col-12"
                            id="add"
                            name="add"
                            maxLength={500}
                            placeholder="Enter full address..."
                            onChange={handleAddressChange}
                            value={Address.add}
                            rows="2"
                            required
                          ></textarea>
                          <div className="invalid-feedback">
                            Please provide a valid address.
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="row">
                    <div className="col-12 pt-3 mt-2">
                      <button
                        type="submit"
                        disabled={loading}
                        className="w-80 btn addbtn rounded-0 add_button m-2 px-4"
                      >
                        {loading ? "Submitting..." : "Update"}
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

export default UpdatedCompanyPopup;