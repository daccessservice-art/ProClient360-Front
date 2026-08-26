import { useState, useEffect, useMemo, useCallback } from "react";
import toast from "react-hot-toast";
import { getCustomers } from "../../../../../hooks/useCustomer";
import { getApprovedCampaignTemplates, sendCampaign, searchCustomersByProduct, parseRecipientFile, sendCampaignToNumbers } from "../../../../../hooks/useCampaign";

// Usage: <SendCampaignPopUp handleClose={...} onSent={...} />
// Lets the user pick a Meta-approved product template, then search/select
// customers from the Customer Master to send it to.
const SendCampaignPopUp = ({ handleClose, onSent }) => {
  const [templates, setTemplates] = useState([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");

  const [customers, setCustomers] = useState([]);
  const [customersLoading, setCustomersLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({ totalPages: 0, hasNextPage: false, hasPrevPage: false });

  const [checkedIds, setCheckedIds] = useState(new Set());
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);
  const [selectingAllPages, setSelectingAllPages] = useState(false);

  // ── NEW: mode toggle between the 3 ways to pick recipients ──
  const [recipientMode, setRecipientMode] = useState("customer"); // "customer" | "product" | "upload"

  // NEW — Search by Product tab
  const [productSearchText, setProductSearchText] = useState("");
  const [productResults, setProductResults] = useState([]);
  const [productSearchLoading, setProductSearchLoading] = useState(false);
  const [productChecked, setProductChecked] = useState(new Set());

  // NEW — Upload File tab
  const [uploadedRecipients, setUploadedRecipients] = useState([]); // [{name, phone}]
  const [uploadChecked, setUploadChecked] = useState(new Set()); // indices into uploadedRecipients
  const [fileParsing, setFileParsing] = useState(false);

  const itemsPerPage = 40;

  useEffect(() => {
    const fetchTemplates = async () => {
      setTemplatesLoading(true);
      const data = await getApprovedCampaignTemplates();
      if (data?.success) setTemplates(data.templates || []);
      setTemplatesLoading(false);
    };
    fetchTemplates();
  }, []);

  const fetchCustomers = useCallback(async () => {
    setCustomersLoading(true);
    const data = await getCustomers(currentPage, itemsPerPage, search);
    if (data?.success) {
      setCustomers(data.customers || []);
      setPagination(data.pagination || {});
    }
    setCustomersLoading(false);
  }, [currentPage, search]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const eligibleOnPage = useMemo(() => customers.filter((c) => c.phoneNumber1), [customers]);

  const handleOnSearchSubmit = (event) => {
    event.preventDefault();
    setSearch(searchText);
    setCurrentPage(1);
  };

  const toggleCustomer = (id) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAllOnPage = () => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      const allChecked = eligibleOnPage.every((c) => next.has(c._id));
      if (allChecked) {
        eligibleOnPage.forEach((c) => next.delete(c._id));
      } else {
        eligibleOnPage.forEach((c) => next.add(c._id));
      }
      return next;
    });
  };

  // NEW — selects every customer matching the current search across ALL
  // pages in one go, not just the currently-visible page. Fetches with a
  // very high limit so everything comes back in a single request.
  const selectAllAcrossPages = async () => {
    setSelectingAllPages(true);
    try {
      const data = await getCustomers(1, 10000, search);
      if (data?.success) {
        const allMatching = (data.customers || []).filter((c) => c.phoneNumber1);
        setCheckedIds(new Set(allMatching.map((c) => c._id)));
        toast.success(`Selected ${allMatching.length} customer${allMatching.length === 1 ? "" : "s"} across all pages`);
      } else {
        toast.error("Failed to select all customers");
      }
    } catch (error) {
      toast.error("Error selecting all customers");
    } finally {
      setSelectingAllPages(false);
    }
  };

  const clearAllSelection = () => {
    setCheckedIds(new Set());
  };

  // ── NEW: Search by Product handlers ──
  const handleProductSearch = async (e) => {
    e.preventDefault();
    if (!productSearchText.trim()) return;
    setProductSearchLoading(true);
    try {
      const data = await searchCustomersByProduct(productSearchText.trim());
      if (data?.success) {
        setProductResults(data.customers || []);
        setProductChecked(new Set()); // reset selection on new search
        if ((data.customers || []).length === 0) toast("No customers found for this product.");
      } else {
        toast.error(data?.error || "Search failed");
      }
    } catch (error) {
      toast.error("Error searching by product");
    } finally {
      setProductSearchLoading(false);
    }
  };

  const toggleProductCustomer = (id) => {
    setProductChecked((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAllProductResults = () => {
    setProductChecked((prev) => {
      const eligible = productResults.filter((c) => c.phoneNumber1);
      const allChecked = eligible.every((c) => prev.has(c._id));
      const next = new Set(prev);
      if (allChecked) {
        eligible.forEach((c) => next.delete(c._id));
      } else {
        eligible.forEach((c) => next.add(c._id));
      }
      return next;
    });
  };

  // ── NEW: Upload File handlers ──
  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileParsing(true);
    try {
      const data = await parseRecipientFile(file);
      if (data?.success) {
        setUploadedRecipients(data.recipients || []);
        setUploadChecked(new Set((data.recipients || []).map((_, i) => i))); // select all by default
        toast.success(`Found ${data.recipients.length} recipient(s) in the file`);
      } else {
        toast.error(data?.error || "Failed to read file");
      }
    } catch (error) {
      toast.error("Error reading file");
    } finally {
      setFileParsing(false);
      e.target.value = "";
    }
  };

  const toggleUploadRecipient = (i) => {
    setUploadChecked((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  };

  const handleSend = async () => {
    if (!selectedTemplateId) {
      toast.error("Select a product template first.");
      return;
    }

    // ── NEW: Upload File mode ──
    if (recipientMode === "upload") {
      const selectedRecipients = uploadedRecipients.filter((_, i) => uploadChecked.has(i));
      if (selectedRecipients.length === 0) {
        toast.error("Select at least one recipient from the uploaded file.");
        return;
      }
      setSending(true);
      try {
        toast.loading(`Sending to ${selectedRecipients.length} recipient(s)...`);
        const data = await sendCampaignToNumbers(selectedTemplateId, selectedRecipients);
        toast.dismiss();
        if (data?.success) {
          toast.success(data.message);
          setResult(data.log);
          onSent && onSent(data.log);
        } else {
          toast.error(data?.error || "Failed to send campaign");
        }
      } catch (error) {
        toast.dismiss();
        toast.error("Error sending campaign");
      } finally {
        setSending(false);
      }
      return;
    }

    // ── NEW: Search by Product mode — still uses the same sendCampaign
    // endpoint as Customer Master, since these are real customer IDs ──
    if (recipientMode === "product") {
      if (productChecked.size === 0) {
        toast.error("Select at least one customer.");
        return;
      }
      setSending(true);
      try {
        toast.loading(`Sending to ${productChecked.size} customer(s)...`);
        const data = await sendCampaign(selectedTemplateId, Array.from(productChecked));
        toast.dismiss();
        if (data?.success) {
          toast.success(data.message);
          setResult(data.log);
          onSent && onSent(data.log);
        } else {
          toast.error(data?.error || "Failed to send campaign");
        }
      } catch (error) {
        toast.dismiss();
        toast.error("Error sending campaign");
      } finally {
        setSending(false);
      }
      return;
    }

    // ── ORIGINAL Customer Master mode — completely unchanged ──
    if (checkedIds.size === 0) {
      toast.error("Select at least one customer.");
      return;
    }
    setSending(true);
    try {
      toast.loading(`Sending to ${checkedIds.size} customer(s)...`);
      const data = await sendCampaign(selectedTemplateId, Array.from(checkedIds));
      toast.dismiss();
      if (data?.success) {
        toast.success(data.message);
        setResult(data.log);
        onSent && onSent(data.log);
      } else {
        toast.error(data?.error || "Failed to send campaign");
      }
    } catch (error) {
      toast.dismiss();
      toast.error("Error sending campaign");
    } finally {
      setSending(false);
    }
  };

  const selectedCountOnPage = eligibleOnPage.filter((c) => checkedIds.has(c._id)).length;

  return (
    <div className="modal fade show" style={{ display: "flex", alignItems: "center", backgroundColor: "#00000090" }}>
      <div className="modal-dialog modal-lg modal-dialog-scrollable">
        <div className="modal-content p-3">
          <div className="modal-header pt-0">
            <h5 className="card-title fw-bold">
              <i className="fa-brands fa-whatsapp me-2" style={{ color: "#25D366" }}></i>
              Send WhatsApp Campaign
            </h5>
            <button onClick={handleClose} type="button" className="close px-3" style={{ marginLeft: "auto" }}>
              <span aria-hidden="true">&times;</span>
            </button>
          </div>

          <div className="modal-body">
            <div className="row modal_body_height">

              <div className="col-12 mb-3">
                <label className="form-label label_text">Product Template</label>
                <select
                  className="form-select rounded-0"
                  value={selectedTemplateId}
                  onChange={(e) => setSelectedTemplateId(e.target.value)}
                  disabled={templatesLoading || sending}
                >
                  <option value="">{templatesLoading ? "Loading..." : "Select a product..."}</option>
                  {templates.map((t) => (
                    <option key={t._id} value={t._id}>{t.title}</option>
                  ))}
                </select>
                {!templatesLoading && templates.length === 0 && (
                  <small className="text-danger d-block mt-1">
                    No approved templates yet. Create one in Campaign Templates and wait for Meta approval.
                  </small>
                )}
                {templates.length > 0 && (
                  <small className="text-muted d-block mt-1">Every checked customer below gets this same template.</small>
                )}
              </div>

              {/* ── NEW: mode toggle between the 3 ways to pick recipients ── */}
              <div className="col-12 mb-3">
                <div className="btn-group w-100" role="group">
                  <button type="button" className={`btn btn-sm ${recipientMode === "customer" ? "btn-dark" : "btn-outline-dark"}`} onClick={() => setRecipientMode("customer")}>
                    Customer Master
                  </button>
                  <button type="button" className={`btn btn-sm ${recipientMode === "product" ? "btn-dark" : "btn-outline-dark"}`} onClick={() => setRecipientMode("product")}>
                    Search by Product
                  </button>
                  <button type="button" className={`btn btn-sm ${recipientMode === "upload" ? "btn-dark" : "btn-outline-dark"}`} onClick={() => setRecipientMode("upload")}>
                    Upload File
                  </button>
                </div>
              </div>

              {/* ── NEW: Search by Product tab ── */}
              {recipientMode === "product" && (
                <>
                  <div className="col-12 mb-2">
                    <div className="form">
                      <i className="fa fa-search"></i>
                      <form onSubmit={handleProductSearch}>
                        <input
                          type="text"
                          value={productSearchText}
                          onChange={(e) => setProductSearchText(e.target.value)}
                          className="form-control form-input"
                          placeholder='Search by product, e.g. "CCTV Camera"'
                        />
                      </form>
                    </div>
                    <small className="text-muted d-block mt-1">
                      Shows customers who have an inquiry/lead for a matching product.
                    </small>
                  </div>

                  {productResults.length > 0 && (
                    <div className="col-12 mb-2 d-flex justify-content-between align-items-center">
                      <label className="form-label fw-bold mb-0">
                        {productChecked.size} of {productResults.filter((c) => c.phoneNumber1).length} selected
                      </label>
                      <button type="button" className="btn btn-sm btn-outline-secondary" onClick={toggleAllProductResults}>
                        Select all
                      </button>
                    </div>
                  )}

                  <div className="col-12">
                    <div className="border rounded" style={{ maxHeight: 280, overflowY: "auto" }}>
                      {productSearchLoading && <div className="p-3 text-center text-muted">Searching...</div>}
                      {!productSearchLoading && productResults.length === 0 && (
                        <div className="p-3 text-center text-muted">Search a product name above to find matching customers.</div>
                      )}
                      {!productSearchLoading && productResults.map((cust) => {
                        const hasPhone = !!cust.phoneNumber1;
                        return (
                          <div key={cust._id} className="d-flex align-items-center gap-2 px-3 py-2 border-bottom" style={{ opacity: hasPhone ? 1 : 0.5 }}>
                            <input type="checkbox" checked={productChecked.has(cust._id)} disabled={!hasPhone} onChange={() => toggleProductCustomer(cust._id)} />
                            <div>
                              <div className="fw-semibold">{cust.custName}</div>
                              <small className="text-muted">{cust.phoneNumber1 || "No phone number on file"}</small>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}

              {/* ── NEW: Upload File tab ── */}
              {recipientMode === "upload" && (
                <>
                  <div className="col-12 mb-2">
                    <input
                      type="file"
                      accept=".csv,.xlsx,.xls"
                      id="recipientFileUpload"
                      style={{ display: "none" }}
                      onChange={handleFileSelect}
                      disabled={fileParsing}
                    />
                    <label htmlFor="recipientFileUpload" className={`btn btn-sm btn-outline-secondary ${fileParsing ? "disabled" : ""}`}>
                      <i className="fa-solid fa-upload me-1"></i>
                      {fileParsing ? "Reading file..." : "+ Upload CSV or Excel"}
                    </label>
                    <small className="text-muted d-block mt-1">
                      File needs a column named "phone" or "mobile" (and optionally "name").
                    </small>
                  </div>

                  {uploadedRecipients.length > 0 && (
                    <div className="col-12 mb-2 d-flex justify-content-between align-items-center">
                      <label className="form-label fw-bold mb-0">
                        {uploadChecked.size} of {uploadedRecipients.length} selected
                      </label>
                    </div>
                  )}

                  <div className="col-12">
                    <div className="border rounded" style={{ maxHeight: 280, overflowY: "auto" }}>
                      {uploadedRecipients.length === 0 && (
                        <div className="p-3 text-center text-muted">Upload a file above to see recipients here.</div>
                      )}
                      {uploadedRecipients.map((r, i) => (
                        <div key={i} className="d-flex align-items-center gap-2 px-3 py-2 border-bottom">
                          <input type="checkbox" checked={uploadChecked.has(i)} onChange={() => toggleUploadRecipient(i)} />
                          <div>
                            <div className="fw-semibold">{r.name}</div>
                            <small className="text-muted">{r.phone}</small>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* ── ORIGINAL Customer Master tab — completely unchanged, just now conditional ── */}
              {recipientMode === "customer" && (
              <div className="col-12 mb-2">
                <div className="form">
                  <i className="fa fa-search"></i>
                  <form onSubmit={handleOnSearchSubmit}>
                    <input
                      type="text"
                      value={searchText}
                      onChange={(e) => setSearchText(e.target.value)}
                      className="form-control form-input"
                      placeholder="Search customers by name, email, GST..."
                    />
                  </form>
                </div>
              </div>
              )}

              {recipientMode === "customer" && (
              <div className="col-12 mb-2 d-flex justify-content-between align-items-center flex-wrap gap-2">
                <label className="form-label fw-bold mb-0">
                  {checkedIds.size} customer{checkedIds.size === 1 ? "" : "s"} selected (across all pages)
                </label>
                <div className="d-flex gap-2">
                  <button type="button" className="btn btn-sm btn-outline-secondary" onClick={toggleAllOnPage} disabled={customersLoading || selectingAllPages}>
                    {selectedCountOnPage === eligibleOnPage.length && eligibleOnPage.length > 0 ? "Deselect page" : "Select page"}
                  </button>
                  <button type="button" className="btn btn-sm btn-outline-primary" onClick={selectAllAcrossPages} disabled={customersLoading || selectingAllPages}>
                    {selectingAllPages ? "Selecting..." : "Select all pages"}
                  </button>
                  {checkedIds.size > 0 && (
                    <button type="button" className="btn btn-sm btn-outline-danger" onClick={clearAllSelection} disabled={selectingAllPages}>
                      Clear
                    </button>
                  )}
                </div>
              </div>
              )}

              {recipientMode === "customer" && (
              <div className="col-12">
                <div className="border rounded" style={{ maxHeight: 280, overflowY: "auto" }}>
                  {customersLoading && <div className="p-3 text-center text-muted">Loading customers...</div>}

                  {!customersLoading && customers.length === 0 && (
                    <div className="p-3 text-center text-muted">No customers found.</div>
                  )}

                  {!customersLoading && customers.map((cust) => {
                    const hasPhone = !!cust.phoneNumber1;
                    const isChecked = checkedIds.has(cust._id);
                    const outcome = result?.recipients?.find((r) => r.customerId === cust._id);

                    return (
                      <div
                        key={cust._id}
                        className="d-flex align-items-center justify-content-between px-3 py-2 border-bottom"
                        style={{ fontSize: "0.9rem", opacity: hasPhone ? 1 : 0.5 }}
                      >
                        <div className="d-flex align-items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            disabled={!hasPhone || sending}
                            onChange={() => toggleCustomer(cust._id)}
                          />
                          <div>
                            <div className="fw-semibold">{cust.custName}</div>
                            <small className="text-muted">{cust.phoneNumber1 || "No phone number on file"}</small>
                          </div>
                        </div>
                        {outcome?.status === "sent" && <span className="badge bg-success">Sent</span>}
                        {outcome?.status === "skipped" && <span className="badge bg-danger" title={outcome.reason}>Skipped</span>}
                      </div>
                    );
                  })}
                </div>

                {pagination.totalPages > 1 && (
                  <div className="text-center mt-2">
                    <button
                      className="btn btn-sm btn-dark me-2"
                      disabled={!pagination.hasPrevPage || customersLoading}
                      onClick={() => setCurrentPage((p) => p - 1)}
                    >
                      Prev
                    </button>
                    <small className="text-muted">Page {currentPage} of {pagination.totalPages}</small>
                    <button
                      className="btn btn-sm btn-dark ms-2"
                      disabled={!pagination.hasNextPage || customersLoading}
                      onClick={() => setCurrentPage((p) => p + 1)}
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
              )}

              {result && (
                <div className="col-12 mt-3">
                  <div className="alert alert-info py-2">
                    <strong>{result.sentCount} sent</strong>, <strong>{result.skippedCount} skipped</strong>
                  </div>
                </div>
              )}

              <div className="col-12 pt-3 mt-2">
                {(() => {
                  const activeCount = recipientMode === "upload" ? uploadChecked.size : recipientMode === "product" ? productChecked.size : checkedIds.size;
                  return (
                    <button
                      type="button"
                      disabled={sending || !selectedTemplateId || activeCount === 0}
                      onClick={handleSend}
                      className="w-80 btn addbtn rounded-0 add_button m-2 px-4"
                    >
                      {sending ? "Sending..." : `Send to ${activeCount} recipient${activeCount === 1 ? "" : "s"}`}
                    </button>
                  );
                })()}
                <button type="button" onClick={handleClose} className="w-80 btn addbtn rounded-0 Cancel_button m-2 px-4">
                  {result ? "Close" : "Cancel"}
                </button>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SendCampaignPopUp;