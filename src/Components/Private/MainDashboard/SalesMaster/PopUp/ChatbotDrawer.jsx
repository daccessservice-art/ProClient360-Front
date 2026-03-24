
import { useState, useRef, useEffect, useCallback, useContext } from "react";
import axios from "axios";
import { UserContext } from "../../../../../context/UserContext";

const API   = process.env.REACT_APP_API_URL;
const token = () => localStorage.getItem("token");
const AUTH  = () => ({ Authorization: `Bearer ${token()}` });

const C = {
  accent:"#3b82f6", accentDim:"rgba(59,130,246,0.12)", accentBdr:"rgba(59,130,246,0.3)",
  green:"#22c55e", amber:"#f59e0b", red:"#ef4444", purple:"#8b5cf6",
  bg:"#ffffff", bgCard:"#f8fafc", bgDark:"#1e293b",
  border:"#e2e8f0", text:"#0f172a", muted:"#64748b",
};

const QUESTIONS = {
  sales:[
    {icon:"📊",label:"Today's follow-up leads",  fn:"todayFollowup"},
    {icon:"⚡",label:"Today's action summary",    fn:"todayAction"},
    {icon:"🏆",label:"All won leads",             fn:"allWonLeads"},
    {icon:"🏅",label:"Won this month",            fn:"wonThisMonth"},
    {icon:"🔥",label:"Hot leads",                 fn:"hotLeads"},
    {icon:"⏰",label:"Overdue follow-ups",        fn:"overdueFollowups"},
    {icon:"📈",label:"Pipeline value",            fn:"pipelineValue"},
    {icon:"❌",label:"All lost leads",            fn:"allLostLeads"},
  ],
  manager:[
    {icon:"👥",label:"Team performance",          fn:"teamOverview"},
    {icon:"🏆",label:"Top performer",             fn:"topPerformer"},
    {icon:"📋",label:"All leads summary",         fn:"allLeadsSummary"},
    {icon:"🏆",label:"All won leads",             fn:"allWonLeads"},
    {icon:"❌",label:"All lost leads",            fn:"allLostLeads"},
    {icon:"🔥",label:"Team hot leads",            fn:"teamHotLeads"},
    {icon:"📈",label:"Team pipeline",             fn:"teamPipeline"},
    {icon:"🏅",label:"Won by employee",           fn:"wonByEmployee"},
  ],
  marketing:[
    {icon:"📥",label:"Leads today",               fn:"totalToday"},
    {icon:"✅",label:"Feasible ratio",            fn:"feasibleRatio"},
    {icon:"📞",label:"Unanswered calls",          fn:"unanswered"},
    {icon:"🌐",label:"Leads by source",           fn:"bySource"},
    {icon:"⏳",label:"Pending leads",             fn:"pendingLeads"},
    {icon:"📅",label:"Leads this week",           fn:"thisWeek"},
    {icon:"🔁",label:"Recently assigned",         fn:"recentAssigned"},
    {icon:"📊",label:"Overall stats",             fn:"marketingStats"},
  ],
};

function resolveLocalIntent(q, page) {
  const raw = q.toLowerCase().trim();

  // ── helpers ──
  const has  = (...words) => words.some(w => raw.includes(w));
  const hasSt = (s) => raw.includes(s.toLowerCase());

  let employeeName = null;
  const empPatterns = [
    /employee\s+([a-z]+)/i,
    /for\s+([a-z]+)(?:'s)?\s+leads?/i,
    /([a-z]+)'s\s+leads?/i,
    /([a-z]+)\s+(?:won|lost|ongoing|pending|hot|warm|cold)\s+leads?/i,
    /leads?\s+(?:of|by|for)\s+([a-z]+)/i,
    /show\s+(?:me\s+)?([a-z]+)\s+leads?/i,
  ];
  for (const pat of empPatterns) {
    const m = raw.match(pat);
    if (m && m[1] && m[1].length > 2 &&
        !["the","all","my","our","team","today","this","last","show","view","give","get"].includes(m[1])) {
      employeeName = m[1].charAt(0).toUpperCase() + m[1].slice(1).toLowerCase();
      break;
    }
  }

  // ── extract source ──
  const sources = ["indiamart","tradeindia","facebook","linkedin","google","direct","referral","website","justdial","whatsapp","cold call","walk-in","exhibitions","tender"];
  const matchedSource = sources.find(s => raw.includes(s));

  // ── STATUS keywords ──
  const isWon     = has("won","win","closed","success");
  const isLost    = has("lost","lose","failed","dropped");
  const isOngoing = has("ongoing","in progress","active","running");
  const isPending = has("pending","waiting","not started","new lead");
  const isHot     = has("hot lead","hot leads","hotlead");
  const isWarm    = has("warm lead","warm leads");
  const isCold    = has("cold lead","cold leads");
  const isInvalid = has("invalid","junk","spam");

  // ── DATE/TIME keywords ──
  const isToday      = has("today","todays","this day");
  const isThisWeek   = has("this week","weekly","week");
  const isThisMonth  = has("this month","monthly","month");
  const isOverdue    = has("overdue","missed","past due","missed follow");
  const isFollowUp   = has("follow up","followup","follow-up","follow");

  // ── METRIC keywords ──
  const isPipeline   = has("pipeline","value","quotation","revenue","amount","money","rupee","₹");
  const isTeam       = has("team","employee","staff","member","all employee","all staff");
  const isTopPerf    = has("top performer","best performer","best employee","highest","top sales","best sales","top agent","leaderboard","rank");
  const isSource     = has("source","channel","platform","from where","which platform","indiamart","tradeindia","facebook","linkedin","google","justdial");
  const isFeasible   = has("feasible","not feasible","nonfeasible","feasibility");
  const isUnanswered = has("unanswered","no answer","not picked","call attempt","call history");
  const isAssigned   = has("assigned","assign","unassigned","not assigned");
  const isCount      = has("count","how many","total","number","how much");
  const isAll        = has("all","overall","entire","every","complete","grand total","full");

  // ─────────────────────────────────────────────────────────
  //  BUILD RESULT
  // ─────────────────────────────────────────────────────────
  let fn = null;
  let label = "";

  // Priority: employee-specific queries first
  if (employeeName) {
    if (isWon)     { fn = "employeeWon";     label = `Won leads for ${employeeName}`; }
    else if (isLost)    { fn = "employeeLost";    label = `Lost leads for ${employeeName}`; }
    else if (isOngoing) { fn = "employeeOngoing"; label = `Ongoing leads for ${employeeName}`; }
    else if (isPending) { fn = "employeePending"; label = `Pending leads for ${employeeName}`; }
    else if (isHot)     { fn = "employeeHot";     label = `Hot leads for ${employeeName}`; }
    else if (isOverdue) { fn = "employeeOverdue"; label = `Overdue follow-ups for ${employeeName}`; }
    else                { fn = "employeeAll";     label = `All leads for ${employeeName}`; }
    return { fn, employeeName, matchedSource, label };
  }

  // Source-specific
  if (matchedSource && !isTeam && !isTopPerf) {
    fn = "bySource"; label = `Leads from ${matchedSource.charAt(0).toUpperCase() + matchedSource.slice(1)}`;
    return { fn, employeeName, matchedSource, label };
  }

  // Sales page specific
  if (page === "sales") {
    if (isToday && isFollowUp)   { fn = "todayFollowup"; label = "Today's follow-up leads"; }
    else if (isToday && has("action","activity","done","submitted")) { fn = "todayAction"; label = "Today's action summary"; }
    else if (isWon && isThisMonth)       { fn = "wonThisMonth";   label = "Won leads this month"; }
    else if (isWon && (isAll||isCount))  { fn = "allWonLeads";    label = "All won leads"; }
    else if (isWon)                      { fn = "allWonLeads";    label = "All won leads"; }
    else if (isLost && isThisMonth)      { fn = "lostThisMonth";  label = "Lost leads this month"; }
    else if (isLost && (isAll||isCount)) { fn = "allLostLeads";   label = "All lost leads"; }
    else if (isLost)                     { fn = "allLostLeads";   label = "All lost leads"; }
    else if (isOverdue)              { fn = "overdueFollowups"; label = "Overdue follow-ups"; }
    else if (isHot)                  { fn = "hotLeads";         label = "Hot leads"; }
    else if (isWarm)                 { fn = "warmLeads";        label = "Warm leads"; }
    else if (isCold)                 { fn = "coldLeads";        label = "Cold leads"; }
    else if (isOngoing)              { fn = "ongoingLeads";     label = "Ongoing leads"; }
    else if (isPending)              { fn = "pendingLeads";     label = "Pending leads"; }
    else if (isPipeline)             { fn = "pipelineValue";    label = "Pipeline value"; }
    else if (isFollowUp && isToday)  { fn = "todayFollowup";   label = "Today's follow-up leads"; }
    else if (isFollowUp)             { fn = "overdueFollowups"; label = "Follow-up leads"; }
    else if (isThisWeek)             { fn = "thisWeek";         label = "Leads this week"; }
    else if (isSource)               { fn = "bySource";         label = "Leads by source"; }
    else if (has("summary","overview","stats","statistics","count","total","all leads","how many")) { fn = "statusBreakdown"; label = "Leads summary"; }
    else if (isToday)                { fn = "todayAction";      label = "Today's activity"; }
  }

  // Manager page specific
  if (page === "manager") {
    if (isTopPerf)                   { fn = "topPerformer";  label = "Top performers"; }
    else if (isTeam && isPipeline)   { fn = "teamPipeline";  label = "Team pipeline value"; }
    else if (isTeam && isOverdue)    { fn = "teamOverdue";   label = "Team overdue follow-ups"; }
    else if (isTeam && isHot)        { fn = "teamHotLeads";  label = "Team hot leads"; }
    else if (has("won by","won per","wins per","wins by","who won","who has won")) { fn = "wonByEmployee"; label = "Won deals by employee"; }
    else if (isWon && isThisMonth)       { fn = "wonByEmployee"; label = "Won leads this month"; }
    else if (isWon && (isAll||isCount))  { fn = "allWonLeads";   label = "All won leads"; }
    else if (isWon)                      { fn = "allWonLeads";   label = "All won leads"; }
    else if (isLost && isThisMonth)      { fn = "managerLost";   label = "Team lost leads this month"; }
    else if (isLost && (isAll||isCount)) { fn = "allLostLeads";  label = "All lost leads"; }
    else if (isLost)                     { fn = "allLostLeads";  label = "All lost leads"; }
    else if (isOverdue)              { fn = "teamOverdue";   label = "Team overdue follow-ups"; }
    else if (isOngoing)              { fn = "ongoingLeads";  label = "Ongoing leads"; }
    else if (isPipeline)             { fn = "teamPipeline";  label = "Team pipeline value"; }
    else if (isSource)               { fn = "bySource";      label = "Leads by source"; }
    else if (has("overview","performance","team summary","all team")) { fn = "teamOverview"; label = "Team performance overview"; }
    else if (has("summary","stats","all leads","total","how many"))   { fn = "allLeadsSummary"; label = "All leads summary"; }
  }

  // Marketing page specific
  if (page === "marketing") {
    if (isFeasible)     { fn = "feasibleRatio"; label = "Feasibility breakdown"; }
    else if (isUnanswered)   { fn = "unanswered";   label = "Unanswered call leads"; }
    else if (isAssigned)     { fn = "recentAssigned"; label = "Assigned leads"; }
    else if (isToday)        { fn = "totalToday";   label = "Leads today"; }
    else if (isThisWeek)     { fn = "thisWeek";     label = "Leads this week"; }
    else if (isSource)       { fn = "bySource";     label = "Leads by source"; }
    else if (has("stats","summary","overview","total","how many","all leads")) { fn = "marketingStats"; label = "Marketing overview"; }
  }

  // Cross-page fallbacks
  if (!fn) {
    if (isTopPerf) {
      fn = "topPerformer"; label = "Top performers";
    } else if (isWon) {
      fn = "allWonLeads"; label = "All won leads";
    } else if (isLost) {
      fn = "allLostLeads"; label = "All lost leads";
    } else if (isHot) {
      fn = page === "manager" ? "teamHotLeads" : "hotLeads"; label = "Hot leads";
    } else if (isOverdue) {
      fn = page === "manager" ? "teamOverdue" : "overdueFollowups"; label = "Overdue follow-ups";
    } else if (isPipeline) {
      fn = page === "manager" ? "teamPipeline" : "pipelineValue"; label = "Pipeline value";
    } else if (isOngoing) {
      fn = "ongoingLeads"; label = "Ongoing leads";
    } else if (isPending) {
      fn = "pendingLeads"; label = "Pending leads";
    } else if (isSource) {
      fn = "bySource"; label = "Leads by source";
    } else if (isThisWeek) {
      fn = "thisWeek"; label = "Leads this week";
    } else if (isFollowUp) {
      fn = page === "sales" ? "todayFollowup" : "teamOverdue"; label = "Follow-up leads";
    } else if (has("summary","overview","stats","total","count","all","how many")) {
      fn = page === "manager" ? "allLeadsSummary" : page === "marketing" ? "marketingStats" : "statusBreakdown";
      label = "Summary";
    }
  }

  return { fn, employeeName: null, matchedSource, label };
}

//  DATA FETCHERS

async function fetchData(fn, page, options = {}) {
  const h     = AUTH();
  const myL   = `${API}/api/leads/my-leads`;
  const allL  = `${API}/api/leads/all-leads`;
  const mktL  = `${API}/api/leads`;
  const base  = page === "sales" ? myL : page === "manager" ? allL : mktL;

  const { employeeName, matchedSource } = options;

  // ── Employee-specific queries (manager / all-leads) ──
  if (fn.startsWith("employee")) {
    const r = await axios.get(allL, { headers: h, params: { limit: 99999, page: 1 } });
    let leads = r.data?.leads || [];

    // Filter by employee name (case-insensitive partial match)
    if (employeeName) {
      leads = leads.filter(l =>
        l.assignedTo?.name?.toLowerCase().includes(employeeName.toLowerCase())
      );
    }

    // Further filter by status
    const statusMap = {
      employeeWon:     "Won",
      employeeLost:    "Lost",
      employeeOngoing: "Ongoing",
      employeePending: "Pending",
    };
    if (statusMap[fn]) leads = leads.filter(l => l.STATUS === statusMap[fn]);
    if (fn === "employeeHot") leads = leads.filter(l => l.callLeads === "Hot Leads" || l.CALL_LEADS === "Hot Leads");
    if (fn === "employeeOverdue") {
      leads = leads.filter(l =>
        l.nextFollowUpDate && l.STATUS !== "Won" && l.STATUS !== "Lost" &&
        new Date(l.nextFollowUpDate) < new Date(new Date().setHours(0, 0, 0, 0))
      );
    }

    const empLabel = employeeName || "Employee";
    const statusLabel = { employeeWon:"Won", employeeLost:"Lost", employeeOngoing:"Ongoing", employeePending:"Pending", employeeHot:"Hot", employeeOverdue:"Overdue", employeeAll:"All" }[fn] || "All";
    return buildLeadList(`${statusLabel} Leads — ${empLabel} (${leads.length})`, leads, true);
  }

  // ── Source filter ──
  if (fn === "bySource" && matchedSource) {
    const r = await axios.get(base, { headers: h, params: { source: matchedSource, limit: 99999, page: 1 } });
    const leads = r.data?.leads || [];
    const src = matchedSource.charAt(0).toUpperCase() + matchedSource.slice(1);
    return buildLeadList(`Leads from ${src} (${leads.length})`, leads, page !== "sales");
  }

  switch (fn) {
    // ── follow-up / action ──
    case "todayFollowup": {
      const r = await axios.get(myL, { headers: h, params: { followUpToday:"true", limit:99999, page:1 } });
      return buildLeadList("Today's Follow-up Leads", r.data?.leads || []);
    }
    case "todayAction": {
      const r = await axios.get(myL, { headers: h, params: { todayAction:"true", limit:99999, page:1 } });
      const leads = r.data?.leads || [];
      const today = new Date().toDateString();
      const actions = leads.flatMap(l => (l.previousActions||[]).filter(a => new Date(a.createdAt).toDateString() === today));
      return buildTodayAction(leads, actions);
    }
    case "overdueFollowups":
    case "teamOverdue": {
      const r = await axios.get(base, { headers: h, params: { limit:99999, page:1 } });
      const filtered = (r.data?.leads||[]).filter(l =>
        l.nextFollowUpDate && l.STATUS !== "Won" && l.STATUS !== "Lost" &&
        new Date(l.nextFollowUpDate) < new Date(new Date().setHours(0,0,0,0))
      );
      return buildLeadList("Overdue Follow-ups", filtered, fn === "teamOverdue");
    }
    // ── status ──
    case "allWonLeads": {
      const r = await axios.get(base, { headers: h, params: { status:"Won", limit:99999, page:1 } });
      const leads = r.data?.leads||[];
      return buildLeadList(`All Won Leads (${leads.length})`, leads, page!=="sales");
    }
    case "allLostLeads": {
      const r = await axios.get(base, { headers: h, params: { status:"Lost", limit:99999, page:1 } });
      const leads = r.data?.leads||[];
      return buildLeadList(`All Lost Leads (${leads.length})`, leads, page!=="sales");
    }
    case "wonThisMonth": {
      const r = await axios.get(myL, { headers: h, params: { status:"Won", limit:99999, page:1 } });
      const now = new Date();
      const filtered = (r.data?.leads||[]).filter(l => { const d = new Date(l.updatedAt||l.createdAt); return d.getMonth()===now.getMonth() && d.getFullYear()===now.getFullYear(); });
      return buildLeadList("Won Leads This Month", filtered);
    }
    case "lostThisMonth":
    case "managerLost": {
      const r = await axios.get(base, { headers: h, params: { status:"Lost", limit:99999, page:1 } });
      const now = new Date();
      const filtered = (r.data?.leads||[]).filter(l => { const d = new Date(l.updatedAt||l.createdAt); return d.getMonth()===now.getMonth() && d.getFullYear()===now.getFullYear(); });
      return buildLeadList("Lost Leads This Month", filtered, fn === "managerLost");
    }
    case "hotLeads":
    case "teamHotLeads": {
      const r = await axios.get(base, { headers: h, params: { callLeads:"Hot Leads", limit:99999, page:1 } });
      return buildLeadList("Hot Leads", r.data?.leads||[], fn==="teamHotLeads");
    }
    case "warmLeads": {
      const r = await axios.get(base, { headers: h, params: { callLeads:"Warm Leads", limit:99999, page:1 } });
      return buildLeadList("Warm Leads", r.data?.leads||[]);
    }
    case "coldLeads": {
      const r = await axios.get(base, { headers: h, params: { callLeads:"Cold Leads", limit:99999, page:1 } });
      return buildLeadList("Cold Leads", r.data?.leads||[]);
    }
    case "ongoingLeads": {
      const r = await axios.get(base, { headers: h, params: { status:"Ongoing", limit:99999, page:1 } });
      return buildLeadList("Ongoing Leads", r.data?.leads||[]);
    }
    case "pendingLeads": {
      const r = await axios.get(base, { headers: h, params: { status:"Pending", limit:99999, page:1 } });
      return buildLeadList("Pending Leads", r.data?.leads||[]);
    }
    // ── pipeline ──
    case "pipelineValue":
    case "teamPipeline": {
      const r = await axios.get(base, { headers: h, params: { limit:99999, page:1 } });
      const leads = (r.data?.leads||[]).filter(l => l.STATUS !== "Lost");
      const total = leads.reduce((s,l) => s + ((l.previousActions||[]).reduce((a,act) => a+(Number(act.quotation)||0),0)),0);
      return { type:"stats", title:"Pipeline Value", subtitle:"Active pipeline excluding lost leads.", stats:[
        { label:"Active Leads",  value:leads.length, color:C.accent },
        { label:"Total Value",   value:`₹${total.toLocaleString("en-IN")}`, color:C.green },
        { label:"Avg per Lead",  value:leads.length ? `₹${Math.round(total/leads.length).toLocaleString("en-IN")}` : "₹0", color:C.purple },
      ]};
    }
    // ── summaries ──
    case "statusBreakdown":
    case "allLeadsSummary": {
      const r = await axios.get(base, { headers: h, params: { limit:99999, page:1 } });
      const leads = r.data?.leads||[];
      const c = { Won:0, Ongoing:0, Pending:0, Lost:0 };
      leads.forEach(l => { if (c[l.STATUS]!==undefined) c[l.STATUS]++; });
      return { type:"stats", title:"Leads Summary", subtitle:"Status breakdown across all leads.", stats:[
        { label:"Total",   value:leads.length, color:C.accent },
        { label:"Ongoing", value:c.Ongoing,    color:C.accent },
        { label:"Pending", value:c.Pending,    color:C.amber  },
        { label:"Won",     value:c.Won,        color:C.green  },
        { label:"Lost",    value:c.Lost,       color:C.red    },
      ]};
    }
    // ── team ──
    case "teamOverview": {
      const r = await axios.get(allL, { headers: h, params: { limit:99999, page:1 } });
      const byEmp = {};
      (r.data?.leads||[]).forEach(l => {
        const n = l.assignedTo?.name||"Unassigned";
        if (!byEmp[n]) byEmp[n]={total:0,won:0,ongoing:0,pending:0,lost:0};
        byEmp[n].total++;
        if (l.STATUS==="Won")     byEmp[n].won++;
        if (l.STATUS==="Ongoing") byEmp[n].ongoing++;
        if (l.STATUS==="Pending") byEmp[n].pending++;
        if (l.STATUS==="Lost")    byEmp[n].lost++;
      });
      return { type:"teamTable", title:"Team Performance Overview", data:byEmp };
    }
    case "topPerformer": {
      const r = await axios.get(allL, { headers: h, params: { limit:99999, page:1 } });
      const byEmp = {};
      (r.data?.leads||[]).forEach(l => {
        if (!l.assignedTo?.name) return;
        const n = l.assignedTo.name;
        if (!byEmp[n]) byEmp[n]={total:0,won:0,pipeline:0};
        byEmp[n].total++;
        if (l.STATUS==="Won") byEmp[n].won++;
        byEmp[n].pipeline += (l.previousActions||[]).reduce((s,a)=>s+(Number(a.quotation)||0),0);
      });
      return { type:"topPerformer", title:"Top Performers", data:Object.entries(byEmp).sort((a,b)=>b[1].won-a[1].won).slice(0,5) };
    }
    case "wonByEmployee": {
      const r = await axios.get(allL, { headers: h, params: { status:"Won", limit:99999, page:1 } });
      const byEmp = {};
      (r.data?.leads||[]).forEach(l => { const n = l.assignedTo?.name||"Unassigned"; byEmp[n]=(byEmp[n]||0)+1; });
      return { type:"wonTable", title:"Won Deals by Employee", data:Object.entries(byEmp).sort((a,b)=>b[1]-a[1]) };
    }
    // ── source breakdown ──
    case "bySource": {
      const r = await axios.get(base, { headers: h, params: { limit:99999, page:1 } });
      const leads = r.data?.leads||[];
      const bySrc = {};
      leads.forEach(l => { const s=l.SOURCE||"Unknown"; bySrc[s]=(bySrc[s]||0)+1; });
      return { type:"sourceTable", title:"Leads by Source", data:Object.entries(bySrc).sort((a,b)=>b[1]-a[1]), total:leads.length };
    }
    // ── week ──
    case "thisWeek": {
      const r = await axios.get(base, { headers: h, params: { limit:99999, page:1 } });
      const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate()-7);
      return buildLeadList("Leads This Week", (r.data?.leads||[]).filter(l => new Date(l.QUERY_TIME||l.createdAt)>=weekAgo));
    }
    // ── marketing ──
    case "totalToday": {
      const today = new Date().toISOString().split("T")[0];
      const r = await axios.get(mktL, { headers: h, params: { date:today, limit:99999, page:1 } });
      return buildLeadList("Leads Today", r.data?.leads||[]);
    }
    case "feasibleRatio": {
      const r = await axios.get(mktL, { headers: h, params: { limit:99999, page:1 } });
      const leads = r.data?.leads||[];
      const feas  = leads.filter(l => l.callStatus==="Feasible"||l.isFeasible).length;
      const notF  = leads.filter(l => l.callStatus==="NotFeasible"||l.isNotFeasible).length;
      const unans = leads.filter(l => l.callHistory?.length>0&&!l.isFeasible&&!l.isNotFeasible).length;
      return { type:"stats", title:"Feasibility Breakdown", subtitle:"Call feasibility status.", stats:[
        { label:"Feasible",       value:feas,  color:C.green  },
        { label:"Not Feasible",   value:notF,  color:C.red    },
        { label:"Unanswered",     value:unans, color:C.amber  },
        { label:"Pending",        value:Math.max(0,leads.length-feas-notF-unans), color:C.muted },
        { label:"Total",          value:leads.length, color:C.accent },
      ]};
    }
    case "unanswered": {
      const r = await axios.get(mktL, { headers: h, params: { limit:99999, page:1 } });
      return buildLeadList("Leads with Call Attempts", (r.data?.leads||[]).filter(l=>l.callHistory?.length>0));
    }
    case "recentAssigned": {
      const r = await axios.get(mktL, { headers: h, params: { limit:99999, page:1 } });
      return buildLeadList("Recently Assigned", (r.data?.leads||[]).filter(l=>l.assignedTo).slice(0,15), true);
    }
    case "marketingStats": {
      const r = await axios.get(mktL, { headers: h, params: { limit:99999, page:1 } });
      const leads = r.data?.leads||[];
      const today = new Date().toDateString();
      const assigned = leads.filter(l=>l.assignedTo);
      return { type:"stats", title:"Marketing Overview", subtitle:"Complete marketing statistics.", stats:[
        { label:"Total",      value:leads.length,            color:C.accent },
        { label:"Today",      value:leads.filter(l=>new Date(l.QUERY_TIME||l.createdAt).toDateString()===today).length, color:C.green },
        { label:"Assigned",   value:assigned.length,         color:C.purple },
        { label:"Unassigned", value:leads.length-assigned.length, color:C.amber },
      ]};
    }
    default:
      return null;
  }
}

// ─────────────────────────────────────────────────────────────
//  BUILDERS
// ─────────────────────────────────────────────────────────────
function buildLeadList(title, leads, showAssigned = false) {
  return { type:"leadList", title, leads:leads, total:leads.length, showAssigned };
}
function buildTodayAction(leads, actions) {
  const steps = {};
  actions.forEach(a => { steps[a.step||"Other"]=(steps[a.step||"Other"]||0)+1; });
  return { type:"todayAction", title:"Today's Action Summary", leads:leads.length, actions:actions.length, steps,
    totalValue:actions.reduce((s,a)=>s+(Number(a.quotation)||0),0),
    wonCount:actions.filter(a=>a.status==="Won").length,
    pending:actions.filter(a=>a.status==="Pending").length };
}

// ─────────────────────────────────────────────────────────────
//  SPEECH
// ─────────────────────────────────────────────────────────────
function buildSpeakText(msg) {
  if (msg.type==="text"||msg.type==="error") return msg.text||"";
  if (msg.type==="stats")       return `${msg.title}. ${msg.stats.map(s=>`${s.label}: ${s.value}`).join(". ")}.`;
  if (msg.type==="leadList")    { const n=msg.leads.slice(0,3).map(l=>l.SENDER_COMPANY||l.SENDER_NAME||"Unknown").join(", "); return `${msg.title}. ${msg.total} leads. ${n ? `Top: ${n}.` : "None found."}`; }
  if (msg.type==="todayAction") return `Today: ${msg.leads} leads actioned, ${msg.actions} actions. Won: ${msg.wonCount}.`;
  if (msg.type==="teamTable")   return `Team overview: ${Object.keys(msg.data).length} employees.`;
  if (msg.type==="topPerformer") return msg.data[0]?`Top performer: ${msg.data[0][0]} with ${msg.data[0][1].won} wins.`:"No data.";
  if (msg.type==="sourceTable") return `${msg.total} leads, top source: ${msg.data[0]?.[0]||"unknown"}.`;
  if (msg.type==="wonTable")    return `Top: ${msg.data[0]?.[0]||"none"} with ${msg.data[0]?.[1]||0} won.`;
  return msg.title||"Data loaded.";
}
let _sp=null;
function speak(text,onStart,onEnd){
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u=new SpeechSynthesisUtterance(text);
  u.rate=1.05; u.pitch=1; u.lang="en-IN";
  const v=window.speechSynthesis.getVoices();
  const pick=v.find(x=>x.lang==="en-IN")||v.find(x=>x.lang.startsWith("en"));
  if(pick) u.voice=pick;
  u.onstart=()=>{_sp=u; onStart?.();}; u.onend=()=>{_sp=null; onEnd?.();}; u.onerror=()=>{_sp=null; onEnd?.();};
  window.speechSynthesis.speak(u);
}
function stopSpeech(){ window.speechSynthesis?.cancel(); _sp=null; }

// ─────────────────────────────────────────────────────────────
//  TYPEWRITER
// ─────────────────────────────────────────────────────────────
const TypewriterText = ({ text, speed=15, onDone, color=C.text }) => {
  const [shown, setShown] = useState("");
  const idx = useRef(0);
  useEffect(() => {
    idx.current=0; setShown("");
    const iv=setInterval(()=>{
      if (idx.current>=text.length){ clearInterval(iv); onDone?.(); return; }
      setShown(p=>p+text[idx.current++]);
    }, speed);
    return ()=>clearInterval(iv);
  },[text]);
  const done = shown.length>=text.length;
  return (
    <span style={{fontSize:13,color,lineHeight:1.65}}>
      {shown}
      {!done && <span style={{display:"inline-block",width:2,height:13,background:C.accent,marginLeft:2,verticalAlign:"middle",animation:"cursorBlink 0.7s infinite"}}/>}
    </span>
  );
};

// ─────────────────────────────────────────────────────────────
//  DATA CARD RENDERERS
// ─────────────────────────────────────────────────────────────
const scls = s => ({Won:{bg:"#dcfce7",c:"#166534"},Ongoing:{bg:"#dbeafe",c:"#1d4ed8"},Pending:{bg:"#fef9c3",c:"#854d0e"},Lost:{bg:"#fee2e2",c:"#991b1b"}}[s]||{bg:"#f1f5f9",c:"#475569"});
const fmtD = d => d?new Date(d).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"}):"—";
const fmtI = n => `₹${Number(n).toLocaleString("en-IN")}`;

const RStats = ({msg}) => (
  <div>
    <p style={{fontSize:11,color:C.muted,marginBottom:9,fontWeight:500}}>{msg.subtitle}</p>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(88px,1fr))",gap:7}}>
      {msg.stats.map((s,i)=>(
        <div key={i} style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:10,padding:"9px 7px",textAlign:"center",animation:`statPop 0.3s ${i*0.07}s both`}}>
          <div style={{fontSize:20,fontWeight:800,color:s.color}}>{s.value}</div>
          <div style={{fontSize:10,color:C.muted,marginTop:1,fontWeight:500}}>{s.label}</div>
        </div>
      ))}
    </div>
  </div>
);

const RLeadList = ({msg}) => (
  <div>
    <p style={{fontSize:11,color:C.muted,marginBottom:7,fontWeight:600}}>{msg.total} leads found</p>
    <div style={{maxHeight:360,overflowY:"auto",paddingRight:4}}>
    {msg.leads.length===0
      ? <p style={{color:C.muted,fontStyle:"italic",fontSize:13}}>No leads found.</p>
      : msg.leads.map((l,i)=>{
          const sc=scls(l.STATUS);
          return (
            <div key={i} style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:10,padding:"9px 11px",marginBottom:6,animation:`slideUp 0.22s ${i*0.05}s both`}}>
              <div style={{display:"flex",justifyContent:"space-between",gap:6}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:600,fontSize:12,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{l.SENDER_COMPANY||l.SENDER_NAME||"—"}</div>
                  <div style={{fontSize:11,color:C.muted,marginTop:1}}>
                    {l.QUERY_PRODUCT_NAME||l.SOURCE||"—"}
                    {msg.showAssigned&&l.assignedTo?.name&&<span style={{color:C.accent}}> · {l.assignedTo.name}</span>}
                  </div>
                  {l.SENDER_MOBILE&&<div style={{fontSize:10,color:C.muted}}>{l.SENDER_MOBILE}</div>}
                </div>
                <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:3,flexShrink:0}}>
                  {l.STATUS&&<span style={{background:sc.bg,color:sc.c,fontSize:9,fontWeight:700,padding:"2px 7px",borderRadius:12}}>{l.STATUS}</span>}
                  <span style={{fontSize:9,color:C.muted}}>{fmtD(l.nextFollowUpDate||l.createdAt)}</span>
                </div>
              </div>
            </div>
          );
        })
    }
    </div>
  </div>
);

const RTeamTable = ({msg}) => (
  <div style={{overflowX:"auto"}}>
    <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
      <thead><tr style={{background:C.bgDark,color:"#fff"}}>
        {["Employee","Total","Won","Ongoing","Pending","Lost"].map(h=>(
          <th key={h} style={{padding:"6px 8px",textAlign:h==="Employee"?"left":"center",fontSize:10,whiteSpace:"nowrap"}}>{h}</th>
        ))}
      </tr></thead>
      <tbody>
        {Object.entries(msg.data).map(([name,d],i)=>(
          <tr key={i} style={{borderBottom:`1px solid ${C.border}`,background:i%2?C.bgCard:C.bg,animation:`slideUp 0.2s ${i*0.04}s both`}}>
            <td style={{padding:"6px 8px",fontWeight:600,color:C.text}}>{name}</td>
            <td style={{padding:"6px 8px",textAlign:"center",fontWeight:700,color:C.accent}}>{d.total}</td>
            <td style={{padding:"6px 8px",textAlign:"center",color:C.green,fontWeight:600}}>{d.won}</td>
            <td style={{padding:"6px 8px",textAlign:"center",color:C.accent}}>{d.ongoing}</td>
            <td style={{padding:"6px 8px",textAlign:"center",color:C.amber}}>{d.pending}</td>
            <td style={{padding:"6px 8px",textAlign:"center",color:C.red}}>{d.lost}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const RTopPerformer = ({msg}) => (
  <div>
    {msg.data.length===0
      ? <p style={{color:C.muted,fontStyle:"italic",fontSize:13}}>No data available.</p>
      : msg.data.map(([name,d],i)=>(
          <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 11px",background:C.bg,border:`1px solid ${C.border}`,borderRadius:10,marginBottom:7,animation:`slideUp 0.25s ${i*0.07}s both`}}>
            <div style={{width:30,height:30,borderRadius:"50%",background:i===0?"#fef9c3":C.bgCard,border:`2px solid ${i===0?C.amber:C.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:13,color:i===0?C.amber:C.muted,flexShrink:0}}>{i+1}</div>
            <div style={{flex:1}}>
              <div style={{fontWeight:700,fontSize:12,color:C.text}}>{name}</div>
              <div style={{fontSize:10,color:C.muted}}>{d.total} leads · {fmtI(d.pipeline)}</div>
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{fontSize:18,fontWeight:800,color:C.green}}>{d.won}</div>
              <div style={{fontSize:9,color:C.muted}}>won</div>
            </div>
          </div>
        ))
    }
  </div>
);

const RSourceTable = ({msg}) => (
  <div>
    <p style={{fontSize:11,color:C.muted,marginBottom:8}}>{msg.total} leads · {msg.data.length} sources</p>
    {msg.data.map(([src,cnt],i)=>{
      const pct=Math.round((cnt/msg.total)*100);
      return (
        <div key={i} style={{marginBottom:8,animation:`slideUp 0.2s ${i*0.04}s both`}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
            <span style={{fontSize:12,fontWeight:600,color:C.text}}>{src}</span>
            <span style={{fontSize:11,color:C.muted}}>{cnt} ({pct}%)</span>
          </div>
          <div style={{height:5,background:C.border,borderRadius:4}}>
            <div style={{height:"100%",width:`${pct}%`,background:C.accent,borderRadius:4,animation:`barGrow 0.7s ${i*0.05}s both`}}/>
          </div>
        </div>
      );
    })}
  </div>
);

const RWonTable = ({msg}) => (
  <div style={{overflowX:"auto"}}>
    <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
      <thead><tr style={{background:C.bgDark,color:"#fff"}}>
        <th style={{padding:"6px 10px",textAlign:"left"}}>Employee</th>
        <th style={{padding:"6px 10px",textAlign:"center"}}>Won</th>
      </tr></thead>
      <tbody>
        {msg.data.map(([name,cnt],i)=>(
          <tr key={i} style={{borderBottom:`1px solid ${C.border}`,background:i%2?C.bgCard:C.bg,animation:`slideUp 0.2s ${i*0.04}s both`}}>
            <td style={{padding:"6px 10px",fontWeight:600,color:C.text}}>{name}</td>
            <td style={{padding:"6px 10px",textAlign:"center"}}>
              <span style={{background:"#dcfce7",color:"#166534",padding:"2px 10px",borderRadius:12,fontWeight:700,fontSize:11}}>{cnt}</span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const RTodayAction = ({msg}) => (
  <div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7,marginBottom:10}}>
      {[{label:"Leads Actioned",value:msg.leads,color:C.accent},{label:"Total Actions",value:msg.actions,color:C.purple},{label:"Won Today",value:msg.wonCount,color:C.green},{label:"Pending",value:msg.pending,color:C.amber}]
        .map((s,i)=>(
          <div key={i} style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:10,padding:"9px 10px",textAlign:"center",animation:`statPop 0.3s ${i*0.07}s both`}}>
            <div style={{fontSize:20,fontWeight:800,color:s.color}}>{s.value}</div>
            <div style={{fontSize:10,color:C.muted}}>{s.label}</div>
          </div>
        ))
      }
    </div>
    {msg.totalValue>0&&<div style={{background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:9,padding:"7px 11px",marginBottom:8}}><span style={{fontSize:12,fontWeight:700,color:"#166534"}}>Quotation Total: {fmtI(msg.totalValue)}</span></div>}
    {Object.keys(msg.steps).length>0&&(
      <div>
        <div style={{fontSize:11,fontWeight:600,color:C.muted,marginBottom:5}}>Actions by Step:</div>
        {Object.entries(msg.steps).map(([step,cnt],i)=>(
          <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"4px 0",borderBottom:`1px dashed ${C.border}`,fontSize:11}}>
            <span style={{color:C.text}}>{step}</span>
            <span style={{fontWeight:700,color:C.accent}}>{cnt}</span>
          </div>
        ))}
      </div>
    )}
  </div>
);

// ─────────────────────────────────────────────────────────────
//  BOT MESSAGE — typewriter → cards
// ─────────────────────────────────────────────────────────────
const BotMessage = ({msg, isSpeaking, onSpeakToggle, onTypeDone}) => {
  const isPlain = msg.type==="text"||msg.type==="error";
  const [showCards, setShowCards] = useState(false);
  const introText = isPlain ? (msg.text||"") : (msg.title||"Here is your data:");
  return (
    <div>
      <TypewriterText text={introText} speed={15} color={msg.type==="error"?C.red:C.text}
        onDone={()=>{ if (!isPlain) setShowCards(true); onTypeDone?.(); }} />
      {showCards&&(
        <div style={{marginTop:10}}>
          {msg.type==="stats"        && <RStats        msg={msg}/>}
          {msg.type==="leadList"     && <RLeadList     msg={msg}/>}
          {msg.type==="teamTable"    && <RTeamTable    msg={msg}/>}
          {msg.type==="topPerformer" && <RTopPerformer msg={msg}/>}
          {msg.type==="sourceTable"  && <RSourceTable  msg={msg}/>}
          {msg.type==="wonTable"     && <RWonTable     msg={msg}/>}
          {msg.type==="todayAction"  && <RTodayAction  msg={msg}/>}
        </div>
      )}
      {(showCards||isPlain)&&(
        <button onClick={onSpeakToggle} title={isSpeaking?"Stop":"Listen"}
          style={{marginTop:8,background:"transparent",border:`1px solid ${isSpeaking?C.red:C.border}`,borderRadius:20,padding:"3px 10px",fontSize:10,color:isSpeaking?C.red:C.muted,cursor:"pointer",display:"inline-flex",alignItems:"center",gap:5,transition:"all 0.15s"}}>
          {isSpeaking?<><span style={{width:7,height:7,borderRadius:2,background:C.red,display:"inline-block",animation:"speakPulse 0.6s infinite"}}/> Stop</>:<><span>🔊</span> Listen</>}
        </button>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
//  VOICE INPUT HOOK
// ─────────────────────────────────────────────────────────────
function useSpeechInput(onResult, onError) {
  const recRef = useRef(null);
  const [listening, setListening] = useState(false);
  const start = useCallback(()=>{
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
    if (!SR){onError?.("Speech recognition not supported."); return;}
    const rec=new SR(); rec.lang="en-IN"; rec.interimResults=false; rec.maxAlternatives=1;
    rec.onresult=e=>{onResult(e.results[0][0].transcript); setListening(false);};
    rec.onerror=()=>{setListening(false); onError?.("Could not understand. Please try again.");};
    rec.onend=()=>setListening(false);
    recRef.current=rec; rec.start(); setListening(true);
  },[onResult,onError]);
  const stop=useCallback(()=>{recRef.current?.stop(); setListening(false);},[]);
  return {listening,start,stop};
}

// ─────────────────────────────────────────────────────────────
//  MAIN COMPONENT
// ─────────────────────────────────────────────────────────────
export const ChatbotDrawer = ({ page="sales", employeeId=null }) => {
  const [open,       setOpen]       = useState(false);
  const [msgs,       setMsgs]       = useState([]);
  const [loading,    setLoading]    = useState(false);
  const [input,      setInput]      = useState("");
  const [speakingId, setSpeakingId] = useState(null);
  const endRef   = useRef(null);
  const { user } = useContext(UserContext);

  const questions  = QUESTIONS[page]||QUESTIONS.sales;
  const PAGE_LABEL = {sales:"My Sales",manager:"Sales Manager",marketing:"Marketing"}[page]||"Dashboard";

  const scrollBottom = () => setTimeout(()=>endRef.current?.scrollIntoView({behavior:"smooth"}),60);

  useEffect(()=>{
    if (open&&msgs.length===0) {
      setMsgs([{id:Date.now(),role:"bot",type:"text",
        text:`Hi ${user?.name?.split(" ")[0]||"there"} 👋  I'm your ${PAGE_LABEL} AI assistant. Ask me anything — like "show abhishek won leads", "hot leads this month", "team pipeline value", or speak using the mic!`,
        ts:new Date()}]);
    }
  },[open]);

  useEffect(()=>{ if (open) scrollBottom(); },[msgs,open]);

  // ── Core process ──
  const processQuestion = useCallback(async (question) => {
    if (!question.trim()) return;
    setMsgs(prev=>[...prev,{id:Date.now(),role:"user",type:"text",text:question,ts:new Date()}]);
    setLoading(true); scrollBottom();

    try {
      const intent = resolveLocalIntent(question, page);

      if (!intent.fn) {
        // Could not map — show helpful suggestions
        const greetWords = ["hello","hi","hey","good morning","good afternoon","good evening","how are","what's up"];
        const isGreet = greetWords.some(g => question.toLowerCase().includes(g));
        const replyText = isGreet
          ? `Hello! 👋 I'm your ${PAGE_LABEL} assistant. I can show you leads data, team performance, pipeline value, and more. Try asking "show won leads" or "hot leads"!`
          : `I couldn't find data for "${question}". Try asking things like:\n• "show abhishek won leads"\n• "overdue follow-ups"\n• "hot leads this month"\n• "team performance overview"`;
        setMsgs(prev=>[...prev,{id:Date.now(),role:"bot",type:"text",text:replyText,ts:new Date()}]);
      } else {
        const result = await fetchData(intent.fn, page, { employeeName: intent.employeeName, matchedSource: intent.matchedSource });
        if (result) {
          setMsgs(prev=>[...prev,{id:Date.now(),role:"bot",ts:new Date(),...result}]);
        } else {
          setMsgs(prev=>[...prev,{id:Date.now(),role:"bot",type:"error",text:"Could not load data. Please check your connection.",ts:new Date()}]);
        }
      }
    } catch(e) {
      console.error(e);
      setMsgs(prev=>[...prev,{id:Date.now(),role:"bot",type:"error",text:"Something went wrong. Please try again.",ts:new Date()}]);
    }

    setLoading(false); scrollBottom();
  },[page]);

  // Quick question (direct, skip intent resolver)
  const askQuick = useCallback(async (label, fn) => {
    setMsgs(prev=>[...prev,{id:Date.now(),role:"user",type:"text",text:label,ts:new Date()}]);
    setLoading(true); scrollBottom();
    try {
      const result = await fetchData(fn, page, {});
      if (result) setMsgs(prev=>[...prev,{id:Date.now(),role:"bot",ts:new Date(),...result}]);
    } catch {
      setMsgs(prev=>[...prev,{id:Date.now(),role:"bot",type:"error",text:"Failed to load data.",ts:new Date()}]);
    }
    setLoading(false); scrollBottom();
  },[page]);

  // Voice
  const {listening,start:startListening,stop:stopListening} = useSpeechInput(
    (t)=>{ setInput(""); processQuestion(t); },
    (e)=>setMsgs(prev=>[...prev,{id:Date.now(),role:"bot",type:"error",text:e,ts:new Date()}])
  );

  const handleSend = () => { const q=input.trim(); if(q){setInput(""); processQuestion(q);} };

  const toggleSpeak = (msg) => {
    if (speakingId===msg.id){stopSpeech();setSpeakingId(null);return;}
    stopSpeech(); speak(buildSpeakText(msg),()=>setSpeakingId(msg.id),()=>setSpeakingId(null));
  };

  const fmt = ts => ts?new Date(ts).toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit",hour12:true}):"";

  return (
    <>
      {/* FAB */}
      <button onClick={()=>{setOpen(v=>!v); if(open) stopSpeech();}} title={`${PAGE_LABEL} AI Assistant`}
        style={{position:"fixed",bottom:28,right:28,width:54,height:54,borderRadius:"50%",background:open?C.bgDark:"linear-gradient(135deg,#3b82f6,#8b5cf6)",border:"none",boxShadow:open?"0 4px 16px rgba(0,0,0,0.3)":"0 4px 24px rgba(99,102,241,0.5)",cursor:"pointer",zIndex:9998,display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.25s"}}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {open?<><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>:<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>}
        </svg>
        {!open&&<span style={{position:"absolute",top:6,right:6,width:10,height:10,borderRadius:"50%",background:C.green,border:"2px solid #fff",animation:"onlinePing 2s infinite"}}/>}
      </button>

      {/* DRAWER */}
      <div style={{position:"fixed",bottom:92,right:28,width:390,maxWidth:"calc(100vw - 40px)",height:600,maxHeight:"calc(100vh - 120px)",background:C.bg,border:`1px solid ${C.border}`,borderRadius:18,boxShadow:"0 24px 72px rgba(0,0,0,0.18)",zIndex:9997,display:open?"flex":"none",flexDirection:"column",overflow:"hidden",fontFamily:"'Segoe UI',system-ui,sans-serif",animation:open?"drawerIn 0.28s cubic-bezier(0.16,1,0.3,1)":"none"}}>

        {/* Header */}
        <div style={{background:"linear-gradient(135deg,#0f172a,#1e293b)",padding:"14px 16px",display:"flex",alignItems:"center",gap:10,flexShrink:0,position:"relative",overflow:"hidden"}}>
          <div style={{position:"absolute",inset:0,opacity:0.05,backgroundImage:"radial-gradient(circle,#fff 1px,transparent 1px)",backgroundSize:"18px 18px",pointerEvents:"none"}}/>
          <div style={{width:38,height:38,borderRadius:"50%",background:"linear-gradient(135deg,#3b82f6,#8b5cf6)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,boxShadow:"0 0 14px rgba(99,102,241,0.5)"}}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          </div>
          <div style={{flex:1}}>
            <div style={{color:"#fff",fontWeight:700,fontSize:14}}>{PAGE_LABEL} AI Assistant</div>
            <div style={{color:"#94a3b8",fontSize:11,display:"flex",alignItems:"center",gap:5,marginTop:1}}>
              <span style={{width:6,height:6,borderRadius:"50%",background:C.green,display:"inline-block",animation:"onlinePing 2s infinite"}}/>
              Smart NLP · Live DB · Voice enabled
            </div>
          </div>
          <button onClick={()=>setMsgs([])} style={{background:"rgba(255,255,255,0.07)",border:"1px solid rgba(255,255,255,0.12)",borderRadius:8,color:"#94a3b8",cursor:"pointer",padding:"4px 10px",fontSize:11}}>Clear</button>
        </div>

        {/* Quick questions */}
        <div style={{padding:"10px 12px 0",borderBottom:`1px solid ${C.border}`,flexShrink:0}}>
          <div style={{fontSize:10,color:C.muted,fontWeight:700,marginBottom:6,letterSpacing:"0.8px",textTransform:"uppercase"}}>Quick Questions</div>
          <div style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:10,scrollbarWidth:"none"}}>
            {questions.map((q,i)=>(
              <button key={i} disabled={loading} onClick={()=>askQuick(q.label,q.fn)}
                style={{flexShrink:0,padding:"5px 11px",background:C.bgCard,border:`1px solid ${C.border}`,borderRadius:20,fontSize:11,color:C.text,cursor:loading?"not-allowed":"pointer",whiteSpace:"nowrap",fontWeight:500,opacity:loading?0.5:1,transition:"all 0.15s"}}>
                {q.icon} {q.label}
              </button>
            ))}
          </div>
        </div>

        {/* Messages */}
        <div style={{flex:1,overflowY:"auto",padding:"14px 12px 8px",display:"flex",flexDirection:"column",gap:14}}>
          {msgs.map(msg=>(
            <div key={msg.id} style={{display:"flex",flexDirection:msg.role==="user"?"row-reverse":"row",gap:8,alignItems:"flex-start"}}>
              {msg.role==="bot"&&(
                <div style={{width:30,height:30,borderRadius:"50%",background:"linear-gradient(135deg,#3b82f6,#8b5cf6)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:2,boxShadow:"0 2px 8px rgba(99,102,241,0.3)"}}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                </div>
              )}
              {msg.role==="user"&&(
                <div style={{width:28,height:28,borderRadius:"50%",background:"#e0e7ff",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:11,fontWeight:700,color:"#3730a3"}}>
                  {(user?.name?.[0]||"U").toUpperCase()}
                </div>
              )}
              <div style={{maxWidth:"82%",minWidth:60}}>
                <div style={{background:msg.role==="user"?"linear-gradient(135deg,#3b82f6,#6366f1)":C.bgCard,color:msg.role==="user"?"#fff":C.text,border:`1px solid ${msg.role==="user"?"transparent":C.border}`,borderRadius:msg.role==="user"?"16px 16px 4px 16px":"16px 16px 16px 4px",padding:"10px 13px",boxShadow:msg.role==="user"?"0 2px 12px rgba(59,130,246,0.25)":"none"}}>
                  {msg.role==="user"
                    ? <p style={{fontSize:13,margin:0,lineHeight:1.55}}>{msg.text}</p>
                    : <BotMessage msg={msg} isSpeaking={speakingId===msg.id} onSpeakToggle={()=>toggleSpeak(msg)} onTypeDone={scrollBottom}/>
                  }
                </div>
                <div style={{fontSize:10,color:C.muted,marginTop:3,textAlign:msg.role==="user"?"right":"left"}}>{fmt(msg.ts)}</div>
              </div>
            </div>
          ))}

          {loading&&(
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              <div style={{width:30,height:30,borderRadius:"50%",background:"linear-gradient(135deg,#3b82f6,#8b5cf6)",display:"flex",alignItems:"center",justifyContent:"center"}}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              </div>
              <div style={{background:C.bgCard,border:`1px solid ${C.border}`,borderRadius:"16px 16px 16px 4px",padding:"12px 16px",display:"flex",gap:5,alignItems:"center"}}>
                {[0,0.18,0.36].map((d,i)=>(
                  <span key={i} style={{width:7,height:7,borderRadius:"50%",background:C.accent,display:"inline-block",animation:`typBounce 1.2s ${d}s infinite`}}/>
                ))}
              </div>
            </div>
          )}
          <div ref={endRef}/>
        </div>

        {/* Input */}
        <div style={{padding:"8px 12px 14px",borderTop:`1px solid ${C.border}`,display:"flex",gap:8,flexShrink:0,alignItems:"center"}}>
          <input value={input} onChange={e=>setInput(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&handleSend()}
            placeholder={listening?"🎙  Listening…":"Ask e.g. 'abhishek won leads', 'hot leads'…"}
            disabled={loading||listening}
            style={{flex:1,background:listening?"#f0fdf4":C.bgCard,border:`1.5px solid ${listening?C.green:C.border}`,borderRadius:12,padding:"9px 14px",fontSize:13,color:C.text,outline:"none",fontFamily:"inherit",transition:"border-color 0.2s"}}/>
          <button onClick={()=>listening?stopListening():startListening()} title={listening?"Stop":"Speak"}
            style={{width:38,height:38,borderRadius:"50%",background:listening?"linear-gradient(135deg,#ef4444,#dc2626)":C.bgCard,border:`1.5px solid ${listening?C.red:C.border}`,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,boxShadow:listening?"0 0 0 5px rgba(239,68,68,0.18)":"none",transition:"all 0.2s"}}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={listening?"#fff":C.muted} strokeWidth="2" strokeLinecap="round">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
              <line x1="12" y1="19" x2="12" y2="23"/>
              <line x1="8" y1="23" x2="16" y2="23"/>
            </svg>
          </button>
          <button onClick={handleSend} disabled={loading||!input.trim()||listening}
            style={{width:38,height:38,borderRadius:12,background:loading||!input.trim()?"#e2e8f0":"linear-gradient(135deg,#3b82f6,#6366f1)",border:"none",cursor:loading||!input.trim()?"not-allowed":"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,boxShadow:!loading&&input.trim()?"0 2px 10px rgba(59,130,246,0.35)":"none",transition:"all 0.15s"}}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>
      </div>

      <style>{`
        @keyframes typBounce   {0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-6px)}}
        @keyframes cursorBlink {0%,100%{opacity:1}50%{opacity:0}}
        @keyframes statPop     {from{opacity:0;transform:scale(0.82)}to{opacity:1;transform:scale(1)}}
        @keyframes slideUp     {from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes barGrow     {from{width:0%}}
        @keyframes drawerIn    {from{opacity:0;transform:translateY(20px) scale(0.96)}to{opacity:1;transform:none}}
        @keyframes onlinePing  {0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.5);opacity:0.5}}
        @keyframes speakPulse  {0%,100%{opacity:1}50%{opacity:0.3}}
      `}</style>
    </>
  );
};

export default ChatbotDrawer;

// ================================================================
//  INTEGRATION — same as before
// ================================================================
//  SalesMasterGrid.jsx        → <ChatbotDrawer page="sales" />
//  SalesManagerMasterGrid.jsx → <ChatbotDrawer page="manager" employeeId={selectedEmployee?._id} />
//  MarketingMasterGrid.jsx    → <ChatbotDrawer page="marketing" />
// ================================================================