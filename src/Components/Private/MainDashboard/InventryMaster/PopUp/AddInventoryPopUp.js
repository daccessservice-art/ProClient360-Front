import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

const AddInventoryPopup = ({ onAddInventory, onClose }) => {
  // State variables from AddInventoryPopup
  const [formData, setFormData] = useState({
    materialCode: '',
    materialName: '',
    category: 'Raw Material', // Make sure this matches the enum values
    unitPrice: '',
    currentStock: '',
    minStockLevel: '',
    warehouseLocation: '',
    stockLocation: '',
    openingDate: new Date().toISOString().split('T')[0], // New field for opening date
    description: ''
  });

  // State variables from AddProductPopUp
  const [productName, setProductName] = useState("");
  const [brandName, setBrandName] = useState("");
  const [model, setModel] = useState("");
  const [hsnCode, setHsnCode] = useState("");
  const [productCategory, setProductCategory] = useState("");
  const [baseUOM, setBaseUOM] = useState("");
  const [uomConversion, setUomConversion] = useState(1);
  const [category, setCategory] = useState("Raw Material"); // Set default value to match enum
  const [mrp, setMrp] = useState("");
  const [salesPrice, setSalesPrice] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [minQtyLevel, setMinQtyLevel] = useState("");
  const [discountType, setDiscountType] = useState("Zero Discount");
  const [discountValue, setDiscountValue] = useState("");
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [showAddBrand, setShowAddBrand] = useState(false);
  const [newBrand, setNewBrand] = useState("");
  
  // State variables for GST
  const [taxType, setTaxType] = useState("none");
  const [gstRate, setGstRate] = useState("");
  const [gstEffectiveDate, setGstEffectiveDate] = useState("");

  // State for brands and categories
  const [allBrands, setAllBrands] = useState([]);
  const [allCategories, setAllCategories] = useState([]);

  const categories = ['Raw Material', 'Finished Goods', 'Repairing Material', 'Scrap', 'Asset']; // Added 'Asset'
  const uomOptions = ["bags", "litre", "brass", "kilogram", "gram", "meter", "piece", "box", "carton"];
  
  // Category options - added "Asset"
  const categoryOptions = [
    { value: "Raw Material", label: "Raw Material" }, // Make sure value matches enum exactly
    { value: "Finished Goods", label: "Finished Goods" },
    { value: "Repairing Material", label: "Repairing Material" },
    { value: "Scrap", label: "Scrap" },
    { value: "Asset", label: "Asset" } // New option
  ];

  // Initialize brands and categories from localStorage or defaults
  useEffect(() => {
    const savedBrands = localStorage.getItem('productBrands');
    if (savedBrands) {
      setAllBrands(JSON.parse(savedBrands));
    } else {
      setAllBrands(["Apple", "Samsung", "Sony", "LG", "Microsoft", "Dell"]);
    }

    // Load categories from localStorage or use props/defaults
    const savedCategories = localStorage.getItem('productCategories');
    if (savedCategories) {
      setAllCategories(JSON.parse(savedCategories));
    } else {
      setAllCategories(["Electronics", "Clothing", "Food", "Furniture", "Stationery", "Tools"]);
    }
  }, []);

  // Save brands to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('productBrands', JSON.stringify(allBrands));
  }, [allBrands]);

  // Save categories to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('productCategories', JSON.stringify(allCategories));
  }, [allCategories]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Make sure the category value is one of the allowed enum values
    const validCategory = categories.includes(category) ? category : 'Raw Material';

    // Combine all data into a single object with timestamp
    const combinedData = {
      // AddInventoryPopup data
      ...formData,
      category: validCategory, // Ensure category is valid
      
      // AddProductPopUp data
      productName,
      brandName,
      model,
      hsnCode,
      productCategory,
      baseUOM,
      uomConversion: parseFloat(uomConversion) || 1,
      category: validCategory, // Use the validated category
      mrp: parseFloat(mrp) || 0,
      salesPrice: parseFloat(salesPrice) || 0,
      purchasePrice: parseFloat(purchasePrice) || 0,
      minQtyLevel: parseFloat(minQtyLevel) || 0,
      discountType,
      discountValue: discountType === "Zero Discount" ? 0 : parseFloat(discountValue) || 0,
      // Add GST data
      taxType,
      gstRate: taxType === "gst" ? parseFloat(gstRate) || 0 : 0,
      gstEffectiveDate: taxType === "gst" ? gstEffectiveDate : "",
      // Add timestamp
      createdAt: new Date().toISOString(),
    };

    onAddInventory(combinedData);
  };

  const handleAddNewCategory = () => {
    if (newCategory.trim()) {
      // Check if category already exists
      if (allCategories.includes(newCategory.trim())) {
        toast.error("Category already exists");
        return;
      }
      
      // Add the new category to the local state
      const updatedCategories = [...allCategories, newCategory.trim()];
      setAllCategories(updatedCategories);
      
      // Set the product category to the newly added category
      setProductCategory(newCategory.trim());
      
      // Reset the new category input and close the popup
      setNewCategory("");
      setShowAddCategory(false);
      
      toast.success("New category added successfully");
    } else {
      toast.error("Please enter a category name");
    }
  };

  const handleAddNewBrand = () => {
    if (newBrand.trim()) {
      // Check if brand already exists
      if (allBrands.includes(newBrand.trim())) {
        toast.error("Brand already exists");
        return;
      }
      
      // Add the new brand to the local state
      const updatedBrands = [...allBrands, newBrand.trim()];
      setAllBrands(updatedBrands);
      
      // Set the brand name to the newly added brand
      setBrandName(newBrand.trim());
      
      // Reset the new brand input and close the popup
      setNewBrand("");
      setShowAddBrand(false);
      
      toast.success("New brand added successfully");
    } else {
      toast.error("Please enter a brand name");
    }
  };

  // Input handlers for AddProductPopUp fields
  const handleProductNameChange = (e) => {
    const value = e.target.value;
    if (/^[a-zA-Z0-9\s]*$/.test(value)) {
      setProductName(value);
    }
  };

  const handleBrandNameChange = (e) => {
    const value = e.target.value;
    setBrandName(value);
  };

  const handleModelChange = (e) => {
    const value = e.target.value;
    // Removed the regex restriction to allow special characters
    // Previously: if (/^[a-zA-Z0-9\s]*$/.test(value)) {
    // Now: Allow all characters including special characters
    setModel(value);
  };

  const handleHsnCodeChange = (e) => {
    const value = e.target.value;
    if (/^\d{0,8}$/.test(value)) {
      setHsnCode(value);
    }
  };

  const handleMrpChange = (e) => {
    const value = e.target.value;
    if (/^\d*\.?\d{0,2}$/.test(value)) {
      setMrp(value);
    }
  };

  const handleSalesPriceChange = (e) => {
    const value = e.target.value;
    if (/^\d*\.?\d{0,2}$/.test(value)) {
      setSalesPrice(value);
    }
  };

  const handlePurchasePriceChange = (e) => {
    const value = e.target.value;
    if (/^\d*\.?\d{0,2}$/.test(value)) {
      setPurchasePrice(value);
    }
  };

  const handleMinQtyLevelChange = (e) => {
    const value = e.target.value;
    if (/^\d*\.?\d{0,2}$/.test(value)) {
      setMinQtyLevel(value);
    }
  };

  const handleDiscountValueChange = (e) => {
    const value = e.target.value;
    if (/^\d*\.?\d{0,2}$/.test(value)) {
      setDiscountValue(value);
    }
  };

  const handleUomConversionChange = (e) => {
    const value = e.target.value;
    if (/^\d*\.?\d{0,4}$/.test(value)) {
      setUomConversion(value);
    }
  };

  // Handler for GST field
  const handleGstRateChange = (e) => {
    const value = e.target.value;
    if (/^\d*\.?\d{0,2}$/.test(value)) {
      setGstRate(value);
    }
  };

  return (
    <>
      <div className="modal fade show" style={{ display: "flex", alignItems: "center", backgroundColor: "#00000090" }}>
        <div className="modal-dialog modal-xl">
          <div className="modal-content p-3">
            <form onSubmit={handleSubmit}>
              <div className="modal-header pt-0">
                <h5 className="card-title fw-bold">Add Product</h5>
                <button onClick={onClose} type="button" className="btn-close" aria-label="Close" style={{ backgroundColor: 'red' }}></button>
              </div>

              <div className="modal-body" style={{ maxHeight: 'calc(80vh - 240px)', overflowY: 'auto' }}>
                <div className="row g-3">
                  

                  {/* Brand Name */}
                  <div className="col-md-6">
                    <label htmlFor="brandName" className="form-label">Brand Name</label>
                    <div className="input-group">
                      <select
                        className="form-select rounded-0"
                        id="brandName"
                        value={brandName}
                        onChange={handleBrandNameChange}
                      >
                        <option value="">Select Brand</option>
                        {allBrands.map((brand, index) => (
                          <option key={index} value={brand}>{brand}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className="btn btn-outline-secondary"
                        onClick={() => setShowAddBrand(true)}
                      >
                        <i className="fa-solid fa-plus"></i>
                      </button>
                    </div>
                  </div>

                  {/* Product Name */}
                  <div className="col-md-6">
                    <label htmlFor="productName" className="form-label">Product Name</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      id="productName" 
                      name="productName" 
                      placeholder="Enter Product Name...." 
                      maxLength={100} 
                      value={productName} 
                      onChange={handleProductNameChange} 
                    />
                  </div>

                  {/* Material Code */}
                  <div className="col-md-6">
                    <label htmlFor="materialCode" className="form-label">Material Code</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      id="materialCode" 
                      name="materialCode" 
                      placeholder="Enter Material Code...." 
                      maxLength={50} 
                      value={formData.materialCode} 
                      onChange={handleInputChange} 
                    />
                  </div>

                  {/* Model - Updated to allow special characters */}
                  <div className="col-md-6">
                    <label htmlFor="model" className="form-label">Model</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      id="model" 
                      name="model" 
                      placeholder="Enter Model...." 
                      maxLength={100} 
                      value={model} 
                      onChange={handleModelChange} 
                    />
                  </div>

                  {/* HSN Code */}
                  <div className="col-md-6">
                    <label htmlFor="hsnCode" className="form-label">HSN Code</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      id="hsnCode" 
                      name="hsnCode" 
                      placeholder="Enter HSN Code...." 
                      maxLength={8} 
                      value={hsnCode} 
                      onChange={handleHsnCodeChange} 
                    />
                  </div>

                  {/* Material Description */}
                  <div className="col-md-6">
                    <label htmlFor="materialName" className="form-label">
                      Material Description
                    </label>

                    <textarea
                      className="form-control"
                      id="materialName"
                      name="materialName"
                      placeholder="Enter Material Description...."
                      maxLength={100}
                      rows={3}
                      value={formData.materialName}
                      onChange={handleInputChange}
                    />
                  </div>

                  {/* Product Category */}
                  <div className="col-md-6">
                    <label htmlFor="productCategory" className="form-label">Product Category</label>
                    <div className="input-group">
                      <select
                        className="form-select rounded-0"
                        id="productCategory"
                        value={productCategory}
                        onChange={(e) => setProductCategory(e.target.value)}
                      >
                        <option value="">Select Product Category</option>
                        {allCategories.map((cat, index) => (
                          <option key={index} value={cat}>{cat}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className="btn btn-outline-secondary"
                        onClick={() => setShowAddCategory(true)}
                      >
                        <i className="fa-solid fa-plus"></i>
                      </button>
                    </div>
                  </div>

                  {/* Category (Product Group) */}
                  <div className="col-md-6">
                    <label htmlFor="category" className="form-label">Product Group</label>
                    <select
                      className="form-select rounded-0"
                      id="category"
                      name="category"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                    >
                      {categoryOptions.map((option, index) => (
                        <option key={index} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Base UOM */}
                  <div className="col-md-6">
                    <label htmlFor="baseUOM" className="form-label">Base UOM / UNIT</label>
                    <select
                      className="form-select rounded-0"
                      id="baseUOM"
                      value={baseUOM}
                      onChange={(e) => setBaseUOM(e.target.value)}
                    >
                      <option value="">Select Base UOM</option>
                      {uomOptions.map((uom, index) => (
                        <option key={index} value={uom}>{uom}</option>
                      ))}
                    </select>
                  </div>

                  {/* UOM Conversion */}
                  <div className="col-md-6">
                    <label htmlFor="uomConversion" className="form-label">UOM Conversion</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      id="uomConversion" 
                      name="uomConversion" 
                      placeholder="Enter UOM conversion factor" 
                      value={uomConversion} 
                      onChange={handleUomConversionChange} 
                    />
                  </div>

                  {/* Purchase Price */}
                  <div className="col-md-6">
                    <label htmlFor="unitPrice" className="form-label">Purchase Price </label>
                    <input 
                      type="number" 
                      className="form-control" 
                      id="unitPrice" 
                      name="unitPrice" 
                      placeholder="Enter Purchase Price...." 
                      min="0"
                      step="0.01"
                      value={formData.unitPrice} 
                      onChange={handleInputChange} 
                    />
                  </div>

                  {/* MRP Price */}
                  <div className="col-md-6">
                    <label htmlFor="mrp" className="form-label">MRP Price</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      id="mrp" 
                      name="mrp" 
                      placeholder="Enter MRP Price...." 
                      value={mrp} 
                      onChange={handleMrpChange} 
                    />
                  </div>

                  {/* Sales Price */}
                  <div className="col-md-6">
                    <label htmlFor="salesPrice" className="form-label">Sales Price</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      id="salesPrice" 
                      name="salesPrice" 
                      placeholder="Enter Sales Price...." 
                      value={salesPrice} 
                      onChange={handleSalesPriceChange} 
                    />
                  </div>

                  {/* Opening Date - New Field */}
                  <div className="col-md-6">
                    <label htmlFor="openingDate" className="form-label">Opening Date</label>
                    <input 
                      type="date" 
                      className="form-control" 
                      id="openingDate" 
                      name="openingDate" 
                      value={formData.openingDate} 
                      onChange={handleInputChange} 
                    />
                  </div>

                  {/* Current Stock */}
                  <div className="col-md-6">
                    <label htmlFor="currentStock" className="form-label">Opening Stock</label>
                    <input 
                      type="number" 
                      className="form-control" 
                      id="currentStock" 
                      name="currentStock" 
                      placeholder="Enter Opening Stock...." 
                      min="0"
                      value={formData.currentStock} 
                      onChange={handleInputChange} 
                    />
                  </div>

                  {/* Min Stock Level */}
                  <div className="col-md-6">
                    <label htmlFor="minStockLevel" className="form-label">Min Stock Level</label>
                    <input 
                      type="number" 
                      className="form-control" 
                      id="minStockLevel" 
                      name="minStockLevel" 
                      placeholder="Enter Min Stock Level...." 
                      min="0"
                      value={formData.minStockLevel} 
                      onChange={handleInputChange} 
                    />
                  </div>

                  {/* Warehouse Location */}
                  <div className="col-md-6">
                    <label htmlFor="warehouseLocation" className="form-label">Warehouse Location</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      id="warehouseLocation" 
                      name="warehouseLocation" 
                      placeholder="e.g., Warehouse A..." 
                      maxLength={100} 
                      value={formData.warehouseLocation} 
                      onChange={handleInputChange} 
                    />
                  </div>

                  {/* Rack Location */}
                  <div className="col-md-6">
                    <label htmlFor="stockLocation" className="form-label">Rack Location</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      id="stockLocation" 
                      name="stockLocation" 
                      placeholder="e.g., Rack 1..." 
                      maxLength={100} 
                      value={formData.stockLocation} 
                      onChange={handleInputChange} 
                    />
                  </div>

                  {/* Discount Type */}
                  <div className="col-md-6">
                    <label htmlFor="discountType" className="form-label">Discount Type</label>
                    <select
                      className="form-select rounded-0"
                      id="discountType"
                      value={discountType}
                      onChange={(e) => setDiscountType(e.target.value)}
                    >
                      <option value="Zero Discount">Zero Discount</option>
                      <option value="In percentage">In Percentage</option>
                      <option value="In Value">In Value</option>
                    </select>
                  </div>

                  {/* Discount Value */}
                  {discountType !== "Zero Discount" && (
                    <div className="col-md-6">
                      <label htmlFor="discountValue" className="form-label">Discount</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        id="discountValue" 
                        name="discountValue" 
                        placeholder={discountType === "In percentage" ? "Enter percentage" : "Enter value"}
                        value={discountValue} 
                        onChange={handleDiscountValueChange} 
                      />
                    </div>
                  )}

                  {/* Tax Details Section */}
                  <div className="col-12 mt-3">
                    <div className="border bg-gray mx-auto p-3">
                      <div className="col-10 mb-3">
                        <span className="SecondaryInfo">Tax Details</span>
                      </div>
                      
                      <div className="col-12 mb-3">
                        <div className="form-check form-check-inline">
                          <input
                            className="form-check-input"
                            type="radio"
                            name="taxType"
                            id="taxNone"
                            value="none"
                            checked={taxType === "none"}
                            onChange={() => setTaxType("none")}
                          />
                          <label className="form-check-label" htmlFor="taxNone">
                            No Tax
                          </label>
                        </div>
                        <div className="form-check form-check-inline">
                          <input
                            className="form-check-input"
                            type="radio"
                            name="taxType"
                            id="taxGST"
                            value="gst"
                            checked={taxType === "gst"}
                            onChange={() => setTaxType("gst")}
                          />
                          <label className="form-check-label" htmlFor="taxGST">
                            Add GST Rate
                          </label>
                        </div>
                      </div>

                      {/* GST Fields */}
                      {taxType === "gst" && (
                        <div className="row">
                          <div className="col-12 col-lg-6 mt-2">
                            <div className="mb-3">
                              <label htmlFor="gstRate" className="form-label label_text">
                                GST Rate
                              </label>
                              <div className="input-group">
                                <input
                                  type="text"
                                  className="form-control rounded-0"
                                  id="gstRate"
                                  value={gstRate}
                                  onChange={handleGstRateChange}
                                  placeholder="Enter GST Rate"
                                />
                                <span className="input-group-text">%</span>
                              </div>
                            </div>
                          </div>

                          <div className="col-12 col-lg-6 mt-2">
                            <div className="mb-3">
                              <label htmlFor="gstEffectiveDate" className="form-label label_text">
                                GST Effective Date
                              </label>
                              <input
                                type="date"
                                className="form-control rounded-0"
                                id="gstEffectiveDate"
                                value={gstEffectiveDate}
                                onChange={(e) => setGstEffectiveDate(e.target.value)}
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  <div className="col-12">
                    <label htmlFor="description" className="form-label">Description / Remarks</label>
                    <textarea
                      className="form-control"
                      id="description"
                      name="description"
                      placeholder="Enter material description, specifications, or remarks...."
                      value={formData.description}
                      onChange={handleInputChange}
                      style={{ width: '100%', height: '100px' }}
                      maxLength={500}
                    />
                  </div>

                </div>
              </div>
              
              <div className="modal-footer border-0 justify-content-start">
                <button type="submit" className="btn addbtn rounded-0 add_button px-4">Add</button>
                <button type="button" className="btn addbtn rounded-0 Cancel_button px-4" onClick={onClose}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Add Category Modal */}
      {showAddCategory && (
        <div className="modal fade show" style={{ display: "block", backgroundColor: "#00000050", position: "absolute", zIndex: 9999, width: "100%" }}>
          <div className="modal-dialog modal-sm">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Add New Category</h5>
                <button type="button" className="btn-close" onClick={() => setShowAddCategory(false)}></button>
              </div>
              <div className="modal-body">
                <input
                  type="text"
                  className="form-control"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  placeholder="Enter new category"
                />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddCategory(false)}>
                  Cancel
                </button>
                <button type="button" className="btn btn-primary" onClick={handleAddNewCategory}>
                  Add
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Brand Modal */}
      {showAddBrand && (
        <div className="modal fade show" style={{ display: "block", backgroundColor: "#00000050", position: "absolute", zIndex: 9999, width: "100%" }}>
          <div className="modal-dialog modal-sm">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Add New Brand</h5>
                <button type="button" className="btn-close" onClick={() => setShowAddBrand(false)}></button>
              </div>
              <div className="modal-body">
                <input
                  type="text"
                  className="form-control"
                  value={newBrand}
                  onChange={(e) => setNewBrand(e.target.value)}
                  placeholder="Enter new brand"
                />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddBrand(false)}>
                  Cancel
                </button>
                <button type="button" className="btn btn-primary" onClick={handleAddNewBrand}>
                  Add
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AddInventoryPopup;