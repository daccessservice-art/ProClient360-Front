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

  // Generate QR codes as data URLs (both asset and box QRs)
  const generateAllQRCodes = async (qc) => {
    const urls = {};
    if (qc?.items) {
      for (const item of qc.items) {
        // Generate box QR codes
        if (item.boxes) {
          for (const box of item.boxes) {
            try {
              urls[`BOX-${box.boxNumber}`] = await QRCode.toDataURL(box.boxQrCodeData, {
                width: 150,
                margin: 1,
                color: { dark: "#000000", light: "#ffffff" },
                errorCorrectionLevel: "H",
              });
            } catch (err) {
              console.error("Box QR generation error:", err);
            }
          }
        }
        // Generate asset QR codes
        if (item.assets) {
          for (const asset of item.assets) {
            try {
              urls[asset.assetId] = await QRCode.toDataURL(asset.qrCodeData, {
                width: 150,
                margin: 1,
                color: { dark: "#000000", light: "#ffffff" },
                errorCorrectionLevel: "H",
              });
            } catch (err) {
              console.error("QR generation error:", err);
            }
          }
        }
      }
    }
    setQrImageUrls(urls);
  };

  const toggleItemExpansion = (index) => {
    setExpandedItem(expandedItem === index ? null : index);
  };

  const downloadQRCode = (id, type = 'asset') => {
    const key = type === 'box' ? `BOX-${id}` : id;
    const url = qrImageUrls[key];
    if (url) {
      const link = document.createElement("a");
      link.download = `${type === 'box' ? `Box-${id}` : id}.png`;
      link.href = url;
      link.click();
      toast.success("QR Code downloaded!");
    }
  };

  const printAllQRCodes = () => {
    if (!qcData) return;

    const printWindow = window.open('', '_blank');
    
    let qrItems = '';
    
    qcData.items?.forEach(item => {
      // Add box QR codes
      item.boxes?.forEach(box => {
        qrItems += `
          <div class="qr-item" style="border: 3px solid #1a56db; background: #e8f0fe;">
            <div class="asset-id" style="color: #1a56db;">📦 ${box.boxNumber}</div>
            <img src="${qrImageUrls[`BOX-${box.boxNumber}`] || ''}" alt="Box QR Code" />
            <div class="info"><strong>${box.brandName}</strong> - ${box.modelNo}</div>
            <div class="box-info">${box.assetCount} Items in Box</div>
          </div>
        `;
      });

      // Add individual asset QR codes
      item.assets?.forEach(asset => {
        qrItems += `
          <div class="qr-item">
            <div class="asset-id">${asset.assetId}</div>
            <img src="${qrImageUrls[asset.assetId] || ''}" alt="QR Code" />
            <div class="info"><strong>${asset.brandName}</strong> - ${asset.modelNo}</div>
            ${asset.boxNumber ? `<div class="box-info">📦 ${asset.boxNumber}</div>` : ''}
            <div class="dates">In: ${new Date(asset.inDate).toLocaleDateString('en-GB')}</div>
            ${asset.warrantyExpiryDate ? `
              <div class="warranty">
                ${new Date() > new Date(asset.warrantyExpiryDate) ? '⚠️ Warranty Expired' : `✅ Warranty: ${new Date(asset.warrantyExpiryDate).toLocaleDateString('en-GB')}`}
              </div>
            ` : ''}
          </div>
        `;
      });
    });

    printWindow.document.write(`
      <html>
        <head>
          <title>QR Codes - ${qcData?.qcNumber}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: Arial, sans-serif; padding: 20px; }
            .header { text-align: center; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 2px solid #333; }
            .header h2 { margin-bottom: 5px; }
            .header p { color: #666; }
            .qr-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; }
            .qr-item { 
              border: 2px solid #333; 
              padding: 10px; 
              text-align: center; 
              page-break-inside: avoid;
              background: white;
            }
            .qr-item img { width: 120px; height: 120px; margin: 0 auto 8px; display: block; }
            .qr-item .asset-id { font-weight: bold; font-size: 10px; font-family: monospace; margin-bottom: 3px; }
            .qr-item .info { font-size: 9px; color: #333; }
            .qr-item .box-info { font-size: 9px; color: #666; margin-top: 2px; }
            .qr-item .dates { font-size: 8px; color: #0066cc; margin-top: 2px; }
            .qr-item .warranty { font-size: 8px; color: #009900; margin-top: 2px; }
            @media print {
              body { padding: 10px; }
              .qr-grid { gap: 10px; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>${qcData?.company?.name || 'Company'}</h2>
            <p><strong>QC Number:</strong> ${qcData?.qcNumber} | <strong>GRN Number:</strong> ${qcData?.grnNumber}</p>
            <p><strong>QC Date:</strong> ${new Date(qcData?.qcDate).toLocaleDateString('en-GB')} | <strong>Total Assets:</strong> ${qcData?.totalAssets || 0} | <strong>Total Boxes:</strong> ${qcData?.totalBoxes || 0}</p>
          </div>
          <div class="qr-grid">
            ${qrItems}
          </div>
        </body>
      </html>
    `);
    
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  const getAllAssets = () => {
    if (!qcData?.items) return [];
    const allAssets = [];
    qcData.items.forEach(item => {
      if (item.assets) {
        item.assets.forEach(asset => {
          allAssets.push({
            ...asset,
            brandName: item.brandName,
            modelNo: item.modelNo,
            unit: item.unit,
          });
        });
      }
    });
    return allAssets;
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

  const isWarrantyExpired = (expiryDate) => {
    if (!expiryDate) return false;
    return new Date() > new Date(expiryDate);
  };

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
              <i className="fa fa-qrcode me-2"></i>
              Asset List - {qcData?.qcNumber}
            </h5>
            <div className="d-flex gap-2" style={{ marginLeft: "auto" }}>
              <button className="btn btn-sm btn-outline-success" onClick={printAllQRCodes}>
                <i className="fa fa-print me-1"></i> Print All QR
              </button>
              <button onClick={handleClose} type="button" className="close px-3">
                <span aria-hidden="true">&times;</span>
              </button>
            </div>
          </div>

          <div className="modal-body">
            {/* Summary */}
            <div className="row mb-3">
              <div className="col-12">
                <div className="alert alert-info mb-0">
                  <div className="row">
                    <div className="col-md-3">
                      <strong>QC Number:</strong> {qcData?.qcNumber}
                    </div>
                    <div className="col-md-3">
                      <strong>GRN Number:</strong> {qcData?.grnNumber}
                    </div>
                    <div className="col-md-2">
                      <strong>QC Date:</strong> {new Date(qcData?.qcDate).toLocaleDateString('en-GB')}
                    </div>
                    <div className="col-md-2">
                      <strong>Total Assets:</strong> 
                      <span className="badge bg-primary ms-1">{qcData?.totalAssets || getAllAssets().length}</span>
                    </div>
                    <div className="col-md-2">
                      <strong>Total Boxes:</strong> 
                      <span className="badge bg-info ms-1">{qcData?.totalBoxes || 0}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Items with Assets */}
            {qcData?.items?.map((item, itemIndex) => (
              <div key={itemIndex} className="mb-3">
                <div 
                  className="card cursor-pointer" 
                  onClick={() => toggleItemExpansion(itemIndex)}
                >
                  <div className="card-header d-flex justify-content-between align-items-center bg-light">
                    <div>
                      <h6 className="mb-0">
                        <i className={`fa ${expandedItem === itemIndex ? 'fa-chevron-down' : 'fa-chevron-right'} me-2`}></i>
                        {item.brandName} - {item.modelNo}
                      </h6>
                      <small className="text-muted">
                        QC OK: {item.qcOkQuantity} | Unit: {item.unit} | 
                        Warranty: {item.serviceWarrantyMonths > 0 ? `${item.serviceWarrantyMonths} months` : 'No Warranty'} |
                        Items/Box: {item.itemsPerBox || 1}
                      </small>
                    </div>
                    <div>
                      <span className="badge bg-info me-2">
                        <i className="fa fa-box me-1"></i>
                        {item.boxes?.length || 0} Boxes
                      </span>
                      <span className="badge bg-primary me-2">
                        <i className="fa fa-qrcode me-1"></i>
                        {item.assets?.length || 0} Assets
                      </span>
                    </div>
                  </div>
                </div>

                {expandedItem === itemIndex && (
                  <div className="card-body p-2 border">
                    
                    {/* BOX QR CODES SECTION - Only show if there are boxes */}
                    {item.boxes && item.boxes.length > 0 && (
                      <>
                        <h6 className="mt-2 mb-3 text-primary">
                          <i className="fa fa-box me-2"></i>
                          Box QR Codes (Scan to view all items in box)
                        </h6>
                        <div className="row mb-3">
                          {item.boxes.map((box, boxIndex) => (
                            <div key={boxIndex} className="col-6 col-md-4 col-lg-3 mb-3">
                              <div className="card text-center p-2 h-100 border-primary">
                                {qrImageUrls[`BOX-${box.boxNumber}`] ? (
                                  <img 
                                    src={qrImageUrls[`BOX-${box.boxNumber}`]} 
                                    alt="Box QR Code" 
                                    className="mx-auto d-block mb-2"
                                    style={{ width: '100px', height: '100px', border: '2px solid #1a56db', borderRadius: '8px' }}
                                  />
                                ) : (
                                  <div 
                                    className="bg-primary bg-opacity-10 text-primary p-3 mb-2 mx-auto d-flex align-items-center justify-content-center" 
                                    style={{ width: '100px', height: '100px', borderRadius: '8px' }}
                                  >
                                    <i className="fa fa-spinner fa-spin"></i>
                                  </div>
                                )}
                                <small className="d-block fw-bold text-primary" style={{ fontSize: '10px' }}>
                                  📦 {box.boxNumber}
                                </small>
                                <small className="text-muted" style={{ fontSize: '9px' }}>
                                  {box.assetCount} Items
                                </small>
                                <div className="mt-1">
                                  <button 
                                    className="btn btn-sm btn-outline-primary py-0 px-2"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedBox(box);
                                    }}
                                    title="View Box Details"
                                  >
                                    <i className="fa fa-eye" style={{ fontSize: '10px' }}></i>
                                  </button>
                                  <button 
                                    className="btn btn-sm btn-outline-success py-0 px-2 ms-1"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      downloadQRCode(box.boxNumber, 'box');
                                    }}
                                    title="Download Box QR"
                                  >
                                    <i className="fa fa-download" style={{ fontSize: '10px' }}></i>
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                        
                        <hr className="my-3" />
                      </>
                    )}

                    {/* INDIVIDUAL ASSET QR CODES SECTION */}
                    <h6 className="mb-3">
                      <i className="fa fa-qrcode me-2"></i>
                      Individual Asset QR Codes
                    </h6>
                    
                    {/* Asset Table */}
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
                              <td>
                                <small className="font-monospace">{asset.assetId}</small>
                              </td>
                              <td>
                                {asset.boxNumber ? (
                                  <span className="badge bg-info">{asset.boxNumber}</span>
                                ) : '-'}
                              </td>
                              <td>{new Date(asset.inDate).toLocaleDateString('en-GB')}</td>
                              <td>{asset.outDate ? new Date(asset.outDate).toLocaleDateString('en-GB') : '-'}</td>
                              <td>{asset.serviceWarrantyMonths > 0 ? `${asset.serviceWarrantyMonths}M` : '-'}</td>
                              <td>
                                {asset.warrantyExpiryDate ? (
                                  <span className={isWarrantyExpired(asset.warrantyExpiryDate) ? 'text-danger' : 'text-success'}>
                                    {new Date(asset.warrantyExpiryDate).toLocaleDateString('en-GB')}
                                  </span>
                                ) : '-'}
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
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedAsset(asset);
                                    }}
                                    title="View QR"
                                  >
                                    <i className="fa fa-eye"></i>
                                  </button>
                                  <button 
                                    className="btn btn-sm btn-outline-success"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      downloadQRCode(asset.assetId);
                                    }}
                                    title="Download QR"
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

                    {/* QR Grid Preview - Individual Assets */}
                    <div className="mt-2 p-3 bg-light rounded">
                      <h6 className="mb-3">
                        <i className="fa fa-th me-1"></i>
                        Asset QR Codes Preview
                      </h6>
                      <div className="row">
                        {item.assets?.map((asset, assetIndex) => (
                          <div key={assetIndex} className="col-6 col-md-4 col-lg-3 mb-3">
                            <div className="card text-center p-2 h-100">
                              {qrImageUrls[asset.assetId] ? (
                                <img 
                                  src={qrImageUrls[asset.assetId]} 
                                  alt="QR Code" 
                                  className="mx-auto d-block mb-2"
                                  style={{ width: '100px', height: '100px' }}
                                />
                              ) : (
                                <div 
                                  className="bg-secondary text-white p-3 mb-2 mx-auto d-flex align-items-center justify-content-center" 
                                  style={{ width: '100px', height: '100px' }}
                                >
                                  <i className="fa fa-spinner fa-spin"></i>
                                </div>
                              )}
                              <small className="d-block font-monospace text-truncate" title={asset.assetId} style={{ fontSize: '9px' }}>
                                {asset.assetId}
                              </small>
                              {asset.boxNumber && (
                                <small className="text-muted" style={{ fontSize: '8px' }}>📦 {asset.boxNumber}</small>
                              )}
                              <div className="mt-1">
                                <span className={`badge ${getStatusBadgeClass(asset.status)}`} style={{ fontSize: '8px' }}>
                                  {asset.status}
                                </span>
                              </div>
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

          {/* Selected Asset QR Modal */}
          {selectedAsset && (
            <div className="modal fade show" style={{ display: "flex", alignItems: "center", backgroundColor: "#00000080", zIndex: 9999 }}>
              <div className="modal-dialog">
                <div className="modal-content">
                  <div className="modal-header">
                    <h5 className="modal-title font-monospace">{selectedAsset.assetId}</h5>
                    <button type="button" className="btn-close" onClick={() => setSelectedAsset(null)}></button>
                  </div>
                  <div className="modal-body text-center">
                    {qrImageUrls[selectedAsset.assetId] && (
                      <img 
                        src={qrImageUrls[selectedAsset.assetId]} 
                        alt="QR Code" 
                        className="mx-auto d-block mb-3"
                        style={{ width: '250px', height: '250px' }}
                      />
                    )}
                    <div className="text-start mt-3">
                      <div className="row">
                        <div className="col-6">
                          <p><strong>Brand:</strong> {selectedAsset.brandName}</p>
                          <p><strong>Model:</strong> {selectedAsset.modelNo}</p>
                          <p><strong>Unit:</strong> {selectedAsset.unit}</p>
                        </div>
                        <div className="col-6">
                          <p><strong>QC Number:</strong> {qcData?.qcNumber}</p>
                          <p><strong>GRN Number:</strong> {qcData?.grnNumber}</p>
                          <p><strong>Box:</strong> {selectedAsset.boxNumber || 'Single'}</p>
                        </div>
                      </div>
                      <hr />
                      <div className="row">
                        <div className="col-6">
                          <p className="text-primary">
                            <strong><i className="fa fa-arrow-down me-1"></i>In Date:</strong><br/>
                            {new Date(selectedAsset.inDate).toLocaleDateString('en-GB')}
                          </p>
                        </div>
                        <div className="col-6">
                          <p className="text-danger">
                            <strong><i className="fa fa-arrow-up me-1"></i>Out Date:</strong><br/>
                            {selectedAsset.outDate ? new Date(selectedAsset.outDate).toLocaleDateString('en-GB') : 'Not Dispatched'}
                          </p>
                        </div>
                      </div>
                      {selectedAsset.warrantyExpiryDate && (
                        <p className={isWarrantyExpired(selectedAsset.warrantyExpiryDate) ? 'text-danger' : 'text-success'}>
                          <strong><i className="fa fa-shield me-1"></i>Warranty Expiry:</strong><br/>
                          {new Date(selectedAsset.warrantyExpiryDate).toLocaleDateString('en-GB')}
                          {isWarrantyExpired(selectedAsset.warrantyExpiryDate) && ' (EXPIRED)'}
                        </p>
                      )}
                    </div>
                    <div className="mt-3">
                      <button 
                        className="btn btn-primary"
                        onClick={() => downloadQRCode(selectedAsset.assetId)}
                      >
                        <i className="fa fa-download me-1"></i> Download QR Code
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Selected Box Details Modal */}
          {selectedBox && (
            <div className="modal fade show" style={{ display: "flex", alignItems: "center", backgroundColor: "#00000080", zIndex: 9999 }}>
              <div className="modal-dialog modal-lg">
                <div className="modal-content">
                  <div className="modal-header bg-primary text-white">
                    <h5 className="modal-title">
                      <i className="fa fa-box me-2"></i>
                      {selectedBox.boxNumber} - Contains {selectedBox.assetCount} Items
                    </h5>
                    <button type="button" className="btn-close btn-close-white" onClick={() => setSelectedBox(null)}></button>
                  </div>
                  <div className="modal-body">
                    <div className="text-center mb-3">
                      {qrImageUrls[`BOX-${selectedBox.boxNumber}`] && (
                        <>
                          <img 
                            src={qrImageUrls[`BOX-${selectedBox.boxNumber}`]} 
                            alt="Box QR Code" 
                            className="mx-auto d-block mb-2"
                            style={{ width: '200px', height: '200px', border: '3px solid #1a56db', borderRadius: '12px' }}
                          />
                          <p className="text-muted small">Scan this QR code to view all items in this box</p>
                        </>
                      )}
                    </div>
                    
                    <div className="row mb-3">
                      <div className="col-4">
                        <strong>Brand:</strong> {selectedBox.brandName}
                      </div>
                      <div className="col-4">
                        <strong>Model:</strong> {selectedBox.modelNo}
                      </div>
                      <div className="col-4">
                        <strong>Items:</strong> {selectedBox.assetCount}
                      </div>
                    </div>

                    <h6>Assets in this Box:</h6>
                    <div className="table-responsive">
                      <table className="table table-sm table-bordered">
                        <thead className="table-secondary">
                          <tr>
                            <th>Asset ID</th>
                            <th>In Date</th>
                            <th>Warranty</th>
                            <th>Status</th>
                            <th>QR</th>
                          </tr>
                        </thead>
                        <tbody>
                          {qcData?.items?.flatMap(item => item.assets || [])
                            .filter(asset => asset.boxNumber === selectedBox.boxNumber)
                            .map((asset, idx) => (
                              <tr key={idx}>
                                <td><small className="font-monospace">{asset.assetId}</small></td>
                                <td>{new Date(asset.inDate).toLocaleDateString('en-GB')}</td>
                                <td>
                                  {asset.warrantyExpiryDate ? (
                                    <span className={isWarrantyExpired(asset.warrantyExpiryDate) ? 'text-danger' : 'text-success'}>
                                      {new Date(asset.warrantyExpiryDate).toLocaleDateString('en-GB')}
                                    </span>
                                  ) : 'No Warranty'}
                                </td>
                                <td>
                                  <span className={`badge ${getStatusBadgeClass(asset.status)}`}>
                                    {asset.status}
                                  </span>
                                </td>
                                <td>
                                  <button 
                                    className="btn btn-sm btn-outline-success"
                                    onClick={() => downloadQRCode(asset.assetId)}
                                  >
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
                    <button 
                      className="btn btn-primary"
                      onClick={() => downloadQRCode(selectedBox.boxNumber, 'box')}
                    >
                      <i className="fa fa-download me-1"></i> Download Box QR
                    </button>
                    <button className="btn btn-secondary" onClick={() => setSelectedBox(null)}>Close</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="modal-footer">
            <button type="button" onClick={handleClose} className="btn btn-secondary">
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssetListPopUp;