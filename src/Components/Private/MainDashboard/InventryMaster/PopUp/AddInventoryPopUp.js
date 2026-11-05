import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import axios from 'axios';
import { RequiredStar } from "../../../RequiredStar/RequiredStar";
import { getProductBrands, getProductCategories, getProductUOMs } from "../../../../../hooks/useProduct";

const baseUrl = process.env.REACT_APP_API_URL;

const DEFAULT_BRANDS = ["Apple", "Samsung", "Sony", "LG", "Microsoft", "Dell"];
const DEFAULT_CATEGORIES = ["Electronics", "Clothing", "Food", "Furniture", "Stationery", "Tools"];
const DEFAULT_UOMS = ["bags", "litre", "brass", "kilogram", "gram", "meter", "piece", "box", "carton", "nos"];
const CATEGORIES = ['Raw Material', 'Finished Goods', 'Repairing Material', 'Scrap', 'Asset'];

// Product Master "category" (lower-case) → Inventory "Product Group"
const PRODUCT_GROUP_MAP = {
  'raw material': 'Raw Material', 'finish material': 'Finished Goods',
  'finished goods': 'Finished Goods', 'scrap': 'Scrap',
  'repairing material': 'Repairing Material', 'work in progress': 'Raw Material',
};

const decimal = (digits) => new RegExp(`^\\d*\\.?\\d{0,${digits}}$`);

/**
 * Used by Inventory Master AND by Purchase Order "Add Product".
 * `requireMaterialCode` is passed only by Inventory Master.
 */
const AddInventoryPopup = ({ onAddInventory, onClose, requireMaterialCode = false, saving = false }) => {
  // ── Product Master search ──
  const [productSearch, setProductSearch] = useState("");
  const [productSearchResults, setProductSearchResults] = useState([]);
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [productSearchLoading, setProductSearchLoading] = useState(false);
  const searchDebounceRef = useRef(null);
  const dropdownRef = useRef(null);

  // ── Form ──
  const [form, setForm] = useState({
    materialCode: '',
    materialName: '',
    productName: '',
    brandName: '',
    model: '',
    hsnCode: '',
    productCategory: '',
    category: 'Raw Material',
    baseUOM: '',
    uomConversion: '1',
    unitPrice: '',
    mrp: '',
    salesPrice: '',
    openingStock: '',
    minStockLevel: '',
    warehouseLocation: '',
    stockLocation: '',
    openingDate: new Date().toISOString().split('T')[0],
    discountType: 'Zero Discount',
    discountValue: '',
    taxType: 'none',
    gstRate: '',
    gstEffectiveDate: '',
    description: '',
  });
  const set = (name, value) => setForm((prev) => ({ ...prev, [name]: value }));

  // ── Dropdown data (from DB) ──
  const [allBrands, setAllBrands] = useState([]);
  const [brandsLoading, setBrandsLoading] = useState(true);
  const [allCategories, setAllCategories] = useState([]);
  const [uomOptions, setUomOptions] = useState([]);

  // ── Small "add new" modals ──
  const [addModal, setAddModal] = useState(null); // 'brand' | 'category' | 'uom' | null
  const [addValue, setAddValue] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      const [b, c, u] = await Promise.all([getProductBrands(), getProductCategories(), getProductUOMs()]);
      if (!alive) return;
      setAllBrands(b?.success && b.brands?.length ? b.brands : DEFAULT_BRANDS);
      setAllCategories(c?.success && c.categories?.length ? c.categories : DEFAULT_CATEGORIES);
      setUomOptions(u?.success && u.uoms?.length ? u.uoms : DEFAULT_UOMS);
      setBrandsLoading(false);
    })();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setShowProductDropdown(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      clearTimeout(searchDebounceRef.current);
    };
  }, []);

  const ensureOption = (list, setter, value) => {
    if (value && !list.includes(value)) setter((prev) => (prev.includes(value) ? prev : [...prev, value]));
  };

  // ── Product search ──
  const searchProducts = async (query) => {
    if (!query || query.trim().length < 2) {
      setProductSearchResults([]);
      setShowProductDropdown(false);
      return;
    }
    try {
      setProductSearchLoading(true);
      const response = await axios.get(`${baseUrl}/api/product`, {
        params: { q: query.trim(), page: 1, limit: 10 },
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      const list = response.data?.success ? response.data.products || [] : [];
      setProductSearchResults(list);
      setShowProductDropdown(true);
    } catch (err) {
      setProductSearchResults([]);
      setShowProductDropdown(true); // shows "No products found"
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

    ensureOption(allBrands, setAllBrands, product.brandName);
    ensureOption(allCategories, setAllCategories, product.productCategory);
    ensureOption(uomOptions, setUomOptions, product.baseUOM);

    setForm((prev) => ({
      ...prev,
      productName: product.productName || "",
      brandName: product.brandName || "",
      model: product.model || "",
      hsnCode: product.hsnCode || "",
      productCategory: product.productCategory || "",
      category: PRODUCT_GROUP_MAP[(product.category || '').toLowerCase()] || 'Raw Material',
      baseUOM: product.baseUOM || "",
      uomConversion: String(product.uomConversion || 1),
      unitPrice: product.purchasePrice > 0 ? String(product.purchasePrice) : prev.unitPrice,
      mrp: product.mrp > 0 ? String(product.mrp) : "",
      salesPrice: product.salesPrice > 0 ? String(product.salesPrice) : "",
      openingStock: String(product.currentStockQty ?? 0),
      minStockLevel: product.minQtyLevel > 0 ? String(product.minQtyLevel) : prev.minStockLevel,
      materialName: prev.materialName || product.description || "",
      discountType: product.discountType || "Zero Discount",
      discountValue: product.discountValue > 0 ? String(product.discountValue) : "",
      taxType: product.taxType === 'gst' ? 'gst' : 'none',
      gstRate: product.gstRate > 0 ? String(product.gstRate) : "",
      gstEffectiveDate: product.gstEffectiveDate ? String(product.gstEffectiveDate).substring(0, 10) : "",
    }));

    toast.success(`"${product.productName}" selected — stock will stay in sync with Product Master`);
  };

  const handleClearProduct = () => {
    setSelectedProductId(null);
    setProductSearch("");
    setForm((prev) => ({
      ...prev,
      productName: '', brandName: '', model: '', hsnCode: '', productCategory: '',
      category: 'Raw Material', baseUOM: '', uomConversion: '1', unitPrice: '', mrp: '', salesPrice: '',
      openingStock: '', discountType: 'Zero Discount', discountValue: '', taxType: 'none', gstRate: '', gstEffectiveDate: '',
    }));
  };

  // ── Generic input handlers ──
  const handleText = (e) => set(e.target.name, e.target.value);
  const handleDecimal = (digits) => (e) => {
    if (decimal(digits).test(e.target.value)) set(e.target.name, e.target.value);
  };
  const handleHsn = (e) => { if (/^\d{0,8}$/.test(e.target.value)) set('hsnCode', e.target.value); };

  // ── Add brand / category / UOM ──
  const handleAddNewOption = () => {
    const v = addValue.trim();
    if (!v) return toast.error("Please enter a value");
    const cfg = {
      brand: [allBrands, setAllBrands, 'brandName', 'Brand'],
      category: [allCategories, setAllCategories, 'productCategory', 'Category'],
      uom: [uomOptions, setUomOptions, 'baseUOM', 'UOM'],
    }[addModal];
    const [list, setter, field, label] = cfg;
    if (list.some((x) => x.toLowerCase() === v.toLowerCase())) return toast.error(`${label} already exists`);
    setter([...list, v]);
    set(field, v);
    setAddValue("");
    setAddModal(null);
    toast.success(`New ${label.toLowerCase()} added`);
  };

  // ── Submit ──
  const handleSubmit = (e) => {
    e.preventDefault();
    if (saving) return;

    if (requireMaterialCode && !form.materialCode.trim()) return toast.error("Material Code is required");
    if (!form.productName.trim() && !form.materialName.trim()) return toast.error("Enter Product Name or Material Description");
    if (form.taxType === 'gst' && !form.gstRate) return toast.error("Please enter GST Rate");
    if (form.discountType !== 'Zero Discount' && !form.discountValue) return toast.error("Please enter discount value");

    const price = parseFloat(form.unitPrice) || 0;
    const opening = form.openingStock === '' ? '' : parseFloat(form.openingStock) || 0;

    // Shape kept compatible with Purchase Order "Add Product" (uses currentStock / unitPrice / purchasePrice)
    onAddInventory({
      materialCode: form.materialCode.trim(),
      materialName: form.materialName.trim(),
      category: CATEGORIES.includes(form.category) ? form.category : 'Raw Material',
      unitPrice: price,
      purchasePrice: price,
      openingStock: opening,
      currentStock: opening,
      minStockLevel: parseFloat(form.minStockLevel) || 0,
      minQtyLevel: parseFloat(form.minStockLevel) || 0,
      warehouseLocation: form.warehouseLocation.trim(),
      stockLocation: form.stockLocation.trim(),
      openingDate: form.openingDate,
      description: form.description.trim(),
      productName: form.productName.trim(),
      brandName: form.brandName,
      model: form.model.trim(),
      hsnCode: form.hsnCode,
      productCategory: form.productCategory,
      baseUOM: form.baseUOM,
      uomConversion: parseFloat(form.uomConversion) || 1,
      mrp: parseFloat(form.mrp) || 0,
      salesPrice: parseFloat(form.salesPrice) || 0,
      discountType: form.discountType,
      discountValue: form.discountType === 'Zero Discount' ? 0 : parseFloat(form.discountValue) || 0,
      taxType: form.taxType,
      gstRate: form.taxType === 'gst' ? parseFloat(form.gstRate) || 0 : 0,
      gstEffectiveDate: form.taxType === 'gst' ? form.gstEffectiveDate : '',
      linkedProductId: selectedProductId || null,
    });
  };

  const selectWithAdd = (id, label, value, options, onChange, modalKey, loadingText) => (
    <div className="col-md-6">
      <label htmlFor={id} className="form-label">{label}</label>
      <div className="input-group">
        <select className="form-select rounded-0" id={id} value={value} onChange={onChange} disabled={!!loadingText}>
          <option value="">{loadingText || `Select ${label}`}</option>
          {options.map((o, i) => <option key={`${o}-${i}`} value={o}>{o}</option>)}
        </select>
        <button type="button" className="btn btn-outline-secondary" onClick={() => { setAddValue(""); setAddModal(modalKey); }} title={`Add new ${label}`}>
          <i className="fa-solid fa-plus"></i>
        </button>
      </div>
    </div>
  );

  return (
    <>
      <div className="modal fade show" style={{ display: "flex", alignItems: "center", backgroundColor: "#00000090" }}>
        <div className="modal-dialog modal-xl">
          <div className="modal-content p-3">
            <form onSubmit={handleSubmit}>
              <div className="modal-header pt-0">
                <h5 className="card-title fw-bold">Add Material</h5>
                <button onClick={onClose} type="button" className="btn-close" aria-label="Close" style={{ backgroundColor: 'red' }}></button>
              </div>

              <div className="modal-body" style={{ maxHeight: 'calc(85vh - 160px)', overflowY: 'auto' }}>
                <div className="row g-3">

                  {/* ── Product Master search ── */}
                  <div className="col-12">
                    <div className="border rounded p-3 mb-1" style={{ backgroundColor: '#f0f7ff' }}>
                      <label className="form-label fw-bold text-primary mb-2">
                        <i className="fa-solid fa-magnifying-glass me-2"></i>
                        Search & Select from Product Master
                        <small className="text-muted fw-normal ms-2">(auto-fills fields; stock then follows GRN / DC automatically)</small>
                      </label>
                      <div className="position-relative" ref={dropdownRef}>
                        <div className="input-group">
                          <span className="input-group-text bg-white">
                            {productSearchLoading
                              ? <span className="spinner-border spinner-border-sm text-primary"></span>
                              : <i className="fa-solid fa-search text-muted"></i>}
                          </span>
                          <input
                            type="text" className="form-control"
                            placeholder="Type product name, brand, model, HSN... (min 2 chars)"
                            value={productSearch} onChange={handleProductSearchChange} autoComplete="off"
                          />
                          {selectedProductId && (
                            <button type="button" className="btn btn-outline-danger btn-sm" onClick={handleClearProduct}>
                              <i className="fa-solid fa-xmark"></i> Clear
                            </button>
                          )}
                        </div>

                        {selectedProductId && (
                          <div className="mt-1">
                            <span className="badge bg-success">
                              <i className="fa-solid fa-link me-1"></i>Linked to Product Master — live stock
                            </span>
                          </div>
                        )}

                        {showProductDropdown && (
                          <div className="position-absolute w-100 bg-white border rounded shadow-lg"
                            style={{ zIndex: 9999, top: '100%', maxHeight: 260, overflowY: 'auto' }}>
                            {productSearchResults.length === 0 && !productSearchLoading ? (
                              <div className="p-3 text-center text-muted">
                                <i className="fa-solid fa-circle-info me-1"></i>No products found. Fill fields manually below.
                              </div>
                            ) : productSearchResults.map((product) => (
                              <div key={product._id} className="px-3 py-2 border-bottom" style={{ cursor: 'pointer' }}
                                onMouseDown={() => handleSelectProduct(product)}
                                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#eff6ff'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = ''; }}>
                                <div className="d-flex justify-content-between align-items-start">
                                  <div>
                                    <strong style={{ fontSize: '0.88rem' }}>{product.productName}</strong>
                                    {product.brandName && <span className="text-muted ms-2" style={{ fontSize: '0.78rem' }}>{product.brandName}</span>}
                                    {product.model && <span className="badge bg-light text-dark ms-1" style={{ fontSize: '0.7rem' }}>{product.model}</span>}
                                  </div>
                                  <div className="text-end">
                                    {product.purchasePrice > 0 && <span className="badge bg-success me-1" style={{ fontSize: '0.7rem' }}>₹{product.purchasePrice}</span>}
                                    <span className="badge bg-primary" style={{ fontSize: '0.7rem' }}>Stock: {product.currentStockQty ?? 0} {product.baseUOM}</span>
                                  </div>
                                </div>
                                <div className="mt-1">
                                  {product.hsnCode && <small className="text-muted me-2">HSN: {product.hsnCode}</small>}
                                  {product.productCategory && <small className="text-muted me-2">Cat: {product.productCategory}</small>}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="col-md-6">
                    <label htmlFor="materialCode" className="form-label">Material Code {requireMaterialCode && <RequiredStar />}</label>
                    <input type="text" className="form-control" id="materialCode" name="materialCode"
                      placeholder="Enter Material Code...." maxLength={50} value={form.materialCode} onChange={handleText} />
                  </div>

                  <div className="col-md-6">
                    <label htmlFor="productName" className="form-label">Product Name</label>
                    <input type="text" className="form-control" id="productName" name="productName"
                      placeholder="Enter Product Name...." maxLength={100} value={form.productName} onChange={handleText} />
                  </div>

                  {selectWithAdd("brandName", "Brand Name", form.brandName, allBrands,
                    (e) => set('brandName', e.target.value), 'brand', brandsLoading ? "Loading brands..." : "")}

                  <div className="col-md-6">
                    <label htmlFor="model" className="form-label">Model</label>
                    <input type="text" className="form-control" id="model" name="model"
                      placeholder="Enter Model...." maxLength={100} value={form.model} onChange={handleText} />
                  </div>

                  <div className="col-md-6">
                    <label htmlFor="hsnCode" className="form-label">HSN Code</label>
                    <input type="text" className="form-control" id="hsnCode" name="hsnCode"
                      placeholder="Enter HSN Code...." maxLength={8} value={form.hsnCode} onChange={handleHsn} />
                  </div>

                  <div className="col-md-6">
                    <label htmlFor="materialName" className="form-label">Material Description</label>
                    <textarea className="form-control" id="materialName" name="materialName" rows={2}
                      placeholder="Enter Material Description...." maxLength={100} value={form.materialName} onChange={handleText} />
                  </div>

                  {selectWithAdd("productCategory", "Product Category", form.productCategory, allCategories,
                    (e) => set('productCategory', e.target.value), 'category', "")}

                  <div className="col-md-6">
                    <label htmlFor="category" className="form-label">Product Group</label>
                    <select className="form-select rounded-0" id="category" value={form.category} onChange={(e) => set('category', e.target.value)}>
                      {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>

                  {selectWithAdd("baseUOM", "Base UOM / Unit", form.baseUOM, uomOptions,
                    (e) => set('baseUOM', e.target.value), 'uom', "")}

                  <div className="col-md-6">
                    <label htmlFor="uomConversion" className="form-label">UOM Conversion</label>
                    <input type="text" className="form-control" id="uomConversion" name="uomConversion"
                      value={form.uomConversion} onChange={handleDecimal(4)} />
                  </div>

                  <div className="col-md-4">
                    <label htmlFor="unitPrice" className="form-label">Purchase Price (₹)</label>
                    <input type="text" className="form-control" id="unitPrice" name="unitPrice" inputMode="decimal"
                      placeholder="0.00" value={form.unitPrice} onChange={handleDecimal(2)} />
                  </div>
                  <div className="col-md-4">
                    <label htmlFor="mrp" className="form-label">MRP (₹)</label>
                    <input type="text" className="form-control" id="mrp" name="mrp" inputMode="decimal"
                      placeholder="0.00" value={form.mrp} onChange={handleDecimal(2)} />
                  </div>
                  <div className="col-md-4">
                    <label htmlFor="salesPrice" className="form-label">Sales Price (₹)</label>
                    <input type="text" className="form-control" id="salesPrice" name="salesPrice" inputMode="decimal"
                      placeholder="0.00" value={form.salesPrice} onChange={handleDecimal(2)} />
                  </div>

                  <div className="col-md-4">
                    <label htmlFor="openingDate" className="form-label">Opening Date</label>
                    <input type="date" className="form-control" id="openingDate" name="openingDate"
                      value={form.openingDate} onChange={handleText} />
                    <small className="text-muted">GRN / DC from this date count as IN / OUT</small>
                  </div>
                  <div className="col-md-4">
                    <label htmlFor="openingStock" className="form-label">
                      Opening Stock
                      {selectedProductId && <small className="text-success ms-2"><i className="fa-solid fa-link"></i> Product Master</small>}
                    </label>
                    <div className="input-group">
                      <input type="text" className={`form-control ${selectedProductId ? 'border-success' : ''}`}
                        id="openingStock" name="openingStock" inputMode="decimal" placeholder="0"
                        value={form.openingStock} onChange={handleDecimal(3)} />
                      {form.baseUOM && <span className="input-group-text">{form.baseUOM}</span>}
                    </div>
                  </div>
                  <div className="col-md-4">
                    <label htmlFor="minStockLevel" className="form-label">Min Stock Level</label>
                    <input type="text" className="form-control" id="minStockLevel" name="minStockLevel" inputMode="decimal"
                      placeholder="0" value={form.minStockLevel} onChange={handleDecimal(3)} />
                  </div>

                  <div className="col-md-6">
                    <label htmlFor="warehouseLocation" className="form-label">Warehouse Location</label>
                    <input type="text" className="form-control" id="warehouseLocation" name="warehouseLocation"
                      placeholder="e.g., Baner / Bhosari" maxLength={100} value={form.warehouseLocation} onChange={handleText} />
                  </div>
                  <div className="col-md-6">
                    <label htmlFor="stockLocation" className="form-label">Rack Location</label>
                    <input type="text" className="form-control" id="stockLocation" name="stockLocation"
                      placeholder="e.g., Rack 1" maxLength={100} value={form.stockLocation} onChange={handleText} />
                  </div>

                  <div className="col-md-6">
                    <label htmlFor="discountType" className="form-label">Discount Type</label>
                    <select className="form-select rounded-0" id="discountType" value={form.discountType} onChange={(e) => set('discountType', e.target.value)}>
                      <option value="Zero Discount">Zero Discount</option>
                      <option value="In percentage">In Percentage</option>
                      <option value="In Value">In Value</option>
                    </select>
                  </div>
                  {form.discountType !== "Zero Discount" && (
                    <div className="col-md-6">
                      <label htmlFor="discountValue" className="form-label">Discount</label>
                      <input type="text" className="form-control" id="discountValue" name="discountValue"
                        placeholder={form.discountType === "In percentage" ? "Enter percentage" : "Enter value"}
                        value={form.discountValue} onChange={handleDecimal(2)} />
                    </div>
                  )}

                  {/* ── Tax ── */}
                  <div className="col-12">
                    <div className="border bg-gray p-3">
                      <div className="mb-2"><span className="SecondaryInfo">Tax Details</span></div>
                      <div className="form-check form-check-inline">
                        <input className="form-check-input" type="radio" name="addTaxType" id="addTaxNone"
                          checked={form.taxType === "none"} onChange={() => set('taxType', 'none')} />
                        <label className="form-check-label" htmlFor="addTaxNone">No Tax</label>
                      </div>
                      <div className="form-check form-check-inline">
                        <input className="form-check-input" type="radio" name="addTaxType" id="addTaxGST"
                          checked={form.taxType === "gst"} onChange={() => set('taxType', 'gst')} />
                        <label className="form-check-label" htmlFor="addTaxGST">Add GST Rate</label>
                      </div>
                      {form.taxType === "gst" && (
                        <div className="row mt-2">
                          <div className="col-12 col-lg-6">
                            <label htmlFor="gstRate" className="form-label label_text">GST Rate</label>
                            <div className="input-group">
                              <input type="text" className="form-control rounded-0" id="gstRate" name="gstRate"
                                value={form.gstRate} onChange={handleDecimal(2)} placeholder="Enter GST Rate" />
                              <span className="input-group-text">%</span>
                            </div>
                          </div>
                          <div className="col-12 col-lg-6">
                            <label htmlFor="gstEffectiveDate" className="form-label label_text">GST Effective Date</label>
                            <input type="date" className="form-control rounded-0" id="gstEffectiveDate" name="gstEffectiveDate"
                              value={form.gstEffectiveDate} onChange={handleText} />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="col-12">
                    <label htmlFor="description" className="form-label">Description / Remarks</label>
                    <textarea className="form-control" id="description" name="description" rows={3}
                      placeholder="Specifications or remarks...." value={form.description} onChange={handleText} maxLength={500} />
                  </div>
                </div>
              </div>

              <div className="modal-footer border-0 justify-content-start">
                <button type="submit" className="btn addbtn rounded-0 add_button px-4" disabled={saving}>
                  {saving ? "Saving..." : "Add"}
                </button>
                <button type="button" className="btn addbtn rounded-0 Cancel_button px-4" onClick={onClose}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* ── Add Brand / Category / UOM ── */}
      {addModal && (
        <div className="modal fade show" style={{ display: "flex", alignItems: "center", backgroundColor: "#00000050", position: "fixed", inset: 0, zIndex: 10000 }}>
          <div className="modal-dialog modal-sm">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Add New {addModal === 'uom' ? 'UOM' : addModal === 'brand' ? 'Brand' : 'Category'}</h5>
                <button type="button" className="btn-close" onClick={() => setAddModal(null)}></button>
              </div>
              <div className="modal-body">
                <input type="text" className="form-control" value={addValue} autoFocus
                  onChange={(e) => setAddValue(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddNewOption(); } }}
                  placeholder="Enter name" />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setAddModal(null)}>Cancel</button>
                <button type="button" className="btn btn-primary" onClick={handleAddNewOption}>Add</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AddInventoryPopup;