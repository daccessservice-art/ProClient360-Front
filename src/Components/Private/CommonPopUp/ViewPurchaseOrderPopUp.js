import React, { useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { approvePurchaseOrder } from '../../../hooks/usePurchaseOrder';
// ⚠️ Adjust the relative path above if this file's location differs —
// it must resolve to hooks/usePurchaseOrder.js

const numberToWords = (num) => {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven',
    'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen',
    'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty',
    'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const convert = (n) => {
    if (n === 0) return '';
    if (n < 20) return ones[n] + ' ';
    if (n < 100) return tens[Math.floor(n / 10)] + ' ' + ones[n % 10] + ' ';
    if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred ' + convert(n % 100);
    if (n < 100000) return convert(Math.floor(n / 1000)) + 'Thousand ' + convert(n % 1000);
    if (n < 10000000) return convert(Math.floor(n / 100000)) + 'Lakh ' + convert(n % 100000);
    return convert(Math.floor(n / 10000000)) + 'Crore ' + convert(n % 10000000);
  };
  if (!num || num === 0) return 'Zero Indian Rupee';
  const rupees = Math.floor(num);
  const paise  = Math.round((num - rupees) * 100);
  let result   = convert(rupees).trim() + ' Indian Rupee';
  if (paise > 0) result += ' and ' + convert(paise).trim() + ' Paise';
  return result;
};

// No hardcoded fallback to a specific company's logo — if a company has
// no logo uploaded, we simply don't render an image (name text still shows).
const DEFAULT_LOGO = null;

const formatCompanyAddress = (address) => {
  if (!address) return '';
  return [address.add, address.city, address.state, address.country, address.pincode]
    .filter(Boolean)
    .join(', ');
};

const SIGNATURE_IMAGE_URL = '/static/assets/img/sign.png';

const canUserApprovePO = () => {
  try {
    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    if (userData?.user === 'company') return true;
    if (Array.isArray(userData?.permissions) && userData.permissions.includes('updatePurchaseOrder')) return true;

    const dept   = (userData?.department || '').toLowerCase();
    const desig  = (userData?.designation || '').toLowerCase();
    if (dept.includes('purchase') && dept.includes('store') && desig === 'ceo') return true;

    return false;
  } catch {
    return false;
  }
};

const ViewPurchaseOrderPopUp = ({ closePopUp, selectedPO, onApproved }) => {
  const po         = selectedPO || {};
  const items      = po.items      || [];
  const totalAmt   = Number(po.totalAmount) || 0;
  const totalTax   = Number(po.totalTax)    || 0;
  const grandTotal = Number(po.grandTotal)  || 0;
  const cgst       = totalTax / 2;
  const sgst       = totalTax / 2;

  const isApproved = po.status === 'Approved';

  const [signatureLoadFailed, setSignatureLoadFailed] = useState(false);
  const [approving, setApproving] = useState(false);

  // Company details resolved from the populated po.company field
  // (name, logo, GST, Address) — dynamic per logged-in company.
  const company = po.company || {};
  const companyName    = company.name || 'N/A';
  const companyAddress = formatCompanyAddress(company.Address);
  const companyGstin   = company.GST || 'N/A';
  const companyLogo    = company.logo || DEFAULT_LOGO;
  const [logoLoadFailed, setLogoLoadFailed] = useState(false);

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5443';

  const getPaymentText = () => {
    const pt = po.paymentTerms || {};
    if (Number(pt.advance) === 100) return '100% ADVANCE';
    const parts = [];
    if (Number(pt.advance)            > 0) parts.push(`Advance: ${pt.advance}%`);
    if (Number(pt.payAgainstDelivery) > 0) parts.push(`Against Delivery: ${pt.payAgainstDelivery}%`);
    if (Number(pt.payAfterCompletion) > 0) parts.push(`After Completion: ${pt.payAfterCompletion}%`);
    if (Number(pt.creditPeriod)       > 0) parts.push(`Credit Period: ${pt.creditPeriod} days`);
    return parts.join(' | ') || 'As per agreement';
  };

  const getVendorAddress = () => {
    const vendor = po.vendor || {};
    if (vendor.typeOfVendor === 'Import') {
      return vendor.manualAddress || null;
    }
    if (vendor.billingAddress?.add) {
      return [
        vendor.billingAddress.add,
        vendor.billingAddress.city,
        vendor.billingAddress.state,
        vendor.billingAddress.country,
        vendor.billingAddress.pincode,
      ].filter(Boolean).join(', ');
    }
    return null;
  };

  const handleDownloadPDF = async () => {
    const toastId = toast.loading('Generating PDF...');
    try {
      const response = await axios.get(
        `${API_URL}/api/purchaseOrder/${po._id}/pdf`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
          responseType: 'blob',
        }
      );
      const url      = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link     = document.createElement('a');
      link.href      = url;
      link.download  = `PO_${po.orderNumber || po._id}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('PDF downloaded successfully!', { id: toastId });
    } catch (error) {
      console.error('PDF download error:', error);
      toast.error('Failed to generate PDF. Please try again.', { id: toastId });
    }
  };

  const handleApprove = async () => {
    if (!po._id || approving) return;
    setApproving(true);
    try {
      const data = await approvePurchaseOrder(po._id);
      if (data?.success) {
        if (data.mailStatus === false) {
          toast.success('Purchase Order approved (but approval email could not be sent — check vendor email on file)');
        } else if (data.mailStatus === true) {
          toast.success('Purchase Order approved & email sent to vendor');
        } else {
          toast.success('Purchase Order approved successfully');
        }
        if (typeof onApproved === 'function') {
          onApproved(po._id);
        }
        closePopUp();
      } else {
        toast.error(data?.error || 'Failed to approve purchase order');
      }
    } finally {
      setApproving(false);
    }
  };

  const showApproveButton = po.status === 'Pending' && canUserApprovePO();

  return (
    <div
      className="modal fade show"
      style={{ display: 'flex', alignItems: 'center', backgroundColor: '#00000090', zIndex: 9999 }}
    >
      <div
        className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable"
        style={{ maxWidth: '1050px', width: '96%' }}
      >
        <div className="modal-content" style={{ maxHeight: '93vh' }}>

          {/* Modal Header */}
          <div className="modal-header bg-dark text-white py-2">
            <h5 className="modal-title fw-bold mb-0">
              <i className="fa-solid fa-file-invoice me-2 text-warning"></i>
              Purchase Order &nbsp;—&nbsp;
              <span className="text-warning">{po.orderNumber || 'N/A'}</span>
              {po.status && (
                <span
                  className={`badge ms-2 ${
                    po.status === 'Approved' ? 'bg-success' :
                    po.status === 'Pending' ? 'bg-warning text-dark' :
                    po.status === 'Cancelled' ? 'bg-danger' : 'bg-secondary'
                  }`}
                  style={{ fontSize: '11px' }}
                >
                  {po.status}
                </span>
              )}
            </h5>

            <button
              type="button"
              className="btn-close btn-close-white ms-auto"
              onClick={closePopUp}
            ></button>
          </div>

          {/* Modal Body */}
          <div className="modal-body p-0" style={{ overflowY: 'auto', backgroundColor: '#fff' }}>

            {/* Company Header — dynamic, per logged-in company */}
            <div className="px-4 pt-3 pb-2 border-bottom">
              <div className="d-flex justify-content-between align-items-start flex-wrap gap-2">
                <div>
                  {companyLogo && !logoLoadFailed && (
                    <img
                      src={companyLogo}
                      alt={companyName}
                      style={{ height: '45px', objectFit: 'contain', marginBottom: '6px' }}
                      onError={() => setLogoLoadFailed(true)}
                    />
                  )}
                  <div className="fw-bold" style={{ fontSize: '14px' }}>{companyName}</div>
                  <div className="text-muted" style={{ fontSize: '11px' }}>{companyAddress}</div>
                </div>
                <div className="text-end">
                  <div className="fw-bold" style={{ fontSize: '11px' }}>GSTIN/UIN: {companyGstin}</div>
                  <h4 className="text-danger fw-bold mt-1 mb-0">Purchase Order</h4>
                </div>
              </div>
            </div>

            {/* Vendor + Invoice Details */}
            <div className="row g-0 border-bottom mx-0">
              <div className="col-6 border-end">
                <div className="px-2 py-1 fw-bold" style={{ backgroundColor: '#b4b49a', fontSize: '11px' }}>
                  VENDOR DETAILS
                </div>
                <div className="p-2" style={{ fontSize: '11px', minHeight: '75px' }}>
                  <div className="fw-bold">{po.vendor?.vendorName || 'N/A'}</div>
                  {getVendorAddress() && (
                    <div className="text-muted mt-1">{getVendorAddress()}</div>
                  )}
                  <div className="mt-1">
                  <strong>GSTIN/UIN:</strong> {po.vendor?.GSTNo || 'N/A'}
                  </div>
                </div>
              </div>
              <div className="col-6">
                <div className="px-2 py-1 fw-bold" style={{ backgroundColor: '#b4b49a', fontSize: '11px' }}>
                  INVOICE DETAILS
                </div>
                <div className="p-2" style={{ fontSize: '11px' }}>
                  {[
                    ['Order No.',        po.orderNumber],
                    ['Order Date:',      po.orderDate ? new Date(po.orderDate).toLocaleDateString('en-GB').replace(/\//g,'-') : 'N/A'],
                    ['Currency:',        'INR'],
                    ['Conversion Rate:', '1.00'],
                  ].map(([lbl, val]) => (
                    <div className="row mb-1" key={lbl}>
                      <div className="col-5 fw-bold">{lbl}</div>
                      <div className="col-7">{val}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Items Table */}
            <div className="table-responsive">
              <table className="table table-bordered mb-0" style={{ fontSize: '11px' }}>
                <thead style={{ backgroundColor: '#b4b49a' }}>
                  <tr className="text-center align-middle">
                    <th style={{ width: '35px' }}>SR.</th>
                    <th className="text-start">ITEM DETAILS</th>
                    <th>HSN/SAC</th>
                    <th>UOM</th>
                    <th>QTY</th>
                    <th>RATE</th>
                    <th>DISC.%</th>
                    <th>WARRANTY</th>
                    <th>TOTAL AMT.(₹)</th>
                    <th>GROSS AMT.(₹)</th>
                    <th>GST%/AMT.</th>
                    <th>NET AMT.(₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => {
                    const qty     = Number(item.quantity)        || 0;
                    const rate    = Number(item.price)           || 0;
                    const disc    = Number(item.discountPercent) || 0;
                    const taxPct  = Number(item.taxPercent)      || 0;
                    const lineAmt = qty * rate * (1 - disc / 100);
                    const taxAmt  = lineAmt * taxPct / 100;
                    const netVal  = lineAmt + taxAmt;

                    const itemName = item.productName || item.brandName || '-';
                    const subParts = [];
                    if (item.brandName) subParts.push(`Brand: ${item.brandName}`);
                    if (item.modelNo) subParts.push(`Model: ${item.modelNo}`);
                    if (item.description) subParts.push(item.description);

                    return (
                      <tr key={idx} className="align-middle">
                        <td className="text-center">{idx + 1}</td>
                        <td>
                          <div className="fw-semibold">{itemName}</div>
                          {subParts.length > 0 && (
                            <div className="text-muted" style={{ fontSize: '10px' }}>
                              {subParts.join(' • ')}
                            </div>
                          )}
                        </td>
                        <td className="text-center">{item.hsnSac || '-'}</td>
                        <td className="text-center">{item.baseUOM || item.unit || '-'}</td>
                        <td className="text-end">{qty.toFixed(2)}</td>
                        <td className="text-end">{rate.toFixed(2)}</td>
                        <td className="text-center">{disc > 0 ? `${disc}%` : '-'}</td>
                        <td className="text-center">{item.warranty || '-'}</td>
                        <td className="text-end">{lineAmt.toFixed(2)}</td>
                        <td className="text-end">{lineAmt.toFixed(2)}</td>
                        <td className="text-center">
                          {taxPct > 0 ? <><div>@{taxPct}%</div><div>{taxAmt.toFixed(2)}</div></> : '-'}
                        </td>
                        <td className="text-end fw-semibold">{netVal.toFixed(2)}</td>
                      </tr>
                    );
                  })}
                  {Array(Math.max(0, 5 - items.length)).fill(null).map((_, i) => (
                    <tr key={`ef-${i}`} style={{ height: '22px' }}>
                      {Array(12).fill(null).map((__, j) => <td key={j}></td>)}
                    </tr>
                  ))}
                  <tr className="fw-bold" style={{ backgroundColor: '#f5f5f5' }}>
                    <td></td>
                    <td className="text-end">Total</td>
                    <td></td><td></td>
                    <td className="text-end">{items.reduce((s,i) => s+(Number(i.quantity)||0),0).toFixed(2)}</td>
                    <td></td><td></td><td></td>
                    <td className="text-end">{totalAmt.toFixed(2)}</td>
                    <td className="text-end">{totalAmt.toFixed(2)}</td>
                    <td className="text-end">{totalTax.toFixed(2)}</td>
                    <td className="text-end">{grandTotal.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* HSN Summary + Totals */}
            <div className="row g-0 mx-0 border-top">
              <div className="col-7 border-end">
                <table className="table table-bordered mb-0" style={{ fontSize: '11px' }}>
                  <thead style={{ backgroundColor: '#b4b49a' }}>
                    <tr>
                      <th>HSN/SAC</th>
                      <th className="text-end">TAXABLE AMT.</th>
                      <th className="text-center">GST RATE</th>
                      <th className="text-end">CGST</th>
                      <th className="text-end">SGST</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ backgroundColor: '#f5f5f5' }}>
                      <td colSpan={5} className="text-center fw-bold">HSN/SAC & CESS SUMMARY</td>
                    </tr>
                    {items.map((item, idx) => {
                      const qty     = Number(item.quantity)        || 0;
                      const rate    = Number(item.price)           || 0;
                      const disc    = Number(item.discountPercent) || 0;
                      const taxPct  = Number(item.taxPercent)      || 0;
                      const lineAmt = qty * rate * (1 - disc / 100);
                      const taxAmt  = lineAmt * taxPct / 100;
                      return (
                        <tr key={idx}>
                          <td>{item.hsnSac || '-'}</td>
                          <td className="text-end">{lineAmt.toFixed(2)}</td>
                          <td className="text-center">{taxPct}%</td>
                          <td className="text-end">{(taxAmt/2).toFixed(2)}</td>
                          <td className="text-end">{(taxAmt/2).toFixed(2)}</td>
                        </tr>
                      );
                    })}
                    {Array(Math.max(0, 3 - items.length)).fill(null).map((_, i) => (
                      <tr key={`hf-${i}`} style={{ height: '20px' }}>
                        {Array(5).fill(null).map((__, j) => <td key={j}></td>)}
                      </tr>
                    ))}
                    <tr className="fw-bold" style={{ backgroundColor: '#f5f5f5' }}>
                      <td>Total</td>
                      <td className="text-end">{totalAmt.toFixed(2)}</td>
                      <td></td>
                      <td className="text-end">{cgst.toFixed(2)}</td>
                      <td className="text-end">{sgst.toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="col-5">
                <table className="table table-bordered mb-0" style={{ fontSize: '11px' }}>
                  <tbody>
                    {[
                      ['Total Amount',        totalAmt.toFixed(2),   false],
                      ['Total Gross Amount',  totalAmt.toFixed(2),   false],
                      ['CGST',               cgst.toFixed(2),        false],
                      ['SGST',               sgst.toFixed(2),        false],
                      ['Total Net Amount',    grandTotal.toFixed(2), true ],
                      ['Round-Off',           '0.00',                false],
                    ].map(([lbl, val, bold]) => (
                      <tr key={lbl} style={bold ? { backgroundColor: '#ebebeb' } : {}}>
                        <td className={bold ? 'fw-bold' : ''}>{lbl}</td>
                        <td className={`text-end ${bold ? 'fw-bold' : ''}`}>{val}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Amount in Words + Grand Total */}
            <div className="row g-0 mx-0 border-top">
              <div className="col-7 border-end p-2" style={{ fontSize: '11px' }}>
                <strong>Total Amount in Words:</strong>{' '}
                <span className="text-muted">{numberToWords(grandTotal)}</span>
              </div>
              <div className="col-5 p-2 d-flex justify-content-between align-items-center fw-bold"
                style={{ backgroundColor: '#ffd2d2', fontSize: '12px' }}>
                <span>Total Amount (₹)</span>
                <span>{grandTotal.toFixed(2)}</span>
              </div>
            </div>

            {/* Payment Terms + Signature — uses companyName */}
            <div className="row g-0 mx-0 border-top">
              <div className="col-6 border-end p-3" style={{ fontSize: '11px', minHeight: '65px' }}>
                <strong>Payment Terms:</strong>{' '}{getPaymentText()}
              </div>
              <div className="col-6 p-2 text-end" style={{ fontSize: '11px' }}>
                <div className="mb-1">For, {companyName}</div>
                <div className="border mx-auto mt-2 d-flex align-items-center justify-content-center"
                  style={{ width: '220px', height: '70px', overflow: 'hidden' }}>
                  {isApproved && !signatureLoadFailed ? (
                    <img
                      src={SIGNATURE_IMAGE_URL}
                      alt="Authorised Signature"
                      style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                      onError={() => setSignatureLoadFailed(true)}
                    />
                  ) : (
                    <span className="text-muted" style={{ fontSize: '9px' }}>Authorised Signatory</span>
                  )}
                </div>
                <div className="mt-1 text-muted" style={{ fontSize: '10px' }}>Signature</div>
              </div>
            </div>

            {/* Remark */}
            {po.remark && (
              <div className="p-3 border-top" style={{ fontSize: '11px' }}>
                <strong>Remarks:</strong> <span className="text-muted">{po.remark}</span>
              </div>
            )}

          </div>

          {/* Modal Footer */}
          <div className="modal-footer py-2 bg-light">
            {showApproveButton && (
              <button
                onClick={handleApprove}
                type="button"
                className="btn btn-success btn-sm fw-bold"
                disabled={approving}
              >
                <i className="fa-solid fa-check me-1"></i> {approving ? 'Approving...' : 'Approve'}
              </button>
            )}
            <button onClick={handleDownloadPDF} className="btn btn-warning btn-sm fw-bold">
              <i className="fa-solid fa-file-pdf me-1"></i> Download PDF
            </button>
            <button onClick={closePopUp} className="btn btn-secondary btn-sm">
              <i className="fa-solid fa-times me-1"></i> Close
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default ViewPurchaseOrderPopUp;