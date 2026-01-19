import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { RequiredStar } from "../../../RequiredStar/RequiredStar";
import { getVendors } from "../../../../../hooks/useVendor";
import { getProducts } from "../../../../../hooks/useProduct";
import { getPurchaseOrders } from "../../../../../hooks/usePurchaseOrder";
import { createGRN } from "../../../../../hooks/useGRN";
import axios from "axios";
import Select from "react-select";

const AddGRNPopUp = ({ handleAdd, projects }) => {
  const [grnDate, setGrnDate] = useState(new Date().toISOString().split('T')[0]);
  const [choice, setChoice] = useState("");
  const [selectedPO, setSelectedPO] = useState(null);
  const [transactionType, setTransactionType] = useState("");
  const [purchaseType, setPurchaseType] = useState("");
  const [selectedProject, setSelectedProject] = useState(null);
  const [warehouseLocation, setWarehouseLocation] = useState("");
  const [remark, setRemark] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [location, setLocation] = useState("");
  const [termsDocument, setTermsDocument] = useState(null);
  const [uploading, setUploading] = useState(false);
  
  const [vendors, setVendors] = useState([]);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [vendorSearch, setVendorSearch] = useState("");
  
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [poSearch, setPoSearch] = useState("");
  const [filteredPOs, setFilteredPOs] = useState([]);
  
  const [products, setProducts] = useState([]);
  const [productSearch, setProductSearch] = useState("");
  const [brands, setBrands] = useState([]);
  const [models, setModels] = useState([]);
  
  const [items, setItems] = useState([{
    brandName: "",
    modelNo: "",
    description: "",
    unit: "",
    baseUOM: "",
    orderedQuantity: 0,
    receivedQuantity: 0,
    price: 0,
    discountPercent: 0,
    taxPercent: 0,
    netValue: 0
  }]);

  // Load vendors
  useEffect(() => {
    const loadVendors = async () => {
      const data = await getVendors(1, 100, vendorSearch);
      if (data.success) {
        const vendorOptions = data.vendors.map(v => ({
          value: v._id,
          label: `${v.vendorName} - ${v.email}`
        }));
        setVendors(vendorOptions);
      }
    };
    loadVendors();
  }, [vendorSearch]);

  // Load all purchase orders with filtering for incomplete POs
  useEffect(() => {
    const loadPurchaseOrders = async () => {
      const data = await getPurchaseOrders(1, 100, poSearch);
      if (data.success) {
        // Filter out completed POs
        const incompletePOs = [];
        
        for (const po of data.purchaseOrders) {
          // Check if this PO is fully received
          let isFullyReceived = false;
          
          // Check if the PO status is already marked as "Received"
          if (po.status === 'Received') {
            isFullyReceived = true;
          } else {
            // Calculate if all items are fully received
            let allItemsReceived = true;
            
            for (const item of po.items) {
              // Get total received quantity for this item from all GRNs
              const totalReceived = item.receivedQuantity || 0;
              
              if (totalReceived < item.quantity) {
                allItemsReceived = false;
                break;
              }
            }
            
            isFullyReceived = allItemsReceived;
          }
          
          // Only include POs that are not fully received
          if (!isFullyReceived) {
            incompletePOs.push({
              value: po._id,
              label: `${po.orderNumber} - ${po.vendor?.vendorName}`,
              po: po,
              vendorId: po.vendor?._id
            });
          }
        }
        
        setPurchaseOrders(incompletePOs);
      }
    };
    if (choice === "Against PO") {
      loadPurchaseOrders();
    }
  }, [poSearch, choice]);

  // Filter POs based on selected vendor
  useEffect(() => {
    if (selectedVendor) {
      const filtered = purchaseOrders.filter(po => po.vendorId === selectedVendor.value);
      setFilteredPOs(filtered);
      
      // Clear selected PO if it doesn't belong to the selected vendor
      if (selectedPO && selectedPO.vendorId !== selectedVendor.value) {
        setSelectedPO(null);
      }
    } else {
      setFilteredPOs([]);
    }
  }, [selectedVendor, purchaseOrders]);

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
    if (choice === "Direct Material") {
      loadProducts();
    }
  }, [productSearch, choice]);

  // Handle vendor change
  const handleVendorChange = (selected) => {
    setSelectedVendor(selected);
    // Clear selected PO when vendor changes
    setSelectedPO(null);
    
    // Reset form fields that depend on PO
    setTransactionType("");
    setPurchaseType("");
    setSelectedProject(null);
    setWarehouseLocation("");
    setDeliveryAddress("");
    setLocation("");
    setItems([{
      brandName: "",
      modelNo: "",
      description: "",
      unit: "",
      baseUOM: "",
      orderedQuantity: 0,
      receivedQuantity: 0,
      price: 0,
      discountPercent: 0,
      taxPercent: 0,
      netValue: 0
    }]);
  };

  // Handle PO Selection
  const handlePOChange = (selected) => {
    setSelectedPO(selected);
    if (selected && selected.po) {
      const po = selected.po;
      setTransactionType(po.transactionType);
      setPurchaseType(po.purchaseType);
      setDeliveryAddress(po.deliveryAddress || "");
      setLocation(po.location || "");
      setWarehouseLocation(po.warehouseLocation || "");
      
      if (po.project) {
        setSelectedProject(projects.find(p => p.value === po.project._id));
      }
      
      // Map PO items to GRN items
      const grnItems = po.items.map(item => {
        // Calculate how much has already been received and how much is remaining
        const alreadyReceived = item.receivedQuantity || 0;
        const remainingQuantity = item.quantity - alreadyReceived;
        
        return {
          brandName: item.brandName,
          modelNo: item.modelNo,
          description: item.description || "",
          unit: item.unit || item.baseUOM,
          baseUOM: item.baseUOM || "",
          orderedQuantity: item.quantity, // Always show the original ordered quantity
          receivedQuantity: remainingQuantity, // Default to remaining quantity
          price: item.price,
          discountPercent: item.discountPercent,
          taxPercent: item.taxPercent,
          netValue: calculateNetValue({
            receivedQuantity: remainingQuantity, // Use remaining quantity for calculation
            price: item.price,
            discountPercent: item.discountPercent,
            taxPercent: item.taxPercent
          })
        };
      });
      setItems(grnItems);
    }
  };

  const calculateNetValue = (item) => {
    const baseAmount = item.receivedQuantity * item.price;
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
      orderedQuantity: 0,
      receivedQuantity: 0,
      price: 0,
      discountPercent: 0,
      taxPercent: 0,
      netValue: 0
    }]);
    setModels([]);
  };

  const handleRemoveItem = (index) => {
    if (items.length > 1) {
      const newItems = items.filter((_, i) => i !== index);
      setItems(newItems);
    }
  };

  // Updated handleItemChange function to automatically set baseUOM
  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    
    // If brand is changed, update models list and clear model and baseUOM
    if (field === 'brandName') {
      if (value) {
        const brandProducts = products.filter(p => p.brandName === value);
        const uniqueModels = [...new Set(brandProducts.map(p => p.model).filter(Boolean))];
        setModels(uniqueModels.map(model => ({ value: model, label: model })));
      } else {
        setModels([]);
      }
      // Clear model and baseUOM when brand changes
      newItems[index].modelNo = "";
      newItems[index].baseUOM = "";
      newItems[index].unit = "";
    }
    
    // If model is changed, find the product and set baseUOM
    if (field === 'modelNo' && value && newItems[index].brandName) {
      const product = products.find(
        p => p.brandName === newItems[index].brandName && p.model === value
      );
      if (product) {
        newItems[index].baseUOM = product.baseUOM;
        newItems[index].unit = product.baseUOM;
        newItems[index].description = product.description || "";
      }
    }
    
    newItems[index].netValue = calculateNetValue(newItems[index]);
    setItems(newItems);
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const maxSize = 5 * 1024 * 1024; // 5MB
      
      if (file.size > maxSize) {
        toast.error("File size exceeds 5MB limit");
        return;
      }
      
      setTermsDocument(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!choice) {
      return toast.error("Please select choice (Against PO or Direct Material)");
    }

    if (choice === "Against PO" && !selectedPO) {
      return toast.error("Please select a purchase order");
    }

    if (!selectedVendor) {
      return toast.error("Please select a vendor");
    }

    if (!transactionType || !purchaseType) {
      return toast.error("Please fill all required fields");
    }

    if (purchaseType === "Project Purchase" && !selectedProject) {
      return toast.error("Please select a project");
    }

    if (purchaseType === "Stock" && !warehouseLocation) {
      return toast.error("Please enter warehouse location");
    }

    for (let item of items) {
      if (!item.brandName || !item.modelNo || item.receivedQuantity < 0) {
        return toast.error("Please fill all item details correctly");
      }
    }

    const grnData = {
      grnDate: new Date(grnDate),
      choice,
      purchaseOrder: choice === "Against PO" ? selectedPO.value : undefined,
      vendor: selectedVendor.value,
      transactionType,
      purchaseType,
      project: purchaseType === "Project Purchase" ? selectedProject?.value : undefined,
      warehouseLocation: purchaseType === "Stock" ? warehouseLocation : undefined,
      deliveryAddress,
      location,
      items,
      remark,
    };

    if (termsDocument) {
      const formData = new FormData();
      formData.append('file', termsDocument);
      formData.append('grnData', JSON.stringify(grnData));
      
      setUploading(true);
      toast.loading("Creating GRN...");
      try {
        const response = await axios.post(`${process.env.REACT_APP_API_URL}/api/grn/with-document`, formData, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        toast.dismiss();
        const data = response.data;

        if (data.success) {
          toast.success(data.message);
          handleAdd();
        } else {
          toast.error(data.error || "Failed to create GRN");
        }
      } catch (error) {
        toast.dismiss();
        console.error('Upload error:', error);
        if (error.response) {
          // Server responded with error status
          toast.error(`Server error: ${error.response.status} - ${error.response.data.error || error.response.data.message}`);
        } else if (error.request) {
          // Request made but no response received
          toast.error('Network error: No response from server. Please check your connection.');
        } else {
          // Error in request setup
          toast.error('Request error: ' + error.message);
        }
      } finally {
        setUploading(false);
      }
    } else {
      toast.loading("Creating GRN...");
      const data = await createGRN(grnData);
      toast.dismiss();

      if (data.success) {
        toast.success(data.message);
        handleAdd();
      } else {
        toast.error(data.error || "Failed to create GRN");
      }
    }
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="modal fade show" style={{ display: "flex", alignItems: "center", backgroundColor: "#00000090" }}>
      <div className="modal-dialog modal-xl">
        <div className="modal-content p-3">
          <form onSubmit={handleSubmit}>
            <div className="modal-header pt-0">
              <h5 className="card-title fw-bold">Create New GRN (Goods Receipt Note)</h5>
              <button onClick={handleAdd} type="button" className="close px-3" style={{ marginLeft: "auto" }}>
                <span aria-hidden="true">&times;</span>
              </button>
            </div>

            <div className="modal-body">
              <div className="row modal_body_height">
                
                <div className="col-12 col-lg-6">
                  <div className="mb-3">
                    <label className="form-label label_text">Choice <RequiredStar /></label>
                    <select
                      className="form-select rounded-0"
                      value={choice}
                      onChange={(e) => setChoice(e.target.value)}
                      required
                    >
                      <option value="">Select Choice</option>
                      <option value="Against PO">Against PO</option>
                      <option value="Direct Material">Direct Material</option>
                    </select>
                  </div>
                </div>

                <div className="col-12 col-lg-6">
                  <div className="mb-3">
                    <label className="form-label label_text">GRN Date <RequiredStar /></label>
                    <input
                      type="date"
                      className="form-control rounded-0"
                      value={grnDate}
                      onChange={(e) => {
                        const selectedDate = new Date(e.target.value);
                        const currentDate = new Date();
                        currentDate.setHours(0, 0, 0, 0);
                        
                        if (selectedDate <= currentDate) {
                          setGrnDate(e.target.value);
                        } else {
                          setGrnDate(today);
                          toast.error("Future dates are not allowed");
                        }
                      }}
                      max={today}
                      required
                    />
                  </div>
                </div>

                {choice === "Against PO" && (
                  <>
                    <div className="col-12 col-lg-6">
                      <div className="mb-3">
                        <label className="form-label label_text">Vendor Name <RequiredStar /></label>
                        <Select
                          value={selectedVendor}
                          onChange={handleVendorChange}
                          onInputChange={setVendorSearch}
                          options={vendors}
                          placeholder="Select Vendor..."
                          isClearable
                          className="react-select-container"
                          classNamePrefix="react-select"
                          required
                        />
                      </div>
                    </div>

                    <div className="col-12 col-lg-6">
                      <div className="mb-3">
                        <label className="form-label label_text">PO No. <RequiredStar /></label>
                        <Select
                          value={selectedPO}
                          onChange={handlePOChange}
                          onInputChange={setPoSearch}
                          options={filteredPOs}
                          placeholder={selectedVendor ? "Select Purchase Order..." : "Please select a vendor first"}
                          isClearable
                          isDisabled={!selectedVendor}
                          className="react-select-container"
                          classNamePrefix="react-select"
                          required
                        />
                        {selectedVendor && filteredPOs.length === 0 && (
                          <small className="text-muted d-block mt-1">
                            No incomplete purchase orders found for this vendor
                          </small>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {choice === "Direct Material" && (
                  <div className="col-12 col-lg-6">
                    <div className="mb-3">
                      <label className="form-label label_text">Vendor Name <RequiredStar /></label>
                      <Select
                        value={selectedVendor}
                        onChange={setSelectedVendor}
                        onInputChange={setVendorSearch}
                        options={vendors}
                        placeholder="Select Vendor..."
                        isClearable
                        className="react-select-container"
                        classNamePrefix="react-select"
                        required
                      />
                    </div>
                  </div>
                )}

                <div className="col-12 col-lg-6">
                  <div className="mb-3">
                    <label className="form-label label_text">Transaction Type <RequiredStar /></label>
                    <select
                      className="form-select rounded-0"
                      value={transactionType}
                      onChange={(e) => setTransactionType(e.target.value)}
                      disabled={choice === "Against PO"}
                      required
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
                    <label className="form-label label_text">Project Purchase / Stock <RequiredStar /></label>
                    <select
                      className="form-select rounded-0"
                      value={purchaseType}
                      onChange={(e) => setPurchaseType(e.target.value)}
                      disabled={choice === "Against PO"}
                      required
                    >
                      <option value="">Select Type</option>
                      <option value="Project Purchase">Project Purchase</option>
                      <option value="Stock">Stock</option>
                    </select>
                  </div>
                </div>

                {purchaseType === "Project Purchase" && (
                  <div className="col-12 col-lg-6">
                    <div className="mb-3">
                      <label className="form-label label_text">Project Name <RequiredStar /></label>
                      <Select
                        value={selectedProject}
                        onChange={setSelectedProject}
                        options={projects}
                        placeholder="Select Project..."
                        isClearable
                        isDisabled={choice === "Against PO"}
                        required
                      />
                    </div>
                  </div>
                )}

                {purchaseType === "Stock" && (
                  <div className="col-12 col-lg-6">
                    <div className="mb-3">
                      <label className="form-label label_text">Warehouse Location <RequiredStar /></label>
                      <input
                        type="text"
                        className="form-control rounded-0"
                        value={warehouseLocation}
                        onChange={(e) => setWarehouseLocation(e.target.value)}
                        placeholder="Ex: Baner / Amazon / Mumbai / Bhosari"
                        maxLength={200}
                        disabled={choice === "Against PO"}
                        required
                      />
                    </div>
                  </div>
                )}

                <div className="col-12 col-lg-6">
                  <div className="mb-3">
                    <label className="form-label label_text">Delivery Address</label>
                    <textarea
                      className="form-control rounded-0"
                      rows="2"
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      placeholder="Enter delivery address"
                      maxLength={500}
                      disabled={choice === "Against PO"}
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
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="Enter location"
                      maxLength={200}
                      disabled={choice === "Against PO"}
                    />
                  </div>
                </div>

                <div className="col-12 col-lg-6">
                  <div className="mb-3">
                    <label className="form-label label_text">Document</label>
                    <input
                      type="file"
                      className="form-control rounded-0"
                      onChange={handleFileChange}
                      accept=".pdf,.doc,.docx"
                    />
                    {termsDocument && (
                      <small className="text-success d-block mt-1">
                        Selected file: {termsDocument.name}
                      </small>
                    )}
                  </div>
                </div>

                <div className="col-12 mt-3">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <h6 className="fw-bold">Item Details</h6>
                    {choice === "Direct Material" && (
                      <button type="button" className="btn btn-sm btn-primary" onClick={handleAddItem}>
                        <i className="fa fa-plus"></i> Add Item
                      </button>
                    )}
                  </div>

                  <div className="table-responsive">
                    <table className="table table-bordered">
                      <thead>
                        <tr>
                          <th>Brand Name</th>
                          <th>Model No</th>
                          <th>Unit</th>
                          <th>Ordered Qty</th>
                          {choice === "Against PO" && <th>Already Received</th>}
                          <th>Received Qty</th>
                          <th>Remark</th>
                          {choice === "Direct Material" && <th>Action</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((item, index) => {
                          const brandProducts = products.filter(p => p.brandName === item.brandName);
                          const uniqueModels = [...new Set(brandProducts.map(p => p.model).filter(Boolean))];
                          const modelOptions = uniqueModels.map(model => ({ value: model, label: model }));
                          
                          // Calculate already received and remaining quantities for PO items
                          let alreadyReceived = 0;
                          let remainingQuantity = item.orderedQuantity;
                          
                          if (choice === "Against PO" && selectedPO && selectedPO.po) {
                            const poItem = selectedPO.po.items.find(i => 
                              i.brandName === item.brandName && i.modelNo === item.modelNo
                            );
                            if (poItem) {
                              alreadyReceived = poItem.receivedQuantity || 0;
                              remainingQuantity = poItem.quantity - alreadyReceived;
                            }
                          }
                          
                          return (
                            <tr key={index}>
                              <td>
                                {choice === "Against PO" ? (
                                  <input type="text" className="form-control form-control-sm" value={item.brandName} readOnly />
                                ) : (
                                  <Select
                                    value={brands.find(b => b.value === item.brandName) || null}
                                    onChange={(selected) => handleItemChange(index, 'brandName', selected ? selected.value : "")}
                                    options={brands}
                                    placeholder="Select Brand..."
                                    isClearable
                                    required
                                  />
                                )}
                              </td>
                              <td>
                                {choice === "Against PO" ? (
                                  <input type="text" className="form-control form-control-sm" value={item.modelNo} readOnly />
                                ) : (
                                  <Select
                                    value={modelOptions.find(m => m.value === item.modelNo) || null}
                                    onChange={(selected) => handleItemChange(index, 'modelNo', selected ? selected.value : "")}
                                    options={modelOptions}
                                    placeholder="Select Model..."
                                    isClearable
                                    isDisabled={!item.brandName}
                                    required
                                  />
                                )}
                              </td>
                              
                              <td>
                                {choice === "Against PO" ? (
                                  <input type="text" className="form-control form-control-sm" value={item.unit} readOnly />
                                ) : (
                                  <input
                                    type="text"
                                    className="form-control form-control-sm"
                                    value={item.unit}
                                    onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                                    placeholder="Unit"
                                    required
                                  />
                                )}
                              </td>
                              
                              <td>
                                <input
                                  type="number"
                                  className="form-control form-control-sm"
                                  value={item.orderedQuantity}
                                  onChange={(e) => handleItemChange(index, 'orderedQuantity', Number(e.target.value))}
                                  min="0"
                                  disabled={choice === "Against PO"}
                                />
                              </td>
                              
                              {choice === "Against PO" && (
                                <td>
                                  <input
                                    type="number"
                                    className="form-control form-control-sm"
                                    value={alreadyReceived}
                                    readOnly
                                  />
                                </td>
                              )}
                              
                              <td>
                                <input
                                  type="number"
                                  className="form-control form-control-sm"
                                  value={item.receivedQuantity}
                                  onChange={(e) => handleItemChange(index, 'receivedQuantity', Number(e.target.value))}
                                  min="0"
                                  max={choice === "Against PO" ? remainingQuantity : undefined}
                                  required
                                />
                                {choice === "Against PO" && (
                                  <small className="text-muted d-block">
                                    Max: {remainingQuantity}
                                  </small>
                                )}
                              </td>
                              <td>
                                <textarea
                                  className="form-control form-control-sm"
                                  value={item.description}
                                  onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                                  rows="1"
                                  disabled={choice === "Against PO"}
                                />
                              </td>
                              {choice === "Direct Material" && (
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
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
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
                  <button 
                    type="submit" 
                    className="w-80 btn addbtn rounded-0 add_button m-2 px-4"
                    disabled={uploading}
                  >
                    Add
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

export default AddGRNPopUp;