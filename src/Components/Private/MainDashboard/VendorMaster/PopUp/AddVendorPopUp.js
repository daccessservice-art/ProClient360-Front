import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { RequiredStar } from "../../../RequiredStar/RequiredStar";
import { getAddress } from "../../../../../hooks/usePincode";
import { createVendor } from "../../../../../hooks/useVendor";

const AddVendorPopUp = ({ handleAdd, brands, addBrand }) => {
  const [vendorName, setVendorName] = useState("");
  const [typeOfVendor, setTypeOfVendor] = useState("");
  const [materialCategory, setMaterialCategory] = useState("");
  const [customMaterialCategory, setCustomMaterialCategory] = useState("");
  const [vendorRating, setVendorRating] = useState(0);
  const [brandsWorkWith, setBrandsWorkWith] = useState("");
  const [phoneNumber1, setPhoneNumber1] = useState("");
  const [email, setEmail] = useState("");
  const [vendorContactPersonName2, setVendorContactPersonName2] = useState("");
  const [phoneNumber2, setPhoneNumber2] = useState("");
  const [GSTNo, setGSTNo] = useState("");
  const [vendorContactPersonName1, setVendorContactPersonName1] = useState("");
  const [isLoadingAddress, setIsLoadingAddress] = useState(false);
  const [customVendorType, setCustomVendorType] = useState("");
  const [showAddBrandModal, setShowAddBrandModal] = useState(false);
  const [newBrand, setNewBrand] = useState("");
  const [localBrands, setLocalBrands] = useState([]);
  const [remarks, setRemarks] = useState("");
  const [manualAddress, setManualAddress] = useState("");

  const [billingAddress, setBillingAddress] = useState({
    pincode: "",
    state: "",
    city: "",
    add: "",
    country: "",
  });

  useEffect(() => {
    const savedProductBrands = localStorage.getItem('productBrands');
    let productBrands = [];
    if (savedProductBrands) productBrands = JSON.parse(savedProductBrands);
    const allBrands = [...new Set([...productBrands, ...brands])];
    setLocalBrands(allBrands);
  }, [brands]);

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

  const handleVendorAdd = async (event) => {
    event.preventDefault();

    const vendorData = {
      vendorName,
      typeOfVendor,
      materialCategory,
      customMaterialCategory: materialCategory === "Other" ? customMaterialCategory : "",
      vendorRating,
      brandsWorkWith: typeOfVendor === "B2B Material" ? brandsWorkWith : "",
      phoneNumber1,
      email,
      vendorContactPersonName2,
      vendorContactPersonName1,
      phoneNumber2,
      billingAddress: (typeOfVendor !== "Import" && typeOfVendor !== "Other")
        ? billingAddress
        : { add: "Not applicable for this vendor type" },
      GSTNo,
      customVendorType: typeOfVendor === "Other" ? customVendorType : "",
      remarks,
      manualAddress: typeOfVendor === "Import" ? manualAddress : "",
    };

    if (
      !vendorName ||
      !typeOfVendor ||
      !materialCategory ||
      (materialCategory === "Other" && !customMaterialCategory) ||
      !phoneNumber1 ||
      !email ||
      !GSTNo ||
      (typeOfVendor === "Other" && !customVendorType) ||
      (typeOfVendor === "Import" && !manualAddress) ||
      ((typeOfVendor !== "Import" && typeOfVendor !== "Other") &&
        (!billingAddress.pincode || !billingAddress.state || !billingAddress.city || !billingAddress.add)) ||
      (typeOfVendor === "B2B Material" && !brandsWorkWith)
    ) {
      return toast.error("Please fill all required fields");
    }

    if (
      (typeOfVendor !== "Import" && typeOfVendor !== "Other") &&
      (billingAddress.pincode.length !== 6 || !/^\d{6}$/.test(billingAddress.pincode))
    ) {
      return toast.error("Enter valid 6-digit Pincode");
    }

    if (!/^\d{10}$/.test(phoneNumber1)) {
      return toast.error("Please enter valid 10-digit phone number for Contact Person 1.");
    }

    if (phoneNumber2 && !/^\d{10}$/.test(phoneNumber2)) {
      return toast.error("Please enter valid 10-digit phone number for Contact Person 2.");
    }

    toast.loading("Creating Vendor...");
    const data = await createVendor(vendorData);
    toast.dismiss();

    if (data.success) {
      toast.success(data.message);
      handleAdd();
    } else {
      toast.error(data.error || "Failed to create vendor");
    }
  };

  const handleVendorNameChange = (e) => {
    const value = e.target.value;
    if (/^[a-zA-Z0-9\s]*$/.test(value)) setVendorName(value);
  };

  const handleContactPersonName1Change = (e) => {
    const value = e.target.value;
    if (/^[a-zA-Z\s]*$/.test(value)) setVendorContactPersonName1(value);
  };

  const handleContactPersonName2Change = (e) => {
    const value = e.target.value;
    if (/^[a-zA-Z\s]*$/.test(value)) setVendorContactPersonName2(value);
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

  const handleRatingClick = (rating) => {
    setVendorRating(rating);
  };

  const handleAddNewBrand = () => {
    if (newBrand.trim() === '') { toast.error("Brand name is required"); return; }
    if (localBrands.includes(newBrand)) { toast.error("Brand already exists"); return; }
    const updatedBrands = [...localBrands, newBrand];
    setLocalBrands(updatedBrands);
    addBrand(newBrand);
    setBrandsWorkWith(newBrand);
    setNewBrand("");
    setShowAddBrandModal(false);
  };

  return (
    <>
      <div
        className="modal fade show"
        style={{ display: "flex", alignItems: "center", backgroundColor: "#00000090" }}
      >
        <div className="modal-dialog modal-lg">
          <div className="modal-content p-3">
            <form onSubmit={handleVendorAdd}>
              <div className="modal-header pt-0">
                <h5 className="card-title fw-bold">Create New Vendor</h5>
                <button onClick={() => handleAdd()} type="button" className="close px-3" style={{ marginLeft: "auto" }}>
                  <span aria-hidden="true">&times;</span>
                </button>
              </div>
              <div className="modal-body">
                <div className="row modal_body_height">

                  {/* Material Category */}
                  <div className="col-12">
                    <div className="mb-3">
                      <label className="form-label label_text">Material Category <RequiredStar /></label>
                      <select className="form-select rounded-0" value={materialCategory} onChange={(e) => {
                        setMaterialCategory(e.target.value);
                        if (e.target.value !== "Other") setCustomMaterialCategory("");
                      }} required>
                        <option value="">Select Material Category</option>
                        <option value="Raw Material">Raw Material</option>
                        <option value="Finished Goods">Finished Goods</option>
                        <option value="Scrap Material">Scrap Material</option>
                        <option value="Service">Service</option>
                        <option value="Logistics">Logistics</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>

                  {/* Custom Material Category */}
                  {materialCategory === "Other" && (
                    <div className="col-12">
                      <div className="mb-3">
                        <label className="form-label label_text">Specify Material Category <RequiredStar /></label>
                        <input
                          type="text"
                          className="form-control rounded-0"
                          value={customMaterialCategory}
                          onChange={(e) => setCustomMaterialCategory(e.target.value)}
                          placeholder="Enter material category..."
                          required
                        />
                      </div>
                    </div>
                  )}

                  {/* Type of Vendor */}
                  <div className="col-12">
                    <div className="mb-3">
                      <label className="form-label label_text">Type of Vendor <RequiredStar /></label>
                      <select className="form-select rounded-0" value={typeOfVendor} onChange={(e) => setTypeOfVendor(e.target.value)} required>
                        <option value="">Select Vendor Type</option>
                        <option value="Import">Import</option>
                        <option value="B2B Material">B2B Material</option>
                        <option value="Labour Contractor">Labour Contractor</option>
                        <option value="Turnkey Contractor">Turnkey Contractor</option>
                        <option value="Logistics">Logistics</option>
                        <option value="Service">Service</option>
                        <option value="Freelancer">Freelancer</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>

                  {/* Custom Vendor Type */}
                  {typeOfVendor === "Other" && (
                    <div className="col-12">
                      <div className="mb-3">
                        <label className="form-label label_text">Specify Vendor Type <RequiredStar /></label>
                        <input type="text" className="form-control rounded-0" value={customVendorType} onChange={(e) => setCustomVendorType(e.target.value)} placeholder="Enter vendor type..." required />
                      </div>
                    </div>
                  )}

                  {/* Vendor Rating */}
                  <div className="col-12">
                    <div className="mb-3">
                      <label className="form-label label_text">Vendor Rating <RequiredStar /></label>
                      <div className="d-flex">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <span
                            key={star}
                            className={`fa fa-star ${star <= vendorRating ? 'text-warning' : 'text-secondary'} fs-4 me-1 cursor-pointer`}
                            onClick={() => handleRatingClick(star)}
                          ></span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Brands Work With */}
                  {typeOfVendor === "B2B Material" && (
                    <div className="col-12">
                      <div className="mb-3">
                        <label className="form-label label_text">Brands Name <RequiredStar /></label>
                        <div className="d-flex">
                          <select
                            className="form-select rounded-0 me-2"
                            value={brandsWorkWith}
                            onChange={(e) => {
                              if (e.target.value === "add_new") {
                                setShowAddBrandModal(true);
                              } else {
                                setBrandsWorkWith(e.target.value);
                              }
                            }}
                            required
                          >
                            <option value="">Select Brand</option>
                            {localBrands.map((brand, index) => (
                              <option key={index} value={brand}>{brand}</option>
                            ))}
                            <option value="add_new">Add New</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Vendor Name */}
                  <div className="col-12">
                    <div className="">
                      <label htmlFor="vendorName" className="form-label label_text">Vendor Name <RequiredStar /></label>
                      <input
                        type="text"
                        className="form-control rounded-0"
                        id="vendorName"
                        maxLength={300}
                        value={vendorName}
                        onChange={handleVendorNameChange}
                        placeholder="Enter Vendor Name...."
                        required
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div className="col-12 mt-3">
                    <div className="mb-3">
                      <label htmlFor="email" className="form-label label_text">Email <RequiredStar /></label>
                      <input
                        type="text"
                        maxLength={100}
                        className="form-control rounded-0"
                        id="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter Email or NA...."
                        required
                      />
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
                          <label htmlFor="vendorContactPersonName1" className="form-label label_text">
                            Contact Person Name 1 <RequiredStar />
                          </label>
                          <input
                            type="text"
                            maxLength={50}
                            className="form-control rounded-0"
                            id="vendorContactPersonName1"
                            value={vendorContactPersonName1}
                            onChange={handleContactPersonName1Change}
                            required
                          />
                        </div>
                      </div>

                      <div className="col-12 col-lg-6 mt-2">
                        <div className="mb-3">
                          <label htmlFor="vendorContactPersonName2" className="form-label label_text">
                            Contact Person Name 2
                          </label>
                          <input
                            type="text"
                            className="form-control rounded-0"
                            id="vendorContactPersonName2"
                            maxLength={50}
                            value={vendorContactPersonName2}
                            onChange={handleContactPersonName2Change}
                          />
                        </div>
                      </div>

                      <div className="col-12 col-lg-6 mt-2">
                        <div className="mb-3">
                          <label htmlFor="phoneNumber1" className="form-label label_text">
                            Contact Person No 1 <RequiredStar />
                          </label>
                          <input
                            type="tel"
                            pattern="[0-9]{10}"
                            className="form-control rounded-0"
                            id="phoneNumber1"
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
                          <label htmlFor="phoneNumber2" className="form-label label_text">
                            Contact Person No. 2
                          </label>
                          <input
                            type="tel"
                            pattern="[0-9]{10}"
                            maxLength={10}
                            className="form-control rounded-0"
                            id="phoneNumber2"
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

                  {/* Manual Address for Import */}
                  {typeOfVendor === "Import" && (
                    <div className="col-12 mt-2">
                      <div className="mb-3">
                        <label className="form-label label_text">Address <RequiredStar /></label>
                        <textarea
                          className="form-control rounded-0"
                          rows="3"
                          maxLength={500}
                          placeholder="Enter complete address..."
                          value={manualAddress}
                          onChange={(e) => setManualAddress(e.target.value)}
                          required
                        ></textarea>
                      </div>
                    </div>
                  )}

                  {/* Structured Address */}
                  {typeOfVendor !== "Import" && typeOfVendor !== "Other" && (
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
                            {isLoadingAddress && <small className="text-info">Loading address details...</small>}
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
                  )}

                  {/* GST Number */}
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

                  {/* Remarks */}
                  <div className="col-12 mt-3">
                    <div className="mb-3">
                      <label htmlFor="remarks" className="form-label label_text">Remarks</label>
                      <textarea
                        className="form-control rounded-0"
                        id="remarks"
                        rows="3"
                        maxLength={500}
                        placeholder="Enter any remarks or notes..."
                        value={remarks}
                        onChange={(e) => setRemarks(e.target.value)}
                      ></textarea>
                    </div>
                  </div>

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

      {showAddBrandModal && (
        <div
          className="modal fade show"
          style={{ display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#00000090" }}
        >
          <div className="modal-dialog modal-xl">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Add New Brand</h5>
                <button type="button" className="btn-close" onClick={() => setShowAddBrandModal(false)}></button>
              </div>
              <div className="modal-body">
                <div className="form-group">
                  <label>Brand Name <RequiredStar /></label>
                  <input
                    type="text"
                    className="form-control"
                    value={newBrand}
                    onChange={(e) => setNewBrand(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddBrandModal(false)}>Cancel</button>
                <button type="button" className="btn btn-primary" onClick={handleAddNewBrand}>Save</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AddVendorPopUp;