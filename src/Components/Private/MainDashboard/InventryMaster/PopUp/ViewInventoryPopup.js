import React from 'react';
import { formatDateTimeForDisplay } from '../../../../../utils/formatDate';

const ViewInventoryPopup = ({ selectedInventory, onClose }) => {
  if (!selectedInventory) return null;

  return (
    <>
      <div className="modal fade show" style={{ display: "flex", alignItems: "center", backgroundColor: "#00000090" }}>
        <div className="modal-dialog modal-xl">
          <div className="modal-content p-3">
            <div className="modal-header pt-0">
              <h5 className="card-title fw-bold">Inventory Details</h5>
              <button onClick={onClose} type="button" className="btn-close" aria-label="Close" style={{ backgroundColor: 'red' }}></button>
            </div>

            <div className="modal-body" style={{ maxHeight: 'calc(80vh - 240px)', overflowY: 'auto' }}>
              <div className="row g-3">
                {/* Product Name */}
                <div className="col-md-6">
                  <label className="form-label fw-bold">Product Name</label>
                  <p className="form-control-plaintext">{selectedInventory.productName || 'N/A'}</p>
                </div>

                {/* Brand Name */}
                <div className="col-md-6">
                  <label className="form-label fw-bold">Brand Name</label>
                  <p className="form-control-plaintext">{selectedInventory.brandName || 'N/A'}</p>
                </div>

                {/* Material Code */}
                <div className="col-md-6">
                  <label className="form-label fw-bold">Material Code</label>
                  <p className="form-control-plaintext">{selectedInventory.materialCode || 'N/A'}</p>
                </div>

                {/* Model */}
                <div className="col-md-6">
                  <label className="form-label fw-bold">Model</label>
                  <p className="form-control-plaintext">{selectedInventory.model || 'N/A'}</p>
                </div>

                {/* HSN Code */}
                <div className="col-md-6">
                  <label className="form-label fw-bold">HSN Code</label>
                  <p className="form-control-plaintext">{selectedInventory.hsnCode || 'N/A'}</p>
                </div>

                {/* Material Description */}
                <div className="col-md-6">
                  <label className="form-label fw-bold">Material Description</label>
                  <p className="form-control-plaintext">{selectedInventory.materialName || 'N/A'}</p>
                </div>

                {/* Product Category */}
                <div className="col-md-6">
                  <label className="form-label fw-bold">Product Category</label>
                  <p className="form-control-plaintext">{selectedInventory.productCategory || 'N/A'}</p>
                </div>

                {/* Product Group */}
                <div className="col-md-6">
                  <label className="form-label fw-bold">Product Group</label>
                  <p className="form-control-plaintext">{selectedInventory.category || 'N/A'}</p>
                </div>

                {/* Base UOM */}
                <div className="col-md-6">
                  <label className="form-label fw-bold">Base UOM / UNIT</label>
                  <p className="form-control-plaintext">{selectedInventory.baseUOM || selectedInventory.unit || 'N/A'}</p>
                </div>

                {/* UOM Conversion */}
                <div className="col-md-6">
                  <label className="form-label fw-bold">UOM Conversion</label>
                  <p className="form-control-plaintext">{selectedInventory.uomConversion || 'N/A'}</p>
                </div>

                {/* Purchase Price */}
                <div className="col-md-6">
                  <label className="form-label fw-bold">Purchase Price</label>
                  <p className="form-control-plaintext">₹{selectedInventory.unitPrice || '0'}</p>
                </div>

                {/* MRP Price */}
                <div className="col-md-6">
                  <label className="form-label fw-bold">MRP Price</label>
                  <p className="form-control-plaintext">₹{selectedInventory.mrp || '0'}</p>
                </div>

                {/* Sales Price */}
                <div className="col-md-6">
                  <label className="form-label fw-bold">Sales Price</label>
                  <p className="form-control-plaintext">₹{selectedInventory.salesPrice || '0'}</p>
                </div>

                {/* Opening Date - New Field */}
                <div className="col-md-6">
                  <label className="form-label fw-bold">Opening Date</label>
                  <p className="form-control-plaintext">{selectedInventory.openingDate ? formatDateTimeForDisplay(selectedInventory.openingDate) : 'N/A'}</p>
                </div>

                {/* Opening / Current Stock */}
                <div className="col-md-6">
                  <label className="form-label fw-bold">Opening Stock</label>
                  <p className="form-control-plaintext">{selectedInventory.currentStock || '0'}</p>
                </div>

                {/* Min Stock Level */}
                <div className="col-md-6">
                  <label className="form-label fw-bold">Min Stock Level</label>
                  <p className="form-control-plaintext">{selectedInventory.minStockLevel || '0'}</p>
                </div>

                {/* Warehouse Location */}
                <div className="col-md-6">
                  <label className="form-label fw-bold">Warehouse Location</label>
                  <p className="form-control-plaintext">{selectedInventory.warehouseLocation || 'N/A'}</p>
                </div>

                {/* Rack Location */}
                <div className="col-md-6">
                  <label className="form-label fw-bold">Rack Location</label>
                  <p className="form-control-plaintext">{selectedInventory.stockLocation || 'N/A'}</p>
                </div>

                {/* Discount Type */}
                <div className="col-md-6">
                  <label className="form-label fw-bold">Discount Type</label>
                  <p className="form-control-plaintext">{selectedInventory.discountType || 'N/A'}</p>
                </div>

                {/* Discount Value */}
                <div className="col-md-6">
                  <label className="form-label fw-bold">Discount Value</label>
                  <p className="form-control-plaintext">{selectedInventory.discountValue || '0'}</p>
                </div>

                {/* Tax Details Section */}
                <div className="col-12 mt-3">
                  <div className="border bg-gray mx-auto p-3">
                    <div className="col-10 mb-3">
                      <span className="fw-bold">Tax Details</span>
                    </div>
                    
                    <div className="row">
                      <div className="col-md-6">
                        <label className="form-label">Tax Type</label>
                        <p className="form-control-plaintext">{selectedInventory.taxType || 'none'}</p>
                      </div>

                      {selectedInventory.taxType === "gst" && (
                        <>
                          <div className="col-md-6">
                            <label className="form-label">GST Rate</label>
                            <p className="form-control-plaintext">{selectedInventory.gstRate || '0'}%</p>
                          </div>

                          <div className="col-md-6">
                            <label className="form-label">GST Effective Date</label>
                            <p className="form-control-plaintext">{selectedInventory.gstEffectiveDate ? formatDateTimeForDisplay(selectedInventory.gstEffectiveDate) : 'N/A'}</p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div className="col-12">
                  <label className="form-label fw-bold">Description / Remarks</label>
                  <p className="form-control-plaintext">{selectedInventory.description || 'N/A'}</p>
                </div>

                {/* Added Date */}
                <div className="col-md-6">
                  <label className="form-label fw-bold">Added Date</label>
                  <p className="form-control-plaintext">{selectedInventory.createdAt ? formatDateTimeForDisplay(selectedInventory.createdAt) : 'N/A'}</p>
                </div>

                {/* Last Updated Date */}
                <div className="col-md-6">
                  <label className="form-label fw-bold">Last Updated</label>
                  <p className="form-control-plaintext">{selectedInventory.updatedAt ? formatDateTimeForDisplay(selectedInventory.updatedAt) : 'N/A'}</p>
                </div>
              </div>
            </div>
            
            <div className="modal-footer border-0 justify-content-start">
              <button type="button" className="btn addbtn rounded-0 Cancel_button px-4" onClick={onClose}>Close</button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ViewInventoryPopup;