import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { RequiredStar } from "../../../RequiredStar/RequiredStar";
import { logAMCCall, getAMCCallHistory } from "../../../../../hooks/useAMCCallLog";

export const CALL_OUTCOMES = [
  "Connected",
  "Interested",
  "Not Answered",
  "Busy",
  "Switched Off / Not Reachable",
  "Call Back Later",
  "Wrong Number",
  "Not Interested",
];

export const OUTCOME_COLORS = {
  Connected: "#16a34a",
  Interested: "#0e7490",
  "Not Answered": "#dc2626",
  Busy: "#ea580c",
  "Switched Off / Not Reachable": "#64748b",
  "Call Back Later": "#ca8a04",
  "Wrong Number": "#475569",
  "Not Interested": "#7f1d1d",
};

const REMARK_MAX = 1000;

export const fmtDateTime = (d) => {
  if (!d) return "—";
  const x = new Date(d);
  if (isNaN(x.getTime())) return "—";
  return x.toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
};

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString() : "—");

// yyyy-mm-dd in LOCAL time
const todayInput = () => {
  const x = new Date();
  const mm = String(x.getMonth() + 1).padStart(2, "0");
  const dd = String(x.getDate()).padStart(2, "0");
  return `${x.getFullYear()}-${mm}-${dd}`;
};

// First number only, digits and + only (for tel: link)
const toTelNumber = (phone) => {
  if (!phone) return "";
  const first = String(phone).split(/[,/;]/)[0];
  return first.replace(/[^\d+]/g, "");
};

const AMCCallPopUp = ({ record, handleClose }) => {
  const [now, setNow] = useState(new Date());
  const [outcome, setOutcome] = useState("Connected");
  const [remark, setRemark] = useState("");
  const [nextFollowUpDate, setNextFollowUpDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [changed, setChanged] = useState(false);

  // Live clock — this is the time that will be saved with the call
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const loadHistory = async () => {
    if (!record?._id) return;
    setLoadingHistory(true);
    const data = await getAMCCallHistory(record._id);
    setLoadingHistory(false);
    if (data?.success) setHistory(data.logs || []);
    else toast.error(data?.error || "Failed to load call history");
  };

  useEffect(() => {
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [record?._id]);

  const handleRemarkChange = (e) => {
    if (e.target.value.length <= REMARK_MAX) setRemark(e.target.value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;

    const rm = remark.trim();
    if (!rm) return toast.error("Remark is required for every call");
    if (rm.length < 3) return toast.error("Please write a proper remark (min 3 characters)");
    if (nextFollowUpDate && nextFollowUpDate < todayInput()) {
      return toast.error("Next Follow-up Date cannot be in the past");
    }

    setSaving(true);
    const toastId = toast.loading("Saving call...");
    const data = await logAMCCall(record._id, {
      outcome,
      remark: rm,
      nextFollowUpDate: nextFollowUpDate || null,
    });
    toast.dismiss(toastId);
    setSaving(false);

    if (data?.success) {
      toast.success(data.message || "Call saved");
      setRemark("");
      setNextFollowUpDate("");
      setOutcome("Connected");
      setChanged(true);
      loadHistory();
    } else {
      toast.error(data?.error || "Failed to save call");
    }
  };

  const tel = toTelNumber(record?.phoneNumber1);
  const close = () => handleClose(changed);

  return (
    <div className="modal fade show" style={{ display: "flex", alignItems: "center", backgroundColor: "#00000090" }}>
      <div className="modal-dialog modal-xl modal-dialog-scrollable">
        <div className="modal-content p-3">
          <form onSubmit={handleSubmit}>
            <div className="modal-header pt-0">
              <h5 className="card-title fw-bold d-flex align-items-center gap-2">
                <i className="fa-solid fa-phone-volume text-primary"></i>
                AMC Call — {record?.custName}
              </h5>
              <button onClick={close} type="button" className="close px-3" style={{ marginLeft: "auto" }}>
                <span aria-hidden="true">&times;</span>
              </button>
            </div>

            <div className="modal-body">
              <div className="row modal_body_height">

                {/* Customer / AMC info strip */}
                <div className="col-12">
                  <div className="alert alert-primary py-2 mb-3 d-flex flex-wrap align-items-center gap-3" style={{ fontSize: "13px" }}>
                    <div>
                      <i className="fa-solid fa-user me-1"></i>
                      <strong>{record?.customerContactPersonName1 || "No contact person"}</strong>
                      {record?.customerContactPersonDesignation1 ? ` (${record.customerContactPersonDesignation1})` : ""}
                    </div>
                    <div>
                      <i className="fa-solid fa-phone me-1"></i>
                      {record?.phoneNumber1 || "No phone number"}
                    </div>
                    <div>
                      <i className="fa-solid fa-calendar me-1"></i>
                      AMC: {fmtDate(record?.startDate)} → {fmtDate(record?.endDate)}
                    </div>
                    {record?.system && (
                      <div title={record.system}>
                        <i className="fa-solid fa-gears me-1"></i>
                        {record.system.length > 40 ? `${record.system.slice(0, 40)}...` : record.system}
                      </div>
                    )}
                    {tel && (
                      <a href={`tel:${tel}`} className="btn btn-sm btn-success ms-auto" style={{ whiteSpace: "nowrap" }}>
                        <i className="fa-solid fa-phone me-1"></i>Dial {tel}
                      </a>
                    )}
                  </div>
                </div>

                {record?.lost ? (
                  <div className="col-12">
                    <div className="alert alert-secondary py-2" style={{ fontSize: "13px" }}>
                      <i className="fa-solid fa-ban me-1"></i>
                      This AMC is marked as <strong>Lost</strong>. Turn off Lost in Edit to log new calls.
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="col-12 col-lg-4">
                      <div className="mb-3">
                        <label className="form-label label_text">Call Date &amp; Time <small className="text-muted">(automatic)</small></label>
                        <input type="text" className="form-control rounded-0 fw-bold" value={fmtDateTime(now)} readOnly
                          style={{ background: "#f1f5f9" }} />
                      </div>
                    </div>

                    <div className="col-12 col-lg-4">
                      <div className="mb-3">
                        <label className="form-label label_text">Call Outcome</label>
                        <select className="form-select rounded-0" value={outcome} onChange={(e) => setOutcome(e.target.value)}>
                          {CALL_OUTCOMES.map((o) => (<option key={o} value={o}>{o}</option>))}
                        </select>
                      </div>
                    </div>

                    <div className="col-12 col-lg-4">
                      <div className="mb-3">
                        <label className="form-label label_text">
                          Next Follow-up Date <small className="text-muted">(optional, sets In Process)</small>
                        </label>
                        <input type="date" className="form-control rounded-0" min={todayInput()}
                          value={nextFollowUpDate} onChange={(e) => setNextFollowUpDate(e.target.value)} />
                      </div>
                    </div>

                    <div className="col-12">
                      <div className="mb-3">
                        <label className="form-label label_text">
                          Call Remark <RequiredStar />{" "}
                          <small className="text-muted">({remark.length}/{REMARK_MAX})</small>
                        </label>
                        <textarea
                          className={`form-control rounded-0 ${!remark.trim() ? "is-invalid" : ""}`}
                          rows={3} maxLength={REMARK_MAX}
                          value={remark} onChange={handleRemarkChange}
                          placeholder="What did the customer say? (required)" />
                        {!remark.trim() && (
                          <div className="invalid-feedback">Remark is required for every call</div>
                        )}
                      </div>
                    </div>

                    <div className="col-12 mb-2">
                      <button type="submit" disabled={saving} className="btn addbtn rounded-0 add_button px-4">
                        <i className="fa-solid fa-floppy-disk me-1"></i>
                        {saving ? "Saving..." : "Save Call"}
                      </button>
                    </div>
                  </>
                )}

                {/* Call history */}
                <div className="col-12 mt-2">
                  <h6 className="fw-bold d-flex align-items-center gap-2 mb-2">
                    <i className="fa-solid fa-clock-rotate-left"></i>
                    Call History
                    <span className="badge bg-primary">{history.length}</span>
                  </h6>
                  <div className="table-responsive" style={{ maxHeight: "320px", overflowY: "auto" }}>
                    <table className="table table-striped table-class mb-0">
                      <thead>
                        <tr className="th_border">
                          <th className="text-center">#</th>
                          <th className="text-center">Date &amp; Time</th>
                          <th className="text-center">Outcome</th>
                          <th className="align_left_td">Remark</th>
                          <th className="text-center">Next Follow-up</th>
                          <th className="text-center">Called By</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loadingHistory ? (
                          <tr><td colSpan="6" className="text-center text-muted">Loading...</td></tr>
                        ) : history.length > 0 ? (
                          history.map((h, i) => (
                            <tr key={h._id}>
                              <td className="text-center">{history.length - i}</td>
                              <td className="text-center" style={{ whiteSpace: "nowrap", fontWeight: 600 }}>{fmtDateTime(h.calledAt)}</td>
                              <td className="text-center">
                                <span className="badge" style={{ background: OUTCOME_COLORS[h.outcome] || "#475569", whiteSpace: "nowrap" }}>
                                  {h.outcome}
                                </span>
                              </td>
                              <td className="align_left_td" style={{ whiteSpace: "normal", wordBreak: "break-word", minWidth: "220px" }}>
                                {h.remark}
                              </td>
                              <td className="text-center">{h.nextFollowUpDate ? fmtDate(h.nextFollowUpDate) : "—"}</td>
                              <td className="text-center">{h.calledByName || "—"}</td>
                            </tr>
                          ))
                        ) : (
                          <tr><td colSpan="6" className="text-center text-muted">No calls yet for this AMC</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="row">
                  <div className="col-12 pt-3 mt-2">
                    <button type="button" onClick={close} className="w-80 btn addbtn rounded-0 Cancel_button m-2 px-4">Close</button>
                  </div>
                </div>

              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AMCCallPopUp;