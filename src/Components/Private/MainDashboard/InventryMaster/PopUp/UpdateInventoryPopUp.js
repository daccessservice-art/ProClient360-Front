import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { RequiredStar } from "../../../RequiredStar/RequiredStar";

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
    openingDate: new Date().toISOString().split('T')[0], // New field
    description: '',
    // Transaction fields
    transactionType: 'incoming',
    transactionQuantity: '',
    transactionReason: ''
  });

  const [showTransaction, setShowTransaction] = useState(false);
  const [transactionHistory, setTransactionHistory] = useState([]);

  const categories = ['Raw Material', 'Finished Goods', 'Repairing Material', 'Scrap', 'Asset']; // Added 'Asset'
  const units = ['Pcs', 'Kg', 'Ltr', 'Mtr', 'Box', 'Set', 'Pair', 'Roll', 'Sheet', 'Bag'];

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
          new Date().toISOString().split('T')[0], // Handle opening date
        description: selectedInventory.description || '',
        transactionType: 'incoming',
        transactionQuantity: '',
        transactionReason: ''
      });
      
      // Initialize transaction history
      if (selectedInventory.transactions && selectedInventory.transactions.length > 0) {
        setTransactionHistory(selectedInventory.transactions);
      }
    }
  }, [selectedInventory]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const {
      materialCode,
      hsmCode,
      materialName,
      category,
      unit,
      unitPrice,
      currentStock,
      minStockLevel
    } = formData;

    // Validation - Removed required validation as requested
    if (materialCode && parseFloat(unitPrice) < 0) {
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

    // If transaction is being added, validate transaction fields
    if (showTransaction && formData.transactionQuantity) {
      if (parseInt(formData.transactionQuantity) <= 0) {
        toast.error('Transaction quantity must be greater than 0');
        return;
      }

      if (!formData.transactionReason) {
        toast.error('Please provide a reason for the transaction');
        return;
      }

      // Calculate new stock based on transaction
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

      // Update the form data with new stock before sending
      const dataToSend = {
        ...formData,
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
      // Regular update without transaction
      const { transactionType, transactionQuantity, transactionReason, ...updateData } = formData;
      onUpdateInventory(updateData);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString('en-IN', options);
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
                  <button 
                    type="button" 
                    className="btn btn-sm btn-outline-primary me-2"
                    onClick={() => setShowTransaction(!showTransaction)}
                  >
                    {showTransaction ? 'Hide Stock Transaction' : 'Add Stock Transaction'}
                  </button>
                </div>

                {/* Stock Transaction Section */}
                {showTransaction && (
                  <div className="card mb-3">
                    <div className="card-body">
                      <h6
                        className="pb-2 mb-3"
                        style={{
                          color: "#000",
                          borderBottom: "2px solid #000",
                          fontWeight: "600",
                          display: "inline-block",
                        }}
                      >
                        Stock Transaction :-
                      </h6>
                      
                      <div className="row g-3">
                        <div className="col-md-4">
                          <label className="form-label fw-bold">Transaction Type <RequiredStar /></label>
                          <select 
                            className="form-select" 
                            name="transactionType" 
                            value={formData.transactionType} 
                            onChange={handleInputChange}
                          >
                            <option value="incoming">Incoming (+)</option>
                            <option value="outgoing">Outgoing (-)</option>
                          </select>
                        </div>

                        <div className="col-md-4">
                          <label className="form-label fw-bold">Quantity <RequiredStar /></label>
                          <input 
                            type="number" 
                            className="form-control" 
                            name="transactionQuantity" 
                            placeholder="Enter quantity...." 
                            min="1"
                            value={formData.transactionQuantity} 
                            onChange={handleInputChange} 
                          />
                        </div>

                        <div className="col-md-4">
                          <label className="form-label fw-bold">Current Stock</label>
                          <input 
                            type="text" 
                            className="form-control" 
                            value={`${formData.currentStock} ${formData.unit}`}
                            disabled
                          />
                        </div>

                        <div className="col-12">
                          <label className="form-label fw-bold">Reason / Remarks <RequiredStar /></label>
                          <textarea 
                            className="form-control" 
                            name="transactionReason"
                            placeholder="e.g., Purchase from supplier, Used in production, Returned material, etc..." 
                            rows="2"
                            maxLength={200}
                            value={formData.transactionReason} 
                            onChange={handleInputChange}
                          />
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
                              <th>Date</th>
                              <th>Type</th>
                              <th className="text-center">Quantity</th>
                              <th>Reason</th>
                              <th>By</th>
                            </tr>
                          </thead>
                          <tbody>
                            {transactionHistory.slice(0, 10).map((txn, index) => (
                              <tr key={index}>
                                <td>{formatDate(txn.date)}</td>
                                <td>
                                  <span className={`badge ${txn.type === 'incoming' ? 'bg-success' : 'bg-warning'}`}>
                                    {txn.type === 'incoming' ? 'Incoming (+)' : 'Outgoing (-)'}
                                  </span>
                                </td>
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
                  {/* Material Code */}
                  <div className="col-md-6">
                    <label htmlFor="materialCode" className="form-label">Material Code</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      id="materialCode" 
                      name="materialCode" 
                      placeholder="Enter Material Code...." 
                      maxLength={50} 
                      value={formData.materialCode} 
                      onChange={handleInputChange} 
                    />
                  </div>
                     
                  {/* HSM Code */}
                  <div className="col-md-6">
                    <label htmlFor="hsmCode" className="form-label">HSM Code</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      id="hsmCode" 
                      name="hsmCode" 
                      placeholder="Enter HSM Code...." 
                      maxLength={50} 
                      value={formData.hsmCode} 
                      onChange={handleInputChange} 
                    />
                  </div>

                  {/* Material Description */}
                  <div className="col-md-6">
                    <label htmlFor="materialName" className="form-label">Material Description</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      id="materialName" 
                      name="materialName" 
                      placeholder="Enter Material Description...." 
                      maxLength={100} 
                      value={formData.materialName} 
                      onChange={handleInputChange} 
                    />
                  </div>

                  {/* Category */}
                  <div className="col-md-6">
                    <label htmlFor="category" className="form-label">Category</label>
                    <select 
                      id="category" 
                      className="form-select" 
                      name="category" 
                      value={formData.category} 
                      onChange={handleInputChange}
                    >
                      {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                  </div>

                  {/* Unit */}
                  <div className="col-md-6">
                    <label htmlFor="unit" className="form-label">Unit</label>
                    <select 
                      id="unit" 
                      className="form-select" 
                      name="unit" 
                      value={formData.unit} 
                      onChange={handleInputChange}
                    >
                      {units.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>

                  {/* Purchase Price */}
                  <div className="col-md-6">
                    <label htmlFor="unitPrice" className="form-label">Purchase Price (₹)</label>
                    <input 
                      type="number" 
                      className="form-control" 
                      id="unitPrice" 
                      name="unitPrice" 
                      placeholder="Enter Purchase Price...." 
                      min="0"
                      step="0.01"
                      value={formData.unitPrice} 
                      onChange={handleInputChange} 
                    />
                  </div>

                  {/* Opening Date - New Field */}
                  <div className="col-md-6">
                    <label htmlFor="openingDate" className="form-label">Opening Date</label>
                    <input 
                      type="date" 
                      className="form-control" 
                      id="openingDate" 
                      name="openingDate" 
                      value={formData.openingDate} 
                      onChange={handleInputChange} 
                    />
                  </div>

                  {/* Current Stock - Only editable if NOT using transaction */}
                  <div className="col-md-6">
                    <label htmlFor="currentStock" className="form-label">
                      Current Stock
                      {showTransaction && <small className="text-muted"> (Use transaction to update)</small>}
                    </label>
                    <input 
                      type="number" 
                      className="form-control" 
                      id="currentStock" 
                      name="currentStock" 
                      placeholder="Enter Current Stock...." 
                      min="0"
                      value={formData.currentStock} 
                      onChange={handleInputChange} 
                      disabled={showTransaction}
                    />
                  </div>

                  {/* Min Stock Level */}
                  <div className="col-md-6">
                    <label htmlFor="minStockLevel" className="form-label">Min Stock Level</label>
                    <input 
                      type="number" 
                      className="form-control" 
                      id="minStockLevel" 
                      name="minStockLevel" 
                      placeholder="Enter Min Stock Level...." 
                      min="0"
                      value={formData.minStockLevel} 
                      onChange={handleInputChange} 
                    />
                  </div>

                  {/* Warehouse Location */}
                  <div className="col-md-6">
                    <label htmlFor="warehouseLocation" className="form-label">Warehouse Location</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      id="warehouseLocation" 
                      name="warehouseLocation" 
                      placeholder="e.g., Warehouse A" 
                      maxLength={100} 
                      value={formData.warehouseLocation} 
                      onChange={handleInputChange} 
                    />
                  </div>

                  {/* Rack Location */}
                  <div className="col-md-6">
                    <label htmlFor="stockLocation" className="form-label">Rack Location</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      id="stockLocation" 
                      name="stockLocation" 
                      placeholder="e.g., Rack 1" 
                      maxLength={100} 
                      value={formData.stockLocation} 
                      onChange={handleInputChange} 
                    />
                  </div>

                  {/* Description */}
                  <div className="col-12">
                    <label htmlFor="description" className="form-label">Description / Remarks</label>
                    <textarea
                      className="form-control"
                      id="description"
                      name="description"
                      placeholder="Enter material description, specifications, or remarks...."
                      value={formData.description}
                      onChange={handleInputChange}
                      style={{ width: '100%', height: '100px' }}
                      maxLength={500}
                    />
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
    </>
  );
};

export default UpdateInventoryPopup;