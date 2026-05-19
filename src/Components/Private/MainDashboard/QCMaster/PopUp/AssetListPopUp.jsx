// Components/Private/MainDashboard/QCMaster/PopUp/AssetListPopUp.jsx
import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { getQualityInspectionById } from "../../../../../hooks/useQC";
import QRCode from "qrcode";

const AssetListPopUp = ({ handleClose, qcId }) => {
  const [qcData, setQcData]         = useState(null);
  const [isLoading, setIsLoading]   = useState(true);
  const [expandedItem, setExpandedItem] = useState(null);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [selectedBox, setSelectedBox]     = useState(null);
  const [qrImageUrls, setQrImageUrls]     = useState({});
  const [qrLoading, setQrLoading]         = useState(false);

  // ─────────────────────────────────────────────────────────────────
  // Fetch QC data then immediately build QR codes from it
  // ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchQCData = async () => {
      setIsLoading(true);
      try {
        const data = await getQualityInspectionById(qcId);
        if (data.success) {
          setQcData(data.qc);
          // await so QR codes are ready before loading spinner disappears
          await buildAllQRCodes(data.qc);
        } else {
          toast.error(data.error || "Failed to fetch QC data");
        }
      } catch {
        toast.error("Error fetching QC data");
      } finally {
        setIsLoading(false);
      }
    };
    fetchQCData();
  }, [qcId]);

  // ─────────────────────────────────────────────────────────────────
  // safeKey: convert ANY string into a plain alphanumeric key
  // "Box-1" => "Box_1",  "QC/2024-25/001-ABC-0001" => "QC_2024_25_001_ABC_0001"
  // ─────────────────────────────────────────────────────────────────
  const safeKey = (str) => String(str || "").replace(/[^a-zA-Z0-9]/g, "_");

  const OPT_SM    = { width: 75,  margin: 1, color: { dark: "#000", light: "#fff" }, errorCorrectionLevel: "M" };
  const OPT_LG    = { width: 200, margin: 2, color: { dark: "#000", light: "#fff" }, errorCorrectionLevel: "H" };
  const OPT_PRINT = { width: 76,  margin: 1, color: { dark: "#000", light: "#fff" }, errorCorrectionLevel: "H" };

  const buildAllQRCodes = async (qc) => {
    setQrLoading(true);
    const urls = {};

    for (const item of (qc?.items || [])) {
      // ── boxes ──────────────────────────────────────────────────
      for (const box of (item.boxes || [])) {
        // boxQrCodeData is the actual payload stored by the controller
        const payload = box.boxQrCodeData || box.boxNumber || "";
        if (!payload) continue;
        const k = safeKey(box.boxNumber);
        try {
          urls[`box_sm_${k}`]    = await QRCode.toDataURL(payload, OPT_SM);
          urls[`box_lg_${k}`]    = await QRCode.toDataURL(payload, OPT_LG);
          urls[`box_print_${k}`] = await QRCode.toDataURL(payload, OPT_PRINT);
        } catch (err) {
          console.error("Box QR failed:", box.boxNumber, err);
        }
      }

      // ── assets ─────────────────────────────────────────────────
      for (const asset of (item.assets || [])) {
        const payload = asset.qrCodeData || asset.assetId || "";
        if (!payload) continue;
        const k = safeKey(asset.assetId);
        try {
          urls[`asset_sm_${k}`]    = await QRCode.toDataURL(payload, OPT_SM);
          urls[`asset_lg_${k}`]    = await QRCode.toDataURL(payload, OPT_LG);
          urls[`asset_print_${k}`] = await QRCode.toDataURL(payload, OPT_PRINT);
        } catch (err) {
          console.error("Asset QR failed:", asset.assetId, err);
        }
      }
    }

    setQrImageUrls(urls);
    setQrLoading(false);
  };

  // ─────────────────────────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────────────────────────
  const toggleItemExpansion = (i) =>
    setExpandedItem((prev) => (prev === i ? null : i));

  const getStatusBadgeClass = (s) =>
    ({ "In Warehouse": "bg-primary", Dispatched: "bg-info", "In Service": "bg-success",
       "Warranty Expired": "bg-danger", Damaged: "bg-dark" }[s] || "bg-secondary");

  const isExpired = (d) => d && new Date() > new Date(d);
  const fmtDate   = (d) => d ? new Date(d).toLocaleDateString("en-GB") : "-";

  // ─────────────────────────────────────────────────────────────────
  // doPrint – injects HTML into a hidden iframe and calls print()
  // ─────────────────────────────────────────────────────────────────
  const doPrint = (html) => {
    const frame = document.createElement("iframe");
    frame.style.cssText = "position:fixed;left:-9999px;top:-9999px;width:0;height:0;border:none";
    document.body.appendChild(frame);
    const doc = frame.contentDocument || frame.contentWindow.document;
    doc.open(); doc.write(html); doc.close();
    frame.onload = () => {
      setTimeout(() => {
        frame.contentWindow.focus();
        frame.contentWindow.print();
        setTimeout(() => document.body.removeChild(frame), 1500);
      }, 300);
    };
  };

  // ─────────────────────────────────────────────────────────────────
  // PRINT CSS
  //
  // @page size 20mm × 20mm  →  each label IS the page.
  // break-after: always     →  every .label div starts a new page.
  //
  // Result: printer receives N separate 20×20mm pages.
  // A label printer (Zebra, Dymo, Brother) prints each as one sticker.
  // A desktop printer prints each on a separate sheet — user can then
  // feed label sheets or use cut-sticker paper.
  // ─────────────────────────────────────────────────────────────────
  const PRINT_CSS = `
    @page { size: 20mm 20mm; margin: 0; }
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: Arial, Helvetica, sans-serif; background:#fff; }

    .label {
      width: 20mm;
      height: 20mm;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 1mm;
      overflow: hidden;
      text-align: center;
      break-after: always;
      page-break-after: always;
    }

    .label.asset { border-left: 1.2pt solid #059669; }
    .label.box   { border-left: 1.2pt solid #1a56db; }

    .type-lbl {
      font-size: 5pt; font-weight: bold;
      letter-spacing: 0.3pt;
      margin-bottom: 0.6mm;
      text-transform: uppercase;
    }
    .asset .type-lbl { color: #059669; }
    .box   .type-lbl { color: #1a56db; }

    /* QR image: 13mm × 13mm — leaves ~5mm for text */
    .qr-img { width: 13mm; height: 13mm; display: block; margin-bottom: 0.5mm; }

    .id-txt {
      font-size: 4pt;
      font-family: 'Courier New', Courier, monospace;
      font-weight: bold;
      word-break: break-all;
      line-height: 1.15;
      max-width: 100%;
    }
    .nm-txt {
      font-size: 3.5pt; color: #444; line-height: 1.2;
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 100%;
    }
    .w-badge {
      font-size: 3pt; font-weight: bold;
      padding: 0 1mm; border-radius: 1pt; margin-top: 0.4mm;
    }
    .w-badge.ok  { background:#d1fae5; color:#065f46; }
    .w-badge.exp { background:#fee2e2; color:#991b1b; }
  `;

  // ─────────────────────────────────────────────────────────────────
  // buildLabelHTML
  // For each asset → one ASSET label HTML string + one BOX label HTML string.
  // They are separate <div class="label"> elements with break-after:always.
  // ─────────────────────────────────────────────────────────────────
  const buildLabelHTML = (items) => {
    const parts = [];

    for (const item of (items || [])) {
      for (const asset of (item.assets || [])) {
        const ak      = safeKey(asset.assetId);
        const assetQR = qrImageUrls[`asset_print_${ak}`];
        if (!assetQR) continue;          // skip if QR not generated yet

        const exp = isExpired(asset.warrantyExpiryDate);

        // ── label 1: ASSET ──────────────────────────────────────
        parts.push(`
          <div class="label asset">
            <div class="type-lbl">Asset</div>
            <img src="${assetQR}" class="qr-img"/>
            <div class="id-txt">${asset.assetId}</div>
            <div class="nm-txt">${asset.brandName} ${asset.modelNo}</div>
            ${asset.warrantyExpiryDate
              ? `<div class="w-badge ${exp ? "exp" : "ok"}">${exp ? "⚠ Expired" : "✓ OK"}</div>`
              : ""}
          </div>`);

        // ── label 2: BOX (only when this asset belongs to a box) ─
        if (asset.boxNumber) {
          const bk    = safeKey(asset.boxNumber);
          const boxQR = qrImageUrls[`box_print_${bk}`];
          const box   = item.boxes?.find((b) => b.boxNumber === asset.boxNumber);

          if (boxQR) {
            parts.push(`
              <div class="label box">
                <div class="type-lbl">Box</div>
                <img src="${boxQR}" class="qr-img"/>
                <div class="id-txt">${asset.boxNumber}</div>
                <div class="nm-txt">${box?.brandName || asset.brandName} ${box?.modelNo || asset.modelNo}</div>
                <div class="nm-txt">${box?.assetCount ?? ""} items</div>
              </div>`);
          }
        }
      }
    }

    return parts.join("");
  };

  // ─────────────────────────────────────────────────────────────────
  // Print actions
  // ─────────────────────────────────────────────────────────────────
  const printAllQRCodes = () => {
    if (qrLoading) { toast.error("QR codes still generating, please wait…"); return; }
    const body = buildLabelHTML(qcData?.items);
    if (!body) { toast.error("No QR codes available to print"); return; }
    doPrint(`<!DOCTYPE html><html><head><meta charset="utf-8"/>
      <title>QR – ${qcData.qcNumber}</title>
      <style>${PRINT_CSS}</style></head><body>${body}</body></html>`);
  };

  const printItemQRCodes = (item) => {
    if (qrLoading) { toast.error("QR codes still generating, please wait…"); return; }
    const body = buildLabelHTML([item]);
    if (!body) { toast.error("No QR codes available for this item"); return; }
    doPrint(`<!DOCTYPE html><html><head><meta charset="utf-8"/>
      <title>QR – ${item.brandName} ${item.modelNo}</title>
      <style>${PRINT_CSS}</style></head><body>${body}</body></html>`);
  };

  const printBoxQRCodes = () => {
    if (qrLoading) { toast.error("QR codes still generating, please wait…"); return; }
    const parts = [];
    for (const item of (qcData?.items || [])) {
      for (const box of (item.boxes || [])) {
        const bk    = safeKey(box.boxNumber);
        const boxQR = qrImageUrls[`box_print_${bk}`];
        if (!boxQR) continue;
        parts.push(`
          <div class="label box">
            <div class="type-lbl">Box</div>
            <img src="${boxQR}" class="qr-img"/>
            <div class="id-txt">${box.boxNumber}</div>
            <div class="nm-txt">${box.brandName} ${box.modelNo}</div>
            <div class="nm-txt">${box.assetCount} items</div>
          </div>`);
      }
    }
    if (!parts.length) { toast.error("No box QR codes available"); return; }
    doPrint(`<!DOCTYPE html><html><head><meta charset="utf-8"/>
      <title>Box QR – ${qcData.qcNumber}</title>
      <style>${PRINT_CSS}</style></head><body>${parts.join("")}</body></html>`);
  };

  // ─────────────────────────────────────────────────────────────────
  // Download single QR
  // ─────────────────────────────────────────────────────────────────
  const downloadBoxQRCode = (box) => {
    const bk  = safeKey(box.boxNumber);
    const url = qrImageUrls[`box_lg_${bk}`] || qrImageUrls[`box_sm_${bk}`];
    if (!url) { toast.error("Box QR not ready yet"); return; }
    const a = document.createElement("a");
    a.download = `${bk}_BOX_QR.png`; a.href = url; a.click();
    toast.success("Box QR downloaded!");
  };

  const downloadAssetQRCode = (asset) => {
    const ak  = safeKey(asset.assetId);
    const url = qrImageUrls[`asset_lg_${ak}`] || qrImageUrls[`asset_sm_${ak}`];
    if (!url) { toast.error("Asset QR not ready yet"); return; }
    const a = document.createElement("a");
    a.download = `${asset.assetId}_QR.png`; a.href = url; a.click();
    toast.success("Asset QR downloaded!");
  };

  // ─────────────────────────────────────────────────────────────────
  // Loading screen
  // ─────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="modal fade show" style={{ display:"flex", alignItems:"center", backgroundColor:"#00000090" }}>
        <div className="modal-dialog modal-xl">
          <div className="modal-content p-3 text-center py-5">
            <div className="spinner-border text-primary" role="status"></div>
            <p className="mt-3">Loading assets and generating QR codes…</p>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────
  // Main render
  // ─────────────────────────────────────────────────────────────────
  return (
    <div className="modal fade show" style={{ display:"flex", alignItems:"center", backgroundColor:"#00000090" }}>
      <div className="modal-dialog modal-xl modal-dialog-scrollable">
        <div className="modal-content p-3">

          {/* Header */}
          <div className="modal-header pt-0">
            <h5 className="card-title fw-bold">
              <i className="fa fa-qrcode me-2"></i>
              Asset List – {qcData?.qcNumber}
              {qrLoading && (
                <span
                  className="ms-2 spinner-border spinner-border-sm text-secondary"
                  title="Generating QR codes…"
                ></span>
              )}
            </h5>
            <div className="d-flex gap-2" style={{ marginLeft:"auto" }}>
              <button
                className="btn btn-sm btn-outline-primary"
                onClick={printBoxQRCodes}
                disabled={qrLoading}
                title="Print box QR stickers (20×20 mm, one per page)"
              >
                <i className="fa fa-box me-1"></i>Print Box QR
              </button>
              <button
                className="btn btn-sm btn-outline-success"
                onClick={printAllQRCodes}
                disabled={qrLoading}
                title="Print all QR stickers — Asset label + Box label separately (20×20 mm each)"
              >
                <i className="fa fa-print me-1"></i>Print All QR
              </button>
              <button onClick={handleClose} type="button" className="close px-3">
                <span aria-hidden="true">&times;</span>
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="modal-body">

            {/* Summary */}
            <div className="row mb-3">
              <div className="col-12">
                <div className="alert alert-info mb-0">
                  <div className="row">
                    <div className="col-md-3"><strong>QC:</strong> {qcData?.qcNumber}</div>
                    <div className="col-md-3"><strong>GRN:</strong> {qcData?.grnNumber}</div>
                    <div className="col-md-2"><strong>Date:</strong> {fmtDate(qcData?.qcDate)}</div>
                    <div className="col-md-2">
                      <strong>Assets:</strong>{" "}
                      <span className="badge bg-primary ms-1">{qcData?.totalAssets || 0}</span>
                    </div>
                    <div className="col-md-2">
                      <strong>Boxes:</strong>{" "}
                      <span className="badge bg-info ms-1">{qcData?.totalBoxes || 0}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Accordion per item */}
            {qcData?.items?.map((item, itemIndex) => (
              <div key={itemIndex} className="mb-3">

                {/* Accordion header */}
                <div
                  className="card"
                  style={{ cursor:"pointer" }}
                  onClick={() => toggleItemExpansion(itemIndex)}
                >
                  <div className="card-header d-flex justify-content-between align-items-center bg-light">
                    <div>
                      <h6 className="mb-0">
                        <i className={`fa ${expandedItem === itemIndex ? "fa-chevron-down" : "fa-chevron-right"} me-2`}></i>
                        {item.brandName} – {item.modelNo}
                      </h6>
                      <small className="text-muted">
                        QC OK: {item.qcOkQuantity} | Unit: {item.unit} |{" "}
                        Warranty: {item.serviceWarrantyMonths > 0 ? `${item.serviceWarrantyMonths}M` : "No"} |{" "}
                        Items/Box: {item.itemsPerBox || 1}
                      </small>
                    </div>
                    <div>
                      <span className="badge bg-info me-2">
                        <i className="fa fa-box me-1"></i>{item.boxes?.length || 0} boxes
                      </span>
                      <span className="badge bg-primary">
                        <i className="fa fa-qrcode me-1"></i>{item.assets?.length || 0} assets
                      </span>
                    </div>
                  </div>
                </div>

                {/* Accordion body — sibling div, NOT inside .card */}
                {expandedItem === itemIndex && (
                  <div className="border border-top-0 rounded-bottom p-3">

                    <div className="d-flex justify-content-end mb-3">
                      <button
                        className="btn btn-sm btn-outline-dark"
                        disabled={qrLoading}
                        onClick={(e) => { e.stopPropagation(); printItemQRCodes(item); }}
                      >
                        <i className="fa fa-print me-1"></i>
                        Print This Item (separate 20×20 mm labels)
                      </button>
                    </div>

                    {/* ── BOX QR section ── */}
                    {Array.isArray(item.boxes) && item.boxes.length > 0 ? (
                      <>
                        <h6 className="mb-3 text-primary">
                          <i className="fa fa-box me-2"></i>
                          Box QR Codes ({item.boxes.length})
                        </h6>
                        <div className="row mb-3">
                          {item.boxes.map((box, bi) => {
                            const bk     = safeKey(box.boxNumber);
                            const imgSrc = qrImageUrls[`box_sm_${bk}`];
                            return (
                              <div key={bi} className="col-6 col-md-4 col-lg-3 mb-3">
                                <div
                                  className="card text-center p-2 h-100"
                                  style={{ borderLeft:"3px solid #1a56db" }}
                                >
                                  {imgSrc ? (
                                    <img
                                      src={imgSrc}
                                      alt="Box QR"
                                      className="mx-auto d-block mb-2"
                                      style={{ width:"65px", height:"65px", border:"2px solid #1a56db", borderRadius:"6px" }}
                                    />
                                  ) : (
                                    <div
                                      className="bg-primary bg-opacity-10 text-primary p-3 mb-2 mx-auto d-flex align-items-center justify-content-center"
                                      style={{ width:"65px", height:"65px", borderRadius:"6px" }}
                                    >
                                      <i className="fa fa-spinner fa-spin"></i>
                                    </div>
                                  )}
                                  <small className="d-block fw-bold text-primary" style={{ fontSize:"10px" }}>
                                    📦 {box.boxNumber}
                                  </small>
                                  <small className="text-muted" style={{ fontSize:"9px" }}>
                                    {box.assetCount} items
                                  </small>
                                  <div className="mt-1 d-flex gap-1 justify-content-center">
                                    <button
                                      className="btn btn-sm btn-outline-primary py-0 px-2"
                                      onClick={(e) => { e.stopPropagation(); setSelectedBox(box); }}
                                      title="View"
                                    >
                                      <i className="fa fa-eye" style={{ fontSize:"10px" }}></i>
                                    </button>
                                    <button
                                      className="btn btn-sm btn-outline-success py-0 px-2"
                                      onClick={(e) => { e.stopPropagation(); downloadBoxQRCode(box); }}
                                      title="Download"
                                    >
                                      <i className="fa fa-download" style={{ fontSize:"10px" }}></i>
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <hr className="my-3" />
                      </>
                    ) : (
                      <div className="alert alert-secondary py-2 mb-3">
                        <small>
                          <i className="fa fa-info-circle me-1"></i>
                          No boxes (items per box = 1 — each asset is standalone)
                        </small>
                      </div>
                    )}

                    {/* ── Asset table ── */}
                    <h6 className="mb-3">
                      <i className="fa fa-qrcode me-2"></i>Individual Asset QR Codes
                    </h6>
                    <div className="table-responsive">
                      <table className="table table-sm table-bordered mb-3">
                        <thead className="table-secondary">
                          <tr>
                            <th>Asset ID</th>
                            <th>Box</th>
                            <th>In Date</th>
                            <th>Out Date</th>
                            <th>Warranty</th>
                            <th>Expiry</th>
                            <th>Status</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {item.assets?.map((asset, ai) => (
                            <tr key={ai}>
                              <td><small className="font-monospace">{asset.assetId}</small></td>
                              <td>
                                {asset.boxNumber
                                  ? <span className="badge bg-info">{asset.boxNumber}</span>
                                  : "-"}
                              </td>
                              <td>{fmtDate(asset.inDate)}</td>
                              <td>{fmtDate(asset.outDate)}</td>
                              <td>{asset.serviceWarrantyMonths > 0 ? `${asset.serviceWarrantyMonths}M` : "-"}</td>
                              <td>
                                {asset.warrantyExpiryDate
                                  ? <span className={isExpired(asset.warrantyExpiryDate) ? "text-danger" : "text-success"}>
                                      {fmtDate(asset.warrantyExpiryDate)}
                                    </span>
                                  : "-"}
                              </td>
                              <td>
                                <span className={`badge ${getStatusBadgeClass(asset.status)}`}>
                                  {asset.status}
                                </span>
                              </td>
                              <td>
                                <div className="d-flex gap-1">
                                  <button
                                    className="btn btn-sm btn-outline-primary"
                                    onClick={(e) => { e.stopPropagation(); setSelectedAsset(asset); }}
                                  >
                                    <i className="fa fa-eye"></i>
                                  </button>
                                  <button
                                    className="btn btn-sm btn-outline-success"
                                    onClick={(e) => { e.stopPropagation(); downloadAssetQRCode(asset); }}
                                  >
                                    <i className="fa fa-download"></i>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* ── QR preview grid ── */}
                    <div className="mt-2 p-3 bg-light rounded">
                      <div className="d-flex justify-content-between align-items-center mb-3">
                        <div>
                          <h6 className="mb-0">
                            <i className="fa fa-th me-1"></i>QR Preview
                          </h6>
                          <small className="text-muted">
                            Each asset prints as 2 separate 20×20 mm stickers (Asset QR + Box QR)
                          </small>
                        </div>
                        <button
                          className="btn btn-sm btn-outline-dark"
                          disabled={qrLoading}
                          onClick={(e) => { e.stopPropagation(); printItemQRCodes(item); }}
                        >
                          <i className="fa fa-print me-1"></i>Print
                        </button>
                      </div>

                      <div className="row">
                        {item.assets?.map((asset, ai) => {
                          const ak     = safeKey(asset.assetId);
                          const bk     = safeKey(asset.boxNumber || "");
                          const assetQR = qrImageUrls[`asset_sm_${ak}`];
                          const boxQR   = asset.boxNumber ? qrImageUrls[`box_sm_${bk}`] : null;

                          return (
                            <div key={ai} className="col-6 col-md-3 col-lg-2 mb-3">
                              <div className="card p-2 h-100 text-center">

                                {/* ASSET QR preview */}
                                <div
                                  className="mb-1 pb-1"
                                  style={{ borderLeft:"2px solid #059669", paddingLeft:"4px" }}
                                >
                                  <div style={{ fontSize:"7px", color:"#059669", fontWeight:"bold", marginBottom:"2px" }}>
                                    ASSET
                                  </div>
                                  {assetQR
                                    ? <img src={assetQR} alt="Asset QR" style={{ width:"52px", height:"52px" }}/>
                                    : <div style={{ width:"52px", height:"52px", background:"#eee", display:"inline-flex", alignItems:"center", justifyContent:"center" }}>
                                        <i className="fa fa-spinner fa-spin text-muted"></i>
                                      </div>
                                  }
                                  <div
                                    className="font-monospace text-truncate"
                                    style={{ fontSize:"7px", maxWidth:"80px" }}
                                    title={asset.assetId}
                                  >
                                    {asset.assetId}
                                  </div>
                                </div>

                                {/* BOX QR preview — only when asset has a box */}
                                {asset.boxNumber && (
                                  <div style={{ borderLeft:"2px solid #1a56db", paddingLeft:"4px" }}>
                                    <div style={{ fontSize:"7px", color:"#1a56db", fontWeight:"bold", marginBottom:"2px" }}>
                                      BOX
                                    </div>
                                    {boxQR
                                      ? <img src={boxQR} alt="Box QR" style={{ width:"52px", height:"52px" }}/>
                                      : <div style={{ width:"52px", height:"52px", background:"#eee", display:"inline-flex", alignItems:"center", justifyContent:"center" }}>
                                          <i className="fa fa-spinner fa-spin text-muted"></i>
                                        </div>
                                    }
                                    <div style={{ fontSize:"7px", color:"#1a56db" }}>
                                      📦 {asset.boxNumber}
                                    </div>
                                  </div>
                                )}

                                <div className="mt-1">
                                  <span
                                    className={`badge ${getStatusBadgeClass(asset.status)}`}
                                    style={{ fontSize:"7px" }}
                                  >
                                    {asset.status}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                  </div>
                )}
              </div>
            ))}
          </div>

          {/* ── Asset detail modal ── */}
          {selectedAsset && (
            <div
              className="modal fade show"
              style={{ display:"flex", alignItems:"center", backgroundColor:"#00000080", zIndex:9999 }}
            >
              <div className="modal-dialog">
                <div className="modal-content">
                  <div className="modal-header">
                    <h5 className="modal-title font-monospace" style={{ fontSize:"12px" }}>
                      {selectedAsset.assetId}
                    </h5>
                    <button type="button" className="btn-close" onClick={() => setSelectedAsset(null)}></button>
                  </div>
                  <div className="modal-body text-center">
                    {qrImageUrls[`asset_lg_${safeKey(selectedAsset.assetId)}`] && (
                      <img
                        src={qrImageUrls[`asset_lg_${safeKey(selectedAsset.assetId)}`]}
                        alt="QR"
                        className="mx-auto d-block mb-3"
                        style={{ width:"180px", height:"180px" }}
                      />
                    )}
                    <div className="text-start mt-3">
                      <div className="row">
                        <div className="col-6">
                          <p className="mb-1"><strong>Brand:</strong> {selectedAsset.brandName}</p>
                          <p className="mb-1"><strong>Model:</strong> {selectedAsset.modelNo}</p>
                        </div>
                        <div className="col-6">
                          <p className="mb-1"><strong>Box:</strong> {selectedAsset.boxNumber || "Single"}</p>
                          <p className="mb-1">
                            <strong>Status:</strong>{" "}
                            <span className={`badge ${getStatusBadgeClass(selectedAsset.status)}`}>
                              {selectedAsset.status}
                            </span>
                          </p>
                        </div>
                      </div>
                      {selectedAsset.warrantyExpiryDate && (
                        <p className={`mt-2 mb-1 ${isExpired(selectedAsset.warrantyExpiryDate) ? "text-danger" : "text-success"}`}>
                          <strong><i className="fa fa-shield me-1"></i>Warranty:</strong>{" "}
                          {fmtDate(selectedAsset.warrantyExpiryDate)}
                          {isExpired(selectedAsset.warrantyExpiryDate) && " (EXPIRED)"}
                        </p>
                      )}
                    </div>
                    <button className="btn btn-primary mt-3" onClick={() => downloadAssetQRCode(selectedAsset)}>
                      <i className="fa fa-download me-1"></i>Download QR
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Box detail modal ── */}
          {selectedBox && (
            <div
              className="modal fade show"
              style={{ display:"flex", alignItems:"center", backgroundColor:"#00000080", zIndex:9999 }}
            >
              <div className="modal-dialog modal-lg">
                <div className="modal-content">
                  <div className="modal-header bg-primary text-white">
                    <h5 className="modal-title">
                      <i className="fa fa-box me-2"></i>
                      {selectedBox.boxNumber} — {selectedBox.assetCount} Items
                    </h5>
                    <button type="button" className="btn-close btn-close-white" onClick={() => setSelectedBox(null)}></button>
                  </div>
                  <div className="modal-body">
                    <div className="text-center mb-3">
                      {qrImageUrls[`box_lg_${safeKey(selectedBox.boxNumber)}`] && (
                        <>
                          <img
                            src={qrImageUrls[`box_lg_${safeKey(selectedBox.boxNumber)}`]}
                            alt="Box QR"
                            className="mx-auto d-block mb-2"
                            style={{ width:"180px", height:"180px", border:"3px solid #1a56db", borderRadius:"10px" }}
                          />
                          <p className="text-muted small mt-2">Scan to view all items in this box</p>
                        </>
                      )}
                    </div>
                    <div className="row mb-3">
                      <div className="col-4"><strong>Brand:</strong> {selectedBox.brandName}</div>
                      <div className="col-4"><strong>Model:</strong> {selectedBox.modelNo}</div>
                      <div className="col-4"><strong>Items:</strong> {selectedBox.assetCount}</div>
                    </div>
                    <h6>Assets inside this box:</h6>
                    <div className="table-responsive">
                      <table className="table table-sm table-bordered">
                        <thead className="table-secondary">
                          <tr><th>Asset ID</th><th>Warranty</th><th>Status</th><th>QR</th></tr>
                        </thead>
                        <tbody>
                          {qcData?.items
                            ?.flatMap((item) => item.assets || [])
                            .filter((a) => a.boxNumber === selectedBox.boxNumber)
                            .map((asset, idx) => (
                              <tr key={idx}>
                                <td><small className="font-monospace">{asset.assetId}</small></td>
                                <td>
                                  {asset.warrantyExpiryDate
                                    ? <span className={isExpired(asset.warrantyExpiryDate) ? "text-danger" : "text-success"}>
                                        {fmtDate(asset.warrantyExpiryDate)}
                                      </span>
                                    : "No Warranty"}
                                </td>
                                <td>
                                  <span className={`badge ${getStatusBadgeClass(asset.status)}`}>
                                    {asset.status}
                                  </span>
                                </td>
                                <td>
                                  <button className="btn btn-sm btn-outline-success" onClick={() => downloadAssetQRCode(asset)}>
                                    <i className="fa fa-download"></i>
                                  </button>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button className="btn btn-primary" onClick={() => downloadBoxQRCode(selectedBox)}>
                      <i className="fa fa-download me-1"></i>Download Box QR
                    </button>
                    <button className="btn btn-secondary" onClick={() => setSelectedBox(null)}>Close</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="modal-footer">
            <button type="button" onClick={handleClose} className="btn btn-secondary">Close</button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default AssetListPopUp;