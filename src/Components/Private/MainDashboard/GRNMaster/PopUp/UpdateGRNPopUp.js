import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { RequiredStar } from "../../../RequiredStar/RequiredStar";
import { getVendors } from "../../../../../hooks/useVendor";
import { getProducts } from "../../../../../hooks/useProduct";
import { getPurchaseOrders } from "../../../../../hooks/usePurchaseOrder";
import { updateGRN } from "../../../../../hooks/useGRN";
import axios from "axios";
import Select from "react-select";

const UpdateGRNPopUp = ({ handleUpdate, selectedGRN, projects }) => {
  const grnDateTime = selectedGRN?.grnDate ? new Date(selectedGRN.grnDate) : new Date();
  const [grnDate, setGrnDate] = useState(grnDateTime.toISOString().split('T')[0]);
  const [grnNumber, setGrnNumber] = useState(selectedGRN?.grnNumber || "");
  const [choice, setChoice] = useState(selectedGRN?.choice || "");
  const [selectedPO, setSelectedPO] = useState(null);
  const [transactionType, setTransactionType] = useState(selectedGRN?.transactionType || "");
  const [purchaseType, setPurchaseType] = useState(selectedGRN?.purchaseType || "");
  const [selectedProject, setSelectedProject] = useState(null);
  const [warehouseLocation, setWarehouseLocation] = useState(selectedGRN?.warehouseLocation || "");
  const [remark, setRemark] = useState(selectedGRN?.remark || "");
  const [status, setStatus] = useState(selectedGRN?.status || "Pending");
  const [deliveryAddress, setDeliveryAddress] = useState(selectedGRN?.deliveryAddress || "");
  const [location, setLocation] = useState(selectedGRN?.location || "");
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
  const [productsMatched, setProductsMatched] = useState(false);
  
  const emptyItem = () => ({
    _selectedProductId: "", productName: "", brandName: "", modelNo: "",
    description: "", unit: "", baseUOM: "", orderedQuantity: 0,
    receivedQuantity: 0, price: 0, discountPercent: 0, taxPercent: 0,
    netValue: 0, _currStockQty: 0,
  });

  const [items, setItems] = useState(selectedGRN?.items?.map(item => ({
    ...item, productName: item.productName || "", _selectedProductId: "", _currStockQty: 0,
  })) || [emptyItem()]);

  const productOptions = products.map(p => ({
    value: p._id,
    label: `${p.productName || ""}${p.brandName ? " - " + p.brandName : ""}${p.model ? " - " + p.model : ""}`
  }));

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

  useEffect(() => {
    const loadVendors = async () => {
      const data = await getVendors(1, 100, vendorSearch);
      if (data?.success) {
        const vendorOptions = data.vendors.map(v => ({ value: v._id, label: `${v.vendorName} - ${v.email}` }));
        setVendors(vendorOptions);
        if (selectedGRN?.vendor?._id) { const v = vendorOptions.find(x => x.value === selectedGRN.vendor._id); if (v) setSelectedVendor(v); }
      }
    };
    loadVendors();
  }, [vendorSearch, selectedGRN]);

  // ── Load ALL products once ──
  useEffect(() => {
    const loadAll = async () => {
      if (productsLoaded) return;
      let all = [], page = 1, hasMore = true;
      while (hasMore) {
        const data = await getProducts(page, 200, "");
        if (data?.success && data.products?.length > 0) { all = [...all, ...data.products]; if (data.products.length < 200) hasMore = false; else page++; }
        else hasMore = false;
      }
      setProducts(all); setProductsLoaded(true);
    };
    if (choice === "Direct Material") loadAll();
  }, [choice, productsLoaded]);

  // ── Match existing items to products once ──
  useEffect(() => {
    if (products.length > 0 && !productsMatched && selectedGRN?.items) {
      setItems(prev => prev.map(item => {
        if (item._selectedProductId) return item;
        const match = products.find(p => p.brandName === item.brandName && p.model === item.modelNo);
        if (match) return { ...item, _selectedProductId: match._id, _currStockQty: match.currentStockQty ?? 0, productName: item.productName || match.productName || "" };
        return item;
      }));
      setProductsMatched(true);
    }
  }, [products, productsMatched, selectedGRN]);

  useEffect(() => {
    const load = async () => {
      const data = await getPurchaseOrders(1, 100, poSearch);
      if (data?.success) {
        const inc = [];
        for (const po of data.purchaseOrders) {
          let full = po.status === 'Received';
          if (!full) { let all = true; for (const i of po.items) { if ((i.receivedQuantity || 0) < i.quantity) { all = false; break; } } full = all; }
          if (!full) inc.push({ value: po._id, label: `${po.orderNumber} - ${po.vendor?.vendorName}`, po, vendorId: po.vendor?._id });
        }
        setPurchaseOrders(inc);
        if (selectedGRN?.purchaseOrder?._id) { const c = inc.find(p => p.value === selectedGRN.purchaseOrder._id); if (c) setSelectedPO(c); }
      }
    };
    if (choice === "Against PO") load();
  }, [poSearch, choice, selectedGRN]);

  useEffect(() => {
    if (selectedVendor) { setFilteredPOs(purchaseOrders.filter(po => po.vendorId === selectedVendor.value)); if (selectedPO && selectedPO.vendorId !== selectedVendor.value) setSelectedPO(null); }
    else setFilteredPOs([]);
  }, [selectedVendor, purchaseOrders]);

  useEffect(() => { if (selectedGRN?.project?._id && projects.length > 0) { const c = projects.find(p => p.value === selectedGRN.project._id); if (c) setSelectedProject(c); } }, [selectedGRN, projects]);

  const handleVendorChange = (s) => { setSelectedVendor(s); setSelectedPO(null); };

  const handlePOChange = (s) => {
    setSelectedPO(s);
    if (s?.po) {
      const po = s.po;
      setTransactionType(po.transactionType); setPurchaseType(po.purchaseType);
      setDeliveryAddress(po.deliveryAddress || ""); setLocation(po.location || ""); setWarehouseLocation(po.warehouseLocation || "");
      if (po.project) setSelectedProject(projects.find(p => p.value === po.project._id));
      setItems(po.items.map(item => {
        const ar = item.receivedQuantity || 0, rem = item.quantity - ar;
        return { ...emptyItem(), productName: item.productName || "", brandName: item.brandName, modelNo: item.modelNo, description: item.description || "", unit: item.unit || item.baseUOM, baseUOM: item.baseUOM || "", orderedQuantity: item.quantity, receivedQuantity: rem, price: item.price, discountPercent: item.discountPercent, taxPercent: item.taxPercent, netValue: calcNV({ receivedQuantity: rem, price: item.price, discountPercent: item.discountPercent, taxPercent: item.taxPercent }) };
      }));
    }
  };

  const calcNV = (item) => { const b = item.receivedQuantity * item.price; const d = b - b * (item.discountPercent / 100); return d + d * (item.taxPercent / 100); };

  const handleProductSelect = (index, id) => {
    const n = [...items];
    if (!id) { n[index]._selectedProductId = ""; n[index].netValue = calcNV(n[index]); setItems(n); return; }
    const p = products.find(x => x._id === id);
    if (p) { n[index] = { ...n[index], _selectedProductId: p._id, productName: p.productName || "", brandName: p.brandName || "", modelNo: p.model || "", description: p.description || "", unit: p.baseUOM || "", baseUOM: p.baseUOM || "", price: p.purchasePrice || p.salesPrice || 0, taxPercent: p.gstRate || 0, _currStockQty: p.currentStockQty ?? 0 }; n[index].netValue = calcNV(n[index]); }
    setItems(n);
  };

  const handleItemChange = (index, field, value) => {
    const n = [...items]; n[index][field] = value;
    if (field === "productName" || field === "brandName" || field === "modelNo") n[index]._selectedProductId = "";
    n[index].netValue = calcNV(n[index]); setItems(n);
  };

  const handleAddItem = () => setItems([...items, emptyItem()]);
  const handleRemoveItem = (i) => { if (items.length > 1) setItems(items.filter((_, idx) => idx !== i)); };

  const handleFileChange = (e) => { if (e.target.files?.[0]) { const f = e.target.files[0]; if (f.size > 5 * 1024 * 1024) { toast.error("File exceeds 5MB"); return; } setTermsDocument(f); } };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!choice) return toast.error("Please select choice");
    if (choice === "Against PO" && !selectedPO) return toast.error("Please select PO");
    if (!selectedVendor) return toast.error("Please select vendor");
    if (!transactionType || !purchaseType) return toast.error("Please fill required fields");
    if (purchaseType === "Stock" && !warehouseLocation) return toast.error("Please enter warehouse location");
    for (let i of items) { if (i.receivedQuantity < 0) return toast.error("Received quantity cannot be negative"); }

    const clean = items.map(({ _currStockQty, _selectedProductId, ...r }) => r);
    const grnData = { _id: selectedGRN._id, grnDate: new Date(grnDate), grnNumber, choice, purchaseOrder: choice === "Against PO" ? selectedPO.value : undefined, vendor: selectedVendor.value, transactionType, purchaseType, project: purchaseType === "Project Purchase" ? selectedProject?.value : undefined, warehouseLocation: purchaseType === "Stock" ? warehouseLocation : undefined, deliveryAddress, location, items: clean, remark, status };

    if (termsDocument) {
      const fd = new FormData(); fd.append('file', termsDocument); fd.append('grnData', JSON.stringify(grnData));
      setUploading(true); toast.loading("Updating GRN...");
      try {
        const r = await axios.put(`${process.env.REACT_APP_API_URL}/api/grn/with-document/${selectedGRN._id}`, fd, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
        toast.dismiss(); if (r.data.success) { toast.success(r.data.message); handleUpdate(); } else toast.error(r.data.error || "Failed");
      } catch (err) { toast.dismiss(); toast.error(err.response ? `Error: ${err.response.status}` : "Network error"); }
      finally { setUploading(false); }
    } else {
      toast.loading("Updating GRN...");
      const d = await updateGRN(grnData); toast.dismiss();
      if (d.success) { toast.success(d.message); handleUpdate(); } else toast.error(d.error || "Failed");
    }
  };

  const grandTotal = items.reduce((s, i) => s + (Number(i.netValue) || 0), 0);
  const selectStyles = { menuPortal: b => ({ ...b, zIndex: 9999 }), control: b => ({ ...b, fontSize: "0.78rem", minHeight: "28px" }), option: b => ({ ...b, fontSize: "0.76rem", padding: "2px 8px" }), input: b => ({ ...b, fontSize: "0.78rem" }) };

  return (
    <div className="modal fade show" style={{ display: "flex", alignItems: "center", backgroundColor: "#00000090" }}>
      <div className="modal-dialog modal-xl">
        <div className="modal-content p-3">
          <form onSubmit={handleSubmit}>
            <div className="modal-header pt-0">
              <h5 className="card-title fw-bold">Update GRN (Goods Receipt Note)</h5>
              <button onClick={handleUpdate} type="button" className="close px-3" style={{ marginLeft: "auto" }}><span aria-hidden="true">&times;</span></button>
            </div>
            <div className="modal-body">
              <div className="row modal_body_height">
                <div className="col-12 col-lg-6"><div className="mb-3"><label className="form-label label_text">GRN Number</label><input type="text" className="form-control rounded-0" value={grnNumber} readOnly /></div></div>
                <div className="col-12 col-lg-6"><div className="mb-3"><label className="form-label label_text">Choice</label><select className="form-select rounded-0" value={choice} disabled><option value="">Select</option><option value="Against PO">Against PO</option><option value="Direct Material">Direct Material</option></select></div></div>
                <div className="col-12 col-lg-6"><div className="mb-3"><label className="form-label label_text">GRN Date</label><input type="date" className="form-control rounded-0" value={grnDate} onChange={e => setGrnDate(e.target.value)} required /></div></div>

                {choice === "Against PO" && (<>
                  <div className="col-12 col-lg-6"><div className="mb-3"><label className="form-label label_text">Vendor Name</label><Select value={selectedVendor} onChange={handleVendorChange} onInputChange={setVendorSearch} options={vendors} placeholder="Select Vendor..." isClearable className="react-select-container" classNamePrefix="react-select" /></div></div>
                  <div className="col-12 col-lg-6"><div className="mb-3"><label className="form-label label_text">PO No.</label><Select value={selectedPO} onChange={handlePOChange} onInputChange={setPoSearch} options={filteredPOs} placeholder={selectedVendor ? "Select PO..." : "Select vendor first"} isClearable isDisabled={!selectedVendor} className="react-select-container" classNamePrefix="react-select" /></div></div>
                </>)}

                {choice === "Direct Material" && (
                  <div className="col-12 col-lg-6"><div className="mb-3"><label className="form-label label_text">Vendor Name</label><Select value={selectedVendor} onChange={setSelectedVendor} onInputChange={setVendorSearch} options={vendors} placeholder="Select Vendor..." isClearable className="react-select-container" classNamePrefix="react-select" /></div></div>
                )}

                <div className="col-12 col-lg-6"><div className="mb-3"><label className="form-label label_text">Transaction Type</label><select className="form-select rounded-0" value={transactionType} onChange={e => setTransactionType(e.target.value)} disabled={choice === "Against PO"} required><option value="">Select</option><option value="B2B">B2B</option><option value="SEZ">SEZ</option><option value="Import">Import</option><option value="Asset">Asset</option></select></div></div>
                <div className="col-12 col-lg-6"><div className="mb-3"><label className="form-label label_text">Purchase Type</label><select className="form-select rounded-0" value={purchaseType} onChange={e => setPurchaseType(e.target.value)} disabled={choice === "Against PO"} required><option value="">Select</option><option value="Project Purchase">Project Purchase</option><option value="Stock">Stock</option></select></div></div>
                <div className="col-12 col-lg-6"><div className="mb-3"><label className="form-label label_text">Status</label><select className="form-select rounded-0" value={status} onChange={e => setStatus(e.target.value)} required><option value="Pending">Pending</option><option value="Completed">Completed</option><option value="Cancelled">Cancelled</option></select></div></div>

                {purchaseType === "Project Purchase" && <div className="col-12 col-lg-6"><div className="mb-3"><label className="form-label label_text">Project Name</label><Select value={selectedProject} onChange={setSelectedProject} options={projects} placeholder="Select Project..." isClearable isDisabled={choice === "Against PO"} /></div></div>}
                {purchaseType === "Stock" && <div className="col-12 col-lg-6"><div className="mb-3"><label className="form-label label_text">Warehouse Location</label><input type="text" className="form-control rounded-0" value={warehouseLocation} onChange={e => setWarehouseLocation(e.target.value)} maxLength={200} disabled={choice === "Against PO"} required /></div></div>}

                <div className="col-12 col-lg-6"><div className="mb-3"><label className="form-label label_text">Delivery Address</label><textarea className="form-control rounded-0" rows="2" value={deliveryAddress} onChange={e => setDeliveryAddress(e.target.value)} maxLength={500} disabled={choice === "Against PO"} /></div></div>
                <div className="col-12 col-lg-6"><div className="mb-3"><label className="form-label label_text">Location</label><input type="text" className="form-control rounded-0" value={location} onChange={e => setLocation(e.target.value)} maxLength={200} disabled={choice === "Against PO"} /></div></div>
                <div className="col-12 col-lg-6"><div className="mb-3"><label className="form-label label_text">Document</label><input type="file" className="form-control rounded-0" onChange={handleFileChange} accept=".pdf,.doc,.docx" />{termsDocument && <small className="text-success d-block mt-1">Selected: {termsDocument.name}</small>}{selectedGRN?.attachments?.length > 0 && !termsDocument && <small className="text-muted d-block mt-1">Current: {selectedGRN.attachments[0].name}</small>}</div></div>

                <div className="col-12 mt-3">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <h6 className="fw-bold">Item Details</h6>
                    {choice === "Direct Material" && <button type="button" className="btn btn-sm btn-primary" onClick={handleAddItem}><i className="fa fa-plus"></i> Add Item</button>}
                  </div>

                  {choice === "Direct Material" && !productsLoaded && (
                    <div className="text-center py-3"><div className="spinner-border spinner-border-sm text-primary" role="status"></div><span className="ms-2">Loading products...</span></div>
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
                          {choice === "Direct Material" && <th style={{ minWidth: 42 }}>Del</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((item, index) => {
                          let ar = 0, rem = item.orderedQuantity;
                          if (choice === "Against PO" && selectedPO?.po) { const pi = selectedPO.po.items.find(i => i.brandName === item.brandName && i.modelNo === item.modelNo); if (pi) { ar = pi.receivedQuantity || 0; rem = pi.quantity - ar; } }
                          return (
                            <tr key={index}>
                              {choice === "Direct Material" && (
                                <td><Select value={productOptions.find(p => p.value === item._selectedProductId) || null} onChange={s => handleProductSelect(index, s ? s.value : "")} options={productOptions} placeholder="Type/paste to search..." isClearable filterOption={productFilterOption} menuPortalTarget={document.body} styles={selectStyles} /></td>
                              )}
                              <td><input type="text" className="form-control form-control-sm rounded-0" value={item.productName} onChange={e => handleItemChange(index, "productName", e.target.value)} placeholder="e.g. Transport, Service..." readOnly={choice === "Against PO"} style={{ minWidth: 120 }} /></td>
                              <td><input type="text" className="form-control form-control-sm rounded-0" value={item.brandName} onChange={e => handleItemChange(index, "brandName", e.target.value)} placeholder="Optional" readOnly={choice === "Against PO"} style={{ minWidth: 95 }} /></td>
                              <td><input type="text" className="form-control form-control-sm rounded-0" value={item.modelNo} onChange={e => handleItemChange(index, "modelNo", e.target.value)} placeholder="Optional" readOnly={choice === "Against PO"} style={{ minWidth: 95 }} /></td>
                              <td><input type="text" className="form-control form-control-sm rounded-0" value={item.unit} onChange={e => handleItemChange(index, "unit", e.target.value)} readOnly={choice === "Against PO"} /></td>
                              <td><input type="number" className="form-control form-control-sm rounded-0" value={item.orderedQuantity} onChange={e => handleItemChange(index, "orderedQuantity", Number(e.target.value))} min="0" disabled={choice === "Against PO"} /></td>
                              {choice === "Against PO" && <td><input type="number" className="form-control form-control-sm rounded-0" value={ar} readOnly /></td>}
                              <td><input type="number" className="form-control form-control-sm rounded-0" value={item.receivedQuantity} onChange={e => handleItemChange(index, "receivedQuantity", Number(e.target.value))} min="0" max={choice === "Against PO" ? rem : undefined} required />{choice === "Against PO" && <small className="text-muted d-block">Max: {rem}</small>}</td>
                              <td><input type="number" className="form-control form-control-sm rounded-0" value={item.price} onChange={e => handleItemChange(index, "price", Number(e.target.value))} min="0" step="0.01" disabled={choice === "Against PO"} /></td>
                              <td><input type="number" className="form-control form-control-sm rounded-0" value={item.discountPercent} onChange={e => { const v = e.target.value; if (v === '' || v === '.' || /^\d*\.?\d{0,2}$/.test(v)) handleItemChange(index, "discountPercent", v === '' ? 0 : Number(v)); }} min="0" max="100" step="0.01" disabled={choice === "Against PO"} /></td>
                              <td><input type="number" className="form-control form-control-sm rounded-0" value={item.taxPercent} onChange={e => { const v = e.target.value; if (v === '' || v === '.' || /^\d*\.?\d{0,2}$/.test(v)) handleItemChange(index, "taxPercent", v === '' ? 0 : Number(v)); }} min="0" max="100" step="0.01" disabled={choice === "Against PO"} /></td>
                              <td><input type="text" className="form-control form-control-sm rounded-0" value={item.netValue.toFixed(2)} readOnly /></td>
                              {choice === "Direct Material" && <td><button type="button" className="btn btn-sm btn-danger" onClick={() => handleRemoveItem(index)} disabled={items.length === 1}><i className="fa fa-trash"></i></button></td>}
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="fw-bold table-secondary">
                          <td colSpan={choice === "Direct Material" ? 10 : 9} className="text-end">Grand Total:</td>
                          <td className="text-end">{grandTotal.toFixed(2)}</td>
                          {choice === "Direct Material" && <td></td>}
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                <div className="col-12 mt-3"><div className="mb-3"><label className="form-label label_text">Remark</label><textarea className="form-control rounded-0" rows="3" value={remark} onChange={e => setRemark(e.target.value)} maxLength={1000} /></div></div>

                <div className="col-12 pt-3 mt-2">
                  <button type="submit" className="w-80 btn addbtn rounded-0 add_button m-2 px-4" disabled={uploading}>Update</button>
                  <button type="button" onClick={handleUpdate} className="w-80 btn addbtn rounded-0 Cancel_button m-2 px-4">Cancel</button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default UpdateGRNPopUp;