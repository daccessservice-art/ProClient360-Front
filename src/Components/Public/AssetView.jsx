// Components/Public/AssetView.jsx
import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";

const AssetView = () => {
  const { assetId } = useParams();
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAsset = async () => {
      try {
        const baseUrl = process.env.REACT_APP_API_URL;
        const response = await axios.get(`${baseUrl}/api/qc/public/asset/${assetId}`);
        
        if (response.data.success) {
          setData(response.data);
        } else {
          setError(response.data.error || "Not found");
        }
      } catch (err) {
        setError(err.response?.data?.error || "Failed to load information");
      } finally {
        setIsLoading(false);
      }
    };
    if (assetId) fetchAsset();
  }, [assetId]);

  const fmt = (d) =>
    d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : null;

  const getWarrantyDaysRemaining = (expiryDate) => {
    if (!expiryDate) return null;
    const diff = new Date(expiryDate) - new Date();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const getStatusColor = (status) => {
    const colors = {
      "In Warehouse":    { bg: "#e8f0fe", color: "#1a56db", dot: "#1a56db", label: "In Warehouse" },
      "Dispatched":      { bg: "#e3f9f5", color: "#0d9488", dot: "#0d9488", label: "Dispatched" },
      "In Service":      { bg: "#f0fdf4", color: "#16a34a", dot: "#16a34a", label: "In Service" },
      "Warranty Expired":{ bg: "#fff1f2", color: "#e11d48", dot: "#e11d48", label: "Warranty Expired" },
      "Damaged":         { bg: "#f1f5f9", color: "#475569", dot: "#475569", label: "Damaged" },
    };
    return colors[status] || { bg: "#f1f5f9", color: "#475569", dot: "#475569", label: status };
  };

  if (isLoading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#f8fafc", gap: 16 }}>
        <div style={{ width: 40, height: 40, border: "3px solid #e2e8f0", borderTop: "3px solid #3b82f6", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <p style={{ color: "#94a3b8", fontSize: 14, margin: 0 }}>Loading...</p>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#f8fafc", padding: 24, textAlign: "center", gap: 12 }}>
        <div style={{ fontSize: 56, color: "#fca5a5" }}>✕</div>
        <h4 style={{ color: "#ef4444", fontSize: 20, fontWeight: 700, margin: 0 }}>Not Found</h4>
        <p style={{ color: "#94a3b8", fontSize: 14, margin: 0, maxWidth: 300 }}>{error || "This asset does not exist or the link is invalid."}</p>
      </div>
    );
  }

  const isBox = data.isBox;
  const asset = data.asset;
  const box = data.box;
  const boxAssets = data.assets || [];
  const itemInfo = data.itemInfo;

  const renderWarrantySection = (a) => {
    const hasWarranty = a.hasWarranty;
    const expired = a.isWarrantyExpired;
    const warrantyMonths = a.serviceWarrantyMonths || 0;
    const warrantyExpiry = a.warrantyExpiryDate;
    const daysLeft = a.warrantyDaysRemaining;

    return (
      <div style={{
        background: !hasWarranty ? "#f8fafc" : expired ? "#fef2f2" : "#f0fdf4",
        borderRadius: 12,
        padding: "16px 14px",
        textAlign: "center",
        border: !hasWarranty ? "1px dashed #e2e8f0" : expired ? "1px solid #fecaca" : "1px solid #bbf7d0",
        marginTop: 12,
      }}>
        <div style={{
          width: 44, height: 44, borderRadius: "50%",
          background: !hasWarranty ? "#f1f5f9" : expired ? "#fee2e2" : "#dcfce7",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 20, margin: "0 auto 10px",
          color: !hasWarranty ? "#94a3b8" : expired ? "#dc2626" : "#16a34a",
        }}>
          {!hasWarranty ? "—" : expired ? "✕" : "✓"}
        </div>

        <div style={{ fontSize: 14, fontWeight: 700, color: !hasWarranty ? "#64748b" : expired ? "#dc2626" : "#16a34a", marginBottom: 6 }}>
          {!hasWarranty ? "No Warranty" : expired ? "Warranty Expired" : "Under Warranty"}
        </div>

        {hasWarranty && (
          <>
            <div style={{ fontSize: 12, color: "#64748b", marginBottom: 3 }}>
              Duration: <strong>{warrantyMonths} months</strong>
            </div>
            <div style={{ fontSize: 12, color: "#64748b", marginBottom: 8 }}>
              Expires: <strong style={{ color: expired ? "#dc2626" : "#16a34a" }}>{fmt(warrantyExpiry)}</strong>
            </div>
            {!expired && daysLeft !== null && daysLeft > 0 && (
              <div style={{
                display: "inline-block",
                background: "linear-gradient(135deg, #dcfce7, #bbf7d0)",
                color: "#15803d",
                borderRadius: 20,
                padding: "4px 14px",
                fontSize: 12,
                fontWeight: 700,
              }}>
                <i className="fa fa-shield" style={{ marginRight: 4 }}></i>
                {daysLeft} days left
              </div>
            )}
            {expired && (
              <div style={{
                display: "inline-block",
                background: "linear-gradient(135deg, #fee2e2, #fecaca)",
                color: "#dc2626",
                borderRadius: 20,
                padding: "4px 14px",
                fontSize: 12,
                fontWeight: 700,
              }}>
                <i className="fa fa-exclamation-triangle" style={{ marginRight: 4 }}></i>
                Expired
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  const renderAssetCard = (a, index, showHeader = true) => {
    const sc = getStatusColor(a.status);

    return (
      <div key={index} style={{
        background: "#fff",
        borderRadius: 14,
        padding: 16,
        marginBottom: 12,
        border: "1px solid #e2e8f0",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
      }}>
        {showHeader && (
          <div style={{ 
            fontFamily: "monospace", 
            fontSize: 10, 
            fontWeight: 600, 
            color: "#94a3b8", 
            marginBottom: 8, 
            wordBreak: "break-all",
          }}>
            {a.assetId}
          </div>
        )}

        <div style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", marginBottom: 3 }}>
          {a.brandName || "N/A"}
        </div>
        <div style={{ fontSize: 13, fontWeight: 500, color: "#64748b", marginBottom: 12 }}>
          {a.modelNo || "N/A"}
        </div>

        {/* Status */}
        <div style={{ 
          display: "inline-flex", 
          alignItems: "center", 
          gap: 6, 
          background: sc.bg, 
          borderRadius: 20, 
          padding: "5px 12px",
          marginBottom: 12,
        }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: sc.dot }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: sc.color }}>{sc.label}</span>
        </div>

        {/* Dates */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 4 }}>
          <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "10px 12px" }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", marginBottom: 4 }}>Out Date</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: a.outDate ? "#0d9488" : "#cbd5e1" }}>
              {a.outDate ? fmt(a.outDate) : "Not Dispatched"}
            </div>
          </div>
          <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "10px 12px" }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", marginBottom: 4 }}>Status</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: a.isDispatched ? "#16a34a" : "#cbd5e1" }}>
              {a.isDispatched ? "✓ Dispatched" : "Pending"}
            </div>
          </div>
        </div>

        {renderWarrantySection(a)}
      </div>
    );
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f1f5f9", paddingBottom: 40 }}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
      `}</style>

      {/* Header */}
      <div style={{ 
        background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)", 
        padding: "20px 16px 24px",
      }}>
        <div style={{ 
          fontSize: 9, 
          fontWeight: 700, 
          letterSpacing: "0.1em", 
          color: "#64748b", 
          textTransform: "uppercase", 
          marginBottom: 10,
          display: "flex", alignItems: "center", gap: 6,
        }}>
          <i className="fa fa-qrcode" style={{ fontSize: 11 }}></i>
          {isBox ? "Box Information" : "Asset Passport"} · ProClient360
        </div>
        
        {isBox ? (
          <>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#f1f5f9", marginBottom: 6 }}>
              {box?.boxNumber}
            </div>
            <div style={{ fontSize: 14, fontWeight: 500, color: "#94a3b8", marginBottom: 10 }}>
              {itemInfo?.brandName || box?.brandName} — {itemInfo?.modelNo || box?.modelNo}
            </div>
            <div style={{ 
              display: "inline-flex", alignItems: "center", gap: 6, 
              background: "rgba(59,130,246,0.15)", borderRadius: 20, padding: "5px 14px",
              border: "1px solid rgba(59,130,246,0.25)",
            }}>
              <i className="fa fa-box" style={{ fontSize: 11, color: "#60a5fa" }}></i>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#93c5fd" }}>{box?.assetCount || boxAssets.length} Items in Box</span>
            </div>
            {data.qcNumber && (
              <div style={{ fontSize: 11, color: "#64748b", marginTop: 8, fontFamily: "monospace" }}>
                {data.qcNumber} | {data.grnNumber}
              </div>
            )}
          </>
        ) : (
          <>
            <div style={{ fontFamily: "monospace", fontSize: 11, fontWeight: 600, color: "#64748b", marginBottom: 6, wordBreak: "break-all" }}>
              {asset?.assetId}
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#f1f5f9", marginBottom: 3 }}>
              {asset?.brandName || "N/A"}
            </div>
            <div style={{ fontSize: 14, fontWeight: 500, color: "#94a3b8" }}>
              {asset?.modelNo || "N/A"}
            </div>
            {data.qcNumber && (
              <div style={{ fontSize: 11, color: "#64748b", marginTop: 8, fontFamily: "monospace" }}>
                {data.qcNumber} | {data.grnNumber}
              </div>
            )}
          </>
        )}
      </div>

      <div style={{ padding: "16px 12px 0" }}>
        {isBox ? (
          <>
            {/* Box Info Banner */}
            <div style={{
              background: "#fff", borderRadius: 12, padding: "14px 16px", marginBottom: 14,
              border: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: 12,
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: "linear-gradient(135deg, #3b82f6, #2563eb)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 18, color: "#fff", flexShrink: 0,
              }}>
                <i className="fa fa-box"></i>
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>
                  Items inside this box
                </div>
                <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                  {boxAssets.length} items · {itemInfo?.brandName || box?.brandName} · {itemInfo?.modelNo || box?.modelNo}
                </div>
              </div>
            </div>

            {/* Assets Inside Box */}
            {boxAssets.length > 0 ? (
              boxAssets.map((a, i) => renderAssetCard(a, i))
            ) : (
              <div style={{
                background: "#fff", borderRadius: 12, padding: 40, textAlign: "center",
                border: "1px solid #e2e8f0",
              }}>
                <i className="fa fa-box-open" style={{ fontSize: 36, color: "#94a3b8", marginBottom: 10 }}></i>
                <p style={{ color: "#64748b", fontSize: 13 }}>No assets found in this box</p>
              </div>
            )}
          </>
        ) : (
          renderAssetCard(asset, 0, true)
        )}

        {/* Footer */}
        <div style={{ textAlign: "center", padding: "20px 0 8px" }}>
          <div style={{ width: 40, height: 1, background: "#e2e8f0", margin: "0 auto 10px" }} />
          <div style={{ fontSize: 10, color: "#cbd5e1" }}>
            <i className="fa fa-qrcode" style={{ marginRight: 3 }}></i>
            Scanned {new Date().toLocaleString("en-GB")}
          </div>
          <div style={{ fontSize: 10, color: "#cbd5e1", marginTop: 3 }}>
            Powered by <strong style={{ color: "#94a3b8" }}>ProClient360</strong>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssetView;