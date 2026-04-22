// Components/Private/MainDashboard/QCMaster/PopUp/UpdateQCPopUp.jsx
import { useState } from "react";
import toast from "react-hot-toast";
import { RequiredStar } from "../../../RequiredStar/RequiredStar";
import { updateQualityInspection } from "../../../../../hooks/useQC";

const UpdateQCPopUp = ({ handleUpdate, selectedQC }) => {
  const qcDateTime = selectedQC?.qcDate ? new Date(selectedQC.qcDate) : new Date();
  const [qcDate, setQcDate] = useState(qcDateTime.toISOString().split('T')[0]);
  const [qcNumber, setQcNumber] = useState(selectedQC?.qcNumber || "");
  const [grnNumber, setGrnNumber] = useState(selectedQC?.grnNumber || "");
  const [status, setStatus] = useState(selectedQC?.status || "Pending");
  
  const [items, setItems] = useState(selectedQC?.items?.map(item => ({
    ...item,
    itemsPerBox: item.itemsPerBox || 1,
    serviceWarrantyMonths: item.serviceWarrantyMonths || 0,
    assets: item.assets || [],
    outDate: item.outDate ? new Date(item.outDate).toISOString().split('T')[0] : "",
  })) || [{
    brandName: "",
    modelNo: "",
    receivedQuantity: 0,
    unit: "",
    baseUOM: "",
    qcOkQuantity: 0,
    faultyQuantity: 0,
    remark: "",
    itemsPerBox: 1,
    serviceWarrantyMonths: 0,
    outDate: "",
    assets: [],
  }]);

  const [expandedAssetItem, setExpandedAssetItem] = useState(null);

  // Calculate stock counts for an item
  const getStockCounts = (item) => {
    const assets = item.assets || [];
    const totalIn = assets.length;
    const totalOut = assets.filter(a => a.outDate).length;
    const inWarehouse = assets.filter(a => a.status === 'In Warehouse').length;
    const dispatched = assets.filter(a => a.status === 'Dispatched').length;
    const inService = assets.filter(a => a.status === 'In Service').length;
    const damaged = assets.filter(a => a.status === 'Damaged').length;
    const warrantyExpired = assets.filter(a => a.status === 'Warranty Expired').length;
    
    return { totalIn, totalOut, inWarehouse, dispatched, inService, damaged, warrantyExpired };
  };

  // Get overall stock counts
  const getOverallStockCounts = () => {
    let totalIn = 0, totalOut = 0, inWarehouse = 0, dispatched = 0, inService = 0, damaged = 0, warrantyExpired = 0;
    items.forEach(item => {
      const counts = getStockCounts(item);
      totalIn += counts.totalIn;
      totalOut += counts.totalOut;
      inWarehouse += counts.inWarehouse;
      dispatched += counts.dispatched;
      inService += counts.inService;
      damaged += counts.damaged;
      warrantyExpired += counts.warrantyExpired;
    });
    return { totalIn, totalOut, inWarehouse, dispatched, inService, damaged, warrantyExpired };
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    
    if (field === 'qcOkQuantity') {
      const qcOk = Number(value) || 0;
      const received = newItems[index].receivedQuantity;
      newItems[index].faultyQuantity = Math.max(0, received - qcOk);
    }
    
    if (field === 'faultyQuantity') {
      const faulty = Number(value) || 0;
      const received = newItems[index].receivedQuantity;
      newItems[index].qcOkQuantity = Math.max(0, received - faulty);
    }
    
    setItems(newItems);
  };

  const toggleAssetExpansion = (index) => {
    setExpandedAssetItem(expandedAssetItem === index ? null : index);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    for (let item of items) {
      const total = item.qcOkQuantity + item.faultyQuantity;
      if (total !== item.receivedQuantity) {
        return toast.error(`QC OK + Faulty must equal received quantity for ${item.brandName} ${item.modelNo}`);
      }
    }

    const qcData = {
      _id: selectedQC._id,
      qcDate: new Date(qcDate),
      qcNumber,
      items: items.map(item => ({
        brandName: item.brandName,
        modelNo: item.modelNo,
        receivedQuantity: item.receivedQuantity,
        unit: item.unit,
        baseUOM: item.baseUOM,
        qcOkQuantity: item.qcOkQuantity,
        faultyQuantity: item.faultyQuantity,
        remark: item.remark,
        itemsPerBox: item.itemsPerBox,
        serviceWarrantyMonths: item.serviceWarrantyMonths,
        outDate: item.outDate || null,
        assets: item.assets,
      })),
      status
    };

    toast.loading("Updating Quality Inspection...");
    const data = await updateQualityInspection(qcData);
    toast.dismiss();

    if (data.success) {
      toast.success(data.message);
      handleUpdate();
    } else {
      toast.error(data.error || "Failed to update quality inspection");
    }
  };

  const warrantyOptions = [
    { value: 0, label: "No Warranty" },
    { value: 1, label: "1 Month" },
    { value: 3, label: "3 Months" },
    { value: 6, label: "6 Months" },
    { value: 12, label: "1 Year" },
    { value: 18, label: "18 Months" },
    { value: 24, label: "2 Years" },
    { value: 36, label: "3 Years" },
    { value: 48, label: "4 Years" },
    { value: 60, label: "5 Years" },
  ];

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

  const overallStock = getOverallStockCounts();

  const fmt = (d) => d ? new Date(d).toLocaleDateString('en-GB') : '-';

  return (
    <div className="modal fade show" style={{ display: "flex", alignItems: "center", backgroundColor: "#00000090" }}>
      <div className="modal-dialog modal-xl modal-dialog-scrollable">
        <div className="modal-content p-3">
          <form onSubmit={handleSubmit}>
            <div className="modal-header pt-0">
              <h5 className="card-title fw-bold">Update Quality Inspection Report</h5>
              <button onClick={handleUpdate} type="button" className="close px-3" style={{ marginLeft: "auto" }}>
                <span aria-hidden="true">&times;</span>
              </button>
            </div>

            <div className="modal-body">
              <div className="row modal_body_height">
                
                <div className="col-12 col-lg-3">
                  <div className="mb-3">
                    <label className="form-label label_text">QC Number <RequiredStar /></label>
                    <input type="text" className="form-control rounded-0" value={qcNumber} readOnly />
                  </div>
                </div>

                <div className="col-12 col-lg-3">
                  <div className="mb-3">
                    <label className="form-label label_text">GRN Number <RequiredStar /></label>
                    <input type="text" className="form-control rounded-0" value={grnNumber} readOnly />
                  </div>
                </div>

                <div className="col-12 col-lg-3">
                  <div className="mb-3">
                    <label className="form-label label_text">QC Date <RequiredStar /></label>
                    <input type="date" className="form-control rounded-0" value={qcDate} onChange={(e) => setQcDate(e.target.value)} required />
                  </div>
                </div>

                <div className="col-12 col-lg-3">
                  <div className="mb-3">
                    <label className="form-label label_text">Status <RequiredStar /></label>
                    <select className="form-select rounded-0" value={status} onChange={(e) => setStatus(e.target.value)} required>
                      <option value="Pending">Pending</option>
                      <option value="Completed">Completed</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>

                {/* Warehouse Stock Summary */}
                <div className="col-12 mt-2 mb-3">
                  <div className="card border-0 shadow-sm">
                    <div className="card-header bg-dark text-white py-2">
                      <h6 className="mb-0">
                        <i className="fa fa-warehouse me-2"></i>
                        Warehouse Stock Summary
                      </h6>
                    </div>
                    <div className="card-body py-3">
                      <div className="row g-3">
                        <div className="col-6 col-md-2">
                          <div className="text-center p-2 rounded" style={{ background: "#f8fafc" }}>
                            <div style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                              <i className="fa fa-arrow-down me-1 text-primary"></i>Total In
                            </div>
                            <div className="fw-bold fs-5 text-primary">{overallStock.totalIn}</div>
                            <small className="text-muted">QC OK Items</small>
                          </div>
                        </div>
                        <div className="col-6 col-md-2">
                          <div className="text-center p-2 rounded" style={{ background: "#f0fdf4" }}>
                            <div style={{ fontSize: 11, fontWeight: 600, color: "#86efac", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                              <i className="fa fa-box me-1 text-success"></i>In Stock
                            </div>
                            <div className="fw-bold fs-5 text-success">{overallStock.inWarehouse}</div>
                            <small className="text-muted">In Warehouse</small>
                          </div>
                        </div>
                        <div className="col-6 col-md-2">
                          <div className="text-center p-2 rounded" style={{ background: "#e0f2fe" }}>
                            <div style={{ fontSize: 11, fontWeight: 600, color: "#7dd3fc", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                              <i className="fa fa-truck me-1 text-info"></i>Dispatched
                            </div>
                            <div className="fw-bold fs-5 text-info">{overallStock.dispatched}</div>
                            <small className="text-muted">Out of Warehouse</small>
                          </div>
                        </div>
                        <div className="col-6 col-md-2">
                          <div className="text-center p-2 rounded" style={{ background: "#ecfdf5" }}>
                            <div style={{ fontSize: 11, fontWeight: 600, color: "#6ee7b7", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                              <i className="fa fa-cog me-1" style={{ color: "#059669" }}></i>In Service
                            </div>
                            <div className="fw-bold fs-5" style={{ color: "#059669" }}>{overallStock.inService}</div>
                            <small className="text-muted">At Customer</small>
                          </div>
                        </div>
                        <div className="col-6 col-md-2">
                          <div className="text-center p-2 rounded" style={{ background: "#fff7ed" }}>
                            <div style={{ fontSize: 11, fontWeight: 600, color: "#fdba74", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                              <i className="fa fa-exclamation-triangle me-1 text-warning"></i>Warranty Exp
                            </div>
                            <div className="fw-bold fs-5 text-warning">{overallStock.warrantyExpired}</div>
                            <small className="text-muted">Expired</small>
                          </div>
                        </div>
                        <div className="col-6 col-md-2">
                          <div className="text-center p-2 rounded" style={{ background: "#fef2f2" }}>
                            <div style={{ fontSize: 11, fontWeight: 600, color: "#fca5a5", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                              <i className="fa fa-times-circle me-1 text-danger"></i>Damaged
                            </div>
                            <div className="fw-bold fs-5 text-danger">{overallStock.damaged}</div>
                            <small className="text-muted">Damaged</small>
                          </div>
                        </div>
                      </div>
                      
                      {/* Stock Bar */}
                      <div className="mt-3">
                        <div className="d-flex align-items-center gap-2 mb-1">
                          <small className="text-muted fw-bold">Stock Level:</small>
                          <small className="text-muted">
                            {overallStock.inWarehouse} In Stock / {overallStock.totalIn} Total
                          </small>
                        </div>
                        <div className="progress" style={{ height: 8, borderRadius: 4 }}>
                          <div 
                            className="progress-bar bg-success" 
                            style={{ width: `${overallStock.totalIn > 0 ? (overallStock.inWarehouse / overallStock.totalIn * 100) : 0}%` }}
                            title="In Warehouse"
                          ></div>
                          <div 
                            className="progress-bar bg-info" 
                            style={{ width: `${overallStock.totalIn > 0 ? (overallStock.dispatched / overallStock.totalIn * 100) : 0}%` }}
                            title="Dispatched"
                          ></div>
                          <div 
                            className="progress-bar" 
                            style={{ width: `${overallStock.totalIn > 0 ? (overallStock.inService / overallStock.totalIn * 100) : 0}%`, backgroundColor: "#059669" }}
                            title="In Service"
                          ></div>
                          <div 
                            className="progress-bar bg-warning" 
                            style={{ width: `${overallStock.totalIn > 0 ? (overallStock.warrantyExpired / overallStock.totalIn * 100) : 0}%` }}
                            title="Warranty Expired"
                          ></div>
                          <div 
                            className="progress-bar bg-danger" 
                            style={{ width: `${overallStock.totalIn > 0 ? (overallStock.damaged / overallStock.totalIn * 100) : 0}%` }}
                            title="Damaged"
                          ></div>
                        </div>
                        <div className="d-flex gap-3 mt-1" style={{ fontSize: 10 }}>
                          <span><span className="d-inline-block rounded" style={{ width: 8, height: 8, background: "#198754", marginRight: 4 }}></span>In Stock</span>
                          <span><span className="d-inline-block rounded" style={{ width: 8, height: 8, background: "#0dcaf0", marginRight: 4 }}></span>Dispatched</span>
                          <span><span className="d-inline-block rounded" style={{ width: 8, height: 8, background: "#059669", marginRight: 4 }}></span>In Service</span>
                          <span><span className="d-inline-block rounded" style={{ width: 8, height: 8, background: "#ffc107", marginRight: 4 }}></span>Warranty Exp</span>
                          <span><span className="d-inline-block rounded" style={{ width: 8, height: 8, background: "#dc3545", marginRight: 4 }}></span>Damaged</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="col-12 mt-3">
                  <div className="table-responsive">
                    <table className="table table-bordered table-sm">
                      <thead className="table-light">
                        <tr>
                          <th>Brand Name</th>
                          <th>Model no</th>
                          <th>GRN QTY</th>
                          <th>Unit</th>
                          <th>QC OK qty</th>
                          <th>Faulty qty</th>
                          <th>In Date</th>
                          <th>Out Date</th>
                          <th>Stock</th>
                          <th>Warranty</th>
                          <th>Assets</th>
                          <th>Remark</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((item, index) => {
                          const stock = getStockCounts(item);
                          
                          return (
                            <>
                              <tr key={index}>
                                <td>
                                  <input type="text" className="form-control form-control-sm" value={item.brandName} readOnly />
                                </td>
                                <td>
                                  <input type="text" className="form-control form-control-sm" value={item.modelNo} readOnly />
                                </td>
                                <td>
                                  <input type="number" className="form-control form-control-sm bg-light" value={item.receivedQuantity} readOnly />
                                </td>
                                <td>
                                  <input type="text" className="form-control form-control-sm" value={item.unit} readOnly />
                                </td>
                                <td>
                                  <input
                                    type="number"
                                    className="form-control form-control-sm bg-success bg-opacity-10"
                                    value={item.qcOkQuantity}
                                    onChange={(e) => handleItemChange(index, 'qcOkQuantity', Number(e.target.value))}
                                    min="0"
                                    max={item.receivedQuantity}
                                    required
                                  />
                                </td>
                                <td>
                                  <input
                                    type="number"
                                    className="form-control form-control-sm bg-warning bg-opacity-25"
                                    value={item.faultyQuantity}
                                    onChange={(e) => handleItemChange(index, 'faultyQuantity', Number(e.target.value))}
                                    min="0"
                                    max={item.receivedQuantity}
                                  />
                                </td>
                                <td>
                                  <input 
                                    type="date" 
                                    className="form-control form-control-sm bg-primary bg-opacity-10" 
                                    value={qcDate} 
                                    readOnly 
                                    title="Material In Date (QC Date)"
                                  />
                                </td>
                                <td>
                                  <input 
                                    type="date" 
                                    className={`form-control form-control-sm ${item.outDate ? 'bg-info bg-opacity-10' : 'bg-light'}`} 
                                    value={item.outDate}
                                    onChange={(e) => handleItemChange(index, 'outDate', e.target.value)}
                                    title="Set Out Date to dispatch material from warehouse"
                                  />
                                </td>
                                <td className="text-center">
                                  <div className="d-flex flex-column gap-1" style={{ minWidth: 80 }}>
                                    <span className="badge bg-success" title="In Warehouse">
                                      <i className="fa fa-box me-1"></i>{stock.inWarehouse}
                                    </span>
                                    <span className="badge bg-info" title="Dispatched">
                                      <i className="fa fa-truck me-1"></i>{stock.dispatched}
                                    </span>
                                  </div>
                                </td>
                                <td>
                                  <select
                                    className="form-select form-select-sm"
                                    value={item.serviceWarrantyMonths}
                                    onChange={(e) => handleItemChange(index, 'serviceWarrantyMonths', Number(e.target.value))}
                                  >
                                    {warrantyOptions.map(opt => (
                                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                  </select>
                                </td>
                                <td className="text-center">
                                  {item.assets && item.assets.length > 0 ? (
                                    <button
                                      type="button"
                                      className="btn btn-sm btn-outline-primary"
                                      onClick={() => toggleAssetExpansion(index)}
                                    >
                                      <i className={`fa ${expandedAssetItem === index ? 'fa-chevron-up' : 'fa-chevron-down'} me-1`}></i>
                                      {item.assets.length}
                                    </button>
                                  ) : (
                                    <span className="text-muted">0</span>
                                  )}
                                </td>
                                <td>
                                  <textarea
                                    className="form-control form-control-sm"
                                    value={item.remark}
                                    onChange={(e) => handleItemChange(index, 'remark', e.target.value)}
                                    rows="1"
                                    maxLength={500}
                                    placeholder="Remark"
                                  />
                                </td>
                              </tr>
                              
                              {/* Expanded Asset View */}
                              {expandedAssetItem === index && item.assets && item.assets.length > 0 && (
                                <tr key={`assets-${index}`}>
                                  <td colSpan="12" className="p-0">
                                    <div className="bg-light p-3">
                                      <div className="d-flex justify-content-between align-items-center mb-3">
                                        <h6 className="mb-0">
                                          <i className="fa fa-qrcode me-2"></i>
                                          Assets for {item.brandName} - {item.modelNo}
                                        </h6>
                                        <div className="d-flex gap-2">
                                          <span className="badge bg-primary"><i className="fa fa-box me-1"></i>In Stock: {stock.inWarehouse}</span>
                                          <span className="badge bg-info"><i className="fa fa-truck me-1"></i>Dispatched: {stock.dispatched}</span>
                                          <span className="badge bg-secondary">Total: {stock.totalIn}</span>
                                        </div>
                                      </div>
                                      <div className="table-responsive">
                                        <table className="table table-sm table-bordered mb-0">
                                          <thead className="table-secondary">
                                            <tr>
                                              <th>Asset ID</th>
                                              <th>Box No.</th>
                                              <th>
                                                <i className="fa fa-arrow-down text-primary me-1"></i>In Date
                                              </th>
                                              <th>
                                                <i className="fa fa-arrow-up text-info me-1"></i>Out Date
                                              </th>
                                              <th>Days in Warehouse</th>
                                              <th>Warranty</th>
                                              <th>Warranty Expiry</th>
                                              <th>Status</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {item.assets.map((asset, assetIndex) => {
                                              const inDate = new Date(asset.inDate);
                                              const outDate = asset.outDate ? new Date(asset.outDate) : null;
                                              const daysInWarehouse = outDate 
                                                ? Math.ceil((outDate - inDate) / (1000 * 60 * 60 * 24))
                                                : Math.ceil((new Date() - inDate) / (1000 * 60 * 60 * 24));
                                              
                                              return (
                                                <tr key={assetIndex} className={asset.status === 'In Warehouse' ? '' : 'table-secondary'}>
                                                  <td>
                                                    <small className="font-monospace">{asset.assetId}</small>
                                                  </td>
                                                  <td>{asset.boxNumber || '-'}</td>
                                                  <td>
                                                    <span className="text-primary fw-bold">
                                                      {fmt(asset.inDate)}
                                                    </span>
                                                  </td>
                                                  <td>
                                                    {asset.outDate ? (
                                                      <span className="text-info fw-bold">
                                                        {fmt(asset.outDate)}
                                                      </span>
                                                    ) : (
                                                      <span className="text-muted">-</span>
                                                    )}
                                                  </td>
                                                  <td>
                                                    <span className={`badge ${daysInWarehouse > 30 ? 'bg-warning' : 'bg-light text-dark'}`}>
                                                      {daysInWarehouse} days
                                                    </span>
                                                  </td>
                                                  <td>{asset.serviceWarrantyMonths > 0 ? `${asset.serviceWarrantyMonths} months` : 'No Warranty'}</td>
                                                  <td>
                                                    {asset.warrantyExpiryDate ? (
                                                      <span className={new Date() > new Date(asset.warrantyExpiryDate) ? 'text-danger' : 'text-success'}>
                                                        {fmt(asset.warrantyExpiryDate)}
                                                      </span>
                                                    ) : '-'}
                                                  </td>
                                                  <td>
                                                    <span className={`badge ${getStatusBadgeClass(asset.status)}`}>
                                                      {asset.status}
                                                    </span>
                                                  </td>
                                                </tr>
                                              );
                                            })}
                                          </tbody>
                                          <tfoot className="table-light">
                                            <tr>
                                              <td colSpan="2"><strong>Total Assets:</strong></td>
                                              <td colSpan="6"></td>
                                              <td>
                                                <strong>{stock.totalIn}</strong>
                                              </td>
                                            </tr>
                                          </tfoot>
                                        </table>
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="col-12 pt-3 mt-2">
                  <button type="submit" className="w-80 btn addbtn rounded-0 add_button m-2 px-4">
                    Update
                  </button>
                  <button type="button" onClick={handleUpdate} className="w-80 btn addbtn rounded-0 Cancel_button m-2 px-4">
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

export default UpdateQCPopUp;