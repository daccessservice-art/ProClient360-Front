/**
 * ProjectTaskAgentSuggestionHint.jsx
 *
 * A visually distinct "agent" card — deliberately doesn't look like the
 * rest of the Bootstrap form around it, so it reads as "a system is
 * actively thinking about this," not just another dropdown hint.
 *
 * Usage (tester picker):
 *   <ProjectTaskAgentSuggestionHint
 *     mode="tester"
 *     onApply={(s) => setPickedTester({ value: s.employeeId, label: s.name })}
 *   />
 *
 * Usage (employee assignment):
 *   <ProjectTaskAgentSuggestionHint
 *     mode="assignee"
 *     excludeIds={selectedEmployees.map(e => e.value)}
 *     onApply={(s) => setSelectedEmployees(prev => [...prev, { value: s.employeeId, label: s.name }])}
 *   />
 */

import { useState, useEffect } from "react";
import { suggestAssignees, suggestTester } from "../../../../../hooks/useProjectTaskAgent";

const ProjectTaskAgentSuggestionHint = ({ mode = "assignee", excludeIds = [], onApply }) => {
  const [suggestion, setSuggestion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [applied, setApplied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setApplied(false);
    const fetchSuggestion = async () => {
      setLoading(true);
      const res = mode === "tester"
        ? await suggestTester()
        : await suggestAssignees(excludeIds);
      if (!cancelled) {
        setSuggestion(res?.success ? res.recommended : null);
        setLoading(false);
      }
    };
    fetchSuggestion();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, JSON.stringify(excludeIds)]);

  const handleApply = () => {
    if (!suggestion) return;
    onApply(suggestion);
    setApplied(true);
  };

  const loadCount = mode === "tester" ? suggestion?.currentTestingQueue : suggestion?.currentOpenTasks;
  const loadLabel = mode === "tester"
    ? `${loadCount} case${loadCount === 1 ? '' : 's'} in review`
    : `${loadCount} open task${loadCount === 1 ? '' : 's'}`;

  const initial = suggestion?.name?.trim()?.[0]?.toUpperCase() || '?';

  return (
    <div className="agent-hint-root">
      <style>{`
        .agent-hint-root {
          --agent-grad: linear-gradient(120deg, #6366F1 0%, #06B6D4 100%);
          margin-top: 8px;
        }
        .agent-card {
          position: relative;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 12px;
          border-radius: 10px;
          background: #F8FAFC;
          border: 1px solid #E2E8F0;
          overflow: hidden;
          animation: agent-fade-in 0.35s ease-out;
        }
        .agent-card::before {
          content: "";
          position: absolute;
          inset: 0;
          padding: 1.5px;
          border-radius: 10px;
          background: var(--agent-grad);
          -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          opacity: 0.9;
        }
        .agent-card.is-thinking::before {
          animation: agent-scan 1.8s ease-in-out infinite;
        }
        @keyframes agent-scan {
          0%, 100% { opacity: 0.35; }
          50% { opacity: 0.9; }
        }
        @keyframes agent-fade-in {
          from { opacity: 0; transform: translateY(-2px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .agent-avatar {
          flex-shrink: 0;
          width: 30px;
          height: 30px;
          border-radius: 50%;
          background: var(--agent-grad);
          color: #fff;
          font-size: 12px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        }
        .agent-avatar .pulse-dot {
          position: absolute;
          bottom: -1px;
          right: -1px;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #22C55E;
          border: 2px solid #F8FAFC;
        }
        .agent-eyebrow {
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          background: var(--agent-grad);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }
        .agent-body {
          font-size: 13px;
          color: #1E293B;
          line-height: 1.3;
        }
        .agent-load-label {
          font-size: 11px;
          color: #64748B;
        }
        .agent-apply-btn {
          border: none;
          background: var(--agent-grad);
          color: #fff;
          font-size: 12px;
          font-weight: 600;
          padding: 5px 12px;
          border-radius: 6px;
          margin-left: auto;
          flex-shrink: 0;
          transition: opacity 0.15s, transform 0.1s;
        }
        .agent-apply-btn:hover { opacity: 0.9; }
        .agent-apply-btn:active { transform: scale(0.97); }
        .agent-apply-btn:disabled {
          background: #CBD5E1;
          cursor: default;
        }
        .agent-skeleton {
          height: 14px;
          border-radius: 4px;
          background: linear-gradient(90deg, #E2E8F0 0%, #F1F5F9 50%, #E2E8F0 100%);
          background-size: 200% 100%;
          animation: agent-shimmer 1.3s ease-in-out infinite;
        }
        @keyframes agent-shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .agent-card, .agent-card.is-thinking::before, .agent-skeleton {
            animation: none !important;
          }
        }
      `}</style>

      {loading ? (
        <div className="agent-card is-thinking">
          <div className="agent-avatar">🤖</div>
          <div style={{ flex: 1 }}>
            <div className="agent-eyebrow">Agent</div>
            <div className="agent-skeleton" style={{ width: '70%', marginTop: 4 }}></div>
          </div>
        </div>
      ) : !suggestion ? null : (
        <div className="agent-card">
          <div className="agent-avatar">
            {initial}
            <span className="pulse-dot"></span>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="agent-eyebrow">Agent suggestion</div>
            <div className="agent-body">
              <strong>{suggestion.name}</strong>{' '}
              <span className="agent-load-label">— {loadLabel}, least busy right now</span>
            </div>
          </div>
          <button
            type="button"
            className="agent-apply-btn"
            onClick={handleApply}
            disabled={applied}
          >
            {applied ? 'Applied ✓' : 'Use this'}
          </button>
        </div>
      )}
    </div>
  );
};

export default ProjectTaskAgentSuggestionHint;