/**
 * MyFocusAgentPanel.jsx
 *
 * Page-level Agent panel for the "My Projects" grid (EmployeeTaskGrid.jsx).
 * Tells the logged-in employee, in one glance: how many of their tasks are
 * overdue/due today, and which single task to focus on next.
 *
 * Usage:
 *   <MyFocusAgentPanel />
 *
 * Place it right under the title/search row, above the table.
 */

import { useState, useEffect } from "react";
import { getMyFocus } from "../../../../hooks/useProjectTaskAgent";

const MyFocusAgentPanel = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const res = await getMyFocus();
      if (!cancelled && res?.success) {
        setData(res);
      }
      if (!cancelled) setLoading(false);
    };
    load();
    return () => { cancelled = true; };
  }, []);

  if (dismissed) return null;
  if (!loading && (!data || data.summary?.totalOpen === 0)) return null;

  const { summary, recommended } = data || {};

  return (
    <div className="agent-panel-root">
      <style>{`
        .agent-panel-root {
          --agent-grad: linear-gradient(120deg, #6366F1 0%, #06B6D4 100%);
          margin: 0 4px 14px 4px;
        }
        .agent-panel {
          position: relative;
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 14px 18px;
          border-radius: 12px;
          background: linear-gradient(135deg, #EEF2FF 0%, #ECFEFF 100%);
          border: 1px solid #C7D2FE;
          overflow: hidden;
          animation: agent-panel-fade-in 0.4s ease-out;
        }
        @keyframes agent-panel-fade-in {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .agent-panel-avatar {
          flex-shrink: 0;
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: var(--agent-grad);
          color: #fff;
          font-size: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        }
        .agent-panel-avatar .pulse-dot {
          position: absolute;
          bottom: 0px;
          right: 0px;
          width: 11px;
          height: 11px;
          border-radius: 50%;
          background: #22C55E;
          border: 2.5px solid #EEF2FF;
          animation: agent-pulse 1.6s ease-in-out infinite;
        }
        @keyframes agent-pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.25); opacity: 0.7; }
        }
        .agent-panel-eyebrow {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.09em;
          text-transform: uppercase;
          background: var(--agent-grad);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }
        .agent-panel-body {
          font-size: 14.5px;
          color: #1E293B;
          line-height: 1.4;
          margin-top: 2px;
        }
        .agent-panel-stats {
          display: flex;
          gap: 10px;
          flex-shrink: 0;
        }
        .agent-stat {
          text-align: center;
          padding: 6px 14px;
          border-radius: 8px;
          background: #ffffffaa;
          min-width: 64px;
        }
        .agent-stat-num {
          font-size: 18px;
          font-weight: 700;
          color: #1E293B;
          line-height: 1;
        }
        .agent-stat-label {
          font-size: 10px;
          color: #64748B;
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }
        .agent-stat.is-overdue .agent-stat-num { color: #DC2626; }
        .agent-stat.is-today .agent-stat-num { color: #0284C7; }
        .agent-panel-close {
          border: none;
          background: transparent;
          color: #94A3B8;
          font-size: 16px;
          flex-shrink: 0;
          cursor: pointer;
          padding: 4px 8px;
        }
        .agent-panel-close:hover { color: #475569; }
        .agent-panel-skeleton {
          height: 16px;
          width: 60%;
          border-radius: 4px;
          background: linear-gradient(90deg, #E0E7FF 0%, #F0F9FF 50%, #E0E7FF 100%);
          background-size: 200% 100%;
          animation: agent-shimmer 1.3s ease-in-out infinite;
        }
        @keyframes agent-shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @media (max-width: 768px) {
          .agent-panel { flex-wrap: wrap; }
          .agent-panel-stats { width: 100%; justify-content: flex-start; }
        }
        @media (prefers-reduced-motion: reduce) {
          .agent-panel, .agent-panel-avatar .pulse-dot, .agent-panel-skeleton {
            animation: none !important;
          }
        }
      `}</style>

      <div className="agent-panel">
        <div className="agent-panel-avatar">
          🤖
          <span className="pulse-dot"></span>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="agent-panel-eyebrow">Your work agent</div>
          {loading ? (
            <div className="agent-panel-skeleton" style={{ marginTop: 6 }}></div>
          ) : recommended ? (
            <div className="agent-panel-body">
              Focus on <strong>{recommended.taskName}</strong> — {recommended.projectName}
              {recommended.customerName && <span className="text-muted"> ({recommended.customerName})</span>}
              {recommended.daysOverdue > 0 ? (
                <span style={{ color: '#DC2626', fontWeight: 600 }}>
                  {' '}({recommended.daysOverdue} day{recommended.daysOverdue !== 1 ? 's' : ''} overdue)
                </span>
              ) : recommended.daysOverdue === 0 ? (
                <span style={{ color: '#0284C7', fontWeight: 600 }}> (due today)</span>
              ) : (
                <span className="text-muted"> ({recommended.priority} priority)</span>
              )}
            </div>
          ) : (
            <div className="agent-panel-body">Nothing urgent right now — you're all caught up.</div>
          )}
        </div>

        {!loading && summary && (
          <div className="agent-panel-stats">
            <div className={`agent-stat ${summary.overdueCount > 0 ? 'is-overdue' : ''}`}>
              <div className="agent-stat-num">{summary.overdueCount}</div>
              <div className="agent-stat-label">Overdue</div>
            </div>
            <div className={`agent-stat ${summary.dueTodayCount > 0 ? 'is-today' : ''}`}>
              <div className="agent-stat-num">{summary.dueTodayCount}</div>
              <div className="agent-stat-label">Due Today</div>
            </div>
            <div className="agent-stat">
              <div className="agent-stat-num">{summary.totalOpen}</div>
              <div className="agent-stat-label">Open</div>
            </div>
          </div>
        )}

        <button
          type="button"
          className="agent-panel-close"
          onClick={() => setDismissed(true)}
          title="Dismiss"
        >
          ✕
        </button>
      </div>
    </div>
  );
};

export default MyFocusAgentPanel;