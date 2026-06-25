import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import { RequiredStar } from "../../../RequiredStar/RequiredStar";
import { getCustomers } from "../../../../../hooks/useCustomer";
import { getProducts } from "../../../../../hooks/useProduct";
import axios from "axios";
import Select from "react-select";

const PAGE_SIZE = 15;

const UpdateDCPopUp = ({ handleUpdate, selectedDC, projects }) => {
  const dcDateTime = selectedDC?.dcDate ? new Date(selectedDC.dcDate) : new Date();
  const [dcDate, setDcDate] = useState(dcDateTime.toISOString().split('T')[0]);
  const [dcNumber, setDcNumber] = useState(selectedDC?.dcNumber || "");
  const [choice, setChoice] = useState(selectedDC?.choice || "");
  const [poNumber, setPoNumber] = useState(selectedDC?.poNumber || "");
  const [projectPurchaseOrderNumber, setProjectPurchaseOrderNumber] = useState(selectedDC?.projectPurchaseOrderNumber || "");
  const [transactionType, setTransactionType] = useState(selectedDC?.transactionType || "");
  const [purchaseType, setPurchaseType] = useState(selectedDC?.purchaseType || "");
  const [selectedProject, setSelectedProject] = useState(null);
  const [warehouseLocation, setWarehouseLocation] = useState(selectedDC?.warehouseLocation || "");
  const [remark, setRemark] = useState(selectedDC?.remark || "");
  const [status, setStatus] = useState(selectedDC?.status || "Pending");
  const [deliveryAddress, setDeliveryAddress] = useState(selectedDC?.deliveryAddress || "");
  const [location, setLocation] = useState(selectedDC?.location || "");
  const [attachments, setAttachments] = useState(selectedDC?.attachments || []);
  const [uploading, setUploading] = useState(false);

  const [custOptions, setCustOptions] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [custPage, setCustPage] = useState(1);
  const [custHasMore, setCustHasMore] = useState(true);
  const [custLoading, setCustLoading] = useState(false);
  const [custSearch, setCustSearch] = useState("");

  const [products, setProducts] = useState([]);
  const [productOptions, setProductOptions] = useState([]);

  // Initialise items from existing DC
  const [items, setItems] = useState(
    (selectedDC?.items || [{
      productName: "", brandName: "", modelNo: "", quantity: 1, unit: "", baseUOM: ""
    }]).map(item => ({
      ...item,
      currStockQty: null,
      productId: item.productId || null,
      productName: item.productName || "",
      isManual: !item.productId
    }))
  );

  // ── Load customers ──────────────────────────────────────────────────────────
  const loadCustomers = useCallback(async (page, search) => {
    if (custLoading || !custHasMore) return;
    setCustLoading(true);
    const data = await getCustomers(page, PAGE_SIZE, search);
    if (data.error) {
      toast.error(data.error || 'Failed to load customers');
      setCustLoading(false);
      return;
    }
    const newOpts = (data.customers || []).map(c => ({
      value: c._id,
      label: `${c.custName} - ${c.email || c.phoneNumber1}`
    }));
    setCustOptions(prev => page === 1 ? newOpts : [...prev, ...newOpts]);
    setCustHasMore(newOpts.length === PAGE_SIZE);
    setCustLoading(false);
    setCustPage(page + 1);
  }, [custLoading, custHasMore]);

  useEffect(() => {
    setCustPage(1);
    setCustHasMore(true);
    setCustOptions([]);
    loadCustomers(1, custSearch);
  }, [custSearch]);

  // Set initial customer once options are loaded
  useEffect(() => {
    if (selectedDC?.customer?._id && custOptions.length > 0) {
      const found = custOptions.find(c => c.value === selectedDC.customer._id);
      if (found) setSelectedCustomer(found);
    }
  }, [selectedDC, custOptions]);

  // ── Load products ───────────────────────────────────────────────────────────
  useEffect(() => {
    const loadProducts = async () => {
      const data = await getProducts(1, 1000, "");
      if (data.success) {
        setProducts(data.products);

        const opts = data.products.map(p => ({
          value: p._id,
          label: p.productName,
          product: p
        }));
        setProductOptions(opts);

        // Enrich existing items with live currStockQty + productId
        setItems(prev => prev.map(item => {
          let matched = null;
          if (item.productId) {
            matched = data.products.find(p => String(p._id) === String(item.productId));
          }
          if (!matched && item.brandName && item.modelNo) {
            matched = data.products.find(
              p => p.brandName === item.brandName && p.model === item.modelNo
            );
          }
          if (matched) {
            const originalItem = (selectedDC?.items || []).find(
              oi => String(oi.productId) === String(matched._id) ||
                    (oi.brandName === matched.brandName && oi.modelNo === matched.model)
            );
            const alreadyAllocated = originalItem ? (originalItem.quantity || 0) : 0;
            return {
              ...item,
              currStockQty: (matched.currentStockQty ?? 0) + alreadyAllocated,
              productId: matched._id,
              productName: item.productName || matched.productName || "",
              baseUOM: item.baseUOM || matched.baseUOM,
              unit: item.unit || matched.baseUOM,
              isManual: false
            };
          }
          return item;
        }));
      }
    };
    loadProducts();
  }, []);

  // Set selected project
  useEffect(() => {
    if (selectedDC?.project?._id && projects.length > 0) {
      const found = projects.find(p => p.value === selectedDC.project._id);
      if (found) setSelectedProject(found);
    }
  }, [selectedDC, projects]);

  // ── Item helpers ────────────────────────────────────────────────────────────
  const handleAddItem = () => {
    setItems([...items, {
      productName: "", brandName: "", modelNo: "", quantity: 1,
      unit: "", baseUOM: "", currStockQty: null, productId: null, isManual: false
    }]);
  };

  const handleRemoveItem = (index) => {
    if (items.length > 1) setItems(items.filter((_, i) => i !== index));
  };

  const handleProductSelect = (index, selected) => {
    const newItems = [...items];
    if (selected) {
      const p = selected.product;
      const originalItem = (selectedDC?.items || []).find(
        oi => String(oi.productId) === String(p._id) ||
              (oi.brandName === p.brandName && oi.modelNo === p.model)
      );
      const alreadyAllocated = originalItem ? (originalItem.quantity || 0) : 0;

      newItems[index] = {
        ...newItems[index],
        productName: p.productName || "",
        brandName: p.brandName || "",
        modelNo: p.model || "",
        baseUOM: p.baseUOM || "",
        unit: p.baseUOM || newItems[index].unit || "",
        currStockQty: (p.currentStockQty ?? 0) + alreadyAllocated,
        productId: p._id,
        isManual: false
      };
    } else {
      newItems[index] = {
        ...newItems[index],
        productName: "",
        brandName: "",
        modelNo: "",
        baseUOM: "",
        unit: "",
        currStockQty: null,
        productId: null,
        isManual: false
      };
    }
    setItems(newItems);
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    if (field === 'brandName' || field === 'modelNo' || field === 'productName') {
      newItems[index].isManual = true;
      newItems[index].productId = null;
      newItems[index].currStockQty = null;
    }
    setItems(newItems);
  };

  // ── File helpers ────────────────────────────────────────────────────────────
  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploading(true);
    try {
      const fileInfos = files.map(file => ({
        name: file.name, type: file.type, size: file.size,
        url: URL.createObjectURL(file), file
      }));
      setAttachments(prev => [...prev, ...fileInfos]);
      toast.success("Files attached successfully");
    } catch (error) {
      toast.error("Failed to attach files: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  const removeAttachment = (index) => setAttachments(prev => prev.filter((_, i) => i !== index));

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!choice)           return toast.error("Please select choice type");
    if (!selectedCustomer) return toast.error("Please select a customer");
    if (!transactionType)  return toast.error("Please select transaction type");
    if (!purchaseType)     return toast.error("Please select purchase type");
    if (!dcDate)           return toast.error("Please select DC date");

    if (purchaseType === "Project Purchase" && !selectedProject)
      return toast.error("Please select a project");
    if (purchaseType === "Stock" && !warehouseLocation)
      return toast.error("Please enter warehouse location");

    // ── FIX: Updated validation - productName OR brandName+modelNo required ──
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      
      if (!item.productName && !item.brandName && !item.modelNo) {
        return toast.error(`Row ${i + 1}: Please fill product name or brand/model`);
      }
      
      if (item.quantity < 1) {
        return toast.error(`Row ${i + 1}: Quantity must be at least 1`);
      }
      
      if (!item.unit || item.unit.trim() === "") {
        return toast.error(`Row ${i + 1}: Unit is required`);
      }
      
      if (item.currStockQty !== null && item.quantity > item.currStockQty) {
        return toast.error(
          `Row ${i + 1}: Quantity (${item.quantity}) for ${item.productName || item.brandName + ' - ' + item.modelNo} exceeds available stock (${item.currStockQty})`
        );
      }
    }

    const dcData = {
      _id: selectedDC._id,
      dcDate: new Date(dcDate),
      dcNumber,
      choice,
      poNumber,
      projectPurchaseOrderNumber,
      customer: selectedCustomer.value,
      transactionType,
      purchaseType,
      project: purchaseType === "Project Purchase" ? selectedProject?.value : undefined,
      warehouseLocation: purchaseType === "Stock" ? warehouseLocation : undefined,
      deliveryAddress,
      location,
      items: items.map(({ currStockQty, isManual, productId, baseUOM, ...rest }) => ({
        ...rest,
        // Only send brandName/modelNo if they have actual values
        brandName: rest.brandName?.trim() || undefined,
        modelNo: rest.modelNo?.trim() || undefined,
        productName: rest.productName?.trim() || undefined,
      })),
      remark,
      status,
      attachments: attachments.map(att => ({
        name: att.name, type: att.type, size: att.size, url: att.url
      }))
    };

    toast.loading("Updating Delivery Challan...");
    try {
      const response = await axios.put(
        `${process.env.REACT_APP_API_URL}/api/dc/${selectedDC._id}`,
        dcData,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      toast.dismiss();
      if (response.data.success) {
        toast.success(response.data.message);
        handleUpdate();
      } else {
        toast.error(response.data.error || "Failed to update delivery challan");
      }
    } catch (error) {
      toast.dismiss();
      toast.error("Failed to update delivery challan: " + (error.response?.data?.error || error.message));
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="modal fade show" style={{ display: "flex", alignItems: "center", backgroundColor: "#00000090" }}>
      <div className="modal-dialog modal-xl">
        <div className="modal-content p-3">
          <form onSubmit={handleSubmit}>
            <div className="modal-header pt-0">
              <h5 className="card-title fw-bold">Update Delivery Challan</h5>
              <button onClick={handleUpdate} type="button" className="close px-3" style={{ marginLeft: "auto" }}>
                <span aria-hidden="true">&times;</span>
              </button>
            </div>

            <div className="modal-body">
              <div className="row modal_body_height">

                {/* DC Number */}
                <div className="col-12 col-lg-4">
                  <div className="mb-3">
                    <label className="form-label label_text">DC Number <RequiredStar /></label>
                    <input type="text" className="form-control rounded-0" value={dcNumber} readOnly />
                  </div>
                </div>

                {/* Choice */}
                <div className="col-12 col-lg-4">
                  <div className="mb-3">
                    <label className="form-label label_text">Choice <RequiredStar /></label>
                    <select className="form-select rounded-0" value={choice} onChange={e => setChoice(e.target.value)} required>
                      <option value="">Select Choice</option>
                      <option value="DC Delivery chalan">DC Delivery chalan</option>
                      <option value="returnable chalan">returnable chalan</option>
                      <option value="Rejected returnable chalan">Rejected returnable chalan</option>
                      <option value="scrap chalan">scrap chalan</option>
                    </select>
                  </div>
                </div>

                {/* PO Number */}
                <div className="col-12 col-lg-4">
                  <div className="mb-3">
                    <label className="form-label label_text">PO No.</label>
                    <input type="text" className="form-control rounded-0" value={poNumber}
                      onChange={e => setPoNumber(e.target.value)} placeholder="PO Number (Optional)" />
                  </div>
                </div>

                {/* Project PO Number */}
                <div className="col-12 col-lg-6">
                  <div className="mb-3">
                    <label className="form-label label_text">Project Purchase Order No.</label>
                    <input type="text" className="form-control rounded-0" value={projectPurchaseOrderNumber}
                      onChange={e => setProjectPurchaseOrderNumber(e.target.value)}
                      placeholder="Enter Project Purchase Order Number" />
                  </div>
                </div>

                {/* Customer */}
                <div className="col-12 col-lg-6">
                  <div className="mb-3">
                    <label className="form-label label_text">Customer Name <RequiredStar /></label>
                    <Select
                      options={custOptions} value={selectedCustomer}
                      onChange={setSelectedCustomer}
                      onInputChange={val => setCustSearch(val)}
                      onMenuScrollToBottom={() => loadCustomers(custPage, custSearch)}
                      isLoading={custLoading}
                      placeholder="Search and select customer..."
                      noOptionsMessage={() => custLoading ? 'Loading...' : 'No customers found'}
                      closeMenuOnSelect isClearable
                      styles={{
                        control: provided => ({ ...provided, borderRadius: 0, borderColor: '#ced4da', fontSize: '16px' }),
                        option: (provided, state) => ({
                          ...provided,
                          backgroundColor: state.isSelected ? '#007bff' : state.isFocused ? '#f8f9fa' : 'white',
                          color: state.isSelected ? 'white' : '#212529',
                        }),
                      }}
                      required
                    />
                    {selectedCustomer && <small className="text-success">Customer selected: {selectedCustomer.label}</small>}
                  </div>
                </div>

                {/* DC Date */}
                <div className="col-12 col-lg-6">
                  <div className="mb-3">
                    <label className="form-label label_text">DC Date <RequiredStar /></label>
                    <input type="date" className="form-control rounded-0" value={dcDate}
                      onChange={e => setDcDate(e.target.value)} required />
                  </div>
                </div>

                {/* Transaction Type */}
                <div className="col-12 col-lg-6">
                  <div className="mb-3">
                    <label className="form-label label_text">Transaction Type <RequiredStar /></label>
                    <select className="form-select rounded-0" value={transactionType} onChange={e => setTransactionType(e.target.value)} required>
                      <option value="">Select Transaction Type</option>
                      <option value="B2B">B2B</option>
                      <option value="SEZ">SEZ</option>
                      <option value="Import">Import</option>
                      <option value="Asset">Asset</option>
                    </select>
                  </div>
                </div>

                {/* Purchase Type */}
                <div className="col-12 col-lg-6">
                  <div className="mb-3">
                    <label className="form-label label_text">Project Purchase / Stock <RequiredStar /></label>
                    <select className="form-select rounded-0" value={purchaseType} onChange={e => setPurchaseType(e.target.value)} required>
                      <option value="">Select Type</option>
                      <option value="Project Purchase">Project Purchase</option>
                      <option value="Stock">Stock</option>
                    </select>
                  </div>
                </div>

                {/* Status */}
                <div className="col-12 col-lg-6">
                  <div className="mb-3">
                    <label className="form-label label_text">Status <RequiredStar /></label>
                    <select className="form-select rounded-0" value={status} onChange={e => setStatus(e.target.value)} required>
                      <option value="Pending">Pending</option>
                      <option value="Delivered">Delivered</option>
                      <option value="Returned">Returned</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>

                {/* Conditional: Project */}
                {purchaseType === "Project Purchase" && (
                  <div className="col-12 col-lg-6">
                    <div className="mb-3">
                      <label className="form-label label_text">Project Name <RequiredStar /></label>
                      <Select value={selectedProject} onChange={setSelectedProject} options={projects}
                        placeholder="Select Project..." isClearable required />
                    </div>
                  </div>
                )}

                {/* Conditional: Warehouse */}
                {purchaseType === "Stock" && (
                  <div className="col-12 col-lg-6">
                    <div className="mb-3">
                      <label className="form-label label_text">Warehouse Location <RequiredStar /></label>
                      <input type="text" className="form-control rounded-0" value={warehouseLocation}
                        onChange={e => setWarehouseLocation(e.target.value)}
                        placeholder="Ex: Baner / Amazon / Mumbai / Bhosari" maxLength={200} required />
                    </div>
                  </div>
                )}

                {/* Delivery Address */}
                <div className="col-12 col-lg-6">
                  <div className="mb-3">
                    <label className="form-label label_text">Delivery Address</label>
                    <textarea className="form-control rounded-0" rows="2" value={deliveryAddress}
                      onChange={e => setDeliveryAddress(e.target.value)} placeholder="Enter delivery address" maxLength={500} />
                  </div>
                </div>

                {/* Location */}
                <div className="col-12 col-lg-6">
                  <div className="mb-3">
                    <label className="form-label label_text">Location</label>
                    <input type="text" className="form-control rounded-0" value={location}
                      onChange={e => setLocation(e.target.value)} placeholder="Enter location" maxLength={200} />
                  </div>
                </div>

                {/* Attachments */}
                <div className="col-12 mt-3">
                  <div className="mb-3">
                    <label className="form-label label_text">Attachments</label>
                    <input type="file" className="form-control rounded-0" multiple
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" onChange={handleFileChange} disabled={uploading} />
                    {uploading && <div className="mt-2">Uploading files...</div>}
                    {attachments.length > 0 && (
                      <div className="mt-2">
                        <h6>Attached Files:</h6>
                        <div className="d-flex flex-wrap">
                          {attachments.map((file, index) => (
                            <div key={index} className="mb-2 me-2 d-flex align-items-center">
                              <span className="me-2">{file.name}</span>
                              <button type="button" className="btn btn-sm btn-danger" onClick={() => removeAttachment(index)}>
                                <i className="fa fa-times"></i>
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* ── Item Details Table ── */}
                <div className="col-12 mt-3">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <h6 className="fw-bold">Item Details</h6>
                    <button type="button" className="btn btn-sm btn-primary" onClick={handleAddItem}>
                      <i className="fa fa-plus"></i> Add Item
                    </button>
                  </div>

                  {/* ── INFO: Explain the two modes ── */}
                  <div className="alert alert-info py-2 px-3 mb-2" style={{ fontSize: "0.8rem" }}>
                    <i className="fa-solid fa-info-circle me-2"></i>
                    <strong>Two ways to add items:</strong><br />
                    1. <strong>Select from dropdown</strong> → Brand & Model auto-fill (stock tracked)<br />
                    2. <strong>Type product name manually</strong> → Brand & Model are optional (no stock tracking)
                  </div>

                  <div className="table-responsive">
                    <table className="table table-bordered">
                      <thead>
                        <tr>
                          <th style={{ minWidth: "200px" }}>
                            Product Name <RequiredStar />
                            <small className="d-block text-muted fw-normal" style={{ fontSize: "0.7rem" }}>
                              Select OR type manually
                            </small>
                          </th>
                          <th style={{ minWidth: "140px" }}>
                            Brand Name
                            <small className="d-block text-muted fw-normal" style={{ fontSize: "0.65rem" }}>
                              Optional if manual
                            </small>
                          </th>
                          <th style={{ minWidth: "140px" }}>
                            Model No
                            <small className="d-block text-muted fw-normal" style={{ fontSize: "0.65rem" }}>
                              Optional if manual
                            </small>
                          </th>
                          <th style={{ minWidth: "100px" }}>Stock</th>
                          <th style={{ minWidth: "90px" }}>Qty <RequiredStar /></th>
                          <th style={{ minWidth: "80px" }}>Unit <RequiredStar /></th>
                          <th style={{ width: "60px" }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((item, index) => {
                          const stockBadgeStyle = item.currStockQty === null
                            ? { background: "#e2e8f0", color: "#64748b" }
                            : item.currStockQty === 0
                              ? { background: "#fee2e2", color: "#dc2626" }
                              : item.currStockQty <= 10
                                ? { background: "#fef3c7", color: "#d97706" }
                                : { background: "#dcfce7", color: "#16a34a" };

                          const selectedProductOption = item.productId
                            ? productOptions.find(o => String(o.value) === String(item.productId)) || null
                            : null;

                          return (
                            <tr key={index}>
                              {/* Product Name */}
                              <td>
                                <Select
                                  value={selectedProductOption}
                                  onChange={selected => handleProductSelect(index, selected)}
                                  options={productOptions}
                                  placeholder="Search product..."
                                  isClearable
                                  isSearchable
                                  noOptionsMessage={() => "No products found"}
                                  styles={{
                                    control: (base) => ({ ...base, minWidth: 180 }),
                                  }}
                                />
                                {!item.productId && (
                                  <input
                                    type="text"
                                    className="form-control form-control-sm mt-1"
                                    value={item.productName}
                                    onChange={e => handleItemChange(index, 'productName', e.target.value)}
                                    placeholder="Or type product name manually"
                                  />
                                )}
                              </td>

                              {/* Brand Name */}
                              <td>
                                <input
                                  type="text"
                                  className="form-control form-control-sm"
                                  value={item.brandName}
                                  onChange={e => handleItemChange(index, 'brandName', e.target.value)}
                                  placeholder={item.productId ? "Auto-filled" : "Optional"}
                                  readOnly={!!item.productId}
                                  style={item.productId ? { background: "#f8f9fa", cursor: "not-allowed" } : {}}
                                />
                                {item.productId && (
                                  <small className="text-muted" style={{ fontSize: "0.7rem" }}>Auto-filled</small>
                                )}
                              </td>

                              {/* Model No */}
                              <td>
                                <input
                                  type="text"
                                  className="form-control form-control-sm"
                                  value={item.modelNo}
                                  onChange={e => handleItemChange(index, 'modelNo', e.target.value)}
                                  placeholder={item.productId ? "Auto-filled" : "Optional"}
                                  readOnly={!!item.productId}
                                  style={item.productId ? { background: "#f8f9fa", cursor: "not-allowed" } : {}}
                                />
                                {item.productId && (
                                  <small className="text-muted" style={{ fontSize: "0.7rem" }}>Auto-filled</small>
                                )}
                              </td>

                              {/* Curr. Stock */}
                              <td className="text-center align-middle">
                                {item.productId ? (
                                  <span
                                    style={{
                                      display: "inline-block",
                                      padding: "3px 10px",
                                      borderRadius: "12px",
                                      fontWeight: 700,
                                      fontSize: "0.85rem",
                                      ...stockBadgeStyle
                                    }}
                                  >
                                    {item.currStockQty ?? 0}
                                    {item.unit && (
                                      <small style={{ fontWeight: 400, marginLeft: 4, fontSize: "0.72rem" }}>
                                        {item.unit}
                                      </small>
                                    )}
                                  </span>
                                ) : (
                                  <span style={{ color: "#94a3b8", fontSize: "0.75rem" }}>N/A</span>
                                )}
                              </td>

                              {/* Quantity */}
                              <td>
                                <input
                                  type="number"
                                  className={`form-control form-control-sm ${
                                    item.currStockQty !== null && item.quantity > item.currStockQty
                                      ? "border-danger"
                                      : ""
                                  }`}
                                  value={item.quantity}
                                  onChange={e => {
                                    const newItems = [...items];
                                    newItems[index].quantity = Number(e.target.value);
                                    setItems(newItems);
                                  }}
                                  min="1"
                                  max={item.currStockQty !== null ? item.currStockQty : undefined}
                                  required
                                />
                                {item.currStockQty !== null && item.quantity > item.currStockQty && (
                                  <small className="text-danger d-block mt-1">
                                    Exceeds stock ({item.currStockQty})
                                  </small>
                                )}
                              </td>

                              {/* Unit */}
                              <td>
                                <input
                                  type="text"
                                  className="form-control form-control-sm"
                                  value={item.unit}
                                  onChange={e => {
                                    const newItems = [...items];
                                    newItems[index].unit = e.target.value;
                                    setItems(newItems);
                                  }}
                                  placeholder="Unit"
                                  required
                                />
                              </td>

                              {/* Action */}
                              <td>
                                <button type="button" className="btn btn-sm btn-danger"
                                  onClick={() => handleRemoveItem(index)} disabled={items.length === 1}>
                                  <i className="fa fa-trash"></i>
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <small className="text-muted">
                    <i className="fa fa-info-circle me-1"></i>
                    Select a product from dropdown for auto-fill + stock tracking, OR type product name manually (Brand/Model optional).
                  </small>
                </div>

                {/* Remark */}
                <div className="col-12 mt-3">
                  <div className="mb-3">
                    <label className="form-label label_text">Remark</label>
                    <textarea className="form-control rounded-0" rows="3" value={remark}
                      onChange={e => setRemark(e.target.value)} maxLength={1000} />
                  </div>
                </div>

                {/* Buttons */}
                <div className="col-12 pt-3 mt-2">
                  <button type="submit" className="w-80 btn addbtn rounded-0 add_button m-2 px-4" disabled={uploading}>
                    Update
                  </button>
                  <button type="button" onClick={handleUpdate} className="w-80 btn addbtn rounded-0 Cancel_button m-2 px-4">
                    Cancel
                  </button>
                </div>

              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default UpdateDCPopUp;