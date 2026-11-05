import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { getInventoryMovements } from '../../../../../hooks/useInventory';
import { TYPE_BADGE } from './ViewInventoryPopup';

const PAGE_SIZE = 50;

const fmtQty = (n) => (Number(n) || 0).toLocaleString('en-IN', { maximumFractionDigits: 3 });
const fmtDate = (v) => (v ? new Date(v).toLocaleDateString('en-GB') : '-');
const fmtDateTime = (v) =>
  v
    ? new Date(v).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })
    : '-';

const TYPES = ['Opening', 'GRN', 'DC', 'Manual In', 'Manual Out', 'PM Adjust In', 'PM Adjust Out'];

/**
 * Stock History for ALL inventory items:
 * Opening / GRN / DC / Manual In / Manual Out — who entered it, when, vendor/customer.
 */
const StockHistoryPopup = ({ onClose, onOpenItem }) => {
  const [filters, setFilters] = useState({ q: '', type: '', from: '', to: '' });
  const [applied, setApplied] = useState({ q: '', type: '', from: '', to: '' });
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState([]);
  const [totals, setTotals] = useState(null);
  const [pagination, setPagination] = useState({ totalPages: 0, totalRecords: 0 });
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      const data = await getInventoryMovements({ ...applied, page, limit: PAGE_SIZE });
      if (!alive) return;
      if (data?.success) {
        setRows(data.data || []);
        setTotals(data.totals || null);
        setPagination(data.pagination || { totalPages: 0, totalRecords: 0 });
      } else {
        setRows([]);
        toast.error(data?.error || 'Failed to load stock history');
      }
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [applied, page]);

  const apply = (e) => {
    e?.preventDefault();
    setPage(1);
    setApplied({ ...filters });
  };

  const reset = () => {
    const empty = { q: '', type: '', from: '', to: '' };
    setFilters(empty);
    setApplied(empty);
    setPage(1);
  };

  const exportCSV = async () => {
    setExporting(true);
    const data = await getInventoryMovements({ ...applied, page: 1, limit: 10000 });
    setExporting(false);
    if (!data?.success || !data.data?.length) return toast.error('Nothing to export');

    const header = ['Doc Date', 'Entered On', 'Type', 'Material Code', 'Product', 'Brand', 'Model', 'Ref No', 'PO No',
      'Vendor / Customer', 'Entered By', 'Opening', 'IN', 'OUT', 'UOM', 'Rate', 'Remark'];
    const esc = (v) => {
      const s = String(v ?? '');
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = data.data.map((r) => [
      fmtDate(r.date), fmtDateTime(r.enteredAt), r.type, r.materialCode, r.productName, r.brandName, r.model,
      r.ref, r.poNo, r.party, r.by, r.opening || '', r.in || '', r.out || '', r.uom, r.rate || '', r.remark,
    ].map(esc).join(','));
    const csv = '﻿' + [header.join(','), ...lines].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Stock_History_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
    toast.success(`${data.data.length} rows exported`);
  };

  return (
    <div className="modal fade show" style={{ display: 'flex', alignItems: 'center', backgroundColor: '#00000090' }}>
      <div className="modal-dialog modal-xl" style={{ maxWidth: '97vw' }}>
        <div className="modal-content p-3">
          <div className="modal-header pt-0">
            <h5 className="card-title fw-bold mb-0">
              <i className="fa-solid fa-clock-rotate-left me-2"></i>Stock History — All Items
            </h5>
            <button onClick={onClose} type="button" className="btn-close" aria-label="Close" style={{ backgroundColor: 'red' }}></button>
          </div>

          <div className="modal-body" style={{ maxHeight: 'calc(88vh - 140px)', overflowY: 'auto' }}>
            {/* ── Filters ── */}
            <form className="row g-2 align-items-end mb-2" onSubmit={apply}>
              <div className="col-12 col-md-4">
                <label className="form-label mb-0" style={{ fontSize: '0.78rem' }}>Search</label>
                <input type="text" className="form-control form-control-sm"
                  placeholder="Code, product, brand, GRN/DC no, vendor, customer, employee..."
                  value={filters.q} onChange={(e) => setFilters({ ...filters, q: e.target.value })} />
              </div>
              <div className="col-6 col-md-2">
                <label className="form-label mb-0" style={{ fontSize: '0.78rem' }}>Type</label>
                <select className="form-select form-select-sm" value={filters.type}
                  onChange={(e) => setFilters({ ...filters, type: e.target.value })}>
                  <option value="">All types</option>
                  {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="col-6 col-md-2">
                <label className="form-label mb-0" style={{ fontSize: '0.78rem' }}>From</label>
                <input type="date" className="form-control form-control-sm" value={filters.from}
                  onChange={(e) => setFilters({ ...filters, from: e.target.value })} />
              </div>
              <div className="col-6 col-md-2">
                <label className="form-label mb-0" style={{ fontSize: '0.78rem' }}>To</label>
                <input type="date" className="form-control form-control-sm" value={filters.to}
                  onChange={(e) => setFilters({ ...filters, to: e.target.value })} />
              </div>
              <div className="col-6 col-md-2 d-flex gap-1">
                <button type="submit" className="btn btn-sm btn-primary flex-fill"><i className="fa fa-filter me-1"></i>Apply</button>
                <button type="button" className="btn btn-sm btn-outline-secondary" onClick={reset} title="Reset"><i className="fa fa-rotate-left"></i></button>
                <button type="button" className="btn btn-sm btn-success" onClick={exportCSV} disabled={exporting} title="Export to Excel (CSV)">
                  <i className="fa-solid fa-file-excel"></i>
                </button>
              </div>
            </form>

            {/* ── Totals ── */}
            {totals && (
              <div className="d-flex flex-wrap gap-2 mb-2" style={{ fontSize: '0.8rem' }}>
                <span className="badge bg-light text-dark border">Entries: {fmtQty(totals.count)}</span>
                <span className="badge bg-light text-success border">Total IN: +{fmtQty(totals.totalIn)}</span>
                <span className="badge bg-light text-danger border">Total OUT: −{fmtQty(totals.totalOut)}</span>
                {Object.entries(totals.byType || {}).map(([t, c]) => (
                  <span key={t} className={`badge ${TYPE_BADGE[t] || 'bg-secondary'}`}>{t}: {c}</span>
                ))}
              </div>
            )}

            {/* ── Table ── */}
            <div className="table-responsive">
              <table className="table table-sm table-bordered table-hover mb-0" style={{ fontSize: '0.8rem' }}>
                <thead className="sticky-top" style={{ background: '#f1f5f9' }}>
                  <tr>
                    <th>Doc Date</th>
                    <th>Entered On</th>
                    <th>Type</th>
                    <th>Material / Product</th>
                    <th>Ref No.</th>
                    <th>Vendor / Customer</th>
                    <th>Entered By</th>
                    <th className="text-end">IN (+)</th>
                    <th className="text-end">OUT (−)</th>
                    <th>Remark</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan="10" className="text-center py-3"><span className="spinner-border spinner-border-sm text-primary"></span> Loading...</td></tr>
                  ) : rows.length === 0 ? (
                    <tr><td colSpan="10" className="text-center text-muted py-3">No stock history found</td></tr>
                  ) : rows.map((r, i) => (
                    <tr key={i}>
                      <td>{fmtDate(r.date)}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>{fmtDateTime(r.enteredAt)}</td>
                      <td><span className={`badge ${TYPE_BADGE[r.type] || 'bg-secondary'}`}>{r.type}</span></td>
                      <td style={{ minWidth: 170 }}>
                        <span
                          className={onOpenItem ? 'text-primary' : ''}
                          style={onOpenItem ? { cursor: 'pointer', textDecoration: 'underline' } : undefined}
                          onClick={onOpenItem ? () => onOpenItem(r.itemId) : undefined}
                          title={onOpenItem ? 'Open this item\'s full ledger' : undefined}
                        >
                          {r.materialCode}
                        </span>{' '}
                        <span className="fw-semibold">{r.productName}</span>
                        {(r.brandName || r.model) && (
                          <div className="text-muted" style={{ fontSize: '0.7rem' }}>{[r.brandName, r.model].filter(Boolean).join(' • ')}</div>
                        )}
                      </td>
                      <td>
                        {r.ref}
                        {r.poNo && <div className="text-muted" style={{ fontSize: '0.7rem' }}>PO: {r.poNo}</div>}
                      </td>
                      <td>
                        {r.party}
                        {r.partyType && <div className="text-muted" style={{ fontSize: '0.7rem' }}>{r.partyType}</div>}
                      </td>
                      <td><i className="fa-solid fa-user me-1 text-muted"></i>{r.by}</td>
                      <td className="text-end" style={{ color: '#15803d', fontWeight: 600 }}>
                        {r.type === 'Opening' ? <span className="text-secondary">{fmtQty(r.opening)} (opening)</span> : r.in ? `+${fmtQty(r.in)}` : '-'}
                      </td>
                      <td className="text-end" style={{ color: '#b91c1c', fontWeight: 600 }}>{r.out ? `−${fmtQty(r.out)}` : '-'}</td>
                      <td>{r.remark || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ── Pagination ── */}
            {pagination.totalPages > 1 && (
              <div className="d-flex justify-content-center align-items-center gap-2 mt-2">
                <button className="btn btn-sm btn-dark" disabled={page <= 1} onClick={() => setPage(1)}>First</button>
                <button className="btn btn-sm btn-dark" disabled={page <= 1} onClick={() => setPage(page - 1)}>Prev</button>
                <span style={{ fontSize: '0.85rem' }}>Page {page} of {pagination.totalPages}</span>
                <button className="btn btn-sm btn-dark" disabled={page >= pagination.totalPages} onClick={() => setPage(page + 1)}>Next</button>
                <button className="btn btn-sm btn-dark" disabled={page >= pagination.totalPages} onClick={() => setPage(pagination.totalPages)}>Last</button>
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

export default StockHistoryPopup;