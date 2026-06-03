import { useState } from "react";
import { formatDate } from "../../../utils/formatDate";

const ViewProductPopUp = ({ closePopUp, selectedProduct }) => {
  const [product, setProduct] = useState(selectedProduct);

  const hasTaxDetails = product && (
    product.taxType || 
    product.gstRate || 
    product.gstEffectiveDate || 
    product.cessPercentage || 
    product.cessAmount
  );

  return (
    <>
      <div
        className="modal fade show"
        style={{
          display: "flex",
          alignItems: "center",
          backgroundColor: "#00000090",
        }}
      >
        <div className="modal-dialog modal_widthhh_details modal-xl">
          <div className="modal-content p-3">
            <div className="modal-header pt-0">
              <h5 className="card-title fw-bold" id="exampleModalLongTitle">
                Product Details
              </h5>
              <button
                onClick={() => closePopUp()}
                type="button"
                className="close px-3"
                style={{ marginLeft: "auto" }}
              >
                <span aria-hidden="true">&times;</span>
              </button>
            </div>
            <div className="modal-body">
              <div className="row modal_body_height_details">
                <div className="row">
                  <div className="col-sm- col-md col-lg">
                    <h6>
                      <p className="fw-bold ">Product Name:</p>
                      {product?.productName || "-"}
                    </h6>
                    <h6>
                      <p className="fw-bold mt-3 ">Brand Name:</p>
                      {product?.brandName || "-"}
                    </h6>
                    <h6>
                      <p className="fw-bold mt-3">Print Name:</p>
                      {product?.printName || "-"}
                    </h6>
                    <h6>
                      <p className="fw-bold mt-3">Alias Name:</p>
                      {product?.aliasName || "-"}
                    </h6>
                    <h6>
                      <p className="fw-bold mt-3">Model:</p>
                      {product?.model || "-"}
                    </h6>
                    <h6>
                      <p className="fw-bold mt-3">HSN Code:</p>
                      {product?.hsnCode || "-"}
                    </h6>
                    <h6>
                      <p className="fw-bold mt-3">Product Category:</p>
                      {product?.productCategory || "-"}
                    </h6>
                  </div>
                  <div className="col-sm- col-md col-lg">
                    <p className="fw-bold">Base UOM:</p>
                    {product?.baseUOM || "-"}
                    <p className="fw-bold mt-3">Alternate UOM:</p>
                    {product?.alternateUOM || "-"}
                    <p className="fw-bold mt-3">UOM Conversion:</p>
                    {product?.uomConversion || 1}
                    <p className="fw-bold mt-3">Category:</p>
                    <span className={`badge bg-primary`}>
                      {product?.category || "-"}
                    </span>
                    <p className="fw-bold mt-3">MRP:</p>
                    {product?.mrp || "-"}
                    <p className="fw-bold mt-3">Sales Price:</p>
                    {product?.salesPrice || "-"}
                    <p className="fw-bold mt-3">Purchase Price:</p>
                    {product?.purchasePrice || "-"}
                    <p className="fw-bold mt-3">Min. Sales Price:</p>
                    {product?.minSalesPrice || "-"}
                    <p className="fw-bold mt-3">Min. Qty Level:</p>
                    {product?.minQtyLevel || "-"}

                    {/* ✅ NEW: Current Stock Qty */}
                    <p className="fw-bold mt-3">Current Stock Qty.:</p>
                    <span
                      style={{
                        fontWeight: 700,
                        fontSize: "0.95rem",
                        color:
                          (product?.currentStockQty || 0) > 0
                            ? "#1e40af"
                            : product?.minQtyLevel > 0 &&
                              (product?.currentStockQty || 0) <= product?.minQtyLevel
                            ? "#dc2626"
                            : "#6b7280",
                      }}
                    >
                      {product?.currentStockQty != null ? product.currentStockQty : 0}
                      {product?.baseUOM && (
                        <small style={{ fontWeight: 400, fontSize: "0.75rem", marginLeft: 4 }}>
                          {product.baseUOM}
                        </small>
                      )}
                    </span>

                    <p className="fw-bold mt-3">Discount Type:</p>
                    <span className={`badge ${
                      product?.discountType === 'Zero Discount' ? 'bg-secondary' : 
                      product?.discountType === 'In percentage' ? 'bg-info' : 'bg-warning'
                    }`}>
                      {product?.discountType || "-"}
                    </span>
                    <p className="fw-bold mt-3">Discount Value:</p>
                    {product?.discountValue || 0}
                    <p className="fw-bold mt-3">Created At:</p>
                    {product?.createdAt ? formatDate(product.createdAt) : "-"}
                    <p className="fw-bold mt-3">Updated At:</p>
                    {product?.updatedAt ? formatDate(product.updatedAt) : "-"}
                  </div>
                </div>
                
                {product?.description && (
                  <div className="row mt-3">
                    <div className="col-12">
                      <h6 className="fw-bold">Description:</h6>
                      <p>{product.description}</p>
                    </div>
                  </div>
                )}

                {hasTaxDetails && (
                  <div className="row mt-3">
                    <div className="col-12">
                      <h6 className="fw-bold">Tax Details:</h6>
                      <div className="row">
                        <div className="col-md-6">
                          <p className="fw-bold mb-1">Tax Type:</p>
                          <span className={`badge ${
                            product?.taxType === 'none' ? 'bg-secondary' : 
                            product?.taxType === 'gst' ? 'bg-info' : 'bg-warning'
                          }`}>
                            {product?.taxType === 'none' ? 'No Tax' : 
                             product?.taxType === 'gst' ? 'GST' : 'CESS'}
                          </span>
                        </div>
                        
                        {product?.taxType === 'gst' && (
                          <>
                            <div className="col-md-6">
                              <p className="fw-bold mb-1">GST Rate:</p>
                              <p>{product?.gstRate || 0}%</p>
                            </div>
                            <div className="col-md-6">
                              <p className="fw-bold mb-1">GST Effective Date:</p>
                              <p>{product?.gstEffectiveDate ? formatDate(product.gstEffectiveDate) : "-"}</p>
                            </div>
                          </>
                        )}
                        
                        {product?.taxType === 'cess' && (
                          <>
                            <div className="col-md-6">
                              <p className="fw-bold mb-1">CESS Percentage:</p>
                              <p>{product?.cessPercentage || 0}%</p>
                            </div>
                            <div className="col-md-6">
                              <p className="fw-bold mb-1">CESS Amount:</p>
                              <p>₹{product?.cessAmount || 0}</p>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ViewProductPopUp;