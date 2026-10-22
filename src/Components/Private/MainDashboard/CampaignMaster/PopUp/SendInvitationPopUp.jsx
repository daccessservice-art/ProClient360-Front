// INVITATION CAMPAIGN — send an approved invitation to Customer Master
// customers or to numbers from an uploaded CSV / Excel file.
import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import { getCustomers } from "../../../../../hooks/useCustomer";
import { parseRecipientFile } from "../../../../../hooks/useCampaign";
import { getInvitationTemplates, sendInvitation } from "../../../../../hooks/useInvitationCampaign";

const PAGE_SIZE = 40;

const SendInvitationPopUp = ({ handleClose, onSent, preselectId = "" }) => {
  const [templates, setTemplates] = useState([]);
  const [templateId, setTemplateId] = useState(preselectId);
  const [mode, setMode] = useState("customer"); // "customer" | "upload"

  // Customer Master
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [checked, setChecked] = useState(new Set());
  const [selectingAll, setSelectingAll] = useState(false);

  // Upload
  const [uploaded, setUploaded] = useState([]);
  const [uploadChecked, setUploadChecked] = useState(new Set());
  const [parsing, setParsing] = useState(false);

  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    (async () => {
      const data = await getInvitationTemplates();
      if (data?.success) setTemplates((data.templates || []).filter((t) => t.status === "APPROVED"));
    })();
  }, []);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    const data = await getCustomers(page, PAGE_SIZE, search);
    if (data?.success) {
      setCustomers(data.customers || []);
      setPagination(data.pagination || {});
    }
    setLoading(false);
  }, [page, search]);

  useEffect(() => {
    if (mode === "customer") fetchCustomers();
  }, [mode, fetchCustomers]);

  const toggle = (setFn, key) =>
    setFn((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  const eligible = customers.filter((c) => c.phoneNumber1);
  const allOnPage = eligible.length > 0 && eligible.every((c) => checked.has(c._id));
  const togglePage = () =>
    setChecked((prev) => {
      const next = new Set(prev);
      eligible.forEach((c) => (allOnPage ? next.delete(c._id) : next.add(c._id)));
      return next;
    });

  const selectAllPages = async () => {
    setSelectingAll(true);
    const data = await getCustomers(1, 10000, search);
    setSelectingAll(false);
    if (!data?.success) return toast.error("Failed to select all customers");
    const all = (data.customers || []).filter((c) => c.phoneNumber1);
    setChecked(new Set(all.map((c) => c._id)));
    toast.success(`Selected ${all.length} customer(s)`);
  };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setParsing(true);
    const data = await parseRecipientFile(file);
    setParsing(false);
    if (data?.success) {
      setUploaded(data.recipients || []);
      setUploadChecked(new Set((data.recipients || []).map((_, i) => i)));
      toast.success(`Found ${data.recipients.length} number(s)`);
    } else {
      toast.error(data?.error || "Failed to read file");
    }
  };

  const count = mode === "customer" ? checked.size : uploadChecked.size;

  const handleSend = async () => {
    if (!templateId) return toast.error("Select an invitation first.");
    if (count === 0) return toast.error("Select at least one recipient.");
    if (count > 200) return toast.error("Max 200 recipients per send — send in batches.");

    const payload =
      mode === "customer"
        ? { templateId, customerIds: Array.from(checked) }
        : { templateId, recipients: uploaded.filter((_, i) => uploadChecked.has(i)) };

    setSending(true);
    toast.loading(`Sending invitation to ${count} recipient(s)...`);
    const data = await sendInvitation(payload);
    toast.dismiss();
    setSending(false);

    if (data?.success) {
      toast.success(data.message);
      setResult(data.log);
      onSent && onSent(data.log);
    } else {
      toast.error(data?.error || "Failed to send invitation");
    }
  };

  return (
    <div className="modal fade show" style={{ display: "flex", alignItems: "center", backgroundColor: "#00000090", zIndex: 1060 }}>
      <div className="modal-dialog modal-lg modal-dialog-scrollable">
        <div className="modal-content p-3">
          <div className="modal-header pt-0">
            <h5 className="card-title fw-bold">
              <i className="fa-solid fa-paper-plane me-2" style={{ color: "#25D366" }}></i>Send Invitation
            </h5>
            <button onClick={handleClose} type="button" className="close px-3" style={{ marginLeft: "auto" }}>
              <span aria-hidden="true">&times;</span>
            </button>
          </div>

          <div className="modal-body">
            <div className="mb-3">
              <label className="form-label label_text">Invitation</label>
              <select className="form-select rounded-0" value={templateId} onChange={(e) => setTemplateId(e.target.value)} disabled={sending}>
                <option value="">Select an approved invitation...</option>
                {templates.map((t) => <option key={t._id} value={t._id}>{t.title}</option>)}
              </select>
              {templates.length === 0 && (
                <small className="text-danger d-block mt-1">No approved invitations yet — create one and wait for Meta approval.</small>
              )}
            </div>

            <div className="btn-group w-100 mb-3" role="group">
              <button type="button" className={`btn btn-sm ${mode === "customer" ? "btn-dark" : "btn-outline-dark"}`} onClick={() => setMode("customer")}>Customer Master</button>
              <button type="button" className={`btn btn-sm ${mode === "upload" ? "btn-dark" : "btn-outline-dark"}`} onClick={() => setMode("upload")}>Upload File</button>
            </div>

            {mode === "customer" && (
              <>
                <form onSubmit={(e) => { e.preventDefault(); setSearch(searchText); setPage(1); }} className="mb-2">
                  <input type="text" className="form-control" placeholder="Search customers by name, email, GST..." value={searchText} onChange={(e) => setSearchText(e.target.value)} />
                </form>
                <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-2">
                  <strong>{checked.size} selected</strong>
                  <div className="d-flex gap-2">
                    <button type="button" className="btn btn-sm btn-outline-secondary" onClick={togglePage} disabled={loading}>{allOnPage ? "Deselect page" : "Select page"}</button>
                    <button type="button" className="btn btn-sm btn-outline-primary" onClick={selectAllPages} disabled={loading || selectingAll}>{selectingAll ? "Selecting..." : "Select all pages"}</button>
                    {checked.size > 0 && <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => setChecked(new Set())}>Clear</button>}
                  </div>
                </div>
                <div className="border rounded" style={{ maxHeight: 300, overflowY: "auto" }}>
                  {loading && <div className="p-3 text-center text-muted">Loading customers...</div>}
                  {!loading && customers.length === 0 && <div className="p-3 text-center text-muted">No customers found.</div>}
                  {!loading && customers.map((c) => {
                    const outcome = result?.recipients?.find((r) => String(r.customerId) === String(c._id));
                    return (
                      <div key={c._id} className="d-flex align-items-center justify-content-between px-3 py-2 border-bottom" style={{ opacity: c.phoneNumber1 ? 1 : 0.5 }}>
                        <label className="d-flex align-items-center gap-2 mb-0" style={{ cursor: "pointer" }}>
                          <input type="checkbox" checked={checked.has(c._id)} disabled={!c.phoneNumber1 || sending} onChange={() => toggle(setChecked, c._id)} />
                          <span>
                            <span className="fw-semibold d-block">{c.custName}</span>
                            <small className="text-muted">{c.phoneNumber1 || "No phone number"}</small>
                          </span>
                        </label>
                        {outcome?.status === "sent" && <span className="badge bg-success">Sent</span>}
                        {outcome?.status === "skipped" && <span className="badge bg-danger" title={outcome.reason}>Skipped</span>}
                      </div>
                    );
                  })}
                </div>
                {pagination.totalPages > 1 && (
                  <div className="text-center mt-2">
                    <button className="btn btn-sm btn-dark me-2" disabled={!pagination.hasPrevPage || loading} onClick={() => setPage((p) => p - 1)}>Prev</button>
                    <small className="text-muted">Page {page} of {pagination.totalPages}</small>
                    <button className="btn btn-sm btn-dark ms-2" disabled={!pagination.hasNextPage || loading} onClick={() => setPage((p) => p + 1)}>Next</button>
                  </div>
                )}
              </>
            )}

            {mode === "upload" && (
              <>
                <input type="file" accept=".csv,.xlsx,.xls" id="invitationRecipientFile" style={{ display: "none" }} onChange={handleFile} disabled={parsing} />
                <label htmlFor="invitationRecipientFile" className={`btn btn-sm btn-outline-secondary ${parsing ? "disabled" : ""}`}>
                  <i className="fa-solid fa-upload me-1"></i>{parsing ? "Reading file..." : "Upload CSV or Excel"}
                </label>
                <small className="text-muted d-block mt-1 mb-2">File needs a column named "phone" or "mobile" (and optionally "name").</small>
                {uploaded.length > 0 && <strong className="d-block mb-2">{uploadChecked.size} of {uploaded.length} selected</strong>}
                <div className="border rounded" style={{ maxHeight: 300, overflowY: "auto" }}>
                  {uploaded.length === 0 && <div className="p-3 text-center text-muted">Upload a file to see numbers here.</div>}
                  {uploaded.map((r, i) => (
                    <label key={i} className="d-flex align-items-center gap-2 px-3 py-2 border-bottom mb-0" style={{ cursor: "pointer" }}>
                      <input type="checkbox" checked={uploadChecked.has(i)} onChange={() => toggle(setUploadChecked, i)} disabled={sending} />
                      <span><span className="fw-semibold d-block">{r.name}</span><small className="text-muted">{r.phone}</small></span>
                    </label>
                  ))}
                </div>
              </>
            )}

            {result && (
              <div className="alert alert-info py-2 mt-3 mb-0">
                <strong>{result.sentCount} sent</strong>, <strong>{result.skippedCount} skipped</strong>
              </div>
            )}

            <div className="pt-3">
              <button type="button" disabled={sending || !templateId || count === 0} onClick={handleSend} className="w-80 btn addbtn rounded-0 add_button m-2 px-4">
                {sending ? "Sending..." : `Send to ${count} recipient${count === 1 ? "" : "s"}`}
              </button>
              <button type="button" onClick={handleClose} className="w-80 btn addbtn rounded-0 Cancel_button m-2 px-4">
                {result ? "Close" : "Cancel"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SendInvitationPopUp;