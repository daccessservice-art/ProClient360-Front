import { useState, useEffect, useMemo } from "react";
import toast from "react-hot-toast";

// ─── Warranty Radio Group ─────────────────────────────────────────────────────
const WarrantyRadio = ({ label, value, onChange }) => {
    const opts = ["Customer", "YourSelf"];
    return (
        <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "7px 12px", borderBottom: "1px solid #e9ecef" }}>
            <span style={{ fontSize: "12px", fontWeight: "600", color: "#2c3e50", minWidth: "175px" }}>{label}</span>
            <div style={{ display: "flex", gap: "8px" }}>
                {opts.map((opt) => (
                    <label
                        key={opt}
                        style={{
                            display: "flex", alignItems: "center", gap: "5px",
                            cursor: "pointer", fontSize: "12px", fontWeight: value === opt ? "700" : "400",
                            padding: "3px 12px", borderRadius: "20px", border: `1.5px solid ${value === opt ? "#2c3e50" : "#ced4da"}`,
                            background: value === opt ? "#2c3e50" : "#fff", color: value === opt ? "#fff" : "#495057",
                            transition: "all 0.18s",
                        }}
                    >
                        <input
                            type="radio" name={label.replace(/\s+/g, "_")} value={opt}
                            checked={value === opt} onChange={() => onChange(opt)}
                            style={{ display: "none" }}
                        />
                        {opt}
                    </label>
                ))}
            </div>
        </div>
    );
};

// ─── MRF Popup ────────────────────────────────────────────────────────────────
const MRFPopup = ({ selectedProject, handleMRF }) => {
    const today = new Date().toISOString().split("T")[0];

    // ── Header fields ──
    const [mrfNo,       setMrfNo]       = useState("");
    const [date,        setDate]        = useState(today);
    const [nameOfSite,  setNameOfSite]  = useState("");
    const [supplyType,  setSupplyType]  = useState("Project");  // Project | Dealer

    // ── Contact panels (4 panels) ──
    // 1. Customer's GRN Team Contact Details
    const [grnName,    setGrnName]    = useState("");
    const [grnContact, setGrnContact] = useState("");
    const [grnEmail,   setGrnEmail]   = useState("");

    // 2. Customer Project Team Details
    const [cptName,    setCptName]    = useState("");
    const [cptContact, setCptContact] = useState("");
    const [cptEmail,   setCptEmail]   = useState("");

    // 3. Customer's Project Team Contact Details  (NEW 3rd panel)
    const [cptcName,    setCptcName]    = useState("");
    const [cptcContact, setCptcContact] = useState("");
    const [cptcEmail,   setCptcEmail]   = useState("");

    // 4. Project Created By (auto-filled from project.createdBy)
    const createdByName = selectedProject?.createdBy?.name || "—";

    // ── Material rows  ── simplified columns: Sr, PartNo, Make, ModelNo, Description, Qty, Del
    const emptyRow = () => ({
        srNo: 1, partNo: "", make: "", modelNo: "",
        materialDescription: "", qty: "",
    });
    const [rows,       setRows]       = useState([emptyRow()]);
    const [matSearch,  setMatSearch]  = useState("");

    // ── Customer MOM description ──
    const [momDescription, setMomDescription] = useState("");

    // ── Scope of Works / Warranty radios ──
    const [cablingWarranty,     setCablingWarranty]     = useState("");
    const [civilWarranty,       setCivilWarranty]       = useState("");
    const [chimbyPicksWarranty, setChimbyPicksWarranty] = useState("");
    const [fabricationWarranty, setFabricationWarranty] = useState("");

    const [loading, setLoading] = useState(false);

    // ── Auto-fill from project ──
    const customerName  = selectedProject?.custId?.custName    || "";
    const customerPONo  = selectedProject?.purchaseOrderNo     || "";
    const projectName   = selectedProject?.name                || "";
    const addr          = selectedProject?.Address;
    const billingAddress = addr
        ? [addr.add, addr.city, addr.state, addr.country, addr.pincode].filter(Boolean).join(", ")
        : "";

    // ── Filtered rows for search ──
    const filteredRows = useMemo(() => {
        if (!matSearch.trim()) return rows;
        const q = matSearch.toLowerCase();
        return rows.filter(r =>
            r.materialDescription.toLowerCase().includes(q) ||
            r.partNo.toLowerCase().includes(q) ||
            r.make.toLowerCase().includes(q) ||
            r.modelNo.toLowerCase().includes(q)
        );
    }, [rows, matSearch]);

    // ── Row handlers ──
    const handleRowChange = (index, field, value) => {
        setRows(prev => {
            const updated = [...prev];
            updated[index] = { ...updated[index], [field]: value };
            return updated;
        });
    };

    const addRow = () => {
        setRows(prev => [...prev, { ...emptyRow(), srNo: prev.length + 1 }]);
    };

    const removeRow = (index) => {
        if (rows.length === 1) return toast.error("At least one row is required.");
        setRows(prev => prev.filter((_, i) => i !== index).map((r, i) => ({ ...r, srNo: i + 1 })));
    };

    // ── Submit ──
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!mrfNo.trim())  return toast.error("MRF Number is required");
        if (!date)          return toast.error("Date is required");
        if (rows.some(r => !r.materialDescription.trim()))
            return toast.error("Material Description is required for all rows");

        setLoading(true);
        try {
            // TODO: call createMRF API
            // await createMRF({ mrfNo, date, nameOfSite, supplyType, projectId: selectedProject._id,
            //   grnTeam:{grnName,grnContact,grnEmail}, customerProjectTeam:{cptName,cptContact},
            //   customerProjectTeamContact:{cptcName,cptcContact,cptcEmail}, createdBy: createdByName,
            //   rows, momDescription,
            //   scopeOfWorks:{ cablingWarranty, civilWarranty, chimbyPicksWarranty, fabricationWarranty }
            // });
            toast.success("MRF Created Successfully!");
            handleMRF();
        } catch {
            toast.error("Failed to create MRF");
        } finally {
            setLoading(false);
        }
    };

    // ── Styles ──
    const th = {
        background: "#2c3e50", color: "#fff", fontSize: "11px",
        padding: "7px 8px", border: "1px solid #444",
        whiteSpace: "nowrap", textAlign: "center", verticalAlign: "middle",
    };
    const td = {
        padding: "4px 5px", border: "1px solid #dee2e6", verticalAlign: "middle",
    };
    const inp = {
        fontSize: "11px", padding: "3px 6px", borderRadius: "3px",
        border: "1px solid #ccc", width: "100%",
    };
    const lbl = { fontSize: "11px", fontWeight: "600", color: "#2c3e50", display: "block", marginBottom: "2px" };
    const panelHead = (bg) => ({
        fontSize: "11px", fontWeight: "700", background: bg,
        padding: "4px 10px", borderRadius: "4px 4px 0 0",
        letterSpacing: "0.3px", textTransform: "uppercase",
    });

    return (
        <div style={{
            position: "fixed", inset: 0, zIndex: 1060,
            background: "#00000092", display: "flex",
            alignItems: "flex-start", justifyContent: "center",
            overflowY: "auto", paddingTop: "18px", paddingBottom: "18px",
        }}>
            <div style={{ width: "97%", maxWidth: "1300px" }}>
                <div style={{ borderRadius: "8px", overflow: "hidden", background: "#fff", boxShadow: "0 8px 40px rgba(0,0,0,0.35)" }}>

                    {/* ════ HEADER ════ */}
                    <div style={{
                        background: "linear-gradient(135deg,#1a252f 0%,#2c3e50 100%)",
                        padding: "13px 20px", display: "flex", alignItems: "center", justifyContent: "space-between",
                    }}>
                        <div>
                            <div style={{ color: "#fff", fontWeight: 700, fontSize: "15px" }}>
                                Material Requisition Form (MRF)
                            </div>
                            {projectName && (
                                <small style={{ color: "#aec6cf", fontSize: "11px" }}>Project: {projectName}</small>
                            )}
                        </div>
                        <button onClick={handleMRF} type="button" style={{
                            background: "rgba(255,255,255,0.15)", border: "none", color: "#fff",
                            borderRadius: "50%", width: "29px", height: "29px", cursor: "pointer",
                            fontSize: "16px", display: "flex", alignItems: "center", justifyContent: "center",
                        }}>×</button>
                    </div>

                    <form onSubmit={handleSubmit}>
                        <div style={{ padding: "16px", maxHeight: "82vh", overflowY: "auto" }}>

                            {/* ════ SECTION 1 : MRF Header Info ════ */}
                            <div style={{ border: "2px solid #2c3e50", borderRadius: "6px", marginBottom: "14px", overflow: "hidden" }}>

                                {/* Row A: MRF fields + Supply Only */}
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 130px", borderBottom: "1px solid #dee2e6" }}>
                                    <div style={{ padding: "10px 14px" }}>
                                        <div className="row g-2">
                                            {/* MRF No */}
                                            <div className="col-6 col-md-3">
                                                <label style={lbl}>MRF No <span style={{color:"red"}}>*</span></label>
                                                <input style={inp} value={mrfNo} onChange={e=>setMrfNo(e.target.value)} placeholder="MRF-001" required />
                                            </div>
                                            {/* Date */}
                                            <div className="col-6 col-md-3">
                                                <label style={lbl}>Date <span style={{color:"red"}}>*</span></label>
                                                <input type="date" style={inp} value={date} onChange={e=>setDate(e.target.value)} required />
                                            </div>
                                            {/* Customer Name – auto */}
                                            <div className="col-6 col-md-3">
                                                <label style={lbl}>Name of Customer</label>
                                                <input style={{...inp, background:"#e9ecef", cursor:"not-allowed"}} value={customerName} readOnly />
                                            </div>
                                            {/* Customer PO No – auto */}
                                            <div className="col-6 col-md-3">
                                                <label style={lbl}>Customer PO No</label>
                                                <input style={{...inp, background:"#e9ecef", cursor:"not-allowed"}} value={customerPONo} readOnly />
                                            </div>
                                            {/* Created By – auto from project */}
                                            <div className="col-6 col-md-3">
                                                <label style={lbl}>Created By</label>
                                                <input style={{...inp, background:"#e9ecef", cursor:"not-allowed"}} value={createdByName} readOnly />
                                            </div>
                                            {/* Name of Site */}
                                            <div className="col-6 col-md-3">
                                                <label style={lbl}>Name of Site</label>
                                                <input style={inp} value={nameOfSite} onChange={e=>setNameOfSite(e.target.value)} placeholder="Site name" />
                                            </div>
                                            {/* Billing Address – auto */}
                                            <div className="col-12 col-md-6">
                                                <label style={lbl}>Billing Address</label>
                                                <input style={{...inp, background:"#e9ecef", cursor:"not-allowed"}} value={billingAddress} readOnly />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Supply Only box */}
                                    <div style={{
                                        borderLeft: "2px solid #2c3e50", padding: "10px 12px",
                                        display: "flex", flexDirection: "column", gap: "6px",
                                    }}>
                                        <div style={{ fontSize: "11px", fontWeight: "700", textAlign: "center", color: "#2c3e50", marginBottom: "4px" }}>
                                            Supply Only
                                        </div>
                                        {["Project", "Dealer"].map(opt => (
                                            <label key={opt} style={{
                                                display: "flex", alignItems: "center", gap: "6px",
                                                fontSize: "11px", cursor: "pointer", padding: "4px 8px",
                                                borderRadius: "4px", border: `2px solid ${supplyType===opt?"#2c3e50":"#dee2e6"}`,
                                                background: supplyType===opt?"#2c3e50":"#fff",
                                                color: supplyType===opt?"#fff":"#2c3e50",
                                                fontWeight: supplyType===opt?"700":"400",
                                                transition: "all 0.18s",
                                            }}>
                                                <input type="radio" name="supplyType" value={opt}
                                                    checked={supplyType===opt} onChange={()=>setSupplyType(opt)}
                                                    style={{display:"none"}} />
                                                {supplyType===opt?"●":"○"} {opt}
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                {/* Row B: 4 Contact Panels */}
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", borderTop: "1px solid #dee2e6" }}>

                                    {/* Panel 1 – Customer's GRN Team */}
                                    <div style={{ padding: "8px 10px", borderRight: "1px solid #dee2e6" }}>
                                        <div style={panelHead("#fff3cd")}>Customer's GRN Team Contact Details</div>
                                        <div style={{ padding: "6px 0 0" }}>
                                            <label style={lbl}>Name</label>
                                            <input style={{...inp, marginBottom:"4px"}} value={grnName} onChange={e=>setGrnName(e.target.value)} placeholder="Name" />
                                            <label style={lbl}>Contact No</label>
                                            <input style={{...inp, marginBottom:"4px"}} value={grnContact} onChange={e=>setGrnContact(e.target.value)} placeholder="Contact" maxLength={15} />
                                            <label style={lbl}>Email ID</label>
                                            <input style={inp} type="email" value={grnEmail} onChange={e=>setGrnEmail(e.target.value)} placeholder="Email" />
                                        </div>
                                    </div>

                                    {/* Panel 2 – Customer Project Team Details */}
                                    <div style={{ padding: "8px 10px", borderRight: "1px solid #dee2e6" }}>
                                        <div style={panelHead("#e3f2fd")}>Customer Project Team Details</div>
                                        <div style={{ padding: "6px 0 0" }}>
                                            <label style={lbl}>Name</label>
                                            <input style={{...inp, marginBottom:"4px"}} value={cptName} onChange={e=>setCptName(e.target.value)} placeholder="Name" />
                                            <label style={lbl}>Contact No</label>
                                            <input style={{...inp, marginBottom:"4px"}} value={cptContact} onChange={e=>setCptContact(e.target.value)} placeholder="Contact" />
                                            <label style={lbl}>Email ID</label>
                                            <input style={inp} type="email" value={cptEmail} onChange={e=>setCptEmail(e.target.value)} placeholder="Email" />
                                        </div>
                                    </div>

                                    {/* Panel 3 – Customer's Project Team Contact Details (NEW) */}
                                    <div style={{ padding: "8px 10px", borderRight: "1px solid #dee2e6" }}>
                                        <div style={panelHead("#e8f5e9")}>Customer's Project Team Contact Details</div>
                                        <div style={{ padding: "6px 0 0" }}>
                                            <label style={lbl}>Name</label>
                                            <input style={{...inp, marginBottom:"4px"}} value={cptcName} onChange={e=>setCptcName(e.target.value)} placeholder="Name" />
                                            <label style={lbl}>Contact No</label>
                                            <input style={{...inp, marginBottom:"4px"}} value={cptcContact} onChange={e=>setCptcContact(e.target.value)} placeholder="Contact" maxLength={15} />
                                            <label style={lbl}>Email ID</label>
                                            <input style={inp} type="email" value={cptcEmail} onChange={e=>setCptcEmail(e.target.value)} placeholder="Email" />
                                        </div>
                                    </div>

                                    {/* Panel 4 – Created By (auto from project) */}
                                    <div style={{ padding: "8px 10px" }}>
                                        <div style={panelHead("#fce4ec")}>Project Created By</div>
                                        <div style={{ padding: "8px 0 0" }}>
                                            <div style={{
                                                background: "#f8f9fa", border: "1px solid #dee2e6",
                                                borderRadius: "5px", padding: "10px 12px",
                                                fontSize: "13px", fontWeight: "700", color: "#2c3e50",
                                                display: "flex", alignItems: "center", gap: "8px"
                                            }}>
                                                <span style={{
                                                    background: "#2c3e50", color: "#fff", borderRadius: "50%",
                                                    width: "30px", height: "30px", display: "flex",
                                                    alignItems: "center", justifyContent: "center", fontSize: "13px", fontWeight: "700",
                                                }}>
                                                    {createdByName.charAt(0).toUpperCase()}
                                                </span>
                                                {createdByName}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* ════ SECTION 2 : Material Table ════ */}
                            <div style={{ marginBottom: "14px" }}>
                                {/* Table Header bar with search */}
                                <div style={{
                                    background: "#2c3e50", padding: "8px 14px", borderRadius: "6px 6px 0 0",
                                    display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", flexWrap: "wrap",
                                }}>
                                    <span style={{ color: "#fff", fontWeight: 700, fontSize: "12px" }}>
                                        📦 Material List as per Purchase Order
                                    </span>
                                    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                                        {/* Search bar */}
                                        <div style={{ position: "relative" }}>
                                            <input
                                                style={{
                                                    ...inp, width: "220px", paddingLeft: "26px",
                                                    background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.3)",
                                                    color: "#fff", borderRadius: "20px",
                                                }}
                                                placeholder="🔍 Search material..."
                                                value={matSearch}
                                                onChange={e => setMatSearch(e.target.value)}
                                            />
                                        </div>
                                        <button type="button" onClick={addRow} style={{
                                            background: "#27ae60", border: "none", color: "#fff",
                                            borderRadius: "4px", padding: "4px 14px", cursor: "pointer",
                                            fontSize: "11px", fontWeight: "700", whiteSpace: "nowrap",
                                        }}>
                                            + Add Row
                                        </button>
                                    </div>
                                </div>

                                <div style={{ overflowX: "auto", border: "2px solid #2c3e50", borderTop: "none", borderRadius: "0 0 6px 6px" }}>
                                    <table style={{ borderCollapse: "collapse", width: "100%", fontSize: "11px", minWidth: "700px" }}>
                                        <thead>
                                            <tr>
                                                <th style={{ ...th, width: "40px" }}>Sr. No</th>
                                                <th style={{ ...th, minWidth: "80px" }}>Part No.</th>
                                                <th style={{ ...th, minWidth: "90px" }}>Make</th>
                                                <th style={{ ...th, minWidth: "100px" }}>Model No.</th>
                                                <th style={{ ...th, minWidth: "260px" }}>Material Description with Specification</th>
                                                <th style={{ ...th, width: "70px" }}>Qty</th>
                                                <th style={{ ...th, width: "42px" }}>Del</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredRows.length === 0 ? (
                                                <tr>
                                                    <td colSpan={7} style={{ ...td, textAlign: "center", color: "#888", padding: "14px" }}>
                                                        No material found for "{matSearch}"
                                                    </td>
                                                </tr>
                                            ) : filteredRows.map((row, index) => {
                                                // find real index in rows array
                                                const realIdx = rows.findIndex(r => r === row);
                                                return (
                                                    <tr key={realIdx} style={{ background: realIdx % 2 === 0 ? "#fff" : "#f8f9fa" }}>
                                                        <td style={{ ...td, textAlign: "center", fontWeight: "700" }}>{row.srNo}</td>
                                                        <td style={td}>
                                                            <input style={inp} value={row.partNo}
                                                                onChange={e => handleRowChange(realIdx, "partNo", e.target.value)} />
                                                        </td>
                                                        <td style={td}>
                                                            <input style={inp} value={row.make}
                                                                onChange={e => handleRowChange(realIdx, "make", e.target.value)} />
                                                        </td>
                                                        <td style={td}>
                                                            <input style={inp} value={row.modelNo}
                                                                onChange={e => handleRowChange(realIdx, "modelNo", e.target.value)} />
                                                        </td>
                                                        <td style={td}>
                                                            <textarea
                                                                style={{ ...inp, resize: "vertical", minHeight: "34px" }}
                                                                value={row.materialDescription}
                                                                onChange={e => handleRowChange(realIdx, "materialDescription", e.target.value)}
                                                                rows={2} required
                                                            />
                                                        </td>
                                                        <td style={td}>
                                                            <input style={inp} type="number" min="0"
                                                                value={row.qty}
                                                                onChange={e => handleRowChange(realIdx, "qty", e.target.value)} />
                                                        </td>
                                                        <td style={{ ...td, textAlign: "center" }}>
                                                            <button type="button" onClick={() => removeRow(realIdx)} style={{
                                                                background: "#e74c3c", border: "none", color: "#fff",
                                                                borderRadius: "3px", width: "24px", height: "24px",
                                                                cursor: "pointer", fontSize: "13px",
                                                            }} title="Delete row">✕</button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Summary strip */}
                                <div style={{
                                    background: "#eaf4fb", border: "1px solid #aed6f1", borderTop: "none",
                                    borderRadius: "0 0 6px 6px", padding: "5px 14px",
                                    fontSize: "11px", display: "flex", gap: "20px", flexWrap: "wrap",
                                }}>
                                    <span><strong>Total Items:</strong> {rows.length}</span>
                                    <span><strong>Total Qty:</strong> {rows.reduce((s, r) => s + (Number(r.qty) || 0), 0)}</span>
                                    {matSearch && <span style={{ color: "#e67e22" }}><strong>Showing:</strong> {filteredRows.length} of {rows.length}</span>}
                                </div>
                            </div>

                            {/* ════ SECTION 3 : Customer MOM Description ════ */}
                            <div style={{
                                border: "2px solid #2c3e50", borderRadius: "6px",
                                marginBottom: "14px", overflow: "hidden",
                            }}>
                                <div style={{
                                    background: "#2c3e50", color: "#fff",
                                    padding: "7px 14px", fontSize: "12px", fontWeight: "700",
                                }}>
                                    📝 Customer MOM Description
                                </div>
                                <div style={{ padding: "10px 14px" }}>
                                    <textarea
                                        style={{
                                            width: "100%", fontSize: "12px", padding: "8px 10px",
                                            border: "1px solid #ccc", borderRadius: "4px",
                                            resize: "vertical", minHeight: "80px", lineHeight: "1.5",
                                        }}
                                        placeholder="Enter customer MOM (Minutes of Meeting) description / notes..."
                                        value={momDescription}
                                        onChange={e => setMomDescription(e.target.value)}
                                        rows={3}
                                        maxLength={2000}
                                    />
                                    <div style={{ fontSize: "10px", color: "#888", textAlign: "right", marginTop: "2px" }}>
                                        {momDescription.length} / 2000
                                    </div>
                                </div>
                            </div>

                            {/* ════ SECTION 4 : Scope of Works (Warranty Radios) ════ */}
                            <div style={{
                                border: "2px solid #2c3e50", borderRadius: "6px",
                                marginBottom: "6px", overflow: "hidden",
                            }}>
                                <div style={{
                                    background: "#2c3e50", color: "#fff",
                                    padding: "7px 14px", fontSize: "12px", fontWeight: "700",
                                }}>
                                    🔧 Scope of Works
                                </div>

                                {/* Column headers */}
                                <div style={{
                                    display: "flex", alignItems: "center", gap: "10px",
                                    padding: "6px 12px", background: "#f1f3f5",
                                    borderBottom: "1px solid #dee2e6", fontSize: "11px", fontWeight: "700", color: "#495057",
                                }}>
                                    <span style={{ minWidth: "175px" }}>Item</span>
                                    <span>Responsibility</span>
                                </div>

                                <WarrantyRadio
                                    label="1. Cabling Warranty"
                                    value={cablingWarranty}
                                    onChange={setCablingWarranty}
                                />
                                <WarrantyRadio
                                    label="2. Civil Warranty"
                                    value={civilWarranty}
                                    onChange={setCivilWarranty}
                                />
                                <WarrantyRadio
                                    label="3. Chimby Picks Ladder"
                                    value={chimbyPicksWarranty}
                                    onChange={setChimbyPicksWarranty}
                                />
                                <WarrantyRadio
                                    label="4. Fabrication Warranty"
                                    value={fabricationWarranty}
                                    onChange={setFabricationWarranty}
                                />
                            </div>

                        </div>{/* end scrollable body */}

                        {/* ════ FOOTER ════ */}
                        <div style={{
                            background: "#f8f9fa", borderTop: "1px solid #dee2e6",
                            padding: "11px 20px", display: "flex", gap: "10px", justifyContent: "flex-end",
                        }}>
                            <button type="button" onClick={handleMRF} disabled={loading} style={{
                                background: "#6c757d", border: "none", color: "#fff",
                                borderRadius: "5px", padding: "8px 22px", cursor: "pointer",
                                fontWeight: "600", fontSize: "13px",
                            }}>
                                Cancel
                            </button>
                            <button type="submit" disabled={loading} style={{
                                background: "linear-gradient(135deg,#1a252f 0%,#2c3e50 100%)",
                                border: "none", color: "#fff", borderRadius: "5px",
                                padding: "8px 26px", cursor: "pointer", fontWeight: "700",
                                fontSize: "13px", boxShadow: "0 2px 8px rgba(44,62,80,0.3)",
                            }}>
                                {loading ? "Saving..." : "💾 Save MRF"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default MRFPopup;