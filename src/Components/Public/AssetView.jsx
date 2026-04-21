import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";

const AssetView = () => {
  const { assetId } = useParams();
  const [assetData, setAssetData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mounted, setMounted] = useState(false);

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
        setTimeout(() => setMounted(true), 50);
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
    const expiry = new Date(assetData.warrantyExpiryDate);
    const diffTime = expiry - new Date();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getStatusConfig = (status) => {
    const configs = {
      'In Warehouse': { bg: '#1e3a5f', text: '#7eb8f7', icon: '▣' },
      'Dispatched':   { bg: '#0e3d2f', text: '#4fd1a5', icon: '➤' },
      'In Service':   { bg: '#2d3a0e', text: '#a3d45a', icon: '◉' },
      'Warranty Expired': { bg: '#3d1a1a', text: '#f08080', icon: '✕' },
      'Damaged':      { bg: '#2c2c2c', text: '#aaaaaa', icon: '⚠' },
    };
    return configs[status] || { bg: '#2c2c2c', text: '#aaaaaa', icon: '◌' };
  };

  const fmt = (dateStr) =>
    new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric'
    });

  const styles = {
    page: {
      minHeight: '100vh',
      background: '#f0f2f5',
      fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
    },
    header: {
      background: 'linear-gradient(160deg, #0d1b2a 0%, #1a3a5c 60%, #0d2d45 100%)',
      padding: '48px 24px 80px',
      position: 'relative',
      overflow: 'hidden',
    },
    headerAccent: {
      position: 'absolute',
      top: -40,
      right: -40,
      width: 180,
      height: 180,
      borderRadius: '50%',
      background: 'rgba(126, 184, 247, 0.06)',
      border: '1px solid rgba(126,184,247,0.12)',
    },
    headerAccent2: {
      position: 'absolute',
      bottom: 10,
      left: -30,
      width: 120,
      height: 120,
      borderRadius: '50%',
      background: 'rgba(79,209,165,0.05)',
      border: '1px solid rgba(79,209,165,0.1)',
    },
    brandBadge: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      background: 'rgba(126,184,247,0.12)',
      border: '1px solid rgba(126,184,247,0.25)',
      borderRadius: 20,
      padding: '4px 12px',
      fontSize: 11,
      fontWeight: 600,
      letterSpacing: '0.08em',
      color: '#7eb8f7',
      textTransform: 'uppercase',
      marginBottom: 16,
    },
    assetIdBlock: {
      fontFamily: "'Courier New', monospace",
      fontSize: 15,
      fontWeight: 700,
      color: '#ffffff',
      letterSpacing: '0.05em',
      marginBottom: 6,
      wordBreak: 'break-all',
    },
    headerSubtitle: {
      fontSize: 13,
      color: 'rgba(255,255,255,0.45)',
      marginBottom: 18,
    },
    statusPill: (cfg) => ({
      display: 'inline-flex',
      alignItems: 'center',
      gap: 7,
      background: cfg.bg,
      borderRadius: 20,
      padding: '6px 14px',
      fontSize: 12,
      fontWeight: 600,
      color: cfg.text,
      border: `1px solid ${cfg.text}30`,
    }),
    floatingCard: {
      background: '#ffffff',
      borderRadius: '24px 24px 0 0',
      marginTop: -32,
      minHeight: 'calc(100vh - 220px)',
      position: 'relative',
      padding: '28px 20px 48px',
      boxShadow: '0 -4px 24px rgba(0,0,0,0.08)',
      opacity: mounted ? 1 : 0,
      transform: mounted ? 'translateY(0)' : 'translateY(16px)',
      transition: 'opacity 0.4s ease, transform 0.4s ease',
    },
    handle: {
      width: 40,
      height: 4,
      background: '#e0e0e0',
      borderRadius: 2,
      margin: '0 auto 28px',
    },
    sectionLabel: {
      fontSize: 10,
      fontWeight: 700,
      letterSpacing: '0.12em',
      color: '#94a3b8',
      textTransform: 'uppercase',
      marginBottom: 12,
    },
    productCard: {
      background: '#f8fafc',
      borderRadius: 16,
      padding: '16px 18px',
      border: '1px solid #e8eef4',
      marginBottom: 20,
      display: 'flex',
      alignItems: 'center',
      gap: 16,
    },
    productIcon: {
      width: 52,
      height: 52,
      borderRadius: 14,
      background: 'linear-gradient(135deg, #1a3a5c, #0d2d45)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 22,
      flexShrink: 0,
    },
    productName: {
      fontSize: 17,
      fontWeight: 700,
      color: '#0d1b2a',
      lineHeight: 1.2,
      marginBottom: 3,
    },
    productModel: {
      fontSize: 13,
      color: '#64748b',
    },
    twoCol: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 12,
      marginBottom: 20,
    },
    metricCard: (accent) => ({
      background: '#f8fafc',
      borderRadius: 14,
      padding: '14px 16px',
      border: `1px solid ${accent}25`,
      borderLeft: `3px solid ${accent}`,
    }),
    metricLabel: {
      fontSize: 10,
      fontWeight: 700,
      letterSpacing: '0.08em',
      color: '#94a3b8',
      textTransform: 'uppercase',
      marginBottom: 6,
    },
    metricValue: (color) => ({
      fontSize: 15,
      fontWeight: 700,
      color: color || '#0d1b2a',
      lineHeight: 1.2,
    }),
    refSection: {
      background: '#f8fafc',
      borderRadius: 16,
      border: '1px solid #e8eef4',
      overflow: 'hidden',
      marginBottom: 20,
    },
    refRow: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '12px 16px',
      borderBottom: '1px solid #f0f4f8',
    },
    refKey: {
      fontSize: 12,
      color: '#94a3b8',
      fontWeight: 500,
    },
    refVal: {
      fontSize: 13,
      fontWeight: 600,
      color: '#1e293b',
      fontFamily: "'Courier New', monospace",
    },
    warrantyCard: (expired, hasWarranty) => ({
      borderRadius: 16,
      padding: '20px',
      marginBottom: 20,
      background: !hasWarranty
        ? '#f8fafc'
        : expired
        ? 'linear-gradient(135deg, #fff5f5, #fff0f0)'
        : 'linear-gradient(135deg, #f0fdf4, #ecfdf5)',
      border: !hasWarranty
        ? '1px solid #e8eef4'
        : expired
        ? '1px solid #fecaca'
        : '1px solid #bbf7d0',
      textAlign: 'center',
    }),
    warrantyIcon: (expired, hasWarranty) => ({
      width: 56,
      height: 56,
      borderRadius: '50%',
      background: !hasWarranty ? '#e2e8f0' : expired ? '#fee2e2' : '#dcfce7',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 24,
      margin: '0 auto 12px',
    }),
    warrantyTitle: (expired, hasWarranty) => ({
      fontSize: 16,
      fontWeight: 700,
      color: !hasWarranty ? '#64748b' : expired ? '#dc2626' : '#16a34a',
      marginBottom: 6,
    }),
    warrantyMeta: {
      fontSize: 13,
      color: '#64748b',
      marginBottom: 4,
    },
    daysRemaining: {
      display: 'inline-block',
      marginTop: 10,
      background: '#dcfce7',
      color: '#15803d',
      borderRadius: 20,
      padding: '4px 14px',
      fontSize: 13,
      fontWeight: 700,
    },
    historyCard: {
      background: '#f8fafc',
      borderRadius: 16,
      border: '1px solid #e8eef4',
      overflow: 'hidden',
      marginBottom: 20,
    },
    historyItem: (isLast) => ({
      padding: '14px 16px',
      borderBottom: isLast ? 'none' : '1px solid #f0f4f8',
      display: 'flex',
      gap: 12,
    }),
    historyDot: {
      width: 8,
      height: 8,
      borderRadius: '50%',
      background: '#3b82f6',
      marginTop: 5,
      flexShrink: 0,
    },
    historyDesc: {
      fontSize: 13,
      fontWeight: 600,
      color: '#1e293b',
      marginBottom: 3,
    },
    historyMeta: {
      fontSize: 11,
      color: '#94a3b8',
    },
    footer: {
      textAlign: 'center',
      paddingTop: 8,
    },
    footerText: {
      fontSize: 11,
      color: '#cbd5e1',
      letterSpacing: '0.04em',
    },
    loadingWrap: {
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0d1b2a',
      gap: 16,
    },
    spinner: {
      width: 40,
      height: 40,
      border: '3px solid rgba(126,184,247,0.2)',
      borderTop: '3px solid #7eb8f7',
      borderRadius: '50%',
      animation: 'spin 0.8s linear infinite',
    },
    errorWrap: {
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0d1b2a',
      padding: 24,
      textAlign: 'center',
      gap: 12,
    },
  };

  if (isLoading) {
    return (
      <>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <div style={styles.loadingWrap}>
          <div style={styles.spinner} />
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, margin: 0 }}>
            Fetching asset details...
          </p>
        </div>
      </>
    );
  }

  if (error || !assetData) {
    return (
      <div style={styles.errorWrap}>
        <div style={{ fontSize: 48 }}>⊘</div>
        <h4 style={{ color: '#f87171', fontSize: 18, fontWeight: 700, margin: 0 }}>
          Asset Not Found
        </h4>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, margin: 0 }}>
          {error || "This asset does not exist or has been removed."}
        </p>
      </div>
    );
  }

  const statusCfg = getStatusConfig(assetData.status);
  const expired = isWarrantyExpired();
  const hasWarranty = assetData.serviceWarrantyMonths > 0;
  const daysLeft = getWarrantyDaysRemaining();
  const hasHistory = assetData.serviceHistory?.length > 0;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <div style={styles.page}>

        {/* ── Header ── */}
        <div style={styles.header}>
          <div style={styles.headerAccent} />
          <div style={styles.headerAccent2} />

          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={styles.brandBadge}>
              <span>◈</span> Asset Passport
            </div>

            <div style={styles.assetIdBlock}>{assetData.assetId}</div>
            <div style={styles.headerSubtitle}>
              {assetData.brandName} · {assetData.modelNo}
            </div>

            <div style={styles.statusPill(statusCfg)}>
              <span>{statusCfg.icon}</span>
              {assetData.status}
            </div>
          </div>
        </div>

        {/* ── Floating content card ── */}
        <div style={styles.floatingCard}>
          <div style={styles.handle} />

          {/* Product Summary */}
          <div style={styles.sectionLabel}>Product</div>
          <div style={styles.productCard}>
            <div style={styles.productIcon}>📦</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={styles.productName}>{assetData.brandName}</div>
              <div style={styles.productModel}>{assetData.modelNo}</div>
              {assetData.boxNumber && (
                <div style={{
                  marginTop: 6,
                  display: 'inline-block',
                  background: '#eff6ff',
                  color: '#1d4ed8',
                  fontSize: 11,
                  fontWeight: 600,
                  borderRadius: 8,
                  padding: '2px 8px',
                }}>
                  {assetData.boxNumber}
                </div>
              )}
            </div>
          </div>

          {/* Dates */}
          <div style={styles.sectionLabel}>Movement</div>
          <div style={styles.twoCol}>
            <div style={styles.metricCard('#3b82f6')}>
              <div style={styles.metricLabel}>In Date</div>
              <div style={styles.metricValue('#1d4ed8')}>{fmt(assetData.inDate)}</div>
            </div>
            <div style={styles.metricCard('#ef4444')}>
              <div style={styles.metricLabel}>Out Date</div>
              <div style={styles.metricValue(assetData.outDate ? '#b91c1c' : '#94a3b8')}>
                {assetData.outDate ? fmt(assetData.outDate) : 'Not dispatched'}
              </div>
            </div>
          </div>

          {/* Reference Numbers */}
          <div style={styles.sectionLabel}>Reference</div>
          <div style={styles.refSection}>
            <div style={styles.refRow}>
              <span style={styles.refKey}>QC Number</span>
              <span style={styles.refVal}>{assetData.qcNumber}</span>
            </div>
            <div style={styles.refRow}>
              <span style={styles.refKey}>GRN Number</span>
              <span style={styles.refVal}>{assetData.grnNumber}</span>
            </div>
            <div style={{ ...styles.refRow, borderBottom: 'none' }}>
              <span style={styles.refKey}>Unit</span>
              <span style={{ ...styles.refVal, fontFamily: 'DM Sans, sans-serif' }}>
                {assetData.unit}
              </span>
            </div>
          </div>

          {/* Warranty */}
          <div style={styles.sectionLabel}>Warranty</div>
          <div style={styles.warrantyCard(expired, hasWarranty)}>
            <div style={styles.warrantyIcon(expired, hasWarranty)}>
              {!hasWarranty ? '−' : expired ? '✕' : '✓'}
            </div>
            <div style={styles.warrantyTitle(expired, hasWarranty)}>
              {!hasWarranty
                ? 'No Warranty'
                : expired
                ? 'Warranty Expired'
                : 'Under Warranty'}
            </div>

            {hasWarranty && (
              <>
                <div style={styles.warrantyMeta}>
                  Duration: <strong>{assetData.serviceWarrantyMonths} months</strong>
                </div>
                <div style={styles.warrantyMeta}>
                  Expires:{' '}
                  <strong style={{ color: expired ? '#dc2626' : '#16a34a' }}>
                    {fmt(assetData.warrantyExpiryDate)}
                  </strong>
                </div>
                {!expired && daysLeft !== null && (
                  <div style={styles.daysRemaining}>{daysLeft} days remaining</div>
                )}
              </>
            )}
          </div>

          {/* Service History */}
          {hasHistory && (
            <>
              <div style={styles.sectionLabel}>Service History</div>
              <div style={styles.historyCard}>
                {assetData.serviceHistory.map((h, i) => (
                  <div key={i} style={styles.historyItem(i === assetData.serviceHistory.length - 1)}>
                    <div style={styles.historyDot} />
                    <div>
                      <div style={styles.historyDesc}>{h.description}</div>
                      <div style={styles.historyMeta}>
                        {fmt(h.date)} · {h.servicedBy}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Footer */}
          <div style={styles.footer}>
            <div style={styles.footerText}>
              Scanned {new Date().toLocaleString('en-GB')}
            </div>
            <div style={{ ...styles.footerText, marginTop: 4 }}>
              Powered by ProClient360
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AssetView;