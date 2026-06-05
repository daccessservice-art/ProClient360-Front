import { useState, useEffect } from "react";
import validator from "validator";
import toast from "react-hot-toast";
import { RequiredStar } from "../../../RequiredStar/RequiredStar";
import { createProduct } from "../../../../../hooks/useProduct";

const AddProductPopUp = ({ handleAdd, categories = [] }) => {
  const [productName, setProductName] = useState("");
  const [brandName, setBrandName] = useState("");
  const [printName, setPrintName] = useState("");
  const [aliasName, setAliasName] = useState("");
  const [model, setModel] = useState("");
  const [hsnCode, setHsnCode] = useState("");
  const [description, setDescription] = useState("");
  const [productCategory, setProductCategory] = useState("");
  const [baseUOM, setBaseUOM] = useState("");
  const [alternateUOM, setAlternateUOM] = useState("");
  const [uomConversion, setUomConversion] = useState(1);
  const [category, setCategory] = useState("");
  const [mrp, setMrp] = useState("");
  const [salesPrice, setSalesPrice] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [minSalesPrice, setMinSalesPrice] = useState("");
  const [minQtyLevel, setMinQtyLevel] = useState("");
  const [discountType, setDiscountType] = useState("Zero Discount");
  const [discountValue, setDiscountValue] = useState("");
  const [currentStockQty, setCurrentStockQty] = useState("");
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [showAddBrand, setShowAddBrand] = useState(false);
  const [newBrand, setNewBrand] = useState("");

  // GST and CESS
  const [taxType, setTaxType] = useState("none");
  const [gstRate, setGstRate] = useState("");
  const [gstEffectiveDate, setGstEffectiveDate] = useState("");
  const [cessPercentage, setCessPercentage] = useState("");
  const [cessAmount, setCessAmount] = useState("");

  const uomOptions = ["bags", "litre", "brass", "kilogram", "gram", "meter", "piece", "box", "carton", "nos"];

  const categoryOptions = [
    { value: "raw material", label: "Raw Material" },
    { value: "finish material", label: "Finish Material" },
    { value: "finished goods", label: "Finished Goods" },
    { value: "scrap", label: "Scrap" },
    { value: "repairing material", label: "Repairing Material" },
    { value: "work in progress", label: "Work in Progress" }
  ];

  const [allBrands, setAllBrands] = useState([]);
  const [allCategories, setAllCategories] = useState([]);

  // ── Load brands & categories from localStorage ──
  useEffect(() => {
    const savedBrands = localStorage.getItem('productBrands');
    if (savedBrands) {
      setAllBrands(JSON.parse(savedBrands));
    } else {
      setAllBrands(["Apple", "Samsung", "Sony", "LG", "Microsoft", "Dell"]);
    }

    const savedCategories = localStorage.getItem('productCategories');
    if (savedCategories) {
      setAllCategories(JSON.parse(savedCategories));
    } else if (categories.length > 0) {
      setAllCategories(categories);
    } else {
      setAllCategories(["Electronics", "Clothing", "Food", "Furniture", "Stationery", "Tools"]);
    }
  }, [categories]);

  // ── Persist brands to localStorage ──
  useEffect(() => {
    if (allBrands.length > 0) {
      localStorage.setItem('productBrands', JSON.stringify(allBrands));
    }
  }, [allBrands]);

  // ── Persist categories to localStorage ──
  useEffect(() => {
    if (allCategories.length > 0) {
      localStorage.setItem('productCategories', JSON.stringify(allCategories));
    }
  }, [allCategories]);

  const handleProductAdd = async (event) => {
    event.preventDefault();

    if (!category) {
      return toast.error("Please select a Category");
    }

    const productData = {
      productName,
      brandName,
      printName,
      aliasName,
      model,
      hsnCode,
      description,
      productCategory,
      baseUOM,
      alternateUOM,
      uomConversion: parseFloat(uomConversion) || 1,
      category,
      mrp: parseFloat(mrp) || 0,
      salesPrice: parseFloat(salesPrice) || 0,
      purchasePrice: parseFloat(purchasePrice) || 0,
      minSalesPrice: parseFloat(minSalesPrice) || 0,
      minQtyLevel: parseFloat(minQtyLevel) || 0,
      discountType,
      discountValue: discountType === "Zero Discount" ? 0 : parseFloat(discountValue) || 0,
      currentStockQty: parseFloat(currentStockQty) || 0,
      taxType,
      gstRate: taxType === "gst" ? parseFloat(gstRate) || 0 : 0,
      gstEffectiveDate: taxType === "gst" ? gstEffectiveDate : "",
      cessPercentage: taxType === "cess" ? parseFloat(cessPercentage) || 0 : 0,
      cessAmount: taxType === "cess" ? parseFloat(cessAmount) || 0 : 0,
    };

    if (!productName || !baseUOM) {
      return toast.error("Product Name and Base UOM are required fields");
    }

    if (mrp && isNaN(mrp)) return toast.error("MRP must be a valid number");
    if (salesPrice && isNaN(salesPrice)) return toast.error("Sales Price must be a valid number");
    if (purchasePrice && isNaN(purchasePrice)) return toast.error("Purchase Price must be a valid number");
    if (minSalesPrice && isNaN(minSalesPrice)) return toast.error("Min Sales Price must be a valid number");
    if (minQtyLevel && isNaN(minQtyLevel)) return toast.error("Min Qty Level must be a valid number");
    if (uomConversion && isNaN(uomConversion)) return toast.error("UOM Conversion must be a valid number");
    if (currentStockQty && isNaN(currentStockQty)) return toast.error("Current Stock Qty must be a valid number");

    if (parseFloat(mrp) < parseFloat(salesPrice)) {
      return toast.error("MRP must be greater than or equal to sales price");
    }

    if (parseFloat(salesPrice) < parseFloat(minSalesPrice)) {
      return toast.error("Sales price must be greater than or equal to minimum sales price");
    }

    if (discountType !== "Zero Discount" && (!discountValue || isNaN(discountValue))) {
      return toast.error("Please enter a valid discount value");
    }

    if (taxType === "gst" && (!gstRate || isNaN(gstRate) || !gstEffectiveDate)) {
      return toast.error("Please enter valid GST Rate and GST Effective Date");
    }

    if (taxType === "cess" && (!cessPercentage || isNaN(cessPercentage)) && (!cessAmount || isNaN(cessAmount))) {
      return toast.error("Please enter either CESS Percentage or CESS Amount");
    }

    // ── FIX: Ensure selected brand is saved to localStorage for future updates ──
    if (brandName && !allBrands.includes(brandName)) {
      const updatedBrands = [...allBrands, brandName];
      setAllBrands(updatedBrands);
    }

    // ── FIX: Ensure selected category is saved to localStorage for future updates ──
    if (productCategory && !allCategories.includes(productCategory)) {
      const updatedCategories = [...allCategories, productCategory];
      setAllCategories(updatedCategories);
    }

    toast.loading("Creating Product...");
    const data = await createProduct(productData);
    toast.dismiss();

    if (data.success) {
      toast.success(data.message);
      handleAdd();
    } else {
      toast.error(data.error || "Failed to create product");
    }
  };

  const handleAddNewCategory = () => {
    if (newCategory.trim()) {
      if (allCategories.includes(newCategory.trim())) {
        toast.error("Category already exists");
        return;
      }
      const updatedCategories = [...allCategories, newCategory.trim()];
      setAllCategories(updatedCategories);
      setProductCategory(newCategory.trim());
      setNewCategory("");
      setShowAddCategory(false);
      toast.success("New category added successfully");
    } else {
      toast.error("Please enter a category name");
    }
  };

  const handleAddNewBrand = () => {
    if (newBrand.trim()) {
      if (allBrands.includes(newBrand.trim())) {
        toast.error("Brand already exists");
        return;
      }
      const updatedBrands = [...allBrands, newBrand.trim()];
      setAllBrands(updatedBrands);
      setBrandName(newBrand.trim());
      setNewBrand("");
      setShowAddBrand(false);
      toast.success("New brand added successfully");
    } else {
      toast.error("Please enter a brand name");
    }
  };

  const handleProductNameChange = (e) => {
    const value = e.target.value;
    if (/^[a-zA-Z0-9\s]*$/.test(value)) setProductName(value);
  };

  const handlePrintNameChange = (e) => {
    const value = e.target.value;
    if (/^[a-zA-Z0-9\s]*$/.test(value)) setPrintName(value);
  };

  const handleAliasNameChange = (e) => {
    const value = e.target.value;
    if (/^[a-zA-Z0-9\s]*$/.test(value)) setAliasName(value);
  };

  const handleModelChange = (e) => {
    const value = e.target.value;
    if (/^[a-zA-Z0-9\s]*$/.test(value)) setModel(value);
  };

  const handleHsnCodeChange = (e) => {
    const value = e.target.value;
    if (/^\d{0,8}$/.test(value)) setHsnCode(value);
  };

  const handleMrpChange = (e) => {
    const value = e.target.value;
    if (/^\d*\.?\d{0,2}$/.test(value)) setMrp(value);
  };

  const handleSalesPriceChange = (e) => {
    const value = e.target.value;
    if (/^\d*\.?\d{0,2}$/.test(value)) setSalesPrice(value);
  };

  const handlePurchasePriceChange = (e) => {
    const value = e.target.value;
    if (/^\d*\.?\d{0,2}$/.test(value)) setPurchasePrice(value);
  };

  const handleMinSalesPriceChange = (e) => {
    const value = e.target.value;
    if (/^\d*\.?\d{0,2}$/.test(value)) setMinSalesPrice(value);
  };

  const handleMinQtyLevelChange = (e) => {
    const value = e.target.value;
    if (/^\d*\.?\d{0,2}$/.test(value)) setMinQtyLevel(value);
  };

  const handleDiscountValueChange = (e) => {
    const value = e.target.value;
    if (/^\d*\.?\d{0,2}$/.test(value)) setDiscountValue(value);
  };

  const handleUomConversionChange = (e) => {
    const value = e.target.value;
    if (/^\d*\.?\d{0,4}$/.test(value)) setUomConversion(value);
  };

  const handleCurrentStockQtyChange = (e) => {
    const value = e.target.value;
    if (/^\d*\.?\d{0,4}$/.test(value)) setCurrentStockQty(value);
  };

  const handleGstRateChange = (e) => {
    const value = e.target.value;
    if (/^\d*\.?\d{0,2}$/.test(value)) setGstRate(value);
  };

  const handleCessPercentageChange = (e) => {
    const value = e.target.value;
    if (/^\d*\.?\d{0,2}$/.test(value)) setCessPercentage(value);
  };

  const handleCessAmountChange = (e) => {
    const value = e.target.value;
    if (/^\d*\.?\d{0,2}$/.test(value)) setCessAmount(value);
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
            <form onSubmit={handleProductAdd}>
              <div className="modal-header pt-0">
                <h5 className="card-title fw-bold" id="exampleModalLongTitle">
                  Create New Product
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
                <div className="row modal_body_height" style={{ maxHeight: "70vh", overflowY: "auto" }}>

                  <div className="row mt-3">
                    <div className="col-md-6 col-12">
                      <label htmlFor="brandName" className="form-label label_text">
                        Brand Name
                      </label>
                      <div className="input-group">
                        <select
                          className="form-select rounded-0"
                          id="brandName"
                          value={brandName}
                          onChange={(e) => setBrandName(e.target.value)}
                        >
                          <option value="">Select Brand</option>
                          {allBrands.map((brand, index) => (
                            <option key={index} value={brand}>{brand}</option>
                          ))}
                        </select>
                        <button type="button" className="btn btn-outline-secondary" onClick={() => setShowAddBrand(true)}>
                          <i className="fa-solid fa-plus"></i>
                        </button>
                      </div>
                    </div>

                    <div className="col-md-6 col-12 mt-3 mt-md-0">
                      <label htmlFor="productName" className="form-label label_text">
                        Product Name <RequiredStar />
                      </label>
                      <input
                        type="text"
                        className="form-control rounded-0"
                        id="productName"
                        maxLength={100}
                        value={productName}
                        onChange={handleProductNameChange}
                        placeholder="Enter Product Name...."
                        required
                      />
                    </div>
                  </div>

                  <div className="row mt-3">
                    <div className="col-md-6 col-12">
                      <label htmlFor="model" className="form-label label_text">Model</label>
                      <input
                        type="text"
                        maxLength={100}
                        className="form-control rounded-0"
                        id="model"
                        value={model}
                        onChange={handleModelChange}
                        placeholder="Enter Model...."
                      />
                    </div>

                    <div className="col-md-6 col-12 mt-3 mt-md-0">
                      <label htmlFor="printName" className="form-label label_text">Print Name</label>
                      <input
                        type="text"
                        maxLength={100}
                        className="form-control rounded-0"
                        id="printName"
                        value={printName}
                        onChange={handlePrintNameChange}
                        placeholder="Enter Print Name...."
                      />
                    </div>
                  </div>

                  <div className="row mt-3">
                    <div className="col-md-6 col-12">
                      <label htmlFor="aliasName" className="form-label label_text">Alias Name</label>
                      <input
                        type="text"
                        maxLength={100}
                        className="form-control rounded-0"
                        id="aliasName"
                        value={aliasName}
                        onChange={handleAliasNameChange}
                        placeholder="Enter Alias Name...."
                      />
                    </div>

                    <div className="col-md-6 col-12 mt-3 mt-md-0">
                      <label htmlFor="hsnCode" className="form-label label_text">HSN Code</label>
                      <input
                        type="text"
                        maxLength={8}
                        className="form-control rounded-0"
                        id="hsnCode"
                        value={hsnCode}
                        onChange={handleHsnCodeChange}
                        placeholder="Enter HSN Code...."
                      />
                    </div>
                  </div>

                  <div className="row mt-3">
                    <div className="col-12">
                      <label htmlFor="description" className="form-label label_text">Description</label>
                      <textarea
                        className="form-control rounded-0"
                        id="description"
                        maxLength={500}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows="3"
                        placeholder="Enter Description...."
                      ></textarea>
                    </div>
                  </div>

                  {/* ── Product Category ── */}
                  <div className="row mt-3">
                    <div className="col-12">
                      <label htmlFor="productCategory" className="form-label label_text">Product Category</label>
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
                        <button type="button" className="btn btn-outline-secondary" onClick={() => setShowAddCategory(true)}>
                          <i className="fa-solid fa-plus"></i>
                        </button>
                      </div>
                      {/* Show selected category hint */}
                      {productCategory && (
                        <small className="text-muted mt-1 d-block">
                          <i className="fa fa-check-circle me-1 text-success"></i>
                          Selected: <strong>{productCategory}</strong>
                        </small>
                      )}
                    </div>
                  </div>

                  <div className="row mt-3">
                    <div className="col-12">
                      <label htmlFor="category" className="form-label label_text">
                        Product Group <RequiredStar />
                      </label>
                      <select
                        className="form-select rounded-0"
                        id="category"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        required
                      >
                        <option value="">Select Category</option>
                        {categoryOptions.map((option, index) => (
                          <option key={index} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="row mt-3">
                    <div className="col-12 col-md-4">
                      <label htmlFor="baseUOM" className="form-label label_text">
                        Base UOM / UNIT<RequiredStar />
                      </label>
                      <select
                        className="form-select rounded-0"
                        id="baseUOM"
                        value={baseUOM}
                        onChange={(e) => setBaseUOM(e.target.value)}
                        required
                      >
                        <option value="">Select Base UOM</option>
                        {uomOptions.map((uom, index) => (
                          <option key={index} value={uom}>{uom}</option>
                        ))}
                      </select>
                    </div>

                    <div className="col-12 col-md-4 mt-3 mt-md-0">
                      <label htmlFor="alternateUOM" className="form-label label_text">Alternate UOM / UNIT</label>
                      <select
                        className="form-select rounded-0"
                        id="alternateUOM"
                        value={alternateUOM}
                        onChange={(e) => setAlternateUOM(e.target.value)}
                      >
                        <option value="">Select Alternate UOM</option>
                        {uomOptions.map((uom, index) => (
                          <option key={index} value={uom}>{uom}</option>
                        ))}
                      </select>
                    </div>

                    <div className="col-12 col-md-4 mt-3 mt-md-0">
                      <label htmlFor="uomConversion" className="form-label label_text">UOM Conversion</label>
                      <input
                        type="text"
                        className="form-control rounded-0"
                        id="uomConversion"
                        value={uomConversion}
                        onChange={handleUomConversionChange}
                        placeholder="Enter UOM conversion factor"
                      />
                    </div>
                  </div>

                  {/* Current Stock Qty Field */}
                  <div className="row mt-3">
                    <div className="col-12 col-md-6">
                      <label htmlFor="currentStockQty" className="form-label label_text">
                        Current Stock Qty.
                      </label>
                      <div className="input-group">
                        <input
                          type="text"
                          className="form-control rounded-0"
                          id="currentStockQty"
                          value={currentStockQty}
                          onChange={handleCurrentStockQtyChange}
                          placeholder="Enter current stock quantity"
                        />
                        {baseUOM && (
                          <span className="input-group-text">{baseUOM}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Rate Details Section */}
                  <div className="col-12 mt-3">
                    <div className="row border bg-gray mx-auto p-3">
                      <div className="col-10 mb-3">
                        <span className="SecondaryInfo">Rate Details</span>
                      </div>

                      <div className="col-12 col-lg-4 mt-2">
                        <div className="mb-3">
                          <label htmlFor="mrp" className="form-label label_text">MRP</label>
                          <input type="text" className="form-control rounded-0" id="mrp" value={mrp} onChange={handleMrpChange} />
                        </div>
                      </div>

                      <div className="col-12 col-lg-4 mt-2">
                        <div className="mb-3">
                          <label htmlFor="salesPrice" className="form-label label_text">Sales Price</label>
                          <input type="text" className="form-control rounded-0" id="salesPrice" value={salesPrice} onChange={handleSalesPriceChange} />
                        </div>
                      </div>

                      <div className="col-12 col-lg-4 mt-2">
                        <div className="mb-3">
                          <label htmlFor="purchasePrice" className="form-label label_text">Purchase Price</label>
                          <input type="text" className="form-control rounded-0" id="purchasePrice" value={purchasePrice} onChange={handlePurchasePriceChange} />
                        </div>
                      </div>

                      <div className="col-12 col-lg-4 mt-2">
                        <div className="mb-3">
                          <label htmlFor="minSalesPrice" className="form-label label_text">Min. Sales Price</label>
                          <input type="text" className="form-control rounded-0" id="minSalesPrice" value={minSalesPrice} onChange={handleMinSalesPriceChange} />
                        </div>
                      </div>

                      <div className="col-12 col-lg-4 mt-2">
                        <div className="mb-3">
                          <label htmlFor="minQtyLevel" className="form-label label_text">Min. Qty Level</label>
                          <input type="text" className="form-control rounded-0" id="minQtyLevel" value={minQtyLevel} onChange={handleMinQtyLevelChange} />
                        </div>
                      </div>

                      <div className="col-12 col-lg-4 mt-2">
                        <div className="mb-3">
                          <label htmlFor="discountType" className="form-label label_text">Discount Type</label>
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
                      </div>

                      {discountType !== "Zero Discount" && (
                        <div className="col-12 col-lg-4 mt-2">
                          <div className="mb-3">
                            <label htmlFor="discountValue" className="form-label label_text">Discount Value</label>
                            <input
                              type="text"
                              className="form-control rounded-0"
                              id="discountValue"
                              value={discountValue}
                              onChange={handleDiscountValueChange}
                              placeholder={discountType === "In percentage" ? "Enter percentage" : "Enter value"}
                            />
                          </div>
                        </div>
                      )}

                      {/* Tax Details Section */}
                      <div className="col-12 mt-3">
                        <h6 className="mb-3">Tax Details</h6>

                        <div className="col-12 mb-3">
                          <div className="form-check form-check-inline">
                            <input className="form-check-input" type="radio" name="taxType" id="taxNone" value="none" checked={taxType === "none"} onChange={() => setTaxType("none")} />
                            <label className="form-check-label" htmlFor="taxNone">No Tax</label>
                          </div>
                          <div className="form-check form-check-inline">
                            <input className="form-check-input" type="radio" name="taxType" id="taxGST" value="gst" checked={taxType === "gst"} onChange={() => setTaxType("gst")} />
                            <label className="form-check-label" htmlFor="taxGST">Add GST Rate</label>
                          </div>
                          <div className="form-check form-check-inline">
                            <input className="form-check-input" type="radio" name="taxType" id="taxCESS" value="cess" checked={taxType === "cess"} onChange={() => setTaxType("cess")} />
                            <label className="form-check-label" htmlFor="taxCESS">Add CESS % / Amount</label>
                          </div>
                        </div>

                        {taxType === "gst" && (
                          <div className="row">
                            <div className="col-12 col-lg-6 mt-2">
                              <div className="mb-3">
                                <label htmlFor="gstRate" className="form-label label_text">GST Rate</label>
                                <div className="input-group">
                                  <input type="text" className="form-control rounded-0" id="gstRate" value={gstRate} onChange={handleGstRateChange} placeholder="Enter GST Rate" />
                                  <span className="input-group-text">%</span>
                                </div>
                              </div>
                            </div>
                            <div className="col-12 col-lg-6 mt-2">
                              <div className="mb-3">
                                <label htmlFor="gstEffectiveDate" className="form-label label_text">GST Effective Date</label>
                                <input type="date" className="form-control rounded-0" id="gstEffectiveDate" value={gstEffectiveDate} onChange={(e) => setGstEffectiveDate(e.target.value)} />
                              </div>
                            </div>
                          </div>
                        )}

                        {taxType === "cess" && (
                          <div className="row">
                            <div className="col-12 col-lg-6 mt-2">
                              <div className="mb-3">
                                <label htmlFor="cessPercentage" className="form-label label_text">CESS %</label>
                                <div className="input-group">
                                  <input type="text" className="form-control rounded-0" id="cessPercentage" value={cessPercentage} onChange={handleCessPercentageChange} placeholder="Enter CESS Percentage" />
                                  <span className="input-group-text">%</span>
                                </div>
                              </div>
                            </div>
                            <div className="col-12 col-lg-6 mt-2">
                              <div className="mb-3">
                                <label htmlFor="cessAmount" className="form-label label_text">CESS Amount</label>
                                <div className="input-group">
                                  <span className="input-group-text">₹</span>
                                  <input type="text" className="form-control rounded-0" id="cessAmount" value={cessAmount} onChange={handleCessAmountChange} placeholder="Enter CESS Amount" />
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
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
                <input type="text" className="form-control" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="Enter new category" />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddCategory(false)}>Cancel</button>
                <button type="button" className="btn btn-primary" onClick={handleAddNewCategory}>Add</button>
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
                <input type="text" className="form-control" value={newBrand} onChange={(e) => setNewBrand(e.target.value)} placeholder="Enter new brand" />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddBrand(false)}>Cancel</button>
                <button type="button" className="btn btn-primary" onClick={handleAddNewBrand}>Add</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AddProductPopUp;
