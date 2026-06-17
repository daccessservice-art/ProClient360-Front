import { useState, useEffect, useMemo } from "react";
import toast from "react-hot-toast";
import { getProducts } from "../../../../../hooks/useProduct";
import { createMRF } from "../../../../../hooks/useMRF";

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
    const [mrfNo, setMrfNo] = useState("");
    const [date, setDate] = useState(today);
    const [nameOfSite, setNameOfSite] = useState("");
    const [supplyType, setSupplyType] = useState("Project");

    // ── Contact panels (4 panels) ──
    const [grnName,    setGrnName]    = useState("");
    const [grnContact, setGrnContact] = useState("");
    const [grnEmail,   setGrnEmail]   = useState("");

    const [cptName,    setCptName]    = useState("");
    const [cptContact, setCptContact] = useState("");
    const [cptEmail,   setCptEmail]   = useState("");

    const [cptcName,    setCptcName]    = useState("");
    const [cptcContact, setCptcContact] = useState("");
    const [cptcEmail,   setCptcEmail]   = useState("");

    const createdByName = selectedProject?.createdBy?.name || "—";

    // ── Material rows (schema-aligned with mrfModel.js → mrfItemSchema) ──
    const emptyRow = (srNo = 1) => ({
        srNo,
        productName: "",
        brandName: "",
        modelNo: "",
        materialDescription: "",
        qty: "",
        remark: "",
        _unit: "No.",
        _rate: 0,
    });
    const [rows, setRows] = useState([emptyRow(1)]);
    const [matSearch, setMatSearch] = useState("");

    // ── Product search state (hits /api/product) ──
    const [productResults, setProductResults] = useState([]);
    const [showProductDropdown, setShowProductDropdown] = useState(false);
    const [productLoading, setProductLoading] = useState(false);
    const [activeRowIndex, setActiveRowIndex] = useState(0);

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

    // ── In-table display filter ──
    const filteredRows = useMemo(() => {
        if (!matSearch.trim()) return rows;
        const q = matSearch.toLowerCase();
        return rows.filter(r =>
            (r.productName || "").toLowerCase().includes(q) ||
            (r.brandName  || "").toLowerCase().includes(q) ||
            (r.modelNo    || "").toLowerCase().includes(q) ||
            (r.materialDescription || "").toLowerCase().includes(q)
        );
    }, [rows, matSearch]);

    // ── Debounced product search via getProducts() ──
    useEffect(() => {
        const term = matSearch.trim();
        if (term.length < 1) {
            setProductResults([]);
            setShowProductDropdown(false);
            return;
        }
        let cancelled = false;
        const t = setTimeout(async () => {
            setProductLoading(true);
            try {
                const data = await getProducts(1, 50, term);
                if (!cancelled) {
                    if (data?.success && Array.isArray(data.products)) {
                        setProductResults(data.products);
                        setShowProductDropdown(data.products.length > 0);
                    } else {
                        setProductResults([]);
                        setShowProductDropdown(false);
                    }
                }
            } catch (e) {
                if (!cancelled) {
                    setProductResults([]);
                    setShowProductDropdown(false);
                }
            } finally {
                if (!cancelled) setProductLoading(false);
            }
        }, 350);
        return () => { cancelled = true; clearTimeout(t); };
    }, [matSearch]);

    // ── Add a product to a specific row (or append a new row) ──
    const addProductToRow = (product, rowIndex) => {
        const targetIdx = rowIndex == null ? rows.length - 1 : rowIndex;
        const builtRow = {
            srNo: targetIdx + 1,
            productName: product.productName || "",
            brandName: product.brandName || "",
            modelNo: product.model || "",
            materialDescription: product.description ||
                `${product.productName || ""} ${product.brandName || ""} ${product.model || ""}`.trim(),
            qty: "1",
            remark: "",
            _unit: product.baseUOM || "No.",
            _rate: parseFloat(product.salesPrice) || 0,
        };
        setRows(prev => {
            const target = prev[targetIdx];
            if (target && !target.productName && !target.brandName && !target.modelNo) {
                const updated = [...prev];
                updated[targetIdx] = builtRow;
                return updated;
            }
            return [...prev, { ...builtRow, srNo: prev.length + 1 }];
        });
        setMatSearch("");
        setShowProductDropdown(false);
        setProductResults([]);
        toast.success(`Added: ${builtRow.productName} (${builtRow.brandName} - ${builtRow.modelNo})`);
    };

    const handleRowChange = (index, field, value) => {
        setRows(prev => {
            const updated = [...prev];
            updated[index] = { ...updated[index], [field]: value };
            return updated;
        });
    };

    const addRow = () => {
        setRows(prev => [...prev, emptyRow(prev.length + 1)]);
        setActiveRowIndex(rows.length);
    };

    const removeRow = (index) => {
        if (rows.length === 1) return toast.error("At least one row is required.");
        setRows(prev => prev
            .filter((_, i) => i !== index)
            .map((r, i) => ({ ...r, srNo: i + 1 })));
    };

    // ── Submit — saves a real MRF document via POST /api/mrf ──
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!mrfNo.trim()) return toast.error("MRF Number is required");
        if (!date)         return toast.error("Date is required");

        if (rows.some(r => !r.productName.trim() && !r.materialDescription.trim()))
            return toast.error("Product Name / Material Description is required for all rows");
        if (rows.some(r => !r.qty || Number(r.qty) <= 0))
            return toast.error("Quantity must be greater than 0 for all rows");

        if (!selectedProject?._id)         return toast.error("Project is missing — cannot create MRF");
        if (!selectedProject?.custId?._id) return toast.error("Customer is missing — cannot create MRF");

        setLoading(true);
        try {
            // Map rows → mrfItemSchema shape so Mongoose validation passes
            const items = rows.map(r => {
                const qty   = parseInt(r.qty) || 1;
                const rate  = Number(r._rate) || 0;
                const total = qty * rate;
                return {
                    brandName: r.brandName || "N/A",
                    modelNo:   r.modelNo   || "N/A",
                    quantity:  qty,
                    unit:      r._unit || "No.",
                    rate,
                    discount:  0,
                    tax:       0,
                    total,
                    remark:    r.remark || r.materialDescription || "",
                };
            });

            const subtotal       = items.reduce((s, i) => s + i.total, 0);
            const totalTax       = 0;
            const transportCost  = 0;
            const transportTax   = 0;
            const grandTotal     = subtotal + totalTax + transportCost + transportTax;

            const mrfPayload = {
                choice:          "MRF Material Request",
                poNumber:        customerPONo || "",
                customer:        selectedProject.custId._id,
                project:         selectedProject._id,
                mrfDate:         date,
                transactionType: "B2B",
                purchaseType:    "Project Purchase",
                type:            "project",
                deliveryAddress: billingAddress,
                location:        nameOfSite,
                items,
                remark:          momDescription,
                subtotal,
                totalTax,
                transportCost,
                transportTax,
                grandTotal,
            };

            const data = await createMRF(mrfPayload);
            if (data?.success) {
                toast.success(data.message || "MRF Created Successfully!");
                handleMRF();
            } else {
                toast.error(data?.error || "Failed to create MRF");
            }
        } catch (err) {
            console.error("MRF create error:", err);
            toast.error("Failed to create MRF: " + (err?.message || "Unknown error"));
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

                                <div style={{ display: "grid", gridTemplateColumns: "1fr 130px", borderBottom: "1px solid #dee2e6" }}>
                                    <div style={{ padding: "10px 14px" }}>
                                        <div className="row g-2">
                                            <div className="col-6 col-md-3">
                                                <label style={lbl}>MRF No <span style={{color:"red"}}>*</span></label>
                                                <input style={inp} value={mrfNo} onChange={e=>setMrfNo(e.target.value)} placeholder="MRF-001" required />
                                            </div>
                                            <div className="col-6 col-md-3">
                                                <label style={lbl}>Date <span style={{color:"red"}}>*</span></label>
                                                <input type="date" style={inp} value={date} onChange={e=>setDate(e.target.value)} required />
                                            </div>
                                            <div className="col-6 col-md-3">
                                                <label style={lbl}>Name of Customer</label>
                                                <input style={{...inp, background:"#e9ecef", cursor:"not-allowed"}} value={customerName} readOnly />
                                            </div>
                                            <div className="col-6 col-md-3">
                                                <label style={lbl}>Customer PO No</label>
                                                <input style={{...inp, background:"#e9ecef", cursor:"not-allowed"}} value={customerPONo} readOnly />
                                            </div>
                                            <div className="col-6 col-md-3">
                                                <label style={lbl}>Created By</label>
                                                <input style={{...inp, background:"#e9ecef", cursor:"not-allowed"}} value={createdByName} readOnly />
                                            </div>
                                            <div className="col-6 col-md-3">
                                                <label style={lbl}>Name of Site</label>
                                                <input style={inp} value={nameOfSite} onChange={e=>setNameOfSite(e.target.value)} placeholder="Site name" />
                                            </div>
                                            <div className="col-12 col-md-6">
                                                <label style={lbl}>Billing Address</label>
                                                <input style={{...inp, background:"#e9ecef", cursor:"not-allowed"}} value={billingAddress} readOnly />
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{
                                        borderLeft: "2px solid #2c3e50", padding: "10px 12px",
                                        display: "flex", flexDirection: "column", gap: "6px",
                                    }}>
                                        <div style={{ fontSize: "11px", fontWeight: "700", textAlign: "center", color: "#2c3e50", marginBottom: "4px" }}>
                                            Supply Only
                                        </div>
                                        {["Project", "Supply"].map(opt => (
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

                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", borderTop: "1px solid #dee2e6" }}>
                                    <div style={{ padding: "8px 10px", borderRight: "1px solid #dee2e6" }}>
                                        <div style={panelHead("#fff3cd")}>Customer's Store Team Contact Details</div>
                                        <div style={{ padding: "6px 0 0" }}>
                                            <label style={lbl}>Name</label>
                                            <input style={{...inp, marginBottom:"4px"}} value={grnName} onChange={e=>setGrnName(e.target.value)} placeholder="Name" />
                                            <label style={lbl}>Contact No</label>
                                            <input style={{...inp, marginBottom:"4px"}} value={grnContact} onChange={e=>setGrnContact(e.target.value)} placeholder="Contact" maxLength={15} />
                                            <label style={lbl}>Email ID</label>
                                            <input style={inp} type="email" value={grnEmail} onChange={e=>setGrnEmail(e.target.value)} placeholder="Email" />
                                        </div>
                                    </div>

                                    <div style={{ padding: "8px 10px", borderRight: "1px solid #dee2e6" }}>
                                        <div style={panelHead("#e3f2fd")}>Customer Project Team Contact Details</div>
                                        <div style={{ padding: "6px 0 0" }}>
                                            <label style={lbl}>Name</label>
                                            <input style={{...inp, marginBottom:"4px"}} value={cptName} onChange={e=>setCptName(e.target.value)} placeholder="Name" />
                                            <label style={lbl}>Contact No</label>
                                            <input style={{...inp, marginBottom:"4px"}} value={cptContact} onChange={e=>setCptContact(e.target.value)} placeholder="Contact" />
                                            <label style={lbl}>Email ID</label>
                                            <input style={inp} type="email" value={cptEmail} onChange={e=>setCptEmail(e.target.value)} placeholder="Email" />
                                        </div>
                                    </div>

                                    <div style={{ padding: "8px 10px", borderRight: "1px solid #dee2e6" }}>
                                        <div style={panelHead("#e8f5e9")}>Customer's Accounts & Finance Team Contact Details</div>
                                        <div style={{ padding: "6px 0 0" }}>
                                            <label style={lbl}>Name</label>
                                            <input style={{...inp, marginBottom:"4px"}} value={cptcName} onChange={e=>setCptcName(e.target.value)} placeholder="Name" />
                                            <label style={lbl}>Contact No</label>
                                            <input style={{...inp, marginBottom:"4px"}} value={cptcContact} onChange={e=>setCptcContact(e.target.value)} placeholder="Contact" maxLength={15} />
                                            <label style={lbl}>Email ID</label>
                                            <input style={inp} type="email" value={cptcEmail} onChange={e=>setCptcEmail(e.target.value)} placeholder="Email" />
                                        </div>
                                    </div>

                                    <div style={{ padding: "8px 10px" }}>
                                        <div style={panelHead("#fce4ec")}>Project Created By Sales Person</div>
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
                                <div style={{
                                    background: "#2c3e50", padding: "8px 14px", borderRadius: "6px 6px 0 0",
                                    display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", flexWrap: "wrap",
                                    position: "relative",
                                }}>
                                    <span style={{ color: "#fff", fontWeight: 700, fontSize: "12px" }}>
                                        📦 Material List as per Purchase Order
                                    </span>
                                    <div style={{ display: "flex", gap: "8px", alignItems: "center", position: "relative" }}>
                                        <div style={{ position: "relative" }}>
                                            <input
                                                style={{
                                                    ...inp, width: "320px", paddingLeft: "26px",
                                                    background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.3)",
                                                    color: "#fff", borderRadius: "20px",
                                                }}
                                                placeholder="🔍 Search Product Name / Brand / Model..."
                                                value={matSearch}
                                                onChange={e => {
                                                    setMatSearch(e.target.value);
                                                    setShowProductDropdown(true);
                                                    setActiveRowIndex(rows.length - 1);
                                                }}
                                                onFocus={() => {
                                                    if (productResults.length > 0) setShowProductDropdown(true);
                                                }}
                                            />
                                            {productLoading && (
                                                <span style={{
                                                    position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)",
                                                    color: "#fff", fontSize: "10px",
                                                }}>...</span>
                                            )}

                                            {showProductDropdown && matSearch.trim().length > 0 && (
                                                <div style={{
                                                    position: "absolute", top: "100%", right: 0, marginTop: "4px",
                                                    background: "#fff", color: "#2c3e50",
                                                    borderRadius: "6px", boxShadow: "0 6px 20px rgba(0,0,0,0.25)",
                                                    width: "560px", maxHeight: "340px", overflowY: "auto",
                                                    zIndex: 9999, border: "1px solid #dee2e6",
                                                }}>
                                                    <div style={{
                                                        padding: "6px 10px", background: "#f1f3f5",
                                                        fontSize: "10px", fontWeight: "700", color: "#495057",
                                                        borderBottom: "1px solid #dee2e6",
                                                        display: "flex", justifyContent: "space-between", alignItems: "center",
                                                    }}>
                                                        <span>SEARCH RESULTS · Product Name / Brand / Model</span>
                                                        <span style={{ cursor: "pointer" }} onClick={() => setShowProductDropdown(false)}>✕</span>
                                                    </div>
                                                    {productResults.length === 0 ? (
                                                        <div style={{ padding: "14px", fontSize: "11px", color: "#888", textAlign: "center" }}>
                                                            {productLoading ? "Searching..." : `No products match "${matSearch}"`}
                                                        </div>
                                                    ) : productResults.map(p => (
                                                        <div
                                                            key={p._id}
                                                            onClick={() => addProductToRow(p, activeRowIndex)}
                                                            style={{
                                                                padding: "8px 10px", borderBottom: "1px solid #f1f3f5",
                                                                cursor: "pointer", display: "flex", gap: "10px", alignItems: "center",
                                                                transition: "background 0.15s",
                                                            }}
                                                            onMouseEnter={e => e.currentTarget.style.background = "#eaf4fb"}
                                                            onMouseLeave={e => e.currentTarget.style.background = "#fff"}
                                                        >
                                                            <div style={{
                                                                width: "32px", height: "32px", borderRadius: "4px",
                                                                background: "linear-gradient(135deg,#1a252f 0%,#2c3e50 100%)",
                                                                color: "#fff", fontSize: "11px", fontWeight: "700",
                                                                display: "flex", alignItems: "center", justifyContent: "center",
                                                                flexShrink: 0,
                                                            }}>
                                                                {(p.productName || "?").charAt(0).toUpperCase()}
                                                            </div>
                                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                                <div style={{ fontSize: "12px", fontWeight: "700", color: "#2c3e50" }}>
                                                                    {p.productName || "N/A"}
                                                                </div>
                                                                <div style={{ fontSize: "10px", color: "#6c757d", display: "flex", gap: "8px", flexWrap: "wrap" }}>
                                                                    {p.brandName && <span>🏷️ {p.brandName}</span>}
                                                                    {p.model    && <span>📋 {p.model}</span>}
                                                                    {p.hsnCode  && <span>🔢 {p.hsnCode}</span>}
                                                                    {p.baseUOM  && <span>📐 {p.baseUOM}</span>}
                                                                </div>
                                                            </div>
                                                            <div style={{ textAlign: "right", flexShrink: 0 }}>
                                                                {p.salesPrice != null && (
                                                                    <div style={{ fontSize: "12px", fontWeight: "700", color: "#27ae60" }}>
                                                                        ₹{Number(p.salesPrice).toLocaleString()}
                                                                    </div>
                                                                )}
                                                                {p.currentStockQty != null && (
                                                                    <div style={{ fontSize: "9px", color: p.currentStockQty > 0 ? "#27ae60" : "#e74c3c" }}>
                                                                        Stock: {p.currentStockQty} {p.baseUOM || ""}
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div style={{
                                                                background: "#27ae60", color: "#fff", fontSize: "10px", fontWeight: "700",
                                                                padding: "3px 8px", borderRadius: "3px", flexShrink: 0,
                                                            }}>
                                                                + ADD
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
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
                                    <table style={{ borderCollapse: "collapse", width: "100%", fontSize: "11px", minWidth: "900px" }}>
                                        <thead>
                                            <tr>
                                                <th style={{ ...th, width: "40px" }}>Sr. No</th>
                                                <th style={{ ...th, minWidth: "140px" }}>Product Name</th>
                                                <th style={{ ...th, minWidth: "100px" }}>Brand Name</th>
                                                <th style={{ ...th, minWidth: "120px" }}>Model Name</th>
                                                <th style={{ ...th, minWidth: "220px" }}>Material Description with Specification</th>
                                                <th style={{ ...th, width: "70px" }}>Qty</th>
                                                <th style={{ ...th, minWidth: "180px" }}>Remark</th>
                                                <th style={{ ...th, width: "42px" }}>Del</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredRows.length === 0 ? (
                                                <tr>
                                                    <td colSpan={8} style={{ ...td, textAlign: "center", color: "#888", padding: "14px" }}>
                                                        {matSearch ? `No material found for "${matSearch}"` : "No rows yet. Click '+ Add Row' or search products above."}
                                                    </td>
                                                </tr>
                                            ) : filteredRows.map((row) => {
                                                const realIdx = rows.findIndex(r => r === row);
                                                return (
                                                    <tr key={realIdx} style={{ background: realIdx % 2 === 0 ? "#fff" : "#f8f9fa" }}>
                                                        <td style={{ ...td, textAlign: "center", fontWeight: "700" }}>{row.srNo}</td>
                                                        <td style={td}>
                                                            <input style={inp} value={row.productName}
                                                                onChange={e => handleRowChange(realIdx, "productName", e.target.value)} />
                                                        </td>
                                                        <td style={td}>
                                                            <input style={inp} value={row.brandName}
                                                                onChange={e => handleRowChange(realIdx, "brandName", e.target.value)} />
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
                                                                rows={2}
                                                            />
                                                        </td>
                                                        <td style={td}>
                                                            <input style={inp} type="number" min="0"
                                                                value={row.qty}
                                                                onChange={e => handleRowChange(realIdx, "qty", e.target.value)} />
                                                        </td>
                                                        <td style={td}>
                                                            <textarea
                                                                style={{ ...inp, resize: "vertical", minHeight: "34px" }}
                                                                value={row.remark}
                                                                onChange={e => handleRowChange(realIdx, "remark", e.target.value)}
                                                                rows={2}
                                                            />
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

                                <div style={{
                                    display: "flex", alignItems: "center", gap: "10px",
                                    padding: "6px 12px", background: "#f1f3f5",
                                    borderBottom: "1px solid #dee2e6", fontSize: "11px", fontWeight: "700", color: "#495057",
                                }}>
                                    <span style={{ minWidth: "175px" }}>Item</span>
                                    <span>Responsibility</span>
                                </div>

                                <WarrantyRadio label="1. Cabling Warranty"     value={cablingWarranty}     onChange={setCablingWarranty} />
                                <WarrantyRadio label="2. Civil Warranty"       value={civilWarranty}       onChange={setCivilWarranty} />
                                <WarrantyRadio label="3. Chimby Picks Ladder"  value={chimbyPicksWarranty} onChange={setChimbyPicksWarranty} />
                                <WarrantyRadio label="4. Fabrication Warranty" value={fabricationWarranty} onChange={setFabricationWarranty} />
                            </div>

                        </div>

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