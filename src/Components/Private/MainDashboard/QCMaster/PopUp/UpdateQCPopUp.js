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
    assets: [],
  }]);

  const [expandedAssetItem, setExpandedAssetItem] = useState(null);

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
        assets: item.assets, // Preserve existing assets
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

  // Warranty options
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
                          <th>Warranty</th>
                          <th>Assets</th>
                          <th>Remark</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((item, index) => (
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
                                <td colSpan="9" className="p-0">
                                  <div className="bg-light p-3">
                                    <h6 className="mb-3">
                                      <i className="fa fa-qrcode me-2"></i>
                                      Assets for {item.brandName} - {item.modelNo}
                                    </h6>
                                    <div className="table-responsive">
                                      <table className="table table-sm table-bordered mb-0">
                                        <thead className="table-secondary">
                                          <tr>
                                            <th>Asset ID</th>
                                            <th>Box No.</th>
                                            <th>In Date</th>
                                            <th>Out Date</th>
                                            <th>Warranty</th>
                                            <th>Warranty Expiry</th>
                                            <th>Status</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {item.assets.map((asset, assetIndex) => (
                                            <tr key={assetIndex}>
                                              <td>
                                                <small className="font-monospace">{asset.assetId}</small>
                                              </td>
                                              <td>{asset.boxNumber || '-'}</td>
                                              <td>{new Date(asset.inDate).toLocaleDateString('en-GB')}</td>
                                              <td>{asset.outDate ? new Date(asset.outDate).toLocaleDateString('en-GB') : '-'}</td>
                                              <td>{asset.serviceWarrantyMonths > 0 ? `${asset.serviceWarrantyMonths} months` : 'No Warranty'}</td>
                                              <td>
                                                {asset.warrantyExpiryDate ? (
                                                  <span className={new Date() > new Date(asset.warrantyExpiryDate) ? 'text-danger' : 'text-success'}>
                                                    {new Date(asset.warrantyExpiryDate).toLocaleDateString('en-GB')}
                                                  </span>
                                                ) : '-'}
                                              </td>
                                              <td>
                                                <span className={`badge ${getStatusBadgeClass(asset.status)}`}>
                                                  {asset.status}
                                                </span>
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </>
                        ))}
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