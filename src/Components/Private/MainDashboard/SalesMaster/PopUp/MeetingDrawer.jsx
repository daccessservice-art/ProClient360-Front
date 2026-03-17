import { useState, useEffect } from "react";
import axios from "axios";
import toast from "react-hot-toast";

const API = process.env.REACT_APP_API_URL;

const DURATIONS = [
  { label: "15 min", value: "15" },
  { label: "30 min", value: "30" },
  { label: "45 min", value: "45" },
  { label: "1 hr",   value: "60" },
  { label: "1.5 hr", value: "90" },
  { label: "2 hr",   value: "120" },
];

const ZoomIcon = () => (
  <svg width="22" height="22" viewBox="0 0 80 80" fill="none">
    <rect width="80" height="80" rx="16" fill="#2D8CFF"/>
    <path d="M12 28C12 24.68 14.68 22 18 22H48C51.32 22 54 24.68 54 28V52C54 55.32 51.32 58 48 58H18C14.68 58 12 55.32 12 52V28Z" fill="white"/>
    <path d="M57 33L68 24V56L57 47V33Z" fill="white"/>
  </svg>
);

const TeamsIcon = () => (
  <svg width="22" height="22" viewBox="0 0 80 80" fill="none">
    <rect width="80" height="80" rx="16" fill="#6264A7"/>
    <circle cx="50" cy="22" r="10" fill="white"/>
    <rect x="12" y="32" width="40" height="36" rx="9" fill="white"/>
    <circle cx="63" cy="36" r="8" fill="#C5C5E8"/>
    <rect x="56" y="46" width="18" height="18" rx="5" fill="#C5C5E8"/>
  </svg>
);

const OutlookIcon = () => (
  <svg width="22" height="22" viewBox="0 0 80 80" fill="none">
    <rect width="80" height="80" rx="16" fill="#0078D4"/>
    <rect x="8" y="18" width="38" height="44" rx="7" fill="white" opacity="0.95"/>
    <rect x="16" y="27" width="22" height="3.5" rx="1.75" fill="#0078D4"/>
    <rect x="16" y="34" width="22" height="3.5" rx="1.75" fill="#0078D4" opacity="0.55"/>
    <rect x="16" y="41" width="14" height="3.5" rx="1.75" fill="#0078D4" opacity="0.35"/>
    <path d="M42 30H70C71.1 30 72 30.9 72 32V60C72 61.1 71.1 62 70 62H42C40.9 62 40 61.1 40 60V32C40 30.9 40.9 30 42 30Z" fill="#1A86D8"/>
    <path d="M40 32L56 47L72 32" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
  </svg>
);

const CheckIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
    stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

const QUICK = [
  { href: "https://zoom.us/join",                label: "Join Zoom",    Icon: ZoomIcon,    histKey: "zoom"    },
  { href: "https://teams.microsoft.com/",        label: "Join Teams",   Icon: TeamsIcon,   histKey: "teams"   },
  { href: "https://outlook.office365.com/mail/", label: "Outlook Mail", Icon: OutlookIcon, histKey: "outlook" },
];

const DOT_COLOR = {
  zoom:    "#2D8CFF",
  teams:   "#6264A7",
  outlook: "#0078D4",
};

/*
  Every meeting activity is saved to previousActions[].rem in this format:
    [MeetingLog|zoom] Create Zoom Meeting – Title on 2026-03-13 at 10:00 (30 min)
    [MeetingLog|outlook] Opened Outlook Mail

  On mount we scan lead.previousActions, decode these entries,
  and restore the full history — so it survives close/reopen.
*/
const MEETING_PREFIX = "[MeetingLog|";

const encodeRem = (platformKey, label) =>
  `${MEETING_PREFIX}${platformKey}] ${label}`;

const decodeRem = (rem) => {
  if (!rem || !rem.startsWith(MEETING_PREFIX)) return null;
  const close = rem.indexOf("]");
  if (close === -1) return null;
  return {
    platformKey: rem.slice(MEETING_PREFIX.length, close),
    label:       rem.slice(close + 2),
  };
};

/* ═══════════════════════════════════════════════════════════ */
const MeetingDrawer = ({ lead, onClose }) => {
  const [platform,       setPlatform]       = useState("zoom");
  const [loading,        setLoading]        = useState(false);
  const [visible,        setVisible]        = useState(false);
  const [meetingHistory, setMeetingHistory] = useState([]);

  const now     = new Date();
  const pad     = n => String(n).padStart(2, "0");
  const mins    = Math.ceil(now.getMinutes() / 15) * 15;
  const defTime = mins >= 60
    ? `${pad(now.getHours() + 1)}:00`
    : `${pad(now.getHours())}:${pad(mins)}`;
  const defDate = now.toISOString().split("T")[0];

  const [form, setForm] = useState({
    title:    lead
      ? `Meeting – ${lead.SENDER_COMPANY || lead.SENDER_NAME || "Client"}`
      : "Client Meeting",
    date:     defDate,
    time:     defTime,
    duration: "30",
  });

  /*
    On mount:
    1. Animate card in
    2. Read lead.previousActions and restore meeting history.
       Because SalesMasterGrid calls refetch() on close, the lead
       passed here always has the latest previousActions from the DB.
  */
  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));

    if (Array.isArray(lead?.previousActions) && lead.previousActions.length > 0) {
      const parsed = lead.previousActions
        .map(a => {
          const decoded = decodeRem(a.rem);
          if (!decoded) return null;
          return {
            label:       decoded.label,
            platformKey: decoded.platformKey,
            time:        a.createdAt || new Date().toISOString(),
          };
        })
        .filter(Boolean)
        .sort((a, b) => new Date(a.time) - new Date(b.time));

      setMeetingHistory(parsed);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handler = e => { if (e.key === "Escape") handleClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 300);
    // onClose in SalesMasterGrid is handleMeetingClose which calls
    // refetch() + fetchAllLeadsForFunnel() — that's what keeps history
    // fresh for the next open
  };

  const theme = {
    zoom:  { primary: "#2D8CFF", light: "#EBF5FF" },
    teams: { primary: "#6264A7", light: "#E8E8F4" },
  };
  const t = theme[platform];

  /*
    saveActivity
    1. Immediately adds entry to local meetingHistory (visible at once)
    2. Calls PUT /api/leads/submit-enquiry/:id with the encoded rem
       so it is stored in previousActions and survives page refresh
    3. Skipped for Won / Lost leads
  */
  const saveActivity = async (platformKey, label) => {
    const entry = { label, platformKey, time: new Date().toISOString() };
    setMeetingHistory(prev => [...prev, entry]);

    const isFinalized = lead?.STATUS === "Won" || lead?.STATUS === "Lost";
    if (!lead?._id || isFinalized) return;

    try {
      await axios.put(
        `${API}/api/leads/submit-enquiry/${lead._id}`,
        {
          status:           lead.STATUS          || "Pending",
          step:             lead.step            || "1. Call Not Connect/ Callback",
          complated:        lead.complated       || 0,
          nextFollowUpDate: lead.nextFollowUpDate || null,
          quotation:        lead.quotation       || 0,
          callLeads:        lead.callLeads       || "Warm Leads",
          rem:              encodeRem(platformKey, label),
        },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      );
    } catch (err) {
      console.warn("Meeting activity backend save failed:", err?.message);
    }
  };

  const handleQuickClick = (href, label, histKey) => {
    window.open(href, "_blank", "noopener,noreferrer");
    saveActivity(histKey, `Opened ${label}`);
    toast.success(`${label} opened · Activity saved`);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) { toast.error("Enter a meeting title"); return; }
    setLoading(true);

    const detail = `${form.title} on ${form.date} at ${form.time} (${form.duration} min)`;

    if (platform === "zoom") {
      window.open("https://zoom.us/signin#/login", "_blank", "noopener,noreferrer");
      await saveActivity("zoom", `Create Zoom Meeting – ${detail}`);
      toast.success("Zoom sign-in opened · Activity saved");
    } else {
      window.open("https://teams.microsoft.com/", "_blank", "noopener,noreferrer");
      await saveActivity("teams", `Create Teams Meeting – ${detail}`);
      toast.success("Microsoft Teams opened · Activity saved");
    }

    setLoading(false);
  };

  return (
    <div style={S.wrap}>

      <div onClick={handleClose} style={{ ...S.backdrop, opacity: visible ? 1 : 0 }} />

      <div style={{
        ...S.card,
        transform: visible ? "scale(1) translateY(0)" : "scale(0.92) translateY(24px)",
        opacity:   visible ? 1 : 0,
      }}>

        <button onClick={handleClose} style={S.closeBtn}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.5"
            strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6"  x2="6"  y2="18"/>
            <line x1="6"  y1="6"  x2="18" y2="18"/>
          </svg>
        </button>

        {/* Header */}
        <div style={{ ...S.header, background: `linear-gradient(135deg, ${t.primary}, ${t.primary}dd)` }}>
          <div style={{ marginBottom: 16, paddingRight: 34 }}>
            <div style={S.headerTitle}>Schedule Meeting</div>
            {lead && (
              <div style={S.headerSub}>
                {lead.SENDER_COMPANY || lead.SENDER_NAME}
                {lead.SENDER_MOBILE && <> · {lead.SENDER_MOBILE}</>}
              </div>
            )}
          </div>
          <div style={S.toggleWrap}>
            {[
              { key: "zoom",  label: "Zoom"           },
              { key: "teams", label: "Microsoft Teams" },
            ].map(p => (
              <button key={p.key} type="button" onClick={() => setPlatform(p.key)} style={{
                ...S.toggleBtn,
                background: platform === p.key ? "#fff" : "transparent",
                color:      platform === p.key ? t.primary : "rgba(255,255,255,0.85)",
                fontWeight: platform === p.key ? 700 : 600,
              }}>{p.label}</button>
            ))}
          </div>
        </div>

        {/* Quick Actions — GREEN */}
        <div style={S.quickRow}>
          {QUICK.map(({ href, label, Icon, histKey }) => (
            <button
              key={href} type="button"
              onClick={() => handleQuickClick(href, label, histKey)}
              style={S.quickBtn}
              onMouseEnter={e => {
                e.currentTarget.style.background  = "#dcfce7";
                e.currentTarget.style.borderColor = "#16a34a";
                e.currentTarget.style.boxShadow   = "0 4px 14px rgba(34,197,94,0.28)";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background  = "#f0fdf4";
                e.currentTarget.style.borderColor = "#22c55e";
                e.currentTarget.style.boxShadow   = "0 2px 8px rgba(34,197,94,0.12)";
              }}
            >
              <Icon />
              <span style={S.quickLabel}>{label}</span>
              <span style={S.liveDot} />
            </button>
          ))}
        </div>

        {/* Body */}
        <div style={S.body}>

          <form onSubmit={handleSubmit}>
            <div style={S.fGroup}>
              <label style={S.label}>Title</label>
              <input value={form.title} required
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Meeting Topic" style={S.input}
              />
            </div>

            <div style={S.fRow}>
              <div style={S.fGroup}>
                <label style={S.label}>Date</label>
                <input type="date" value={form.date} min={defDate} required
                  onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                  style={S.input}
                />
              </div>
              <div style={S.fGroup}>
                <label style={S.label}>Time</label>
                <input type="time" value={form.time} required
                  onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
                  style={S.input}
                />
              </div>
            </div>

            <div style={S.fGroup}>
              <label style={S.label}>Duration</label>
              <div style={S.durGrid}>
                {DURATIONS.map(d => (
                  <button key={d.value} type="button"
                    onClick={() => setForm(f => ({ ...f, duration: d.value }))}
                    style={{
                      ...S.durBtn,
                      borderColor: form.duration === d.value ? t.primary : "#E2E8F0",
                      color:       form.duration === d.value ? t.primary : "#64748B",
                      background:  form.duration === d.value ? t.light   : "#fff",
                      fontWeight:  form.duration === d.value ? 700       : 500,
                    }}
                  >{d.label}</button>
                ))}
              </div>
            </div>

            <button type="submit" disabled={loading} style={{
              ...S.primaryBtn,
              background: loading ? "#94a3b8" : t.primary,
              marginTop: 10, opacity: loading ? 0.8 : 1,
            }}>
              {loading
                ? "Opening..."
                : platform === "zoom"
                  ? "🎥  Create Zoom Meeting →"
                  : "💬  Create Teams Meeting →"}
            </button>
          </form>

          {/* Meeting Activity History */}
          {meetingHistory.length > 0 && (
            <div style={S.historyWrap}>
              <div style={S.historyHeading}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                  stroke="#64748B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
                &nbsp;Meeting Activity History
                <span style={S.historyCount}>{meetingHistory.length}</span>
              </div>

              <div style={S.historyList}>
                {[...meetingHistory].reverse().map((h, i) => (
                  <div key={i} style={S.historyItem}>
                    <div style={{ ...S.historyDot, background: DOT_COLOR[h.platformKey] || "#64748B" }}>
                      <CheckIcon />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={S.historyLabel}>{h.label}</div>
                      <div style={S.historyTime}>
                        {new Date(h.time).toLocaleString("en-IN", {
                          day: "2-digit", month: "short", year: "numeric",
                          hour: "2-digit", minute: "2-digit",
                        })}
                      </div>
                    </div>
                    <span style={{
                      ...S.platformBadge,
                      background: (DOT_COLOR[h.platformKey] || "#64748B") + "18",
                      color:      DOT_COLOR[h.platformKey]  || "#64748B",
                      border:     `1px solid ${(DOT_COLOR[h.platformKey] || "#64748B")}40`,
                    }}>
                      {h.platformKey === "zoom" ? "Zoom"
                        : h.platformKey === "teams" ? "Teams"
                        : "Outlook"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

const S = {
  wrap: {
    position: "fixed", inset: 0, zIndex: 1050,
    display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
  },
  backdrop: {
    position: "absolute", inset: 0,
    background: "rgba(15,23,42,0.6)", backdropFilter: "blur(8px)",
    transition: "opacity 0.3s ease", zIndex: 0,
  },
  card: {
    position: "relative", zIndex: 1,
    width: "100%", maxWidth: 488, maxHeight: "92vh",
    background: "#fff", borderRadius: 24, overflow: "hidden",
    boxShadow: "0 20px 50px rgba(0,0,0,0.2), 0 8px 20px rgba(0,0,0,0.10)",
    display: "flex", flexDirection: "column",
    transition: "all 0.28s cubic-bezier(0.175,0.885,0.32,1.1)",
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  },
  closeBtn: {
    position: "absolute", top: 16, right: 16, zIndex: 10,
    width: 32, height: 32, borderRadius: "50%",
    border: "none", background: "rgba(255,255,255,0.22)",
    color: "#fff", cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
    backdropFilter: "blur(4px)", transition: "background 0.2s",
  },
  header:      { padding: "28px 24px 24px", color: "#fff" },
  headerTitle: { fontSize: 22, fontWeight: 700, letterSpacing: "-0.03em", marginBottom: 4 },
  headerSub:   { fontSize: 14, opacity: 0.9, fontWeight: 500 },
  toggleWrap: {
    display: "grid", gridTemplateColumns: "1fr 1fr",
    background: "rgba(0,0,0,0.15)", borderRadius: 12, padding: 4, gap: 4,
  },
  toggleBtn: {
    padding: 10, borderRadius: 8, border: "none",
    fontSize: 14, transition: "all 0.2s", cursor: "pointer",
  },
  quickRow: {
    display: "grid", gridTemplateColumns: "repeat(3, 1fr)",
    gap: 10, padding: "18px 20px",
    borderBottom: "1px solid #F1F5F9", background: "#FAFBFC",
  },
  quickBtn: {
    position: "relative",
    display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center",
    gap: 7, padding: "12px 6px",
    background: "#f0fdf4", border: "1.5px solid #22c55e",
    borderRadius: 14, cursor: "pointer", transition: "all 0.18s",
    boxShadow: "0 2px 8px rgba(34,197,94,0.12)",
  },
  quickLabel: { fontSize: 11, fontWeight: 700, color: "#15803d", letterSpacing: "0.01em" },
  liveDot: {
    position: "absolute", top: 7, right: 7,
    width: 7, height: 7, borderRadius: "50%",
    background: "#22c55e", boxShadow: "0 0 0 2px #dcfce7",
  },
  body:   { flex: 1, padding: "20px 24px 24px", overflowY: "auto" },
  fGroup: { marginBottom: 14 },
  fRow:   { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 },
  label: {
    display: "block", fontSize: 11, fontWeight: 700,
    color: "#64748B", textTransform: "uppercase",
    letterSpacing: "0.06em", marginBottom: 6,
  },
  input: {
    width: "100%", padding: "11px 13px",
    border: "1.5px solid #E2E8F0", borderRadius: 10,
    fontSize: 14, color: "#1E293B", background: "#F8FAFC",
    outline: "none", transition: "border-color 0.2s",
    boxSizing: "border-box", fontFamily: "inherit",
  },
  durGrid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 },
  durBtn: {
    padding: 10, borderRadius: 8, border: "1.5px solid",
    background: "#fff", fontSize: 13, cursor: "pointer", transition: "all 0.15s",
  },
  primaryBtn: {
    width: "100%", padding: 14, border: "none", borderRadius: 12,
    color: "#fff", fontSize: 15, fontWeight: 700,
    cursor: "pointer", transition: "all 0.2s", letterSpacing: "0.01em",
  },
  historyWrap: {
    marginTop: 22, border: "1px solid #E2E8F0",
    borderRadius: 14, overflow: "hidden",
  },
  historyHeading: {
    display: "flex", alignItems: "center", gap: 6,
    fontSize: 11, fontWeight: 700, color: "#64748B",
    textTransform: "uppercase", letterSpacing: "0.06em",
    padding: "10px 14px", background: "#F8FAFC",
    borderBottom: "1px solid #E2E8F0",
  },
  historyCount: {
    marginLeft: "auto", background: "#E2E8F0", color: "#475569",
    fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20,
  },
  historyList: { display: "flex", flexDirection: "column" },
  historyItem: {
    display: "flex", alignItems: "center", gap: 12,
    padding: "10px 14px", borderBottom: "1px solid #F1F5F9", background: "#fff",
  },
  historyDot: {
    width: 24, height: 24, borderRadius: "50%", flexShrink: 0,
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  historyLabel: {
    fontSize: 12, fontWeight: 600, color: "#0F172A", lineHeight: 1.4,
    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
  },
  historyTime: { fontSize: 11, color: "#94A3B8", marginTop: 2 },
  platformBadge: {
    fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 20,
    flexShrink: 0, letterSpacing: "0.04em", textTransform: "uppercase",
  },
};

export default MeetingDrawer;