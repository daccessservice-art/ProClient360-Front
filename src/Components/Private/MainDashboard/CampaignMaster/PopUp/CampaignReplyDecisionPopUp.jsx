// ✅ NEW — WhatsApp Campaign reply → Feasible (Marketing / Sales) or Not Feasible
import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { RequiredStar } from "../../../RequiredStar/RequiredStar";
import { decideCampaignReply, getSalesEmployeesForCampaign } from "../../../../../hooks/useCampaign";

const CampaignReplyDecisionPopUp = ({ item, initialDecision = "feasible", onClose, onDone }) => {
  const [decision, setDecision] = useState(initialDecision);
  const [target, setTarget] = useState("marketing");
  const [assignMode, setAssignMode] = useState("self");
  const [employees, setEmployees] = useState([]);
  const [employeesLoaded, setEmployeesLoaded] = useState(false);
  const [employeeId, setEmployeeId] = useState("");
  const [remark, setRemark] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (decision === "feasible" && target === "sales" && assignMode === "employee" && !employeesLoaded) {
      (async () => {
        const data = await getSalesEmployeesForCampaign();
        setEmployees(data?.success ? data.salesEmployees || [] : []);
        setEmployeesLoaded(true);
        if (!data?.success) toast.error(data?.error || "Could not load sales employees");
      })();
    }
  }, [decision, target, assignMode, employeesLoaded]);

  const handleSave = async () => {
    if (decision === "not-feasible" && !remark.trim()) {
      return toast.error("Remark is required for Not Feasible.");
    }
    if (decision === "feasible" && target === "sales" && assignMode === "employee" && !employeeId) {
      return toast.error("Please select a sales employee.");
    }

    setSaving(true);
    const data = await decideCampaignReply({
      phone: item.phone,
      customerId: item.customerId || null,
      name: item.custName || "",
      decision,
      target: decision === "feasible" ? target : undefined,
      remark: remark.trim(),
      assignedTo: decision === "feasible" && target === "sales" && assignMode === "employee" ? employeeId : undefined,
    });
    setSaving(false);

    if (data?.success) {
      toast.success(data.message);
      onDone && onDone();
      onClose();
    } else {
      toast.error(data?.error || "Failed to save");
    }
  };

  return (
    <div className="modal fade show" style={{ display: "flex", alignItems: "center", backgroundColor: "#00000090", zIndex: 1060 }}>
      <div className="modal-dialog">
        <div className="modal-content p-3">
          <div className="modal-header pt-0">
            <h5 className="card-title fw-bold mb-0">
              <i className="fa-brands fa-whatsapp me-2" style={{ color: "#25D366" }}></i>Campaign Reply → Lead
            </h5>
            <button onClick={onClose} type="button" className="close px-3" style={{ marginLeft: "auto" }}>
              <span aria-hidden="true">&times;</span>
            </button>
          </div>

          <div className="modal-body">
            {/* Customer summary — only name + mobile go into the lead */}
            <div className="p-2 mb-3 rounded" style={{ background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
              <div className="fw-bold">{item.custName || "Unknown customer"}</div>
              <small className="text-muted">{item.phone}</small>
              <div className="mt-1" style={{ fontSize: 12, color: "#166534" }}>
                <i className="fa-solid fa-circle-info me-1"></i>
                Only name &amp; mobile are saved. Marketing / Sales fills the rest after calling.
              </div>
            </div>

            {/* Decision */}
            <label className="form-label fw-bold">Status <RequiredStar /></label>
            <div className="d-flex gap-4 mb-3">
              <div className="form-check">
                <input className="form-check-input" type="radio" id="decFeasible" checked={decision === "feasible"} onChange={() => setDecision("feasible")} />
                <label className="form-check-label" htmlFor="decFeasible">
                  <i className="fa-solid fa-check-circle text-success me-1"></i>Feasible
                </label>
              </div>
              <div className="form-check">
                <input className="form-check-input" type="radio" id="decNotFeasible" checked={decision === "not-feasible"} onChange={() => setDecision("not-feasible")} />
                <label className="form-check-label" htmlFor="decNotFeasible">
                  <i className="fa-solid fa-times-circle text-danger me-1"></i>Not Feasible
                </label>
              </div>
            </div>

            {/* Feasible → where */}
            {decision === "feasible" && (
              <>
                <label className="form-label fw-bold">Send lead to <RequiredStar /></label>
                <div className="btn-group w-100 mb-3" role="group">
                  <button type="button" className={`btn btn-sm ${target === "marketing" ? "btn-dark" : "btn-outline-dark"}`} onClick={() => setTarget("marketing")}>
                    <i className="fa-solid fa-bullhorn me-1"></i>Marketing Master
                  </button>
                  <button type="button" className={`btn btn-sm ${target === "sales" ? "btn-dark" : "btn-outline-dark"}`} onClick={() => setTarget("sales")}>
                    <i className="fa-solid fa-chart-line me-1"></i>Sales Master
                  </button>
                </div>

                {target === "sales" && (
                  <div className="mb-3">
                    <div className="d-flex gap-4 mb-2">
                      <div className="form-check">
                        <input className="form-check-input" type="radio" id="assignSelf" checked={assignMode === "self"} onChange={() => setAssignMode("self")} />
                        <label className="form-check-label" htmlFor="assignSelf">Assign to me</label>
                      </div>
                      <div className="form-check">
                        <input className="form-check-input" type="radio" id="assignEmp" checked={assignMode === "employee"} onChange={() => setAssignMode("employee")} />
                        <label className="form-check-label" htmlFor="assignEmp">Sales employee</label>
                      </div>
                    </div>
                    {assignMode === "employee" && (
                      <select className="form-select" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
                        <option value="">{employeesLoaded ? "Select sales employee..." : "Loading..."}</option>
                        {employees.map((emp) => (
                          <option key={emp._id} value={emp._id}>{emp.name}</option>
                        ))}
                      </select>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Remark */}
            <label className="form-label fw-bold">
              Remark {decision === "not-feasible" && <RequiredStar />}
            </label>
            {decision === "not-feasible" && (
              <div className="alert alert-danger py-1 px-2 mb-1" style={{ fontSize: "0.78rem" }}>
                <i className="fa-solid fa-circle-exclamation me-1"></i>
                Reason is <strong>required</strong> — it shows in Marketing → Not Feasible.
              </div>
            )}
            <textarea
              className={`form-control ${decision === "not-feasible" ? "border-danger" : ""}`}
              rows={3}
              maxLength={200}
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              placeholder={decision === "not-feasible" ? "Required: why is this not feasible?" : "Optional remark..."}
            />
            <small className="text-muted">{remark.length}/200</small>
          </div>

          <div className="pt-2">
            <button type="button" className="w-80 btn addbtn rounded-0 add_button m-2 px-4" onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Submit"}
            </button>
            <button type="button" className="w-80 btn addbtn rounded-0 Cancel_button m-2 px-4" onClick={onClose}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CampaignReplyDecisionPopUp;