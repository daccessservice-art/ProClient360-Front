// Components/Private/MainDashboard/QCMaster/PopUp/AssetListPopUp.jsx
import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { getQualityInspectionById } from "../../../../../hooks/useQC";
import QRCode from "qrcode";

const AssetListPopUp = ({ handleClose, qcId }) => {
  const [qcData, setQcData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedItem, setExpandedItem] = useState(null);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [selectedBox, setSelectedBox] = useState(null);
  const [qrImageUrls, setQrImageUrls] = useState({});

  useEffect(() => {
    const fetchQCData = async () => {
      setIsLoading(true);
      try {
        const data = await getQualityInspectionById(qcId);
        if (data.success) {
          setQcData(data.qc);
          generateAllQRCodes(data.qc);
        } else {
          toast.error(data.error || "Failed to fetch QC data");
        }
      } catch (error) {
        toast.error("Error fetching QC data");
      } finally {
        setIsLoading(false);
      }
    };
    fetchQCData();
  }, [qcId]);

  const qrSmall = { width: 75, margin: 1, color: { dark: "#000", light: "#fff" }, errorCorrectionLevel: "M" };
  const qrLarge = { width: 180, margin: 2, color: { dark: "#000", light: "#fff" }, errorCorrectionLevel: "H" };
  const qrPrint = { width: 60, margin: 1, color: { dark: "#000", light: "#fff" }, errorCorrectionLevel: "M" };

  const generateAllQRCodes = async (qc) => {
    const urls = {};
    if (qc?.items) {
      for (const item of qc.items) {
        if (item.boxes) {
          for (const box of item.boxes) {
            try {
              const key = `box_${box.boxNumber}`;
              urls[key] = await QRCode.toDataURL(box.boxQrCodeData, qrSmall);
              urls[`${key}_large`] = await QRCode.toDataURL(box.boxQrCodeData, qrLarge);
              urls[`${key}_print`] = await QRCode.toDataURL(box.boxQrCodeData, qrPrint);
            } catch (err) {}
          }
        }
        if (item.assets) {
          for (const asset of item.assets) {
            try {
              const key = `asset_${asset.assetId}`;
              urls[key] = await QRCode.toDataURL(asset.qrCodeData, qrSmall);
              urls[`${key}_large`] = await QRCode.toDataURL(asset.qrCodeData, qrLarge);
              urls[`${key}_print`] = await QRCode.toDataURL(asset.qrCodeData, qrPrint);
            } catch (err) {}
          }
        }
      }
    }
    setQrImageUrls(urls);
  };

  const toggleItemExpansion = (index) => {
    setExpandedItem(expandedItem === index ? null : index);
  };

  // Helper: Create print iframe and auto-print
  const doPrint = (htmlContent) => {
    const frame = document.createElement('iframe');
    frame.style.cssText = 'position:fixed;left:-9999px;top:-9999px;width:0;height:0;border:none';
    document.body.appendChild(frame);
    const doc = frame.contentDocument || frame.contentWindow.document;
    doc.open();
    doc.write(htmlContent);
    doc.close();
    frame.onload = () => {
      setTimeout(() => {
        frame.contentWindow.focus();
        frame.contentWindow.print();
        setTimeout(() => document.body.removeChild(frame), 1000);
      }, 250);
    };
  };

  // Print all QR codes
  const printAllQRCodes = () => {
    if (!qcData) return;
    let boxHtml = '', assetHtml = '';
    
    qcData.items?.forEach(item => {
      item.boxes?.forEach(box => {
        const qr = qrImageUrls[`box_${box.boxNumber}_print`] || '';
        if (qr) boxHtml += `<div class="qr box"><div class="lbl">BOX</div><div class="id">${box.boxNumber}</div><img src="${qr}"/><div class="nm">${box.brandName} - ${box.modelNo}</div><div class="ct">${box.assetCount} Items</div></div>`;
      });
      item.assets?.forEach(asset => {
        const qr = qrImageUrls[`asset_${asset.assetId}_print`] || '';
        const exp = asset.warrantyExpiryDate && new Date() > new Date(asset.warrantyExpiryDate);
        if (qr) assetHtml += `<div class="qr asset"><div class="lbl">ASSET</div><div class="id">${asset.assetId}</div><img src="${qr}"/><div class="nm">${asset.brandName} - ${asset.modelNo}</div>${asset.boxNumber ? `<div class="ct">${asset.boxNumber}</div>` : ''}${asset.warrantyExpiryDate ? `<div class="w ${exp ? 'exp' : 'ok'}">${exp ? '⚠ Expired' : '✓ OK'}</div>` : ''}</div>`;
      });
    });

    doPrint(`<!DOCTYPE html><html><head><title>QR - ${qcData.qcNumber}</title><style>
      @page{size:A4;margin:8mm}*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial;font-size:9px}
      .hdr{text-align:center;border-bottom:1.5px solid #000;padding-bottom:5px;margin-bottom:8px}
      .hdr h1{font-size:13px}.hdr p{font-size:9px}
      .st{background:#000;color:#fff;padding:3px 8px;font-size:9px;font-weight:bold;margin:6px 0 4px}
      .st.b{background:#1a56db}.st.a{background:#059669}
      .grid{display:grid;grid-template-columns:repeat(5,1fr);gap:3px}
      .qr{border:0.5px solid #ccc;padding:3px;text-align:center;page-break-inside:avoid}
      .qr.box{border-left:2px solid #1a56db}.qr.asset{border-left:2px solid #059669}
      .qr img{width:50px;height:50px;display:block;margin:2px auto}
      .lbl{font-size:6px;font-weight:bold;letter-spacing:0.5px;color:#666}
      .qr.box .lbl{color:#1a56db}.qr.asset .lbl{color:#059669}
      .id{font-size:6px;font-weight:bold;font-family:'Courier New',monospace;margin:1px 0;word-break:break-all;line-height:1.1}
      .nm{font-size:6px;color:#333;margin-top:1px}.ct{font-size:6px;color:#666}
      .w{display:inline-block;font-size:5px;padding:0 3px;border-radius:1px;margin-top:1px;font-weight:bold}
      .w.ok{background:#d1fae5;color:#065f46}.w.exp{background:#fee2e2;color:#991b1b}
      .ftr{text-align:center;margin-top:6px;font-size:7px;color:#999;border-top:0.5px solid #ccc;padding-top:4px}
    </style></head><body>
      <div class="hdr"><h1>${qcData.company?.name||''}</h1><p><b>QC:</b> ${qcData.qcNumber} | <b>GRN:</b> ${qcData.grnNumber} | <b>Date:</b> ${new Date(qcData.qcDate).toLocaleDateString('en-GB')} | <b>Assets:</b> ${qcData.totalAssets||0} | <b>Boxes:</b> ${qcData.totalBoxes||0}</p></div>
      ${boxHtml ? `<div class="st b">BOX QR CODES (${qcData.totalBoxes||0})</div><div class="grid">${boxHtml}</div>` : ''}
      ${assetHtml ? `<div class="st a">ASSET QR CODES (${qcData.totalAssets||0})</div><div class="grid">${assetHtml}</div>` : ''}
      <div class="ftr">Printed: ${new Date().toLocaleString('en-GB')} | ProClient360</div>
    </body></html>`);
  };

  // Print only box QR codes
  const printBoxQRCodes = () => {
    if (!qcData) return;
    let html = '';
    qcData.items?.forEach(item => {
      item.boxes?.forEach(box => {
        const qr = qrImageUrls[`box_${box.boxNumber}_print`] || '';
        if (qr) html += `<div class="qr"><div class="id">${box.boxNumber}</div><img src="${qr}"/><div class="nm">${box.brandName} - ${box.modelNo}</div><div class="ct">${box.assetCount} Items</div></div>`;
      });
    });
    doPrint(`<!DOCTYPE html><html><head><title>Box QR - ${qcData.qcNumber}</title><style>
      @page{size:A4;margin:10mm}*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial}
      .hdr{text-align:center;border-bottom:1.5px solid #000;padding-bottom:5px;margin-bottom:10px}
      .hdr h1{font-size:14px}.hdr p{font-size:9px}
      .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
      .qr{border:1.5px solid #1a56db;padding:8px;text-align:center;page-break-inside:avoid}
      .qr img{width:90px;height:90px;display:block;margin:5px auto}
      .id{font-size:10px;font-weight:bold;color:#1a56db}.nm{font-size:9px;margin-top:3px}.ct{font-size:8px;color:#666;margin-top:2px}
      .ftr{text-align:center;margin-top:10px;font-size:7px;color:#999}
    </style></head><body>
      <div class="hdr"><h1>${qcData.company?.name||''}</h1><p><b>QC:</b> ${qcData.qcNumber} | <b>Boxes:</b> ${qcData.totalBoxes||0}</p></div>
      <div class="grid">${html}</div>
      <div class="ftr">Printed: ${new Date().toLocaleString('en-GB')} | ProClient360</div>
    </body></html>`);
  };

  // Print specific item's asset QR codes
  const printItemQRCodes = (item) => {
    let boxHtml = '', assetHtml = '';
    
    item.boxes?.forEach(box => {
      const qr = qrImageUrls[`box_${box.boxNumber}_print`] || '';
      if (qr) boxHtml += `<div class="qr box"><div class="id">${box.boxNumber}</div><img src="${qr}"/><div class="nm">${box.brandName} - ${box.modelNo}</div><div class="ct">${box.assetCount} Items</div></div>`;
    });
    item.assets?.forEach(asset => {
      const qr = qrImageUrls[`asset_${asset.assetId}_print`] || '';
      const exp = asset.warrantyExpiryDate && new Date() > new Date(asset.warrantyExpiryDate);
      if (qr) assetHtml += `<div class="qr asset"><div class="id">${asset.assetId}</div><img src="${qr}"/><div class="nm">${asset.brandName} - ${asset.modelNo}</div>${asset.boxNumber ? `<div class="ct">${asset.boxNumber}</div>` : ''}${asset.warrantyExpiryDate ? `<div class="w ${exp ? 'exp' : 'ok'}">${exp ? '⚠ Exp' : '✓ OK'}</div>` : ''}</div>`;
    });

    doPrint(`<!DOCTYPE html><html><head><title>QR - ${item.brandName}</title><style>
      @page{size:A4;margin:8mm}*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial;font-size:9px}
      .hdr{text-align:center;border-bottom:1.5px solid #000;padding-bottom:5px;margin-bottom:8px}
      .hdr h1{font-size:13px}.hdr p{font-size:9px}
      .st{background:#000;color:#fff;padding:3px 8px;font-size:9px;font-weight:bold;margin:6px 0 4px}
      .st.b{background:#1a56db}.st.a{background:#059669}
      .grid{display:grid;grid-template-columns:repeat(5,1fr);gap:3px}
      .qr{border:0.5px solid #ccc;padding:3px;text-align:center;page-break-inside:avoid}
      .qr.box{border-left:2px solid #1a56db}.qr.asset{border-left:2px solid #059669}
      .qr img{width:50px;height:50px;display:block;margin:2px auto}
      .lbl{font-size:6px;font-weight:bold;letter-spacing:0.5px;color:#666}
      .qr.box .lbl{color:#1a56db}.qr.asset .lbl{color:#059669}
      .id{font-size:6px;font-weight:bold;font-family:'Courier New',monospace;margin:1px 0;word-break:break-all;line-height:1.1}
      .nm{font-size:6px;color:#333;margin-top:1px}.ct{font-size:6px;color:#666}
      .w{display:inline-block;font-size:5px;padding:0 3px;border-radius:1px;margin-top:1px;font-weight:bold}
      .w.ok{background:#d1fae5;color:#065f46}.w.exp{background:#fee2e2;color:#991b1b}
      .ftr{text-align:center;margin-top:6px;font-size:7px;color:#999;border-top:0.5px solid #ccc;padding-top:4px}
    </style></head><body>
      <div class="hdr"><h1>${qcData.company?.name||''}</h1><p><b>QC:</b> ${qcData.qcNumber} | <b>Item:</b> ${item.brandName} - ${item.modelNo} | <b>Assets:</b> ${item.assets?.length||0} | <b>Boxes:</b> ${item.boxes?.length||0}</p></div>
      ${boxHtml ? `<div class="st b">BOX QR CODES (${item.boxes?.length||0})</div><div class="grid">${boxHtml}</div>` : ''}
      ${assetHtml ? `<div class="st a">ASSET QR CODES (${item.assets?.length||0})</div><div class="grid">${assetHtml}</div>` : ''}
      <div class="ftr">Printed: ${new Date().toLocaleString('en-GB')} | ProClient360</div>
    </body></html>`);
  };

  const downloadBoxQRCode = (box) => {
    const url = qrImageUrls[`box_${box.boxNumber}_large`] || qrImageUrls[`box_${box.boxNumber}`];
    if (url) {
      const link = document.createElement("a");
      link.download = `${box.boxNumber.replace(/\s+/g, '_')}_QR.png`;
      link.href = url;
      link.click();
      toast.success("Box QR downloaded!");
    }
  };

  const downloadAssetQRCode = (asset) => {
    const url = qrImageUrls[`asset_${asset.assetId}_large`] || qrImageUrls[`asset_${asset.assetId}`];
    if (url) {
      const link = document.createElement("a");
      link.download = `${asset.assetId}_QR.png`;
      link.href = url;
      link.click();
      toast.success("Asset QR downloaded!");
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'In Warehouse': return 'bg-primary';
      case 'Dispatched': return 'bg-info';
      case 'In Service': return 'bg-success';
      case 'Warranty Expired': return 'bg-danger';
      case 'Damaged': return 'bg-dark';
      default: return 'bg-secondary';
    }
  };

  const isWarrantyExpired = (d) => d && new Date() > new Date(d);

  if (isLoading) {
    return (
      <div className="modal fade show" style={{ display: "flex", alignItems: "center", backgroundColor: "#00000090" }}>
        <div className="modal-dialog modal-xl">
          <div className="modal-content p-3 text-center py-5">
            <div className="spinner-border text-primary" role="status"></div>
            <p className="mt-3">Loading assets...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal fade show" style={{ display: "flex", alignItems: "center", backgroundColor: "#00000090" }}>
      <div className="modal-dialog modal-xl modal-dialog-scrollable">
        <div className="modal-content p-3">
          <div className="modal-header pt-0">
            <h5 className="card-title fw-bold">
              <i className="fa fa-qrcode me-2"></i>Asset List - {qcData?.qcNumber}
            </h5>
            <div className="d-flex gap-2" style={{ marginLeft: "auto" }}>
              <button className="btn btn-sm btn-outline-primary" onClick={printBoxQRCodes} title="Print Box QR Codes">
                <i className="fa fa-box me-1"></i>Print Box QR
              </button>
              <button className="btn btn-sm btn-outline-success" onClick={printAllQRCodes} title="Print All QR Codes">
                <i className="fa fa-print me-1"></i>Print All QR
              </button>
              <button onClick={handleClose} type="button" className="close px-3">
                <span aria-hidden="true">&times;</span>
              </button>
            </div>
          </div>

          <div className="modal-body">
            <div className="row mb-3">
              <div className="col-12">
                <div className="alert alert-info mb-0">
                  <div className="row">
                    <div className="col-md-3"><strong>QC:</strong> {qcData?.qcNumber}</div>
                    <div className="col-md-3"><strong>GRN:</strong> {qcData?.grnNumber}</div>
                    <div className="col-md-2"><strong>Date:</strong> {new Date(qcData?.qcDate).toLocaleDateString('en-GB')}</div>
                    <div className="col-md-2"><strong>Assets:</strong> <span className="badge bg-primary ms-1">{qcData?.totalAssets||0}</span></div>
                    <div className="col-md-2"><strong>Boxes:</strong> <span className="badge bg-info ms-1">{qcData?.totalBoxes||0}</span></div>
                  </div>
                </div>
              </div>
            </div>

            {qcData?.items?.map((item, itemIndex) => (
              <div key={itemIndex} className="mb-3">
                <div className="card cursor-pointer" onClick={() => toggleItemExpansion(itemIndex)}>
                  <div className="card-header d-flex justify-content-between align-items-center bg-light">
                    <div>
                      <h6 className="mb-0">
                        <i className={`fa ${expandedItem === itemIndex ? 'fa-chevron-down' : 'fa-chevron-right'} me-2`}></i>
                        {item.brandName} - {item.modelNo}
                      </h6>
                      <small className="text-muted">
                        QC OK: {item.qcOkQuantity} | Unit: {item.unit} | 
                        Warranty: {item.serviceWarrantyMonths > 0 ? `${item.serviceWarrantyMonths}M` : 'No'} |
                        Items/Box: {item.itemsPerBox || 1}
                      </small>
                    </div>
                    <div>
                      <span className="badge bg-info me-2"><i className="fa fa-box me-1"></i>{item.boxes?.length||0}</span>
                      <span className="badge bg-primary me-2"><i className="fa fa-qrcode me-1"></i>{item.assets?.length||0}</span>
                    </div>
                  </div>
                </div>

                {expandedItem === itemIndex && (
                  <div className="card-body p-2 border">
                    
                    {/* Print this item's QR */}
                    <div className="d-flex justify-content-end mb-2">
                      <button className="btn btn-sm btn-outline-dark" onClick={() => printItemQRCodes(item)}>
                        <i className="fa fa-print me-1"></i>Print This Item QR
                      </button>
                    </div>

                    {/* Box QR Codes */}
                    {item.boxes && item.boxes.length > 0 && (
                      <>
                        <h6 className="mb-3 text-primary">
                          <i className="fa fa-box me-2"></i>Box QR Codes (Scan to view all items in box)
                        </h6>
                        <div className="row mb-3">
                          {item.boxes.map((box, boxIndex) => (
                            <div key={boxIndex} className="col-6 col-md-4 col-lg-3 mb-3">
                              <div className="card text-center p-2 h-100 border-primary">
                                {qrImageUrls[`box_${box.boxNumber}`] ? (
                                  <img src={qrImageUrls[`box_${box.boxNumber}`]} alt="Box QR" className="mx-auto d-block mb-2" style={{ width: '65px', height: '65px', border: '2px solid #1a56db', borderRadius: '6px' }} />
                                ) : (
                                  <div className="bg-primary bg-opacity-10 text-primary p-3 mb-2 mx-auto d-flex align-items-center justify-content-center" style={{ width: '65px', height: '65px', borderRadius: '6px' }}><i className="fa fa-spinner fa-spin"></i></div>
                                )}
                                <small className="d-block fw-bold text-primary" style={{ fontSize: '10px' }}>📦 {box.boxNumber}</small>
                                <small className="text-muted" style={{ fontSize: '9px' }}>{box.assetCount} Items</small>
                                <div className="mt-1 d-flex gap-1 justify-content-center">
                                  <button className="btn btn-sm btn-outline-primary py-0 px-2" onClick={(e) => { e.stopPropagation(); setSelectedBox(box); }} title="View"><i className="fa fa-eye" style={{ fontSize: '10px' }}></i></button>
                                  <button className="btn btn-sm btn-outline-success py-0 px-2" onClick={(e) => { e.stopPropagation(); downloadBoxQRCode(box); }} title="Download"><i className="fa fa-download" style={{ fontSize: '10px' }}></i></button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                        <hr className="my-3" />
                      </>
                    )}

                    {/* Asset Table */}
                    <h6 className="mb-3"><i className="fa fa-qrcode me-2"></i>Individual Asset QR Codes</h6>
                    <div className="table-responsive">
                      <table className="table table-sm table-bordered mb-3">
                        <thead className="table-secondary">
                          <tr>
                            <th>Asset ID</th>
                            <th>Box No.</th>
                            <th>In Date</th>
                            <th>Out Date</th>
                            <th>Warranty</th>
                            <th>Expiry</th>
                            <th>Status</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {item.assets?.map((asset, assetIndex) => (
                            <tr key={assetIndex}>
                              <td><small className="font-monospace">{asset.assetId}</small></td>
                              <td>{asset.boxNumber ? <span className="badge bg-info">{asset.boxNumber}</span> : '-'}</td>
                              <td>{new Date(asset.inDate).toLocaleDateString('en-GB')}</td>
                              <td>{asset.outDate ? new Date(asset.outDate).toLocaleDateString('en-GB') : '-'}</td>
                              <td>{asset.serviceWarrantyMonths > 0 ? `${asset.serviceWarrantyMonths}M` : '-'}</td>
                              <td>{asset.warrantyExpiryDate ? <span className={isWarrantyExpired(asset.warrantyExpiryDate) ? 'text-danger' : 'text-success'}>{new Date(asset.warrantyExpiryDate).toLocaleDateString('en-GB')}</span> : '-'}</td>
                              <td><span className={`badge ${getStatusBadgeClass(asset.status)}`}>{asset.status}</span></td>
                              <td>
                                <div className="d-flex gap-1">
                                  <button className="btn btn-sm btn-outline-primary" onClick={(e) => { e.stopPropagation(); setSelectedAsset(asset); }}><i className="fa fa-eye"></i></button>
                                  <button className="btn btn-sm btn-outline-success" onClick={(e) => { e.stopPropagation(); downloadAssetQRCode(asset); }}><i className="fa fa-download"></i></button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* QR Preview Grid */}
                    <div className="mt-2 p-3 bg-light rounded">
                      <div className="d-flex justify-content-between align-items-center mb-3">
                        <h6 className="mb-0"><i className="fa fa-th me-1"></i>QR Codes Preview</h6>
                        <button className="btn btn-sm btn-outline-dark" onClick={() => printItemQRCodes(item)}>
                          <i className="fa fa-print me-1"></i>Print These QR
                        </button>
                      </div>
                      <div className="row">
                        {item.assets?.map((asset, assetIndex) => (
                          <div key={assetIndex} className="col-6 col-md-4 col-lg-3 mb-3">
                            <div className="card text-center p-2 h-100">
                              {qrImageUrls[`asset_${asset.assetId}`] ? (
                                <img src={qrImageUrls[`asset_${asset.assetId}`]} alt="QR" className="mx-auto d-block mb-2" style={{ width: '65px', height: '65px' }} />
                              ) : (
                                <div className="bg-secondary text-white p-3 mb-2 mx-auto d-flex align-items-center justify-content-center" style={{ width: '65px', height: '65px' }}><i className="fa fa-spinner fa-spin"></i></div>
                              )}
                              <small className="d-block font-monospace text-truncate" title={asset.assetId} style={{ fontSize: '8px' }}>{asset.assetId}</small>
                              {asset.boxNumber && <small className="text-muted" style={{ fontSize: '8px' }}>📦 {asset.boxNumber}</small>}
                              <div className="mt-1"><span className={`badge ${getStatusBadgeClass(asset.status)}`} style={{ fontSize: '8px' }}>{asset.status}</span></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Asset Modal */}
          {selectedAsset && (
            <div className="modal fade show" style={{ display: "flex", alignItems: "center", backgroundColor: "#00000080", zIndex: 9999 }}>
              <div className="modal-dialog">
                <div className="modal-content">
                  <div className="modal-header">
                    <h5 className="modal-title font-monospace" style={{ fontSize: '12px' }}>{selectedAsset.assetId}</h5>
                    <button type="button" className="btn-close" onClick={() => setSelectedAsset(null)}></button>
                  </div>
                  <div className="modal-body text-center">
                    {qrImageUrls[`asset_${selectedAsset.assetId}_large`] && <img src={qrImageUrls[`asset_${selectedAsset.assetId}_large`]} alt="QR" className="mx-auto d-block mb-3" style={{ width: '180px', height: '180px' }} />}
                    <div className="text-start mt-3">
                      <div className="row">
                        <div className="col-6"><p className="mb-1"><strong>Brand:</strong> {selectedAsset.brandName}</p><p className="mb-1"><strong>Model:</strong> {selectedAsset.modelNo}</p></div>
                        <div className="col-6"><p className="mb-1"><strong>Box:</strong> {selectedAsset.boxNumber || 'Single'}</p><p className="mb-1"><strong>Status:</strong> <span className={`badge ${getStatusBadgeClass(selectedAsset.status)}`}>{selectedAsset.status}</span></p></div>
                      </div>
                      {selectedAsset.warrantyExpiryDate && <p className={`mt-2 mb-1 ${isWarrantyExpired(selectedAsset.warrantyExpiryDate) ? 'text-danger' : 'text-success'}`}><strong><i className="fa fa-shield me-1"></i>Warranty:</strong> {new Date(selectedAsset.warrantyExpiryDate).toLocaleDateString('en-GB')}{isWarrantyExpired(selectedAsset.warrantyExpiryDate) && ' (EXPIRED)'}</p>}
                    </div>
                    <button className="btn btn-primary mt-3" onClick={() => downloadAssetQRCode(selectedAsset)}><i className="fa fa-download me-1"></i>Download QR</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Box Modal */}
          {selectedBox && (
            <div className="modal fade show" style={{ display: "flex", alignItems: "center", backgroundColor: "#00000080", zIndex: 9999 }}>
              <div className="modal-dialog modal-lg">
                <div className="modal-content">
                  <div className="modal-header bg-primary text-white">
                    <h5 className="modal-title"><i className="fa fa-box me-2"></i>{selectedBox.boxNumber} - {selectedBox.assetCount} Items</h5>
                    <button type="button" className="btn-close btn-close-white" onClick={() => setSelectedBox(null)}></button>
                  </div>
                  <div className="modal-body">
                    <div className="text-center mb-3">
                      {qrImageUrls[`box_${selectedBox.boxNumber}_large`] && <>
                        <img src={qrImageUrls[`box_${selectedBox.boxNumber}_large`]} alt="Box QR" className="mx-auto d-block mb-2" style={{ width: '180px', height: '180px', border: '3px solid #1a56db', borderRadius: '10px' }} />
                        <p className="text-muted small mt-2">Scan this QR to view all items in this box</p>
                      </>}
                    </div>
                    <div className="row mb-3">
                      <div className="col-4"><strong>Brand:</strong> {selectedBox.brandName}</div>
                      <div className="col-4"><strong>Model:</strong> {selectedBox.modelNo}</div>
                      <div className="col-4"><strong>Items:</strong> {selectedBox.assetCount}</div>
                    </div>
                    <h6>Assets inside this box:</h6>
                    <div className="table-responsive">
                      <table className="table table-sm table-bordered">
                        <thead className="table-secondary"><tr><th>Asset ID</th><th>Warranty</th><th>Status</th><th>QR</th></tr></thead>
                        <tbody>
                          {qcData?.items?.flatMap(item => item.assets || []).filter(a => a.boxNumber === selectedBox.boxNumber).map((asset, idx) => (
                            <tr key={idx}>
                              <td><small className="font-monospace">{asset.assetId}</small></td>
                              <td>{asset.warrantyExpiryDate ? <span className={isWarrantyExpired(asset.warrantyExpiryDate) ? 'text-danger' : 'text-success'}>{new Date(asset.warrantyExpiryDate).toLocaleDateString('en-GB')}</span> : 'No Warranty'}</td>
                              <td><span className={`badge ${getStatusBadgeClass(asset.status)}`}>{asset.status}</span></td>
                              <td><button className="btn btn-sm btn-outline-success" onClick={() => downloadAssetQRCode(asset)}><i className="fa fa-download"></i></button></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button className="btn btn-primary" onClick={() => downloadBoxQRCode(selectedBox)}><i className="fa fa-download me-1"></i>Download Box QR</button>
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