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
        console.log('Fetching asset:', assetId);
        console.log('API URL:', `${baseUrl}/api/qc/public/asset/${assetId}`);
        
        const response = await axios.get(`${baseUrl}/api/qc/public/asset/${assetId}`);
        console.log('API Response:', response.data);
        
        if (response.data.success) {
          setData(response.data);
        } else {
          setError(response.data.error || "Asset not found");
        }
      } catch (err) {
        console.error('Fetch Error:', err);
        console.error('Error Response:', err.response?.data);
        setError(err.response?.data?.error || "Failed to load asset information");
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
      <>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#f8fafc", gap: 16 }}>
          <div style={{ width: 40, height: 40, border: "3px solid #e2e8f0", borderTop: "3px solid #3b82f6", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
          <p style={{ color: "#94a3b8", fontSize: 14, margin: 0 }}>Loading asset details...</p>
        </div>
      </>
    );
  }

  if (error || !data) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#f8fafc", padding: 24, textAlign: "center", gap: 12 }}>
        <div style={{ fontSize: 56, color: "#fca5a5" }}>✕</div>
        <h4 style={{ color: "#ef4444", fontSize: 20, fontWeight: 700, margin: 0 }}>Asset Not Found</h4>
        <p style={{ color: "#94a3b8", fontSize: 14, margin: 0, maxWidth: 300 }}>{error || "This asset does not exist or the link is invalid."}</p>
        <p style={{ color: "#cbd5e1", fontSize: 12, margin: 0, fontFamily: "monospace" }}>ID: {assetId}</p>
      </div>
    );
  }

  const isBox = data.isBox;
  const asset = data.asset;
  const box = data.box;
  const boxAssets = data.assets || [];

  const renderAssetCard = (a, index, showHeader = true) => {
    const expired = a.isWarrantyExpired;
    const hasWarranty = a.hasWarranty;
    const daysLeft = getWarrantyDaysRemaining(a.warrantyExpiryDate);
    const sc = getStatusColor(a.status);

    return (
      <div key={index} style={{
        background: "#fff",
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        border: "1px solid #e2e8f0",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
      }}>
        {showHeader && (
          <div style={{ 
            fontFamily: "monospace", 
            fontSize: 11, 
            fontWeight: 600, 
            color: "#94a3b8", 
            marginBottom: 10, 
            wordBreak: "break-all",
            letterSpacing: "0.02em",
          }}>
            {a.assetId}
          </div>
        )}

        <div style={{ fontSize: 17, fontWeight: 700, color: "#0f172a", marginBottom: 4 }}>
          {a.brandName}
        </div>
        <div style={{ fontSize: 14, fontWeight: 500, color: "#64748b", marginBottom: 16 }}>
          {a.modelNo}
        </div>

        <div style={{ 
          display: "inline-flex", 
          alignItems: "center", 
          gap: 7, 
          background: sc.bg, 
          borderRadius: 24, 
          padding: "6px 14px",
          marginBottom: 20,
        }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: sc.dot }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: sc.color }}>{sc.label}</span>
        </div>

        <div style={{
          display: "grid",
          gridTemplateColumns: a.outDate ? "1fr 1fr" : "1fr",
          gap: 12,
          marginBottom: 20,
        }}>
          <div style={{
            background: a.outDate ? "#fff7ed" : "#f8fafc",
            border: `1px solid ${a.outDate ? "#fed7aa" : "#e2e8f0"}`,
            borderRadius: 12,
            padding: "14px 16px",
          }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: "#94a3b8", textTransform: "uppercase", marginBottom: 6 }}>
              <i className="fa fa-arrow-up" style={{ marginRight: 4, color: "#ea580c" }}></i>
              Out Date
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: a.outDate ? "#c2410c" : "#cbd5e1" }}>
              {a.outDate ? fmt(a.outDate) : "Not Dispatched"}
            </div>
          </div>

          {a.isDispatched && a.outDate && (
            <div style={{
              background: "#f0fdf4",
              border: "1px solid #bbf7d0",
              borderRadius: 12,
              padding: "14px 16px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: "#94a3b8", textTransform: "uppercase", marginBottom: 6 }}>
                Status
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#16a34a" }}>
                ✓ Dispatched
              </div>
            </div>
          )}
        </div>

        <div style={{
          background: !hasWarranty ? "#f8fafc" : expired ? "#fef2f2" : "#f0fdf4",
          borderRadius: 14,
          padding: "20px 16px",
          textAlign: "center",
          border: !hasWarranty ? "1px dashed #e2e8f0" : expired ? "1px solid #fecaca" : "1px solid #bbf7d0",
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: "50%",
            background: !hasWarranty ? "#f1f5f9" : expired ? "#fee2e2" : "#dcfce7",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 24, margin: "0 auto 14px",
            color: !hasWarranty ? "#94a3b8" : expired ? "#dc2626" : "#16a34a",
            boxShadow: !hasWarranty ? "none" : expired ? "0 2px 8px rgba(220,38,38,0.15)" : "0 2px 8px rgba(22,163,74,0.15)",
          }}>
            {!hasWarranty ? "—" : expired ? "✕" : "✓"}
          </div>

          <div style={{ fontSize: 16, fontWeight: 700, color: !hasWarranty ? "#64748b" : expired ? "#dc2626" : "#16a34a", marginBottom: 8 }}>
            {!hasWarranty ? "No Warranty" : expired ? "Warranty Expired" : "Under Warranty"}
          </div>

          {hasWarranty && (
            <>
              <div style={{ fontSize: 13, color: "#64748b", marginBottom: 4 }}>
                Duration: <strong>{a.serviceWarrantyMonths} months</strong>
              </div>
              <div style={{ fontSize: 13, color: "#64748b", marginBottom: 10 }}>
                Expires: <strong style={{ color: expired ? "#dc2626" : "#16a34a" }}>{fmt(a.warrantyExpiryDate)}</strong>
              </div>
              {!expired && daysLeft !== null && (
                <div style={{
                  display: "inline-block",
                  background: "linear-gradient(135deg, #dcfce7, #bbf7d0)",
                  color: "#15803d",
                  borderRadius: 24,
                  padding: "6px 18px",
                  fontSize: 14,
                  fontWeight: 700,
                  boxShadow: "0 1px 3px rgba(22,163,74,0.2)",
                }}>
                  <i className="fa fa-shield" style={{ marginRight: 6 }}></i>
                  {daysLeft} days remaining
                </div>
              )}
              {expired && (
                <div style={{
                  display: "inline-block",
                  background: "linear-gradient(135deg, #fee2e2, #fecaca)",
                  color: "#dc2626",
                  borderRadius: 24,
                  padding: "6px 18px",
                  fontSize: 14,
                  fontWeight: 700,
                  boxShadow: "0 1px 3px rgba(220,38,38,0.2)",
                }}>
                  <i className="fa fa-exclamation-triangle" style={{ marginRight: 6 }}></i>
                  Expired
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f1f5f9", paddingBottom: 40 }}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; -webkit-font-smoothing: antialiased; }
      `}</style>

      <div style={{ 
        background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)", 
        padding: "24px 20px 28px",
        position: "relative",
        overflow: "hidden",
      }}>
        <div style={{ position: "absolute", top: -20, right: -20, width: 100, height: 100, borderRadius: "50%", background: "rgba(59,130,246,0.1)" }} />
        <div style={{ position: "absolute", bottom: -30, right: 40, width: 80, height: 80, borderRadius: "50%", background: "rgba(59,130,246,0.05)" }} />

        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ 
            fontSize: 10, 
            fontWeight: 700, 
            letterSpacing: "0.12em", 
            color: "#64748b", 
            textTransform: "uppercase", 
            marginBottom: 12,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}>
            <i className="fa fa-qrcode" style={{ fontSize: 12 }}></i>
            {isBox ? "Box Information" : "Asset Passport"} · ProClient360
          </div>
          
          {isBox ? (
            <>
              <div style={{ 
                fontSize: 22, 
                fontWeight: 800, 
                color: "#f1f5f9", 
                marginBottom: 8,
                letterSpacing: "-0.01em",
              }}>
                {box?.boxNumber}
              </div>
              <div style={{ fontSize: 16, fontWeight: 500, color: "#94a3b8", marginBottom: 14 }}>
                {box?.brandName} — {box?.modelNo}
              </div>
              <div style={{ 
                display: "inline-flex", 
                alignItems: "center", 
                gap: 8, 
                background: "rgba(59,130,246,0.15)", 
                borderRadius: 24, 
                padding: "6px 16px",
                border: "1px solid rgba(59,130,246,0.25)",
              }}>
                <i className="fa fa-box" style={{ fontSize: 12, color: "#60a5fa" }}></i>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#93c5fd" }}>{box?.assetCount} Items in Box</span>
              </div>
            </>
          ) : (
            <>
              <div style={{ 
                fontFamily: "monospace", 
                fontSize: 12, 
                fontWeight: 600, 
                color: "#64748b", 
                letterSpacing: "0.04em", 
                marginBottom: 8, 
                wordBreak: "break-all",
              }}>
                {asset?.assetId}
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#f1f5f9", marginBottom: 4 }}>
                {asset?.brandName}
              </div>
              <div style={{ fontSize: 16, fontWeight: 500, color: "#94a3b8" }}>
                {asset?.modelNo}
              </div>
            </>
          )}
        </div>
      </div>

      <div style={{ padding: "20px 16px 0" }}>
        {isBox ? (
          <>
            <div style={{
              background: "#fff",
              borderRadius: 14,
              padding: "16px 20px",
              marginBottom: 16,
              border: "1px solid #e2e8f0",
              display: "flex",
              alignItems: "center",
              gap: 16,
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: "linear-gradient(135deg, #3b82f6, #2563eb)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 20, color: "#fff",
                flexShrink: 0,
              }}>
                <i className="fa fa-box"></i>
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>
                  Warranty information for all items in this box
                </div>
                <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                  {box?.assetCount} items · {box?.brandName} · {box?.modelNo}
                </div>
              </div>
            </div>

            {boxAssets.length > 0 ? (
              boxAssets.map((a, i) => renderAssetCard(a, i))
            ) : (
              <div style={{
                background: "#fff",
                borderRadius: 14,
                padding: 40,
                textAlign: "center",
                border: "1px solid #e2e8f0",
              }}>
                <i className="fa fa-box-open" style={{ fontSize: 40, color: "#94a3b8", marginBottom: 12 }}></i>
                <p style={{ color: "#64748b", margin: 0 }}>No assets found in this box</p>
              </div>
            )}
          </>
        ) : (
          renderAssetCard(asset, 0, true)
        )}

        <div style={{ textAlign: "center", padding: "24px 0 8px" }}>
          <div style={{ 
            width: 40, 
            height: 1, 
            background: "#e2e8f0", 
            margin: "0 auto 12px",
          }} />
          <div style={{ fontSize: 11, color: "#cbd5e1" }}>
            <i className="fa fa-qrcode" style={{ marginRight: 4 }}></i>
            Scanned {new Date().toLocaleString("en-GB")}
          </div>
          <div style={{ fontSize: 11, color: "#cbd5e1", marginTop: 4 }}>
            Powered by <strong style={{ color: "#94a3b8" }}>ProClient360</strong>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssetView;