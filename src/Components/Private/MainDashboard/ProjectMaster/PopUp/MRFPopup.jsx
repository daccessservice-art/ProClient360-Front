import { useState, useEffect, useMemo, useCallback } from "react";
import toast from "react-hot-toast";
import {
    searchMRFProducts,
    getProjectMRFs,
    getProjectMRF,
    createProjectMRF,
    updateProjectMRF,
    sendProjectMRF,
    deleteProjectMRF,
} from "../../../../../hooks/useProjectMRF";

// ─── Scope of Works ───────────────────────────────────────────────────────────
// Each point: who does it — "Yourself" (DAccess) and "Customer".
// Values are free text: ✓, —, Approval, As per BOQ, Site support, ...
const SCOPE_OPTIONS = [
    "✓", "—", "Approval", "As per BOQ", "Site support", "Data support", "API support",
    "Participation", "Documentation", "Operating compliance",
];

const DEFAULT_SCOPE = [
    { item: "Equipment supply",          yourself: "✓",             customer: "—" },
    { item: "System design",             yourself: "✓",             customer: "Approval" },
    { item: "Civil foundation",          yourself: "—",             customer: "✓" },
    { item: "Power supply",              yourself: "—",             customer: "✓" },
    { item: "Earthing",                  yourself: "—",             customer: "✓" },
    { item: "Cable laying",              yourself: "As per BOQ",    customer: "As per BOQ" },
    { item: "Network infrastructure",    yourself: "—",             customer: "✓" },
    { item: "Equipment installation",    yourself: "✓",             customer: "Site support" },
    { item: "Software configuration",    yourself: "✓",             customer: "Data support" },
    { item: "Third-party integration",   yourself: "As per BOQ",    customer: "API support" },
    { item: "Testing & commissioning",   yourself: "✓",             customer: "Participation" },
    { item: "User training",             yourself: "✓",             customer: "Participation" },
    { item: "Project acceptance",        yourself: "Documentation", customer: "Approval" },
    { item: "Warranty service",          yourself: "✓",             customer: "Operating compliance" },
    { item: "Cabling warranty",          yourself: "",              customer: "" },
    { item: "Civil warranty",            yourself: "",              customer: "" },
    { item: "Chimby picks ladder",       yourself: "",              customer: "" },
    { item: "Fabrication warranty",      yourself: "",              customer: "" },
];
const freshScope = () => DEFAULT_SCOPE.map(r => ({ ...r }));

// Old MRFs saved only 4 radio values (Customer / YourSelf) → show them in the new table
const scopeFromOldFormat = (old = {}) => {
    const map = {
        "Cabling warranty": old.cablingWarranty,
        "Civil warranty": old.civilWarranty,
        "Chimby picks ladder": old.chimbyPicksLadder,
        "Fabrication warranty": old.fabricationWarranty,
    };
    return freshScope().map(r => {
        const v = map[r.item];
        if (v === "YourSelf") return { ...r, yourself: "✓", customer: "—" };
        if (v === "Customer") return { ...r, yourself: "—", customer: "✓" };
        return r;
    });
};

// ─── Stock availability for one row ───────────────────────────────────────────
// _stock = stock this row can use (for an MRF being edited = current stock +
// what this MRF already took, because that is given back on update).
const getAvailability = (row) => {
    const qty = Number(row.qty) || 0;
    if (row._stock === null || row._stock === undefined) {
        return { key: "unlinked", label: "Not in Product Master", bg: "#6c757d", short: qty };
    }
    const stock = Number(row._stock) || 0;
    if (qty <= 0) return { key: "noqty", label: "Enter Qty", bg: "#adb5bd", short: 0 };
    if (stock >= qty) return { key: "available", label: "Available", bg: "#27ae60", short: 0 };
    if (stock > 0) return { key: "partial", label: `Short by ${qty - stock}`, bg: "#e67e22", short: qty - stock };
    return { key: "notavailable", label: "Not Available", bg: "#e74c3c", short: qty };
};

const STATUS_BG = { "All Available": "#27ae60", Partial: "#e67e22", "Not Available": "#e74c3c" };

const fmtDate = (d) => {
    if (!d) return "—";
    const dt = new Date(d);
    return isNaN(dt) ? "—" : dt.toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" });
};

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
    _productId: null,
    _stock: null,
});

// ─── MRF Popup ────────────────────────────────────────────────────────────────
const MRFPopup = ({ selectedProject, handleMRF }) => {
    const today = new Date().toISOString().split("T")[0];
    const projectId = selectedProject?._id;

    // ── Editing state ──
    const [editingId, setEditingId] = useState(null);      // null = new MRF
    const [editingStatus, setEditingStatus] = useState(""); // Saved / Sent

    // ── Header fields ──
    const [mrfNo, setMrfNo] = useState("");
    const [date, setDate] = useState(today);
    const [nameOfSite, setNameOfSite] = useState("");
    const [supplyType, setSupplyType] = useState("Project");

    // ── Contact panels ──
    const [grnName, setGrnName] = useState("");
    const [grnContact, setGrnContact] = useState("");
    const [grnEmail, setGrnEmail] = useState("");

    const [cptName, setCptName] = useState("");
    const [cptContact, setCptContact] = useState("");
    const [cptEmail, setCptEmail] = useState("");

    const [cptcName, setCptcName] = useState("");
    const [cptcContact, setCptcContact] = useState("");
    const [cptcEmail, setCptcEmail] = useState("");

    const createdByName = selectedProject?.createdBy?.name || "—";

    // ── Material rows ──
    const [rows, setRows] = useState([emptyRow(1)]);
    const [matSearch, setMatSearch] = useState("");

    // ── Product search ──
    const [productResults, setProductResults] = useState([]);
    const [showProductDropdown, setShowProductDropdown] = useState(false);
    const [productLoading, setProductLoading] = useState(false);

    // ── MOM + Scope of Works ──
    const [momDescription, setMomDescription] = useState("");
    const [scopeItems, setScopeItems] = useState(freshScope);

    const [loading, setLoading] = useState(false);

    // ── PO PDF uploaded while adding the project (Project.POCopy) ──
    const poCopyUrl = selectedProject?.POCopy || "";
    const [showPO, setShowPO] = useState(false);

    // ── MRF history ──
    const [history, setHistory] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [showHistory, setShowHistory] = useState(true);

    // ── Auto-fill from project ──
    const customerName = selectedProject?.custId?.custName || "";
    const customerPONo = selectedProject?.purchaseOrderNo || "";
    const projectName = selectedProject?.name || "";
    const addr = selectedProject?.Address;
    const billingAddress = addr
        ? [addr.add, addr.city, addr.state, addr.country, addr.pincode].filter(Boolean).join(", ")
        : "";

    // ── Load history ──
    const loadHistory = useCallback(async () => {
        if (!projectId) return;
        setHistoryLoading(true);
        const data = await getProjectMRFs(projectId);
        if (data?.success) setHistory(data.mrfs || []);
        else toast.error(data?.error || "Failed to load MRF history");
        setHistoryLoading(false);
    }, [projectId]);

    useEffect(() => { loadHistory(); }, [loadHistory]);

    // ── Reset form to a new, empty MRF ──
    const resetForm = () => {
        setEditingId(null);
        setEditingStatus("");
        setMrfNo(""); setDate(today); setNameOfSite(""); setSupplyType("Project");
        setGrnName(""); setGrnContact(""); setGrnEmail("");
        setCptName(""); setCptContact(""); setCptEmail("");
        setCptcName(""); setCptcContact(""); setCptcEmail("");
        setRows([emptyRow(1)]);
        setMatSearch("");
        setMomDescription("");
        setScopeItems(freshScope());
    };

    // ── Load an existing MRF into the form ──
    const loadMRF = async (id) => {
        setLoading(true);
        const data = await getProjectMRF(id);
        setLoading(false);
        if (!data?.success) return toast.error(data?.error || "Failed to load MRF");
        const m = data.mrf;

        setEditingId(m._id);
        setEditingStatus(m.status);
        setMrfNo(m.mrfNo || "");
        setDate(m.mrfDate ? new Date(m.mrfDate).toISOString().split("T")[0] : today);
        setNameOfSite(m.nameOfSite || "");
        setSupplyType(m.supplyType || "Project");

        const c = m.contacts || {};
        setGrnName(c.store?.name || ""); setGrnContact(c.store?.contact || ""); setGrnEmail(c.store?.email || "");
        setCptName(c.project?.name || ""); setCptContact(c.project?.contact || ""); setCptEmail(c.project?.email || "");
        setCptcName(c.accounts?.name || ""); setCptcContact(c.accounts?.contact || ""); setCptcEmail(c.accounts?.email || "");

        setRows((m.items || []).map((it, i) => ({
            srNo: i + 1,
            productName: it.productName || "",
            brandName: it.brandName || "",
            modelNo: it.modelNo || "",
            materialDescription: it.materialDescription || "",
            qty: String(it.requiredQty || ""),
            remark: it.remark || "",
            _unit: it.unit || "No.",
            _rate: it.rate || 0,
            _productId: it.product || null,
            // usable stock = what's left now + what this MRF already took
            _stock: it.product ? (Number(it.currentStock) || 0) + (Number(it.issuedQty) || 0) : null,
        })));

        setMomDescription(m.momDescription || "");
        setScopeItems(
            Array.isArray(m.scopeItems) && m.scopeItems.length > 0
                ? m.scopeItems.map(r => ({ item: r.item || "", yourself: r.yourself || "", customer: r.customer || "" }))
                : scopeFromOldFormat(m.scopeOfWorks)
        );
        toast.success(`Loaded MRF ${m.mrfNo} for editing`);
    };

    // ── Availability summary ──
    const availability = useMemo(() => {
        const summary = { available: 0, partial: 0, notavailable: 0, unlinked: 0 };
        const shortList = [];
        rows.forEach(r => {
            const a = getAvailability(r);
            if (summary[a.key] !== undefined) summary[a.key] += 1;
            if ((a.key === "partial" || a.key === "notavailable" || a.key === "unlinked") &&
                (r.productName.trim() || r.materialDescription.trim())) {
                shortList.push({ ...r, _status: a });
            }
        });
        return { summary, shortList };
    }, [rows]);

    // ── Debounced product search ──
    useEffect(() => {
        const term = matSearch.trim();
        if (!term) {
            setProductResults([]);
            setShowProductDropdown(false);
            return;
        }
        let cancelled = false;
        const t = setTimeout(async () => {
            setProductLoading(true);
            const data = await searchMRFProducts(term);
            if (cancelled) return;
            if (data?.success && Array.isArray(data.products)) {
                setProductResults(data.products);
                setShowProductDropdown(true);
            } else {
                setProductResults([]);
                setShowProductDropdown(false);
                if (data?.error) toast.error(data.error);
            }
            setProductLoading(false);
        }, 350);
        return () => { cancelled = true; clearTimeout(t); };
    }, [matSearch]);

    // ── Add a picked product to the list ──
    const addProductToRow = (product) => {
        const closeSearch = () => {
            setMatSearch("");
            setShowProductDropdown(false);
            setProductResults([]);
        };

        const existingIdx = rows.findIndex(r => r._productId && r._productId === product._id);
        if (existingIdx !== -1) {
            setRows(prev => {
                const updated = [...prev];
                const cur = updated[existingIdx];
                updated[existingIdx] = { ...cur, qty: String((Number(cur.qty) || 0) + 1) };
                return updated;
            });
            closeSearch();
            return toast.success(`${product.productName} already in list — qty increased by 1`);
        }

        const builtRow = {
            productName: product.productName || "",
            brandName: product.brandName || "",
            modelNo: product.model || "",
            materialDescription: product.description ||
                `${product.productName || ""} ${product.brandName || ""} ${product.model || ""}`.trim(),
            qty: "1",
            remark: "",
            _unit: product.baseUOM || "No.",
            _rate: parseFloat(product.salesPrice) || 0,
            _productId: product._id,
            _stock: Number(product.currentStockQty) || 0,
        };
        setRows(prev => {
            const last = prev[prev.length - 1];
            // fill the last row if it's still blank, otherwise append
            if (last && !last.productName && !last.brandName && !last.modelNo && !last.materialDescription) {
                const updated = [...prev];
                updated[prev.length - 1] = { ...builtRow, srNo: prev.length };
                return updated;
            }
            return [...prev, { ...builtRow, srNo: prev.length + 1 }];
        });
        closeSearch();
        toast.success(`Added: ${builtRow.productName}`);
    };

    const handleRowChange = (index, field, value) => {
        setRows(prev => {
            const updated = [...prev];
            updated[index] = { ...updated[index], [field]: value };
            return updated;
        });
    };

    const addRow = () => setRows(prev => [...prev, emptyRow(prev.length + 1)]);

    const removeRow = (index) => {
        if (rows.length === 1) return toast.error("At least one row is required.");
        setRows(prev => prev.filter((_, i) => i !== index).map((r, i) => ({ ...r, srNo: i + 1 })));
    };

    // ── Build payload + validate ──
    const buildPayload = () => {
        if (!mrfNo.trim()) { toast.error("MRF Number is required"); return null; }
        if (!date) { toast.error("Date is required"); return null; }
        if (!projectId) { toast.error("Project is missing — cannot create MRF"); return null; }
        if (rows.some(r => !r.productName.trim() && !r.materialDescription.trim())) {
            toast.error("Product Name / Material Description is required for all rows"); return null;
        }
        if (rows.some(r => !Number.isInteger(Number(r.qty)) || Number(r.qty) < 1)) {
            toast.error("Quantity must be a whole number of at least 1 for all rows"); return null;
        }

        return {
            project: projectId,
            mrfNo: mrfNo.trim(),
            mrfDate: date,
            nameOfSite,
            supplyType,
            billingAddress,
            contacts: {
                store: { name: grnName, contact: grnContact, email: grnEmail },
                project: { name: cptName, contact: cptContact, email: cptEmail },
                accounts: { name: cptcName, contact: cptcContact, email: cptcEmail },
            },
            scopeItems: scopeItems
                .filter(r => r.item.trim())
                .map(r => ({ item: r.item.trim(), yourself: r.yourself.trim(), customer: r.customer.trim() })),
            momDescription,
            items: rows.map(r => ({
                productId: r._productId,
                productName: r.productName,
                brandName: r.brandName,
                modelNo: r.modelNo,
                materialDescription: r.materialDescription,
                unit: r._unit,
                rate: r._rate,
                requiredQty: Number(r.qty),
                remark: r.remark,
            })),
        };
    };

    // ── Save (create or update), optionally send ──
    const saveMRF = async (alsoSend = false) => {
        const payload = buildPayload();
        if (!payload) return;

        setLoading(true);
        try {
            const data = editingId
                ? await updateProjectMRF(editingId, payload)
                : await createProjectMRF(payload);

            if (!data?.success) return toast.error(data?.error || "Failed to save MRF");
            toast.success(data.message || "MRF saved");

            if (alsoSend && data.mrf?._id) {
                const sent = await sendProjectMRF(data.mrf._id);
                if (sent?.success) toast.success(sent.message || "MRF sent to store");
                else toast.error(sent?.error || "Saved, but sending failed");
            }

            resetForm();
            await loadHistory();
        } finally {
            setLoading(false);
        }
    };

    // ── Scope of Works editing ──
    const handleScopeChange = (index, field, value) => {
        setScopeItems(prev => {
            const updated = [...prev];
            updated[index] = { ...updated[index], [field]: value };
            return updated;
        });
    };
    const addScopeItem = () => setScopeItems(prev => [...prev, { item: "", yourself: "", customer: "" }]);
    const removeScopeItem = (index) => setScopeItems(prev => prev.filter((_, i) => i !== index));
    const resetScope = () => {
        if (window.confirm("Reset Scope of Works to the default points?")) setScopeItems(freshScope());
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        saveMRF(false);
    };

    const handleSendFromHistory = async (m) => {
        setLoading(true);
        const data = await sendProjectMRF(m._id);
        setLoading(false);
        if (data?.success) { toast.success(data.message); loadHistory(); }
        else toast.error(data?.error || "Failed to send MRF");
    };

    const handleDeleteFromHistory = async (m) => {
        if (!window.confirm(`Delete MRF ${m.mrfNo}? Its stock will be returned to Product Master.`)) return;
        setLoading(true);
        const data = await deleteProjectMRF(m._id);
        setLoading(false);
        if (data?.success) {
            toast.success(data.message);
            if (editingId === m._id) resetForm();
            loadHistory();
        } else toast.error(data?.error || "Failed to delete MRF");
    };

    // ── Styles ──
    const th = {
        background: "#2c3e50", color: "#fff", fontSize: "11px",
        padding: "7px 8px", border: "1px solid #444",
        whiteSpace: "nowrap", textAlign: "center", verticalAlign: "middle",
    };
    const thRed = { ...th, background: "#fdecea", color: "#c0392b", border: "1px solid #f5c6cb" };
    const td = { padding: "4px 5px", border: "1px solid #dee2e6", verticalAlign: "middle" };
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
    const smallBtn = (bg) => ({
        background: bg, border: "none", color: "#fff", borderRadius: "3px",
        padding: "2px 8px", fontSize: "10px", fontWeight: "700", cursor: "pointer", marginRight: "4px",
    });
    const badge = (bg) => ({
        display: "inline-block", background: bg, color: "#fff",
        fontSize: "10px", fontWeight: "700", padding: "2px 8px", borderRadius: "12px", whiteSpace: "nowrap",
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
                                {editingId && (
                                    <span style={{ ...badge("#f39c12"), marginLeft: "10px", fontSize: "11px" }}>
                                        Editing {mrfNo} {editingStatus === "Sent" ? "· Sent" : ""}
                                    </span>
                                )}
                            </div>
                            {projectName && (
                                <small style={{ color: "#aec6cf", fontSize: "11px" }}>Project: {projectName}</small>
                            )}
                        </div>
                        <button onClick={() => handleMRF()} type="button" style={{
                            background: "rgba(255,255,255,0.15)", border: "none", color: "#fff",
                            borderRadius: "50%", width: "29px", height: "29px", cursor: "pointer",
                            fontSize: "16px", display: "flex", alignItems: "center", justifyContent: "center",
                        }}>×</button>
                    </div>

                    <form onSubmit={handleSubmit}>
                        <div style={{ padding: "16px", maxHeight: "82vh", overflowY: "auto" }}>

                            {/* ════ SECTION 0 : MRF History ════ */}
                            <div style={{ border: "2px solid #2c3e50", borderRadius: "6px", marginBottom: "14px", overflow: "hidden" }}>
                                <div style={{
                                    background: "#2c3e50", color: "#fff", padding: "7px 14px",
                                    display: "flex", justifyContent: "space-between", alignItems: "center",
                                }}>
                                    <span style={{ fontSize: "12px", fontWeight: "700", cursor: "pointer" }}
                                        onClick={() => setShowHistory(s => !s)}>
                                        🕘 MRF History for this Project ({history.length}) {showHistory ? "▲" : "▼"}
                                    </span>
                                    <button type="button" onClick={resetForm} style={smallBtn("#27ae60")}>
                                        + New MRF
                                    </button>
                                </div>
                                {showHistory && (
                                    <div style={{ overflowX: "auto" }}>
                                        <table style={{ borderCollapse: "collapse", width: "100%", fontSize: "11px" }}>
                                            <thead>
                                                <tr>
                                                    <th style={th}>#</th>
                                                    <th style={th}>MRF No</th>
                                                    <th style={th}>Date</th>
                                                    <th style={th}>Items</th>
                                                    <th style={th}>Short Items</th>
                                                    <th style={th}>Material</th>
                                                    <th style={th}>Status</th>
                                                    <th style={th}>Created By</th>
                                                    <th style={th}>Last Update</th>
                                                    <th style={th}>Action</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {historyLoading ? (
                                                    <tr><td colSpan={10} style={{ ...td, textAlign: "center", padding: "10px" }}>Loading...</td></tr>
                                                ) : history.length === 0 ? (
                                                    <tr><td colSpan={10} style={{ ...td, textAlign: "center", padding: "10px", color: "#888" }}>
                                                        No MRF created yet for this project.
                                                    </td></tr>
                                                ) : history.map((m, i) => (
                                                    <tr key={m._id} style={{ background: editingId === m._id ? "#fff8e1" : i % 2 ? "#f8f9fa" : "#fff" }}>
                                                        <td style={{ ...td, textAlign: "center" }}>{i + 1}</td>
                                                        <td style={{ ...td, fontWeight: "700" }}>{m.mrfNo}</td>
                                                        <td style={{ ...td, textAlign: "center" }}>{fmtDate(m.mrfDate)}</td>
                                                        <td style={{ ...td, textAlign: "center" }}>{m.items?.length || 0}</td>
                                                        <td style={{ ...td, textAlign: "center", color: m.shortageItemCount ? "#c0392b" : "#27ae60", fontWeight: "700" }}>
                                                            {m.shortageItemCount || 0}
                                                        </td>
                                                        <td style={{ ...td, textAlign: "center" }}>
                                                            <span style={badge(STATUS_BG[m.materialStatus] || "#6c757d")}>{m.materialStatus}</span>
                                                        </td>
                                                        <td style={{ ...td, textAlign: "center" }}>
                                                            <span style={badge(m.status === "Sent" ? "#2980b9" : "#7f8c8d")}>
                                                                {m.status === "Sent" ? "Sent to Store" : "Saved"}
                                                            </span>
                                                        </td>
                                                        <td style={td}>{m.createdByName || "—"}</td>
                                                        <td style={{ ...td, textAlign: "center" }}>
                                                            {fmtDate(m.updatedAt)}
                                                            {m.updatedByName ? <div style={{ fontSize: "9px", color: "#888" }}>{m.updatedByName}</div> : null}
                                                        </td>
                                                        <td style={{ ...td, whiteSpace: "nowrap" }}>
                                                            <button type="button" style={smallBtn("#2c3e50")} onClick={() => loadMRF(m._id)} disabled={loading}>
                                                                View / Edit
                                                            </button>
                                                            {m.status !== "Sent" && (
                                                                <button type="button" style={smallBtn("#2980b9")} onClick={() => handleSendFromHistory(m)} disabled={loading}>
                                                                    Send
                                                                </button>
                                                            )}
                                                            <button type="button" style={smallBtn("#e74c3c")} onClick={() => handleDeleteFromHistory(m)} disabled={loading}>
                                                                Delete
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>

                            {/* ════ SECTION 1 : MRF Header Info ════ */}
                            <div style={{ border: "2px solid #2c3e50", borderRadius: "6px", marginBottom: "14px", overflow: "hidden" }}>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 130px", borderBottom: "1px solid #dee2e6" }}>
                                    <div style={{ padding: "10px 14px" }}>
                                        <div className="row g-2">
                                            <div className="col-6 col-md-3">
                                                <label style={lbl}>MRF No <span style={{ color: "red" }}>*</span></label>
                                                <input style={inp} value={mrfNo} onChange={e => setMrfNo(e.target.value)} placeholder="MRF-001" maxLength={50} required />
                                            </div>
                                            <div className="col-6 col-md-3">
                                                <label style={lbl}>Date <span style={{ color: "red" }}>*</span></label>
                                                <input type="date" style={inp} value={date} onChange={e => setDate(e.target.value)} required />
                                            </div>
                                            <div className="col-6 col-md-3">
                                                <label style={lbl}>Name of Customer</label>
                                                <input style={{ ...inp, background: "#e9ecef", cursor: "not-allowed" }} value={customerName} readOnly />
                                            </div>
                                            <div className="col-6 col-md-3">
                                                <label style={lbl}>Customer PO No</label>
                                                <div style={{ display: "flex", gap: "4px" }}>
                                                    <input style={{ ...inp, background: "#e9ecef", cursor: "not-allowed" }} value={customerPONo} readOnly />
                                                    {poCopyUrl ? (
                                                        <button type="button" onClick={() => setShowPO(s => !s)}
                                                            title="View PO PDF uploaded with the project"
                                                            style={{
                                                                background: showPO ? "#c0392b" : "#e74c3c", border: "none", color: "#fff",
                                                                borderRadius: "3px", padding: "0 8px", fontSize: "10px", fontWeight: "700",
                                                                cursor: "pointer", whiteSpace: "nowrap",
                                                            }}>
                                                            {showPO ? "Hide PO" : "📄 View PO"}
                                                        </button>
                                                    ) : (
                                                        <span title="No PO PDF uploaded for this project" style={{
                                                            fontSize: "9px", color: "#999", alignSelf: "center", whiteSpace: "nowrap",
                                                        }}>No PDF</span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="col-6 col-md-3">
                                                <label style={lbl}>Created By</label>
                                                <input style={{ ...inp, background: "#e9ecef", cursor: "not-allowed" }} value={createdByName} readOnly />
                                            </div>
                                            <div className="col-6 col-md-3">
                                                <label style={lbl}>Name of Site</label>
                                                <input style={inp} value={nameOfSite} onChange={e => setNameOfSite(e.target.value)} placeholder="Site name" maxLength={200} />
                                            </div>
                                            <div className="col-12 col-md-6">
                                                <label style={lbl}>Billing Address</label>
                                                <input style={{ ...inp, background: "#e9ecef", cursor: "not-allowed" }} value={billingAddress} readOnly />
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
                                                borderRadius: "4px", border: `2px solid ${supplyType === opt ? "#2c3e50" : "#dee2e6"}`,
                                                background: supplyType === opt ? "#2c3e50" : "#fff",
                                                color: supplyType === opt ? "#fff" : "#2c3e50",
                                                fontWeight: supplyType === opt ? "700" : "400",
                                                transition: "all 0.18s",
                                            }}>
                                                <input type="radio" name="supplyType" value={opt}
                                                    checked={supplyType === opt} onChange={() => setSupplyType(opt)}
                                                    style={{ display: "none" }} />
                                                {supplyType === opt ? "●" : "○"} {opt}
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", borderTop: "1px solid #dee2e6" }}>
                                    {[
                                        { title: "Customer's Store Team Contact Details", bg: "#fff3cd", n: [grnName, setGrnName], c: [grnContact, setGrnContact], e: [grnEmail, setGrnEmail] },
                                        { title: "Customer Project Team Contact Details", bg: "#e3f2fd", n: [cptName, setCptName], c: [cptContact, setCptContact], e: [cptEmail, setCptEmail] },
                                        { title: "Customer's Accounts & Finance Team Contact Details", bg: "#e8f5e9", n: [cptcName, setCptcName], c: [cptcContact, setCptcContact], e: [cptcEmail, setCptcEmail] },
                                    ].map((p, i) => (
                                        <div key={i} style={{ padding: "8px 10px", borderRight: i < 2 ? "1px solid #dee2e6" : "none" }}>
                                            <div style={panelHead(p.bg)}>{p.title}</div>
                                            <div style={{ padding: "6px 0 0" }}>
                                                <label style={lbl}>Name</label>
                                                <input style={{ ...inp, marginBottom: "4px" }} value={p.n[0]} onChange={e => p.n[1](e.target.value)} placeholder="Name" maxLength={100} />
                                                <label style={lbl}>Contact No</label>
                                                <input style={{ ...inp, marginBottom: "4px" }} value={p.c[0]}
                                                    onChange={e => { if (/^[0-9+\-\s]*$/.test(e.target.value)) p.c[1](e.target.value); }}
                                                    placeholder="Contact" maxLength={15} />
                                                <label style={lbl}>Email ID</label>
                                                <input style={inp} type="email" value={p.e[0]} onChange={e => p.e[1](e.target.value)} placeholder="Email" maxLength={150} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* ════ PO PDF preview — check materials against the customer PO ════ */}
                            {showPO && poCopyUrl && (
                                <div style={{ border: "2px solid #e74c3c", borderRadius: "6px", marginBottom: "14px", overflow: "hidden" }}>
                                    <div style={{
                                        background: "#e74c3c", color: "#fff", padding: "6px 14px",
                                        display: "flex", justifyContent: "space-between", alignItems: "center",
                                    }}>
                                        <span style={{ fontSize: "12px", fontWeight: "700" }}>
                                            📄 Purchase Order Copy — PO No: {customerPONo || "—"}
                                        </span>
                                        <span style={{ display: "flex", gap: "6px" }}>
                                            <a href={poCopyUrl} target="_blank" rel="noopener noreferrer" style={{
                                                background: "#fff", color: "#c0392b", borderRadius: "3px",
                                                padding: "2px 10px", fontSize: "10px", fontWeight: "700", textDecoration: "none",
                                            }}>Open in new tab ↗</a>
                                            <button type="button" onClick={() => setShowPO(false)} style={{
                                                background: "rgba(255,255,255,0.2)", border: "none", color: "#fff",
                                                borderRadius: "3px", padding: "2px 10px", fontSize: "10px", fontWeight: "700", cursor: "pointer",
                                            }}>✕ Close</button>
                                        </span>
                                    </div>
                                    <iframe
                                        src={poCopyUrl}
                                        title="Purchase Order PDF"
                                        style={{ width: "100%", height: "520px", border: "none", display: "block", background: "#f1f3f5" }}
                                    />
                                </div>
                            )}

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
                                                onChange={e => setMatSearch(e.target.value)}
                                                onFocus={() => { if (productResults.length > 0) setShowProductDropdown(true); }}
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
                                                            {productLoading ? "Searching..." : `No products match "${matSearch}" — add a row and type it manually`}
                                                        </div>
                                                    ) : productResults.map(p => (
                                                        <div
                                                            key={p._id}
                                                            onClick={() => addProductToRow(p)}
                                                            style={{
                                                                padding: "8px 10px", borderBottom: "1px solid #f1f3f5",
                                                                cursor: "pointer", display: "flex", gap: "10px", alignItems: "center",
                                                            }}
                                                            onMouseEnter={e => e.currentTarget.style.background = "#eaf4fb"}
                                                            onMouseLeave={e => e.currentTarget.style.background = "#fff"}
                                                        >
                                                            <div style={{
                                                                width: "32px", height: "32px", borderRadius: "4px",
                                                                background: "linear-gradient(135deg,#1a252f 0%,#2c3e50 100%)",
                                                                color: "#fff", fontSize: "11px", fontWeight: "700",
                                                                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                                                            }}>
                                                                {(p.productName || "?").charAt(0).toUpperCase()}
                                                            </div>
                                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                                <div style={{ fontSize: "12px", fontWeight: "700", color: "#2c3e50" }}>{p.productName || "N/A"}</div>
                                                                <div style={{ fontSize: "10px", color: "#6c757d", display: "flex", gap: "8px", flexWrap: "wrap" }}>
                                                                    {p.brandName && <span>🏷️ {p.brandName}</span>}
                                                                    {p.model && <span>📋 {p.model}</span>}
                                                                    {p.hsnCode && <span>🔢 {p.hsnCode}</span>}
                                                                    {p.baseUOM && <span>📐 {p.baseUOM}</span>}
                                                                </div>
                                                            </div>
                                                            <div style={{ textAlign: "right", flexShrink: 0 }}>
                                                                <div style={{ fontSize: "11px", fontWeight: "700", color: (p.currentStockQty || 0) > 0 ? "#27ae60" : "#e74c3c" }}>
                                                                    Stock: {p.currentStockQty || 0} {p.baseUOM || ""}
                                                                </div>
                                                            </div>
                                                            <div style={{
                                                                background: "#27ae60", color: "#fff", fontSize: "10px", fontWeight: "700",
                                                                padding: "3px 8px", borderRadius: "3px", flexShrink: 0,
                                                            }}>+ ADD</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        <button type="button" onClick={addRow} style={{
                                            background: "#27ae60", border: "none", color: "#fff",
                                            borderRadius: "4px", padding: "4px 14px", cursor: "pointer",
                                            fontSize: "11px", fontWeight: "700", whiteSpace: "nowrap",
                                        }}>+ Add Row</button>
                                    </div>
                                </div>

                                <div style={{ overflowX: "auto", border: "2px solid #2c3e50", borderTop: "none" }}>
                                    <table style={{ borderCollapse: "collapse", width: "100%", fontSize: "11px", minWidth: "1000px" }}>
                                        <thead>
                                            <tr>
                                                <th style={{ ...th, width: "40px" }}>Sr. No</th>
                                                <th style={{ ...th, minWidth: "140px" }}>Product Name</th>
                                                <th style={{ ...th, minWidth: "100px" }}>Brand Name</th>
                                                <th style={{ ...th, minWidth: "120px" }}>Model Name</th>
                                                <th style={{ ...th, minWidth: "220px" }}>Material Description with Specification</th>
                                                <th style={{ ...th, width: "70px" }}>Qty</th>
                                                <th style={{ ...th, width: "80px" }}>In Stock</th>
                                                <th style={{ ...th, width: "130px" }}>Availability</th>
                                                <th style={{ ...th, minWidth: "160px" }}>Remark</th>
                                                <th style={{ ...th, width: "42px" }}>Del</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {rows.map((row, idx) => {
                                                const avail = getAvailability(row);
                                                return (
                                                    <tr key={idx} style={{ background: idx % 2 === 0 ? "#fff" : "#f8f9fa" }}>
                                                        <td style={{ ...td, textAlign: "center", fontWeight: "700" }}>{row.srNo}</td>
                                                        <td style={td}>
                                                            <input style={inp} value={row.productName} maxLength={200}
                                                                onChange={e => handleRowChange(idx, "productName", e.target.value)} />
                                                        </td>
                                                        <td style={td}>
                                                            <input style={inp} value={row.brandName} maxLength={100}
                                                                onChange={e => handleRowChange(idx, "brandName", e.target.value)} />
                                                        </td>
                                                        <td style={td}>
                                                            <input style={inp} value={row.modelNo} maxLength={100}
                                                                onChange={e => handleRowChange(idx, "modelNo", e.target.value)} />
                                                        </td>
                                                        <td style={td}>
                                                            <textarea style={{ ...inp, resize: "vertical", minHeight: "34px" }} rows={2} maxLength={2000}
                                                                value={row.materialDescription}
                                                                onChange={e => handleRowChange(idx, "materialDescription", e.target.value)} />
                                                        </td>
                                                        <td style={td}>
                                                            <input style={inp} type="number" min="1" step="1" value={row.qty}
                                                                onChange={e => handleRowChange(idx, "qty", e.target.value)} />
                                                        </td>
                                                        <td style={{
                                                            ...td, textAlign: "center", fontWeight: "700",
                                                            color: row._stock === null ? "#adb5bd" : (row._stock > 0 ? "#1e40af" : "#e74c3c"),
                                                        }}>
                                                            {row._stock === null ? "—" : `${row._stock} ${row._unit || ""}`}
                                                        </td>
                                                        <td style={{ ...td, textAlign: "center" }}>
                                                            <span style={badge(avail.bg)}>{avail.label}</span>
                                                        </td>
                                                        <td style={td}>
                                                            <textarea style={{ ...inp, resize: "vertical", minHeight: "34px" }} rows={2} maxLength={1000}
                                                                value={row.remark}
                                                                onChange={e => handleRowChange(idx, "remark", e.target.value)} />
                                                        </td>
                                                        <td style={{ ...td, textAlign: "center" }}>
                                                            <button type="button" onClick={() => removeRow(idx)} style={{
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
                                    <span style={{ color: "#27ae60" }}><strong>Available:</strong> {availability.summary.available}</span>
                                    <span style={{ color: "#e67e22" }}><strong>Partial:</strong> {availability.summary.partial}</span>
                                    <span style={{ color: "#e74c3c" }}><strong>Not Available:</strong> {availability.summary.notavailable}</span>
                                    <span style={{ color: "#6c757d" }}><strong>Not in Master:</strong> {availability.summary.unlinked}</span>
                                    <span style={{ color: "#555", marginLeft: "auto" }}>
                                        ℹ️ On save, available qty is deducted from Product Master stock.
                                    </span>
                                </div>

                                {availability.shortList.length > 0 && (
                                    <div style={{ marginTop: "10px", border: "2px solid #e74c3c", borderRadius: "6px", overflow: "hidden" }}>
                                        <div style={{ background: "#e74c3c", color: "#fff", padding: "6px 14px", fontSize: "12px", fontWeight: "700" }}>
                                            ⚠️ Material Not Available / Short — {availability.shortList.length} item(s) to arrange
                                        </div>
                                        <table style={{ borderCollapse: "collapse", width: "100%", fontSize: "11px" }}>
                                            <thead>
                                                <tr>
                                                    <th style={thRed}>Sr</th>
                                                    <th style={thRed}>Product</th>
                                                    <th style={thRed}>Brand / Model</th>
                                                    <th style={thRed}>Required</th>
                                                    <th style={thRed}>In Stock</th>
                                                    <th style={thRed}>Shortage</th>
                                                    <th style={thRed}>Status</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {availability.shortList.map((r, i) => (
                                                    <tr key={i}>
                                                        <td style={{ ...td, textAlign: "center" }}>{i + 1}</td>
                                                        <td style={td}>{r.productName || r.materialDescription}</td>
                                                        <td style={td}>{[r.brandName, r.modelNo].filter(Boolean).join(" / ") || "—"}</td>
                                                        <td style={{ ...td, textAlign: "center" }}>{Number(r.qty) || 0}</td>
                                                        <td style={{ ...td, textAlign: "center" }}>{r._stock === null ? "—" : r._stock}</td>
                                                        <td style={{ ...td, textAlign: "center", fontWeight: "700", color: "#c0392b" }}>{r._status.short}</td>
                                                        <td style={{ ...td, textAlign: "center" }}>{r._status.label}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>

                            {/* ════ SECTION 3 : Customer MOM Description ════ */}
                            <div style={{ border: "2px solid #2c3e50", borderRadius: "6px", marginBottom: "14px", overflow: "hidden" }}>
                                <div style={{ background: "#2c3e50", color: "#fff", padding: "7px 14px", fontSize: "12px", fontWeight: "700" }}>
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

                            {/* ════ SECTION 4 : Scope of Works ════ */}
                            <div style={{ border: "2px solid #2c3e50", borderRadius: "6px", marginBottom: "6px", overflow: "hidden" }}>
                                <div style={{
                                    background: "#2c3e50", color: "#fff", padding: "7px 14px",
                                    display: "flex", justifyContent: "space-between", alignItems: "center",
                                }}>
                                    <span style={{ fontSize: "12px", fontWeight: "700" }}>🔧 Scope of Works</span>
                                    <span>
                                        <button type="button" onClick={resetScope} style={smallBtn("#7f8c8d")}>↺ Reset Default</button>
                                        <button type="button" onClick={addScopeItem} style={smallBtn("#27ae60")}>+ Add Item</button>
                                    </span>
                                </div>
                                <datalist id="mrfScopeOptions">
                                    {SCOPE_OPTIONS.map(o => <option key={o} value={o} />)}
                                </datalist>
                                <table style={{ borderCollapse: "collapse", width: "100%", fontSize: "12px" }}>
                                    <thead>
                                        <tr>
                                            <th style={{ ...th, width: "40px" }}>Sr</th>
                                            <th style={{ ...th, textAlign: "left" }}>Item</th>
                                            <th style={{ ...th, width: "22%" }}>Yourself</th>
                                            <th style={{ ...th, width: "22%" }}>Customer</th>
                                            <th style={{ ...th, width: "42px" }}>Del</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {scopeItems.length === 0 ? (
                                            <tr><td colSpan={5} style={{ ...td, textAlign: "center", color: "#888", padding: "10px" }}>
                                                No points. Click "+ Add Item" or "↺ Reset Default".
                                            </td></tr>
                                        ) : scopeItems.map((r, i) => (
                                            <tr key={i} style={{ background: i % 2 ? "#f8f9fa" : "#fff" }}>
                                                <td style={{ ...td, textAlign: "center", fontWeight: "700" }}>{i + 1}</td>
                                                <td style={td}>
                                                    <input style={{ ...inp, fontSize: "12px", fontWeight: "600" }} value={r.item} maxLength={200}
                                                        placeholder="Scope item" onChange={e => handleScopeChange(i, "item", e.target.value)} />
                                                </td>
                                                <td style={td}>
                                                    <input style={{ ...inp, fontSize: "12px", textAlign: "center" }} list="mrfScopeOptions"
                                                        value={r.yourself} maxLength={200} placeholder="✓ / — / text"
                                                        onChange={e => handleScopeChange(i, "yourself", e.target.value)} />
                                                </td>
                                                <td style={td}>
                                                    <input style={{ ...inp, fontSize: "12px", textAlign: "center" }} list="mrfScopeOptions"
                                                        value={r.customer} maxLength={200} placeholder="✓ / — / text"
                                                        onChange={e => handleScopeChange(i, "customer", e.target.value)} />
                                                </td>
                                                <td style={{ ...td, textAlign: "center" }}>
                                                    <button type="button" onClick={() => removeScopeItem(i)} style={{
                                                        background: "#e74c3c", border: "none", color: "#fff",
                                                        borderRadius: "3px", width: "24px", height: "24px", cursor: "pointer", fontSize: "13px",
                                                    }} title="Remove point">✕</button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                <div style={{ fontSize: "10px", color: "#888", padding: "4px 12px", background: "#f8f9fa" }}>
                                    Tip: click a Yourself / Customer box to pick ✓, —, Approval, As per BOQ… or type your own text.
                                </div>
                            </div>
                        </div>

                        {/* ════ FOOTER ════ */}
                        <div style={{
                            background: "#f8f9fa", borderTop: "1px solid #dee2e6",
                            padding: "11px 20px", display: "flex", gap: "10px", justifyContent: "flex-end", alignItems: "center",
                        }}>
                            {editingId && (
                                <button type="button" onClick={resetForm} disabled={loading} style={{
                                    background: "#fff", border: "1px solid #6c757d", color: "#6c757d",
                                    borderRadius: "5px", padding: "8px 16px", cursor: "pointer", fontWeight: "600", fontSize: "13px",
                                    marginRight: "auto",
                                }}>
                                    ✚ Start New MRF
                                </button>
                            )}
                            <button type="button" onClick={() => handleMRF()} disabled={loading} style={{
                                background: "#6c757d", border: "none", color: "#fff",
                                borderRadius: "5px", padding: "8px 22px", cursor: "pointer", fontWeight: "600", fontSize: "13px",
                            }}>
                                Close
                            </button>
                            <button type="submit" disabled={loading} style={{
                                background: "linear-gradient(135deg,#1a252f 0%,#2c3e50 100%)",
                                border: "none", color: "#fff", borderRadius: "5px",
                                padding: "8px 22px", cursor: "pointer", fontWeight: "700", fontSize: "13px",
                            }}>
                                {loading ? "Saving..." : editingId ? "💾 Update MRF" : "💾 Save MRF"}
                            </button>
                            {editingStatus !== "Sent" && (
                                <button type="button" onClick={() => saveMRF(true)} disabled={loading} style={{
                                    background: "linear-gradient(135deg,#1f6fa5 0%,#2980b9 100%)",
                                    border: "none", color: "#fff", borderRadius: "5px",
                                    padding: "8px 22px", cursor: "pointer", fontWeight: "700", fontSize: "13px",
                                }}>
                                    {loading ? "Please wait..." : editingId ? "📤 Update & Send to Store" : "📤 Save & Send to Store"}
                                </button>
                            )}
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default MRFPopup;