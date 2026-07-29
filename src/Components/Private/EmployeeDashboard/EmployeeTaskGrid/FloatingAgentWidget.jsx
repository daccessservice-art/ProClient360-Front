/**
 * FloatingAgentWidget.jsx
 *
 * Floating chat Agent, bottom-right. Two kinds of confirmable AI proposals:
 *  - field_update: change one field (remark/status/level/dates)
 *  - action_log: log new work — creates a real Action doc, same as your
 *    "Submit Work" form (work description, new %, status, notifies assigner)
 * Neither is ever applied without the user clicking Apply.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { getMyFocus, chatWithAgent, applyAgentUpdate, applyAgentActionLog } from "../../../../hooks/useProjectTaskAgent";
import { downloadTaskStatusReport, downloadProjectProgressReport } from "../../../../hooks/useReports";

const getGreetingWord = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
};

const speakText = (text, muted) => {
  if (muted || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1;
  utterance.pitch = 1;
  window.speechSynthesis.speak(utterance);
};

const FIELD_LABELS = {
  remark: 'Remark',
  taskStatus: 'Status',
  taskLevel: 'Completion %',
  startDate: 'Start Date',
  endDate: 'End Date',
};

const SpeechRecognitionAPI =
  typeof window !== "undefined" ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null;

let idCounter = 0;
const nextId = () => `msg-${Date.now()}-${idCounter++}`;

const FloatingAgentWidget = ({ userName }) => {
  const [open, setOpen] = useState(false);
  const [muted, setMuted] = useState(false);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [thinking, setThinking] = useState(false);
  const [listening, setListening] = useState(false);
  const listRef = useRef(null);
  const recognitionRef = useRef(null);
  const greetedRef = useRef(false);
  const aiHistoryRef = useRef([]);

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
    });
  };

  const addMessage = useCallback((sender, text, extra = {}) => {
    setMessages(prev => [...prev, { id: nextId(), sender, text, ...extra }]);
    scrollToBottom();
  }, []);

  useEffect(() => {
    if (greetedRef.current) return;
    greetedRef.current = true;
    const greeting = `${getGreetingWord()}${userName ? `, ${userName}` : ''}! Ask me about your tasks, or tell me about work you did — like "I finished the login page, it's 90% done."`;
    addMessage("agent", greeting);
    speakText(greeting, muted);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel();
      recognitionRef.current?.stop();
    };
  }, []);

  const respondToText = useCallback(async (rawText) => {
    const text = rawText.toLowerCase();
    setThinking(true);

    if (text.includes("project") && (text.includes("export") || text.includes("excel") || text.includes("progress") || text.includes("download"))) {
      await new Promise(r => setTimeout(r, 300));
      addMessage("agent", "Generating your Project Progress report now — it'll download in a moment.");
      speakText("Generating your project progress report now.", muted);
      await downloadProjectProgressReport();
      setThinking(false);
      return;
    }

    if (text.includes("export") || text.includes("excel") || text.includes("download")) {
      await new Promise(r => setTimeout(r, 300));
      addMessage("agent", "Generating your Excel report now — it'll download in a moment.");
      speakText("Generating your Excel report now.", muted);
      await downloadTaskStatusReport({});
      setThinking(false);
      return;
    }

    if (text.trim() === "show my report" || text.trim() === "my report") {
      await new Promise(r => setTimeout(r, 300));
      const res = await getMyFocus();
      if (!res?.success) {
        const msg = "Sorry, I couldn't load your report right now.";
        addMessage("agent", msg);
        speakText(msg, muted);
        setThinking(false);
        return;
      }
      const { summary, recommended } = res;
      let msg = `You have ${summary.totalOpen} open task${summary.totalOpen === 1 ? '' : 's'}. `;
      if (summary.overdueCount > 0) msg += `${summary.overdueCount} overdue. `;
      if (summary.dueTodayCount > 0) msg += `${summary.dueTodayCount} due today. `;
      msg += recommended ? `Focus next on "${recommended.taskName}" — ${recommended.projectName}.` : `You're all caught up.`;
      addMessage("agent", msg);
      speakText(msg, muted);
      setThinking(false);
      return;
    }

    const res = await chatWithAgent(rawText, aiHistoryRef.current);
    setThinking(false);

    if (!res?.success) {
      const errMsg = res?.error || "The AI agent isn't available right now.";
      addMessage("agent", errMsg);
      speakText(errMsg, muted);
      return;
    }

    aiHistoryRef.current = [
      ...aiHistoryRef.current,
      { role: 'user', content: rawText },
      { role: 'assistant', content: res.reply },
    ].slice(-10);

    if (res.type === 'proposal' && res.proposal) {
      addMessage("agent", res.reply, { proposal: res.proposal, proposalStatus: 'pending' });
      speakText(res.reply, muted);
    } else {
      addMessage("agent", res.reply);
      speakText(res.reply, muted);
    }
  }, [addMessage, muted]);

  const handleSend = (textOverride) => {
    const text = (textOverride ?? draft).trim();
    if (!text) return;
    addMessage("user", text);
    setDraft("");
    respondToText(text);
  };

  const handleQuickAction = (command) => handleSend(command);

  const handleMicClick = () => {
    if (!SpeechRecognitionAPI) {
      addMessage("agent", "Voice input isn't supported in this browser — try typing instead, or use Chrome.");
      return;
    }
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    const recognition = new SpeechRecognitionAPI();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognition.onresult = (event) => handleSend(event.results[0][0].transcript);
    recognitionRef.current = recognition;
    recognition.start();
  };

  const handleMuteToggle = () => {
    if (!muted) window.speechSynthesis?.cancel();
    setMuted(prev => !prev);
  };

  const handleApplyProposal = async (msgId, proposal) => {
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, proposalStatus: 'applying' } : m));

    const res = proposal.kind === 'action_log'
      ? await applyAgentActionLog(proposal.taskId, proposal.action, proposal.taskStatus, proposal.taskLevel, proposal.remark)
      : await applyAgentUpdate(proposal.taskId, proposal.field, proposal.newValue);

    if (res?.success) {
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, proposalStatus: 'applied' } : m));
      const confirmMsg = proposal.kind === 'action_log'
        ? `Logged — "${proposal.taskName}" is now ${proposal.taskLevel}% (${proposal.taskStatus}).`
        : `Done — ${FIELD_LABELS[proposal.field]} updated on "${proposal.taskName}".`;
      addMessage("agent", confirmMsg);
      speakText(confirmMsg, muted);
    } else {
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, proposalStatus: 'failed' } : m));
      const errMsg = res?.error || "Sorry, that update failed.";
      addMessage("agent", errMsg);
      speakText(errMsg, muted);
    }
  };

  const handleCancelProposal = (msgId) => {
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, proposalStatus: 'cancelled' } : m));
  };

  return (
    <div className="floating-agent-root">
      <style>{`
        .floating-agent-root {
          --agent-grad: linear-gradient(120deg, #6366F1 0%, #06B6D4 100%);
          position: fixed; bottom: 24px; right: 24px; z-index: 2500;
          display: flex; flex-direction: column; align-items: flex-end; gap: 10px;
        }
        .fa-panel {
          width: 330px; height: 470px; background: #fff; border-radius: 16px;
          box-shadow: 0 16px 40px rgba(30, 41, 59, 0.22); border: 1px solid #E2E8F0;
          overflow: hidden; display: flex; flex-direction: column;
          animation: fa-panel-in 0.25s ease-out;
        }
        @keyframes fa-panel-in { from { opacity: 0; transform: translateY(10px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
        .fa-panel-header { background: var(--agent-grad); color: #fff; padding: 12px 14px; display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
        .fa-panel-header-avatar { width: 28px; height: 28px; border-radius: 50%; background: rgba(255,255,255,0.25); display: flex; align-items: center; justify-content: center; font-size: 15px; }
        .fa-panel-header-title { font-size: 13px; font-weight: 700; line-height: 1.1; }
        .fa-panel-header-status { font-size: 10px; opacity: 0.85; display: flex; align-items: center; gap: 4px; }
        .fa-online-dot { width: 6px; height: 6px; border-radius: 50%; background: #4ADE80; box-shadow: 0 0 0 2px rgba(74, 222, 128, 0.3); }
        .fa-panel-header-actions { margin-left: auto; display: flex; gap: 8px; }
        .fa-icon-btn { background: transparent; border: none; color: #fff; cursor: pointer; font-size: 14px; opacity: 0.9; padding: 2px; }
        .fa-icon-btn:hover { opacity: 1; }
        .fa-messages { flex: 1; overflow-y: auto; padding: 12px; background: #F8FAFC; display: flex; flex-direction: column; gap: 8px; }
        .fa-msg-row { display: flex; gap: 6px; align-items: flex-end; }
        .fa-msg-row.user { justify-content: flex-end; }
        .fa-msg-avatar { width: 22px; height: 22px; border-radius: 50%; background: var(--agent-grad); display: flex; align-items: center; justify-content: center; font-size: 11px; flex-shrink: 0; }
        .fa-bubble-msg { max-width: 230px; padding: 8px 11px; border-radius: 12px; font-size: 12.5px; line-height: 1.4; animation: fa-msg-in 0.2s ease-out; }
        @keyframes fa-msg-in { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        .fa-bubble-msg.agent { background: #fff; color: #1E293B; border: 1px solid #E2E8F0; border-bottom-left-radius: 3px; }
        .fa-bubble-msg.user { background: var(--agent-grad); color: #fff; border-bottom-right-radius: 3px; }
        .fa-typing { display: flex; gap: 3px; padding: 9px 12px; background: #fff; border: 1px solid #E2E8F0; border-radius: 12px; border-bottom-left-radius: 3px; width: fit-content; }
        .fa-typing span { width: 5px; height: 5px; border-radius: 50%; background: #94A3B8; animation: fa-typing-bounce 1s infinite; }
        .fa-typing span:nth-child(2) { animation-delay: 0.15s; }
        .fa-typing span:nth-child(3) { animation-delay: 0.3s; }
        @keyframes fa-typing-bounce { 0%, 60%, 100% { transform: translateY(0); opacity: 0.5; } 30% { transform: translateY(-4px); opacity: 1; } }

        .fa-proposal { margin-left: 28px; max-width: 250px; background: #FFF7ED; border: 1px solid #FDBA74; border-radius: 10px; padding: 10px; font-size: 12px; }
        .fa-proposal.log-kind { background: #ECFDF5; border-color: #6EE7B7; }
        .fa-proposal-title { font-weight: 700; color: #9A3412; margin-bottom: 4px; }
        .fa-proposal.log-kind .fa-proposal-title { color: #065F46; }
        .fa-proposal-diff { color: #431407; margin-bottom: 8px; }
        .fa-proposal.log-kind .fa-proposal-diff { color: #064E3B; }
        .fa-proposal-diff .old { text-decoration: line-through; color: #94A3B8; }
        .fa-proposal-diff .line { display: block; margin-top: 2px; }
        .fa-proposal-btns { display: flex; gap: 6px; }
        .fa-proposal-btn { flex: 1; border: none; border-radius: 6px; padding: 6px 8px; font-size: 11px; font-weight: 700; cursor: pointer; }
        .fa-proposal-btn.apply { background: #16A34A; color: #fff; }
        .fa-proposal-btn.cancel { background: #F1F5F9; color: #475569; }
        .fa-proposal-status { margin-left: 28px; font-size: 11px; color: #64748B; font-style: italic; }

        .fa-chips { display: flex; gap: 6px; padding: 8px 10px 0 10px; flex-wrap: wrap; flex-shrink: 0; background: #F8FAFC; }
        .fa-chip { font-size: 11px; font-weight: 600; padding: 5px 10px; border-radius: 999px; border: 1px solid #C7D2FE; background: #EEF2FF; color: #4338CA; cursor: pointer; white-space: nowrap; }
        .fa-chip:hover { background: #E0E7FF; }
        .fa-input-row { display: flex; align-items: center; gap: 6px; padding: 10px; border-top: 1px solid #E2E8F0; background: #fff; flex-shrink: 0; }
        .fa-text-input { flex: 1; border: 1px solid #E2E8F0; border-radius: 20px; padding: 8px 12px; font-size: 12.5px; outline: none; }
        .fa-text-input:focus { border-color: #A5B4FC; }
        .fa-mic-btn, .fa-send-btn { width: 34px; height: 34px; border-radius: 50%; border: none; display: flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0; font-size: 14px; }
        .fa-mic-btn { background: #F1F5F9; color: #475569; }
        .fa-mic-btn.is-listening { background: #FEE2E2; color: #DC2626; animation: fa-mic-pulse 1s infinite; }
        @keyframes fa-mic-pulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.4); } 50% { box-shadow: 0 0 0 6px rgba(220, 38, 38, 0); } }
        .fa-send-btn { background: var(--agent-grad); color: #fff; }
        .fa-send-btn:disabled { opacity: 0.5; cursor: default; }
        .fa-bubble { position: relative; width: 60px; height: 60px; border-radius: 50%; background: var(--agent-grad); display: flex; align-items: center; justify-content: center; font-size: 27px; cursor: pointer; border: none; box-shadow: 0 8px 24px rgba(99, 102, 241, 0.4); animation: fa-float 3s ease-in-out infinite; }
        @keyframes fa-float { 0%, 100% { transform: translateY(0) rotate(0deg); } 50% { transform: translateY(-6px) rotate(-2deg); } }
        .fa-bubble-ring { position: absolute; inset: -6px; border-radius: 50%; border: 2px solid #06B6D4; opacity: 0; animation: fa-ring-expand 2.4s ease-out infinite; }
        @keyframes fa-ring-expand { 0% { transform: scale(0.9); opacity: 0.5; } 100% { transform: scale(1.45); opacity: 0; } }
        @media (prefers-reduced-motion: reduce) {
          .fa-bubble, .fa-bubble-ring, .fa-panel, .fa-bubble-msg, .fa-typing span, .fa-mic-btn.is-listening { animation: none !important; }
        }
      `}</style>

      {open && (
        <div className="fa-panel">
          <div className="fa-panel-header">
            <div className="fa-panel-header-avatar">🤖</div>
            <div>
              <div className="fa-panel-header-title">Work Agent</div>
              <div className="fa-panel-header-status"><span className="fa-online-dot"></span> Online</div>
            </div>
            <div className="fa-panel-header-actions">
              <button className="fa-icon-btn" onClick={handleMuteToggle} title={muted ? "Unmute" : "Mute"}>{muted ? '🔇' : '🔊'}</button>
              <button className="fa-icon-btn" onClick={() => setOpen(false)} title="Close">✕</button>
            </div>
          </div>

          <div className="fa-messages" ref={listRef}>
            {messages.map(m => (
              <div key={m.id}>
                <div className={`fa-msg-row ${m.sender}`}>
                  {m.sender === 'agent' && <div className="fa-msg-avatar">🤖</div>}
                  <div className={`fa-bubble-msg ${m.sender}`}>{m.text}</div>
                </div>

                {m.proposal && m.proposalStatus === 'pending' && m.proposal.kind === 'field_update' && (
                  <div className="fa-proposal">
                    <div className="fa-proposal-title">Confirm update</div>
                    <div className="fa-proposal-diff">
                      <strong>{m.proposal.taskName}</strong> ({m.proposal.projectName})
                      <span className="line">{FIELD_LABELS[m.proposal.field]}: <span className="old">{String(m.proposal.currentValue)}</span> → <strong>{String(m.proposal.newValue)}</strong></span>
                    </div>
                    <div className="fa-proposal-btns">
                      <button className="fa-proposal-btn apply" onClick={() => handleApplyProposal(m.id, m.proposal)}>✅ Apply</button>
                      <button className="fa-proposal-btn cancel" onClick={() => handleCancelProposal(m.id)}>Cancel</button>
                    </div>
                  </div>
                )}

                {m.proposal && m.proposalStatus === 'pending' && m.proposal.kind === 'action_log' && (
                  <div className="fa-proposal log-kind">
                    <div className="fa-proposal-title">Confirm work log</div>
                    <div className="fa-proposal-diff">
                      <strong>{m.proposal.taskName}</strong> ({m.proposal.projectName})
                      <span className="line">Work: {m.proposal.action}</span>
                      <span className="line">Status: {m.proposal.taskStatus} · Level: <span className="old">{m.proposal.currentTaskLevel}%</span> → <strong>{m.proposal.taskLevel}%</strong></span>
                      {m.proposal.remark && <span className="line">Remark: {m.proposal.remark}</span>}
                    </div>
                    <div className="fa-proposal-btns">
                      <button className="fa-proposal-btn apply" onClick={() => handleApplyProposal(m.id, m.proposal)}>✅ Log it</button>
                      <button className="fa-proposal-btn cancel" onClick={() => handleCancelProposal(m.id)}>Cancel</button>
                    </div>
                  </div>
                )}

                {m.proposal && m.proposalStatus === 'applying' && <div className="fa-proposal-status">Applying...</div>}
                {m.proposal && m.proposalStatus === 'cancelled' && <div className="fa-proposal-status">Cancelled — nothing was changed.</div>}
              </div>
            ))}
            {thinking && (
              <div className="fa-msg-row agent">
                <div className="fa-msg-avatar">🤖</div>
                <div className="fa-typing"><span></span><span></span><span></span></div>
              </div>
            )}
          </div>

          <div className="fa-chips">
            <span className="fa-chip" onClick={() => handleQuickAction('show my report')}>📋 My report</span>
            <span className="fa-chip" onClick={() => handleQuickAction('export to excel')}>📥 Export Excel</span>
            <span className="fa-chip" onClick={() => handleQuickAction('export project progress to excel')}>📊 Project Progress</span>
          </div>

          <div className="fa-input-row">
            <button
              type="button"
              className={`fa-mic-btn ${listening ? 'is-listening' : ''}`}
              onClick={handleMicClick}
              title={SpeechRecognitionAPI ? "Speak" : "Voice input not supported here"}
            >
              🎤
            </button>
            <input
              type="text"
              className="fa-text-input"
              placeholder="Ask, or tell me about work you did..."
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSend(); }}
            />
            <button type="button" className="fa-send-btn" onClick={() => handleSend()} disabled={!draft.trim()}>➤</button>
          </div>
        </div>
      )}

      <button type="button" className="fa-bubble" onClick={() => setOpen(prev => !prev)} title="Your Work Agent">
        <span className="fa-bubble-ring"></span>
        🤖
      </button>
    </div>
  );
};

export default FloatingAgentWidget;