// Components/Private/MainDashboard/QCMaster/PopUp/AddQCPopUp.jsx
import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { RequiredStar } from "../../../RequiredStar/RequiredStar";
import { getProducts } from "../../../../../hooks/useProduct";
import { getGRNNumbers, getGRNByNumber } from "../../../../../hooks/useGRN";
import { createQualityInspection } from "../../../../../hooks/useQC";
import Select from "react-select";

const AddQCPopUp = ({ handleAdd }) => {
  const [qcDate, setQcDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedGRN, setSelectedGRN] = useState(null);
  const [isGRNLoading, setIsGRNLoading] = useState(false);
  const [grnOptions, setGrnOptions] = useState([]);
  const [grnSearch, setGrnSearch] = useState("");
  const [isLoadingGRNs, setIsLoadingGRNs] = useState(true);
  
  const [products, setProducts] = useState([]);
  const [productSearch, setProductSearch] = useState("");
  const [brands, setBrands] = useState([]);
  const [models, setModels] = useState([]);
  
  const [items, setItems] = useState([{
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
  }]);

  // Load GRN numbers for dropdown
  useEffect(() => {
    const loadGRNNumbers = async () => {
      setIsLoadingGRNs(true);
      try {
        const data = await getGRNNumbers();
        
        if (data.success) {
          const options = data.grns.map(grn => ({
            value: grn.grnNumber,
            label: grn.grnNumber,
            id: grn._id
          }));
          setGrnOptions(options);
          
          if (options.length === 0) {
            toast.info("No GRNs found. Please create a GRN first.");
          }
        } else {
          toast.error(data.error || "Failed to load GRN numbers");
        }
      } catch (error) {
        toast.error("Failed to load GRN numbers");
      } finally {
        setIsLoadingGRNs(false);
      }
    };
    loadGRNNumbers();
  }, []);

  // Load products
  useEffect(() => {
    const loadProducts = async () => {
      const data = await getProducts(1, 1000, productSearch);
      if (data.success) {
        setProducts(data.products);
        const uniqueBrands = [...new Set(data.products.map(p => p.brandName).filter(Boolean))];
        setBrands(uniqueBrands.map(brand => ({ value: brand, label: brand })));
      }
    };
    loadProducts();
  }, [productSearch]);

  // Fetch GRN details when GRN is selected
  const handleGRNChange = async (selected) => {
    if (!selected) {
      setSelectedGRN(null);
      setItems([{
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
      }]);
      return;
    }

    setIsGRNLoading(true);
    try {
      const data = await getGRNByNumber(selected.value);
      
      if (data.success) {
        setSelectedGRN(data.grn);
        
        const qcItems = data.grn.items.map(item => ({
          brandName: item.brandName,
          modelNo: item.modelNo,
          receivedQuantity: item.receivedQuantity,
          unit: item.unit,
          baseUOM: item.baseUOM || "",
          qcOkQuantity: 0,
          faultyQuantity: 0,
          remark: "",
          itemsPerBox: 1,
          serviceWarrantyMonths: 0,
        }));
        
        setItems(qcItems);
      } else {
        toast.error(data.error || "GRN not found");
        setSelectedGRN(null);
      }
    } catch (error) {
      toast.error("Failed to fetch GRN details");
    } finally {
      setIsGRNLoading(false);
    }
  };

  // Update models when brand is selected
  useEffect(() => {
    if (items.length > 0) {
      const lastIndex = items.length - 1;
      const currentBrand = items[lastIndex].brandName;
      
      if (currentBrand) {
        const brandProducts = products.filter(p => p.brandName === currentBrand);
        const uniqueModels = [...new Set(brandProducts.map(p => p.model).filter(Boolean))];
        setModels(uniqueModels.map(model => ({ value: model, label: model })));
      } else {
        setModels([]);
      }
    }
  }, [items, products]);

  const handleAddItem = () => {
    setItems([...items, {
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
    }]);
  };

  const handleRemoveItem = (index) => {
    if (items.length > 1) {
      const newItems = items.filter((_, i) => i !== index);
      setItems(newItems);
    }
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    
    if (field === 'brandName') {
      if (value) {
        const brandProducts = products.filter(p => p.brandName === value);
        const uniqueModels = [...new Set(brandProducts.map(p => p.model).filter(Boolean))];
        setModels(uniqueModels.map(model => ({ value: model, label: model })));
      } else {
        setModels([]);
      }
      newItems[index].modelNo = "";
      newItems[index].baseUOM = "";
    }
    
    if (field === 'modelNo' && value && newItems[index].brandName) {
      const product = products.find(
        p => p.brandName === newItems[index].brandName && p.model === value
      );
      if (product) {
        newItems[index].baseUOM = product.baseUOM;
        newItems[index].unit = product.baseUOM;
      }
    }
    
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

  // FIX: Added 'const' here to fix the no-undef error
  const calculateAssetCount = (item) => {
    const qcOk = item.qcOkQuantity || 0;
    const itemsPerBox = item.itemsPerBox || 1;
    return {
      totalAssets: qcOk,
      totalBoxes: Math.ceil(qcOk / itemsPerBox),
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedGRN) {
      return toast.error("Please select a GRN");
    }

    for (let item of items) {
      if (!item.brandName || !item.modelNo || item.receivedQuantity <= 0) {
        return toast.error("Please fill all item details correctly");
      }
      
      const total = item.qcOkQuantity + item.faultyQuantity;
      if (total !== item.receivedQuantity) {
        return toast.error(`QC OK + Faulty must equal received quantity for ${item.brandName} ${item.modelNo}`);
      }

      if (item.itemsPerBox < 1) {
        return toast.error("Items per box must be at least 1");
      }
    }

    const qcData = {
      qcDate: new Date(qcDate),
      grnNumber: selectedGRN.grnNumber,
      items,
    };

    toast.loading("Creating Quality Inspection & Generating Assets...");
    const data = await createQualityInspection(qcData);
    toast.dismiss();

    if (data.success) {
      const totalAssets = data.qualityInspection?.totalAssets || items.reduce((sum, item) => sum + item.qcOkQuantity, 0);
      toast.success(`QC created successfully! ${totalAssets} assets generated with QR codes.`);
      handleAdd();
    } else {
      toast.error(data.error || "Failed to create quality inspection");
    }
  };

  const today = new Date().toISOString().split('T')[0];

  // Warranty period options
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

  return (
    <div className="modal fade show" style={{ display: "flex", alignItems: "center", backgroundColor: "#00000090" }}>
      <div className="modal-dialog modal-xl">
        <div className="modal-content p-3">
          <form onSubmit={handleSubmit}>
            <div className="modal-header pt-0">
              <h5 className="card-title fw-bold">
                Quality Inspection Report
                <span className="badge bg-info ms-2">Assets will be auto-generated</span>
              </h5>
              <button onClick={handleAdd} type="button" className="close px-3" style={{ marginLeft: "auto" }}>
                <span aria-hidden="true">&times;</span>
              </button>
            </div>

            <div className="modal-body">
              <div className="row modal_body_height">
                
                <div className="col-12 col-lg-6">
                  <div className="mb-3">
                    <label className="form-label label_text">GRN No. <RequiredStar /></label>
                    {isLoadingGRNs ? (
                      <div className="text-center">
                        <div className="spinner-border spinner-border-sm text-primary" role="status">
                          <span className="visually-hidden">Loading...</span>
                        </div>
                        <span className="ms-2">Loading GRNs...</span>
                      </div>
                    ) : (
                      <Select
                        value={selectedGRN ? { value: selectedGRN.grnNumber, label: selectedGRN.grnNumber } : null}
                        onChange={handleGRNChange}
                        onInputChange={setGrnSearch}
                        options={grnOptions}
                        placeholder="Select GRN..."
                        isClearable
                        className="react-select-container"
                        classNamePrefix="react-select"
                        required
                        noOptionsMessage={() => "No GRNs found"}
                      />
                    )}
                    {isGRNLoading && <small className="text-muted">Loading GRN details...</small>}
                  </div>
                </div>

                <div className="col-12 col-lg-6">
                  <div className="mb-3">
                    <label className="form-label label_text">QC Date <RequiredStar /></label>
                    <input
                      type="date"
                      className="form-control rounded-0"
                      value={qcDate}
                      onChange={(e) => {
                        const selectedDate = new Date(e.target.value);
                        const currentDate = new Date();
                        currentDate.setHours(0, 0, 0, 0);
                        
                        if (selectedDate <= currentDate) {
                          setQcDate(e.target.value);
                        } else {
                          setQcDate(today);
                          toast.error("Future dates are not allowed");
                        }
                      }}
                      max={today}
                      required
                    />
                  </div>
                </div>

                {selectedGRN && (
                  <div className="col-12 mb-3">
                    <div className="card">
                      <div className="card-header bg-light">
                        <h6 className="mb-0">GRN Information</h6>
                      </div>
                      <div className="card-body">
                        <div className="row">
                          <div className="col-md-4">
                            <p><strong>Vendor:</strong> {selectedGRN.vendor?.vendorName || 'N/A'}</p>
                          </div>
                          <div className="col-md-4">
                            <p><strong>Transaction Type:</strong> {selectedGRN.transactionType || 'N/A'}</p>
                          </div>
                          <div className="col-md-4">
                            <p><strong>Purchase Type:</strong> {selectedGRN.purchaseType || 'N/A'}</p>
                          </div>
                          <div className="col-md-4">
                            <p><strong>GRN Date:</strong> {new Date(selectedGRN.grnDate).toLocaleDateString('en-GB')}</p>
                          </div>
                          <div className="col-md-4">
                            <p><strong>Choice:</strong> {selectedGRN.choice || 'N/A'}</p>
                          </div>
                          {selectedGRN.purchaseOrder && (
                            <div className="col-md-4">
                              <p><strong>PO Number:</strong> {selectedGRN.purchaseOrder?.orderNumber || 'N/A'}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="col-12 mt-3">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <h6 className="fw-bold">Item Details & Asset Configuration</h6>
                    <button type="button" className="btn btn-sm btn-primary" onClick={handleAddItem}>
                      <i className="fa fa-plus"></i> Add Item
                    </button>
                  </div>

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
                          <th>Items/Box</th>
                          <th>Warranty</th>
                          <th>Assets</th>
                          <th>Remark</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((item, index) => {
                          const brandProducts = products.filter(p => p.brandName === item.brandName);
                          const uniqueModels = [...new Set(brandProducts.map(p => p.model).filter(Boolean))];
                          const modelOptions = uniqueModels.map(model => ({ value: model, label: model }));
                          
                          const assetCount = calculateAssetCount(item);

                          return (
                            <tr key={index}>
                              <td>
                                {selectedGRN ? (
                                  <input 
                                    type="text" 
                                    className="form-control form-control-sm" 
                                    value={item.brandName} 
                                    readOnly 
                                  />
                                ) : (
                                  <Select
                                    value={brands.find(b => b.value === item.brandName) || null}
                                    onChange={(selected) => handleItemChange(index, 'brandName', selected ? selected.value : "")}
                                    options={brands}
                                    placeholder="Select Brand..."
                                    isClearable
                                    className="react-select-container"
                                    classNamePrefix="react-select"
                                    required
                                  />
                                )}
                              </td>
                              <td>
                                {selectedGRN ? (
                                  <input 
                                    type="text" 
                                    className="form-control form-control-sm" 
                                    value={item.modelNo} 
                                    readOnly 
                                  />
                                ) : (
                                  <Select
                                    value={modelOptions.find(m => m.value === item.modelNo) || null}
                                    onChange={(selected) => handleItemChange(index, 'modelNo', selected ? selected.value : "")}
                                    options={modelOptions}
                                    placeholder="Select Model..."
                                    isClearable
                                    className="react-select-container"
                                    classNamePrefix="react-select"
                                    isDisabled={!item.brandName}
                                    required
                                  />
                                )}
                              </td>
                              <td>
                                <input
                                  type="number"
                                  className="form-control form-control-sm bg-light"
                                  value={item.receivedQuantity}
                                  onChange={(e) => handleItemChange(index, 'receivedQuantity', Number(e.target.value))}
                                  min="1"
                                  placeholder="0"
                                  readOnly={!!selectedGRN}
                                  required
                                />
                              </td>
                              <td>
                                <input
                                  type="text"
                                  className="form-control form-control-sm"
                                  value={item.unit}
                                  onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                                  readOnly={!!selectedGRN}
                                  required
                                />
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
                                  type="number"
                                  className="form-control form-control-sm"
                                  value={item.itemsPerBox}
                                  onChange={(e) => handleItemChange(index, 'itemsPerBox', Math.max(1, Number(e.target.value)))}
                                  min="1"
                                  title="Number of items per box/carton"
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
                                <div className="small">
                                  <div className="badge bg-primary mb-1">
                                    {assetCount.totalAssets} Assets
                                  </div>
                                  {assetCount.totalBoxes > 1 && (
                                    <div className="badge bg-info">
                                      {assetCount.totalBoxes} Boxes
                                    </div>
                                  )}
                                </div>
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
                              <td>
                                <button
                                  type="button"
                                  className="btn btn-sm btn-danger"
                                  onClick={() => handleRemoveItem(index)}
                                  disabled={items.length === 1}
                                >
                                  <i className="fa fa-trash"></i>
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Asset Summary */}
                  <div className="row mt-3">
                    <div className="col-12">
                      <div className="alert alert-info mb-0">
                        <h6 className="alert-heading">
                          <i className="fa fa-qrcode me-2"></i>
                          Asset Generation Summary
                        </h6>
                        <div className="row">
                          <div className="col-md-4">
                            <strong>Total QC OK Items:</strong> {items.reduce((sum, item) => sum + (item.qcOkQuantity || 0), 0)}
                          </div>
                          <div className="col-md-4">
                            <strong>Total Assets (QR Codes):</strong> {items.reduce((sum, item) => sum + (item.qcOkQuantity || 0), 0)}
                          </div>
                          <div className="col-md-4">
                            <strong>Total Boxes:</strong> {items.reduce((sum, item) => sum + Math.ceil((item.qcOkQuantity || 0) / (item.itemsPerBox || 1)), 0)}
                          </div>
                        </div>
                        <hr className="my-2"/>
                        <small className="mb-0">
                          Each asset will have a unique QR code. QR code contains: Asset ID, Material Info, In-Date, Warranty Details, Box Number (if multiple per box).
                        </small>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="col-12 pt-3 mt-2">
                  <button type="submit" className="w-80 btn addbtn rounded-0 add_button m-2 px-4">
                    <i className="fa fa-check me-2"></i>Create QC & Generate Assets
                  </button>
                  <button type="button" onClick={handleAdd} className="w-80 btn addbtn rounded-0 Cancel_button m-2 px-4">
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

export default AddQCPopUp;