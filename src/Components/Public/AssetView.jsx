import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";

const AssetView = () => {
  const { assetId } = useParams();
  const [assetData, setAssetData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAsset = async () => {
      try {
        const baseUrl = process.env.REACT_APP_API_URL;
        const response = await axios.get(`${baseUrl}/api/qc/public/asset/${assetId}`);
        if (response.data.success) {
          setAssetData(response.data.asset);
        } else {
          setError(response.data.error || "Asset not found");
        }
      } catch (err) {
        setError("Failed to load asset information");
      } finally {
        setIsLoading(false);
      }
    };
    if (assetId) fetchAsset();
  }, [assetId]);

  const isWarrantyExpired = () => {
    if (!assetData?.warrantyExpiryDate) return false;
    return new Date() > new Date(assetData.warrantyExpiryDate);
  };

  const getWarrantyDaysRemaining = () => {
    if (!assetData?.warrantyExpiryDate) return null;
    const diff = new Date(assetData.warrantyExpiryDate) - new Date();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const fmt = (d) =>
    new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

  const statusColor = {
    "In Warehouse":    { bg: "#e8f0fe", color: "#1a56db", dot: "#1a56db" },
    "Dispatched":      { bg: "#e3f9f5", color: "#0d9488", dot: "#0d9488" },
    "In Service":      { bg: "#f0fdf4", color: "#16a34a", dot: "#16a34a" },
    "Warranty Expired":{ bg: "#fff1f2", color: "#e11d48", dot: "#e11d48" },
    "Damaged":         { bg: "#f1f5f9", color: "#475569", dot: "#475569" },
  };

  const sc = statusColor[assetData?.status] || { bg: "#f1f5f9", color: "#475569", dot: "#475569" };

  if (isLoading) {
    return (
      <>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#f8fafc", gap: 16 }}>
          <div style={{ width: 36, height: 36, border: "3px solid #e2e8f0", borderTop: "3px solid #3b82f6", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
          <p style={{ color: "#94a3b8", fontSize: 14, margin: 0 }}>Loading asset details...</p>
        </div>
      </>
    );
  }

  if (error || !assetData) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#f8fafc", padding: 24, textAlign: "center", gap: 12 }}>
        <div style={{ fontSize: 48, color: "#fca5a5" }}>✕</div>
        <h4 style={{ color: "#ef4444", fontSize: 18, fontWeight: 700, margin: 0 }}>Asset Not Found</h4>
        <p style={{ color: "#94a3b8", fontSize: 14, margin: 0 }}>{error || "This asset does not exist."}</p>
      </div>
    );
  }

  const expired = isWarrantyExpired();
  const hasWarranty = assetData.serviceWarrantyMonths > 0;
  const daysLeft = getWarrantyDaysRemaining();

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
        .av-row { display: flex; justify-content: space-between; align-items: center; padding: 11px 0; border-bottom: 1px solid #f1f5f9; }
        .av-row:last-child { border-bottom: none; }
        .av-label { font-size: 12px; color: #94a3b8; font-weight: 500; }
        .av-value { font-size: 13px; color: #1e293b; font-weight: 600; text-align: right; max-width: 60%; word-break: break-all; }
        .av-section { background: #fff; border-radius: 12px; padding: 16px; margin-bottom: 12px; border: 1px solid #e2e8f0; }
        .av-section-title { font-size: 11px; font-weight: 700; letter-spacing: 0.08em; color: #94a3b8; text-transform: uppercase; margin-bottom: 12px; }
        .av-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 12px; }
        .av-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px; }
        .av-card-label { font-size: 10px; font-weight: 700; letter-spacing: 0.08em; color: #94a3b8; text-transform: uppercase; margin-bottom: 6px; }
        .av-card-value { font-size: 14px; font-weight: 700; color: #1e293b; }
      `}</style>

      <div style={{ minHeight: "100vh", background: "#f1f5f9", paddingBottom: 32 }}>

        {/* Top bar */}
        <div style={{ background: "#1e293b", padding: "16px 20px 20px" }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: "#64748b", textTransform: "uppercase", marginBottom: 8 }}>
            Asset Passport · ProClient360
          </div>
          <div style={{ fontFamily: "monospace", fontSize: 13, fontWeight: 700, color: "#f1f5f9", letterSpacing: "0.04em", marginBottom: 6, wordBreak: "break-all" }}>
            {assetData.assetId}
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#ffffff", marginBottom: 10 }}>
            {assetData.brandName} — {assetData.modelNo}
          </div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: sc.bg, borderRadius: 20, padding: "4px 12px" }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: sc.dot }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: sc.color }}>{assetData.status}</span>
          </div>
        </div>

        <div style={{ padding: "16px 16px 0" }}>

          {/* Movement dates */}
          <div className="av-grid">
            <div className="av-card" style={{ borderLeft: "3px solid #3b82f6" }}>
              <div className="av-card-label">In Date</div>
              <div className="av-card-value" style={{ color: "#1d4ed8", fontSize: 13 }}>{fmt(assetData.inDate)}</div>
            </div>
            <div className="av-card" style={{ borderLeft: "3px solid #ef4444" }}>
              <div className="av-card-label">Out Date</div>
              <div className="av-card-value" style={{ color: assetData.outDate ? "#b91c1c" : "#94a3b8", fontSize: 13 }}>
                {assetData.outDate ? fmt(assetData.outDate) : "Not dispatched"}
              </div>
            </div>
          </div>

          {/* Reference info */}
          <div className="av-section">
            <div className="av-section-title">Reference</div>
            <div className="av-row">
              <span className="av-label">QC Number</span>
              <span className="av-value" style={{ fontFamily: "monospace", fontSize: 12 }}>{assetData.qcNumber}</span>
            </div>
            <div className="av-row">
              <span className="av-label">GRN Number</span>
              <span className="av-value" style={{ fontFamily: "monospace", fontSize: 12 }}>{assetData.grnNumber}</span>
            </div>
            <div className="av-row">
              <span className="av-label">Unit</span>
              <span className="av-value">{assetData.unit}</span>
            </div>
            {assetData.boxNumber && (
              <div className="av-row">
                <span className="av-label">Box</span>
                <span className="av-value">{assetData.boxNumber}</span>
              </div>
            )}
          </div>

          {/* Warranty */}
          <div className="av-section" style={{
            background: !hasWarranty ? "#fff" : expired ? "#fff5f5" : "#f0fdf4",
            borderColor: !hasWarranty ? "#e2e8f0" : expired ? "#fecaca" : "#bbf7d0",
            textAlign: "center",
            padding: "20px 16px",
          }}>
            <div style={{
              width: 52, height: 52, borderRadius: "50%",
              background: !hasWarranty ? "#f1f5f9" : expired ? "#fee2e2" : "#dcfce7",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 22, margin: "0 auto 12px",
              color: !hasWarranty ? "#94a3b8" : expired ? "#dc2626" : "#16a34a",
            }}>
              {!hasWarranty ? "—" : expired ? "✕" : "✓"}
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: !hasWarranty ? "#64748b" : expired ? "#dc2626" : "#16a34a", marginBottom: 6 }}>
              {!hasWarranty ? "No Warranty" : expired ? "Warranty Expired" : "Under Warranty"}
            </div>
            {hasWarranty && (
              <>
                <div style={{ fontSize: 13, color: "#64748b", marginBottom: 3 }}>
                  Duration: <strong>{assetData.serviceWarrantyMonths} months</strong>
                </div>
                <div style={{ fontSize: 13, color: "#64748b" }}>
                  Expires: <strong style={{ color: expired ? "#dc2626" : "#16a34a" }}>{fmt(assetData.warrantyExpiryDate)}</strong>
                </div>
                {!expired && daysLeft !== null && (
                  <div style={{ marginTop: 10, display: "inline-block", background: "#dcfce7", color: "#15803d", borderRadius: 20, padding: "4px 14px", fontSize: 13, fontWeight: 700 }}>
                    {daysLeft} days remaining
                  </div>
                )}
              </>
            )}
          </div>

          {/* Service history */}
          {assetData.serviceHistory?.length > 0 && (
            <div className="av-section">
              <div className="av-section-title">Service History</div>
              {assetData.serviceHistory.map((h, i) => (
                <div key={i} style={{ display: "flex", gap: 12, paddingBottom: i < assetData.serviceHistory.length - 1 ? 12 : 0, marginBottom: i < assetData.serviceHistory.length - 1 ? 12 : 0, borderBottom: i < assetData.serviceHistory.length - 1 ? "1px solid #f1f5f9" : "none" }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#3b82f6", marginTop: 4, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#1e293b", marginBottom: 2 }}>{h.description}</div>
                    <div style={{ fontSize: 11, color: "#94a3b8" }}>{fmt(h.date)} · {h.servicedBy}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Footer */}
          <div style={{ textAlign: "center", padding: "8px 0 4px" }}>
            <div style={{ fontSize: 11, color: "#cbd5e1" }}>Scanned {new Date().toLocaleString("en-GB")}</div>
            <div style={{ fontSize: 11, color: "#cbd5e1", marginTop: 2 }}>Powered by ProClient360</div>
          </div>

        </div>
      </div>
    </>
  );
};

export default AssetView;