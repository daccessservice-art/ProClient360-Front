import { useState, useEffect } from "react";
import { formatDate } from "../../../utils/formatDate";
import { getPurchaseOrderHistory } from "../../../hooks/usePurchaseOrder";

const ViewPurchaseOrderPopUp = ({ closePopUp, selectedPO }) => {
  const [purchaseOrder, setPurchaseOrder] = useState(selectedPO);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [activeTab, setActiveTab] = useState('details');

  // Calculate retention percentage
  const calculateRetention = () => {
    if (!purchaseOrder?.paymentTerms) return 0;
    
    const { advance = 0, payAgainstDelivery = 0, payAfterCompletion = 0 } = purchaseOrder.paymentTerms;
    const retentionValue = 100 - (Number(advance) + Number(payAgainstDelivery) + Number(payAfterCompletion));
    return retentionValue >= 0 ? retentionValue : 0;
  };

  useEffect(() => {
    const fetchHistory = async () => {
      if (selectedPO && selectedPO._id) {
        setLoadingHistory(true);
        try {
          const data = await getPurchaseOrderHistory(selectedPO._id);
          if (data.success) {
            setHistory(data.history);
          }
        } catch (error) {
          console.error("Error fetching purchase order history:", error);
        } finally {
          setLoadingHistory(false);
        }
      }
    };

    fetchHistory();
  }, [selectedPO]);

  const getUpdateTypeBadgeClass = (updateType) => {
    switch(updateType) {
      case 'CREATE': return 'bg-success';
      case 'UPDATE': return 'bg-info';
      case 'STATUS_CHANGE': return 'bg-warning';
      case 'PAYMENT_TERMS_UPDATE': return 'bg-primary';
      case 'ITEM_ADD': return 'bg-primary';
      case 'ITEM_REMOVE': return 'bg-danger';
      case 'ITEM_UPDATE': return 'bg-secondary';
      default: return 'bg-secondary';
    }
  };

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
                Purchase Order Details
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
            
            <ul className="nav nav-tabs">
              <li className="nav-item">
                <button 
                  className={`nav-link ${activeTab === 'details' ? 'active' : ''}`}
                  onClick={() => setActiveTab('details')}
                >
                  Details
                </button>
              </li>
              <li className="nav-item">
                <button 
                  className={`nav-link ${activeTab === 'history' ? 'active' : ''}`}
                  onClick={() => setActiveTab('history')}
                >
                  Update History
                </button>
              </li>
            </ul>
            
            <div className="modal-body">
              {activeTab === 'details' ? (
                <div className="row modal_body_height_details">
                  <div className="row">
                    <div className="col-sm- col-md col-lg">
                      <h6>
                        <p className="fw-bold ">Order Number:</p>
                        {purchaseOrder?.orderNumber || "-"}
                      </h6>
                      <h6>
                        <p className="fw-bold mt-3 ">Order Date:</p>
                        {purchaseOrder?.orderDate ? formatDate(purchaseOrder.orderDate) : "-"}
                      </h6>
                      <h6>
                        <p className="fw-bold mt-3">Vendor Name:</p>
                        {purchaseOrder?.vendor?.vendorName || "-"}
                      </h6>
                      <h6>
                        <p className="fw-bold mt-3">Transaction Type:</p>
                        <span className={`badge ${
                          purchaseOrder?.transactionType === 'B2B' ? 'bg-primary' : 
                          purchaseOrder?.transactionType === 'SEZ' ? 'bg-success' :
                          purchaseOrder?.transactionType === 'Import' ? 'bg-info' : 'bg-warning'
                        }`}>
                          {purchaseOrder?.transactionType || "-"}
                        </span>
                      </h6>
                      <h6>
                        <p className="fw-bold mt-3">Purchase Type:</p>
                        <span className={`badge ${
                          purchaseOrder?.purchaseType === 'Project Purchase' ? 'bg-primary' : 'bg-secondary'
                        }`}>
                          {purchaseOrder?.purchaseType || "-"}
                        </span>
                      </h6>
                      <h6>
                        <p className="fw-bold mt-3">Status:</p>
                        <span className={`badge ${
                          purchaseOrder?.status === 'Pending' ? 'bg-warning' : 
                          purchaseOrder?.status === 'Approved' ? 'bg-info' :
                          purchaseOrder?.status === 'Partially Received' ? 'bg-primary' :
                          purchaseOrder?.status === 'Received' ? 'bg-success' : 'bg-danger'
                        }`}>
                          {purchaseOrder?.status || "-"}
                        </span>
                      </h6>
                      {purchaseOrder?.purchaseType === "Project Purchase" && (
                        <h6>
                          <p className="fw-bold mt-3">Project Name:</p>
                          {purchaseOrder?.project?.name || "-"}
                        </h6>
                      )}
                      {purchaseOrder?.purchaseType === "Stock" && (
                        <h6>
                          <p className="fw-bold mt-3">Warehouse Location:</p>
                          {purchaseOrder?.warehouseLocation || "-"}
                        </h6>
                      )}
                    </div>
                    <div className="col-sm- col-md col-lg">
                      <h6>
                        <p className="fw-bold">Delivery Address:</p>
                        {purchaseOrder?.deliveryAddress || "-"}
                      </h6>
                      <h6>
                        <p className="fw-bold mt-3">Location:</p>
                        {purchaseOrder?.location || "-"}
                      </h6>
                      <p className="fw-bold mt-3">Total Amount:</p>
                      ₹{purchaseOrder?.totalAmount?.toFixed(2) || "0.00"}
                      <p className="fw-bold mt-3">Total Tax:</p>
                      ₹{purchaseOrder?.totalTax?.toFixed(2) || "0.00"}
                      <p className="fw-bold mt-3">Grand Total:</p>
                      ₹{purchaseOrder?.grandTotal?.toFixed(2) || "0.00"}
                      <p className="fw-bold mt-3">Delivery Date:</p>
                      {purchaseOrder?.deliveryDate ? formatDate(purchaseOrder.deliveryDate) : "-"}
                      <p className="fw-bold mt-3">Material Followup Date:</p>
                      {purchaseOrder?.materialFollowupDate ? formatDate(purchaseOrder.materialFollowupDate) : "-"}
                      <p className="fw-bold mt-3">Credit Period:</p>
                      {purchaseOrder?.paymentTerms?.creditPeriod || 0} days
                      <p className="fw-bold mt-3">Payment Terms:</p>
                      <div className="ms-3">
                        <div>Advance: {purchaseOrder?.paymentTerms?.advance || 0}%</div>
                        <div>Against Delivery: {purchaseOrder?.paymentTerms?.payAgainstDelivery || 0}%</div>
                        <div>After Completion: {purchaseOrder?.paymentTerms?.payAfterCompletion || 0}%</div>
                        <div>Retention: {calculateRetention()}%</div>
                      </div>
                      <p className="fw-bold mt-3">Created At:</p>
                      {purchaseOrder?.createdAt ? formatDate(purchaseOrder.createdAt) : "-"}
                      <p className="fw-bold mt-3">Updated At:</p>
                      {purchaseOrder?.updatedAt ? formatDate(purchaseOrder.updatedAt) : "-"}
                    </div>
                  </div>
                  
                  {purchaseOrder?.remark && (
                    <div className="row mt-3">
                      <div className="col-12">
                        <h6 className="fw-bold">Remark:</h6>
                        <p>{purchaseOrder.remark}</p>
                      </div>
                    </div>
                  )}

                  <div className="row mt-3">
                    <div className="col-12">
                      <h6 className="fw-bold">Items:</h6>
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
                              <th>Price</th>
                              <th>Discount %</th>
                              <th>Tax %</th>
                              <th>Net Value</th>
                            </tr>
                          </thead>
                          <tbody>
                            {purchaseOrder?.items?.map((item, index) => (
                              <tr key={index}>
                                <td>{item.brandName}</td>
                                <td>{item.modelNo}</td>
                                <td>{item.description || "-"}</td>
                                <td>{item.unit || "-"}</td>
                                <td>{item.baseUOM || "-"}</td>
                                <td>{item.quantity}</td>
                                <td>₹{item.price.toFixed(2)}</td>
                                <td>{item.discountPercent}%</td>
                                <td>{item.taxPercent}%</td>
                                <td>₹{item.netValue.toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  {purchaseOrder?.attachments && purchaseOrder.attachments.length > 0 && (
                    <div className="row mt-3">
                      <div className="col-12">
                        <h6 className="fw-bold">Terms & Conditions Document:</h6>
                        {purchaseOrder.attachments.map((attachment, index) => (
                          <div key={index} className="mb-2">
                            <a 
                              href={attachment} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="btn btn-sm btn-outline-primary"
                            >
                              <i className="fa-solid fa-file-pdf me-2"></i>
                              View Document {index + 1}
                            </a>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="row modal_body_height_details">
                  <div className="col-12">
                    <h6 className="fw-bold mb-3">Update History</h6>
                    
                    {loadingHistory ? (
                      <div className="text-center py-4">
                        <div className="spinner-border text-primary" role="status">
                          <span className="visually-hidden">Loading...</span>
                        </div>
                      </div>
                    ) : history.length === 0 ? (
                      <div className="alert alert-info">
                        No update history available for this purchase order.
                      </div>
                    ) : (
                      <div className="table-responsive">
                        <table className="table table-bordered">
                          <thead>
                            <tr>
                              <th>Date & Time</th>
                              <th>Updated By</th>
                              <th>Update Type</th>
                              <th>Description</th>
                              <th>Details</th>
                            </tr>
                          </thead>
                          <tbody>
                            {history.map((record, index) => (
                              <tr key={index}>
                                <td>{formatDate(record.createdAt)}</td>
                                <td>{record.updatedBy?.name || "-"}</td>
                                <td>
                                  <span className={`badge ${getUpdateTypeBadgeClass(record.updateType)}`}>
                                    {record.updateType.replace('_', ' ')}
                                  </span>
                                </td>
                                <td>{record.description}</td>
                                <td>
                                  {record.changes?.priceChanged && record.changes.priceChangeDetails && (
                                    <div>
                                      <strong>Price Changes:</strong>
                                      <ul className="mb-0 ps-3">
                                        {record.changes.priceChangeDetails.map((change, idx) => (
                                          <li key={idx}>
                                            {change.brandName} - {change.modelNo}: 
                                            ₹{change.previousPrice.toFixed(2)} → ₹{change.newPrice.toFixed(2)} 
                                            ({change.changePercent > 0 ? '+' : ''}{change.changePercent}%)
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                  
                                  {record.changes?.statusChanged && (
                                    <div className="mt-2">
                                      <strong>Status Change:</strong> {record.previousValues.status} → {record.newValues.status}
                                    </div>
                                  )}
                                  
                                  {record.changes?.paymentTermsChanged && (
                                    <div className="mt-2">
                                      <strong>Payment Terms Updated</strong>
                                      <div className="ms-3">
                                        <div>Advance: {record.previousValues.paymentTerms?.advance || 0}% → {record.newValues.paymentTerms?.advance || 0}%</div>
                                        <div>Against Delivery: {record.previousValues.paymentTerms?.payAgainstDelivery || 0}% → {record.newValues.paymentTerms?.payAgainstDelivery || 0}%</div>
                                        <div>After Completion: {record.previousValues.paymentTerms?.payAfterCompletion || 0}% → {record.newValues.paymentTerms?.payAfterCompletion || 0}%</div>
                                        <div>Credit Period: {record.previousValues.paymentTerms?.creditPeriod || 0} days → {record.newValues.paymentTerms?.creditPeriod || 0} days</div>
                                      </div>
                                    </div>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ViewPurchaseOrderPopUp;