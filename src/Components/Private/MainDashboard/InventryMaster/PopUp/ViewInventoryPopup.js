import React, { useEffect, useState } from 'react';
import { getInventoryLedger } from '../../../../../hooks/useInventory';

const fmtQty = (n) => (Number(n) || 0).toLocaleString('en-IN', { maximumFractionDigits: 3 });
const fmtMoney = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Number(n) || 0);
const fmtDate = (v) => (v ? new Date(v).toLocaleDateString('en-GB') : '-');
const fmtDateTime = (v) =>
  v
    ? new Date(v).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })
    : '-';

export const TYPE_BADGE = {
  Opening: 'bg-secondary',
  GRN: 'bg-success',
  DC: 'bg-danger',
  'Manual In': 'bg-primary',
  'Manual Out': 'bg-warning text-dark',
  'PM Adjust In': 'bg-info text-dark',
  'PM Adjust Out': 'bg-info text-dark',
};

const ACTION_BADGE = {
  Created: 'bg-success',
  Updated: 'bg-info text-dark',
  'Stock In': 'bg-primary',
  'Stock Out': 'bg-warning text-dark',
};

const Field = ({ label, value, col = 'col-md-4' }) => (
  <div className={col}>
    <label className="form-label fw-bold mb-0" style={{ fontSize: '0.8rem' }}>{label}</label>
    <p className="form-control-plaintext py-1">{value === undefined || value === null || value === '' ? 'N/A' : value}</p>
  </div>
);

const ViewInventoryPopup = ({ selectedInventory, onClose }) => {
  const [tab, setTab] = useState('ledger');
  const [ledger, setLedger] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    if (!selectedInventory?._id) return undefined;
    (async () => {
      setLoading(true);
      const data = await getInventoryLedger(selectedInventory._id);
      if (!alive) return;
      if (data?.success) setLedger(data);
      else setError(data?.error || 'Could not load stock history');
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [selectedInventory]);

  if (!selectedInventory) return null;

  const inv = ledger?.item || selectedInventory;
  const uom = inv.baseUOM || inv.unit || '';
  const entries = ledger?.entries || [];
  const activity = ledger?.activity || [];
  const totals = ledger?.totals;
  const product = ledger?.product;

  return (
    <div className="modal fade show" style={{ display: "flex", alignItems: "center", backgroundColor: "#00000090" }}>
      <div className="modal-dialog modal-xl" style={{ maxWidth: '96vw' }}>
        <div className="modal-content p-3">
          <div className="modal-header pt-0">
            <h5 className="card-title fw-bold mb-0">
              {inv.productName || inv.materialName || 'Inventory Details'}
              <small className="text-muted fw-normal ms-2">
                {inv.materialCode}{(inv.brandName || inv.model) && ` • ${[inv.brandName, inv.model].filter(Boolean).join(' / ')}`}
              </small>
            </h5>
            <button onClick={onClose} type="button" className="btn-close" aria-label="Close" style={{ backgroundColor: 'red' }}></button>
          </div>

          <div className="modal-body" style={{ maxHeight: 'calc(88vh - 150px)', overflowY: 'auto' }}>
            {/* ── Stock summary ── */}
            <div className="row g-2 mb-2">
              {[
                { label: 'Opening Stock', value: fmtQty(inv.openingStock), color: '#334155', sub: `on ${fmtDate(inv.openingDate || inv.createdAt)}` },
                { label: 'Total IN (+)', value: `+${fmtQty(inv.totalIn)}`, color: '#15803d', sub: `GRN ${fmtQty(inv.grnIn)} • Manual ${fmtQty(inv.manualIn)}` },
                { label: 'Total OUT (−)', value: `−${fmtQty(inv.totalOut)}`, color: '#b91c1c', sub: `DC ${fmtQty(inv.dcOut)} • Manual ${fmtQty(inv.manualOut)}` },
                { label: 'Current Stock', value: `${fmtQty(inv.currentStock)} ${uom}`, color: '#1e40af', sub: inv.stockStatus },
                { label: 'Stock Value', value: fmtMoney(inv.stockValue), color: '#6d28d9', sub: `@ ${fmtMoney(inv.unitPrice || inv.purchasePrice)}` },
              ].map((c) => (
                <div className="col-6 col-md" key={c.label}>
                  <div className="border rounded p-2 h-100" style={{ background: '#f8fafc' }}>
                    <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{c.label}</div>
                    <div className="fw-bold" style={{ color: c.color, fontSize: '1.05rem' }}>{c.value}</div>
                    <div style={{ fontSize: '0.68rem', color: '#64748b' }}>{c.sub}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* ── Calculation check ── */}
            {totals && (
              <div className={`alert py-2 mb-2 ${totals.matched ? 'alert-success' : 'alert-warning'}`} style={{ fontSize: '0.82rem' }}>
                <i className={`fa-solid ${totals.matched ? 'fa-circle-check' : 'fa-triangle-exclamation'} me-1`}></i>
                <strong>Calculation:</strong> Opening {fmtQty(totals.opening)} + IN {fmtQty(totals.totalIn)} − OUT {fmtQty(totals.totalOut)} ={' '}
                <strong>{fmtQty(totals.calculatedStock)}</strong>
                {totals.stockSource === 'product' ? (
                  <>
                    {' '}| Product Master live stock: <strong>{fmtQty(totals.currentStock)}</strong>
                    {totals.matched
                      ? ' — matched ✔'
                      : <> — difference <strong>{totals.difference > 0 ? '+' : ''}{fmtQty(totals.difference)}</strong>. Stock was changed directly in Product Master, or GRN/DC are dated before the Opening Date. Edit Opening Stock to match.</>}
                  </>
                ) : ' (not in Product Master — current stock is this calculation)'}
              </div>
            )}

            {/* ── Who created / linked ── */}
            <div className="d-flex flex-wrap gap-3 mb-2" style={{ fontSize: '0.78rem', color: '#475569' }}>
              <span><i className="fa-solid fa-user-plus me-1"></i>Added by <strong>{inv.createdByName || ledger?.opening?.by || '-'}</strong> on {fmtDateTime(inv.createdAt)}</span>
              {inv.lastUpdatedByName && (
                <span><i className="fa-solid fa-user-pen me-1"></i>Last edited by <strong>{inv.lastUpdatedByName}</strong> on {fmtDateTime(inv.updatedAt)}</span>
              )}
              {product ? (
                <span className="text-success">
                  <i className="fa-solid fa-link me-1"></i>Product Master: <strong>{product.productName}</strong>
                  {product.createdByName && <> (added by {product.createdByName} on {fmtDateTime(product.createdAt)})</>}
                  {' '}— stock {fmtQty(product.currentStockQty)}
                  {inv.autoCreated && <span className="badge bg-light text-primary border ms-1">Auto-added from Product Master</span>}
                  {product.duplicate && (
                    <span className="badge bg-warning text-dark ms-1" title="Another product has the same Brand + Model. GRN / DC update only the oldest one.">
                      Duplicate Brand + Model
                    </span>
                  )}
                </span>
              ) : (
                <span><i className="fa-solid fa-link-slash me-1"></i>Not linked to Product Master</span>
              )}
            </div>

            {/* ── Tabs ── */}
            <ul className="nav nav-tabs mb-3">
              {[
                ['ledger', 'fa-right-left', `Stock IN / OUT (${entries.length})`],
                ['activity', 'fa-clock-rotate-left', `Activity Log (${activity.length})`],
                ['details', 'fa-circle-info', 'Details'],
              ].map(([key, icon, label]) => (
                <li className="nav-item" key={key}>
                  <button type="button" className={`nav-link ${tab === key ? 'active' : ''}`} onClick={() => setTab(key)}>
                    <i className={`fa-solid ${icon} me-1`}></i>{label}
                  </button>
                </li>
              ))}
            </ul>

            {loading && <div className="text-center py-4"><span className="spinner-border spinner-border-sm text-primary"></span> Loading history...</div>}
            {!loading && error && <div className="alert alert-danger py-2">{error}</div>}

            {/* ── Ledger ── */}
            {!loading && !error && tab === 'ledger' && (
              <div className="table-responsive" style={{ maxHeight: 420, overflowY: 'auto' }}>
                <table className="table table-sm table-bordered table-hover mb-0" style={{ fontSize: '0.8rem' }}>
                  <thead className="sticky-top" style={{ background: '#f1f5f9' }}>
                    <tr>
                      <th>Doc Date</th>
                      <th>Entered On</th>
                      <th>Type</th>
                      <th>Ref No.</th>
                      <th>Vendor / Customer</th>
                      <th>Entered By</th>
                      <th className="text-end">Rate</th>
                      <th className="text-end">IN (+)</th>
                      <th className="text-end">OUT (−)</th>
                      <th className="text-end">Balance</th>
                      <th>Status / Remark</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ background: '#f8fafc' }}>
                      <td>{fmtDate(ledger?.opening?.date)}</td>
                      <td>{fmtDateTime(ledger?.opening?.enteredAt)}</td>
                      <td><span className="badge bg-secondary">Opening</span></td>
                      <td>-</td>
                      <td>-</td>
                      <td>{ledger?.opening?.by}</td>
                      <td className="text-end">-</td>
                      <td className="text-end">-</td>
                      <td className="text-end">-</td>
                      <td className="text-end fw-bold">{fmtQty(ledger?.opening?.qty)}</td>
                      <td>Opening stock</td>
                    </tr>
                    {entries.length === 0 ? (
                      <tr><td colSpan="11" className="text-center text-muted">No GRN / DC / manual movement since the opening date</td></tr>
                    ) : entries.map((e, i) => (
                      <tr key={i}>
                        <td>{fmtDate(e.date)}</td>
                        <td style={{ whiteSpace: 'nowrap' }}>{fmtDateTime(e.enteredAt)}</td>
                        <td><span className={`badge ${TYPE_BADGE[e.type] || 'bg-secondary'}`}>{e.type}</span></td>
                        <td>
                          {e.ref}
                          {e.poNo && <div className="text-muted" style={{ fontSize: '0.7rem' }}>PO: {e.poNo}</div>}
                        </td>
                        <td>
                          {e.party}
                          {e.partyType && <div className="text-muted" style={{ fontSize: '0.7rem' }}>{e.partyType}</div>}
                        </td>
                        <td><i className="fa-solid fa-user me-1 text-muted"></i>{e.by}</td>
                        <td className="text-end">{e.rate ? fmtMoney(e.rate) : '-'}</td>
                        <td className="text-end" style={{ color: '#15803d', fontWeight: 600 }}>{e.in ? `+${fmtQty(e.in)}` : '-'}</td>
                        <td className="text-end" style={{ color: '#b91c1c', fontWeight: 600 }}>{e.out ? `−${fmtQty(e.out)}` : '-'}</td>
                        <td className="text-end fw-bold">{fmtQty(e.balance)}</td>
                        <td>{e.remark || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="fw-bold" style={{ background: '#f1f5f9' }}>
                      <td colSpan="7" className="text-end">Total</td>
                      <td className="text-end" style={{ color: '#15803d' }}>+{fmtQty(totals?.totalIn)}</td>
                      <td className="text-end" style={{ color: '#b91c1c' }}>−{fmtQty(totals?.totalOut)}</td>
                      <td className="text-end">{fmtQty(totals?.calculatedStock)}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            {/* ── Activity log ── */}
            {!loading && !error && tab === 'activity' && (
              <div className="table-responsive" style={{ maxHeight: 420, overflowY: 'auto' }}>
                <table className="table table-sm table-bordered mb-0" style={{ fontSize: '0.8rem' }}>
                  <thead className="sticky-top" style={{ background: '#f1f5f9' }}>
                    <tr><th>Date & Time</th><th>Action</th><th>By</th><th>Details</th></tr>
                  </thead>
                  <tbody>
                    {activity.map((a, i) => (
                      <tr key={i}>
                        <td style={{ whiteSpace: 'nowrap' }}>{fmtDateTime(a.at)}</td>
                        <td><span className={`badge ${ACTION_BADGE[a.action] || 'bg-secondary'}`}>{a.action}</span></td>
                        <td><i className="fa-solid fa-user me-1 text-muted"></i>{a.by}</td>
                        <td>
                          {a.changes?.length ? (
                            <ul className="mb-0 ps-3">
                              {a.changes.map((c, j) => (
                                <li key={j}>
                                  <strong>{c.label}:</strong>{' '}
                                  <span className="text-danger text-decoration-line-through">{c.from || '(empty)'}</span>{' → '}
                                  <span className="text-success">{c.to || '(empty)'}</span>
                                </li>
                              ))}
                            </ul>
                          ) : a.details}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <small className="text-muted d-block mt-1">GRN and DC entries appear in the "Stock IN / OUT" tab with their own entered-by name and time.</small>
              </div>
            )}

            {/* ── Details ── */}
            {!loading && tab === 'details' && (
              <div className="row g-2">
                <Field label="Material Code" value={inv.materialCode} />
                <Field label="Product Name" value={inv.productName} />
                <Field label="Brand Name" value={inv.brandName} />
                <Field label="Model" value={inv.model} />
                <Field label="HSN Code" value={inv.hsnCode} />
                <Field label="Material Description" value={inv.materialName} />
                <Field label="Product Category" value={inv.productCategory} />
                <Field label="Product Group" value={inv.category} />
                <Field label="Base UOM / Unit" value={uom} />
                <Field label="UOM Conversion" value={inv.uomConversion} />
                <Field label="Purchase Price" value={fmtMoney(inv.unitPrice || inv.purchasePrice)} />
                <Field label="MRP" value={fmtMoney(inv.mrp)} />
                <Field label="Sales Price" value={fmtMoney(inv.salesPrice)} />
                <Field label="Min Stock Level" value={fmtQty(inv.minStockLevel)} />
                <Field label="Warehouse Location" value={inv.warehouseLocation} />
                <Field label="Rack Location" value={inv.stockLocation} />
                <Field label="Discount Type" value={inv.discountType} />
                <Field label="Discount Value" value={inv.discountType === 'Zero Discount' ? '-' : inv.discountValue} />
                <Field label="Tax" value={inv.taxType === 'gst' ? `GST ${inv.gstRate || 0}% (from ${fmtDate(inv.gstEffectiveDate)})` : 'No Tax'} />
                <Field label="Opening Date" value={fmtDate(inv.openingDate)} />
                <Field label="Added" value={`${fmtDateTime(inv.createdAt)}${inv.createdByName ? ` by ${inv.createdByName}` : ''}`} />
                <Field label="Last Updated" value={`${fmtDateTime(inv.updatedAt)}${inv.lastUpdatedByName ? ` by ${inv.lastUpdatedByName}` : ''}`} />
                <Field label="Description / Remarks" value={inv.description} col="col-12" />
              </div>
            )}
          </div>

          <div className="modal-footer border-0 justify-content-start">
            <button type="button" className="btn addbtn rounded-0 Cancel_button px-4" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewInventoryPopup;