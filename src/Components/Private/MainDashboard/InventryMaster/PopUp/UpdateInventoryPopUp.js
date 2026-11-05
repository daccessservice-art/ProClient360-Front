import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { RequiredStar } from "../../../RequiredStar/RequiredStar";
import { getProductBrands, getProductCategories, getProductUOMs } from "../../../../../hooks/useProduct";
import { getInventoryById } from "../../../../../hooks/useInventory";

const DEFAULT_BRANDS = ["Apple", "Samsung", "Sony", "LG", "Microsoft", "Dell"];
const DEFAULT_CATEGORIES = ["Electronics", "Clothing", "Food", "Furniture", "Stationery", "Tools"];
const DEFAULT_UOMS = ["bags", "litre", "brass", "kilogram", "gram", "meter", "piece", "box", "carton", "nos"];
const CATEGORIES = ['Raw Material', 'Finished Goods', 'Repairing Material', 'Scrap', 'Asset'];

const decimal = (digits) => new RegExp(`^\\d*\\.?\\d{0,${digits}}$`);
const toStr = (v) => (v === undefined || v === null ? '' : String(v));
const toDateInput = (v) => {
  if (!v) return '';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().split('T')[0];
};
const fmtQty = (n) => (Number(n) || 0).toLocaleString('en-IN', { maximumFractionDigits: 3 });
const formatDateTime = (v) =>
  v ? new Date(v).toLocaleString('en-IN', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A';

const buildForm = (inv) => ({
  materialCode: toStr(inv.materialCode),
  materialName: toStr(inv.materialName),
  productName: toStr(inv.productName),
  brandName: toStr(inv.brandName),
  model: toStr(inv.model),
  hsnCode: toStr(inv.hsnCode || inv.hsmCode),
  productCategory: toStr(inv.productCategory),
  category: CATEGORIES.includes(inv.category) ? inv.category : 'Raw Material',
  baseUOM: toStr(inv.baseUOM || inv.unit),
  uomConversion: toStr(inv.uomConversion ?? 1),
  unitPrice: toStr(inv.unitPrice || inv.purchasePrice || ''),
  mrp: toStr(inv.mrp || ''),
  salesPrice: toStr(inv.salesPrice || ''),
  openingStock: toStr(inv.openingStock ?? inv.currentStock ?? 0),
  minStockLevel: toStr(inv.minStockLevel ?? ''),
  warehouseLocation: toStr(inv.warehouseLocation),
  stockLocation: toStr(inv.stockLocation),
  openingDate: toDateInput(inv.openingDate || inv.createdAt) || new Date().toISOString().split('T')[0],
  discountType: inv.discountType || 'Zero Discount',
  discountValue: toStr(inv.discountValue || ''),
  taxType: inv.taxType === 'gst' ? 'gst' : 'none',
  gstRate: toStr(inv.gstRate || ''),
  gstEffectiveDate: toDateInput(inv.gstEffectiveDate),
  description: toStr(inv.description),
});

const UpdateInventoryPopup = ({ selectedInventory, onUpdateInventory, onClose, saving = false }) => {
  const [item, setItem] = useState(selectedInventory);
  const [form, setForm] = useState(() => buildForm(selectedInventory || {}));
  const set = (name, value) => setForm((prev) => ({ ...prev, [name]: value }));

  // stock transaction
  const [showTransaction, setShowTransaction] = useState(false);
  const [txn, setTxn] = useState({ type: 'incoming', quantity: '', reason: '' });

  // dropdowns
  const [allBrands, setAllBrands] = useState([]);
  const [allCategories, setAllCategories] = useState([]);
  const [uomOptions, setUomOptions] = useState([]);
  const [listsLoading, setListsLoading] = useState(true);
  const [addModal, setAddModal] = useState(null);
  const [addValue, setAddValue] = useState("");

  // fresh copy (live stock + populated transaction history)
  useEffect(() => {
    let alive = true;
    if (!selectedInventory?._id) return undefined;
    (async () => {
      const data = await getInventoryById(selectedInventory._id);
      if (alive && data?.success && data.data) setItem(data.data);
    })();
    return () => { alive = false; };
  }, [selectedInventory]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [b, c, u] = await Promise.all([getProductBrands(), getProductCategories(), getProductUOMs()]);
      if (!alive) return;
      const withSaved = (list, saved) => (saved && !list.includes(saved) ? [...list, saved] : list);
      setAllBrands(withSaved(b?.success && b.brands?.length ? b.brands : DEFAULT_BRANDS, selectedInventory?.brandName));
      setAllCategories(withSaved(c?.success && c.categories?.length ? c.categories : DEFAULT_CATEGORIES, selectedInventory?.productCategory));
      setUomOptions(withSaved(u?.success && u.uoms?.length ? u.uoms : DEFAULT_UOMS, selectedInventory?.baseUOM || selectedInventory?.unit));
      setListsLoading(false);
    })();
    return () => { alive = false; };
  }, [selectedInventory]);

  const handleText = (e) => set(e.target.name, e.target.value);
  const handleDecimal = (digits) => (e) => { if (decimal(digits).test(e.target.value)) set(e.target.name, e.target.value); };
  const handleHsn = (e) => { if (/^\d{0,8}$/.test(e.target.value)) set('hsnCode', e.target.value); };

  const handleAddNewOption = () => {
    const v = addValue.trim();
    if (!v) return toast.error("Please enter a value");
    const [list, setter, field, label] = {
      brand: [allBrands, setAllBrands, 'brandName', 'Brand'],
      category: [allCategories, setAllCategories, 'productCategory', 'Category'],
      uom: [uomOptions, setUomOptions, 'baseUOM', 'UOM'],
    }[addModal];
    if (list.some((x) => x.toLowerCase() === v.toLowerCase())) return toast.error(`${label} already exists`);
    setter([...list, v]);
    set(field, v);
    setAddValue("");
    setAddModal(null);
  };

  const currentStock = Number(item?.currentStock) || 0;
  const openingDelta = (parseFloat(form.openingStock) || 0) - (Number(item?.openingStock) || 0);
  const txnQty = parseFloat(txn.quantity) || 0;
  const stockAfterTxn = txn.type === 'incoming' ? currentStock + txnQty : currentStock - txnQty;
  const uom = form.baseUOM || '';

  const handleSubmit = (e) => {
    e.preventDefault();
    if (saving) return;
    if (!form.materialCode.trim()) return toast.error("Material Code is required");
    if (form.taxType === 'gst' && !form.gstRate) return toast.error("Please enter GST Rate");

    const payload = {
      materialCode: form.materialCode.trim(),
      materialName: form.materialName.trim(),
      productName: form.productName.trim(),
      brandName: form.brandName,
      model: form.model.trim(),
      hsnCode: form.hsnCode,
      productCategory: form.productCategory,
      category: form.category,
      baseUOM: form.baseUOM,
      uomConversion: parseFloat(form.uomConversion) || 1,
      unitPrice: parseFloat(form.unitPrice) || 0,
      purchasePrice: parseFloat(form.unitPrice) || 0,
      mrp: parseFloat(form.mrp) || 0,
      salesPrice: parseFloat(form.salesPrice) || 0,
      openingStock: parseFloat(form.openingStock) || 0,
      minStockLevel: parseFloat(form.minStockLevel) || 0,
      warehouseLocation: form.warehouseLocation.trim(),
      stockLocation: form.stockLocation.trim(),
      openingDate: form.openingDate,
      discountType: form.discountType,
      discountValue: form.discountType === 'Zero Discount' ? 0 : parseFloat(form.discountValue) || 0,
      taxType: form.taxType,
      gstRate: form.taxType === 'gst' ? parseFloat(form.gstRate) || 0 : 0,
      gstEffectiveDate: form.taxType === 'gst' ? form.gstEffectiveDate : '',
      description: form.description.trim(),
    };

    if (showTransaction && txn.quantity !== '') {
      if (txnQty <= 0) return toast.error('Transaction quantity must be greater than 0');
      if (!txn.reason.trim()) return toast.error('Please provide a reason for the transaction');
      if (txn.type === 'outgoing' && txnQty > currentStock) {
        return toast.error(`Outgoing quantity cannot exceed current stock (${fmtQty(currentStock)})`);
      }
      payload.transaction = {
        type: txn.type,
        quantity: txnQty,
        reason: txn.reason.trim(),
        date: new Date().toISOString(),
      };
    }

    onUpdateInventory(payload);
  };

  const selectWithAdd = (id, label, value, options, field, modalKey) => (
    <div className="col-md-6">
      <label htmlFor={id} className="form-label">{label}</label>
      <div className="input-group">
        <select className="form-select rounded-0" id={id} value={value} onChange={(e) => set(field, e.target.value)} disabled={listsLoading}>
          <option value="">{listsLoading ? "Loading..." : `Select ${label}`}</option>
          {options.map((o, i) => <option key={`${o}-${i}`} value={o}>{o}</option>)}
        </select>
        <button type="button" className="btn btn-outline-secondary" onClick={() => { setAddValue(""); setAddModal(modalKey); }}>
          <i className="fa-solid fa-plus"></i>
        </button>
      </div>
    </div>
  );

  const history = [...(item?.transactions || [])].sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <>
      <div className="modal fade show" style={{ display: "flex", alignItems: "center", backgroundColor: "#00000090" }}>
        <div className="modal-dialog modal-xl">
          <div className="modal-content p-3">
            <form onSubmit={handleSubmit}>
              <div className="modal-header pt-0">
                <h5 className="card-title fw-bold">Update Inventory Material — {item?.materialCode}</h5>
                <button onClick={onClose} type="button" className="btn-close" aria-label="Close" style={{ backgroundColor: 'red' }}></button>
              </div>

              <div className="modal-body" style={{ maxHeight: 'calc(85vh - 160px)', overflowY: 'auto' }}>
                {/* ── Live stock strip ── */}
                <div className="row g-2 mb-3">
                  {[
                    { label: 'Opening', value: fmtQty(item?.openingStock), color: '#334155' },
                    { label: 'IN (+)', value: `+${fmtQty(item?.totalIn)}`, color: '#15803d', sub: `GRN ${fmtQty(item?.grnIn)} • Manual ${fmtQty(item?.manualIn)}` },
                    { label: 'OUT (−)', value: `−${fmtQty(item?.totalOut)}`, color: '#b91c1c', sub: `DC ${fmtQty(item?.dcOut)} • Manual ${fmtQty(item?.manualOut)}` },
                    { label: 'Current Stock', value: `${fmtQty(currentStock)} ${uom}`, color: '#1e40af', sub: item?.stockStatus },
                  ].map((c) => (
                    <div className="col-6 col-md-3" key={c.label}>
                      <div className="border rounded p-2 h-100" style={{ background: '#f8fafc' }}>
                        <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{c.label}</div>
                        <div className="fw-bold" style={{ color: c.color }}>{c.value}</div>
                        {c.sub && <div style={{ fontSize: '0.68rem', color: '#64748b' }}>{c.sub}</div>}
                      </div>
                    </div>
                  ))}
                  <div className="col-12">
                    <small className="text-muted">
                      <i className="fa-solid fa-circle-info me-1"></i>
                      {item?.stockSource === 'product'
                        ? <>Linked to Product Master <strong>{item?.linkedProductName}</strong> — current stock is live (GRN adds, DC deducts).</>
                        : <>Not in Product Master — current stock = Opening + IN − OUT.</>}
                    </small>
                  </div>
                </div>

                <div className="mb-3">
                  <button type="button" className={`btn btn-sm ${showTransaction ? 'btn-primary' : 'btn-outline-primary'}`}
                    onClick={() => setShowTransaction(!showTransaction)}>
                    <i className="fa-solid fa-right-left me-1"></i>
                    {showTransaction ? 'Hide Stock Transaction' : 'Add Stock Transaction (Manual In / Out)'}
                  </button>
                </div>

                {showTransaction && (
                  <div className="card mb-3">
                    <div className="card-body">
                      <div className="row g-3">
                        <div className="col-md-3">
                          <label className="form-label fw-bold">Type <RequiredStar /></label>
                          <select className="form-select" value={txn.type} onChange={(e) => setTxn({ ...txn, type: e.target.value })}>
                            <option value="incoming">Incoming (+)</option>
                            <option value="outgoing">Outgoing (−)</option>
                          </select>
                        </div>
                        <div className="col-md-3">
                          <label className="form-label fw-bold">Quantity <RequiredStar /></label>
                          <input type="text" inputMode="decimal" className="form-control" placeholder="0"
                            value={txn.quantity}
                            onChange={(e) => { if (decimal(3).test(e.target.value)) setTxn({ ...txn, quantity: e.target.value }); }} />
                        </div>
                        <div className="col-md-3">
                          <label className="form-label fw-bold">Current Stock</label>
                          <input type="text" className="form-control" value={`${fmtQty(currentStock)} ${uom}`} disabled />
                        </div>
                        <div className="col-md-3">
                          <label className="form-label fw-bold">After Transaction</label>
                          <input type="text" className={`form-control ${stockAfterTxn < 0 ? 'is-invalid' : ''}`}
                            value={txn.quantity ? `${fmtQty(stockAfterTxn)} ${uom}` : '-'} disabled />
                        </div>
                        <div className="col-12">
                          <label className="form-label fw-bold">Reason / Remarks <RequiredStar /></label>
                          <textarea className="form-control" rows="2" maxLength={200}
                            placeholder="e.g., Physical count adjustment, Damaged, Used in production..."
                            value={txn.reason} onChange={(e) => setTxn({ ...txn, reason: e.target.value })} />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="row g-3">
                  <div className="col-md-6">
                    <label htmlFor="materialCode" className="form-label">Material Code <RequiredStar /></label>
                    <input type="text" className="form-control" id="materialCode" name="materialCode"
                      maxLength={50} value={form.materialCode} onChange={handleText} />
                  </div>
                  <div className="col-md-6">
                    <label htmlFor="productName" className="form-label">Product Name</label>
                    <input type="text" className="form-control" id="productName" name="productName"
                      maxLength={100} value={form.productName} onChange={handleText} />
                  </div>

                  {selectWithAdd("brandName", "Brand Name", form.brandName, allBrands, 'brandName', 'brand')}

                  <div className="col-md-6">
                    <label htmlFor="model" className="form-label">Model</label>
                    <input type="text" className="form-control" id="model" name="model" maxLength={100} value={form.model} onChange={handleText} />
                  </div>
                  <div className="col-md-6">
                    <label htmlFor="hsnCode" className="form-label">HSN Code</label>
                    <input type="text" className="form-control" id="hsnCode" name="hsnCode" maxLength={8} value={form.hsnCode} onChange={handleHsn} />
                  </div>
                  <div className="col-md-6">
                    <label htmlFor="materialName" className="form-label">Material Description</label>
                    <input type="text" className="form-control" id="materialName" name="materialName" maxLength={100} value={form.materialName} onChange={handleText} />
                  </div>

                  {selectWithAdd("productCategory", "Product Category", form.productCategory, allCategories, 'productCategory', 'category')}

                  <div className="col-md-6">
                    <label htmlFor="category" className="form-label">Product Group</label>
                    <select id="category" className="form-select" value={form.category} onChange={(e) => set('category', e.target.value)}>
                      {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>

                  {selectWithAdd("baseUOM", "Base UOM / Unit", form.baseUOM, uomOptions, 'baseUOM', 'uom')}

                  <div className="col-md-6">
                    <label htmlFor="uomConversion" className="form-label">UOM Conversion</label>
                    <input type="text" className="form-control" id="uomConversion" name="uomConversion" value={form.uomConversion} onChange={handleDecimal(4)} />
                  </div>

                  <div className="col-md-4">
                    <label htmlFor="unitPrice" className="form-label">Purchase Price (₹)</label>
                    <input type="text" inputMode="decimal" className="form-control" id="unitPrice" name="unitPrice" value={form.unitPrice} onChange={handleDecimal(2)} />
                  </div>
                  <div className="col-md-4">
                    <label htmlFor="mrp" className="form-label">MRP (₹)</label>
                    <input type="text" inputMode="decimal" className="form-control" id="mrp" name="mrp" value={form.mrp} onChange={handleDecimal(2)} />
                  </div>
                  <div className="col-md-4">
                    <label htmlFor="salesPrice" className="form-label">Sales Price (₹)</label>
                    <input type="text" inputMode="decimal" className="form-control" id="salesPrice" name="salesPrice" value={form.salesPrice} onChange={handleDecimal(2)} />
                  </div>

                  <div className="col-md-4">
                    <label htmlFor="openingDate" className="form-label">Opening Date</label>
                    <input type="date" className="form-control" id="openingDate" name="openingDate" value={form.openingDate} onChange={handleText} />
                  </div>
                  <div className="col-md-4">
                    <label htmlFor="openingStock" className="form-label">Opening Stock</label>
                    <div className="input-group">
                      <input type="text" inputMode="decimal" className="form-control" id="openingStock" name="openingStock"
                        value={form.openingStock} onChange={handleDecimal(3)} />
                      {uom && <span className="input-group-text">{uom}</span>}
                    </div>
                    {openingDelta !== 0 && (
                      <small className={openingDelta > 0 ? 'text-success' : 'text-danger'}>
                        Current stock will change by {openingDelta > 0 ? '+' : ''}{fmtQty(openingDelta)}
                      </small>
                    )}
                  </div>
                  <div className="col-md-4">
                    <label htmlFor="minStockLevel" className="form-label">Min Stock Level</label>
                    <input type="text" inputMode="decimal" className="form-control" id="minStockLevel" name="minStockLevel"
                      value={form.minStockLevel} onChange={handleDecimal(3)} />
                  </div>

                  <div className="col-md-6">
                    <label htmlFor="warehouseLocation" className="form-label">Warehouse Location</label>
                    <input type="text" className="form-control" id="warehouseLocation" name="warehouseLocation" maxLength={100}
                      value={form.warehouseLocation} onChange={handleText} />
                  </div>
                  <div className="col-md-6">
                    <label htmlFor="stockLocation" className="form-label">Rack Location</label>
                    <input type="text" className="form-control" id="stockLocation" name="stockLocation" maxLength={100}
                      value={form.stockLocation} onChange={handleText} />
                  </div>

                  <div className="col-md-6">
                    <label htmlFor="discountType" className="form-label">Discount Type</label>
                    <select className="form-select" id="discountType" value={form.discountType} onChange={(e) => set('discountType', e.target.value)}>
                      <option value="Zero Discount">Zero Discount</option>
                      <option value="In percentage">In Percentage</option>
                      <option value="In Value">In Value</option>
                    </select>
                  </div>
                  {form.discountType !== 'Zero Discount' && (
                    <div className="col-md-6">
                      <label htmlFor="discountValue" className="form-label">Discount</label>
                      <input type="text" className="form-control" id="discountValue" name="discountValue" value={form.discountValue} onChange={handleDecimal(2)} />
                    </div>
                  )}

                  <div className="col-12">
                    <div className="border bg-gray p-3">
                      <div className="mb-2"><span className="SecondaryInfo">Tax Details</span></div>
                      <div className="form-check form-check-inline">
                        <input className="form-check-input" type="radio" name="updTaxType" id="updTaxNone"
                          checked={form.taxType === 'none'} onChange={() => set('taxType', 'none')} />
                        <label className="form-check-label" htmlFor="updTaxNone">No Tax</label>
                      </div>
                      <div className="form-check form-check-inline">
                        <input className="form-check-input" type="radio" name="updTaxType" id="updTaxGST"
                          checked={form.taxType === 'gst'} onChange={() => set('taxType', 'gst')} />
                        <label className="form-check-label" htmlFor="updTaxGST">Add GST Rate</label>
                      </div>
                      {form.taxType === 'gst' && (
                        <div className="row mt-2">
                          <div className="col-12 col-lg-6">
                            <label className="form-label label_text">GST Rate</label>
                            <div className="input-group">
                              <input type="text" className="form-control" name="gstRate" value={form.gstRate} onChange={handleDecimal(2)} />
                              <span className="input-group-text">%</span>
                            </div>
                          </div>
                          <div className="col-12 col-lg-6">
                            <label className="form-label label_text">GST Effective Date</label>
                            <input type="date" className="form-control" name="gstEffectiveDate" value={form.gstEffectiveDate} onChange={handleText} />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="col-12">
                    <label htmlFor="description" className="form-label">Description / Remarks</label>
                    <textarea className="form-control" id="description" name="description" rows={3} maxLength={500}
                      value={form.description} onChange={handleText} />
                  </div>

                  {/* ── Manual transaction history ── */}
                  {history.length > 0 && (
                    <div className="col-12">
                      <div className="card">
                        <div className="card-body">
                          <h6 className="text-muted border-bottom pb-2 mb-2">Manual Transaction History</h6>
                          <div className="table-responsive" style={{ maxHeight: 200, overflowY: 'auto' }}>
                            <table className="table table-sm table-hover mb-0">
                              <thead className="sticky-top bg-light">
                                <tr><th>Date</th><th>Type</th><th className="text-center">Qty</th><th>Reason</th><th>By</th></tr>
                              </thead>
                              <tbody>
                                {history.map((t, i) => (
                                  <tr key={t._id || i}>
                                    <td>{formatDateTime(t.date)}</td>
                                    <td>
                                      <span className={`badge ${t.type === 'incoming' ? 'bg-success' : 'bg-warning text-dark'}`}>
                                        {t.type === 'incoming' ? 'Incoming (+)' : 'Outgoing (−)'}
                                      </span>
                                    </td>
                                    <td className="text-center">{fmtQty(t.quantity)}</td>
                                    <td>{t.reason}</td>
                                    <td>{t.byName || t.by?.name || 'System'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="modal-footer border-0 justify-content-start">
                <button type="submit" className="btn addbtn rounded-0 add_button px-4" disabled={saving}>
                  {saving ? 'Saving...' : 'Update'}
                </button>
                <button type="button" className="btn addbtn rounded-0 Cancel_button px-4" onClick={onClose}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      </div>

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
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddNewOption(); } }} />
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

export default UpdateInventoryPopup;