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
      onProductAdded(data.product || { brandName: brandName.trim(), model: model.trim(), baseUOM, currentStockQty: parseFloat(currentStockQty) || 0 });
      onClose();
    } else {
      toast.error(data?.error || "Failed to create product");
    }
  };

  return (
    <div
      className="modal fade show"
      style={{ display: "flex", alignItems: "center", backgroundColor: "#00000070", position: "fixed", top: 0, left: 0, width: "100%", height: "100%", zIndex: 10000 }}
    >
      <div className="modal-dialog modal-md" style={{ margin: "auto" }}>
        <div className="modal-content p-3">
          <div className="modal-header pt-0">
            <h6 className="fw-bold mb-0">Quick Add Product</h6>
            <button type="button" className="close px-3" onClick={onClose} style={{ marginLeft: "auto" }}>
              <span>&times;</span>
            </button>
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
            <button type="button" className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save Product"}
            </button>
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
  const [productSearch, setProductSearch] = useState("");
  const [brands, setBrands] = useState([]);

  const [showQuickAdd, setShowQuickAdd] = useState(false);

  const [items, setItems] = useState([
    {
      brandName: "",
      modelNo: "",
      description: "",
      unit: "",
      baseUOM: "",
      orderedQuantity: 0,
      receivedQuantity: 0,
      price: 0,
      discountPercent: 0,
      taxPercent: 0,
      netValue: 0,
      _currStockQty: 0,
    },
  ]);

  // ── Load vendors ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const loadVendors = async () => {
      const data = await getVendors(1, 100, vendorSearch);
      if (data.success) {
        setVendors(data.vendors.map(v => ({ value: v._id, label: `${v.vendorName} - ${v.email}` })));
      }
    };
    loadVendors();
  }, [vendorSearch]);

  // ── Load purchase orders ──────────────────────────────────────────────────────
  useEffect(() => {
    const loadPurchaseOrders = async () => {
      const data = await getPurchaseOrders(1, 100, poSearch);
      if (data.success) {
        const incompletePOs = data.purchaseOrders
          .filter(po => {
            if (po.status === "Received") return false;
            return po.items.some(item => (item.receivedQuantity || 0) < item.quantity);
          })
          .map(po => ({
            value: po._id,
            label: `${po.orderNumber} - ${po.vendor?.vendorName}`,
            po,
            vendorId: po.vendor?._id,
          }));
        setPurchaseOrders(incompletePOs);
      }
    };
    if (choice === "Against PO") loadPurchaseOrders();
  }, [poSearch, choice]);

  // ── Filter POs by vendor ──────────────────────────────────────────────────────
  useEffect(() => {
    if (selectedVendor) {
      const filtered = purchaseOrders.filter(po => po.vendorId === selectedVendor.value);
      setFilteredPOs(filtered);
      if (selectedPO && selectedPO.vendorId !== selectedVendor.value) setSelectedPO(null);
    } else {
      setFilteredPOs([]);
    }
  }, [selectedVendor, purchaseOrders]);

  // ── Load products (for Direct Material) ──────────────────────────────────────
  const loadProductsData = async () => {
    const data = await getProducts(1, 1000, productSearch);
    if (data.success) {
      setProducts(data.products);
      const uniqueBrands = [...new Set(data.products.map(p => p.brandName).filter(Boolean))];
      setBrands(uniqueBrands.map(brand => ({ value: brand, label: brand })));
    }
  };

  useEffect(() => {
    if (choice === "Direct Material") loadProductsData();
  }, [productSearch, choice]);

  // ── Helpers ───────────────────────────────────────────────────────────────────
  const getModelsForBrand = (brandName) => {
    const brandProducts = products.filter(p => p.brandName === brandName);
    const uniqueModels = [...new Set(brandProducts.map(p => p.model).filter(Boolean))];
    return uniqueModels.map(m => ({ value: m, label: m }));
  };

  const getStockForBrandModel = (brandName, modelNo) => {
    const product = products.find(p => p.brandName === brandName && p.model === modelNo);
    return product ? (product.currentStockQty ?? 0) : 0;
  };

  const calculateNetValue = (item) => {
    const base = item.receivedQuantity * item.price;
    const afterDiscount = base - base * (item.discountPercent / 100);
    return afterDiscount + afterDiscount * (item.taxPercent / 100);
  };

  // ── Item change handler ───────────────────────────────────────────────────────
  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };

    if (field === "brandName") {
      newItems[index].modelNo = "";
      newItems[index].baseUOM = "";
      newItems[index].unit = "";
      newItems[index]._currStockQty = 0;
    }

    if (field === "modelNo" && value && newItems[index].brandName) {
      const product = products.find(
        p => p.brandName === newItems[index].brandName && p.model === value
      );
      if (product) {
        newItems[index].baseUOM = product.baseUOM || "";
        newItems[index].unit = product.baseUOM || "";
        newItems[index].description = product.description || "";
        newItems[index]._currStockQty = product.currentStockQty ?? 0;
      }
    }

    newItems[index].netValue = calculateNetValue(newItems[index]);
    setItems(newItems);
  };

  const handleAddItem = () => {
    setItems([
      ...items,
      { brandName: "", modelNo: "", description: "", unit: "", baseUOM: "", orderedQuantity: 0, receivedQuantity: 0, price: 0, discountPercent: 0, taxPercent: 0, netValue: 0, _currStockQty: 0 },
    ]);
  };

  const handleRemoveItem = (index) => {
    if (items.length > 1) setItems(items.filter((_, i) => i !== index));
  };

  // ── PO selection ──────────────────────────────────────────────────────────────
  const handleVendorChange = (selected) => {
    setSelectedVendor(selected);
    setSelectedPO(null);
    setTransactionType("");
    setPurchaseType("");
    setSelectedProject(null);
    setWarehouseLocation("");
    setDeliveryAddress("");
    setLocation("");
    setItems([{ brandName: "", modelNo: "", description: "", unit: "", baseUOM: "", orderedQuantity: 0, receivedQuantity: 0, price: 0, discountPercent: 0, taxPercent: 0, netValue: 0, _currStockQty: 0 }]);
  };

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
          brandName: item.brandName,
          modelNo: item.modelNo,
          description: item.description || "",
          unit: item.unit || item.baseUOM,
          baseUOM: item.baseUOM || "",
          orderedQuantity: item.quantity,
          receivedQuantity: remaining,
          price: item.price,
          discountPercent: item.discountPercent,
          taxPercent: item.taxPercent,
          netValue: calculateNetValue({ receivedQuantity: remaining, price: item.price, discountPercent: item.discountPercent, taxPercent: item.taxPercent }),
          _currStockQty: getStockForBrandModel(item.brandName, item.modelNo),
        };
      });
      setItems(grnItems);
    }
  };

  // ── After quick-add product ───────────────────────────────────────────────────
  const handleProductAdded = (newProduct) => {
    loadProductsData();
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("File size exceeds 5MB limit"); return; }
    setTermsDocument(file);
  };

  // ── Submit ────────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!choice) return toast.error("Please select choice (Against PO or Direct Material)");
    if (choice === "Against PO" && !selectedPO) return toast.error("Please select a purchase order");
    if (!selectedVendor) return toast.error("Please select a vendor");
    if (!transactionType || !purchaseType) return toast.error("Please fill all required fields");
    // ✅ REMOVED: project validation — project is now optional
    if (purchaseType === "Stock" && !warehouseLocation) return toast.error("Please enter warehouse location");
    for (let item of items) {
      if (!item.brandName || !item.modelNo || item.receivedQuantity < 0) return toast.error("Please fill all item details correctly");
    }

    // Strip display-only fields before sending
    const cleanItems = items.map(({ _currStockQty, ...rest }) => rest);

    const grnData = {
      grnDate: new Date(grnDate),
      choice,
      purchaseOrder: choice === "Against PO" ? selectedPO.value : undefined,
      vendor: selectedVendor.value,
      transactionType,
      purchaseType,
      project: purchaseType === "Project Purchase" ? (selectedProject?.value || undefined) : undefined,
      warehouseLocation: purchaseType === "Stock" ? warehouseLocation : undefined,
      deliveryAddress,
      location,
      items: cleanItems,
      remark,
    };

    if (termsDocument) {
      const formData = new FormData();
      formData.append("file", termsDocument);
      formData.append("grnData", JSON.stringify(grnData));
      setUploading(true);
      toast.loading("Creating GRN...");
      try {
        const response = await axios.post(`${process.env.REACT_APP_API_URL}/api/grn/with-document`, formData, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        toast.dismiss();
        if (response.data.success) { toast.success(response.data.message); handleAdd(); }
        else toast.error(response.data.error || "Failed to create GRN");
      } catch (error) {
        toast.dismiss();
        toast.error(error.response ? `Server error: ${error.response.status}` : "Network error");
      } finally {
        setUploading(false);
      }
    } else {
      toast.loading("Creating GRN...");
      const data = await createGRN(grnData);
      toast.dismiss();
      if (data.success) { toast.success(data.message); handleAdd(); }
      else toast.error(data.error || "Failed to create GRN");
    }
  };

  const today = new Date().toISOString().split("T")[0];

  return (
    <>
      {showQuickAdd && (
        <QuickAddProductModal
          onClose={() => setShowQuickAdd(false)}
          onProductAdded={handleProductAdded}
        />
      )}

      <div className="modal fade show" style={{ display: "flex", alignItems: "center", backgroundColor: "#00000090" }}>
        <div className="modal-dialog modal-xl">
          <div className="modal-content p-3">
            <form onSubmit={handleSubmit}>
              <div className="modal-header pt-0">
                <h5 className="card-title fw-bold">Create New GRN (Goods Receipt Note)</h5>
                <button onClick={handleAdd} type="button" className="close px-3" style={{ marginLeft: "auto" }}>
                  <span aria-hidden="true">&times;</span>
                </button>
              </div>

              <div className="modal-body">
                <div className="row modal_body_height">

                  {/* ── Choice & Date ── */}
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
                      <input
                        type="date" className="form-control rounded-0" value={grnDate} max={today} required
                        onChange={e => {
                          if (new Date(e.target.value) <= new Date()) setGrnDate(e.target.value);
                          else { setGrnDate(today); toast.error("Future dates are not allowed"); }
                        }}
                      />
                    </div>
                  </div>

                  {/* ── Against PO: Vendor + PO ── */}
                  {choice === "Against PO" && (
                    <>
                      <div className="col-12 col-lg-6">
                        <div className="mb-3">
                          <label className="form-label label_text">Vendor Name <RequiredStar /></label>
                          <Select value={selectedVendor} onChange={handleVendorChange} onInputChange={setVendorSearch} options={vendors} placeholder="Select Vendor..." isClearable className="react-select-container" classNamePrefix="react-select" required />
                        </div>
                      </div>
                      <div className="col-12 col-lg-6">
                        <div className="mb-3">
                          <label className="form-label label_text">PO No. <RequiredStar /></label>
                          <Select value={selectedPO} onChange={handlePOChange} onInputChange={setPoSearch} options={filteredPOs} placeholder={selectedVendor ? "Select Purchase Order..." : "Please select a vendor first"} isClearable isDisabled={!selectedVendor} className="react-select-container" classNamePrefix="react-select" required />
                          {selectedVendor && filteredPOs.length === 0 && (
                            <small className="text-muted d-block mt-1">No incomplete purchase orders found for this vendor</small>
                          )}
                        </div>
                      </div>
                    </>
                  )}

                  {/* ── Direct Material: Vendor ── */}
                  {choice === "Direct Material" && (
                    <div className="col-12 col-lg-6">
                      <div className="mb-3">
                        <label className="form-label label_text">Vendor Name <RequiredStar /></label>
                        <Select value={selectedVendor} onChange={setSelectedVendor} onInputChange={setVendorSearch} options={vendors} placeholder="Select Vendor..." isClearable className="react-select-container" classNamePrefix="react-select" required />
                      </div>
                    </div>
                  )}

                  {/* ── Transaction & Purchase Type ── */}
                  <div className="col-12 col-lg-6">
                    <div className="mb-3">
                      <label className="form-label label_text">Transaction Type <RequiredStar /></label>
                      <select className="form-select rounded-0" value={transactionType} onChange={e => setTransactionType(e.target.value)} disabled={choice === "Against PO"} required>
                        <option value="">Select Transaction Type</option>
                        <option value="B2B">B2B</option>
                        <option value="SEZ">SEZ</option>
                        <option value="Import">Import</option>
                        <option value="Asset">Asset</option>
                      </select>
                    </div>
                  </div>

                  <div className="col-12 col-lg-6">
                    <div className="mb-3">
                      <label className="form-label label_text">Project Purchase / Stock <RequiredStar /></label>
                      <select className="form-select rounded-0" value={purchaseType} onChange={e => setPurchaseType(e.target.value)} disabled={choice === "Against PO"} required>
                        <option value="">Select Type</option>
                        <option value="Project Purchase">Project Purchase</option>
                        <option value="Stock">Stock</option>
                      </select>
                    </div>
                  </div>

                  {/* ── Project Name (optional) ── */}
                  {purchaseType === "Project Purchase" && (
                    <div className="col-12 col-lg-6">
                      <div className="mb-3">
                        <label className="form-label label_text">Project Name</label>
                        <Select
                          value={selectedProject}
                          onChange={setSelectedProject}
                          options={projects}
                          placeholder="Select Project (Optional)..."
                          isClearable
                          isDisabled={choice === "Against PO"}
                        />
                      </div>
                    </div>
                  )}

                  {purchaseType === "Stock" && (
                    <div className="col-12 col-lg-6">
                      <div className="mb-3">
                        <label className="form-label label_text">Warehouse Location <RequiredStar /></label>
                        <input type="text" className="form-control rounded-0" value={warehouseLocation} onChange={e => setWarehouseLocation(e.target.value)} placeholder="Ex: Baner / Amazon / Mumbai" maxLength={200} disabled={choice === "Against PO"} required />
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
                          <button type="button" className="btn btn-sm btn-outline-success" onClick={() => setShowQuickAdd(true)} title="Add new product to Product Master">
                            <i className="fa fa-plus me-1"></i> Add Product
                          </button>
                        )}
                        {choice === "Direct Material" && (
                          <button type="button" className="btn btn-sm btn-primary" onClick={handleAddItem}>
                            <i className="fa fa-plus me-1"></i> Add Row
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="table-responsive">
                      <table className="table table-bordered table-sm">
                        <thead className="table-dark">
                          <tr>
                            <th style={{ minWidth: 160 }}>Brand Name</th>
                            <th style={{ minWidth: 160 }}>Model No</th>
                            <th style={{ minWidth: 80 }}>Unit</th>
                            <th style={{ minWidth: 90 }}>Ordered Qty</th>
                            {choice === "Against PO" && <th style={{ minWidth: 100 }}>Already Rcvd</th>}
                            <th style={{ minWidth: 90 }}>Received Qty</th>
                            <th style={{ minWidth: 100 }} className="text-warning">Curr. Stock</th>
                            <th style={{ minWidth: 100 }} className="text-info">Balance Qty</th>
                            <th style={{ minWidth: 80 }}>Remark</th>
                            {choice === "Direct Material" && <th style={{ minWidth: 60 }}>Del</th>}
                          </tr>
                        </thead>
                        <tbody>
                          {items.map((item, index) => {
                            const modelOptions = choice === "Direct Material" ? getModelsForBrand(item.brandName) : [];

                            let alreadyReceived = 0;
                            let remainingQty = item.orderedQuantity;
                            if (choice === "Against PO" && selectedPO?.po) {
                              const poItem = selectedPO.po.items.find(i => i.brandName === item.brandName && i.modelNo === item.modelNo);
                              if (poItem) {
                                alreadyReceived = poItem.receivedQuantity || 0;
                                remainingQty = poItem.quantity - alreadyReceived;
                              }
                            }

                            const currStock = item._currStockQty ?? 0;
                            const orderedQty = parseFloat(item.orderedQuantity) || 0;
                            const receivedQty = parseFloat(item.receivedQuantity) || 0;
                            const balanceQty = currStock + orderedQty - receivedQty;
                            const balanceColor = balanceQty > currStock ? "#15803d" : balanceQty === currStock ? "#6b7280" : "#1e40af";

                            return (
                              <tr key={index}>
                                {/* Brand */}
                                <td>
                                  {choice === "Against PO" ? (
                                    <input type="text" className="form-control form-control-sm rounded-0" value={item.brandName} readOnly />
                                  ) : (
                                    <Select
                                      value={brands.find(b => b.value === item.brandName) || null}
                                      onChange={sel => handleItemChange(index, "brandName", sel ? sel.value : "")}
                                      options={brands}
                                      placeholder="Brand..."
                                      isClearable
                                      menuPortalTarget={document.body}
                                      styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }) }}
                                    />
                                  )}
                                </td>

                                {/* Model */}
                                <td>
                                  {choice === "Against PO" ? (
                                    <input type="text" className="form-control form-control-sm rounded-0" value={item.modelNo} readOnly />
                                  ) : (
                                    <Select
                                      value={modelOptions.find(m => m.value === item.modelNo) || null}
                                      onChange={sel => handleItemChange(index, "modelNo", sel ? sel.value : "")}
                                      options={modelOptions}
                                      placeholder={item.brandName ? "Model..." : "Select brand first"}
                                      isClearable
                                      isDisabled={!item.brandName}
                                      menuPortalTarget={document.body}
                                      styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }) }}
                                    />
                                  )}
                                </td>

                                {/* Unit */}
                                <td>
                                  {choice === "Against PO" ? (
                                    <input type="text" className="form-control form-control-sm rounded-0" value={item.unit} readOnly />
                                  ) : (
                                    <input type="text" className="form-control form-control-sm rounded-0" value={item.unit} onChange={e => handleItemChange(index, "unit", e.target.value)} />
                                  )}
                                </td>

                                {/* Ordered Qty */}
                                <td>
                                  <input type="number" className="form-control form-control-sm rounded-0" value={item.orderedQuantity} onChange={e => handleItemChange(index, "orderedQuantity", Number(e.target.value))} min="0" disabled={choice === "Against PO"} />
                                </td>

                                {/* Already Received (PO only) */}
                                {choice === "Against PO" && (
                                  <td>
                                    <input type="number" className="form-control form-control-sm rounded-0" value={alreadyReceived} readOnly />
                                  </td>
                                )}

                                {/* Received Qty */}
                                <td>
                                  <input
                                    type="number"
                                    className="form-control form-control-sm rounded-0"
                                    value={item.receivedQuantity}
                                    onChange={e => handleItemChange(index, "receivedQuantity", Number(e.target.value))}
                                    min="0"
                                    max={choice === "Against PO" ? remainingQty : undefined}
                                    required
                                  />
                                  {choice === "Against PO" && <small className="text-muted">Max: {remainingQty}</small>}
                                </td>

                                {/* Curr. Stock Qty */}
                                <td className="text-center align-middle">
                                  <span style={{ fontWeight: 700, fontSize: "0.85rem", color: currStock > 0 ? "#1e40af" : "#6b7280" }}>
                                    {currStock}
                                    {item.unit && <small style={{ fontWeight: 400, fontSize: "0.7rem", marginLeft: 2 }}>{item.unit}</small>}
                                  </span>
                                </td>

                                {/* Balance Qty */}
                                <td className="text-center align-middle">
                                  <span style={{ fontWeight: 700, fontSize: "0.85rem", color: balanceColor }}>
                                    {balanceQty}
                                    {item.unit && <small style={{ fontWeight: 400, fontSize: "0.7rem", marginLeft: 2 }}>{item.unit}</small>}
                                  </span>
                                  {balanceQty < currStock && receivedQty > 0 && (
                                    <small className="d-block text-muted" style={{ fontSize: "0.65rem" }}>After receiving</small>
                                  )}
                                </td>

                                {/* Remark */}
                                <td>
                                  <textarea className="form-control form-control-sm rounded-0" value={item.description} onChange={e => handleItemChange(index, "description", e.target.value)} rows="1" disabled={choice === "Against PO"} />
                                </td>

                                {/* Delete (Direct Material only) */}
                                {choice === "Direct Material" && (
                                  <td className="text-center align-middle">
                                    <button type="button" className="btn btn-sm btn-danger" onClick={() => handleRemoveItem(index)} disabled={items.length === 1}>
                                      <i className="fa fa-trash"></i>
                                    </button>
                                  </td>
                                )}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* ── Remark ── */}
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