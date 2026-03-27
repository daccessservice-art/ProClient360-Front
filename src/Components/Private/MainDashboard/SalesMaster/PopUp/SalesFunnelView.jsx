import React, { useMemo, useState } from "react";

// ── "Initial" stage REMOVED — leads with no step now map to first real stage ──
const FUNNEL_STAGES = [
  { key: "Call Not Connect/ Callback", label: "Call Not Connect",          color: "#818cf8" },
  { key: "Requirement Understanding",  label: "Requirement Understanding", color: "#3b82f6" },
  { key: "Site Visit",                 label: "Site Visit",                color: "#0ea5e9" },
  { key: "Online Demo",                label: "Online Demo",               color: "#10b981" },
  { key: "Proof of Concept (POC)",     label: "Proof of Concept",          color: "#f59e0b" },
  { key: "Documentation & Planning",   label: "Documentation & Planning",  color: "#f97316" },
  { key: "Quotation Submission",       label: "Quotation Submission",      color: "#ef4444" },
];

const CLOSING_STAGES = [
  { key: "Quotation Discussion", label: "Quotation Discussion", color: "#e11d48", icon: "fa-comments-dollar" },
  { key: "Follow-Up Call",       label: "Follow-Up Call",       color: "#9333ea", icon: "fa-phone-volume"   },
  { key: "Negotiation Call",     label: "Negotiation Call",     color: "#7c3aed", icon: "fa-handshake"      },
  { key: "Negotiation Meetings", label: "Negotiation Meetings", color: "#6d28d9", icon: "fa-people-arrows"  },
  { key: "Deal Status",          label: "Deal Status",          color: "#16a34a", icon: "fa-circle-check"   },
  { key: "Not Feasible",         label: "Not Feasible",         color: "#475569", icon: "fa-ban"            },
];

const ALL_STAGES = [...FUNNEL_STAGES, ...CLOSING_STAGES];

// ── Leads with no step (null / undefined) now fall to first real stage ──
const FIRST_REAL_STAGE_KEY = "Call Not Connect/ Callback";

const STEP_TO_KEY = {
  "1. Call Not Connect/ Callback" : "Call Not Connect/ Callback",
  "2. Requirement Understanding"  : "Requirement Understanding",
  "3. Site Visit"                 : "Site Visit",
  "4. Online Demo"                : "Online Demo",
  "5. Proof of Concept (POC)"     : "Proof of Concept (POC)",
  "6. Documentation & Planning"   : "Documentation & Planning",
  "7. Quotation Submission"       : "Quotation Submission",
  "8. Quotation Discussion"       : "Quotation Discussion",
  "9. Follow-Up Call"             : "Follow-Up Call",
  "10. Negotiation Call"          : "Negotiation Call",
  "11. Negotiation Meetings"      : "Negotiation Meetings",
  "12. Deal Status"               : "Deal Status",
  "13. Won"                       : "Deal Status",
  "14. Lost"                      : "Deal Status",
  "15. Not Feasible"              : "Not Feasible",
};

const STATUS_PILL = {
  Won:     { bg:"#dcfce7", text:"#15803d" },
  Lost:    { bg:"#fee2e2", text:"#b91c1c" },
  Ongoing: { bg:"#dbeafe", text:"#1d4ed8" },
  Pending: { bg:"#fef9c3", text:"#854d0e" },
};

/* ── Format helpers ── */
const fmtDate = (d) => {
  if (!d) return null;
  const dt = new Date(d);
  return isNaN(dt) ? null : dt.toLocaleDateString("en-GB");
};

const fmtCurrency = (n) => {
  if (!n || n <= 0) return null;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
};

const fmtCurrencyCompact = (n) => {
  if (!n || n <= 0) return null;
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`;
  if (n >= 100000)   return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000)     return `₹${(n / 1000).toFixed(0)}K`;
  return `₹${n}`;
};

const getFollowUp = (dateStr, status) => {
  if (!dateStr || status==="Won" || status==="Lost") return null;
  const d = new Date(dateStr);
  if (isNaN(d)) return null;
  const now = new Date();
  const s = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const e = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  if (d >= s && d <= e) return "today";
  if (d < s) return "overdue";
  return null;
};

/* ── Lead Card ── */
const LeadCard = ({ lead, onView, onUpdate, onAssign, onDelete, canUpdate, canAssign, canDelete }) => {
  const fu = getFollowUp(lead.nextFollowUpDate, lead.STATUS);
  const isToday=fu==="today", isOverdue=fu==="overdue";
  const pill = STATUS_PILL[lead.STATUS]||{bg:"#f1f5f9",text:"#475569"};
  const fin  = lead.STATUS==="Won"||lead.STATUS==="Lost";
  return (
    <div style={{
      background:isToday?"rgba(255,50,50,0.04)":isOverdue?"rgba(127,29,29,0.04)":"#fff",
      border:`1px solid ${isToday?"#fca5a5":isOverdue?"#b91c1c":"#e2e8f0"}`,
      borderLeft:`3px solid ${isToday?"#ef4444":isOverdue?"#7f1d1d":"#cbd5e1"}`,
      borderRadius:8, padding:"11px 12px",
      boxShadow:"0 1px 3px rgba(0,0,0,0.07)",
      animation:isToday?"blinkCardR 1.2s infinite":isOverdue?"blinkCardD 1.4s infinite":"none",
      fontSize:12.5,
    }}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:4,marginBottom:5}}>
        <span style={{fontWeight:700,color:"#1e293b",fontSize:13,lineHeight:1.3,flex:1}}>{lead.SENDER_COMPANY||"—"}</span>
        <span style={{fontSize:10,fontWeight:700,borderRadius:4,padding:"2px 7px",background:pill.bg,color:pill.text,whiteSpace:"nowrap"}}>{lead.STATUS}</span>
      </div>
      {isToday&&<div style={{marginBottom:4}}><span style={{fontSize:9.5,background:"#ef4444",color:"#fff",borderRadius:4,padding:"2px 6px",fontWeight:700}}>🔔 TODAY FOLLOW-UP</span></div>}
      {isOverdue&&<div style={{marginBottom:4}}><span style={{fontSize:9.5,background:"#7f1d1d",color:"#fff",borderRadius:4,padding:"2px 6px",fontWeight:700}}>⚠ OVERDUE</span></div>}
      <div style={{color:"#64748b",marginBottom:2}}><i className="fa-solid fa-user" style={{marginRight:5,color:"#94a3b8",fontSize:10}}></i>{lead.SENDER_NAME||"—"}</div>
      {lead.SENDER_MOBILE&&<div style={{color:"#64748b",marginBottom:2}}><i className="fa-solid fa-phone" style={{marginRight:5,color:"#94a3b8",fontSize:10}}></i>{lead.SENDER_MOBILE}</div>}
      {lead.QUERY_PRODUCT_NAME&&<div style={{color:"#3b82f6",marginBottom:2}}><i className="fa-solid fa-box" style={{marginRight:5,color:"#93c5fd",fontSize:10}}></i>{lead.QUERY_PRODUCT_NAME}</div>}

      {lead.quotation > 0 && (
        <div style={{marginBottom:4}}>
          <span style={{
            fontSize:10.5, fontWeight:700,
            background:"linear-gradient(90deg,#dcfce7,#bbf7d0)",
            color:"#15803d",
            borderRadius:4, padding:"2px 8px",
            border:"1px solid #86efac",
            display:"inline-flex", alignItems:"center", gap:3,
          }}>
            <i className="fa-solid fa-indian-rupee-sign" style={{fontSize:9}}></i>
            {fmtCurrency(lead.quotation)}
          </span>
        </div>
      )}

      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:7}}>
        <span style={{fontSize:10,color:"#94a3b8"}}><i className="fa-solid fa-tag" style={{marginRight:3}}></i>{lead.SOURCE||"—"}</span>
        {lead.nextFollowUpDate&&(
          <span style={{fontSize:10,fontWeight:600,borderRadius:4,padding:"2px 6px",background:isToday||isOverdue?"#fee2e2":"#f1f5f9",color:isToday||isOverdue?"#b91c1c":"#475569"}}>
            <i className="fa-solid fa-calendar-check" style={{marginRight:3}}></i>{fmtDate(lead.nextFollowUpDate)}
          </span>
        )}
      </div>
      <div style={{display:"flex",gap:4,marginTop:8,justifyContent:"flex-end"}}>
        {fin?(
          <button className="btn btn-sm btn-outline-info" style={{padding:"2px 8px",fontSize:11}} onClick={()=>onView(lead)}><i className="fa-solid fa-eye"></i></button>
        ):(<>
          {canUpdate&&<button className="btn btn-sm btn-outline-success" style={{padding:"2px 8px",fontSize:11}} onClick={()=>onUpdate(lead)}><i className="fa-solid fa-pen"></i></button>}
          {canAssign&&<button className="btn btn-sm btn-outline-warning" style={{padding:"2px 8px",fontSize:11}} onClick={()=>onAssign(lead)}><i className="fa-solid fa-share"></i></button>}
          {canDelete&&lead.SOURCE==="Direct"&&<button className="btn btn-sm btn-outline-danger" style={{padding:"2px 8px",fontSize:11}} onClick={()=>onDelete(lead._id)}><i className="fa-solid fa-trash"></i></button>}
        </>)}
      </div>
    </div>
  );
};

/* ── Modal ── */
const LeadsModal = ({stage,leads,onClose,onView,onUpdate,onAssign,onDelete,canUpdate,canAssign,canDelete}) => {
  if(!stage) return null;

  const totalQuotation = leads.reduce((sum, l) => sum + (l.quotation || 0), 0);

  return(
    <>
      <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.52)",zIndex:1050,backdropFilter:"blur(3px)"}}/>
      <div style={{position:"fixed",top:"50%",left:"50%",transform:"translate(-50%,-50%)",zIndex:1051,width:"min(93vw,900px)",maxHeight:"84vh",background:"#fff",borderRadius:16,boxShadow:"0 24px 64px rgba(0,0,0,0.3)",display:"flex",flexDirection:"column",overflow:"hidden"}}>
        <div style={{background:`linear-gradient(135deg,${stage.color},${stage.color}bb)`,padding:"15px 22px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
          <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
            <i className="fa-solid fa-layer-group" style={{color:"rgba(255,255,255,0.9)",fontSize:17}}></i>
            <span style={{fontWeight:700,fontSize:17,color:"#fff"}}>{stage.label}</span>
            <span style={{background:"rgba(255,255,255,0.25)",color:"#fff",borderRadius:99,padding:"3px 12px",fontSize:12,fontWeight:700}}>{leads.length} lead{leads.length!==1?"s":""}</span>
            {totalQuotation > 0 && (
              <span style={{
                background:"rgba(255,255,255,0.2)",color:"#fff",borderRadius:99,
                padding:"3px 12px",fontSize:12,fontWeight:700,
                display:"flex",alignItems:"center",gap:4,
                border:"1px solid rgba(255,255,255,0.35)",
              }}>
                <i className="fa-solid fa-indian-rupee-sign" style={{fontSize:10}}></i>
                {fmtCurrency(totalQuotation)}
              </span>
            )}
          </div>
          <button onClick={onClose} style={{background:"rgba(255,255,255,0.2)",border:"none",color:"#fff",width:34,height:34,borderRadius:"50%",cursor:"pointer",fontSize:17,display:"flex",alignItems:"center",justifyContent:"center"}}
            onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.35)"}
            onMouseLeave={e=>e.currentTarget.style.background="rgba(255,255,255,0.2)"}>
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"18px 20px"}}>
          {leads.length===0?(
            <div style={{textAlign:"center",padding:"50px 0",color:"#94a3b8"}}>
              <i className="fa-solid fa-inbox" style={{fontSize:32,display:"block",marginBottom:10}}></i>No leads in this stage
            </div>
          ):(
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(230px,1fr))",gap:12}}>
              {leads.map(lead=>(
                <LeadCard key={lead._id} lead={lead} onView={onView} onUpdate={onUpdate} onAssign={onAssign} onDelete={onDelete} canUpdate={canUpdate} canAssign={canAssign} canDelete={canDelete}/>
              ))}
            </div>
          )}
        </div>
        <div style={{borderTop:"1px solid #e2e8f0",padding:"10px 20px",display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0,background:"#f8fafc"}}>
          {totalQuotation > 0 && (
            <span style={{fontSize:12,fontWeight:700,color:"#15803d"}}>
              <i className="fa-solid fa-indian-rupee-sign" style={{marginRight:4}}></i>
              Total Quotation: {fmtCurrency(totalQuotation)}
            </span>
          )}
          <button onClick={onClose} className="btn btn-sm btn-outline-secondary" style={{minWidth:80,marginLeft:"auto"}}>Close</button>
        </div>
      </div>
    </>
  );
};

/* ══════════════════════════════════════════════
   CURVED 3D FUNNEL
══════════════════════════════════════════════ */
const CurvedFunnel = ({ stages, grouped, quotationByStage, totalLeads, activeKey, onHover, onClick }) => {
  const N      = stages.length;
  const CX     = 220;
  const TOP_RX = 210;
  const BOT_RX = 28;
  const SLICE_H= 44;
  const H      = N * SLICE_H + 8;
  const W      = CX * 2 + 10;

  const rx = (i) => TOP_RX - (TOP_RX - BOT_RX) * (i / N);

  const slicePath = (i) => {
    const y0 = i * SLICE_H + 4;
    const y1 = y0 + SLICE_H;
    const rx0 = rx(i);
    const rx1 = rx(i + 1);
    const cpY0 = y0 + 6;
    const cpY1 = y1 + 6;
    return [
      `M ${CX - rx0} ${y0}`,
      `Q ${CX} ${cpY0} ${CX + rx0} ${y0}`,
      `L ${CX + rx1} ${y1}`,
      `Q ${CX} ${cpY1} ${CX - rx1} ${y1}`,
      `Z`
    ].join(" ");
  };

  const capRx = rx(N);
  const capY  = N * SLICE_H + 4;

  return (
    <svg width={W} height={H + 14} style={{ display:"block", overflow:"visible" }}>
      <defs>
        {stages.map((s, i) => (
          <linearGradient key={s.key} id={`fg-${i}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor={s.color} stopOpacity="0.7"/>
            <stop offset="48%"  stopColor={s.color} stopOpacity="1"/>
            <stop offset="100%" stopColor={s.color} stopOpacity="0.7"/>
          </linearGradient>
        ))}
        <filter id="fslice-shadow" x="-10%" y="-10%" width="120%" height="130%">
          <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="rgba(0,0,0,0.18)"/>
        </filter>
      </defs>

      {[...stages].reverse().map((stage, ri) => {
        const i     = N - 1 - ri;
        const count = grouped[stage.key]?.length || 0;
        const isHov = activeKey === stage.key;
        const isEmpty = count === 0;
        const y0    = i * SLICE_H + 4;
        const midY  = y0 + SLICE_H / 2 + 3;

        const stageQuotation = quotationByStage[stage.key] || 0;
        const amtLabel = fmtCurrencyCompact(stageQuotation);

        return (
          <g key={stage.key}
            style={{ cursor: isEmpty ? "default" : "pointer", opacity: isEmpty ? 0.4 : 1 }}
            onClick={() => !isEmpty && onClick(stage.key)}
            onMouseEnter={() => onHover(stage.key)}
            onMouseLeave={() => onHover(null)}
          >
            <path
              d={slicePath(i)}
              fill={`url(#fg-${i})`}
              stroke="#fff"
              strokeWidth={isHov ? 2.5 : 1.5}
              filter={isHov ? "url(#fslice-shadow)" : "none"}
              style={{ transition:"all .18s" }}
            />
            {isHov && (
              <path d={slicePath(i)} fill="rgba(255,255,255,0.18)" style={{pointerEvents:"none"}}/>
            )}

            {count > 0 && (
              <>
                {i % 2 === 0 ? (
                  <>
                    <line
                      x1={CX - rx(i + 0.5)} y1={midY}
                      x2={CX - rx(i + 0.5) - 22} y2={midY}
                      stroke={stage.color} strokeWidth={1.5}
                    />
                    <rect
                      x={CX - rx(i + 0.5) - 22 - 30} y={midY - 11}
                      width={30} height={22} rx={5}
                      fill={isHov ? stage.color : "#fff"}
                      stroke={stage.color} strokeWidth={1.5}
                    />
                    <text
                      x={CX - rx(i + 0.5) - 22 - 15} y={midY + 1}
                      textAnchor="middle" dominantBaseline="middle"
                      fill={isHov ? "#fff" : stage.color}
                      fontSize={isHov ? 12 : 11} fontWeight={700}
                      style={{ pointerEvents:"none" }}
                    >{count}</text>

                    {amtLabel && stage.key === "Quotation Submission" && (
                      <>
                        <rect
                          x={CX - rx(i + 0.5) - 22 - 62} y={midY - 10}
                          width={28} height={18} rx={4}
                          fill="#dcfce7" stroke="#16a34a" strokeWidth={1}
                        />
                        <text
                          x={CX - rx(i + 0.5) - 22 - 48} y={midY + 1}
                          textAnchor="middle" dominantBaseline="middle"
                          fill="#15803d" fontSize={8} fontWeight={700}
                          style={{ pointerEvents:"none" }}
                        >{amtLabel}</text>
                      </>
                    )}
                  </>
                ) : (
                  <>
                    <line
                      x1={CX + rx(i + 0.5)} y1={midY}
                      x2={CX + rx(i + 0.5) + 22} y2={midY}
                      stroke={stage.color} strokeWidth={1.5}
                    />
                    <rect
                      x={CX + rx(i + 0.5) + 22} y={midY - 11}
                      width={30} height={22} rx={5}
                      fill={isHov ? stage.color : "#fff"}
                      stroke={stage.color} strokeWidth={1.5}
                    />
                    <text
                      x={CX + rx(i + 0.5) + 22 + 15} y={midY + 1}
                      textAnchor="middle" dominantBaseline="middle"
                      fill={isHov ? "#fff" : stage.color}
                      fontSize={isHov ? 12 : 11} fontWeight={700}
                      style={{ pointerEvents:"none" }}
                    >{count}</text>

                    {amtLabel && stage.key === "Quotation Submission" && (
                      <>
                        <rect
                          x={CX + rx(i + 0.5) + 22 + 34} y={midY - 10}
                          width={28} height={18} rx={4}
                          fill="#dcfce7" stroke="#16a34a" strokeWidth={1}
                        />
                        <text
                          x={CX + rx(i + 0.5) + 22 + 48} y={midY + 1}
                          textAnchor="middle" dominantBaseline="middle"
                          fill="#15803d" fontSize={8} fontWeight={700}
                          style={{ pointerEvents:"none" }}
                        >{amtLabel}</text>
                      </>
                    )}
                  </>
                )}
              </>
            )}
          </g>
        );
      })}

      <ellipse
        cx={CX} cy={capY + 5}
        rx={capRx + 2} ry={6}
        fill={stages[N-1]?.color || "#ef4444"}
        opacity={0.6}
      />
    </svg>
  );
};

/* ══════════════════════════════════════════════
   MAIN
══════════════════════════════════════════════ */
const SalesFunnelView = ({ leads=[], onView, onUpdate, onAssign, onDelete, canUpdate, canAssign, canDelete }) => {

  const [modalStageKey, setModalStageKey] = useState(null);
  const [hoveredKey,    setHoveredKey]    = useState(null);

  /* ── Group leads by stage AND compute quotation totals ──
     Leads with no step (null/undefined) → first real stage "Call Not Connect/ Callback"
  ── */
  const { grouped, quotationByStage } = useMemo(() => {
    const map   = {};
    const qtMap = {};
    ALL_STAGES.forEach(s => { map[s.key] = []; qtMap[s.key] = 0; });

    leads.forEach(lead => {
      // STEP_TO_KEY returns undefined for null/undefined step → falls to FIRST_REAL_STAGE_KEY
      const mapped = STEP_TO_KEY[lead.step];
      const key    = (mapped !== undefined && map[mapped] !== undefined)
        ? mapped
        : FIRST_REAL_STAGE_KEY;

      map[key].push(lead);
      if (lead.quotation > 0) qtMap[key] += lead.quotation;
    });

    return { grouped: map, quotationByStage: qtMap };
  }, [leads]);

  const totalLeads   = leads.length;
  const funnelTotal  = FUNNEL_STAGES.reduce((s,st)=>s+(grouped[st.key]?.length||0),0);
  const closingTotal = CLOSING_STAGES.reduce((s,st)=>s+(grouped[st.key]?.length||0),0);

  const totalQuotationAllStages = Object.values(quotationByStage).reduce((a, b) => a + b, 0);

  const modalStage = ALL_STAGES.find(s=>s.key===modalStageKey)||null;
  const modalLeads = modalStageKey ? (grouped[modalStageKey]||[]) : [];

  const hoveredStage = hoveredKey ? ALL_STAGES.find(s=>s.key===hoveredKey) : null;
  const hoveredCount = hoveredKey ? (grouped[hoveredKey]?.length||0) : 0;

  // ── FIX: use totalLeads (all leads) as denominator for consistent % across funnel + closing ──
  const hoveredPct = totalLeads > 0 && hoveredKey
    ? ((hoveredCount / totalLeads) * 100).toFixed(1)
    : "0.0";

  const hoveredQuotation = hoveredKey ? (quotationByStage[hoveredKey] || 0) : 0;

  return (
    <>
      <style>{`
        @keyframes blinkCardR{0%,100%{box-shadow:0 0 5px rgba(239,68,68,.3);}50%{box-shadow:0 0 16px rgba(239,68,68,.8);}}
        @keyframes blinkCardD{0%,100%{box-shadow:0 0 5px rgba(127,29,29,.3);}50%{box-shadow:0 0 16px rgba(127,29,29,.8);}}
        .sfv-close-row{display:flex;align-items:center;gap:11px;padding:10px 13px;border-radius:10px;cursor:pointer;border:1.5px solid #e2e8f0;background:#fff;margin-bottom:8px;transition:all .17s;box-shadow:0 1px 3px rgba(0,0,0,0.05);}
        .sfv-close-row:hover{transform:translateX(5px);box-shadow:0 4px 16px rgba(0,0,0,0.12);}
        .sfv-close-row.empty{opacity:.42;cursor:default;}.sfv-close-row.empty:hover{transform:none;box-shadow:none;}
      `}</style>

      {/* ── Top summary bar ── */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:18,flexWrap:"wrap",gap:10}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:38,height:38,borderRadius:10,background:"linear-gradient(135deg,#6366f1,#4f46e5)",display:"flex",alignItems:"center",justifyContent:"center"}}>
            <i className="fa-solid fa-filter" style={{color:"#fff",fontSize:17}}></i>
          </div>
          <div>
            <div style={{fontWeight:800,fontSize:16,color:"#1e293b",lineHeight:1}}>Sales Pipeline Funnel</div>
            <div style={{fontSize:11.5,color:"#64748b",marginTop:2}}>Click any stage to view leads</div>
          </div>
        </div>
        <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
          {[
          //  {label:"Total Leads",   val:totalLeads,   color:"#1e293b", bg:"#f8fafc", isNum:true},
          //  {label:"In Funnel",     val:funnelTotal,  color:"#6366f1", bg:"#eef2ff", isNum:true},
          //  {label:"Won",           val:closingTotal, color:"#16a34a", bg:"#f0fdf4", isNum:true},
          //  ...(totalQuotationAllStages > 0 ? [{
          //    label:"Total Quotation",
          //    val: fmtCurrency(totalQuotationAllStages),
          //    color:"#b45309", bg:"#fffbeb", isNum:false,
          //  }] : []),
          ].map(s=>(
            <div key={s.label} style={{textAlign:"center",padding:"7px 16px",borderRadius:10,background:s.bg,border:`1px solid ${s.color}22`}}>
              <div style={{fontWeight:800,fontSize:s.isNum?20:16,color:s.color,lineHeight:1}}>{s.val}</div>
              <div style={{fontSize:10.5,color:"#64748b",marginTop:2}}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Main layout ── */}
      <div style={{display:"flex",gap:24,alignItems:"flex-start",flexWrap:"wrap"}}>

        {/* ════ LEFT: Curved Funnel + Legend ════ */}
        <div style={{flex:"0 0 auto"}}>

          {/* Hover tooltip */}
          <div style={{height:48,marginBottom:8,display:"flex",alignItems:"center",justifyContent:"center"}}>
            {hoveredStage ? (
              <div style={{
                display:"flex",alignItems:"center",gap:10,
                padding:"8px 18px",borderRadius:10,
                background:`${hoveredStage.color}18`,
                border:`1.5px solid ${hoveredStage.color}55`,
                flexWrap:"wrap",
              }}>
                <div style={{width:10,height:10,borderRadius:2,background:hoveredStage.color}}/>
                <span style={{fontWeight:700,fontSize:13,color:hoveredStage.color}}>{hoveredStage.label}</span>
                <span style={{fontWeight:800,fontSize:18,color:hoveredStage.color}}>{hoveredCount}</span>
                {/* ── FIX: percentage now uses totalLeads denominator ── */}
                <span style={{fontSize:11.5,color:"#64748b"}}>
                  leads · {hoveredPct}% of total
                </span>
                {hoveredQuotation > 0 && (
                  <span style={{
                    fontSize:11,fontWeight:700,
                    background:"#dcfce7",color:"#15803d",
                    borderRadius:6,padding:"2px 8px",
                    border:"1px solid #86efac",
                  }}>
                    <i className="fa-solid fa-indian-rupee-sign" style={{marginRight:3,fontSize:9}}></i>
                    {fmtCurrency(hoveredQuotation)}
                  </span>
                )}
                {hoveredCount>0&&(
                  <span style={{fontSize:11,color:hoveredStage.color,fontWeight:600}}>
                    — click to open
                  </span>
                )}
              </div>
            ) : (
              <div style={{fontSize:12,color:"#94a3b8"}}>
                <i className="fa-solid fa-hand-pointer" style={{marginRight:6}}></i>
                Hover over a stage to preview · click to open leads
              </div>
            )}
          </div>

          {/* SVG funnel */}
          <div style={{overflowX:"auto"}}>
            <CurvedFunnel
              stages={FUNNEL_STAGES}
              grouped={grouped}
              quotationByStage={quotationByStage}
              totalLeads={totalLeads}
              activeKey={hoveredKey}
              onHover={setHoveredKey}
              onClick={setModalStageKey}
            />
          </div>

          {/* Legend below funnel */}
          <div style={{display:"flex",flexWrap:"wrap",gap:"5px 14px",marginTop:14,maxWidth:460}}>
            {FUNNEL_STAGES.map(s=>{
              const stageAmt = quotationByStage[s.key] || 0;
              const count    = grouped[s.key]?.length || 0;
              // ── FIX: legend % also uses totalLeads ──
              const pct = totalLeads > 0 ? ((count / totalLeads) * 100).toFixed(1) : "0.0";
              return (
                <div key={s.key}
                  style={{display:"flex",alignItems:"center",gap:5,cursor:"pointer",
                    opacity:hoveredKey&&hoveredKey!==s.key?0.4:1,transition:"opacity .2s"}}
                  onMouseEnter={()=>setHoveredKey(s.key)}
                  onMouseLeave={()=>setHoveredKey(null)}
                  onClick={()=>count>0&&setModalStageKey(s.key)}
                >
                  <div style={{width:11,height:11,borderRadius:2,background:s.color,flexShrink:0}}/>
                  <span style={{fontSize:11,color:"#374151"}}>
                    {s.label} ({count} · {pct}%)
                    {stageAmt > 0 && (
                      <span style={{marginLeft:4,fontSize:10,color:"#15803d",fontWeight:600}}>
                        · {fmtCurrencyCompact(stageAmt)}
                      </span>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ════ RIGHT: Closing Stages ════ */}
        <div style={{flex:"1 1 220px",minWidth:210}}>

          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14,paddingBottom:10,borderBottom:"2px solid #e2e8f0"}}>
            <div style={{width:30,height:30,borderRadius:8,background:"linear-gradient(135deg,#16a34a,#15803d)",display:"flex",alignItems:"center",justifyContent:"center"}}>
              <i className="fa-solid fa-arrow-trend-up" style={{color:"#fff",fontSize:12}}></i>
            </div>
            <div>
              <div style={{fontWeight:700,fontSize:13.5,color:"#1e293b",lineHeight:1}}>Won Stages</div>
              <div style={{fontSize:11,color:"#64748b",marginTop:2}}>After Quotation Submission</div>
            </div>
          </div>

          <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:12,padding:"7px 11px",background:"linear-gradient(90deg,#fef3c7,#fef9c3)",borderRadius:8,border:"1px solid #fde68a"}}>
            <i className="fa-solid fa-arrow-right" style={{color:"#d97706",fontSize:12}}></i>
            <span style={{fontSize:11.5,color:"#92400e",fontWeight:600}}>Post-Quotation Pipeline</span>
          </div>

          {CLOSING_STAGES.map((stage,idx)=>{
            const count   = grouped[stage.key]?.length||0;
            const isEmpty = count===0;
            const isHov   = hoveredKey===stage.key;
            // ── FIX: closing stage % uses totalLeads ──
            const pct = totalLeads > 0 ? ((count / totalLeads) * 100).toFixed(1) : "0.0";
            const stageAmt = quotationByStage[stage.key] || 0;

            return(
              <div key={stage.key}
                className={`sfv-close-row${isEmpty?" empty":""}`}
                style={{borderColor:isHov?stage.color:"#e2e8f0",background:isHov?`${stage.color}0d`:"#fff"}}
                onMouseEnter={()=>setHoveredKey(stage.key)}
                onMouseLeave={()=>setHoveredKey(null)}
                onClick={()=>!isEmpty&&setModalStageKey(stage.key)}
              >
                <div style={{width:22,height:22,borderRadius:"50%",flexShrink:0,background:isEmpty?"#e2e8f0":`${stage.color}22`,border:`1.5px solid ${isEmpty?"#cbd5e1":stage.color}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:isEmpty?"#94a3b8":stage.color}}>
                  {idx+1}
                </div>
                <div style={{width:34,height:34,borderRadius:8,flexShrink:0,background:isEmpty?"#f1f5f9":`${stage.color}18`,display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <i className={`fa-solid ${stage.icon}`} style={{color:isEmpty?"#94a3b8":stage.color,fontSize:14}}></i>
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:600,fontSize:12.5,color:isHov?stage.color:"#1e293b",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{stage.label}</div>
                  <div style={{fontSize:10.5,color:"#94a3b8",marginTop:1,display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                    <span>{count} leads · {pct}%</span>
                    {stageAmt > 0 && (
                      <span style={{
                        background:"#dcfce7",color:"#15803d",
                        borderRadius:4,padding:"1px 6px",
                        fontSize:10,fontWeight:700,
                        border:"1px solid #86efac",
                      }}>
                        <i className="fa-solid fa-indian-rupee-sign" style={{marginRight:2,fontSize:8}}></i>
                        {fmtCurrencyCompact(stageAmt)}
                      </span>
                    )}
                  </div>
                </div>
                <div style={{minWidth:30,height:26,borderRadius:7,padding:"0 8px",background:count>0?stage.color:"#e2e8f0",color:count>0?"#fff":"#94a3b8",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:13,boxShadow:count>0?`0 2px 6px ${stage.color}55`:"none",flexShrink:0}}>
                  {count}
                </div>
              </div>
            );
          })}

          <div style={{marginTop:12,padding:"9px 12px",background:"#f0fdf4",borderRadius:8,border:"1px solid #bbf7d0",display:"flex",alignItems:"center",gap:7}}>
            <i className="fa-solid fa-lightbulb" style={{color:"#16a34a",fontSize:12}}></i>
            <span style={{fontSize:11,color:"#166534"}}>Hover to preview · click to open leads popup</span>
          </div>
        </div>
      </div>

      {/* ── Modal ── */}
      <LeadsModal stage={modalStage} leads={modalLeads} onClose={()=>setModalStageKey(null)}
        onView={onView} onUpdate={onUpdate} onAssign={onAssign} onDelete={onDelete}
        canUpdate={canUpdate} canAssign={canAssign} canDelete={canDelete}/>
    </>
  );
};

export default SalesFunnelView;