import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { getVendors } from "../../../../../hooks/useVendor";
import { getProducts, getProductBrands, createProduct } from "../../../../../hooks/useProduct";
import { createPurchaseOrder } from "../../../../../hooks/usePurchaseOrder";
import Select from "react-select";
import AddInventoryPopup from "../../InventryMaster/PopUp/AddInventoryPopUp";

const mapToProductMasterCategory = (cat) => {
  const map = {
    "Raw Material": "raw material",
    "Finished Goods": "finished goods",
    "Repairing Material": "repairing material",
    "Scrap": "scrap",
    "Asset": "raw material",
  };
  return map[cat] || "raw material";
};

const AddPurchaseOrderPopUp = ({ handleAdd, projects }) => {
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
  const [orderTime, setOrderTime] = useState(new Date().toTimeString().slice(0, 5));
  const [transactionType, setTransactionType] = useState("");
  const [purchaseType, setPurchaseType] = useState("");
  const [selectedProject, setSelectedProject] = useState(null);
  const [warehouseLocation, setWarehouseLocation] = useState("");
  const [remark, setRemark] = useState("");
  
  const [advancePay, setAdvancePayment] = useState(0);
  const [payAgainstDelivery, setPayAgainstDelivery] = useState(0);
  const [payAfterCompletion, setPayAfterCompletion] = useState(0);
  const [retention, setRetention] = useState(0);
  const [creditPeriod, setCreditPeriod] = useState(0);
  
  const [deliveryDate, setDeliveryDate] = useState("");
  const [materialFollowupDate, setMaterialFollowupDate] = useState("");
  
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [location, setLocation] = useState("");
  const [termsDocument, setTermsDocument] = useState(null);
  
  const [useDefaultAddress, setUseDefaultAddress] = useState(false);
  
  const [showCreditPopup, setShowCreditPopup] = useState(false);
  const [showPaymentTermsPopup, setShowPaymentTermsPopup] = useState(false);
  const [showAddProductPopup, setShowAddProductPopup] = useState(false);
  
  const [vendors, setVendors] = useState([]);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [vendorSearch, setVendorSearch] = useState("");
  
  const [products, setProducts] = useState([]);
  const [productSearch, setProductSearch] = useState("");
  const [brands, setBrands] = useState([]);
  const [allBrands, setAllBrands] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  
  const [items, setItems] = useState([{
    productName: "",
    brandName: "",
    modelNo: "",
    description: "",
    unit: "",
    baseUOM: "",
    quantity: 1,
    price: 0,
    discountPercent: 0,
    taxPercent: 0,
    hsnSac: "",
    netValue: 0,
    warranty: ""
  }]);

  const DEFAULT_DELIVERY_ADDRESS = "Office No. - 05, 3rd Floor, Revati Arcade-II, Opposite to Kapil Malhar Society, Baner, Pune - 411045, Maharashtra, India";
  const DEFAULT_LOCATION = "Baner, Pune";

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

  // Load vendors
  useEffect(() => {
    const loadVendors = async () => {
      const data = await getVendors(1, 1000, vendorSearch);
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

  // ── Load brands from DB + ALL products from API ──
  useEffect(() => {
    const loadInitialData = async () => {
      let dbBrands = [];
      try {
        const brandsData = await getProductBrands();
        if (brandsData?.success && Array.isArray(brandsData.brands)) {
          dbBrands = brandsData.brands;
        }
      } catch (e) {
        console.error("Error loading brands from DB:", e);
      }
      if (dbBrands.length === 0) {
        dbBrands = ["Apple", "Samsung", "Sony", "LG", "Microsoft", "Dell"];
      }

      setLoadingProducts(true);
      let allProducts = [];
      let currentPage = 1;
      const pageSize = 100;
      let hasMore = true;

      try {
        while (hasMore) {
          const data = await getProducts(currentPage, pageSize, "");
          if (data.success && data.products && data.products.length > 0) {
            allProducts = [...allProducts, ...data.products];
            if (data.products.length < pageSize) hasMore = false;
            else currentPage++;
          } else {
            hasMore = false;
          }
        }

        setProducts(allProducts);

        // Merge DB brands with any brands found on products
        const productBrands = [...new Set(allProducts.map(p => p.brandName).filter(Boolean))];
        const mergedBrands = [...new Set([...dbBrands, ...productBrands])];
        const brandOptions = mergedBrands.map(brand => ({ value: brand, label: brand }));
        setBrands(brandOptions);
        setAllBrands(brandOptions);

        console.log(`Loaded ${allProducts.length} products, ${brandOptions.length} brands`);
        console.log('[DEBUG] Brand → Model counts:');
        mergedBrands.forEach(brand => {
          const count = allProducts.filter(p => p.brandName === brand && p.model).length;
          const models = [...new Set(allProducts.filter(p => p.brandName === brand && p.model).map(p => p.model))];
          console.log(`  "${brand}": ${count} products, ${models.length} unique models:`, models);
        });
      } catch (error) {
        console.error("Error loading products:", error);
        toast.error("Failed to load products");
      } finally {
        setLoadingProducts(false);
      }
    };

    loadInitialData();
  }, []);

  useEffect(() => {
    const retentionValue = 100 - (Number(advancePay) + Number(payAgainstDelivery) + Number(payAfterCompletion));
    if (retentionValue >= 0) {
      setRetention(retentionValue);
    } else {
      setRetention(0);
    }
  }, [advancePay, payAgainstDelivery, payAfterCompletion]);

  const calculateNetValue = (item) => {
    const baseAmount = item.quantity * item.price;
    const discountAmount = baseAmount * (item.discountPercent / 100);
    const amountAfterDiscount = baseAmount - discountAmount;
    const taxAmount = amountAfterDiscount * (item.taxPercent / 100);
    return amountAfterDiscount + taxAmount;
  };

  const handleAddBlankItem = () => {
    setItems([...items, {
      productName: "", brandName: "", modelNo: "", description: "",
      unit: "", baseUOM: "", quantity: 1, price: 0,
      discountPercent: 0, taxPercent: 0, hsnSac: "", netValue: 0, warranty: ""
    }]);
  };

  const handleAddItemFromInventory = () => {
    setShowAddProductPopup(true);
  };

  const handleAddProductFromInventory = async (productData) => {
    const productPayload = {
      productName: productData.productName || "",
      brandName: productData.brandName || "",
      printName: productData.printName || "",
      aliasName: productData.aliasName || "",
      model: productData.model || "",
      hsnCode: productData.hsnCode || "",
      description: productData.description || productData.materialName || "",
      productCategory: productData.productCategory || "",
      baseUOM: productData.baseUOM || "",
      alternateUOM: productData.alternateUOM || "",
      uomConversion: parseFloat(productData.uomConversion) || 1,
      category: mapToProductMasterCategory(productData.category),
      mrp: parseFloat(productData.mrp) || 0,
      salesPrice: parseFloat(productData.salesPrice) || 0,
      purchasePrice: parseFloat(productData.purchasePrice || productData.unitPrice) || 0,
      minSalesPrice: parseFloat(productData.minSalesPrice) || 0,
      minQtyLevel: parseFloat(productData.minQtyLevel) || 0,
      discountType: productData.discountType || "Zero Discount",
      discountValue:
        productData.discountType === "Zero Discount"
          ? 0
          : parseFloat(productData.discountValue) || 0,
      currentStockQty: parseFloat(productData.currentStock) || 0,
      taxType: productData.taxType || "none",
      gstRate: productData.taxType === "gst" ? parseFloat(productData.gstRate) || 0 : 0,
      gstEffectiveDate: productData.taxType === "gst" ? productData.gstEffectiveDate : "",
    };

    if (!productPayload.productName || !productPayload.baseUOM) {
      toast.error("Product Name and Base UOM are required to save this product in Product Master");
      return;
    }

    toast.loading("Saving product to Product Master...");
    const result = await createProduct(productPayload);
    toast.dismiss();

    if (result?.success) {
      toast.success("Product saved to Product Master");
    } else if (result?.isDuplicate) {
      toast(result.error || "This product already exists in Product Master", { icon: "ℹ️" });
    } else {
      toast.error(result?.error || "Failed to save product to Product Master");
    }

    const newItem = {
      productName: productData.productName || "",
      brandName: productData.brandName || "",
      modelNo: productData.model || "",
      description: productData.description || productData.materialName || "",
      unit: productData.baseUOM || "",
      baseUOM: productData.baseUOM || "",
      quantity: 1,
      price: productData.purchasePrice || productData.unitPrice || 0,
      discountPercent: 0,
      taxPercent: productData.gstPercentage || productData.gstRate || 0,
      hsnSac: productData.hsnCode || "",
      netValue: 0,
      warranty: ""
    };
    newItem.netValue = calculateNetValue(newItem);
    setItems([...items, newItem]);
    setShowAddProductPopup(false);

    // Refresh products so the newly saved product is immediately selectable
    refreshProducts();
  };

  const handleRemoveItem = (index) => {
    if (items.length > 1) {
      const newItems = items.filter((_, i) => i !== index);
      setItems(newItems);
    }
  };

  // ── FIXED: Removed setModels calls — each row computes modelOptions
  //    directly from the `products` array (same approach as Update popup). ──
  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;

    if (field === 'brandName') {
      // Clear model and UOM when brand changes — the per-row modelOptions
      // in the render will automatically pick up the correct models for
      // the new brand from the `products` array. No shared state needed.
      newItems[index].modelNo = "";
      newItems[index].baseUOM = "";
    }

    if (field === 'modelNo' && value && newItems[index].brandName) {
      const product = products.find(
        p => p.brandName === newItems[index].brandName && p.model === value
      );
      if (product) {
        newItems[index].baseUOM = product.baseUOM || "";
        newItems[index].description = product.description || "";
        newItems[index].unit = product.baseUOM || "";
        newItems[index].productName = product.productName || "";
        newItems[index].hsnSac = product.hsnCode || "";
      }
    }

    newItems[index].netValue = calculateNetValue(newItems[index]);
    setItems(newItems);
  };

  const refreshProducts = async () => {
    setLoadingProducts(true);

    let dbBrands = [];
    try {
      const brandsData = await getProductBrands();
      if (brandsData?.success && Array.isArray(brandsData.brands)) {
        dbBrands = brandsData.brands;
      }
    } catch (e) {
      console.error("Error loading brands from DB:", e);
    }
    if (dbBrands.length === 0) dbBrands = ["Apple", "Samsung", "Sony", "LG", "Microsoft", "Dell"];

    let allProducts = [];
    let currentPage = 1;
    const pageSize = 100;
    let hasMore = true;

    try {
      while (hasMore) {
        const data = await getProducts(currentPage, pageSize, "");
        if (data.success && data.products && data.products.length > 0) {
          allProducts = [...allProducts, ...data.products];
          if (data.products.length < pageSize) hasMore = false;
          else currentPage++;
        } else {
          hasMore = false;
        }
      }

      setProducts(allProducts);

      const productBrands = [...new Set(allProducts.map(p => p.brandName).filter(Boolean))];
      const mergedBrands = [...new Set([...dbBrands, ...productBrands])];
      setAllBrands(mergedBrands.map(brand => ({ value: brand, label: brand })));

      console.log(`Refreshed: ${allProducts.length} products, ${mergedBrands.length} brands`);
      toast.success("Products refreshed successfully");
    } catch (error) {
      console.error("Error refreshing products:", error);
      toast.error("Failed to refresh products");
    } finally {
      setLoadingProducts(false);
    }
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
    return { totalAmount, totalTax, grandTotal };
  };

  const { totalAmount, totalTax, grandTotal } = calculateTotals();

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
      vendor: selectedVendor.value,
      orderDate: orderDateTime,
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
      materialFollowupDate: materialFollowupDate ? new Date(materialFollowupDate) : undefined
    };

    if (termsDocument) {
      const formData = new FormData();
      formData.append('file', termsDocument);
      formData.append('poData', JSON.stringify(poData));

      toast.loading("Creating Purchase Order...");
      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL}/api/purchaseOrder/upload`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
          body: formData
        });
        const data = await response.json();
        toast.dismiss();
        if (data.success) {
          toast.success(data.message);
          handleAdd();
        } else {
          toast.error(data.error || "Failed to create purchase order");
        }
      } catch (error) {
        toast.dismiss();
        toast.error("Failed to upload document");
      }
    } else {
      toast.loading("Creating Purchase Order...");
      const data = await createPurchaseOrder(poData);
      toast.dismiss();
      if (data.success) {
        toast.success(data.message);
        handleAdd();
      } else {
        toast.error(data.error || "Failed to create purchase order");
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
              <h5 className="card-title fw-bold">Create New Purchase Order</h5>
              <button onClick={handleAdd} type="button" className="close px-3" style={{ marginLeft: "auto" }}>
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
                    <input type="date" className="form-control rounded-0" value={orderDate}
                      onChange={(e) => {
                        const selectedDate = new Date(e.target.value);
                        const currentDate = new Date();
                        currentDate.setHours(0, 0, 0, 0);
                        if (selectedDate <= currentDate) {
                          setOrderDate(e.target.value);
                        } else {
                          setOrderDate(today);
                          toast.error("Future dates are not allowed");
                        }
                      }}
                      max={today}
                    />
                  </div>
                </div>

                <div className="col-12 col-lg-3">
                  <div className="mb-3">
                    <label className="form-label label_text">Order Time</label>
                    <input type="time" className="form-control rounded-0" value={orderTime}
                      onChange={(e) => setOrderTime(e.target.value)} />
                  </div>
                </div>

                <div className="col-12 col-lg-6">
                  <div className="mb-3">
                    <label className="form-label label_text">Transaction Type</label>
                    <select className="form-select rounded-0" value={transactionType}
                      onChange={(e) => setTransactionType(e.target.value)}>
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
                    <select className="form-select rounded-0" value={purchaseType}
                      onChange={(e) => setPurchaseType(e.target.value)}>
                      <option value="">Select Type</option>
                      <option value="Project Purchase">Project Purchase</option>
                      <option value="Stock">Stock</option>
                    </select>
                  </div>
                </div>

                {purchaseType === "Project Purchase" && (
                  <div className="col-12 col-lg-6">
                    <div className="mb-3">
                      <label className="form-label label_text">Project Name</label>
                      <Select value={selectedProject} onChange={setSelectedProject} options={projects}
                        placeholder="Select Project..." isClearable />
                    </div>
                  </div>
                )}

                {purchaseType === "Stock" && (
                  <div className="col-12 col-lg-6">
                    <div className="mb-3">
                      <label className="form-label label_text">Warehouse Location</label>
                      <input type="text" className="form-control rounded-0" value={warehouseLocation}
                        onChange={(e) => setWarehouseLocation(e.target.value)}
                        placeholder="Ex: Baner / Amazon / Mumbai / Bhosari" maxLength={200} />
                    </div>
                  </div>
                )}

                <div className="col-12 mb-3">
                  <div className="form-check form-switch">
                    <input className="form-check-input" type="checkbox" id="defaultAddressToggle"
                      checked={useDefaultAddress} onChange={handleToggleDefaultAddress} style={{ cursor: "pointer" }} />
                    <label className="form-check-label" htmlFor="defaultAddressToggle" style={{ cursor: "pointer" }}>
                      Use Default Office Address
                    </label>
                  </div>
                </div>

                <div className="col-12 col-lg-6">
                  <div className="mb-3">
                    <label className="form-label label_text">Delivery Address</label>
                    <textarea className="form-control rounded-0" rows="2" value={deliveryAddress}
                      onChange={(e) => {
                        setDeliveryAddress(e.target.value);
                        if (useDefaultAddress && e.target.value !== DEFAULT_DELIVERY_ADDRESS) setUseDefaultAddress(false);
                      }}
                      placeholder="Enter delivery address" maxLength={500} />
                  </div>
                </div>

                <div className="col-12 col-lg-6">
                  <div className="mb-3">
                    <label className="form-label label_text">Location</label>
                    <input type="text" className="form-control rounded-0" value={location}
                      onChange={(e) => {
                        setLocation(e.target.value);
                        if (useDefaultAddress && e.target.value !== DEFAULT_LOCATION) setUseDefaultAddress(false);
                      }}
                      placeholder="Enter location" maxLength={200} />
                  </div>
                </div>

                <div className="col-12 col-lg-6">
                  <div className="mb-3">
                    <label className="form-label label_text">Terms & Conditions Document</label>
                    <input type="file" className="form-control rounded-0"
                      onChange={(e) => setTermsDocument(e.target.files[0])} accept=".pdf,.doc,.docx" />
                  </div>
                </div>

                <div className="col-12 mt-3">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <h6 className="fw-bold">Item Details</h6>
                    <div className="d-flex gap-2">
                      <button type="button" className="btn btn-sm btn-primary" onClick={handleAddBlankItem}
                        style={{ display: "inline-flex", alignItems: "center" }}>
                        <i className="fa fa-plus me-1"></i> Add Item
                      </button>
                      <button type="button" className="btn btn-sm btn-info" onClick={handleAddItemFromInventory}
                        style={{ display: "inline-flex", alignItems: "center" }}>
                        <i className="fa fa-plus me-1"></i> Add Product
                      </button>
                      <button type="button" className="btn btn-sm btn-warning" onClick={refreshProducts}
                        style={{ display: "inline-flex", alignItems: "center" }} disabled={loadingProducts}>
                        <i className="fa fa-refresh me-1"></i> {loadingProducts ? "Loading..." : "Refresh"}
                      </button>
                    </div>
                  </div>

                  {loadingProducts && (
                    <div className="text-center py-3">
                      <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Loading products...</span>
                      </div>
                      <p className="mt-2">Loading all products, brands, and models...</p>
                    </div>
                  )}

                  <div className="table-responsive">
                    <table className="table table-bordered">
                      <thead>
                        <tr>
                          <th>Brand Name</th>
                          <th>Model</th>
                          <th>Product Name</th>
                          <th>HSN/SAC</th>
                          <th>Description</th>
                          <th>Base UOM</th>
                          <th>Quantity</th>
                          <th>Price (INR/USD)</th>
                          <th>Discount %</th>
                          <th>Tax %</th>
                          <th>Warranty</th>
                          <th>Net Value</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((item, index) => {
                          // ── FIX: Compute model options directly from `products` array
                          //    for THIS row's brand — same working approach as
                          //    UpdatePurchaseOrderPopUp. No shared state, no Map,
                          //    no stale closure issues. Every model for the brand
                          //    will always appear. ──
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
                                  isLoading={loadingProducts}
                                  isDisabled={loadingProducts}
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
                                  isDisabled={!item.brandName || loadingProducts}
                                  menuPortalTarget={document.body}
                                  styles={{
                                    menuPortal: base => ({ ...base, zIndex: 9999 }),
                                    container: base => ({ ...base, minWidth: '150px' })
                                  }}
                                />
                              </td>
                              <td>
                                <input type="text" className="form-control form-control-sm"
                                  style={{ minWidth: "150px" }} value={item.productName}
                                  onChange={(e) => handleItemChange(index, 'productName', e.target.value)}
                                  placeholder="Product Name" />
                              </td>
                              <td>
                                <input type="text" className="form-control form-control-sm"
                                  style={{ minWidth: "90px" }} value={item.hsnSac}
                                  onChange={(e) => handleItemChange(index, 'hsnSac', e.target.value)}
                                  placeholder="HSN/SAC" />
                              </td>
                              <td>
                                <textarea className="form-control form-control-sm"
                                  style={{ width: "185px" }} value={item.description}
                                  onChange={(e) => handleItemChange(index, 'description', e.target.value)} rows="1" />
                              </td>
                              <td>
                                <input type="text" className="form-control form-control-sm"
                                  style={{ minWidth: "100px" }} value={item.baseUOM}
                                  onChange={(e) => handleItemChange(index, 'baseUOM', e.target.value)}
                                  placeholder="Base UOM" />
                              </td>
                              <td>
                                <input type="number" className="form-control form-control-sm"
                                  style={{ minWidth: "80px" }} value={item.quantity}
                                  onChange={(e) => {
                                    const value = e.target.value;
                                    if (value === '' || value === '.') {
                                      handleItemChange(index, 'quantity', value);
                                    } else if (/^\d*\.?\d{0,2}$/.test(value)) {
                                      handleItemChange(index, 'quantity', Number(value));
                                    }
                                  }}
                                  min="1" step="0.01" />
                              </td>
                              <td>
                                <input type="number" className="form-control form-control-sm"
                                  style={{ minWidth: "100px" }} value={item.price}
                                  onChange={(e) => handleItemChange(index, 'price', Number(e.target.value))}
                                  min="0" step="0.01" />
                              </td>
                              <td>
                                <input type="number" className="form-control form-control-sm"
                                  style={{ minWidth: "80px" }} value={item.discountPercent}
                                  onChange={(e) => {
                                    const value = e.target.value;
                                    if (value === '' || value === '.') {
                                      handleItemChange(index, 'discountPercent', value);
                                    } else if (/^\d*\.?\d{0,2}$/.test(value) && Number(value) <= 100) {
                                      handleItemChange(index, 'discountPercent', Number(value));
                                    }
                                  }}
                                  min="0" max="100" step="0.01" />
                              </td>
                              <td>
                                <input type="number" className="form-control form-control-sm"
                                  style={{ minWidth: "80px" }} value={item.taxPercent}
                                  onChange={(e) => {
                                    const value = e.target.value;
                                    if (value === '' || value === '.') {
                                      handleItemChange(index, 'taxPercent', value);
                                    } else if (/^\d*\.?\d{0,2}$/.test(value) && Number(value) <= 100) {
                                      handleItemChange(index, 'taxPercent', Number(value));
                                    }
                                  }}
                                  min="0" max="100" step="0.01" />
                              </td>
                              <td>
                                <input type="text" className="form-control form-control-sm"
                                  style={{ minWidth: "120px" }} value={item.warranty}
                                  onChange={(e) => handleItemChange(index, 'warranty', e.target.value)}
                                  placeholder="e.g. 1 Year" />
                              </td>
                              <td>
                                <input type="text" className="form-control form-control-sm"
                                  style={{ minWidth: "100px" }} value={item.netValue.toFixed(2)} readOnly />
                              </td>
                              <td>
                                <button type="button" className="btn btn-sm btn-danger"
                                  onClick={() => handleRemoveItem(index)} disabled={items.length === 1}>
                                  <i className="fa fa-trash"></i>
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td colSpan="11" className="text-end fw-bold">Total Amount</td>
                          <td className="fw-bold">{totalAmount.toFixed(2)}</td>
                          <td></td>
                        </tr>
                        <tr>
                          <td colSpan="11" className="text-end fw-bold">Total Tax</td>
                          <td className="fw-bold">{totalTax.toFixed(2)}</td>
                          <td></td>
                        </tr>
                        <tr>
                          <td colSpan="11" className="text-end fw-bold">Grand Total</td>
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
                          <input type="text" className="form-control rounded-0"
                            value={creditPeriod ? `${creditPeriod} days` : "Click to set credit period"}
                            onClick={() => setShowCreditPopup(true)} readOnly style={{ cursor: "pointer" }} />
                          <button className="btn btn-outline-secondary rounded-0" type="button"
                            onClick={() => setShowCreditPopup(true)}>
                            <i className="fa fa-calendar"></i>
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="col-12 col-lg-6">
                      <div className="mb-3">
                        <label className="form-label label_text">Payment Terms</label>
                        <div className="input-group">
                          <input type="text" className="form-control rounded-0"
                            value={`Advance: ${advancePay}%, Delivery: ${payAgainstDelivery}%, Completion: ${payAfterCompletion}%, Retention: ${retention}%`}
                            onClick={() => setShowPaymentTermsPopup(true)} readOnly style={{ cursor: "pointer" }} />
                          <button className="btn btn-outline-secondary rounded-0" type="button"
                            onClick={() => setShowPaymentTermsPopup(true)}>
                            <i className="fa fa-percent"></i>
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="col-12 col-lg-6">
                      <div className="mb-3">
                        <label className="form-label label_text">Expected Delivery Date</label>
                        <input type="date" className="form-control rounded-0" value={deliveryDate}
                          onChange={(e) => setDeliveryDate(e.target.value)} />
                      </div>
                    </div>

                    <div className="col-12 col-lg-6">
                      <div className="mb-3">
                        <label className="form-label label_text">Material Followup Date</label>
                        <input type="date" className="form-control rounded-0" value={materialFollowupDate}
                          onChange={(e) => setMaterialFollowupDate(e.target.value)} />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="col-12 mt-3">
                  <div className="mb-3">
                    <label className="form-label label_text">Remark</label>
                    <textarea className="form-control rounded-0" rows="3" value={remark}
                      onChange={(e) => setRemark(e.target.value)} maxLength={1000} />
                  </div>
                </div>

                <div className="col-12 pt-3 mt-2">
                  <button type="submit" className="w-80 btn addbtn rounded-0 add_button m-2 px-4">Add</button>
                  <button type="button" onClick={handleAdd} className="w-80 btn addbtn rounded-0 Cancel_button m-2 px-4">Cancel</button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>

      {showAddProductPopup && (
        <AddInventoryPopup
          onAddInventory={handleAddProductFromInventory}
          onClose={() => setShowAddProductPopup(false)}
        />
      )}

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
                  <input type="number" className="form-control rounded-0" value={creditPeriod}
                    onChange={(e) => setCreditPeriod(Number(e.target.value))} min="0" />
                </div>
                <div className="d-flex justify-content-end">
                  <button type="button" className="btn btn-secondary me-2" onClick={() => setShowCreditPopup(false)}>Cancel</button>
                  <button type="button" className="btn btn-primary" onClick={() => setShowCreditPopup(false)}>Save</button>
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
                  <input type="number" step="0.01" min="0" max="100" className="form-control rounded-0"
                    value={advancePay}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (/^\d*\.?\d*$/.test(value) && Number(value) <= 100) setAdvancePayment(value);
                    }} />
                </div>
                <div className="mb-3">
                  <label className="form-label label_text">Pay Against Delivery (%)</label>
                  <input type="number" step="0.01" min="0" max="100" className="form-control rounded-0"
                    value={payAgainstDelivery}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (/^\d*\.?\d{0,2}$/.test(value) && Number(value) <= 100) setPayAgainstDelivery(value);
                    }} />
                </div>
                <div className="mb-3">
                  <label className="form-label label_text">Pay After Completion (%)</label>
                  <input type="number" step="0.01" min="0" max="100" className="form-control rounded-0"
                    value={payAfterCompletion}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (/^\d*\.?\d{0,2}$/.test(value) && Number(value) <= 100) setPayAfterCompletion(value);
                    }} />
                </div>
                <div className="mb-3">
                  <label className="form-label label_text">Retention (%)</label>
                  <input type="number" className="form-control rounded-0" value={retention}
                    readOnly style={{ backgroundColor: '#e9ecef' }} />
                </div>
                <div className="d-flex justify-content-end">
                  <button type="button" className="btn btn-secondary me-2" onClick={() => setShowPaymentTermsPopup(false)}>Cancel</button>
                  <button type="button" className="btn btn-primary" onClick={() => setShowPaymentTermsPopup(false)}>Save</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddPurchaseOrderPopUp;