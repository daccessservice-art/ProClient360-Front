import { useState } from "react";
import { formatDate } from "../../../utils/formatDate";

const ViewDCPopUp = ({ closePopUp, selectedDC }) => {
  const [dc] = useState(selectedDC);

  // ── PDF Print ─────────────────────────────────────────────────────────────
  const handlePrint = () => {
    const formatDatePDF = (d) =>
      d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—";

    const choiceBgMap = {
      "DC Delivery chalan":         { bg: "#dbeafe", color: "#1d4ed8" },
      "returnable chalan":          { bg: "#d1fae5", color: "#065f46" },
      "Rejected returnable chalan": { bg: "#fef3c7", color: "#92400e" },
      "scrap chalan":               { bg: "#fee2e2", color: "#991b1b" },
    };
    const cStyle = choiceBgMap[dc?.choice] || { bg: "#f1f5f9", color: "#334155" };

    const statusColorMap = {
      Pending:   { bg: "#fef9c3", color: "#854d0e" },
      Delivered: { bg: "#dcfce7", color: "#166534" },
      Returned:  { bg: "#e0f2fe", color: "#075985" },
      Cancelled: { bg: "#fee2e2", color: "#991b1b" },
    };
    const sStyle = statusColorMap[dc?.status] || { bg: "#f1f5f9", color: "#334155" };

    const txColorMap = {
      B2B:    { bg: "#dbeafe", color: "#1d4ed8" },
      SEZ:    { bg: "#dcfce7", color: "#166534" },
      Import: { bg: "#e0f2fe", color: "#075985" },
      Asset:  { bg: "#fef3c7", color: "#92400e" },
    };
    const txStyle = txColorMap[dc?.transactionType] || { bg: "#f1f5f9", color: "#334155" };

    const itemRows = (dc?.items || [])
      .map(
        (item, i) => `
        <tr>
          <td style="padding:7px 8px;border:1px solid #e2e8f0;text-align:center;color:#64748b;">${i + 1}</td>
          <td style="padding:7px 8px;border:1px solid #e2e8f0;">${item.brandName || "—"}</td>
          <td style="padding:7px 8px;border:1px solid #e2e8f0;">${item.modelNo || "—"}</td>
          <td style="padding:7px 8px;border:1px solid #e2e8f0;text-align:center;font-weight:700;">${item.quantity ?? "—"}</td>
          <td style="padding:7px 8px;border:1px solid #e2e8f0;text-align:center;">${item.unit || item.baseUOM || "—"}</td>
        </tr>`
      )
      .join("");

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>DC - ${dc?.dcNumber || ""}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 11px; color: #1e293b; background: #fff; padding: 20px; }

    .top-band {
      display: flex;
      align-items: stretch;
      border: 2px solid #1e3a5f;
      border-radius: 6px;
      overflow: hidden;
      margin-bottom: 14px;
    }
    .company-block {
      flex: 1;
      padding: 12px 16px;
      background: #f8fafc;
      border-right: 2px solid #1e3a5f;
    }
    .company-name { font-size: 15px; font-weight: 800; color: #1e3a5f; }
    .company-sub  { font-size: 9.5px; color: #64748b; margin-top: 2px; }

    .dc-info-block {
      min-width: 230px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 14px 20px;
      background: #1e3a5f;
      gap: 7px;
    }
    .dc-title      { font-size: 13px; font-weight: 800; color: #fff; letter-spacing: 1px; text-transform: uppercase; }
    .choice-badge  { display: inline-block; padding: 4px 16px; border-radius: 20px; font-size: 11px; font-weight: 700; background: ${cStyle.bg}; color: ${cStyle.color}; }
    .dc-number-lbl { font-size: 12px; font-weight: 700; color: #bfdbfe; }
    .dc-date-lbl   { font-size: 10px; color: #93c5fd; }

    .section-card  { border: 1px solid #e2e8f0; border-radius: 6px; margin-bottom: 12px; overflow: hidden; }
    .section-title { background: #1e3a5f; color: #fff; font-size: 10px; font-weight: 700; letter-spacing: 0.8px; text-transform: uppercase; padding: 5px 12px; }
    .section-body  { padding: 10px 12px; }

    .detail-grid   { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px 16px; }
    .detail-label  { font-size: 8.5px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px; }
    .detail-value  { font-size: 10.5px; font-weight: 600; color: #1e293b; }

    .badge-pdf { display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 9.5px; font-weight: 700; }

    .items-table { width: 100%; border-collapse: collapse; }
    .items-table thead tr { background: #1e3a5f; color: #fff; }
    .items-table thead th { padding: 7px 8px; font-size: 9.5px; font-weight: 700; border: 1px solid #1e3a5f; text-align: left; }
    .items-table tbody tr:nth-child(even) { background: #f8fafc; }

    .signature-row { display: flex; justify-content: space-between; margin-top: 32px; padding: 0 10px; }
    .sig-box { text-align: center; width: 150px; border-top: 1px solid #94a3b8; padding-top: 4px; font-size: 9px; color: #64748b; }

    .footer { margin-top: 16px; border-top: 1px solid #e2e8f0; padding-top: 8px; display: flex; justify-content: space-between; font-size: 8px; color: #94a3b8; }

    @media print { body { padding: 8px; } }
  </style>
</head>
<body>

  <!-- TOP HEADER BAND: company left, Choice + DC info right -->
  <div class="top-band">
    <div class="company-block">
      <div class="company-name">DAccess Security Systems Pvt. Ltd.</div>
      <div class="company-sub">Office No 5, 3rd Floor, Revati Arcade - II, Opp Kapil Malhar Society, Baner</div>
      <div class="company-sub">Pune, 27-Maharashtra &nbsp;|&nbsp; Pincode - 411045</div>
      <div class="company-sub">GSTIN : 27AACCD7325G1ZR</div>
    </div>
    <div class="dc-info-block">
      <div class="dc-title">Delivery Challan</div>
      <div class="choice-badge">${dc?.choice || "—"}</div>
      <div class="dc-number-lbl">${dc?.dcNumber || "—"}</div>
      <div class="dc-date-lbl">Date: ${formatDatePDF(dc?.dcDate)}</div>
    </div>
  </div>

  <!-- CHALLAN DETAILS -->
  <div class="section-card">
    <div class="section-title">Challan Details</div>
    <div class="section-body">
      <div class="detail-grid">
        <div>
          <div class="detail-label">DC Number</div>
          <div class="detail-value">${dc?.dcNumber || "—"}</div>
        </div>
        <div>
          <div class="detail-label">DC Date</div>
          <div class="detail-value">${formatDatePDF(dc?.dcDate)}</div>
        </div>
        <div>
          <div class="detail-label">Choice</div>
          <div class="detail-value">
            <span class="badge-pdf" style="background:${cStyle.bg};color:${cStyle.color};">${dc?.choice || "—"}</span>
          </div>
        </div>
        <div>
          <div class="detail-label">Transaction Type</div>
          <div class="detail-value">
            <span class="badge-pdf" style="background:${txStyle.bg};color:${txStyle.color};">${dc?.transactionType || "—"}</span>
          </div>
        </div>
        <div>
          <div class="detail-label">Purchase Type</div>
          <div class="detail-value">${dc?.purchaseType || "—"}</div>
        </div>
        <div>
          <div class="detail-label">Status</div>
          <div class="detail-value">
            <span class="badge-pdf" style="background:${sStyle.bg};color:${sStyle.color};">${dc?.status || "—"}</span>
          </div>
        </div>
        <div>
          <div class="detail-label">PO Number</div>
          <div class="detail-value">${dc?.poNumber || "—"}</div>
        </div>
        <div>
          <div class="detail-label">Project PO Number</div>
          <div class="detail-value">${dc?.projectPurchaseOrderNumber || "—"}</div>
        </div>
        ${dc?.project?.name ? `
        <div>
          <div class="detail-label">Project</div>
          <div class="detail-value">${dc.project.name}</div>
        </div>` : ""}
        ${dc?.warehouseLocation ? `
        <div>
          <div class="detail-label">Warehouse Location</div>
          <div class="detail-value">${dc.warehouseLocation}</div>
        </div>` : ""}
        <div>
          <div class="detail-label">Created By</div>
          <div class="detail-value">${dc?.createdBy?.name || "—"}</div>
        </div>
        <div>
          <div class="detail-label">Created At</div>
          <div class="detail-value">${formatDatePDF(dc?.createdAt)}</div>
        </div>
      </div>
    </div>
  </div>

  <!-- CUSTOMER & DELIVERY -->
  <div class="section-card">
    <div class="section-title">Customer &amp; Delivery</div>
    <div class="section-body">
      <div class="detail-grid">
        <div>
          <div class="detail-label">Customer Name</div>
          <div class="detail-value">${dc?.customer?.custName || "—"}</div>
        </div>
        <div style="grid-column: span 2;">
          <div class="detail-label">Delivery Address</div>
          <div class="detail-value">${dc?.deliveryAddress || "—"}</div>
        </div>
        <div>
          <div class="detail-label">Location</div>
          <div class="detail-value">${dc?.location || "—"}</div>
        </div>
      </div>
    </div>
  </div>

  <!-- ITEMS TABLE -->
  <div class="section-card">
    <div class="section-title">Item Details (${(dc?.items || []).length} item${(dc?.items || []).length !== 1 ? "s" : ""})</div>
    <div class="section-body" style="padding:0;">
      <table class="items-table">
        <thead>
          <tr>
            <th style="width:40px;text-align:center;">#</th>
            <th>Brand Name</th>
            <th>Model No</th>
            <th style="width:80px;text-align:center;">Quantity</th>
            <th style="width:80px;text-align:center;">Unit</th>
          </tr>
        </thead>
        <tbody>
          ${itemRows || `<tr><td colspan="5" style="text-align:center;padding:12px;color:#94a3b8;">No items</td></tr>`}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="3" style="text-align:right;padding:7px 8px;border:1px solid #e2e8f0;font-weight:700;background:#f1f5f9;">Total Items:</td>
            <td style="text-align:center;padding:7px 8px;border:1px solid #e2e8f0;font-weight:700;background:#f1f5f9;">${dc?.items?.length || 0}</td>
            <td style="border:1px solid #e2e8f0;background:#f1f5f9;"></td>
          </tr>
        </tfoot>
      </table>
    </div>
  </div>

  ${dc?.remark ? `
  <div class="section-card">
    <div class="section-title">Remark</div>
    <div class="section-body">
      <div style="font-size:10.5px;color:#475569;">${dc.remark}</div>
    </div>
  </div>` : ""}

  <!-- SIGNATURE -->
  <div class="signature-row">
    <div class="sig-box">Prepared By</div>
    <div class="sig-box">Checked By</div>
    <div class="sig-box">Authorised Signatory</div>
  </div>

  <!-- FOOTER -->
  <div class="footer">
    <span>This is a system-generated document.</span>
    <span>Printed on: ${new Date().toLocaleDateString("en-GB")} ${new Date().toLocaleTimeString("en-IN")}</span>
  </div>

  <script>window.onload = function(){ window.print(); }</script>
</body>
</html>`;

    const printWindow = window.open("", "_blank", "width=900,height=700");
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  return (
    <>
      <div
        className="modal fade show"
        style={{
          display: "flex",
          alignItems: "center",
          backgroundColor: "#00000090",
        }}
      >
        <div className="modal-dialog modal_widthhh_details modal-xl">
          <div className="modal-content p-3">
            <div className="modal-header pt-0">
              <h5 className="card-title fw-bold" id="exampleModalLongTitle">
                Delivery Challan Details
              </h5>
              <div className="d-flex gap-2 ms-auto">
                <button
                  type="button"
                  className="btn btn-sm btn-danger"
                  onClick={handlePrint}
                  title="Print / Save as PDF"
                >
                  <i className="fa-solid fa-print me-1"></i> Print
                </button>
                <button
                  onClick={() => closePopUp()}
                  type="button"
                  className="close px-3"
                >
                  <span aria-hidden="true">&times;</span>
                </button>
              </div>
            </div>

            <div className="modal-body">
              <div className="row modal_body_height_details">
                <div className="row">
                  <div className="col-sm- col-md col-lg">
                    <h6>
                      <p className="fw-bold">DC Number:</p>
                      {dc?.dcNumber || "-"}
                    </h6>
                    <h6>
                      <p className="fw-bold mt-3">DC Date:</p>
                      {dc?.dcDate ? formatDate(dc.dcDate) : "-"}
                    </h6>
                    <h6>
                      <p className="fw-bold mt-3">Choice:</p>
                      <span className={`badge ${
                        dc?.choice === 'DC Delivery chalan' ? 'bg-primary' : 
                        dc?.choice === 'returnable chalan' ? 'bg-info' :
                        dc?.choice === 'Rejected returnable chalan' ? 'bg-warning' : 'bg-danger'
                      }`}>
                        {dc?.choice || "-"}
                      </span>
                    </h6>
                    <h6>
                      <p className="fw-bold mt-3">PO Number:</p>
                      {dc?.poNumber || "-"}
                    </h6>
                    <h6>
                      <p className="fw-bold mt-3">Project Purchase Order No.:</p>
                      {dc?.projectPurchaseOrderNumber || "-"}
                    </h6>
                    <h6>
                      <p className="fw-bold mt-3">Customer Name:</p>
                      {dc?.customer?.custName || "-"}
                    </h6>
                    <h6>
                      <p className="fw-bold mt-3">Transaction Type:</p>
                      <span className={`badge ${
                        dc?.transactionType === 'B2B' ? 'bg-primary' : 
                        dc?.transactionType === 'SEZ' ? 'bg-success' :
                        dc?.transactionType === 'Import' ? 'bg-info' : 'bg-warning'
                      }`}>
                        {dc?.transactionType || "-"}
                      </span>
                    </h6>
                    <h6>
                      <p className="fw-bold mt-3">Purchase Type:</p>
                      <span className={`badge ${
                        dc?.purchaseType === 'Project Purchase' ? 'bg-primary' : 'bg-secondary'
                      }`}>
                        {dc?.purchaseType || "-"}
                      </span>
                    </h6>
                    {dc?.purchaseType === "Project Purchase" && (
                      <h6>
                        <p className="fw-bold mt-3">Project Name:</p>
                        {dc?.project?.name || "-"}
                      </h6>
                    )}
                    {dc?.purchaseType === "Stock" && (
                      <h6>
                        <p className="fw-bold mt-3">Warehouse Location:</p>
                        {dc?.warehouseLocation || "-"}
                      </h6>
                    )}
                    <h6>
                      <p className="fw-bold mt-3">Status:</p>
                      <span className={`badge ${
                        dc?.status === 'Pending' ? 'bg-warning' : 
                        dc?.status === 'Delivered' ? 'bg-success' :
                        dc?.status === 'Returned' ? 'bg-info' : 'bg-danger'
                      }`}>
                        {dc?.status || "-"}
                      </span>
                    </h6>
                  </div>
                  <div className="col-sm- col-md col-lg">
                    <h6>
                      <p className="fw-bold">Delivery Address:</p>
                      {dc?.deliveryAddress || "-"}
                    </h6>
                    <h6>
                      <p className="fw-bold mt-3">Location:</p>
                      {dc?.location || "-"}
                    </h6>
                    <p className="fw-bold mt-3">Created At:</p>
                    {dc?.createdAt ? formatDate(dc.createdAt) : "-"}
                    <p className="fw-bold mt-3">Updated At:</p>
                    {dc?.updatedAt ? formatDate(dc.updatedAt) : "-"}
                    <p className="fw-bold mt-3">Created By:</p>
                    {dc?.createdBy?.name || "-"}
                  </div>
                </div>

                {dc?.remark && (
                  <div className="row mt-3">
                    <div className="col-12">
                      <h6 className="fw-bold">Remark:</h6>
                      <p>{dc.remark}</p>
                    </div>
                  </div>
                )}

                {/* Items Section */}
                <div className="row mt-3">
                  <div className="col-12">
                    <h6 className="fw-bold">Items:</h6>
                    <div className="table-responsive">
                      <table className="table table-bordered">
                        <thead>
                          <tr>
                            <th>Brand Name</th>
                            <th>Model No</th>
                            <th>Quantity</th>
                            <th>Unit</th>
                            <th>Base UOM</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dc?.items?.map((item, index) => (
                            <tr key={index}>
                              <td>{item.brandName}</td>
                              <td>{item.modelNo}</td>
                              <td>
                                <span className="badge bg-primary">
                                  {item.quantity}
                                </span>
                              </td>
                              <td>{item.unit || "-"}</td>
                              <td>{item.baseUOM || "-"}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="fw-bold">
                            <td colSpan="2" className="text-end">Total Items:</td>
                            <td>{dc?.items?.length || 0}</td>
                            <td></td>
                            <td></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Attachments Section */}
                {dc?.attachments && dc.attachments.length > 0 && (
                  <div className="row mt-3">
                    <div className="col-12">
                      <h6 className="fw-bold">Attachments:</h6>
                      <div className="d-flex flex-wrap">
                        {dc.attachments.map((attachment, index) => (
                          <div key={index} className="mb-2 me-2">
                            {attachment.dataUrl ? (
                              <a
                                href={attachment.dataUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-sm btn-outline-primary"
                              >
                                <i className={`fa-solid ${
                                  attachment.type.includes('pdf') ? 'fa-file-pdf' :
                                  attachment.type.includes('image') ? 'fa-file-image' :
                                  'fa-file'
                                } me-2`}></i>
                                {attachment.name || `Document ${index + 1}`}
                              </a>
                            ) : (
                              <a
                                href={attachment.url || attachment}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-sm btn-outline-primary"
                              >
                                <i className={`fa-solid ${
                                  attachment.type?.includes('pdf') ? 'fa-file-pdf' :
                                  attachment.type?.includes('image') ? 'fa-file-image' :
                                  'fa-file'
                                } me-2`}></i>
                                {attachment.name || `Document ${index + 1}`}
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ViewDCPopUp;