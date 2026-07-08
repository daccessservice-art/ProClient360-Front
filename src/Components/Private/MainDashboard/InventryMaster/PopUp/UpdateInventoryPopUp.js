import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { RequiredStar } from "../../../RequiredStar/RequiredStar";
import { getProductBrands } from "../../../../../hooks/useProduct";

const UpdateInventoryPopup = ({ selectedInventory, onUpdateInventory, onClose }) => {
  const [formData, setFormData] = useState({
    _id: '',
    materialCode: '',
    hsmCode: '',
    materialName: '',
    category: 'Raw Material',
    unit: 'Pcs',
    unitPrice: '',
    currentStock: '',
    minStockLevel: '',
    warehouseLocation: '',
    stockLocation: '',
    openingDate: new Date().toISOString().split('T')[0],
    description: '',
    transactionType: 'incoming',
    transactionQuantity: '',
    transactionReason: ''
  });

  const [showTransaction, setShowTransaction] = useState(false);
  const [transactionHistory, setTransactionHistory] = useState([]);

  // ── NEW: Product Master fields ──
  const [brandName, setBrandName] = useState("");
  const [productCategory, setProductCategory] = useState("");
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [showAddBrand, setShowAddBrand] = useState(false);
  const [newBrand, setNewBrand] = useState("");

  const [allBrands, setAllBrands] = useState([]);
  const [brandsLoading, setBrandsLoading] = useState(true);
  const [allCategories, setAllCategories] = useState([]);

  const categories = ['Raw Material', 'Finished Goods', 'Repairing Material', 'Scrap', 'Asset'];
  const units = ['Pcs', 'Kg', 'Ltr', 'Mtr', 'Box', 'Set', 'Pair', 'Roll', 'Sheet', 'Bag'];

  // ── FIX: Brands now load from DATABASE ──
  useEffect(() => {
    const loadBrands = async () => {
      setBrandsLoading(true);
      const data = await getProductBrands();
      if (data?.success && Array.isArray(data.brands) && data.brands.length > 0) {
        setAllBrands(data.brands);
      } else {
        setAllBrands(["Apple", "Samsung", "Sony", "LG", "Microsoft", "Dell"]);
      }
      setBrandsLoading(false);
    };
    loadBrands();
  }, []);

  // ── Categories from localStorage ──
  useEffect(() => {
    const savedCategories = localStorage.getItem('productCategories');
    setAllCategories(savedCategories ? JSON.parse(savedCategories) : ["Electronics", "Clothing", "Food", "Furniture", "Stationery", "Tools"]);
  }, []);

  useEffect(() => {
    if (allCategories.length > 0) {
      localStorage.setItem('productCategories', JSON.stringify(allCategories));
    }
  }, [allCategories]);

  useEffect(() => {
    if (selectedInventory) {
      setFormData({
        _id: selectedInventory._id,
        materialCode: selectedInventory.materialCode || '',
        hsmCode: selectedInventory.hsmCode || '',
        materialName: selectedInventory.materialName || '',
        category: selectedInventory.category || 'Raw Material',
        unit: selectedInventory.unit || 'Pcs',
        unitPrice: selectedInventory.unitPrice || '',
        currentStock: selectedInventory.currentStock || '',
        minStockLevel: selectedInventory.minStockLevel || '',
        warehouseLocation: selectedInventory.warehouseLocation || '',
        stockLocation: selectedInventory.stockLocation || '',
        openingDate: selectedInventory.openingDate ?
          new Date(selectedInventory.openingDate).toISOString().split('T')[0] :
          new Date().toISOString().split('T')[0],
        description: selectedInventory.description || '',
        transactionType: 'incoming',
        transactionQuantity: '',
        transactionReason: ''
      });

      // ── Load Product Master fields from inventory doc ──
      setBrandName(selectedInventory.brandName || "");
      setProductCategory(selectedInventory.productCategory || "");

      if (selectedInventory.transactions && selectedInventory.transactions.length > 0) {
        setTransactionHistory(selectedInventory.transactions);
      }
    }
  }, [selectedInventory]);

  // ── Ensure saved brand is in dropdown ──
  useEffect(() => {
    if (brandName && !allBrands.includes(brandName)) {
      setAllBrands(prev => {
        if (!prev.includes(brandName)) return [...prev, brandName];
        return prev;
      });
    }
  }, [brandName, allBrands]);

  // ── Ensure saved category is in dropdown ──
  useEffect(() => {
    if (productCategory && !allCategories.includes(productCategory)) {
      setAllCategories(prev => {
        if (!prev.includes(productCategory)) return [...prev, productCategory];
        return prev;
      });
    }
  }, [productCategory, allCategories]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (formData.materialCode && parseFloat(formData.unitPrice) < 0) {
      toast.error('Unit price must be greater than or equal to 0');
      return;
    }
    if (formData.currentStock && parseInt(formData.currentStock) < 0) {
      toast.error('Current stock must be greater than or equal to 0');
      return;
    }
    if (formData.minStockLevel && parseInt(formData.minStockLevel) < 0) {
      toast.error('Min stock level must be greater than or equal to 0');
      return;
    }

    if (showTransaction && formData.transactionQuantity) {
      if (parseInt(formData.transactionQuantity) <= 0) {
        toast.error('Transaction quantity must be greater than 0');
        return;
      }
      if (!formData.transactionReason) {
        toast.error('Please provide a reason for the transaction');
        return;
      }

      const currentStockNum = parseInt(formData.currentStock) || 0;
      const transactionQty = parseInt(formData.transactionQuantity);
      let newStock;

      if (formData.transactionType === 'incoming') {
        newStock = currentStockNum + transactionQty;
      } else {
        newStock = currentStockNum - transactionQty;
        if (newStock < 0) {
          toast.error('Outgoing quantity cannot exceed current stock');
          return;
        }
      }

      const dataToSend = {
        ...formData,
        brandName,
        productCategory,
        currentStock: newStock,
        transaction: {
          type: formData.transactionType,
          quantity: transactionQty,
          reason: formData.transactionReason,
          date: new Date().toISOString()
        }
      };

      onUpdateInventory(dataToSend);
    } else {
      const { transactionType, transactionQuantity, transactionReason, ...updateData } = formData;
      updateData.brandName = brandName;
      updateData.productCategory = productCategory;
      onUpdateInventory(updateData);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString('en-IN', options);
  };

  const handleAddNewCategory = () => {
    if (!newCategory.trim()) return toast.error("Please enter a category name");
    if (allCategories.includes(newCategory.trim())) return toast.error("Category already exists");
    const updated = [...allCategories, newCategory.trim()];
    setAllCategories(updated);
    setProductCategory(newCategory.trim());
    setNewCategory(""); setShowAddCategory(false);
    toast.success("New category added successfully");
  };

  const handleAddNewBrand = () => {
    if (!newBrand.trim()) return toast.error("Please enter a brand name");
    if (allBrands.includes(newBrand.trim())) return toast.error("Brand already exists");
    const updated = [...allBrands, newBrand.trim()];
    setAllBrands(updated);
    setBrandName(newBrand.trim());
    setNewBrand(""); setShowAddBrand(false);
    toast.success("New brand added successfully");
  };

  return (
    <>
      <div className="modal fade show" style={{ display: "flex", alignItems: "center", backgroundColor: "#00000090" }}>
        <div className="modal-dialog modal-lg">
          <div className="modal-content p-3">
            <form onSubmit={handleSubmit}>
              <div className="modal-header pt-0">
                <h5 className="card-title fw-bold">Update Inventory Material</h5>
                <button onClick={onClose} type="button" className="btn-close" aria-label="Close" style={{ backgroundColor: 'red' }}></button>
              </div>

              <div className="modal-body" style={{ maxHeight: 'calc(80vh - 240px)', overflowY: 'auto' }}>
                {/* Toggle buttons */}
                <div className="mb-3">
                  <button type="button" className="btn btn-sm btn-outline-primary me-2"
                    onClick={() => setShowTransaction(!showTransaction)}>
                    {showTransaction ? 'Hide Stock Transaction' : 'Add Stock Transaction'}
                  </button>
                </div>

                {/* Stock Transaction Section */}
                {showTransaction && (
                  <div className="card mb-3">
                    <div className="card-body">
                      <h6 className="pb-2 mb-3" style={{ color: "#000", borderBottom: "2px solid #000", fontWeight: "600", display: "inline-block" }}>
                        Stock Transaction :-
                      </h6>
                      <div className="row g-3">
                        <div className="col-md-4">
                          <label className="form-label fw-bold">Transaction Type <RequiredStar /></label>
                          <select className="form-select" name="transactionType" value={formData.transactionType} onChange={handleInputChange}>
                            <option value="incoming">Incoming (+)</option>
                            <option value="outgoing">Outgoing (-)</option>
                          </select>
                        </div>
                        <div className="col-md-4">
                          <label className="form-label fw-bold">Quantity <RequiredStar /></label>
                          <input type="number" className="form-control" name="transactionQuantity"
                            placeholder="Enter quantity...." min="1" value={formData.transactionQuantity} onChange={handleInputChange} />
                        </div>
                        <div className="col-md-4">
                          <label className="form-label fw-bold">Current Stock</label>
                          <input type="text" className="form-control" value={`${formData.currentStock} ${formData.unit}`} disabled />
                        </div>
                        <div className="col-12">
                          <label className="form-label fw-bold">Reason / Remarks <RequiredStar /></label>
                          <textarea className="form-control" name="transactionReason"
                            placeholder="e.g., Purchase from supplier, Used in production, Returned material, etc..."
                            rows="2" maxLength={200} value={formData.transactionReason} onChange={handleInputChange} />
                        </div>
                        {formData.transactionQuantity && (
                          <div className="col-12">
                            <div className={`alert ${formData.transactionType === 'incoming' ? 'alert-success' : 'alert-warning'}`}>
                              <strong>New Stock after transaction:</strong> {
                                formData.transactionType === 'incoming'
                                  ? parseInt(formData.currentStock) + parseInt(formData.transactionQuantity || 0)
                                  : parseInt(formData.currentStock) - parseInt(formData.transactionQuantity || 0)
                              } {formData.unit}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Transaction History Table */}
                {transactionHistory.length > 0 && (
                  <div className="card mb-3">
                    <div className="card-body">
                      <h6 className="text-muted border-bottom pb-2 mb-3">Transaction History</h6>
                      <div className="table-responsive" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                        <table className="table table-sm table-hover">
                          <thead className="sticky-top bg-light">
                            <tr>
                              <th>Date</th><th>Type</th><th className="text-center">Quantity</th><th>Reason</th><th>By</th>
                            </tr>
                          </thead>
                          <tbody>
                            {transactionHistory.slice(0, 10).map((txn, index) => (
                              <tr key={index}>
                                <td>{formatDate(txn.date)}</td>
                                <td><span className={`badge ${txn.type === 'incoming' ? 'bg-success' : 'bg-warning'}`}>
                                  {txn.type === 'incoming' ? 'Incoming (+)' : 'Outgoing (-)'}</span></td>
                                <td className="text-center">{txn.quantity}</td>
                                <td>{txn.reason}</td>
                                <td>{txn.by?.name || 'System'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                <div className="row g-3">
                  {/* ── NEW: Brand Name field ── */}
                  <div className="col-md-6">
                    <label htmlFor="brandName" className="form-label">Brand Name</label>
                    <div className="input-group">
                      <select className="form-select rounded-0" id="brandName" value={brandName}
                        onChange={(e) => setBrandName(e.target.value)} disabled={brandsLoading}>
                        <option value="">{brandsLoading ? "Loading brands..." : "Select Brand"}</option>
                        {allBrands.map((brand, index) => (
                          <option key={index} value={brand}>{brand}</option>
                        ))}
                      </select>
                      <button type="button" className="btn btn-outline-secondary" onClick={() => setShowAddBrand(true)}>
                        <i className="fa-solid fa-plus"></i>
                      </button>
                    </div>
                    {brandName && (
                      <small className="text-muted mt-1 d-block">
                        <i className="fa fa-info-circle me-1"></i>Currently saved: <strong>{brandName}</strong>
                      </small>
                    )}
                  </div>

                  <div className="col-md-6">
                    <label htmlFor="materialCode" className="form-label">Material Code</label>
                    <input type="text" className="form-control" id="materialCode" name="materialCode"
                      placeholder="Enter Material Code...." maxLength={50} value={formData.materialCode} onChange={handleInputChange} />
                  </div>

                  <div className="col-md-6">
                    <label htmlFor="hsmCode" className="form-label">HSM Code</label>
                    <input type="text" className="form-control" id="hsmCode" name="hsmCode"
                      placeholder="Enter HSM Code...." maxLength={50} value={formData.hsmCode} onChange={handleInputChange} />
                  </div>

                  <div className="col-md-6">
                    <label htmlFor="materialName" className="form-label">Material Description</label>
                    <input type="text" className="form-control" id="materialName" name="materialName"
                      placeholder="Enter Material Description...." maxLength={100} value={formData.materialName} onChange={handleInputChange} />
                  </div>

                  {/* ── NEW: Product Category field ── */}
                  <div className="col-md-6">
                    <label htmlFor="productCategory" className="form-label">Product Category</label>
                    <div className="input-group">
                      <select className="form-select rounded-0" id="productCategory" value={productCategory}
                        onChange={(e) => setProductCategory(e.target.value)}>
                        <option value="">Select Product Category</option>
                        {allCategories.map((cat, index) => (
                          <option key={index} value={cat}>{cat}</option>
                        ))}
                      </select>
                      <button type="button" className="btn btn-outline-secondary" onClick={() => setShowAddCategory(true)}>
                        <i className="fa-solid fa-plus"></i>
                      </button>
                    </div>
                    {productCategory && (
                      <small className="text-muted mt-1 d-block">
                        <i className="fa fa-info-circle me-1"></i>Currently saved: <strong>{productCategory}</strong>
                      </small>
                    )}
                  </div>

                  <div className="col-md-6">
                    <label htmlFor="category" className="form-label">Category</label>
                    <select id="category" className="form-select" name="category"
                      value={formData.category} onChange={handleInputChange}>
                      {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                  </div>

                  <div className="col-md-6">
                    <label htmlFor="unit" className="form-label">Unit</label>
                    <select id="unit" className="form-select" name="unit"
                      value={formData.unit} onChange={handleInputChange}>
                      {units.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>

                  <div className="col-md-6">
                    <label htmlFor="unitPrice" className="form-label">Purchase Price (₹)</label>
                    <input type="number" className="form-control" id="unitPrice" name="unitPrice"
                      placeholder="Enter Purchase Price...." min="0" step="0.01" value={formData.unitPrice} onChange={handleInputChange} />
                  </div>

                  <div className="col-md-6">
                    <label htmlFor="openingDate" className="form-label">Opening Date</label>
                    <input type="date" className="form-control" id="openingDate" name="openingDate"
                      value={formData.openingDate} onChange={handleInputChange} />
                  </div>

                  <div className="col-md-6">
                    <label htmlFor="currentStock" className="form-label">
                      Current Stock
                      {showTransaction && <small className="text-muted"> (Use transaction to update)</small>}
                    </label>
                    <input type="number" className="form-control" id="currentStock" name="currentStock"
                      placeholder="Enter Current Stock...." min="0" value={formData.currentStock}
                      onChange={handleInputChange} disabled={showTransaction} />
                  </div>

                  <div className="col-md-6">
                    <label htmlFor="minStockLevel" className="form-label">Min Stock Level</label>
                    <input type="number" className="form-control" id="minStockLevel" name="minStockLevel"
                      placeholder="Enter Min Stock Level...." min="0" value={formData.minStockLevel} onChange={handleInputChange} />
                  </div>

                  <div className="col-md-6">
                    <label htmlFor="warehouseLocation" className="form-label">Warehouse Location</label>
                    <input type="text" className="form-control" id="warehouseLocation" name="warehouseLocation"
                      placeholder="e.g., Warehouse A" maxLength={100} value={formData.warehouseLocation} onChange={handleInputChange} />
                  </div>

                  <div className="col-md-6">
                    <label htmlFor="stockLocation" className="form-label">Rack Location</label>
                    <input type="text" className="form-control" id="stockLocation" name="stockLocation"
                      placeholder="e.g., Rack 1" maxLength={100} value={formData.stockLocation} onChange={handleInputChange} />
                  </div>

                  <div className="col-12">
                    <label htmlFor="description" className="form-label">Description / Remarks</label>
                    <textarea className="form-control" id="description" name="description"
                      placeholder="Enter material description, specifications, or remarks...."
                      value={formData.description} onChange={handleInputChange}
                      style={{ width: '100%', height: '100px' }} maxLength={500} />
                  </div>
                </div>
              </div>

              <div className="modal-footer border-0 justify-content-start">
                <button type="submit" className="btn addbtn rounded-0 add_button px-4">Update</button>
                <button type="button" className="btn addbtn rounded-0 Cancel_button px-4" onClick={onClose}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Add Category Modal */}
      {showAddCategory && (
        <div className="modal fade show" style={{ display: "block", backgroundColor: "#00000050", position: "absolute", zIndex: 9999, width: "100%" }}>
          <div className="modal-dialog modal-sm">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Add New Category</h5>
                <button type="button" className="btn-close" onClick={() => setShowAddCategory(false)}></button>
              </div>
              <div className="modal-body">
                <input type="text" className="form-control" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="Enter new category" />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddCategory(false)}>Cancel</button>
                <button type="button" className="btn btn-primary" onClick={handleAddNewCategory}>Add</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Brand Modal */}
      {showAddBrand && (
        <div className="modal fade show" style={{ display: "block", backgroundColor: "#00000050", position: "absolute", zIndex: 9999, width: "100%" }}>
          <div className="modal-dialog modal-sm">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Add New Brand</h5>
                <button type="button" className="btn-close" onClick={() => setShowAddBrand(false)}></button>
              </div>
              <div className="modal-body">
                <input type="text" className="form-control" value={newBrand} onChange={(e) => setNewBrand(e.target.value)} placeholder="Enter new brand" />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddBrand(false)}>Cancel</button>
                <button type="button" className="btn btn-primary" onClick={handleAddNewBrand}>Add</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default UpdateInventoryPopup;