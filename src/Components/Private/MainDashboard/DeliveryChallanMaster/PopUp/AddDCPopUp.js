import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import { RequiredStar } from "../../../RequiredStar/RequiredStar";
import { getCustomers } from "../../../../../hooks/useCustomer";
import { getProducts } from "../../../../../hooks/useProduct";
import { getPurchaseOrders } from "../../../../../hooks/usePurchaseOrder";
import axios from "axios";
import Select from "react-select";

const PAGE_SIZE = 15;

const AddDCPopUp = ({ handleAdd, projects }) => {
  const [dcDate, setDcDate] = useState(new Date().toISOString().split('T')[0]);
  const [choice, setChoice] = useState("");
  const [poNumber, setPoNumber] = useState("");
  const [projectPurchaseOrderNumber, setProjectPurchaseOrderNumber] = useState("");
  const [selectedPO, setSelectedPO] = useState(null);
  const [transactionType, setTransactionType] = useState("");
  const [purchaseType, setPurchaseType] = useState("");
  const [selectedProject, setSelectedProject] = useState(null);
  const [warehouseLocation, setWarehouseLocation] = useState("");
  const [remark, setRemark] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [location, setLocation] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);

  const [custOptions, setCustOptions] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [custPage, setCustPage] = useState(1);
  const [custHasMore, setCustHasMore] = useState(true);
  const [custLoading, setCustLoading] = useState(false);
  const [custSearch, setCustSearch] = useState("");

  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [poSearch, setPoSearch] = useState("");

  const [products, setProducts] = useState([]);
  const [productSearch, setProductSearch] = useState("");
  const [brands, setBrands] = useState([]);

  const [items, setItems] = useState([{
    brandName: "",
    modelNo: "",
    quantity: 1,
    unit: "",
    baseUOM: "",
    currStockQty: null,   // ← new: for display only
    productId: null       // ← new: to track which product
  }]);

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

  // ── Load purchase orders ────────────────────────────────────────────────────
  useEffect(() => {
    const loadPurchaseOrders = async () => {
      const data = await getPurchaseOrders(1, 100, poSearch);
      if (data.success) {
        setPurchaseOrders(data.purchaseOrders.map(po => ({
          value: po._id,
          label: `${po.orderNumber}`,
          po
        })));
      }
    };
    loadPurchaseOrders();
  }, [poSearch]);

  // ── Load products ───────────────────────────────────────────────────────────
  useEffect(() => {
    const loadProducts = async () => {
      const data = await getProducts(1, 1000, productSearch);
      if (data.success) {
        setProducts(data.products);
        const uniqueBrands = [...new Set(data.products.map(p => p.brandName).filter(Boolean))];
        setBrands(uniqueBrands.map(brand => ({ value: brand, label: brand })));
      }
    };
    loadProducts();
  }, [productSearch]);

  // ── PO selection ────────────────────────────────────────────────────────────
  const handlePOChange = (selected) => {
    setSelectedPO(selected);
    if (selected?.po) {
      const po = selected.po;
      setPoNumber(po.orderNumber);
      setProjectPurchaseOrderNumber(po.projectPurchaseOrderNumber || "");
      setTransactionType(po.transactionType);
      setPurchaseType(po.purchaseType);
      setDeliveryAddress(po.deliveryAddress || "");
      setLocation(po.location || "");
      setWarehouseLocation(po.warehouseLocation || "");
      if (po.project) {
        setSelectedProject(projects.find(p => p.value === po.project._id));
      }
    } else {
      setPoNumber("");
      setProjectPurchaseOrderNumber("");
      setTransactionType("");
      setPurchaseType("");
      setDeliveryAddress("");
      setLocation("");
      setWarehouseLocation("");
      setSelectedProject(null);
    }
  };

  // ── Item helpers ────────────────────────────────────────────────────────────
  const handleAddItem = () => {
    setItems([...items, {
      brandName: "", modelNo: "", quantity: 1,
      unit: "", baseUOM: "", currStockQty: null, productId: null
    }]);
  };

  const handleRemoveItem = (index) => {
    if (items.length > 1) setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;

    if (field === 'brandName') {
      newItems[index].modelNo = "";
      newItems[index].baseUOM = "";
      newItems[index].currStockQty = null;
      newItems[index].productId = null;
    }

    if (field === 'modelNo' && value && newItems[index].brandName) {
      const product = products.find(
        p => p.brandName === newItems[index].brandName && p.model === value
      );
      if (product) {
        newItems[index].baseUOM = product.baseUOM;
        newItems[index].unit = product.baseUOM;
        // ← store current stock for display & validation
        newItems[index].currStockQty = product.currentStockQty ?? 0;
        newItems[index].productId = product._id;
      }
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

    for (let item of items) {
      if (!item.brandName || !item.modelNo || item.quantity < 1)
        return toast.error("Please fill all item details correctly");

      // ← validate against available stock
      if (item.currStockQty !== null && item.quantity > item.currStockQty) {
        return toast.error(
          `Quantity (${item.quantity}) for ${item.brandName} - ${item.modelNo} exceeds available stock (${item.currStockQty})`
        );
      }
    }

    const dcData = {
      dcDate: new Date(dcDate),
      choice,
      poNumber: poNumber || "",
      projectPurchaseOrderNumber: projectPurchaseOrderNumber || "",
      purchaseOrder: selectedPO?.value,
      customer: selectedCustomer.value,
      transactionType,
      purchaseType,
      project: purchaseType === "Project Purchase" ? selectedProject?.value : undefined,
      warehouseLocation: purchaseType === "Stock" ? warehouseLocation : undefined,
      deliveryAddress,
      location,
      // send productId alongside each item so backend can update stock
      items: items.map(({ currStockQty, ...rest }) => rest),
      remark,
      attachments: attachments.map(att => ({
        name: att.name, type: att.type, size: att.size, url: att.url
      }))
    };

    toast.loading("Creating Delivery Challan...");
    try {
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/api/dc`,
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
        handleAdd();
      } else {
        toast.error(response.data.error || "Failed to create delivery challan");
      }
    } catch (error) {
      toast.dismiss();
      toast.error("Failed to create delivery challan: " + (error.response?.data?.error || error.message));
    }
  };

  const today = new Date().toISOString().split('T')[0];

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="modal fade show" style={{ display: "flex", alignItems: "center", backgroundColor: "#00000090" }}>
      <div className="modal-dialog modal-xl">
        <div className="modal-content p-3">
          <form onSubmit={handleSubmit}>
            <div className="modal-header pt-0">
              <h5 className="card-title fw-bold">Create Delivery Challan</h5>
              <button onClick={handleAdd} type="button" className="close px-3" style={{ marginLeft: "auto" }}>
                <span aria-hidden="true">&times;</span>
              </button>
            </div>

            <div className="modal-body">
              <div className="row modal_body_height">

                {/* Choice */}
                <div className="col-12 col-lg-6">
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
                <div className="col-12 col-lg-6">
                  <div className="mb-3">
                    <label className="form-label label_text">PO No.</label>
                    <Select
                      value={selectedPO}
                      onChange={handlePOChange}
                      onInputChange={setPoSearch}
                      options={purchaseOrders}
                      placeholder="Select PO Number (Optional)..."
                      isClearable
                      className="react-select-container"
                      classNamePrefix="react-select"
                    />
                    {poNumber && <small className="text-success mt-1 d-block">Selected PO: {poNumber}</small>}
                  </div>
                </div>

                {/* Project PO Number */}
                <div className="col-12 col-lg-6">
                  <div className="mb-3">
                    <label className="form-label label_text">Project Purchase Order No.</label>
                    <input
                      type="text" className="form-control rounded-0"
                      value={projectPurchaseOrderNumber}
                      onChange={e => setProjectPurchaseOrderNumber(e.target.value)}
                      placeholder="Enter Project Purchase Order Number"
                    />
                  </div>
                </div>

                {/* Customer */}
                <div className="col-12 col-lg-6">
                  <div className="mb-3">
                    <label className="form-label label_text">Customer Name <RequiredStar /></label>
                    <Select
                      options={custOptions}
                      value={selectedCustomer}
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
                    <input
                      type="date" className="form-control rounded-0" value={dcDate} max={today} required
                      onChange={e => {
                        const sel = new Date(e.target.value);
                        const cur = new Date(); cur.setHours(0, 0, 0, 0);
                        if (sel <= cur) setDcDate(e.target.value);
                        else { setDcDate(today); toast.error("Future dates are not allowed"); }
                      }}
                    />
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

                {/* Conditional: Project */}
                {purchaseType === "Project Purchase" && (
                  <div className="col-12 col-lg-6">
                    <div className="mb-3">
                      <label className="form-label label_text">Project Name <RequiredStar /></label>
                      <Select value={selectedProject} onChange={setSelectedProject} options={projects} placeholder="Select Project..." isClearable required />
                    </div>
                  </div>
                )}

                {/* Conditional: Warehouse */}
                {purchaseType === "Stock" && (
                  <div className="col-12 col-lg-6">
                    <div className="mb-3">
                      <label className="form-label label_text">Warehouse Location <RequiredStar /></label>
                      <input
                        type="text" className="form-control rounded-0" value={warehouseLocation}
                        onChange={e => setWarehouseLocation(e.target.value)}
                        placeholder="Ex: Baner / Amazon / Mumbai / Bhosari" maxLength={200} required
                      />
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
                    <input
                      type="file" className="form-control rounded-0" multiple
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      onChange={handleFileChange} disabled={uploading}
                    />
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

                  <div className="table-responsive">
                    <table className="table table-bordered">
                      <thead>
                        <tr>
                          <th>Brand Name</th>
                          <th>Model No</th>
                          <th style={{ minWidth: "110px" }}>Curr. Stock Qty</th>
                          <th style={{ minWidth: "100px" }}>Quantity</th>
                          <th>Unit</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((item, index) => {
                          const brandProducts = products.filter(p => p.brandName === item.brandName);
                          const uniqueModels = [...new Set(brandProducts.map(p => p.model).filter(Boolean))];
                          const modelOptions = uniqueModels.map(model => ({ value: model, label: model }));

                          // colour coding for stock badge
                          const stockBadgeStyle = item.currStockQty === null
                            ? { background: "#e2e8f0", color: "#64748b" }
                            : item.currStockQty === 0
                              ? { background: "#fee2e2", color: "#dc2626" }
                              : item.currStockQty <= 10
                                ? { background: "#fef3c7", color: "#d97706" }
                                : { background: "#dcfce7", color: "#16a34a" };

                          return (
                            <tr key={index}>
                              {/* Brand */}
                              <td>
                                <Select
                                  value={brands.find(b => b.value === item.brandName) || null}
                                  onChange={selected => handleItemChange(index, 'brandName', selected ? selected.value : "")}
                                  options={brands}
                                  placeholder="Select Brand..."
                                  isClearable
                                />
                              </td>

                              {/* Model */}
                              <td>
                                <Select
                                  value={modelOptions.find(m => m.value === item.modelNo) || null}
                                  onChange={selected => handleItemChange(index, 'modelNo', selected ? selected.value : "")}
                                  options={modelOptions}
                                  placeholder="Select Model..."
                                  isClearable
                                  isDisabled={!item.brandName}
                                />
                              </td>

                              {/* ── Curr. Stock Qty (read-only display) ── */}
                              <td className="text-center align-middle">
                                {item.modelNo ? (
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
                                  <span style={{ color: "#cbd5e1", fontSize: "0.8rem" }}>—</span>
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
                                  onChange={e => handleItemChange(index, 'quantity', Number(e.target.value))}
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
                                  onChange={e => handleItemChange(index, 'unit', e.target.value)}
                                  required
                                />
                              </td>

                              {/* Action */}
                              <td>
                                <button
                                  type="button" className="btn btn-sm btn-danger"
                                  onClick={() => handleRemoveItem(index)}
                                  disabled={items.length === 1}
                                >
                                  <i className="fa fa-trash"></i>
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
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
                    Add
                  </button>
                  <button type="button" onClick={handleAdd} className="w-80 btn addbtn rounded-0 Cancel_button m-2 px-4">
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

export default AddDCPopUp;