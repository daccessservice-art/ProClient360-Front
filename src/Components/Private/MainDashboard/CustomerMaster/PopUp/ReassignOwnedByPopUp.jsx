import { useState, useEffect } from "react";
import { getEmployees, getCustomers, updateCustomer } from "../../../../../hooks/useCustomer";
import toast from "react-hot-toast";

/**
 * ReassignOwnedByPopUp
 * Props:
 *   onClose  — close without changes
 *   onDone   — called after any successful reassignment so parent can refetch
 */
const ReassignOwnedByPopUp = ({ onClose, onDone }) => {
  const [employees, setEmployees] = useState([]);
  const [empLoading, setEmpLoading] = useState(true);

  // Step 1 — from employee
  const [fromEmployee, setFromEmployee] = useState("");

  // Step 2 — customer list for that employee
  const [custList, setCustList] = useState([]);
  const [custLoading, setCustLoading] = useState(false);
  const [selectedCustIds, setSelectedCustIds] = useState([]);

  // Step 3 — to employee
  const [toEmployee, setToEmployee] = useState("");

  // Reassigning
  const [reassigning, setReassigning] = useState(false);
  const [done, setDone] = useState(false);
  const [summary, setSummary] = useState({ success: 0, fail: 0, failNames: [] });

  // ── Load employees once ──
  useEffect(() => {
    const load = async () => {
      setEmpLoading(true);
      try {
        const data = await getEmployees();
        if (data.success && data.employees) setEmployees(data.employees);
      } catch {
        toast.error("Failed to load employees");
      } finally {
        setEmpLoading(false);
      }
    };
    load();
  }, []);

  // ── Fetch ALL customers for selected "from" employee ──
  useEffect(() => {
    if (!fromEmployee) {
      setCustList([]);
      setSelectedCustIds([]);
      setToEmployee("");
      return;
    }
    const fetchCusts = async () => {
      setCustLoading(true);
      setSelectedCustIds([]);
      setToEmployee("");
      try {
        // limit=10000 to get all pages for this owner in one shot
        const data = await getCustomers(1, 10000, "", "", fromEmployee, "", "", "");
        if (data?.success) setCustList(data.customers || []);
        else setCustList([]);
      } catch {
        setCustList([]);
      } finally {
        setCustLoading(false);
      }
    };
    fetchCusts();
  }, [fromEmployee]);

  // ── Select helpers ──
  const allSelected = custList.length > 0 && selectedCustIds.length === custList.length;
  const someSelected = selectedCustIds.length > 0 && selectedCustIds.length < custList.length;

  const handleSelectAll = () => {
    setSelectedCustIds(allSelected ? [] : custList.map((c) => c._id));
  };

  const handleToggleCust = (id) => {
    setSelectedCustIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // ── Reassign ──
  const handleReassign = async () => {
    if (!fromEmployee) return toast.error("Please select the current owner");
    if (selectedCustIds.length === 0) return toast.error("Please select at least one customer");
    if (!toEmployee) return toast.error("Please select the new owner");
    if (fromEmployee === toEmployee) return toast.error("From and To employee cannot be the same");

    setReassigning(true);
    let successCount = 0;
    let failCount = 0;
    const failNames = [];

    for (const id of selectedCustIds) {
      const cust = custList.find((c) => c._id === id);
      try {
        const result = await updateCustomer({ ...cust, ownedBy: toEmployee });
        if (result?.success) {
          successCount++;
        } else {
          failCount++;
          failNames.push(cust?.custName || id);
        }
      } catch {
        failCount++;
        failNames.push(cust?.custName || id);
      }
    }

    setReassigning(false);
    setSummary({ success: successCount, fail: failCount, failNames });
    setDone(true);
    if (successCount > 0) onDone?.();
  };

  const handleReassignAgain = () => {
    setDone(false);
    setFromEmployee("");
    setCustList([]);
    setSelectedCustIds([]);
    setToEmployee("");
    setSummary({ success: 0, fail: 0, failNames: [] });
  };

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case "P1": return "badge bg-danger";
      case "P2": return "badge bg-warning text-dark";
      case "P3": return "badge bg-success";
      default: return "badge bg-secondary";
    }
  };

  return (
    <div
      className="modal fade show"
      style={{ display: "flex", alignItems: "center", backgroundColor: "#00000090", zIndex: 1055 }}
    >
      <div className="modal-dialog modal-xl modal-dialog-scrollable" style={{ maxWidth: "880px", width: "95%" }}>
        <div className="modal-content p-0" style={{ borderRadius: "10px", overflow: "hidden" }}>

          {/* ── Header ── */}
          <div
            className="modal-header px-4 py-3"
            style={{ backgroundColor: "#1a237e", border: "none" }}
          >
            <div>
              <h5 className="mb-0 text-white fw-bold" style={{ fontSize: "16px" }}>
                <i className="fa-solid fa-arrows-rotate me-2"></i>
                Reassign Customer Ownership
              </h5>
              <small style={{ color: "rgba(255,255,255,0.65)", fontSize: "12px" }}>
                Transfer customers from one employee to another employee
              </small>
            </div>
            <button
              type="button"
              className="btn-close btn-close-white"
              onClick={onClose}
              disabled={reassigning}
              style={{ fontSize: "12px" }}
            ></button>
          </div>

          <div className="modal-body p-4" style={{ backgroundColor: "#fafafa" }}>

            {/* ── Done / Summary Screen ── */}
            {done ? (
              <div className="text-center py-4">
                <i
                  className="fa-solid fa-circle-check text-success mb-3"
                  style={{ fontSize: "52px" }}
                ></i>
                <h5 className="fw-bold mb-1">Reassignment Complete</h5>
                <p className="text-muted mb-4" style={{ fontSize: "14px" }}>
                  Ownership transferred from&nbsp;
                  <strong className="text-danger">{fromEmployee}</strong>
                  &nbsp;→&nbsp;
                  <strong className="text-success">{toEmployee}</strong>
                </p>

                <div className="row justify-content-center g-3 mb-4">
                  <div className="col-auto">
                    <div
                      className="px-4 py-3 rounded text-center"
                      style={{ backgroundColor: "#e8f5e9", border: "1px solid #a5d6a7", minWidth: "130px" }}
                    >
                      <div className="fw-bold text-success" style={{ fontSize: "30px" }}>
                        {summary.success}
                      </div>
                      <small className="text-muted">Successfully Reassigned</small>
                    </div>
                  </div>
                  {summary.fail > 0 && (
                    <div className="col-auto">
                      <div
                        className="px-4 py-3 rounded text-center"
                        style={{ backgroundColor: "#ffebee", border: "1px solid #ef9a9a", minWidth: "130px" }}
                      >
                        <div className="fw-bold text-danger" style={{ fontSize: "30px" }}>
                          {summary.fail}
                        </div>
                        <small className="text-muted">Failed</small>
                      </div>
                    </div>
                  )}
                </div>

                {summary.failNames.length > 0 && (
                  <div
                    className="text-start p-3 rounded mb-4 mx-auto"
                    style={{
                      backgroundColor: "#fff8e1",
                      border: "1px solid #ffe082",
                      fontSize: "13px",
                      maxWidth: "480px",
                    }}
                  >
                    <strong>
                      <i className="fa-solid fa-triangle-exclamation text-warning me-1"></i>
                      Failed customers:
                    </strong>
                    <ul className="mb-0 mt-1 ps-3">
                      {summary.failNames.map((n, i) => <li key={i}>{n}</li>)}
                    </ul>
                  </div>
                )}

                <div className="d-flex justify-content-center gap-2">
                  <button className="btn btn-primary px-4" onClick={handleReassignAgain}>
                    <i className="fa-solid fa-arrows-rotate me-1"></i> Reassign Again
                  </button>
                  <button className="btn btn-outline-secondary px-4" onClick={onClose}>
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* ── Step Indicators ── */}
                <div className="d-flex align-items-center mb-4 gap-2 flex-wrap" style={{ fontSize: "12px" }}>
                  {[
                    { num: 1, label: "Select current owner", active: true },
                    { num: 2, label: "Choose customers", active: !!fromEmployee },
                    { num: 3, label: "Select new owner", active: !!fromEmployee && selectedCustIds.length > 0 },
                  ].map((step, idx) => (
                    <div key={step.num} className="d-flex align-items-center gap-2">
                      <div
                        className="d-flex align-items-center justify-content-center rounded-circle fw-bold flex-shrink-0"
                        style={{
                          width: "26px", height: "26px", fontSize: "12px",
                          backgroundColor: step.active ? "#1a237e" : "#e0e0e0",
                          color: step.active ? "#fff" : "#999",
                        }}
                      >
                        {step.num}
                      </div>
                      <span style={{ color: step.active ? "#1a237e" : "#bbb", fontWeight: step.active ? 600 : 400 }}>
                        {step.label}
                      </span>
                      {idx < 2 && (
                        <i className="fa-solid fa-chevron-right text-muted" style={{ fontSize: "9px", marginLeft: "2px" }}></i>
                      )}
                    </div>
                  ))}
                </div>

                {/* ── From ➜ To Row ── */}
                <div
                  className="row g-3 mb-3 p-3 rounded"
                  style={{ backgroundColor: "#fff", border: "1px solid #e0e0e0" }}
                >
                  {/* From employee */}
                  <div className="col-12 col-md-5">
                    <label className="form-label fw-semibold mb-1" style={{ fontSize: "12px", color: "#c62828" }}>
                      <i className="fa-solid fa-user-minus me-1"></i>
                      Current Owner (From)
                    </label>
                    <select
                      className="form-select form-select-sm rounded-0"
                      value={fromEmployee}
                      onChange={(e) => setFromEmployee(e.target.value)}
                      disabled={empLoading || reassigning}
                      style={{ fontSize: "13px" }}
                    >
                      <option value="">
                        {empLoading ? "Loading employees..." : "-- Select current owner --"}
                      </option>
                      {employees.map((emp) => (
                        <option key={emp._id} value={emp.name}>{emp.name}</option>
                      ))}
                    </select>
                    {fromEmployee && !custLoading && (
                      <small className="text-muted d-block mt-1" style={{ fontSize: "11px" }}>
                        <i className="fa-solid fa-circle-info me-1"></i>
                        <strong>{custList.length}</strong> customer{custList.length !== 1 ? "s" : ""} owned by {fromEmployee}
                      </small>
                    )}
                    {custLoading && (
                      <small className="text-info d-block mt-1" style={{ fontSize: "11px" }}>
                        <i className="fa fa-spinner fa-spin me-1"></i>Loading customers...
                      </small>
                    )}
                  </div>

                  {/* Arrow */}
                  <div className="col-12 col-md-2 d-flex align-items-center justify-content-center">
                    <div
                      className="d-flex align-items-center justify-content-center rounded-circle"
                      style={{ width: "38px", height: "38px", backgroundColor: "#e8eaf6", marginTop: "18px" }}
                    >
                      <i className="fa-solid fa-arrow-right" style={{ color: "#1a237e", fontSize: "16px" }}></i>
                    </div>
                  </div>

                  {/* To employee */}
                  <div className="col-12 col-md-5">
                    <label className="form-label fw-semibold mb-1" style={{ fontSize: "12px", color: "#2e7d32" }}>
                      <i className="fa-solid fa-user-plus me-1"></i>
                      New Owner (To)
                    </label>
                    <select
                      className="form-select form-select-sm rounded-0"
                      value={toEmployee}
                      onChange={(e) => setToEmployee(e.target.value)}
                      disabled={empLoading || reassigning || !fromEmployee || selectedCustIds.length === 0}
                      style={{ fontSize: "13px" }}
                    >
                      <option value="">
                        {!fromEmployee
                          ? "Select current owner first"
                          : selectedCustIds.length === 0
                          ? "Select customers first"
                          : "-- Select new owner --"}
                      </option>
                      {employees
                        .filter((emp) => emp.name !== fromEmployee)
                        .map((emp) => (
                          <option key={emp._id} value={emp.name}>{emp.name}</option>
                        ))}
                    </select>
                    {toEmployee && (
                      <small className="text-success d-block mt-1" style={{ fontSize: "11px" }}>
                        <i className="fa-solid fa-circle-check me-1"></i>
                        <strong>{selectedCustIds.length}</strong> customer{selectedCustIds.length !== 1 ? "s" : ""} will be assigned to <strong>{toEmployee}</strong>
                      </small>
                    )}
                  </div>
                </div>

                {/* ── Customer List ── */}
                {fromEmployee ? (
                  <div
                    className="border rounded overflow-hidden"
                    style={{ border: "1px solid #c5cae9 !important" }}
                  >
                    {/* List header */}
                    <div
                      className="d-flex align-items-center justify-content-between px-3 py-2"
                      style={{ backgroundColor: "#e8eaf6", borderBottom: "1px solid #c5cae9" }}
                    >
                      <div className="d-flex align-items-center gap-2">
                        <input
                          type="checkbox"
                          className="form-check-input mb-0"
                          style={{ width: "15px", height: "15px", cursor: "pointer" }}
                          checked={allSelected}
                          ref={(el) => { if (el) el.indeterminate = someSelected; }}
                          onChange={handleSelectAll}
                          disabled={custLoading || custList.length === 0 || reassigning}
                        />
                        <span className="fw-semibold" style={{ fontSize: "13px", color: "#1a237e" }}>
                          {custLoading
                            ? "Loading customers..."
                            : custList.length === 0
                            ? `No customers owned by ${fromEmployee}`
                            : `Customers of ${fromEmployee} — ${selectedCustIds.length} / ${custList.length} selected`}
                        </span>
                      </div>

                      <div className="d-flex align-items-center gap-2">
                        {selectedCustIds.length > 0 && (
                          <>
                            <span className="badge bg-primary" style={{ fontSize: "11px" }}>
                              {selectedCustIds.length} selected
                            </span>
                            <button
                              type="button"
                              className="btn btn-outline-secondary btn-sm py-0 px-2"
                              style={{ fontSize: "11px" }}
                              onClick={() => setSelectedCustIds([])}
                              disabled={reassigning}
                            >
                              Clear
                            </button>
                          </>
                        )}
                        {custList.length > 0 && selectedCustIds.length !== custList.length && (
                          <button
                            type="button"
                            className="btn btn-outline-primary btn-sm py-0 px-2"
                            style={{ fontSize: "11px" }}
                            onClick={handleSelectAll}
                            disabled={reassigning}
                          >
                            Select All ({custList.length})
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Customer rows */}
                    <div
                      style={{
                        maxHeight: "300px",
                        overflowY: "auto",
                        backgroundColor: "#fff",
                      }}
                    >
                      {custLoading ? (
                        <div className="text-center py-5 text-muted">
                          <i className="fa fa-spinner fa-spin me-2" style={{ fontSize: "20px" }}></i>
                          <div style={{ fontSize: "13px", marginTop: "8px" }}>Loading customers...</div>
                        </div>
                      ) : custList.length === 0 ? (
                        <div
                          className="text-center py-5"
                          style={{ backgroundColor: "#fff8e1" }}
                        >
                          <i className="fa-solid fa-inbox text-warning mb-2" style={{ fontSize: "28px" }}></i>
                          <div className="text-muted" style={{ fontSize: "13px" }}>
                            No customers are currently owned by <strong>{fromEmployee}</strong>
                          </div>
                        </div>
                      ) : (
                        custList.map((cust, idx) => {
                          const isChecked = selectedCustIds.includes(cust._id);
                          return (
                            <div
                              key={cust._id}
                              className="d-flex align-items-center px-3 py-2"
                              style={{
                                borderBottom: "1px solid #f0f0f0",
                                backgroundColor: isChecked ? "#e8eaf6" : idx % 2 === 0 ? "#fff" : "#fafafa",
                                cursor: reassigning ? "not-allowed" : "pointer",
                                transition: "background-color 0.1s",
                              }}
                              onClick={() => !reassigning && handleToggleCust(cust._id)}
                            >
                              {/* Checkbox */}
                              <input
                                type="checkbox"
                                className="form-check-input me-3 mb-0 flex-shrink-0"
                                style={{ width: "15px", height: "15px", cursor: "pointer" }}
                                checked={isChecked}
                                onChange={() => handleToggleCust(cust._id)}
                                disabled={reassigning}
                                onClick={(e) => e.stopPropagation()}
                              />

                              {/* Customer info */}
                              <div className="flex-grow-1" style={{ minWidth: 0 }}>
                                <div className="d-flex align-items-center gap-2 flex-wrap">
                                  <span className="fw-semibold" style={{ fontSize: "13px" }}>
                                    {cust.custName}
                                  </span>
                                  {cust.customerType === "branch" ? (
                                    <span className="badge bg-info" style={{ fontSize: "10px" }}>
                                      <i className="fa-solid fa-code-branch me-1"></i>Branch
                                    </span>
                                  ) : (
                                    <span className="badge bg-primary" style={{ fontSize: "10px" }}>
                                      <i className="fa-solid fa-building me-1"></i>Main
                                    </span>
                                  )}
                                  {cust.customerPriority && (
                                    <span className={getPriorityBadge(cust.customerPriority)} style={{ fontSize: "10px" }}>
                                      {cust.customerPriority}
                                    </span>
                                  )}
                                </div>
                                <div className="d-flex gap-3 flex-wrap mt-1" style={{ fontSize: "11px", color: "#888" }}>
                                  {cust.email && (
                                    <span>
                                      <i className="fa-solid fa-envelope me-1"></i>{cust.email}
                                    </span>
                                  )}
                                  {cust.industryType && (
                                    <span>
                                      <i className="fa-solid fa-industry me-1"></i>
                                      {cust.industryType === "Other" ? (cust.industryTypeOther || "Other") : cust.industryType}
                                    </span>
                                  )}
                                  {cust.zone && (
                                    <span>
                                      <i className="fa-solid fa-map-pin me-1"></i>{cust.zone}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Selected checkmark */}
                              {isChecked && (
                                <i
                                  className="fa-solid fa-circle-check text-primary flex-shrink-0 ms-2"
                                  style={{ fontSize: "18px" }}
                                ></i>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                ) : (
                  /* Empty state — no employee selected yet */
                  <div
                    className="text-center py-5 rounded"
                    style={{ border: "2px dashed #e0e0e0", backgroundColor: "#fafafa" }}
                  >
                    <i className="fa-solid fa-users mb-2" style={{ fontSize: "36px", color: "#bdbdbd" }}></i>
                    <div className="text-muted" style={{ fontSize: "13px" }}>
                      Select the <strong>current owner</strong> above to see their customers
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* ── Footer ── */}
          {!done && (
            <div
              className="modal-footer px-4 py-3"
              style={{ backgroundColor: "#f5f5f5", borderTop: "1px solid #e0e0e0" }}
            >
              <div className="d-flex align-items-center justify-content-between w-100 flex-wrap gap-2">
                <small className="text-muted" style={{ fontSize: "11px" }}>
                  <i className="fa-solid fa-circle-info me-1 text-primary"></i>
                  Only the <strong>Owned By</strong> field will be updated. All other customer data stays unchanged.
                </small>
                <div className="d-flex gap-2">
                  <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm px-4"
                    onClick={onClose}
                    disabled={reassigning}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm px-4"
                    onClick={handleReassign}
                    disabled={
                      reassigning ||
                      !fromEmployee ||
                      selectedCustIds.length === 0 ||
                      !toEmployee ||
                      fromEmployee === toEmployee
                    }
                  >
                    {reassigning ? (
                      <><i className="fa fa-spinner fa-spin me-1"></i>Reassigning...</>
                    ) : (
                      <>
                        <i className="fa-solid fa-arrows-rotate me-1"></i>
                        Reassign {selectedCustIds.length > 0 ? `(${selectedCustIds.length})` : ""}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default ReassignOwnedByPopUp;