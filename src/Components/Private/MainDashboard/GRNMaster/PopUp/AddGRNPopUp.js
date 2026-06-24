import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { RequiredStar } from "../../../RequiredStar/RequiredStar";
import { getVendors } from "../../../../../hooks/useVendor";
import { getProducts, createProduct } from "../../../../../hooks/useProduct";
import { getPurchaseOrders } from "../../../../../hooks/usePurchaseOrder";
import { createGRN } from "../../../../../hooks/useGRN";
import axios from "axios";
import Select from "react-select";

// ─── Quick Add Product Modal ──────────────────────────────────────────────────
const QuickAddProductModal = ({ onClose, onProductAdded }) => {
  const [productName, setProductName] = useState("");
  const [brandName, setBrandName] = useState("");
  const [model, setModel] = useState("");
  const [baseUOM, setBaseUOM] = useState("");
  const [category, setCategory] = useState("");
  const [currentStockQty, setCurrentStockQty] = useState("");
  const [saving, setSaving] = useState(false);

  const uomOptions = ["bags", "litre", "brass", "kilogram", "gram", "meter", "piece", "box", "carton", "nos"];
  const categoryOptions = [
    { value: "raw material", label: "Raw Material" },
    { value: "finish material", label: "Finish Material" },
    { value: "finished goods", label: "Finished Goods" },
    { value: "scrap", label: "Scrap" },
    { value: "repairing material", label: "Repairing Material" },
    { value: "work in progress", label: "Work in Progress" },
  ];

  const handleSave = async () => {
    if (!productName.trim()) return toast.error("Product Name is required");
    if (!brandName.trim()) return toast.error("Brand Name is required");
    if (!model.trim()) return toast.error("Model is required");
    if (!baseUOM) return toast.error("Base UOM is required");
    if (!category) return toast.error("Product Group is required");

    setSaving(true);
    toast.loading("Creating product...");

    const data = await createProduct({
      productName: productName.trim(),
      brandName: brandName.trim(),
      model: model.trim(),
      baseUOM,
      category,
      currentStockQty: parseFloat(currentStockQty) || 0,
      discountType: "Zero Discount",
      taxType: "none",
      uomConversion: 1,
    });

    toast.dismiss();
    setSaving(false);

    if (data?.success) {
      try {
        const savedBrands = JSON.parse(localStorage.getItem("productBrands") || "[]");
        if (!savedBrands.includes(brandName.trim())) {
          localStorage.setItem("productBrands", JSON.stringify([...savedBrands, brandName.trim()]));
        }
      } catch (_) {}

      toast.success("Product created successfully!");
      onProductAdded(data.product || { brandName: brandName.trim(), model: model.trim(), baseUOM });
      onClose();
    } else {
      toast.error(data?.error || "Failed to create product");
    }
  };

  return (
    <div className="modal fade show" style={{ display: "flex", alignItems: "center", backgroundColor: "#00000070", position: "fixed", top: 0, left: 0, width: "100%", height: "100%", zIndex: 10000 }}>
      <div className="modal-dialog modal-md" style={{ margin: "auto" }}>
        <div className="modal-content p-3">
          <div className="modal-header pt-0">
            <h6 className="fw-bold mb-0">Quick Add Product</h6>
            <button type="button" className="close px-3" onClick={onClose} style={{ marginLeft: "auto" }}><span>&times;</span></button>
          </div>
          <div className="modal-body">
            <div className="row g-2">
              <div className="col-12">
                <label className="form-label label_text">Product Name <RequiredStar /></label>
                <input type="text" className="form-control rounded-0" value={productName} onChange={e => setProductName(e.target.value)} placeholder="Enter product name" maxLength={100} />
              </div>
              <div className="col-6">
                <label className="form-label label_text">Brand Name <RequiredStar /></label>
                <input type="text" className="form-control rounded-0" value={brandName} onChange={e => setBrandName(e.target.value)} placeholder="e.g. Samsung" maxLength={100} />
              </div>
              <div className="col-6">
                <label className="form-label label_text">Model <RequiredStar /></label>
                <input type="text" className="form-control rounded-0" value={model} onChange={e => setModel(e.target.value)} placeholder="e.g. Galaxy S24" maxLength={100} />
              </div>
              <div className="col-6">
                <label className="form-label label_text">Base UOM <RequiredStar /></label>
                <select className="form-select rounded-0" value={baseUOM} onChange={e => setBaseUOM(e.target.value)}>
                  <option value="">Select UOM</option>
                  {uomOptions.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div className="col-6">
                <label className="form-label label_text">Product Group <RequiredStar /></label>
                <select className="form-select rounded-0" value={category} onChange={e => setCategory(e.target.value)}>
                  <option value="">Select Group</option>
                  {categoryOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div className="col-6">
                <label className="form-label label_text">Current Stock Qty</label>
                <input type="number" className="form-control rounded-0" value={currentStockQty} onChange={e => setCurrentStockQty(e.target.value)} placeholder="0" min="0" />
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>Cancel</button>
            <button type="button" className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save Product"}</button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Main AddGRNPopUp ─────────────────────────────────────────────────────────
const AddGRNPopUp = ({ handleAdd, projects }) => {
  const [grnDate, setGrnDate] = useState(new Date().toISOString().split("T")[0]);
  const [choice, setChoice] = useState("");
  const [selectedPO, setSelectedPO] = useState(null);
  const [transactionType, setTransactionType] = useState("");
  const [purchaseType, setPurchaseType] = useState("");
  const [selectedProject, setSelectedProject] = useState(null);
  const [warehouseLocation, setWarehouseLocation] = useState("");
  const [remark, setRemark] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [location, setLocation] = useState("");
  const [termsDocument, setTermsDocument] = useState(null);
  const [uploading, setUploading] = useState(false);

  const [vendors, setVendors] = useState([]);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [vendorSearch, setVendorSearch] = useState("");

  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [poSearch, setPoSearch] = useState("");
  const [filteredPOs, setFilteredPOs] = useState([]);

  const [products, setProducts] = useState([]);
  const [productsLoaded, setProductsLoaded] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);

  const emptyItem = () => ({
    _selectedProductId: "", productName: "", brandName: "", modelNo: "",
    description: "", unit: "", baseUOM: "", orderedQuantity: 0,
    receivedQuantity: 0, price: 0, discountPercent: 0, taxPercent: 0,
    netValue: 0, _currStockQty: 0,
  });

  const [items, setItems] = useState([emptyItem()]);

  // ── Product options ──
  const productOptions = products.map(p => ({
    value: p._id,
    label: `${p.productName || ""}${p.brandName ? " - " + p.brandName : ""}${p.model ? " - " + p.model : ""}`
  }));

  // ── Custom filter: search by productName, brand, model, hsn — paste anything ──
  const productFilterOption = (candidate, input) => {
    if (!input) return true;
    const s = input.toLowerCase();
    const prod = products.find(p => p._id === candidate.value);
    if (!prod) return candidate.label.toLowerCase().includes(s);
    return (
      (prod.productName || "").toLowerCase().includes(s) ||
      (prod.brandName || "").toLowerCase().includes(s) ||
      (prod.model || "").toLowerCase().includes(s) ||
      (prod.hsnCode || "").toLowerCase().includes(s) ||
      candidate.label.toLowerCase().includes(s)
    );
  };

  // ── Load vendors ──
  useEffect(() => {
    const loadVendors = async () => {
      const data = await getVendors(1, 100, vendorSearch);
      if (data?.success) {
        setVendors(data.vendors.map(v => ({ value: v._id, label: `${v.vendorName} - ${v.email}` })));
      }
    };
    loadVendors();
  }, [vendorSearch]);

  // ── Load purchase orders ──
  useEffect(() => {
    const loadPurchaseOrders = async () => {
      const data = await getPurchaseOrders(1, 100, poSearch);
      if (data?.success) {
        const incompletePOs = data.purchaseOrders
          .filter(po => po.status !== "Received" && po.items.some(item => (item.receivedQuantity || 0) < item.quantity))
          .map(po => ({ value: po._id, label: `${po.orderNumber} - ${po.vendor?.vendorName}`, po, vendorId: po.vendor?._id }));
        setPurchaseOrders(incompletePOs);
      }
    };
    if (choice === "Against PO") loadPurchaseOrders();
  }, [poSearch, choice]);

  // ── Filter POs by vendor ──
  useEffect(() => {
    if (selectedVendor) {
      setFilteredPOs(purchaseOrders.filter(po => po.vendorId === selectedVendor.value));
      if (selectedPO && selectedPO.vendorId !== selectedVendor.value) setSelectedPO(null);
    } else {
      setFilteredPOs([]);
    }
  }, [selectedVendor, purchaseOrders]);

  // ── Load ALL products once (for Direct Material dropdown) ──
  useEffect(() => {
    const loadAllProducts = async () => {
      if (productsLoaded) return;
      let allProducts = [];
      let page = 1;
      const pageSize = 200;
      let hasMore = true;
      while (hasMore) {
        const data = await getProducts(page, pageSize, "");
        if (data?.success && data.products?.length > 0) {
          allProducts = [...allProducts, ...data.products];
          if (data.products.length < pageSize) hasMore = false;
          else page++;
        } else { hasMore = false; }
      }
      setProducts(allProducts);
      setProductsLoaded(true);
    };
    if (choice === "Direct Material") loadAllProducts();
  }, [choice, productsLoaded]);

  // ── Helpers ──
  const getStockForBrandModel = (brandName, modelNo) => {
    const product = products.find(p => p.brandName === brandName && p.model === modelNo);
    return product ? (product.currentStockQty ?? 0) : 0;
  };

  const calculateNetValue = (item) => {
    const base = item.receivedQuantity * item.price;
    const afterDiscount = base - base * (item.discountPercent / 100);
    return afterDiscount + afterDiscount * (item.taxPercent / 100);
  };

  // ── Product select → auto-fill fields ──
  const handleProductSelect = (index, selectedProductId) => {
    const newItems = [...items];
    if (!selectedProductId) {
      newItems[index]._selectedProductId = "";
      newItems[index].netValue = calculateNetValue(newItems[index]);
      setItems(newItems);
      return;
    }
    const product = products.find(p => p._id === selectedProductId);
    if (product) {
      newItems[index]._selectedProductId = product._id;
      newItems[index].productName = product.productName || "";
      newItems[index].brandName = product.brandName || "";
      newItems[index].modelNo = product.model || "";
      newItems[index].description = product.description || "";
      newItems[index].unit = product.baseUOM || "";
      newItems[index].baseUOM = product.baseUOM || "";
      newItems[index].price = product.purchasePrice || product.salesPrice || 0;
      newItems[index].discountPercent = 0;
      newItems[index].taxPercent = product.gstRate || 0;
      newItems[index]._currStockQty = product.currentStockQty ?? 0;
      newItems[index].netValue = calculateNetValue(newItems[index]);
    }
    setItems(newItems);
  };

  // ── Manual field change ──
  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    // If user manually types in productName/brand/model, clear product dropdown selection
    if (field === "productName" || field === "brandName" || field === "modelNo") {
      newItems[index]._selectedProductId = "";
    }
    newItems[index].netValue = calculateNetValue(newItems[index]);
    setItems(newItems);
  };

  const handleAddItem = () => setItems([...items, emptyItem()]);
  const handleRemoveItem = (index) => { if (items.length > 1) setItems(items.filter((_, i) => i !== index)); };

  // ── Vendor change ──
  const handleVendorChange = (selected) => {
    setSelectedVendor(selected);
    setSelectedPO(null);
    setTransactionType(""); setPurchaseType(""); setSelectedProject(null);
    setWarehouseLocation(""); setDeliveryAddress(""); setLocation("");
    setItems([emptyItem()]);
  };

  // ── PO change ──
  const handlePOChange = (selected) => {
    setSelectedPO(selected);
    if (selected?.po) {
      const po = selected.po;
      setTransactionType(po.transactionType);
      setPurchaseType(po.purchaseType);
      setDeliveryAddress(po.deliveryAddress || "");
      setLocation(po.location || "");
      setWarehouseLocation(po.warehouseLocation || "");
      if (po.project) setSelectedProject(projects.find(p => p.value === po.project._id));

      const grnItems = po.items.map(item => {
        const alreadyReceived = item.receivedQuantity || 0;
        const remaining = item.quantity - alreadyReceived;
        return {
          ...emptyItem(),
          productName: item.productName || "",
          brandName: item.brandName,
          modelNo: item.modelNo,
          description: item.description || "",
          unit: item.unit || item.baseUOM,
          baseUOM: item.baseUOM || "",
          orderedQuantity: item.quantity,
          receivedQuantity: remaining,
          price: item.price || 0,
          discountPercent: item.discountPercent || 0,
          taxPercent: item.taxPercent || 0,
          netValue: calculateNetValue({ receivedQuantity: remaining, price: item.price || 0, discountPercent: item.discountPercent || 0, taxPercent: item.taxPercent || 0 }),
          _currStockQty: getStockForBrandModel(item.brandName, item.modelNo),
        };
      });
      setItems(grnItems);
    }
  };

  const handleProductAdded = () => { setProductsLoaded(false); };
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("File size exceeds 5MB limit"); return; }
    setTermsDocument(file);
  };

  // ── Submit — only validates: choice, vendor, transactionType, purchaseType, warehouseLocation, receivedQuantity >= 0 ──
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!choice) return toast.error("Please select choice");
    if (!selectedVendor) return toast.error("Please select a vendor");
    if (!transactionType || !purchaseType) return toast.error("Please fill Transaction Type and Purchase Type");
    if (purchaseType === "Stock" && !warehouseLocation) return toast.error("Please enter warehouse location");
    for (let item of items) {
      if (item.receivedQuantity < 0) return toast.error("Received quantity cannot be negative");
    }

    const cleanItems = items.map(({ _currStockQty, _selectedProductId, ...rest }) => rest);
    const grnData = {
      grnDate: new Date(grnDate), choice,
      purchaseOrder: choice === "Against PO" ? (selectedPO?.value || undefined) : undefined,
      vendor: selectedVendor.value, transactionType, purchaseType,
      project: purchaseType === "Project Purchase" ? (selectedProject?.value || undefined) : undefined,
      warehouseLocation: purchaseType === "Stock" ? warehouseLocation : undefined,
      deliveryAddress, location, items: cleanItems, remark,
    };

    if (termsDocument) {
      const formData = new FormData();
      formData.append("file", termsDocument);
      formData.append("grnData", JSON.stringify(grnData));
      setUploading(true);
      toast.loading("Creating GRN...");
      try {
        const response = await axios.post(`${process.env.REACT_APP_API_URL}/api/grn/with-document`, formData, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
        toast.dismiss();
        if (response.data.success) { toast.success(response.data.message); handleAdd(); }
        else toast.error(response.data.error || "Failed to create GRN");
      } catch (error) {
        toast.dismiss();
        toast.error(error.response ? `Server error: ${error.response.status}` : "Network error");
      } finally { setUploading(false); }
    } else {
      toast.loading("Creating GRN...");
      const data = await createGRN(grnData);
      toast.dismiss();
      if (data?.success) { toast.success(data.message); handleAdd(); }
      else toast.error(data?.error || "Failed to create GRN");
    }
  };

  const today = new Date().toISOString().split("T")[0];
  const grandTotal = items.reduce((sum, item) => sum + (Number(item.netValue) || 0), 0);

  const selectStyles = {
    menuPortal: base => ({ ...base, zIndex: 9999 }),
    control: base => ({ ...base, fontSize: "0.78rem", minHeight: "28px" }),
    option: base => ({ ...base, fontSize: "0.76rem", padding: "2px 8px" }),
    input: base => ({ ...base, fontSize: "0.78rem" }),
  };

  return (
    <>
      {showQuickAdd && <QuickAddProductModal onClose={() => setShowQuickAdd(false)} onProductAdded={handleProductAdded} />}

      <div className="modal fade show" style={{ display: "flex", alignItems: "center", backgroundColor: "#00000090" }}>
        <div className="modal-dialog modal-xl">
          <div className="modal-content p-3">
            <form onSubmit={handleSubmit}>
              <div className="modal-header pt-0">
                <h5 className="card-title fw-bold">Create New GRN (Goods Receipt Note)</h5>
                <button onClick={handleAdd} type="button" className="close px-3" style={{ marginLeft: "auto" }}><span aria-hidden="true">&times;</span></button>
              </div>

              <div className="modal-body">
                <div className="row modal_body_height">

                  <div className="col-12 col-lg-6">
                    <div className="mb-3">
                      <label className="form-label label_text">Choice <RequiredStar /></label>
                      <select className="form-select rounded-0" value={choice} onChange={e => setChoice(e.target.value)} required>
                        <option value="">Select Choice</option>
                        <option value="Against PO">Against PO</option>
                        <option value="Direct Material">Direct Material</option>
                      </select>
                    </div>
                  </div>

                  <div className="col-12 col-lg-6">
                    <div className="mb-3">
                      <label className="form-label label_text">GRN Date <RequiredStar /></label>
                      <input type="date" className="form-control rounded-0" value={grnDate} max={today} required
                        onChange={e => { if (new Date(e.target.value) <= new Date()) setGrnDate(e.target.value); else { setGrnDate(today); toast.error("Future dates not allowed"); } }}
                      />
                    </div>
                  </div>

                  {choice === "Against PO" && (
                    <>
                      <div className="col-12 col-lg-6">
                        <div className="mb-3">
                          <label className="form-label label_text">Vendor Name <RequiredStar /></label>
                          <Select value={selectedVendor} onChange={handleVendorChange} onInputChange={setVendorSearch} options={vendors} placeholder="Select Vendor..." isClearable className="react-select-container" classNamePrefix="react-select" />
                        </div>
                      </div>
                      <div className="col-12 col-lg-6">
                        <div className="mb-3">
                          <label className="form-label label_text">PO No.</label>
                          <Select value={selectedPO} onChange={handlePOChange} onInputChange={setPoSearch} options={filteredPOs} placeholder={selectedVendor ? "Select PO..." : "Select vendor first"} isClearable isDisabled={!selectedVendor} className="react-select-container" classNamePrefix="react-select" />
                          {selectedVendor && filteredPOs.length === 0 && <small className="text-muted d-block mt-1">No incomplete POs for this vendor</small>}
                        </div>
                      </div>
                    </>
                  )}

                  {choice === "Direct Material" && (
                    <div className="col-12 col-lg-6">
                      <div className="mb-3">
                        <label className="form-label label_text">Vendor Name <RequiredStar /></label>
                        <Select value={selectedVendor} onChange={setSelectedVendor} onInputChange={setVendorSearch} options={vendors} placeholder="Select Vendor..." isClearable className="react-select-container" classNamePrefix="react-select" />
                      </div>
                    </div>
                  )}

                  <div className="col-12 col-lg-6">
                    <div className="mb-3">
                      <label className="form-label label_text">Transaction Type <RequiredStar /></label>
                      <select className="form-select rounded-0" value={transactionType} onChange={e => setTransactionType(e.target.value)} disabled={choice === "Against PO"} required>
                        <option value="">Select</option>
                        <option value="B2B">B2B</option><option value="SEZ">SEZ</option><option value="Import">Import</option><option value="Asset">Asset</option>
                      </select>
                    </div>
                  </div>

                  <div className="col-12 col-lg-6">
                    <div className="mb-3">
                      <label className="form-label label_text">Project Purchase / Stock <RequiredStar /></label>
                      <select className="form-select rounded-0" value={purchaseType} onChange={e => setPurchaseType(e.target.value)} disabled={choice === "Against PO"} required>
                        <option value="">Select</option>
                        <option value="Project Purchase">Project Purchase</option><option value="Stock">Stock</option>
                      </select>
                    </div>
                  </div>

                  {purchaseType === "Project Purchase" && (
                    <div className="col-12 col-lg-6">
                      <div className="mb-3">
                        <label className="form-label label_text">Project Name</label>
                        <Select value={selectedProject} onChange={setSelectedProject} options={projects} placeholder="Select Project..." isClearable isDisabled={choice === "Against PO"} />
                      </div>
                    </div>
                  )}

                  {purchaseType === "Stock" && (
                    <div className="col-12 col-lg-6">
                      <div className="mb-3">
                        <label className="form-label label_text">Warehouse Location <RequiredStar /></label>
                        <input type="text" className="form-control rounded-0" value={warehouseLocation} onChange={e => setWarehouseLocation(e.target.value)} placeholder="Ex: Baner / Mumbai" maxLength={200} disabled={choice === "Against PO"} required />
                      </div>
                    </div>
                  )}

                  <div className="col-12 col-lg-6">
                    <div className="mb-3">
                      <label className="form-label label_text">Delivery Address</label>
                      <textarea className="form-control rounded-0" rows="2" value={deliveryAddress} onChange={e => setDeliveryAddress(e.target.value)} maxLength={500} disabled={choice === "Against PO"} />
                    </div>
                  </div>

                  <div className="col-12 col-lg-6">
                    <div className="mb-3">
                      <label className="form-label label_text">Location</label>
                      <input type="text" className="form-control rounded-0" value={location} onChange={e => setLocation(e.target.value)} maxLength={200} disabled={choice === "Against PO"} />
                    </div>
                  </div>

                  <div className="col-12 col-lg-6">
                    <div className="mb-3">
                      <label className="form-label label_text">Document</label>
                      <input type="file" className="form-control rounded-0" onChange={handleFileChange} accept=".pdf,.doc,.docx" />
                      {termsDocument && <small className="text-success d-block mt-1">Selected: {termsDocument.name}</small>}
                    </div>
                  </div>

                  {/* ── Item Details ── */}
                  <div className="col-12 mt-3">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <h6 className="fw-bold mb-0">Item Details</h6>
                      <div className="d-flex gap-2">
                        {choice === "Direct Material" && (
                          <button type="button" className="btn btn-sm btn-outline-success" onClick={() => setShowQuickAdd(true)}><i className="fa fa-plus me-1"></i> Add Product</button>
                        )}
                        {choice === "Direct Material" && (
                          <button type="button" className="btn btn-sm btn-primary" onClick={handleAddItem}><i className="fa fa-plus me-1"></i> Add Row</button>
                        )}
                      </div>
                    </div>

                    {choice === "Direct Material" && !productsLoaded && (
                      <div className="text-center py-3">
                        <div className="spinner-border spinner-border-sm text-primary" role="status"></div>
                        <span className="ms-2">Loading products...</span>
                      </div>
                    )}

                    <div className="table-responsive">
                      <table className="table table-bordered table-sm">
                        <thead className="table-dark">
                          <tr>
                            {choice === "Direct Material" && <th style={{ minWidth: 190 }}>Select Product</th>}
                            <th style={{ minWidth: 140 }}>Product Name</th>
                            <th style={{ minWidth: 110 }}>Brand Name</th>
                            <th style={{ minWidth: 110 }}>Model No</th>
                            <th style={{ minWidth: 60 }}>Unit</th>
                            <th style={{ minWidth: 75 }}>Ord. Qty</th>
                            {choice === "Against PO" && <th style={{ minWidth: 70 }}>Rcvd</th>}
                            <th style={{ minWidth: 75 }}>Rcv Qty</th>
                            <th style={{ minWidth: 80 }}>Price</th>
                            <th style={{ minWidth: 65 }}>Disc %</th>
                            <th style={{ minWidth: 65 }}>Tax %</th>
                            <th style={{ minWidth: 90 }}>Net Value</th>
                            <th style={{ minWidth: 75 }} className="text-warning">Stock</th>
                            <th style={{ minWidth: 75 }} className="text-info">Balance</th>
                            <th style={{ minWidth: 160 }}>Remark</th>
                            {choice === "Direct Material" && <th style={{ minWidth: 42 }}>Del</th>}
                          </tr>
                        </thead>
                        <tbody>
                          {items.map((item, index) => {
                            let alreadyReceived = 0, remainingQty = item.orderedQuantity;
                            if (choice === "Against PO" && selectedPO?.po) {
                              const poItem = selectedPO.po.items.find(i => i.brandName === item.brandName && i.modelNo === item.modelNo);
                              if (poItem) { alreadyReceived = poItem.receivedQuantity || 0; remainingQty = poItem.quantity - alreadyReceived; }
                            }
                            const currStock = item._currStockQty ?? 0;
                            const orderedQty = parseFloat(item.orderedQuantity) || 0;
                            const receivedQty = parseFloat(item.receivedQuantity) || 0;
                            const balanceQty = currStock + orderedQty - receivedQty;
                            const balanceColor = balanceQty > currStock ? "#15803d" : balanceQty === currStock ? "#6b7280" : "#1e40af";

                            return (
                              <tr key={index}>
                                {choice === "Direct Material" && (
                                  <td>
                                    <Select
                                      value={productOptions.find(p => p.value === item._selectedProductId) || null}
                                      onChange={sel => handleProductSelect(index, sel ? sel.value : "")}
                                      options={productOptions} placeholder="Type/paste to search..."
                                      isClearable filterOption={productFilterOption}
                                      menuPortalTarget={document.body} styles={selectStyles}
                                    />
                                  </td>
                                )}

                                <td>
                                  {choice === "Against PO" ? (
                                    <input type="text" className="form-control form-control-sm rounded-0" value={item.productName} readOnly style={{ minWidth: 120 }} />
                                  ) : (
                                    <input type="text" className="form-control form-control-sm rounded-0" value={item.productName} onChange={e => handleItemChange(index, "productName", e.target.value)} placeholder="e.g. Transport, Service..." style={{ minWidth: 120 }} />
                                  )}
                                </td>

                                <td>
                                  {choice === "Against PO" ? (
                                    <input type="text" className="form-control form-control-sm rounded-0" value={item.brandName} readOnly style={{ minWidth: 95 }} />
                                  ) : (
                                    <input type="text" className="form-control form-control-sm rounded-0" value={item.brandName} onChange={e => handleItemChange(index, "brandName", e.target.value)} placeholder="Optional" style={{ minWidth: 95 }} />
                                  )}
                                </td>

                                <td>
                                  {choice === "Against PO" ? (
                                    <input type="text" className="form-control form-control-sm rounded-0" value={item.modelNo} readOnly style={{ minWidth: 95 }} />
                                  ) : (
                                    <input type="text" className="form-control form-control-sm rounded-0" value={item.modelNo} onChange={e => handleItemChange(index, "modelNo", e.target.value)} placeholder="Optional" style={{ minWidth: 95 }} />
                                  )}
                                </td>

                                <td>
                                  {choice === "Against PO" ? (
                                    <input type="text" className="form-control form-control-sm rounded-0" value={item.unit} readOnly />
                                  ) : (
                                    <input type="text" className="form-control form-control-sm rounded-0" value={item.unit} onChange={e => handleItemChange(index, "unit", e.target.value)} placeholder="Unit" />
                                  )}
                                </td>

                                <td><input type="number" className="form-control form-control-sm rounded-0" value={item.orderedQuantity} onChange={e => handleItemChange(index, "orderedQuantity", Number(e.target.value))} min="0" disabled={choice === "Against PO"} /></td>

                                {choice === "Against PO" && <td><input type="number" className="form-control form-control-sm rounded-0" value={alreadyReceived} readOnly /></td>}

                                <td>
                                  <input type="number" className="form-control form-control-sm rounded-0" value={item.receivedQuantity} onChange={e => handleItemChange(index, "receivedQuantity", Number(e.target.value))} min="0" max={choice === "Against PO" ? remainingQty : undefined} required />
                                  {choice === "Against PO" && <small className="text-muted">Max: {remainingQty}</small>}
                                </td>

                                <td><input type="number" className="form-control form-control-sm rounded-0" value={item.price} onChange={e => handleItemChange(index, "price", Number(e.target.value))} min="0" step="0.01" readOnly={choice === "Against PO"} /></td>

                                <td>
                                  <input type="number" className="form-control form-control-sm rounded-0" value={item.discountPercent}
                                    onChange={e => { const v = e.target.value; if (v === '' || v === '.' || /^\d*\.?\d{0,2}$/.test(v)) handleItemChange(index, "discountPercent", v === '' ? 0 : Number(v)); }}
                                    min="0" max="100" step="0.01" readOnly={choice === "Against PO"} />
                                </td>

                                <td>
                                  <input type="number" className="form-control form-control-sm rounded-0" value={item.taxPercent}
                                    onChange={e => { const v = e.target.value; if (v === '' || v === '.' || /^\d*\.?\d{0,2}$/.test(v)) handleItemChange(index, "taxPercent", v === '' ? 0 : Number(v)); }}
                                    min="0" max="100" step="0.01" readOnly={choice === "Against PO"} />
                                </td>

                                <td className="text-end align-middle fw-bold">{(item.netValue || 0).toFixed(2)}</td>

                                <td className="text-center align-middle">
                                  <span style={{ fontWeight: 700, fontSize: "0.82rem", color: currStock > 0 ? "#1e40af" : "#6b7280" }}>
                                    {currStock}{item.unit && <small style={{ fontWeight: 400, fontSize: "0.68rem", marginLeft: 2 }}>{item.unit}</small>}
                                  </span>
                                </td>

                                <td className="text-center align-middle">
                                  <span style={{ fontWeight: 700, fontSize: "0.82rem", color: balanceColor }}>
                                    {balanceQty}{item.unit && <small style={{ fontWeight: 400, fontSize: "0.68rem", marginLeft: 2 }}>{item.unit}</small>}
                                  </span>
                                </td>

                                <td><textarea className="form-control form-control-sm rounded-0" value={item.description} onChange={e => handleItemChange(index, "description", e.target.value)} rows="1" disabled={choice === "Against PO"} /></td>

                                {choice === "Direct Material" && (
                                  <td className="text-center align-middle">
                                    <button type="button" className="btn btn-sm btn-danger" onClick={() => handleRemoveItem(index)} disabled={items.length === 1}><i className="fa fa-trash"></i></button>
                                  </td>
                                )}
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot>
                          <tr className="fw-bold table-secondary">
                            <td colSpan={choice === "Against PO" ? 10 : 11} className="text-end">Grand Total:</td>
                            <td className="text-end">{grandTotal.toFixed(2)}</td>
                            <td colSpan={choice === "Direct Material" ? 4 : 3}></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>

                  <div className="col-12 mt-3">
                    <div className="mb-3">
                      <label className="form-label label_text">Remark</label>
                      <textarea className="form-control rounded-0" rows="3" value={remark} onChange={e => setRemark(e.target.value)} maxLength={1000} />
                    </div>
                  </div>

                  <div className="col-12 pt-3 mt-2">
                    <button type="submit" className="w-80 btn addbtn rounded-0 add_button m-2 px-4" disabled={uploading}>Add</button>
                    <button type="button" onClick={handleAdd} className="w-80 btn addbtn rounded-0 Cancel_button m-2 px-4">Cancel</button>
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

export default AddGRNPopUp;