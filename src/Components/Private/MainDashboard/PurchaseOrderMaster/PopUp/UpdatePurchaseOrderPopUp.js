import { useState, useEffect, useContext } from "react";
import toast from "react-hot-toast";
import { getVendors } from "../../../../../hooks/useVendor";
import { getProducts } from "../../../../../hooks/useProduct";
import { updatePurchaseOrder } from "../../../../../hooks/usePurchaseOrder";
import Select from "react-select";
import { UserContext } from "../../../../../context/UserContext";

const UpdatePurchaseOrderPopUp = ({ handleUpdate, selectedPO, projects }) => {
  const { user } = useContext(UserContext);
  
  const orderDateTime = selectedPO?.orderDate ? new Date(selectedPO.orderDate) : new Date();
  const [orderDate, setOrderDate] = useState(orderDateTime.toISOString().split('T')[0]);
  const [orderTime, setOrderTime] = useState(orderDateTime.toTimeString().slice(0, 5));
  
  const [orderNumber, setOrderNumber] = useState(selectedPO?.orderNumber || "");
  const [transactionType, setTransactionType] = useState(selectedPO?.transactionType || "");
  const [purchaseType, setPurchaseType] = useState(selectedPO?.purchaseType || "");
  const [selectedProject, setSelectedProject] = useState(null);
  const [warehouseLocation, setWarehouseLocation] = useState(selectedPO?.warehouseLocation || "");
  const [remark, setRemark] = useState(selectedPO?.remark || "");
  const [status, setStatus] = useState(selectedPO?.status || "Pending");
  
  const [advancePay, setAdvancePayment] = useState(selectedPO?.paymentTerms?.advance || 0);
  const [payAgainstDelivery, setPayAgainstDelivery] = useState(selectedPO?.paymentTerms?.payAgainstDelivery || 0);
  const [payAfterCompletion, setPayAfterCompletion] = useState(selectedPO?.paymentTerms?.payAfterCompletion || 0);
  const [retention, setRetention] = useState(0);
  const [creditPeriod, setCreditPeriod] = useState(selectedPO?.paymentTerms?.creditPeriod || 0);
  
  const [deliveryDate, setDeliveryDate] = useState(
    selectedPO?.deliveryDate ? new Date(selectedPO.deliveryDate).toISOString().split('T')[0] : ""
  );
  const [materialFollowupDate, setMaterialFollowupDate] = useState(
    selectedPO?.materialFollowupDate ? new Date(selectedPO.materialFollowupDate).toISOString().split('T')[0] : ""
  );
  
  const [deliveryAddress, setDeliveryAddress] = useState(selectedPO?.deliveryAddress || "");
  const [location, setLocation] = useState(selectedPO?.location || "");
  const [termsDocument, setTermsDocument] = useState(null);
  
  // NEW: Toggle state for default address
  const [useDefaultAddress, setUseDefaultAddress] = useState(false);
  
  const [showCreditPopup, setShowCreditPopup] = useState(false);
  const [showPaymentTermsPopup, setShowPaymentTermsPopup] = useState(false);
  
  const [vendors, setVendors] = useState([]);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [vendorSearch, setVendorSearch] = useState("");
  
  const [products, setProducts] = useState([]);
  const [productSearch, setProductSearch] = useState("");
  const [brands, setBrands] = useState([]);
  const [allBrands, setAllBrands] = useState([]);
  
  const [items, setItems] = useState(selectedPO?.items || [{
    brandName: "",
    modelNo: "",
    description: "",
    unit: "",
    baseUOM: "",
    quantity: 1,
    price: 0,
    discountPercent: 0,
    taxPercent: 0,
    netValue: 0
  }]);

  // Default address constants
  const DEFAULT_DELIVERY_ADDRESS = "Office No. - 05, 3rd Floor, Revati Arcade-II, Opposite to Kapil Malhar Society, Baner, Pune - 411045, Maharashtra, India";
  const DEFAULT_LOCATION = "Baner, Pune";

  // NEW: Check if current address matches default
  useEffect(() => {
    if (deliveryAddress === DEFAULT_DELIVERY_ADDRESS && location === DEFAULT_LOCATION) {
      setUseDefaultAddress(true);
    }
  }, []);

  // NEW: Handle toggle change
  const handleToggleDefaultAddress = () => {
    const newToggleState = !useDefaultAddress;
    setUseDefaultAddress(newToggleState);
    
    if (newToggleState) {
      setDeliveryAddress(DEFAULT_DELIVERY_ADDRESS);
      setLocation(DEFAULT_LOCATION);
      toast.success("Default address applied");
    } else {
      setDeliveryAddress("");
      setLocation("");
    }
  };

  useEffect(() => {
    const loadVendors = async () => {
      const data = await getVendors(1, 100, vendorSearch);
      if (data.success) {
        const vendorOptions = data.vendors.map(v => ({
          value: v._id,
          label: `${v.vendorName} - ${v.email}`
        }));
        setVendors(vendorOptions);
        
        if (selectedPO?.vendor?._id) {
          const currentVendor = vendorOptions.find(v => v.value === selectedPO.vendor._id);
          if (currentVendor) {
            setSelectedVendor(currentVendor);
          }
        }
      }
    };
    loadVendors();
  }, [vendorSearch, selectedPO]);

  useEffect(() => {
    const loadInitialData = async () => {
      const savedBrands = localStorage.getItem('productBrands');
      let brandsFromStorage = [];
      
      if (savedBrands) {
        brandsFromStorage = JSON.parse(savedBrands);
        setAllBrands(brandsFromStorage.map(brand => ({ value: brand, label: brand })));
      } else {
        brandsFromStorage = ["Apple", "Samsung", "Sony", "LG", "Microsoft", "Dell"];
        setAllBrands(brandsFromStorage.map(brand => ({ value: brand, label: brand })));
      }
      
      let allProducts = [];
      let currentPage = 1;
      const pageSize = 100;
      let hasMore = true;
      
      try {
        while (hasMore) {
          const data = await getProducts(currentPage, pageSize, "");
          
          if (data.success && data.products && data.products.length > 0) {
            allProducts = [...allProducts, ...data.products];
            
            if (data.products.length < pageSize) {
              hasMore = false;
            } else {
              currentPage++;
            }
          } else {
            hasMore = false;
          }
        }
        
        setProducts(allProducts);
        
        const productBrands = [...new Set(allProducts.map(p => p.brandName).filter(Boolean))];
        const mergedBrands = [...new Set([...brandsFromStorage, ...productBrands])];
        const brandOptions = mergedBrands.map(brand => ({ value: brand, label: brand }));
        setBrands(brandOptions);
        setAllBrands(brandOptions);
      } catch (error) {
        console.error("Error loading products:", error);
        toast.error("Failed to load products");
      }
    };
    
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedPO?.project?._id && projects.length > 0) {
      const currentProject = projects.find(p => p.value === selectedPO.project._id);
      if (currentProject) {
        setSelectedProject(currentProject);
      }
    }
  }, [selectedPO, projects]);

  const calculateNetValue = (item) => {
    const baseAmount = item.quantity * item.price;
    const discountAmount = baseAmount * (item.discountPercent / 100);
    const amountAfterDiscount = baseAmount - discountAmount;
    const taxAmount = amountAfterDiscount * (item.taxPercent / 100);
    return amountAfterDiscount + taxAmount;
  };

  const handleAddItem = () => {
    setItems([...items, {
      brandName: "",
      modelNo: "",
      description: "",
      unit: "",
      baseUOM: "",
      quantity: 1,
      price: 0,
      discountPercent: 0,
      taxPercent: 0,
      netValue: 0
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
      newItems[index].modelNo = "";
      newItems[index].baseUOM = "";
    }
    
    if (field === 'modelNo' && value && newItems[index].brandName) {
      const product = products.find(
        p => p.brandName === newItems[index].brandName && p.model === value
      );
      if (product) {
        newItems[index].baseUOM = product.baseUOM;
        newItems[index].description = product.description || "";
        newItems[index].unit = product.baseUOM; 
      }
    }
    
    newItems[index].netValue = calculateNetValue(newItems[index]);
    setItems(newItems);
  };

  const calculateTotals = () => {
    const totalAmount = items.reduce((sum, item) => {
      const baseAmount = item.quantity * item.price;
      const discountAmount = baseAmount * (item.discountPercent / 100);
      return sum + (baseAmount - discountAmount);
    }, 0);

    const totalTax = items.reduce((sum, item) => {
      const baseAmount = item.quantity * item.price;
      const discountAmount = baseAmount * (item.discountPercent / 100);
      const amountAfterDiscount = baseAmount - discountAmount;
      return sum + (amountAfterDiscount * (item.taxPercent / 100));
    }, 0);

    const grandTotal = totalAmount + totalTax;

    return { 
      totalAmount, 
      totalTax, 
      grandTotal 
    };
  };

  const { totalAmount, totalTax, grandTotal } = calculateTotals();

  useEffect(() => {
    const retentionValue = 100 - (Number(advancePay) + Number(payAgainstDelivery) + Number(payAfterCompletion));
    if (retentionValue >= 0) {
      setRetention(retentionValue);
    } else {
      setRetention(0);
    }
  }, [advancePay, payAgainstDelivery, payAfterCompletion]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedVendor) {
      return toast.error("Please select a vendor");
    }

    for (let item of items) {
      if (item.quantity < 1 || item.price < 0) {
        return toast.error("Please fill all item details correctly");
      }
    }

    const orderDateTime = new Date(`${orderDate}T${orderTime}`);

    const poData = {
      _id: selectedPO._id,
      vendor: selectedVendor.value,
      orderDate: orderDateTime,
      orderNumber,
      transactionType,
      purchaseType,
      project: purchaseType === "Project Purchase" ? selectedProject?.value : undefined,
      warehouseLocation: purchaseType === "Stock" ? warehouseLocation : undefined,
      deliveryAddress,
      location,
      items,
      totalAmount,
      totalTax,
      grandTotal,
      remark,
      paymentTerms: {
        advance: advancePay,
        payAgainstDelivery,
        payAfterCompletion,
        creditPeriod
      },
      deliveryDate: deliveryDate ? new Date(deliveryDate) : undefined,
      materialFollowupDate: materialFollowupDate ? new Date(materialFollowupDate) : undefined,
      status
    };

    if (termsDocument) {
      const formData = new FormData();
      formData.append('file', termsDocument);
      formData.append('poData', JSON.stringify(poData));
      
      toast.loading("Updating Purchase Order...");
      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL}/api/purchaseOrder/upload/${selectedPO._id}`, {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          },
          body: formData
        });
        const data = await response.json();
        toast.dismiss();

        if (data.success) {
          toast.success(data.message);
          handleUpdate();
        } else {
          toast.error(data.error || "Failed to update purchase order");
        }
      } catch (error) {
        toast.dismiss();
        toast.error("Failed to upload document");
      }
    } else {
      toast.loading("Updating Purchase Order...");
      const data = await updatePurchaseOrder(poData);
      toast.dismiss();

      if (data.success) {
        toast.success(data.message);
        handleUpdate();
      } else {
        toast.error(data.error || "Failed to update purchase order");
      }
    }
  };

  return (
    <div className="modal fade show" style={{ display: "flex", alignItems: "center", backgroundColor: "#00000090" }}>
      <div className="modal-dialog modal-xl">
        <div className="modal-content p-3">
          <form onSubmit={handleSubmit}>
            <div className="modal-header pt-0">
              <h5 className="card-title fw-bold">Update Purchase Order</h5>
              <button onClick={handleUpdate} type="button" className="close px-3" style={{ marginLeft: "auto" }}>
                <span aria-hidden="true">&times;</span>
              </button>
            </div>

            <div className="modal-body">
              <div className="row modal_body_height">
                
                <div className="col-12 col-lg-6">
                  <div className="mb-3">
                    <label className="form-label label_text">Vendor Name</label>
                    <Select
                      value={selectedVendor}
                      onChange={setSelectedVendor}
                      onInputChange={setVendorSearch}
                      options={vendors}
                      placeholder="Select Vendor..."
                      isClearable
                      className="react-select-container"
                      classNamePrefix="react-select"
                    />
                  </div>
                </div>

                <div className="col-12 col-lg-3">
                  <div className="mb-3">
                    <label className="form-label label_text">Order Date</label>
                    <input
                      type="date"
                      className="form-control rounded-0"
                      value={orderDate}
                      onChange={(e) => setOrderDate(e.target.value)}
                    />
                  </div>
                </div>

                <div className="col-12 col-lg-3">
                  <div className="mb-3">
                    <label className="form-label label_text">Order Time</label>
                    <input
                      type="time"
                      className="form-control rounded-0"
                      value={orderTime}
                      onChange={(e) => setOrderTime(e.target.value)}
                    />
                  </div>
                </div>

                <div className="col-12 col-lg-6">
                  <div className="mb-3">
                    <label className="form-label label_text">Order Number</label>
                    <input
                      type="text"
                      className="form-control rounded-0"
                      value={orderNumber}
                      onChange={(e) => setOrderNumber(e.target.value)}
                      placeholder="Order Number"
                      readOnly
                    />
                  </div>
                </div>

                <div className="col-12 col-lg-6">
                  <div className="mb-3">
                    <label className="form-label label_text">Transaction Type</label>
                    <select
                      className="form-select rounded-0"
                      value={transactionType}
                      onChange={(e) => setTransactionType(e.target.value)}
                    >
                      <option value="">Select Transaction Type</option>
                      <option value="B2B">B2B</option>
                      <option value="SEZ">SEZ</option>
                      <option value="Import">Import</option>
                      <option value="Asset">Asset</option>
                    </select>
                  </div>
                </div>

                <div className="col-12 col-lg-6">
                  <div className="mb-3">
                    <label className="form-label label_text">Project Purchase / Stock</label>
                    <select
                      className="form-select rounded-0"
                      value={purchaseType}
                      onChange={(e) => setPurchaseType(e.target.value)}
                    >
                      <option value="">Select Type</option>
                      <option value="Project Purchase">Project Purchase</option>
                      <option value="Stock">Stock</option>
                    </select>
                  </div>
                </div>

                <div className="col-12 col-lg-6">
                  <div className="mb-3">
                    <label className="form-label label_text">Status</label>
                    <select
                      className="form-select rounded-0"
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                    >
                      <option value="Pending">Pending</option>
                      <option value="Approved">Approved</option>
                      <option value="Partially Received">Partially Received</option>
                      <option value="Received">Received</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>

                {purchaseType === "Project Purchase" && (
                  <div className="col-12 col-lg-6">
                    <div className="mb-3">
                      <label className="form-label label_text">Project Name</label>
                      <Select
                        value={selectedProject}
                        onChange={setSelectedProject}
                        options={projects}
                        placeholder="Select Project..."
                        isClearable
                      />
                    </div>
                  </div>
                )}

                {purchaseType === "Stock" && (
                  <div className="col-12 col-lg-6">
                    <div className="mb-3">
                      <label className="form-label label_text">Warehouse Location</label>
                      <input
                        type="text"
                        className="form-control rounded-0"
                        value={warehouseLocation}
                        onChange={(e) => setWarehouseLocation(e.target.value)}
                        placeholder="Ex: Baner / Amazon / Mumbai / Bhosari"
                        maxLength={200}
                      />
                    </div>
                  </div>
                )}

                {/* NEW: Toggle Button Section */}
                <div className="col-12 mb-3">
                  <div className="form-check form-switch">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="defaultAddressToggleUpdate"
                      checked={useDefaultAddress}
                      onChange={handleToggleDefaultAddress}
                      style={{ cursor: "pointer" }}
                    />
                    <label className="form-check-label" htmlFor="defaultAddressToggleUpdate" style={{ cursor: "pointer" }}>
                      Use Default Office Address
                    </label>
                  </div>
                </div>

                <div className="col-12 col-lg-6">
                  <div className="mb-3">
                    <label className="form-label label_text">Delivery Address</label>
                    <textarea
                      className="form-control rounded-0"
                      rows="2"
                      value={deliveryAddress}
                      onChange={(e) => {
                        setDeliveryAddress(e.target.value);
                        if (useDefaultAddress && e.target.value !== DEFAULT_DELIVERY_ADDRESS) {
                          setUseDefaultAddress(false);
                        }
                      }}
                      placeholder="Enter delivery address"
                      maxLength={500}
                    />
                  </div>
                </div>

                <div className="col-12 col-lg-6">
                  <div className="mb-3">
                    <label className="form-label label_text">Location</label>
                    <input
                      type="text"
                      className="form-control rounded-0"
                      value={location}
                      onChange={(e) => {
                        setLocation(e.target.value);
                        if (useDefaultAddress && e.target.value !== DEFAULT_LOCATION) {
                          setUseDefaultAddress(false);
                        }
                      }}
                      placeholder="Enter location"
                      maxLength={200}
                    />
                  </div>
                </div>

                <div className="col-12 col-lg-6">
                  <div className="mb-3">
                    <label className="form-label label_text">Terms & Conditions Document</label>
                    <input
                      type="file"
                      className="form-control rounded-0"
                      onChange={(e) => setTermsDocument(e.target.files[0])}
                      accept=".pdf,.doc,.docx"
                    />
                    {selectedPO?.attachments && selectedPO.attachments.length > 0 && (
                      <small className="text-muted">
                        Current document: {selectedPO.attachments[0].split('/').pop()}
                      </small>
                    )}
                  </div>
                </div>

                <div className="col-12 mt-3">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <h6 className="fw-bold">Item Details</h6>
                    <button type="button" className="btn btn-sm btn-primary" onClick={handleAddItem}>
                      <i className="fa fa-plus"></i> Add Item
                    </button>
                  </div>

                  <div className="table-responsive">
                    <table className="table table-bordered">
                      <thead>
                        <tr>
                          <th>Brand Name</th>
                          <th>Model No</th>
                          <th>Description</th>
                          <th>Unit</th>
                          <th>Base UOM</th>
                          <th>Quantity</th>
                          <th>Price (INR/USD)</th>
                          <th>Discount %</th>
                          <th>Tax %</th>
                          <th>Net Value</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((item, index) => {
                          const brandProducts = products.filter(p => p.brandName === item.brandName);
                          const uniqueModels = [...new Set(brandProducts.map(p => p.model).filter(Boolean))];
                          const modelOptions = uniqueModels.map(model => ({ value: model, label: model }));
                          
                          return (
                            <tr key={index}>
                              <td>
                                <Select
                                  value={allBrands.find(b => b.value === item.brandName) || null}
                                  onChange={(selected) => handleItemChange(index, 'brandName', selected ? selected.value : "")}
                                  options={allBrands}
                                  placeholder="Select Brand..."
                                  isClearable
                                  className="react-select-container"
                                  classNamePrefix="react-select"
                                  menuPortalTarget={document.body}
                                  styles={{
                                    menuPortal: base => ({ ...base, zIndex: 9999 }),
                                    container: base => ({ ...base, minWidth: '150px' })
                                  }}
                                />
                              </td>
                              <td>
                                <Select
                                  value={modelOptions.find(m => m.value === item.modelNo) || null}
                                  onChange={(selected) => handleItemChange(index, 'modelNo', selected ? selected.value : "")}
                                  options={modelOptions}
                                  placeholder="Select Model..."
                                  isClearable
                                  className="react-select-container"
                                  classNamePrefix="react-select"
                                  isDisabled={!item.brandName}
                                  menuPortalTarget={document.body}
                                  styles={{
                                    menuPortal: base => ({ ...base, zIndex: 9999 }),
                                    container: base => ({ ...base, minWidth: '150px' })
                                  }}
                                />
                              </td>
                              <td>
                                <textarea
                                  className="form-control form-control-sm"
                                  value={item.description}
                                  onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                                  rows="1"
                                  placeholder="Item description"
                                />
                              </td>
                              <td>
                                <input
                                  type="text"
                                  className="form-control form-control-sm"
                                  value={item.unit}
                                  onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                                />
                              </td>
                              <td>
                                <input
                                  type="text"
                                  className="form-control form-control-sm"
                                  value={item.baseUOM}
                                  onChange={(e) => handleItemChange(index, 'baseUOM', e.target.value)}
                                  placeholder="Base UOM"
                                />
                              </td>
                              <td>
                                <input
                                  type="number"
                                  className="form-control form-control-sm"
                                  value={item.quantity}
                                  onChange={(e) => handleItemChange(index, 'quantity', Number(e.target.value))}
                                  min="1"
                                />
                              </td>
                              <td>
                                <input
                                  type="number"
                                  className="form-control form-control-sm"
                                  value={item.price}
                                  onChange={(e) => handleItemChange(index, 'price', Number(e.target.value))}
                                  min="0"
                                  step="0.01"
                                />
                              </td>
                              <td>
                                <input
                                  type="number"
                                  className="form-control form-control-sm"
                                  value={item.discountPercent}
                                  onChange={(e) => handleItemChange(index, 'discountPercent', Number(e.target.value))}
                                  min="0"
                                  max="100"
                                />
                              </td>
                              <td>
                                <input
                                  type="number"
                                  className="form-control form-control-sm"
                                  value={item.taxPercent}
                                  onChange={(e) => handleItemChange(index, 'taxPercent', Number(e.target.value))}
                                  min="0"
                                  max="100"
                                />
                              </td>
                              <td>
                                <input
                                  type="text"
                                  className="form-control form-control-sm"
                                  value={item.netValue.toFixed(2)}
                                  readOnly
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
                      <tfoot>
                        <tr>
                          <td colSpan="8" className="text-end fw-bold">Total</td>
                          <td className="fw-bold">{totalAmount.toFixed(2)}</td>
                          <td></td>
                        </tr>
                        <tr>
                          <td colSpan="8" className="text-end fw-bold">Tax Amount</td>
                          <td className="fw-bold">{totalTax.toFixed(2)}</td>
                          <td></td>
                        </tr>
                        <tr>
                          <td colSpan="8" className="text-end fw-bold">Grand Total</td>
                          <td className="fw-bold">{grandTotal.toFixed(2)}</td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                <div className="col-12 mt-3">
                  <h6 className="fw-bold">Terms and Conditions</h6>
                  
                  <div className="row">
                    <div className="col-12 col-lg-6">
                      <div className="mb-3">
                        <label className="form-label label_text">Credit Period</label>
                        <div className="input-group">
                          <input
                            type="text"
                            className="form-control rounded-0"
                            value={creditPeriod ? `${creditPeriod} days` : "Click to set credit period"}
                            onClick={() => setShowCreditPopup(true)}
                            readOnly
                            style={{ cursor: "pointer" }}
                          />
                          <button
                            className="btn btn-outline-secondary rounded-0"
                            type="button"
                            onClick={() => setShowCreditPopup(true)}
                          >
                            <i className="fa fa-calendar"></i>
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="col-12 col-lg-6">
                      <div className="mb-3">
                        <label className="form-label label_text">Payment Terms</label>
                        <div className="input-group">
                          <input
                            type="text"
                            className="form-control rounded-0"
                            value={`Advance: ${advancePay}%, Delivery: ${payAgainstDelivery}%, Completion: ${payAfterCompletion}%, Retention: ${retention}%`}
                            onClick={() => setShowPaymentTermsPopup(true)}
                            readOnly
                            style={{ cursor: "pointer" }}
                          />
                          <button
                            className="btn btn-outline-secondary rounded-0"
                            type="button"
                            onClick={() => setShowPaymentTermsPopup(true)}
                          >
                            <i className="fa fa-percent"></i>
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="col-12 col-lg-6">
                      <div className="mb-3"> 
                      <label className="form-label label_text">Delivery Date</label>
                       <input type="date" className="form-control rounded-0" value=   {deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} />
</div> 
</div>

                <div className="col-12 col-lg-6">
                  <div className="mb-3">
                    <label className="form-label label_text">Material Followup Date</label>
                    <input
                      type="date"
                      className="form-control rounded-0"
                      value={materialFollowupDate}
                      onChange={(e) => setMaterialFollowupDate(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="col-12 mt-3">
              <div className="mb-3">
                <label className="form-label label_text">Remark</label>
                <textarea
                  className="form-control rounded-0"
                  rows="3"
                  value={remark}
                  onChange={(e) => setRemark(e.target.value)}
                  maxLength={1000}
                />
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

  {showCreditPopup && (
    <div className="modal fade show" style={{ display: "flex", alignItems: "center", backgroundColor: "#00000090", zIndex: 9999 }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content p-3">
          <div className="modal-header pt-0">
            <h5 className="card-title fw-bold">Set Credit Period</h5>
            <button onClick={() => setShowCreditPopup(false)} type="button" className="close px-3" style={{ marginLeft: "auto" }}>
              <span aria-hidden="true">&times;</span>
            </button>
          </div>
          <div className="modal-body">
            <div className="mb-3">
              <label className="form-label label_text">Credit Period (Days)</label>
              <input
                type="number"
                className="form-control rounded-0"
                value={creditPeriod}
                onChange={(e) => setCreditPeriod(Number(e.target.value))}
                min="0"
              />
            </div>
            <div className="d-flex justify-content-end">
              <button
                type="button"
                className="btn btn-secondary me-2"
                onClick={() => setShowCreditPopup(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setShowCreditPopup(false)}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )}

  {showPaymentTermsPopup && (
    <div className="modal fade show" style={{ display: "flex", alignItems: "center", backgroundColor: "#00000090", zIndex: 9999 }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content p-3">
          <div className="modal-header pt-0">
            <h5 className="card-title fw-bold">Payment Terms</h5>
            <button onClick={() => setShowPaymentTermsPopup(false)} type="button" className="close px-3" style={{ marginLeft: "auto" }}>
              <span aria-hidden="true">&times;</span>
            </button>
          </div>
          <div className="modal-body">
            <div className="mb-3">
              <label className="form-label label_text">Advance Payment (%)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                className="form-control rounded-0"
                value={advancePay}
                onChange={(e) => {
                  const value = e.target.value;
                  if (/^\d*\.?\d*$/.test(value) && Number(value) <= 100) {
                    setAdvancePayment(value);
                  }
                }}
              />
            </div>
            <div className="mb-3">
              <label className="form-label label_text">Pay Against Delivery (%)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                className="form-control rounded-0"
                value={payAgainstDelivery}
                onChange={(e) => {
                  const value = e.target.value;
                  if (/^\d*\.?\d{0,2}$/.test(value) && Number(value) <= 100) {
                    setPayAgainstDelivery(value);
                  }
                }}
              />
            </div>
            <div className="mb-3">
              <label className="form-label label_text">Pay After Completion (%)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                className="form-control rounded-0"
                value={payAfterCompletion}
                onChange={(e) => {
                  const value = e.target.value;
                  if (/^\d*\.?\d{0,2}$/.test(value) && Number(value) <= 100) {
                    setPayAfterCompletion(value);
                  }
                }}
              />
            </div>
            <div className="mb-3">
              <label className="form-label label_text">Retention (%)</label>
              <input
                type="number"
                className="form-control rounded-0"
                value={retention}
                readOnly
                style={{ backgroundColor: '#e9ecef' }}
              />
            </div>
            <div className="d-flex justify-content-end">
              <button
                type="button"
                className="btn btn-secondary me-2"
                onClick={() => setShowPaymentTermsPopup(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setShowPaymentTermsPopup(false)}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )}
</div>
);
};

export default UpdatePurchaseOrderPopUp;