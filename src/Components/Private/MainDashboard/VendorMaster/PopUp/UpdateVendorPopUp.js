import { useState, useEffect } from "react";
import { updateVendor } from "../../../../../hooks/useVendor";
import { RequiredStar } from "../../../RequiredStar/RequiredStar";
import { getAddress } from "../../../../../hooks/usePincode";
import { toast } from "react-hot-toast";

const UpdateVendorPopUp = ({ handleUpdate, selectedVendor, brands, addBrand }) => {
  const [vendor, setVendor] = useState(selectedVendor || {});
  const [typeOfVendor, setTypeOfVendor] = useState((selectedVendor?.typeOfVendor || "").trim());
  const [materialCategory, setMaterialCategory] = useState(selectedVendor?.materialCategory || "");
  const [customMaterialCategory, setCustomMaterialCategory] = useState(selectedVendor?.customMaterialCategory || "");
  const [vendorRating, setVendorRating] = useState(selectedVendor?.vendorRating || 0);
  const [brandsWorkWith, setBrandsWorkWith] = useState(selectedVendor?.brandsWorkWith || "");
  const [customVendorType, setCustomVendorType] = useState(selectedVendor?.customVendorType || "");
  const [showAddBrandModal, setShowAddBrandModal] = useState(false);
  const [newBrand, setNewBrand] = useState("");
  const [localBrands, setLocalBrands] = useState([]);
  const [remarks, setRemarks] = useState(selectedVendor?.remarks || "");
  const [manualAddress, setManualAddress] = useState(selectedVendor?.manualAddress || "");
  // ✅ NEW FIELD
  const [vendorProducts, setVendorProducts] = useState(selectedVendor?.vendorProducts || "");

  const [billingAddress, setBillingAddress] = useState({
    add: selectedVendor?.billingAddress?.add || "",
    city: selectedVendor?.billingAddress?.city || "",
    state: selectedVendor?.billingAddress?.state || "",
    country: selectedVendor?.billingAddress?.country || "",
    pincode: selectedVendor?.billingAddress?.pincode || "",
  });

  const isEmptyOrWhitespace = (value) =>
    value === undefined || value === null || value.toString().trim() === '';

  const isValidPincode = (pincode) =>
    pincode && pincode.toString().trim() !== '' && !isNaN(pincode) && parseInt(pincode) > 0;

  useEffect(() => {
    const savedProductBrands = localStorage.getItem('productBrands');
    let productBrands = [];
    if (savedProductBrands) productBrands = JSON.parse(savedProductBrands);
    const allBrands = [...new Set([...productBrands, ...(brands || [])])];
    setLocalBrands(allBrands);
  }, [brands]);

  useEffect(() => {
    const fetchData = async () => {
      if (isValidPincode(billingAddress.pincode)) {
        const data = await getAddress(billingAddress.pincode);
        if (data !== "Error") {
          setBillingAddress(prev => ({
            ...prev,
            state: data.state,
            city: data.city,
            country: data.country
          }));
        }
      }
    };
    fetchData();
  }, [billingAddress.pincode]);

  useEffect(() => {
    if (selectedVendor) {
      setBillingAddress(selectedVendor.billingAddress || { add: "", city: "", state: "", country: "", pincode: "" });
      setTypeOfVendor((selectedVendor.typeOfVendor || "").trim());
      setMaterialCategory(selectedVendor.materialCategory || "");
      setCustomMaterialCategory(selectedVendor.customMaterialCategory || "");
      setVendorRating(selectedVendor.vendorRating || 0);
      setBrandsWorkWith(selectedVendor.brandsWorkWith || "");
      setCustomVendorType(selectedVendor.customVendorType || "");
      setRemarks(selectedVendor.remarks || "");
      setManualAddress(selectedVendor.manualAddress || "");
      // ✅ NEW FIELD
      setVendorProducts(selectedVendor.vendorProducts || "");
      setVendor(selectedVendor);
    }
  }, [selectedVendor]);

  const handleBillingChange = (e) => {
    const { name, value } = e.target;
    setBillingAddress({ ...billingAddress, [name]: name === 'pincode' ? value : value.trim() });
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setVendor((prev) => ({ ...prev, [name]: value.trim() }));
  };

  const handleRatingClick = (rating) => setVendorRating(rating);

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

  const handleVendorUpdate = async (e) => {
    e.preventDefault();

    const updatedVendor = {
      ...vendor,
      typeOfVendor,
      materialCategory,
      customMaterialCategory: materialCategory === "Other" ? customMaterialCategory : "",
      vendorRating,
      brandsWorkWith: typeOfVendor === "B2B Material" ? brandsWorkWith : "",
      billingAddress: (typeOfVendor !== "Import" && typeOfVendor !== "Other")
        ? billingAddress
        : { add: "Not applicable for this vendor type" },
      customVendorType: typeOfVendor === "Other" ? customVendorType : "",
      remarks,
      manualAddress: typeOfVendor === "Import" ? manualAddress : "",
      // ✅ NEW FIELD
      vendorProducts,
    };

    if (
      isEmptyOrWhitespace(updatedVendor.vendorName) ||
      isEmptyOrWhitespace(updatedVendor.typeOfVendor) ||
      isEmptyOrWhitespace(updatedVendor.materialCategory) ||
      (materialCategory === "Other" && isEmptyOrWhitespace(customMaterialCategory)) ||
      isEmptyOrWhitespace(updatedVendor.phoneNumber1) ||
      isEmptyOrWhitespace(updatedVendor.email) ||
      isEmptyOrWhitespace(updatedVendor.vendorContactPersonName1) ||
      (typeOfVendor === "Other" && isEmptyOrWhitespace(customVendorType)) ||
      (typeOfVendor === "Import" && isEmptyOrWhitespace(manualAddress)) ||
      ((typeOfVendor !== "Import" && typeOfVendor !== "Other") && (
        !isValidPincode(updatedVendor.billingAddress.pincode) ||
        isEmptyOrWhitespace(updatedVendor.billingAddress.state) ||
        isEmptyOrWhitespace(updatedVendor.billingAddress.city) ||
        isEmptyOrWhitespace(updatedVendor.billingAddress.add)
      )) ||
      isEmptyOrWhitespace(updatedVendor.GSTNo) ||
      (typeOfVendor === "B2B Material" && isEmptyOrWhitespace(brandsWorkWith))
    ) {
      toast.error("All fields are required");
      return;
    }

    if (!/^\d{10}$/.test(updatedVendor.phoneNumber1)) {
      toast.error("Enter a valid 10-digit phone number");
      return;
    }

    if (updatedVendor.phoneNumber2 && !/^\d{10}$/.test(updatedVendor.phoneNumber2)) {
      toast.error("Enter a valid 10-digit phone number for Contact Person 2");
      return;
    }

    try {
      toast.loading("Updating Vendor.....");
      const data = await updateVendor(updatedVendor);
      toast.dismiss();
      if (data.success) {
        toast.success(data.message);
        handleUpdate();
      } else {
        toast.error(data.error || "Failed to update vendor");
      }
    } catch (error) {
      toast.error("Error updating vendor");
      console.error("Update error:", error);
    }
  };

  return (
    <>
      <div
        className="modal fade show"
        style={{ display: "flex", alignItems: "center", backgroundColor: "#00000090" }}
      >
        <div className="modal-dialog modal-lg">
          <div className="modal-content p-3">
            <form onSubmit={handleVendorUpdate}>
              <div className="modal-header pt-0">
                <h5 className="card-title fw-bold">Update Vendor</h5>
                <button onClick={() => handleUpdate()} type="button" className="close px-3" style={{ marginLeft: "auto" }}>
                  <span aria-hidden="true">&times;</span>
                </button>
              </div>
              <div className="modal-body">
                <div className="row modal_body_height">

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

                  <div className="col-12">
                    <div className="mb-3">
                      <label className="form-label label_text">Type of Vendor <RequiredStar /></label>
                      <select className="form-select rounded-0" value={typeOfVendor} onChange={(e) => setTypeOfVendor(e.target.value.trim())} required>
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

                  {typeOfVendor === "Other" && (
                    <div className="col-12">
                      <div className="mb-3">
                        <label className="form-label label_text">Specify Vendor Type <RequiredStar /></label>
                        <input type="text" className="form-control rounded-0" value={customVendorType} onChange={(e) => setCustomVendorType(e.target.value)} placeholder="Enter vendor type..." required />
                      </div>
                    </div>
                  )}

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

                  {typeOfVendor === "B2B Material" && (
                    <div className="col-12">
                      <div className="mb-3">
                        <label className="form-label label_text">Brands Work With <RequiredStar /></label>
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

                  <div className="col-12">
                    <div className="">
                      <label htmlFor="vendorName" className="form-label label_text">Vendor Name <RequiredStar /></label>
                      <input
                        type="text"
                        className="form-control rounded-0"
                        id="vendorName"
                        maxLength={300}
                        placeholder="Update Vendor Name...."
                        name="vendorName"
                        value={vendor?.vendorName || ""}
                        onChange={handleChange}
                        required
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div className="col-12 mt-3">
                    <div className="mb-3">
                      <label htmlFor="Email" className="form-label label_text">Email <RequiredStar /></label>
                      <input
                        type="text"
                        name="email"
                        maxLength={100}
                        placeholder="Update Email or NA...."
                        className="form-control rounded-0"
                        id="Email"
                        value={vendor?.email || ""}
                        onChange={handleChange}
                        required
                      />
                    </div>
                  </div>

                  <div className="col-12 mt-2">
                    <div className="row border bg-gray mx-auto">
                      <div className="col-10 mb-3">
                        <span className="SecondaryInfo">Contact Information</span>
                      </div>

                      <div className="col-12 col-lg-6 mt-2">
                        <div className="mb-3">
                          <label htmlFor="vendorContactPersonName1" className="form-label label_text">
                            Contact Person 1 <RequiredStar />
                          </label>
                          <input
                            type="text"
                            className="form-control rounded-0"
                            id="vendorContactPersonName1"
                            maxLength={100}
                            name="vendorContactPersonName1"
                            onChange={handleChange}
                            value={vendor?.vendorContactPersonName1 || ""}
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
                            maxLength={10}
                            className="form-control rounded-0"
                            id="phoneNumber1"
                            name="phoneNumber1"
                            onChange={handleChange}
                            value={vendor?.phoneNumber1 || ""}
                            required
                          />
                        </div>
                      </div>

                      <div className="col-12 col-lg-6 mt-2">
                        <div className="mb-3">
                          <label htmlFor="vendorContactPersonName2" className="form-label label_text">
                            Contact Person 2
                          </label>
                          <input
                            type="text"
                            className="form-control rounded-0"
                            id="vendorContactPersonName2"
                            maxLength={100}
                            name="vendorContactPersonName2"
                            onChange={handleChange}
                            value={vendor?.vendorContactPersonName2 || ""}
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
                            maxLength={10}
                            className="form-control rounded-0"
                            id="phoneNumber2"
                            onChange={handleChange}
                            name="phoneNumber2"
                            value={vendor?.phoneNumber2 || ""}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

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

                  {typeOfVendor !== "Import" && (
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
                              name="pincode"
                              onChange={handleBillingChange}
                              value={billingAddress?.pincode || ""}
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
                              name="state"
                              maxLength={50}
                              onChange={handleBillingChange}
                              value={billingAddress?.state || ""}
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
                              name="city"
                              maxLength={50}
                              onChange={handleBillingChange}
                              value={billingAddress?.city || ""}
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
                              name="country"
                              maxLength={50}
                              onChange={handleBillingChange}
                              value={billingAddress?.country || ""}
                            />
                          </div>
                        </div>

                        <div className="col-12 col-lg-12 mt-2">
                          <div className="mb-3">
                            <textarea
                              className="textarea_edit col-12"
                              name="add"
                              maxLength={500}
                              placeholder="House NO., Building Name, Road Name, Area, Colony"
                              onChange={handleBillingChange}
                              value={billingAddress?.add || ""}
                              rows="2"
                              required
                            ></textarea>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="col-12 col-lg-6 mt-2">
                    <div className="">
                      <label htmlFor="GSTNo" className="form-label label_text">GST Number <RequiredStar /></label>
                      <input
                        type="text"
                        className="form-control rounded-0"
                        id="GSTNo"
                        placeholder="Update GST Number...."
                        maxLength={15}
                        name="GSTNo"
                        onChange={handleChange}
                        value={vendor?.GSTNo || ""}
                        required
                      />
                    </div>
                  </div>

                  {/* ✅ NEW: Vendor Products Field */}
                  <div className="col-12 mt-3">
                    <div className="mb-3">
                      <label htmlFor="vendorProductsUpdate" className="form-label label_text">
                        Vendor Products / Services
                      </label>
                      <textarea
                        className="form-control rounded-0"
                        id="vendorProductsUpdate"
                        rows="3"
                        maxLength={1000}
                        placeholder="Enter products or services offered by this vendor (e.g. Steel Rods, Cement, Electrical Fittings...)"
                        value={vendorProducts}
                        onChange={(e) => setVendorProducts(e.target.value)}
                      ></textarea>
                      <small className="text-muted">List the main products/services this vendor supplies</small>
                    </div>
                  </div>

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

      {showAddBrandModal && (
        <div
          className="modal fade show d-flex align-items-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)', position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 1050 }}
        >
          <div className="modal-dialog" style={{ maxWidth: '500px', margin: '1.75rem auto' }}>
            <div className="modal-content">
              <div className="modal-header d-flex justify-content-between align-items-center">
                <h5 className="modal-title mb-0">Add New Brand</h5>
                <button type="button" className="btn-close" onClick={() => setShowAddBrandModal(false)} aria-label="Close"></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label htmlFor="brandName" className="form-label">Brand Name <RequiredStar /></label>
                  <input
                    type="text"
                    className="form-control"
                    id="brandName"
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

export default UpdateVendorPopUp;