import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import axios from 'axios';
import { getProductBrands, getProductCategories } from "../../../../../hooks/useProduct";

const baseUrl = process.env.REACT_APP_API_URL;

const AddInventoryPopup = ({ onAddInventory, onClose }) => {
  const [productSearch, setProductSearch] = useState("");
  const [productSearchResults, setProductSearchResults] = useState([]);
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [productSearchLoading, setProductSearchLoading] = useState(false);
  const searchDebounceRef = useRef(null);
  const dropdownRef = useRef(null);

  const [formData, setFormData] = useState({
    materialCode: '',
    materialName: '',
    category: 'Raw Material',
    unitPrice: '',
    currentStock: '',
    minStockLevel: '',
    warehouseLocation: '',
    stockLocation: '',
    openingDate: new Date().toISOString().split('T')[0],
    description: ''
  });

  const [productName, setProductName] = useState("");
  const [brandName, setBrandName] = useState("");
  const [model, setModel] = useState("");
  const [hsnCode, setHsnCode] = useState("");
  const [productCategory, setProductCategory] = useState("");
  const [baseUOM, setBaseUOM] = useState("");
  const [uomConversion, setUomConversion] = useState(1);
  const [category, setCategory] = useState("Raw Material");
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
  const [taxType, setTaxType] = useState("none");
  const [gstRate, setGstRate] = useState("");
  const [gstEffectiveDate, setGstEffectiveDate] = useState("");

  const [allBrands, setAllBrands] = useState([]);
  const [brandsLoading, setBrandsLoading] = useState(true);
  const [allCategories, setAllCategories] = useState([]);

  const categories = ['Raw Material', 'Finished Goods', 'Repairing Material', 'Scrap', 'Asset'];
  const uomOptions = ["bags", "litre", "brass", "kilogram", "gram", "meter", "piece", "box", "carton", "nos"];
  const categoryOptions = [
    { value: "Raw Material", label: "Raw Material" },
    { value: "Finished Goods", label: "Finished Goods" },
    { value: "Repairing Material", label: "Repairing Material" },
    { value: "Scrap", label: "Scrap" },
    { value: "Asset", label: "Asset" }
  ];

  // ── FIX: Brands now load from DATABASE via API ──
  useEffect(() => {
    const loadBrands = async () => {
      setBrandsLoading(true);
      const data = await getProductBrands();
      if (data?.success && Array.isArray(data.brands) && data.brands.length > 0) {
        setAllBrands(data.brands);
      } else {
        setAllBrands(["Apple", "Samsung", "Sony", "LG", "Microsoft", "Dell"]);
      }
      setBrandsLoading(false);
    };
    loadBrands();
  }, []);

    // ── FIX: Categories from DATABASE ──
  useEffect(() => {
    const loadCategories = async () => {
      const data = await getProductCategories();
      if (data?.success && Array.isArray(data.categories) && data.categories.length > 0) {
        setAllCategories(data.categories);
      } else {
        setAllCategories(["Electronics", "Clothing", "Food", "Furniture", "Stationery", "Tools"]);
      }
    };
    loadCategories();
  }, []);

  // ── REMOVE these two lines completely (no more localStorage for categories) ──
  // useEffect(() => { localStorage.setItem('productCategories', JSON.stringify(allCategories)); }, [allCategories]);
  useEffect(() => { localStorage.setItem('productCategories', JSON.stringify(allCategories)); }, [allCategories]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowProductDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchProducts = async (query) => {
    if (!query || query.trim().length < 2) {
      setProductSearchResults([]);
      setShowProductDropdown(false);
      return;
    }
    try {
      setProductSearchLoading(true);
      const response = await axios.get(
        `${baseUrl}/api/product?q=${query}&page=1&limit=10`,
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      if (response.data?.success && response.data?.products?.length > 0) {
        setProductSearchResults(response.data.products);
        setShowProductDropdown(true);
      } else {
        setProductSearchResults([]);
        setShowProductDropdown(false);
      }
    } catch (err) {
      setProductSearchResults([]);
    } finally {
      setProductSearchLoading(false);
    }
  };

  const handleProductSearchChange = (e) => {
    const val = e.target.value;
    setProductSearch(val);
    if (!val) setSelectedProductId(null);
    clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => searchProducts(val), 350);
  };

  const handleSelectProduct = (product) => {
    setSelectedProductId(product._id);
    setProductSearch(product.productName || "");
    setShowProductDropdown(false);
    setProductSearchResults([]);

    setProductName(product.productName || "");
    setBrandName(product.brandName || "");
    setModel(product.model || "");
    setHsnCode(product.hsnCode || "");
    setProductCategory(product.productCategory || "");
    setBaseUOM(product.baseUOM || "");
    setUomConversion(product.uomConversion || 1);
    setMrp(product.mrp > 0 ? String(product.mrp) : "");
    setSalesPrice(product.salesPrice > 0 ? String(product.salesPrice) : "");
    setPurchasePrice(product.purchasePrice > 0 ? String(product.purchasePrice) : "");
    setMinQtyLevel(product.minQtyLevel > 0 ? String(product.minQtyLevel) : "");
    setDiscountType(product.discountType || "Zero Discount");
    setDiscountValue(product.discountValue > 0 ? String(product.discountValue) : "");
    setTaxType(product.taxType || "none");
    setGstRate(product.gstRate > 0 ? String(product.gstRate) : "");
    setGstEffectiveDate(product.gstEffectiveDate ? product.gstEffectiveDate.substring(0, 10) : "");

    // Ensure selected brand is in dropdown
    if (product.brandName && !allBrands.includes(product.brandName)) {
      setAllBrands(prev => [...prev, product.brandName]);
    }
    // Ensure selected category is in dropdown
    if (product.productCategory && !allCategories.includes(product.productCategory)) {
      setAllCategories(prev => [...prev, product.productCategory]);
    }

    const catMap = {
      'raw material': 'Raw Material', 'finish material': 'Finished Goods',
      'finished goods': 'Finished Goods', 'scrap': 'Scrap',
      'repairing material': 'Repairing Material', 'work in progress': 'Raw Material',
    };
    const mappedCat = catMap[(product.category || '').toLowerCase()] || 'Raw Material';
    setCategory(mappedCat);
    setFormData(prev => ({ ...prev, category: mappedCat, unitPrice: product.purchasePrice > 0 ? String(product.purchasePrice) : prev.unitPrice }));

    if (product.currentStockQty > 0) {
      setFormData(prev => ({ ...prev, currentStock: String(product.currentStockQty) }));
    }

    toast.success(`Product "${product.productName}" selected — fields auto-filled`);
  };

  const handleClearProduct = () => {
    setSelectedProductId(null);
    setProductSearch("");
    setProductName(""); setBrandName(""); setModel(""); setHsnCode("");
    setProductCategory(""); setBaseUOM(""); setUomConversion(1);
    setMrp(""); setSalesPrice(""); setPurchasePrice(""); setMinQtyLevel("");
    setDiscountType("Zero Discount"); setDiscountValue("");
    setTaxType("none"); setGstRate(""); setGstEffectiveDate("");
    setCategory("Raw Material");
    setFormData(prev => ({ ...prev, category: 'Raw Material', unitPrice: '', currentStock: '' }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const validCategory = categories.includes(category) ? category : 'Raw Material';

    const combinedData = {
      ...formData,
      category: validCategory,
      productName, brandName, model, hsnCode, productCategory, baseUOM,
      uomConversion: parseFloat(uomConversion) || 1,
      mrp: parseFloat(mrp) || 0, salesPrice: parseFloat(salesPrice) || 0,
      purchasePrice: parseFloat(purchasePrice) || 0, minQtyLevel: parseFloat(minQtyLevel) || 0,
      discountType,
      discountValue: discountType === "Zero Discount" ? 0 : parseFloat(discountValue) || 0,
      taxType, gstRate: taxType === "gst" ? parseFloat(gstRate) || 0 : 0,
      gstEffectiveDate: taxType === "gst" ? gstEffectiveDate : "",
      createdAt: new Date().toISOString(),
      linkedProductId: selectedProductId || null,
    };

    onAddInventory(combinedData);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleProductNameChange = (e) => { setProductName(e.target.value); };
  const handleModelChange = (e) => { setModel(e.target.value); };
  const handleHsnCodeChange = (e) => { if (/^\d{0,8}$/.test(e.target.value)) setHsnCode(e.target.value); };
  const handleMrpChange = (e) => { if (/^\d*\.?\d{0,2}$/.test(e.target.value)) setMrp(e.target.value); };
  const handleSalesPriceChange = (e) => { if (/^\d*\.?\d{0,2}$/.test(e.target.value)) setSalesPrice(e.target.value); };
  const handlePurchasePriceChange = (e) => { if (/^\d*\.?\d{0,2}$/.test(e.target.value)) setPurchasePrice(e.target.value); };
  const handleMinQtyLevelChange = (e) => { if (/^\d*\.?\d{0,2}$/.test(e.target.value)) setMinQtyLevel(e.target.value); };
  const handleDiscountValueChange = (e) => { if (/^\d*\.?\d{0,2}$/.test(e.target.value)) setDiscountValue(e.target.value); };
  const handleUomConversionChange = (e) => { if (/^\d*\.?\d{0,4}$/.test(e.target.value)) setUomConversion(e.target.value); };
  const handleGstRateChange = (e) => { if (/^\d*\.?\d{0,2}$/.test(e.target.value)) setGstRate(e.target.value); };

  const handleAddNewCategory = () => {
    if (!newCategory.trim()) return toast.error("Please enter a category name");
    if (allCategories.includes(newCategory.trim())) return toast.error("Category already exists");
    const updated = [...allCategories, newCategory.trim()];
    setAllCategories(updated);
    setProductCategory(newCategory.trim());
    setNewCategory(""); setShowAddCategory(false);
    toast.success("New category added successfully");
  };

  const handleAddNewBrand = () => {
    if (!newBrand.trim()) return toast.error("Please enter a brand name");
    if (allBrands.includes(newBrand.trim())) return toast.error("Brand already exists");
    const updated = [...allBrands, newBrand.trim()];
    setAllBrands(updated);
    setBrandName(newBrand.trim());
    setNewBrand(""); setShowAddBrand(false);
    toast.success("New brand added successfully");
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

                  {/* Product Master Search */}
                  <div className="col-12">
                    <div className="border rounded p-3 mb-2" style={{ backgroundColor: '#f0f7ff', borderColor: '#93c5fd !important' }}>
                      <label className="form-label fw-bold text-primary mb-2">
                        <i className="fa-solid fa-magnifying-glass me-2"></i>
                        Search & Select from Product Master
                        <small className="text-muted fw-normal ms-2">(Auto-fills all fields below)</small>
                      </label>
                      <div className="position-relative" ref={dropdownRef}>
                        <div className="input-group">
                          <span className="input-group-text bg-white">
                            {productSearchLoading
                              ? <span className="spinner-border spinner-border-sm text-primary"></span>
                              : <i className="fa-solid fa-search text-muted"></i>
                            }
                          </span>
                          <input
                            type="text" className="form-control"
                            placeholder="Type product name, brand, model, HSN... (min 2 chars)"
                            value={productSearch} onChange={handleProductSearchChange} autoComplete="off"
                            style={{ borderLeft: 'none' }}
                          />
                          {selectedProductId && (
                            <button type="button" className="btn btn-outline-danger btn-sm" onClick={handleClearProduct} title="Clear selection">
                              <i className="fa-solid fa-xmark"></i> Clear
                            </button>
                          )}
                        </div>

                        {selectedProductId && (
                          <div className="mt-1">
                            <span className="badge bg-success"><i className="fa-solid fa-check me-1"></i>Product selected — fields auto-filled from Product Master</span>
                          </div>
                        )}

                        {showProductDropdown && productSearchResults.length > 0 && (
                          <div className="position-absolute w-100 bg-white border rounded shadow-lg" style={{ zIndex: 9999, top: '100%', maxHeight: '260px', overflowY: 'auto' }}>
                            {productSearchResults.map((product) => (
                              <div key={product._id} className="px-3 py-2 border-bottom cursor-pointer" style={{ cursor: 'pointer' }}
                                onMouseDown={() => handleSelectProduct(product)}
                                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#eff6ff'}
                                onMouseLeave={e => e.currentTarget.style.backgroundColor = ''}>
                                <div className="d-flex justify-content-between align-items-start">
                                  <div>
                                    <strong style={{ fontSize: '0.88rem' }}>{product.productName}</strong>
                                    {product.brandName && <span className="text-muted ms-2" style={{ fontSize: '0.78rem' }}>{product.brandName}</span>}
                                    {product.model && <span className="badge bg-light text-dark ms-1" style={{ fontSize: '0.7rem' }}>{product.model}</span>}
                                  </div>
                                  <div className="text-end">
                                    {product.purchasePrice > 0 && <span className="badge bg-success me-1" style={{ fontSize: '0.7rem' }}>₹{product.purchasePrice}</span>}
                                    {product.currentStockQty > 0 && <span className="badge bg-primary" style={{ fontSize: '0.7rem' }}>Stock: {product.currentStockQty} {product.baseUOM}</span>}
                                  </div>
                                </div>
                                <div className="mt-1">
                                  {product.hsnCode && <small className="text-muted me-2">HSN: {product.hsnCode}</small>}
                                  {product.productCategory && <small className="text-muted me-2">Cat: {product.productCategory}</small>}
                                  {product.baseUOM && <small className="text-muted">UOM: {product.baseUOM}</small>}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {showProductDropdown && productSearchResults.length === 0 && !productSearchLoading && (
                          <div className="position-absolute w-100 bg-white border rounded shadow-sm p-3 text-center text-muted" style={{ zIndex: 9999, top: '100%' }}>
                            <i className="fa-solid fa-circle-info me-1"></i>No products found. Fill fields manually below.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Brand Name — now from DB */}
                  <div className="col-md-6">
                    <label htmlFor="brandName" className="form-label">Brand Name</label>
                    <div className="input-group">
                      <select className="form-select rounded-0" id="brandName" value={brandName}
                        onChange={(e) => setBrandName(e.target.value)} disabled={brandsLoading}>
                        <option value="">{brandsLoading ? "Loading brands..." : "Select Brand"}</option>
                        {allBrands.map((brand, index) => (
                          <option key={index} value={brand}>{brand}</option>
                        ))}
                      </select>
                      <button type="button" className="btn btn-outline-secondary" onClick={() => setShowAddBrand(true)}>
                        <i className="fa-solid fa-plus"></i>
                      </button>
                    </div>
                  </div>

                  {/* Product Name */}
                  <div className="col-md-6">
                    <label htmlFor="productName" className="form-label">Product Name</label>
                    <input type="text" className="form-control" id="productName" name="productName"
                      placeholder="Enter Product Name...." maxLength={100} value={productName} onChange={handleProductNameChange} />
                  </div>

                  <div className="col-md-6">
                    <label htmlFor="materialCode" className="form-label">Material Code</label>
                    <input type="text" className="form-control" id="materialCode" name="materialCode"
                      placeholder="Enter Material Code...." maxLength={50} value={formData.materialCode} onChange={handleInputChange} />
                  </div>

                  <div className="col-md-6">
                    <label htmlFor="model" className="form-label">Model</label>
                    <input type="text" className="form-control" id="model" name="model"
                      placeholder="Enter Model...." maxLength={100} value={model} onChange={handleModelChange} />
                  </div>

                  <div className="col-md-6">
                    <label htmlFor="hsnCode" className="form-label">HSN Code</label>
                    <input type="text" className="form-control" id="hsnCode" name="hsnCode"
                      placeholder="Enter HSN Code...." maxLength={8} value={hsnCode} onChange={handleHsnCodeChange} />
                  </div>

                  <div className="col-md-6">
                    <label htmlFor="materialName" className="form-label">Material Description</label>
                    <textarea className="form-control" id="materialName" name="materialName"
                      placeholder="Enter Material Description...." maxLength={100} rows={3}
                      value={formData.materialName} onChange={handleInputChange} />
                  </div>

                                    {/* Product Category */}
                  <div className="col-md-6">
                    <label htmlFor="productCategory" className="form-label">Product Category</label>
                    <div className="input-group">
                      <select className="form-select rounded-0" id="productCategory" value={productCategory}
                        onChange={(e) => setProductCategory(e.target.value)}>
                        <option value="">Select Product Category</option>
                        {allCategories.map((cat, index) => (
                          <option key={index} value={cat}>{cat}</option>
                        ))}
                      </select>
                      <button type="button" className="btn btn-outline-secondary" onClick={() => setShowAddCategory(true)}>
                        <i className="fa-solid fa-plus"></i>
                      </button>
                    </div>
                  </div>

                  <div className="col-md-6">
                    <label htmlFor="category" className="form-label">Product Group</label>
                    <select className="form-select rounded-0" id="category" name="category"
                      value={category} onChange={(e) => setCategory(e.target.value)}>
                      {categoryOptions.map((option, index) => (
                        <option key={index} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="col-md-6">
                    <label htmlFor="baseUOM" className="form-label">Base UOM / UNIT</label>
                    <select className="form-select rounded-0" id="baseUOM" value={baseUOM}
                      onChange={(e) => setBaseUOM(e.target.value)}>
                      <option value="">Select Base UOM</option>
                      {uomOptions.map((uom, index) => (
                        <option key={index} value={uom}>{uom}</option>
                      ))}
                    </select>
                  </div>

                  <div className="col-md-6">
                    <label htmlFor="uomConversion" className="form-label">UOM Conversion</label>
                    <input type="text" className="form-control" id="uomConversion" name="uomConversion"
                      placeholder="Enter UOM conversion factor" value={uomConversion} onChange={handleUomConversionChange} />
                  </div>

                  <div className="col-md-6">
                    <label htmlFor="unitPrice" className="form-label">Purchase Price</label>
                    <input type="number" className="form-control" id="unitPrice" name="unitPrice"
                      placeholder="Enter Purchase Price...." min="0" step="0.01" value={formData.unitPrice} onChange={handleInputChange} />
                  </div>

                  <div className="col-md-6">
                    <label htmlFor="mrp" className="form-label">MRP Price</label>
                    <input type="text" className="form-control" id="mrp" name="mrp"
                      placeholder="Enter MRP Price...." value={mrp} onChange={handleMrpChange} />
                  </div>

                  <div className="col-md-6">
                    <label htmlFor="salesPrice" className="form-label">Sales Price</label>
                    <input type="text" className="form-control" id="salesPrice" name="salesPrice"
                      placeholder="Enter Sales Price...." value={salesPrice} onChange={handleSalesPriceChange} />
                  </div>

                  <div className="col-md-6">
                    <label htmlFor="openingDate" className="form-label">Opening Date</label>
                    <input type="date" className="form-control" id="openingDate" name="openingDate"
                      value={formData.openingDate} onChange={handleInputChange} />
                  </div>

                  <div className="col-md-6">
                    <label htmlFor="currentStock" className="form-label">
                      Opening Stock
                      {selectedProductId && <small className="text-success ms-2"><i className="fa-solid fa-link"></i> from Product Master</small>}
                    </label>
                    <div className="input-group">
                      <input type="number" className={`form-control ${selectedProductId ? 'border-success' : ''}`}
                        id="currentStock" name="currentStock" placeholder="Enter Opening Stock...." min="0"
                        value={formData.currentStock} onChange={handleInputChange} />
                      {baseUOM && <span className="input-group-text">{baseUOM}</span>}
                    </div>
                  </div>

                  <div className="col-md-6">
                    <label htmlFor="minStockLevel" className="form-label">Min Stock Level</label>
                    <input type="number" className="form-control" id="minStockLevel" name="minStockLevel"
                      placeholder="Enter Min Stock Level...." min="0" value={formData.minStockLevel} onChange={handleInputChange} />
                  </div>

                  <div className="col-md-6">
                    <label htmlFor="warehouseLocation" className="form-label">Warehouse Location</label>
                    <input type="text" className="form-control" id="warehouseLocation" name="warehouseLocation"
                      placeholder="e.g., Warehouse A..." maxLength={100} value={formData.warehouseLocation} onChange={handleInputChange} />
                  </div>

                  <div className="col-md-6">
                    <label htmlFor="stockLocation" className="form-label">Rack Location</label>
                    <input type="text" className="form-control" id="stockLocation" name="stockLocation"
                      placeholder="e.g., Rack 1..." maxLength={100} value={formData.stockLocation} onChange={handleInputChange} />
                  </div>

                  <div className="col-md-6">
                    <label htmlFor="discountType" className="form-label">Discount Type</label>
                    <select className="form-select rounded-0" id="discountType" value={discountType}
                      onChange={(e) => setDiscountType(e.target.value)}>
                      <option value="Zero Discount">Zero Discount</option>
                      <option value="In percentage">In Percentage</option>
                      <option value="In Value">In Value</option>
                    </select>
                  </div>

                  {discountType !== "Zero Discount" && (
                    <div className="col-md-6">
                      <label htmlFor="discountValue" className="form-label">Discount</label>
                      <input type="text" className="form-control" id="discountValue" name="discountValue"
                        placeholder={discountType === "In percentage" ? "Enter percentage" : "Enter value"}
                        value={discountValue} onChange={handleDiscountValueChange} />
                    </div>
                  )}

                  {/* Tax Details */}
                  <div className="col-12 mt-3">
                    <div className="border bg-gray mx-auto p-3">
                      <div className="col-10 mb-3"><span className="SecondaryInfo">Tax Details</span></div>
                      <div className="col-12 mb-3">
                        <div className="form-check form-check-inline">
                          <input className="form-check-input" type="radio" name="taxType" id="taxNone" value="none" checked={taxType === "none"} onChange={() => setTaxType("none")} />
                          <label className="form-check-label" htmlFor="taxNone">No Tax</label>
                        </div>
                        <div className="form-check form-check-inline">
                          <input className="form-check-input" type="radio" name="taxType" id="taxGST" value="gst" checked={taxType === "gst"} onChange={() => setTaxType("gst")} />
                          <label className="form-check-label" htmlFor="taxGST">Add GST Rate</label>
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
                    </div>
                  </div>

                  <div className="col-12">
                    <label htmlFor="description" className="form-label">Description / Remarks</label>
                    <textarea className="form-control" id="description" name="description"
                      placeholder="Enter material description, specifications, or remarks...."
                      value={formData.description} onChange={handleInputChange}
                      style={{ width: '100%', height: '100px' }} maxLength={500} />
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

export default AddInventoryPopup;