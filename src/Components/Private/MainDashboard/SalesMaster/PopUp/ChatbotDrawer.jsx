import { useState, useRef, useEffect, useCallback, useContext } from "react";
import axios from "axios";
import { UserContext } from "../../../../../context/UserContext";

const API   = process.env.REACT_APP_API_URL;
const token = () => localStorage.getItem("token");
const AUTH  = () => ({ Authorization: `Bearer ${token()}` });

const BRAND = {
  navy:        "#0A1628", navyMid:    "#0F2040", navyLight:  "#162B50",
  accent:      "#00C2FF", accentDim:  "rgba(0,194,255,0.12)",
  accentGlow:  "rgba(0,194,255,0.35)", accentDark: "#0097CC",
  gold:        "#FFB830", green:      "#00E396", red:        "#FF4560",
  amber:       "#FEB019", purple:     "#775DD0",
  bg:          "#0A1628", bgCard:     "#0F2040", bgCardHover:"#162B50",
  border:      "rgba(0,194,255,0.18)", borderStrong:"rgba(0,194,255,0.4)",
  text:        "#E8F4FD", textMuted:  "#7A9BBC", textDim:    "#4A6880",
};

const LOGO_PATH = `${process.env.PUBLIC_URL}/static/assets/img/Proclient360_Originalon.svg`;
const ProClient360Logo = ({ size = 36 }) => (
  <img src={LOGO_PATH} alt="ProClient360" width={size} height={size}
    style={{ objectFit:"contain", display:"block", borderRadius:"50%" }} />
);

const QUESTIONS = {
  sales: [
    { icon:"📊", label:"Today's follow-up leads", fn:"todayFollowup"    },
    { icon:"⚡", label:"Today's action summary",  fn:"todayAction"      },
    { icon:"🏆", label:"All won leads",            fn:"allWonLeads"      },
    { icon:"🏅", label:"Won this month",           fn:"wonThisMonth"     },
    { icon:"🔥", label:"Hot leads",                fn:"hotLeads"         },
    { icon:"⏰", label:"Overdue follow-ups",       fn:"overdueFollowups" },
    { icon:"📈", label:"Pipeline value",           fn:"pipelineValue"    },
    { icon:"❌", label:"All lost leads",           fn:"allLostLeads"     },
  ],
  manager: [
    { icon:"👥", label:"Team performance",        fn:"teamOverview"     },
    { icon:"🏆", label:"Top performer",           fn:"topPerformer"     },
    { icon:"📋", label:"All leads summary",       fn:"allLeadsSummary"  },
    { icon:"🏆", label:"All won leads",           fn:"allWonLeads"      },
    { icon:"❌", label:"All lost leads",          fn:"allLostLeads"     },
    { icon:"🔥", label:"Team hot leads",          fn:"teamHotLeads"     },
    { icon:"📈", label:"Team pipeline",           fn:"teamPipeline"     },
    { icon:"🏅", label:"Won by employee",         fn:"wonByEmployee"    },
  ],
  marketing: [
    { icon:"📥", label:"Leads today",             fn:"totalToday"       },
    { icon:"✅", label:"Feasible ratio",          fn:"feasibleRatio"    },
    { icon:"📞", label:"Unanswered calls",        fn:"unanswered"       },
    { icon:"🌐", label:"Leads by source",         fn:"bySource"         },
    { icon:"⏳", label:"Pending leads",           fn:"pendingLeads"     },
    { icon:"📅", label:"Leads this week",         fn:"thisWeek"         },
    { icon:"🔁", label:"Recently assigned",       fn:"recentAssigned"   },
    { icon:"📊", label:"Overall stats",           fn:"marketingStats"   },
  ],
};

/* ─────────────────────────────────────────────────────────────
   INTENT RESOLVER
   Sales page: never resolves employee-specific fns (blocked)
   Manager page: resolves all fns including employee-specific
───────────────────────────────────────────────────────────── */
function resolveLocalIntent(q, page) {
  const raw = q.toLowerCase().trim();
  const has = (...words) => words.some(w => raw.includes(w));

  // Detect employee name in query
  let employeeName = null;
  const empPatterns = [
    /employee\s+([a-z]+)/i,
    /for\s+([a-z]+)(?:'s)?\s+leads?/i,
    /([a-z]+)'s\s+leads?/i,
    /([a-z]+)\s+(?:won|lost|ongoing|pending|hot|warm|cold)\s+leads?/i,
    /leads?\s+(?:of|by|for)\s+([a-z]+)/i,
    /show\s+(?:me\s+)?([a-z]+)\s+leads?/i,
  ];
  const skipWords = ["the","all","my","our","team","today","this","last","show","view","give","get"];
  for (const pat of empPatterns) {
    const m = raw.match(pat);
    if (m && m[1] && m[1].length > 2 && !skipWords.includes(m[1])) {
      employeeName = m[1].charAt(0).toUpperCase() + m[1].slice(1).toLowerCase();
      break;
    }
  }

  const sources = ["indiamart","tradeindia","facebook","linkedin","google","direct","referral","website","justdial","whatsapp","cold call","walk-in","exhibitions","tender"];
  const matchedSource = sources.find(s => raw.includes(s));

  const isWon      = has("won","win","closed","success");
  const isLost     = has("lost","lose","failed","dropped");
  const isOngoing  = has("ongoing","in progress","active","running");
  const isPending  = has("pending","waiting","not started","new lead");
  const isHot      = has("hot lead","hot leads","hotlead");
  const isWarm     = has("warm lead","warm leads");
  const isCold     = has("cold lead","cold leads");
  const isToday    = has("today","todays","this day");
  const isThisWeek = has("this week","weekly","week");
  const isThisMonth= has("this month","monthly","month");
  const isOverdue  = has("overdue","missed","past due","missed follow");
  const isFollowUp = has("follow up","followup","follow-up","follow");
  const isPipeline = has("pipeline","value","quotation","revenue","amount","money","rupee","₹");
  const isTeam     = has("team","employee","staff","member");
  const isTopPerf  = has("top performer","best performer","highest","leaderboard","rank");
  const isSource   = has("source","channel","platform","from where");
  const isFeasible = has("feasible","not feasible","nonfeasible","feasibility");
  const isUnanswd  = has("unanswered","no answer","not picked");
  const isAssigned = has("assigned","assign","unassigned");
  const isAll      = has("all","overall","entire","every","complete","grand total","full");
  const isCount    = has("count","how many","total","number","how much");

  let fn = null, label = "";

  // ── Employee-specific query ──
  if (employeeName) {
    // SALES PAGE: block completely — a sales employee cannot see others' data
    if (page === "sales") {
      return {
        fn: null, employeeName: null, matchedSource, label: "",
        blockedMsg: "⛔ You can only view your own leads on the Sales Dashboard. Try asking \"my won leads\", \"my hot leads\", or \"my pipeline value\" instead.",
      };
    }
    // MANAGER PAGE: resolve normally
    if (isWon)           { fn = "employeeWon";     label = `Won leads — ${employeeName}`;     }
    else if (isLost)     { fn = "employeeLost";    label = `Lost leads — ${employeeName}`;    }
    else if (isOngoing)  { fn = "employeeOngoing"; label = `Ongoing leads — ${employeeName}`; }
    else if (isPending)  { fn = "employeePending"; label = `Pending leads — ${employeeName}`; }
    else if (isHot)      { fn = "employeeHot";     label = `Hot leads — ${employeeName}`;     }
    else if (isOverdue)  { fn = "employeeOverdue"; label = `Overdue — ${employeeName}`;       }
    else                 { fn = "employeeAll";     label = `All leads — ${employeeName}`;     }
    return { fn, employeeName, matchedSource, label };
  }

  // ── Source-specific query ──
  if (matchedSource && !isTeam && !isTopPerf) {
    fn = "bySource";
    label = `Leads from ${matchedSource.charAt(0).toUpperCase() + matchedSource.slice(1)}`;
    return { fn, employeeName: null, matchedSource, label };
  }

  // ── Sales page ──
  if (page === "sales") {
    if      (isToday && isFollowUp)                   { fn = "todayFollowup";    label = "Today's follow-up leads"; }
    else if (isToday && has("action","activity"))      { fn = "todayAction";      label = "Today's action summary";  }
    else if (isWon   && isThisMonth)                   { fn = "wonThisMonth";     label = "Won this month";          }
    else if (isWon   && (isAll||isCount))              { fn = "allWonLeads";      label = "All won leads";           }
    else if (isWon)                                    { fn = "allWonLeads";      label = "Won leads";               }
    else if (isLost  && (isAll||isCount))              { fn = "allLostLeads";     label = "All lost leads";          }
    else if (isLost)                                   { fn = "allLostLeads";     label = "Lost leads";              }
    else if (isOverdue)                                { fn = "overdueFollowups"; label = "Overdue follow-ups";      }
    else if (isHot)                                    { fn = "hotLeads";         label = "Hot leads";               }
    else if (isWarm)                                   { fn = "warmLeads";        label = "Warm leads";              }
    else if (isCold)                                   { fn = "coldLeads";        label = "Cold leads";              }
    else if (isOngoing)                                { fn = "ongoingLeads";     label = "Ongoing leads";           }
    else if (isPending)                                { fn = "pendingLeads";     label = "Pending leads";           }
    else if (isPipeline)                               { fn = "pipelineValue";    label = "Pipeline value";          }
    else if (isFollowUp)                               { fn = "overdueFollowups"; label = "Follow-up leads";         }
    else if (isThisWeek)                               { fn = "thisWeek";         label = "Leads this week";         }
    else if (isSource)                                 { fn = "bySource";         label = "Leads by source";         }
    else if (has("summary","overview","stats","total","all leads","how many")) { fn = "statusBreakdown"; label = "Leads summary"; }
    else if (isToday)                                  { fn = "todayAction";      label = "Today's activity";        }
  }

  // ── Manager page ──
  if (page === "manager") {
    if      (isTopPerf)                                { fn = "topPerformer";   label = "Top performers";           }
    else if (isTeam && isPipeline)                     { fn = "teamPipeline";   label = "Team pipeline";            }
    else if (isTeam && isHot)                          { fn = "teamHotLeads";   label = "Team hot leads";           }
    else if (has("won by","won per","who won"))         { fn = "wonByEmployee";  label = "Won by employee";          }
    else if (isWon   && (isAll||isCount))              { fn = "allWonLeads";    label = "All won leads";            }
    else if (isWon)                                    { fn = "allWonLeads";    label = "Won leads";                }
    else if (isLost  && (isAll||isCount))              { fn = "allLostLeads";   label = "All lost leads";           }
    else if (isLost)                                   { fn = "allLostLeads";   label = "Lost leads";               }
    else if (isOverdue)                                { fn = "teamOverdue";    label = "Overdue follow-ups";       }
    else if (isOngoing)                                { fn = "ongoingLeads";   label = "Ongoing leads";            }
    else if (isPipeline)                               { fn = "teamPipeline";   label = "Team pipeline";            }
    else if (isSource)                                 { fn = "bySource";       label = "Leads by source";          }
    else if (has("overview","performance","team summary")) { fn = "teamOverview";  label = "Team overview";         }
    else if (has("summary","stats","all leads","total","how many")) { fn = "allLeadsSummary"; label = "All leads summary"; }
  }

  // ── Marketing page ──
  if (page === "marketing") {
    if      (isFeasible)                               { fn = "feasibleRatio";  label = "Feasibility breakdown";    }
    else if (isUnanswd)                                { fn = "unanswered";     label = "Unanswered leads";         }
    else if (isAssigned)                               { fn = "recentAssigned"; label = "Assigned leads";           }
    else if (isToday)                                  { fn = "totalToday";     label = "Leads today";              }
    else if (isThisWeek)                               { fn = "thisWeek";       label = "Leads this week";          }
    else if (isSource)                                 { fn = "bySource";       label = "Leads by source";          }
    else if (has("stats","summary","overview","total","how many","all leads")) { fn = "marketingStats"; label = "Marketing overview"; }
  }

  // ── Cross-page fallbacks ──
  if (!fn) {
    if      (isTopPerf)  { fn = "topPerformer";  label = "Top performers";  }
    else if (isWon)      { fn = "allWonLeads";   label = "Won leads";       }
    else if (isLost)     { fn = "allLostLeads";  label = "Lost leads";      }
    else if (isHot)      { fn = page === "manager" ? "teamHotLeads" : "hotLeads"; label = "Hot leads"; }
    else if (isOverdue)  { fn = page === "manager" ? "teamOverdue"  : "overdueFollowups"; label = "Overdue"; }
    else if (isPipeline) { fn = page === "manager" ? "teamPipeline" : "pipelineValue"; label = "Pipeline value"; }
    else if (isOngoing)  { fn = "ongoingLeads";  label = "Ongoing leads";   }
    else if (isPending)  { fn = "pendingLeads";  label = "Pending leads";   }
    else if (isSource)   { fn = "bySource";      label = "Leads by source"; }
    else if (isThisWeek) { fn = "thisWeek";      label = "This week's leads";}
    else if (isFollowUp) { fn = page === "sales" ? "todayFollowup" : "teamOverdue"; label = "Follow-up leads"; }
    else if (has("summary","overview","stats","total","count","all","how many")) {
      fn = page === "manager" ? "allLeadsSummary" : page === "marketing" ? "marketingStats" : "statusBreakdown";
      label = "Summary";
    }
  }

  return { fn, employeeName: null, matchedSource, label };
}

/* ─────────────────────────────────────────────────────────────
   DATA FETCHERS
   KEY RULE:
     Sales page   → ALWAYS uses myL (/api/leads/my-leads)
                    → Only the logged-in employee's own leads
     Manager page → uses allL (/api/leads/all-leads)
     Marketing    → uses mktL (/api/leads)
───────────────────────────────────────────────────────────── */
async function fetchData(fn, page, options = {}) {
  const h    = AUTH();
  const myL  = `${API}/api/leads/my-leads`;
  const allL = `${API}/api/leads/all-leads`;
  const mktL = `${API}/api/leads`;
  const { employeeName, matchedSource } = options;

  // ── Employee-specific (manager only — sales is already blocked at intent level) ──
  if (fn.startsWith("employee")) {
    if (page === "sales") {
      return { type:"text", text:"⛔ You can only view your own leads on the Sales Dashboard. Try \"my won leads\", \"my hot leads\", or \"my pipeline value\" instead." };
    }
    const r = await axios.get(allL, { headers: h, params: { limit:99999, page:1 } });
    let leads = r.data?.leads || [];
    if (employeeName) leads = leads.filter(l => l.assignedTo?.name?.toLowerCase().includes(employeeName.toLowerCase()));
    const statusMap = { employeeWon:"Won", employeeLost:"Lost", employeeOngoing:"Ongoing", employeePending:"Pending" };
    if (statusMap[fn]) leads = leads.filter(l => l.STATUS === statusMap[fn]);
    if (fn === "employeeHot")    leads = leads.filter(l => l.callLeads === "Hot Leads" || l.CALL_LEADS === "Hot Leads");
    if (fn === "employeeOverdue") leads = leads.filter(l =>
      l.nextFollowUpDate && l.STATUS !== "Won" && l.STATUS !== "Lost" &&
      new Date(l.nextFollowUpDate) < new Date(new Date().setHours(0,0,0,0))
    );
    const sLabel = { employeeWon:"Won", employeeLost:"Lost", employeeOngoing:"Ongoing", employeePending:"Pending", employeeHot:"Hot", employeeOverdue:"Overdue", employeeAll:"All" }[fn] || "All";
    return buildLeadList(`${sLabel} Leads — ${employeeName || "Employee"} (${leads.length})`, leads, true);
  }

  // ── Source filter ──
  if (fn === "bySource" && matchedSource) {
    const url = page === "sales" ? myL : page === "manager" ? allL : mktL;
    const r = await axios.get(url, { headers: h, params: { source: matchedSource, limit:99999, page:1 } });
    const leads = r.data?.leads || [];
    return buildLeadList(`Leads from ${matchedSource.charAt(0).toUpperCase() + matchedSource.slice(1)} (${leads.length})`, leads, page !== "sales");
  }

  switch (fn) {

    // ── Today follow-up (always myL — sales employee's own) ──
    case "todayFollowup": {
      const r = await axios.get(myL, { headers:h, params:{ followUpToday:"true", limit:99999, page:1 } });
      return buildLeadList("Today's Follow-up Leads", r.data?.leads || []);
    }

    // ── Today action (always myL) ──
    case "todayAction": {
      const r = await axios.get(myL, { headers:h, params:{ todayAction:"true", limit:99999, page:1 } });
      const leads = r.data?.leads || [];
      const today = new Date().toDateString();
      const actions = leads.flatMap(l => (l.previousActions||[]).filter(a => new Date(a.createdAt).toDateString() === today));
      return buildTodayAction(leads, actions);
    }

    // ── Overdue: sales→myL, manager→allL ──
    case "overdueFollowups": {
      const r = await axios.get(myL, { headers:h, params:{ limit:99999, page:1 } });
      const filtered = (r.data?.leads||[]).filter(l =>
        l.nextFollowUpDate && l.STATUS !== "Won" && l.STATUS !== "Lost" &&
        new Date(l.nextFollowUpDate) < new Date(new Date().setHours(0,0,0,0))
      );
      return buildLeadList(`Overdue Follow-ups (${filtered.length})`, filtered, false);
    }
    case "teamOverdue": {
      const r = await axios.get(allL, { headers:h, params:{ limit:99999, page:1 } });
      const filtered = (r.data?.leads||[]).filter(l =>
        l.nextFollowUpDate && l.STATUS !== "Won" && l.STATUS !== "Lost" &&
        new Date(l.nextFollowUpDate) < new Date(new Date().setHours(0,0,0,0))
      );
      return buildLeadList(`Team Overdue Follow-ups (${filtered.length})`, filtered, true);
    }

    // ── Won leads: sales→myL only, manager→allL ──
    case "allWonLeads": {
      const url = page === "sales" ? myL : allL;
      const r = await axios.get(url, { headers:h, params:{ status:"Won", limit:99999, page:1 } });
      const leads = r.data?.leads || [];
      return buildLeadList(`${page === "sales" ? "My " : ""}Won Leads (${leads.length})`, leads, page !== "sales");
    }

    // ── Lost leads: sales→myL only, manager→allL ──
    case "allLostLeads": {
      const url = page === "sales" ? myL : allL;
      const r = await axios.get(url, { headers:h, params:{ status:"Lost", limit:99999, page:1 } });
      const leads = r.data?.leads || [];
      return buildLeadList(`${page === "sales" ? "My " : ""}Lost Leads (${leads.length})`, leads, page !== "sales");
    }

    // ── Won this month (always myL) ──
    case "wonThisMonth": {
      const r = await axios.get(myL, { headers:h, params:{ status:"Won", limit:99999, page:1 } });
      const now = new Date();
      const filtered = (r.data?.leads||[]).filter(l => {
        const d = new Date(l.updatedAt || l.createdAt);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      });
      return buildLeadList(`My Won Leads This Month (${filtered.length})`, filtered, false);
    }

    // ── Hot leads: sales→myL, manager→allL (separate cases) ──
    case "hotLeads": {
      const r = await axios.get(myL, { headers:h, params:{ callLeads:"Hot Leads", limit:99999, page:1 } });
      return buildLeadList(`My Hot Leads (${(r.data?.leads||[]).length})`, r.data?.leads||[], false);
    }
    case "teamHotLeads": {
      const r = await axios.get(allL, { headers:h, params:{ callLeads:"Hot Leads", limit:99999, page:1 } });
      return buildLeadList(`Team Hot Leads (${(r.data?.leads||[]).length})`, r.data?.leads||[], true);
    }

    // ── Warm/Cold: sales→myL, others→their base ──
    case "warmLeads": {
      const url = page === "sales" ? myL : page === "manager" ? allL : mktL;
      const r = await axios.get(url, { headers:h, params:{ callLeads:"Warm Leads", limit:99999, page:1 } });
      return buildLeadList(`Warm Leads (${(r.data?.leads||[]).length})`, r.data?.leads||[], page !== "sales");
    }
    case "coldLeads": {
      const url = page === "sales" ? myL : page === "manager" ? allL : mktL;
      const r = await axios.get(url, { headers:h, params:{ callLeads:"Cold Leads", limit:99999, page:1 } });
      return buildLeadList(`Cold Leads (${(r.data?.leads||[]).length})`, r.data?.leads||[], page !== "sales");
    }

    // ── Ongoing/Pending: sales→myL, manager→allL ──
    case "ongoingLeads": {
      const url = page === "sales" ? myL : page === "manager" ? allL : mktL;
      const r = await axios.get(url, { headers:h, params:{ status:"Ongoing", limit:99999, page:1 } });
      return buildLeadList(`${page === "sales" ? "My " : ""}Ongoing Leads (${(r.data?.leads||[]).length})`, r.data?.leads||[], page !== "sales");
    }
    case "pendingLeads": {
      const url = page === "sales" ? myL : page === "manager" ? allL : mktL;
      const r = await axios.get(url, { headers:h, params:{ status:"Pending", limit:99999, page:1 } });
      return buildLeadList(`${page === "sales" ? "My " : ""}Pending Leads (${(r.data?.leads||[]).length})`, r.data?.leads||[], page !== "sales");
    }

    // ── Pipeline: sales→myL, manager→allL (separate cases) ──
    case "pipelineValue": {
      const r = await axios.get(myL, { headers:h, params:{ limit:99999, page:1 } });
      const leads = (r.data?.leads||[]).filter(l => l.STATUS !== "Lost");
      const total = leads.reduce((s,l) => s + ((l.previousActions||[]).reduce((a,act) => a+(Number(act.quotation)||0),0)),0);
      return { type:"stats", title:"My Pipeline Value", subtitle:"Your active pipeline excluding lost leads.", stats:[
        { label:"My Active Leads", value:leads.length, color:BRAND.accent },
        { label:"Total Value",     value:`₹${total.toLocaleString("en-IN")}`, color:BRAND.green },
        { label:"Avg per Lead",    value:leads.length ? `₹${Math.round(total/leads.length).toLocaleString("en-IN")}` : "₹0", color:BRAND.gold },
      ]};
    }
    case "teamPipeline": {
      const r = await axios.get(allL, { headers:h, params:{ limit:99999, page:1 } });
      const leads = (r.data?.leads||[]).filter(l => l.STATUS !== "Lost");
      const total = leads.reduce((s,l) => s + ((l.previousActions||[]).reduce((a,act) => a+(Number(act.quotation)||0),0)),0);
      return { type:"stats", title:"Team Pipeline Value", subtitle:"All employees' active pipeline excluding lost.", stats:[
        { label:"Active Leads", value:leads.length, color:BRAND.accent },
        { label:"Total Value",  value:`₹${total.toLocaleString("en-IN")}`, color:BRAND.green },
        { label:"Avg per Lead", value:leads.length ? `₹${Math.round(total/leads.length).toLocaleString("en-IN")}` : "₹0", color:BRAND.gold },
      ]};
    }

    // ── Status breakdown: sales→myL, manager→allL (separate cases) ──
    case "statusBreakdown": {
      const r = await axios.get(myL, { headers:h, params:{ limit:99999, page:1 } });
      const leads = r.data?.leads || [];
      const c = { Won:0, Ongoing:0, Pending:0, Lost:0 };
      leads.forEach(l => { if (c[l.STATUS] !== undefined) c[l.STATUS]++; });
      return { type:"stats", title:"My Leads Summary", subtitle:"Your personal lead status breakdown.", stats:[
        { label:"Total",   value:leads.length, color:BRAND.accent },
        { label:"Ongoing", value:c.Ongoing,    color:BRAND.accent },
        { label:"Pending", value:c.Pending,    color:BRAND.amber  },
        { label:"Won",     value:c.Won,        color:BRAND.green  },
        { label:"Lost",    value:c.Lost,       color:BRAND.red    },
      ]};
    }
    case "allLeadsSummary": {
      const r = await axios.get(allL, { headers:h, params:{ limit:99999, page:1 } });
      const leads = r.data?.leads || [];
      const c = { Won:0, Ongoing:0, Pending:0, Lost:0 };
      leads.forEach(l => { if (c[l.STATUS] !== undefined) c[l.STATUS]++; });
      return { type:"stats", title:"All Leads Summary", subtitle:"Complete team lead status breakdown.", stats:[
        { label:"Total",   value:leads.length, color:BRAND.accent },
        { label:"Ongoing", value:c.Ongoing,    color:BRAND.accent },
        { label:"Pending", value:c.Pending,    color:BRAND.amber  },
        { label:"Won",     value:c.Won,        color:BRAND.green  },
        { label:"Lost",    value:c.Lost,       color:BRAND.red    },
      ]};
    }

    // ── Team overview (manager only) ──
    case "teamOverview": {
      const r = await axios.get(allL, { headers:h, params:{ limit:99999, page:1 } });
      const byEmp = {};
      (r.data?.leads||[]).forEach(l => {
        const n = l.assignedTo?.name || "Unassigned";
        if (!byEmp[n]) byEmp[n] = { total:0, won:0, ongoing:0, pending:0, lost:0 };
        byEmp[n].total++;
        if (l.STATUS === "Won")     byEmp[n].won++;
        if (l.STATUS === "Ongoing") byEmp[n].ongoing++;
        if (l.STATUS === "Pending") byEmp[n].pending++;
        if (l.STATUS === "Lost")    byEmp[n].lost++;
      });
      return { type:"teamTable", title:"Team Performance Overview", data:byEmp };
    }

    // ── Top performer (manager only) ──
    case "topPerformer": {
      const r = await axios.get(allL, { headers:h, params:{ limit:99999, page:1 } });
      const byEmp = {};
      (r.data?.leads||[]).forEach(l => {
        if (!l.assignedTo?.name) return;
        const n = l.assignedTo.name;
        if (!byEmp[n]) byEmp[n] = { total:0, won:0, pipeline:0 };
        byEmp[n].total++;
        if (l.STATUS === "Won") byEmp[n].won++;
        byEmp[n].pipeline += (l.previousActions||[]).reduce((s,a) => s+(Number(a.quotation)||0),0);
      });
      return { type:"topPerformer", title:"Top Performers", data:Object.entries(byEmp).sort((a,b) => b[1].won - a[1].won).slice(0,5) };
    }

    // ── Won by employee (manager only) ──
    case "wonByEmployee": {
      const r = await axios.get(allL, { headers:h, params:{ status:"Won", limit:99999, page:1 } });
      const byEmp = {};
      (r.data?.leads||[]).forEach(l => { const n = l.assignedTo?.name||"Unassigned"; byEmp[n]=(byEmp[n]||0)+1; });
      return { type:"wonTable", title:"Won Deals by Employee", data:Object.entries(byEmp).sort((a,b) => b[1]-a[1]) };
    }

    // ── By source: sales→myL, manager→allL, marketing→mktL ──
    case "bySource": {
      const url = page === "sales" ? myL : page === "manager" ? allL : mktL;
      const r = await axios.get(url, { headers:h, params:{ limit:99999, page:1 } });
      const leads = r.data?.leads || [];
      const bySrc = {};
      leads.forEach(l => { const s = l.SOURCE||"Unknown"; bySrc[s]=(bySrc[s]||0)+1; });
      return { type:"sourceTable", title: page==="sales" ? "My Leads by Source" : "Leads by Source", data:Object.entries(bySrc).sort((a,b) => b[1]-a[1]), total:leads.length };
    }

    // ── This week: sales→myL, manager→allL ──
    case "thisWeek": {
      const url = page === "sales" ? myL : page === "manager" ? allL : mktL;
      const r = await axios.get(url, { headers:h, params:{ limit:99999, page:1 } });
      const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate()-7);
      const filtered = (r.data?.leads||[]).filter(l => new Date(l.QUERY_TIME||l.createdAt) >= weekAgo);
      return buildLeadList(`${page==="sales"?"My ":""}Leads This Week (${filtered.length})`, filtered, page !== "sales");
    }

    // ── Marketing-specific ──
    case "totalToday": {
      const today = new Date().toISOString().split("T")[0];
      const r = await axios.get(mktL, { headers:h, params:{ date:today, limit:99999, page:1 } });
      return buildLeadList("Leads Today", r.data?.leads||[]);
    }
    case "feasibleRatio": {
      const r = await axios.get(mktL, { headers:h, params:{ limit:99999, page:1 } });
      const leads = r.data?.leads || [];
      const feas  = leads.filter(l => l.callStatus==="Feasible"   || l.isFeasible).length;
      const notF  = leads.filter(l => l.callStatus==="NotFeasible"|| l.isNotFeasible).length;
      const unans = leads.filter(l => l.callHistory?.length>0 && !l.isFeasible && !l.isNotFeasible).length;
      return { type:"stats", title:"Feasibility Breakdown", subtitle:"Call feasibility status.", stats:[
        { label:"Feasible",     value:feas,  color:BRAND.green  },
        { label:"Not Feasible", value:notF,  color:BRAND.red    },
        { label:"Unanswered",   value:unans, color:BRAND.amber  },
        { label:"Pending",      value:Math.max(0, leads.length-feas-notF-unans), color:BRAND.textMuted },
        { label:"Total",        value:leads.length, color:BRAND.accent },
      ]};
    }
    case "unanswered": {
      const r = await axios.get(mktL, { headers:h, params:{ limit:99999, page:1 } });
      return buildLeadList("Leads with Call Attempts", (r.data?.leads||[]).filter(l => l.callHistory?.length>0));
    }
    case "recentAssigned": {
      const r = await axios.get(mktL, { headers:h, params:{ limit:99999, page:1 } });
      return buildLeadList("Recently Assigned", (r.data?.leads||[]).filter(l => l.assignedTo).slice(0,15), true);
    }
    case "marketingStats": {
      const r = await axios.get(mktL, { headers:h, params:{ limit:99999, page:1 } });
      const leads = r.data?.leads || [];
      const today = new Date().toDateString();
      const assigned = leads.filter(l => l.assignedTo);
      return { type:"stats", title:"Marketing Overview", subtitle:"Complete marketing statistics.", stats:[
        { label:"Total",      value:leads.length, color:BRAND.accent },
        { label:"Today",      value:leads.filter(l => new Date(l.QUERY_TIME||l.createdAt).toDateString()===today).length, color:BRAND.green },
        { label:"Assigned",   value:assigned.length, color:BRAND.gold },
        { label:"Unassigned", value:leads.length - assigned.length, color:BRAND.amber },
      ]};
    }

    default: return null;
  }
}

function buildLeadList(title, leads, showAssigned = false) {
  return { type:"leadList", title, leads, total:leads.length, showAssigned };
}
function buildTodayAction(leads, actions) {
  const steps = {};
  actions.forEach(a => { steps[a.step||"Other"] = (steps[a.step||"Other"]||0)+1; });
  return {
    type:"todayAction", title:"Today's Action Summary",
    leads:leads.length, actions:actions.length, steps,
    totalValue:actions.reduce((s,a) => s+(Number(a.quotation)||0),0),
    wonCount:actions.filter(a => a.status==="Won").length,
    pending:actions.filter(a => a.status==="Pending").length,
  };
}

/* ── Speech ── */
function buildSpeakText(msg) {
  if (msg.type==="text"||msg.type==="error") return msg.text||"";
  if (msg.type==="stats")        return `${msg.title}. ${msg.stats.map(s=>`${s.label}: ${s.value}`).join(". ")}.`;
  if (msg.type==="leadList")     { const n=msg.leads.slice(0,3).map(l=>l.SENDER_COMPANY||l.SENDER_NAME||"Unknown").join(", "); return `${msg.title}. ${msg.total} leads. ${n?`Top: ${n}.`:"None found."}`; }
  if (msg.type==="todayAction")  return `Today: ${msg.leads} leads actioned, ${msg.actions} actions. Won: ${msg.wonCount}.`;
  if (msg.type==="teamTable")    return `Team overview: ${Object.keys(msg.data).length} employees.`;
  if (msg.type==="topPerformer") return msg.data[0] ? `Top performer: ${msg.data[0][0]} with ${msg.data[0][1].won} wins.` : "No data.";
  if (msg.type==="sourceTable")  return `${msg.total} leads across ${msg.data.length} sources.`;
  if (msg.type==="wonTable")     return `Top: ${msg.data[0]?.[0]||"none"} with ${msg.data[0]?.[1]||0} won.`;
  return msg.title || "Data loaded.";
}
let _sp = null;
function speak(text, onStart, onEnd) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.rate=1.05; u.pitch=1; u.lang="en-IN";
  const v = window.speechSynthesis.getVoices();
  const pick = v.find(x=>x.lang==="en-IN") || v.find(x=>x.lang.startsWith("en"));
  if (pick) u.voice = pick;
  u.onstart = () => { _sp=u; onStart?.(); };
  u.onend   = () => { _sp=null; onEnd?.(); };
  u.onerror = () => { _sp=null; onEnd?.(); };
  window.speechSynthesis.speak(u);
}
function stopSpeech() { window.speechSynthesis?.cancel(); _sp=null; }

/* ── Typewriter ── */
const TypewriterText = ({ text, speed=12, onDone, color=BRAND.text }) => {
  const [shown, setShown] = useState("");
  const idx = useRef(0);
  useEffect(() => {
    idx.current=0; setShown("");
    const iv = setInterval(() => {
      if (idx.current >= text.length) { clearInterval(iv); onDone?.(); return; }
      setShown(p => p + text[idx.current++]);
    }, speed);
    return () => clearInterval(iv);
  }, [text]);
  const done = shown.length >= text.length;
  return (
    <span style={{ fontSize:13, color, lineHeight:1.7 }}>
      {shown}
      {!done && <span style={{ display:"inline-block",width:2,height:13,background:BRAND.accent,marginLeft:2,verticalAlign:"middle",animation:"pcCursorBlink 0.7s infinite" }}/>}
    </span>
  );
};

const statusStyle = s => ({
  Won:     { bg:"rgba(0,227,150,0.15)",  c:BRAND.green     },
  Ongoing: { bg:"rgba(0,194,255,0.15)",  c:BRAND.accent    },
  Pending: { bg:"rgba(255,184,48,0.15)", c:BRAND.gold      },
  Lost:    { bg:"rgba(255,69,96,0.15)",  c:BRAND.red       },
}[s] || { bg:"rgba(122,155,188,0.15)", c:BRAND.textMuted });

const fmtD = d => d ? new Date(d).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"}) : "—";
const fmtI = n => `₹${Number(n).toLocaleString("en-IN")}`;

/* ── Card Renderers ── */
const RStats = ({ msg }) => (
  <div>
    <p style={{ fontSize:11,color:BRAND.textMuted,marginBottom:10,fontWeight:500 }}>{msg.subtitle}</p>
    <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(82px,1fr))",gap:8 }}>
      {msg.stats.map((s,i) => (
        <div key={i} style={{ background:"rgba(0,194,255,0.06)",border:"1px solid rgba(0,194,255,0.15)",borderRadius:10,padding:"10px 8px",textAlign:"center",animation:`pcStatPop 0.3s ${i*0.07}s both` }}>
          <div style={{ fontSize:22,fontWeight:800,color:s.color,fontVariantNumeric:"tabular-nums" }}>{s.value}</div>
          <div style={{ fontSize:10,color:BRAND.textMuted,marginTop:2,fontWeight:500,textTransform:"uppercase",letterSpacing:"0.5px" }}>{s.label}</div>
        </div>
      ))}
    </div>
  </div>
);

const RLeadList = ({ msg }) => (
  <div>
    <p style={{ fontSize:11,color:BRAND.textMuted,marginBottom:8,fontWeight:500 }}>
      <span style={{ color:BRAND.accent,fontWeight:700 }}>{msg.total}</span> leads found
    </p>
    <div style={{ maxHeight:340,overflowY:"auto",paddingRight:2 }}>
      {msg.leads.length === 0
        ? <p style={{ color:BRAND.textMuted,fontStyle:"italic",fontSize:13 }}>No leads found.</p>
        : msg.leads.map((l,i) => {
            const sc = statusStyle(l.STATUS);
            return (
              <div key={i} style={{ background:"rgba(0,194,255,0.04)",border:"1px solid rgba(0,194,255,0.12)",borderRadius:10,padding:"9px 12px",marginBottom:6,animation:`pcSlideUp 0.22s ${i*0.04}s both` }}>
                <div style={{ display:"flex",justifyContent:"space-between",gap:8 }}>
                  <div style={{ flex:1,minWidth:0 }}>
                    <div style={{ fontWeight:700,fontSize:12,color:BRAND.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{l.SENDER_COMPANY||l.SENDER_NAME||"—"}</div>
                    <div style={{ fontSize:11,color:BRAND.textMuted,marginTop:1 }}>
                      {l.QUERY_PRODUCT_NAME||l.SOURCE||"—"}
                      {msg.showAssigned && l.assignedTo?.name && <span style={{ color:BRAND.accent }}> · {l.assignedTo.name}</span>}
                    </div>
                    {l.SENDER_MOBILE && <div style={{ fontSize:10,color:BRAND.textMuted }}>{l.SENDER_MOBILE}</div>}
                  </div>
                  <div style={{ display:"flex",flexDirection:"column",alignItems:"flex-end",gap:3,flexShrink:0 }}>
                    {l.STATUS && <span style={{ background:sc.bg,color:sc.c,fontSize:9,fontWeight:700,padding:"2px 8px",borderRadius:12,textTransform:"uppercase",letterSpacing:"0.4px" }}>{l.STATUS}</span>}
                    <span style={{ fontSize:9,color:BRAND.textMuted }}>{fmtD(l.nextFollowUpDate||l.createdAt)}</span>
                  </div>
                </div>
              </div>
            );
          })
      }
    </div>
  </div>
);

const RTeamTable = ({ msg }) => (
  <div style={{ overflowX:"auto" }}>
    <table style={{ width:"100%",borderCollapse:"collapse",fontSize:11 }}>
      <thead>
        <tr style={{ background:"rgba(0,194,255,0.12)" }}>
          {["Employee","Total","Won","Ongoing","Pending","Lost"].map(h => (
            <th key={h} style={{ padding:"7px 8px",textAlign:h==="Employee"?"left":"center",fontSize:9,color:BRAND.accent,textTransform:"uppercase",letterSpacing:"0.5px",fontWeight:700,borderBottom:"1px solid rgba(0,194,255,0.2)" }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {Object.entries(msg.data).map(([name,d],i) => (
          <tr key={i} style={{ borderBottom:"1px solid rgba(0,194,255,0.08)",background:i%2?"rgba(0,194,255,0.03)":"transparent",animation:`pcSlideUp 0.2s ${i*0.04}s both` }}>
            <td style={{ padding:"6px 8px",fontWeight:600,color:BRAND.text,fontSize:11 }}>{name}</td>
            <td style={{ padding:"6px 8px",textAlign:"center",fontWeight:700,color:BRAND.accent }}>{d.total}</td>
            <td style={{ padding:"6px 8px",textAlign:"center",color:BRAND.green,fontWeight:600 }}>{d.won}</td>
            <td style={{ padding:"6px 8px",textAlign:"center",color:BRAND.accent }}>{d.ongoing}</td>
            <td style={{ padding:"6px 8px",textAlign:"center",color:BRAND.gold }}>{d.pending}</td>
            <td style={{ padding:"6px 8px",textAlign:"center",color:BRAND.red }}>{d.lost}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const RTopPerformer = ({ msg }) => (
  <div>
    {msg.data.length === 0
      ? <p style={{ color:BRAND.textMuted,fontStyle:"italic",fontSize:13 }}>No data available.</p>
      : msg.data.map(([name,d],i) => (
          <div key={i} style={{ display:"flex",alignItems:"center",gap:10,padding:"10px 12px",background:"rgba(0,194,255,0.04)",border:"1px solid rgba(0,194,255,0.12)",borderRadius:10,marginBottom:7,animation:`pcSlideUp 0.25s ${i*0.07}s both` }}>
            <div style={{ width:32,height:32,borderRadius:"50%",background:i===0?"rgba(255,184,48,0.2)":"rgba(0,194,255,0.1)",border:`2px solid ${i===0?BRAND.gold:BRAND.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:14,color:i===0?BRAND.gold:BRAND.textMuted,flexShrink:0 }}>{i+1}</div>
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:700,fontSize:12,color:BRAND.text }}>{name}</div>
              <div style={{ fontSize:10,color:BRAND.textMuted }}>{d.total} leads · {fmtI(d.pipeline)}</div>
            </div>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontSize:20,fontWeight:800,color:BRAND.green }}>{d.won}</div>
              <div style={{ fontSize:9,color:BRAND.textMuted,textTransform:"uppercase",letterSpacing:"0.5px" }}>won</div>
            </div>
          </div>
        ))
    }
  </div>
);

const RSourceTable = ({ msg }) => (
  <div>
    <p style={{ fontSize:11,color:BRAND.textMuted,marginBottom:10 }}>{msg.total} leads · {msg.data.length} sources</p>
    {msg.data.map(([src,cnt],i) => {
      const pct = Math.round((cnt/msg.total)*100);
      return (
        <div key={i} style={{ marginBottom:9,animation:`pcSlideUp 0.2s ${i*0.04}s both` }}>
          <div style={{ display:"flex",justifyContent:"space-between",marginBottom:4 }}>
            <span style={{ fontSize:12,fontWeight:600,color:BRAND.text }}>{src}</span>
            <span style={{ fontSize:11,color:BRAND.textMuted }}>{cnt} ({pct}%)</span>
          </div>
          <div style={{ height:4,background:"rgba(0,194,255,0.1)",borderRadius:4 }}>
            <div style={{ height:"100%",width:`${pct}%`,background:`linear-gradient(90deg,${BRAND.accent},${BRAND.gold})`,borderRadius:4,animation:`pcBarGrow 0.8s ${i*0.05}s both` }}/>
          </div>
        </div>
      );
    })}
  </div>
);

const RWonTable = ({ msg }) => (
  <div style={{ overflowX:"auto" }}>
    <table style={{ width:"100%",borderCollapse:"collapse",fontSize:12 }}>
      <thead>
        <tr style={{ background:"rgba(0,227,150,0.08)" }}>
          <th style={{ padding:"7px 10px",textAlign:"left",color:BRAND.green,fontSize:10,textTransform:"uppercase",letterSpacing:"0.5px" }}>Employee</th>
          <th style={{ padding:"7px 10px",textAlign:"center",color:BRAND.green,fontSize:10,textTransform:"uppercase",letterSpacing:"0.5px" }}>Won</th>
        </tr>
      </thead>
      <tbody>
        {msg.data.map(([name,cnt],i) => (
          <tr key={i} style={{ borderBottom:"1px solid rgba(0,194,255,0.08)",background:i%2?"rgba(0,194,255,0.03)":"transparent",animation:`pcSlideUp 0.2s ${i*0.04}s both` }}>
            <td style={{ padding:"7px 10px",fontWeight:600,color:BRAND.text }}>{name}</td>
            <td style={{ padding:"7px 10px",textAlign:"center" }}>
              <span style={{ background:"rgba(0,227,150,0.15)",color:BRAND.green,padding:"2px 12px",borderRadius:12,fontWeight:700,fontSize:11 }}>{cnt}</span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const RTodayAction = ({ msg }) => (
  <div>
    <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12 }}>
      {[
        { label:"Leads Actioned", value:msg.leads,    color:BRAND.accent },
        { label:"Total Actions",  value:msg.actions,  color:BRAND.gold   },
        { label:"Won Today",      value:msg.wonCount,  color:BRAND.green  },
        { label:"Pending",        value:msg.pending,   color:BRAND.amber  },
      ].map((s,i) => (
        <div key={i} style={{ background:"rgba(0,194,255,0.06)",border:"1px solid rgba(0,194,255,0.15)",borderRadius:10,padding:"10px 11px",textAlign:"center",animation:`pcStatPop 0.3s ${i*0.07}s both` }}>
          <div style={{ fontSize:22,fontWeight:800,color:s.color }}>{s.value}</div>
          <div style={{ fontSize:10,color:BRAND.textMuted,marginTop:2,textTransform:"uppercase",letterSpacing:"0.4px" }}>{s.label}</div>
        </div>
      ))}
    </div>
    {msg.totalValue > 0 && (
      <div style={{ background:"rgba(0,227,150,0.08)",border:"1px solid rgba(0,227,150,0.2)",borderRadius:9,padding:"8px 12px",marginBottom:10 }}>
        <span style={{ fontSize:13,fontWeight:700,color:BRAND.green }}>Quotation Total: {fmtI(msg.totalValue)}</span>
      </div>
    )}
    {Object.keys(msg.steps).length > 0 && (
      <div>
        <div style={{ fontSize:10,fontWeight:700,color:BRAND.textMuted,marginBottom:6,textTransform:"uppercase",letterSpacing:"0.5px" }}>Actions by Step:</div>
        {Object.entries(msg.steps).map(([step,cnt],i) => (
          <div key={i} style={{ display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"1px dashed rgba(0,194,255,0.1)",fontSize:12 }}>
            <span style={{ color:BRAND.text }}>{step}</span>
            <span style={{ fontWeight:700,color:BRAND.accent }}>{cnt}</span>
          </div>
        ))}
      </div>
    )}
  </div>
);

const BotMessage = ({ msg, isSpeaking, onSpeakToggle, onTypeDone }) => {
  const isPlain = msg.type === "text" || msg.type === "error";
  const [showCards, setShowCards] = useState(false);
  const introText = isPlain ? (msg.text||"") : (msg.title||"Here is your data:");
  return (
    <div>
      <TypewriterText text={introText} speed={12} color={msg.type==="error" ? BRAND.red : BRAND.text}
        onDone={() => { if (!isPlain) setShowCards(true); onTypeDone?.(); }} />
      {showCards && (
        <div style={{ marginTop:12 }}>
          {msg.type==="stats"        && <RStats        msg={msg}/>}
          {msg.type==="leadList"     && <RLeadList     msg={msg}/>}
          {msg.type==="teamTable"    && <RTeamTable    msg={msg}/>}
          {msg.type==="topPerformer" && <RTopPerformer msg={msg}/>}
          {msg.type==="sourceTable"  && <RSourceTable  msg={msg}/>}
          {msg.type==="wonTable"     && <RWonTable     msg={msg}/>}
          {msg.type==="todayAction"  && <RTodayAction  msg={msg}/>}
        </div>
      )}
      {(showCards||isPlain) && (
        <button onClick={onSpeakToggle} title={isSpeaking?"Stop":"Listen"}
          style={{ marginTop:8,background:"transparent",border:`1px solid ${isSpeaking?BRAND.red:BRAND.border}`,borderRadius:20,padding:"3px 12px",fontSize:10,color:isSpeaking?BRAND.red:BRAND.textMuted,cursor:"pointer",display:"inline-flex",alignItems:"center",gap:5,transition:"all 0.15s" }}>
          {isSpeaking
            ? <><span style={{ width:7,height:7,borderRadius:2,background:BRAND.red,display:"inline-block",animation:"pcSpeakPulse 0.6s infinite" }}/> Stop</>
            : <><span style={{ fontSize:12 }}>🔊</span> Listen</>}
        </button>
      )}
    </div>
  );
};

function useSpeechInput(onResult, onError) {
  const recRef = useRef(null);
  const [listening, setListening] = useState(false);
  const start = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { onError?.("Speech recognition not supported."); return; }
    const rec = new SR();
    rec.lang="en-IN"; rec.interimResults=false; rec.maxAlternatives=1;
    rec.onresult = e => { onResult(e.results[0][0].transcript); setListening(false); };
    rec.onerror  = () => { setListening(false); onError?.("Could not understand. Please try again."); };
    rec.onend    = () => setListening(false);
    recRef.current=rec; rec.start(); setListening(true);
  }, [onResult, onError]);
  const stop = useCallback(() => { recRef.current?.stop(); setListening(false); }, []);
  return { listening, start, stop };
}

/* ══════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════ */
export const ChatbotDrawer = ({ page="sales", employeeId=null }) => {
  const [open,       setOpen]       = useState(false);
  const [msgs,       setMsgs]       = useState([]);
  const [loading,    setLoading]    = useState(false);
  const [input,      setInput]      = useState("");
  const [speakingId, setSpeakingId] = useState(null);
  const endRef   = useRef(null);
  const { user } = useContext(UserContext);

  const questions  = QUESTIONS[page] || QUESTIONS.sales;
  const PAGE_LABEL = { sales:"My Sales", manager:"Sales Manager", marketing:"Marketing" }[page] || "Dashboard";

  const scrollBottom = () => setTimeout(() => endRef.current?.scrollIntoView({ behavior:"smooth" }), 60);

  useEffect(() => {
    if (open && msgs.length === 0) {
      setMsgs([{ id:Date.now(), role:"bot", type:"text",
        text:`Hi ${user?.name?.split(" ")[0]||"there"} 👋  I'm your ${PAGE_LABEL} AI assistant. Ask me anything about your leads — try "hot leads", "won this month", "pipeline value", or use the mic!`,
        ts:new Date() }]);
    }
  }, [open]);

  useEffect(() => { if (open) scrollBottom(); }, [msgs, open]);

  const processQuestion = useCallback(async (question) => {
    if (!question.trim()) return;
    setMsgs(prev => [...prev, { id:Date.now(),role:"user",type:"text",text:question,ts:new Date() }]);
    setLoading(true); scrollBottom();
    try {
      const intent = resolveLocalIntent(question, page);

      // Blocked cross-employee query on sales page
      if (intent.blockedMsg) {
        setMsgs(prev => [...prev, { id:Date.now(),role:"bot",type:"text",text:intent.blockedMsg,ts:new Date() }]);
      } else if (!intent.fn) {
        const greet = ["hello","hi","hey","good morning","good afternoon","good evening","how are","what's up"];
        const isGreet = greet.some(g => question.toLowerCase().includes(g));
        const replyText = isGreet
          ? `Hello! 👋 I'm your ${PAGE_LABEL} assistant powered by ProClient360. Ask me about your leads data, pipeline, follow-ups, and more!`
          : `I couldn't find data for "${question}". Try:\n• "my won leads"\n• "overdue follow-ups"\n• "hot leads"\n• "pipeline value"\n• "leads this week"`;
        setMsgs(prev => [...prev, { id:Date.now(),role:"bot",type:"text",text:replyText,ts:new Date() }]);
      } else {
        const result = await fetchData(intent.fn, page, { employeeName:intent.employeeName, matchedSource:intent.matchedSource });
        if (result) {
          setMsgs(prev => [...prev, { id:Date.now(),role:"bot",ts:new Date(),...result }]);
        } else {
          setMsgs(prev => [...prev, { id:Date.now(),role:"bot",type:"error",text:"Could not load data. Please check your connection.",ts:new Date() }]);
        }
      }
    } catch(e) {
      console.error(e);
      setMsgs(prev => [...prev, { id:Date.now(),role:"bot",type:"error",text:"Something went wrong. Please try again.",ts:new Date() }]);
    }
    setLoading(false); scrollBottom();
  }, [page]);

  const askQuick = useCallback(async (label, fn) => {
    setMsgs(prev => [...prev, { id:Date.now(),role:"user",type:"text",text:label,ts:new Date() }]);
    setLoading(true); scrollBottom();
    try {
      const result = await fetchData(fn, page, {});
      if (result) setMsgs(prev => [...prev, { id:Date.now(),role:"bot",ts:new Date(),...result }]);
    } catch {
      setMsgs(prev => [...prev, { id:Date.now(),role:"bot",type:"error",text:"Failed to load data.",ts:new Date() }]);
    }
    setLoading(false); scrollBottom();
  }, [page]);

  const { listening, start:startListening, stop:stopListening } = useSpeechInput(
    t => { setInput(""); processQuestion(t); },
    e => setMsgs(prev => [...prev, { id:Date.now(),role:"bot",type:"error",text:e,ts:new Date() }])
  );

  const handleSend = () => { const q=input.trim(); if(q){ setInput(""); processQuestion(q); } };
  const toggleSpeak = msg => {
    if (speakingId===msg.id) { stopSpeech(); setSpeakingId(null); return; }
    stopSpeech();
    speak(buildSpeakText(msg), () => setSpeakingId(msg.id), () => setSpeakingId(null));
  };
  const fmt = ts => ts ? new Date(ts).toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit",hour12:true}) : "";
  const userInitial = (user?.name?.[0]||"U").toUpperCase();

  return (
    <>
      {/* FAB */}
      <button onClick={() => { setOpen(v=>!v); if(open) stopSpeech(); }} title={`${PAGE_LABEL} AI Assistant`}
        style={{ position:"fixed",bottom:28,right:28,width:58,height:58,borderRadius:"50%",
          background:open?BRAND.navy:"transparent",
          border:`2px solid ${open?BRAND.border:BRAND.accent}`,
          boxShadow:open?`0 4px 20px rgba(0,0,0,0.5)`:`0 0 24px ${BRAND.accentGlow},0 4px 20px rgba(0,0,0,0.4)`,
          cursor:"pointer",zIndex:9998,display:"flex",alignItems:"center",justifyContent:"center",
          transition:"all 0.3s cubic-bezier(0.34,1.56,0.64,1)",overflow:"hidden" }}>
        {open
          ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={BRAND.accent} strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          : <ProClient360Logo size={38}/>}
        {!open && <span style={{ position:"absolute",top:6,right:6,width:10,height:10,borderRadius:"50%",background:BRAND.green,border:`2px solid ${BRAND.navy}`,animation:"pcOnlinePing 2s infinite" }}/>}
      </button>

      {/* Drawer */}
      <div style={{ position:"fixed",bottom:98,right:28,width:400,maxWidth:"calc(100vw - 40px)",height:620,maxHeight:"calc(100vh - 130px)",
        background:BRAND.bg,border:`1px solid ${BRAND.border}`,borderRadius:20,
        boxShadow:"0 32px 80px rgba(0,0,0,0.6),0 0 0 1px rgba(0,194,255,0.1),inset 0 1px 0 rgba(0,194,255,0.15)",
        zIndex:9997,display:open?"flex":"none",flexDirection:"column",overflow:"hidden",
        fontFamily:"'Segoe UI',system-ui,sans-serif",animation:open?"pcDrawerIn 0.3s cubic-bezier(0.16,1,0.3,1)":"none" }}>

        {/* Header */}
        <div style={{ background:`linear-gradient(135deg,${BRAND.navy} 0%,${BRAND.navyMid} 60%,${BRAND.navyLight} 100%)`,
          padding:"16px 18px 14px",display:"flex",alignItems:"center",gap:12,flexShrink:0,
          borderBottom:`1px solid ${BRAND.border}`,position:"relative",overflow:"hidden" }}>
          <div style={{ position:"absolute",inset:0,opacity:0.04,backgroundImage:`radial-gradient(circle,${BRAND.accent} 1px,transparent 1px)`,backgroundSize:"20px 20px",pointerEvents:"none" }}/>
          <div style={{ position:"absolute",top:0,left:0,right:0,height:2,background:`linear-gradient(90deg,transparent,${BRAND.accent},transparent)` }}/>
          <div style={{ flexShrink:0,width:44,height:44,borderRadius:"50%",border:`1.5px solid ${BRAND.border}`,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,194,255,0.06)" }}>
            <ProClient360Logo size={36}/>
          </div>
          <div style={{ flex:1 }}>
            <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:3 }}>
              <span style={{ color:BRAND.text,fontWeight:800,fontSize:14 }}>ProClient</span>
              <span style={{ color:BRAND.accent,fontWeight:800,fontSize:14 }}>360</span>
              <span style={{ background:BRAND.accentDim,color:BRAND.accent,fontSize:9,fontWeight:700,padding:"1px 7px",borderRadius:10,border:"1px solid rgba(0,194,255,0.25)",textTransform:"uppercase",letterSpacing:"0.8px" }}>AI</span>
            </div>
            <div style={{ color:BRAND.textMuted,fontSize:10,display:"flex",alignItems:"center",gap:6 }}>
              <span style={{ width:6,height:6,borderRadius:"50%",background:BRAND.green,display:"inline-block",animation:"pcOnlinePing 2s infinite",flexShrink:0 }}/>
              {PAGE_LABEL} · Smart NLP · Voice enabled
            </div>
          </div>
          <button onClick={() => setMsgs([])}
            style={{ background:"rgba(0,194,255,0.08)",border:"1px solid rgba(0,194,255,0.2)",borderRadius:8,color:BRAND.textMuted,cursor:"pointer",padding:"4px 12px",fontSize:10,fontWeight:600 }}>
            Clear
          </button>
        </div>

        {/* Quick queries */}
        <div style={{ padding:"10px 14px 0",borderBottom:"1px solid rgba(0,194,255,0.1)",flexShrink:0 }}>
          <div style={{ fontSize:9,color:BRAND.textDim,fontWeight:700,marginBottom:7,letterSpacing:"1.2px",textTransform:"uppercase" }}>Quick Queries</div>
          <div style={{ display:"flex",gap:7,overflowX:"auto",paddingBottom:11,scrollbarWidth:"none" }}>
            {questions.map((q,i) => (
              <button key={i} disabled={loading} onClick={() => askQuick(q.label, q.fn)}
                style={{ flexShrink:0,padding:"5px 12px",background:"rgba(0,194,255,0.06)",border:"1px solid rgba(0,194,255,0.18)",borderRadius:20,fontSize:11,color:BRAND.text,cursor:loading?"not-allowed":"pointer",whiteSpace:"nowrap",fontWeight:500,opacity:loading?0.5:1,transition:"all 0.15s" }}>
                {q.icon} {q.label}
              </button>
            ))}
          </div>
        </div>

        {/* Messages */}
        <div style={{ flex:1,overflowY:"auto",padding:"14px 14px 8px",display:"flex",flexDirection:"column",gap:14,scrollbarWidth:"thin",scrollbarColor:`${BRAND.navyLight} transparent` }}>
          {msgs.map(msg => (
            <div key={msg.id} style={{ display:"flex",flexDirection:msg.role==="user"?"row-reverse":"row",gap:9,alignItems:"flex-start" }}>
              {msg.role==="bot" && (
                <div style={{ width:32,height:32,borderRadius:"50%",border:`1.5px solid ${BRAND.border}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:2,background:"rgba(0,194,255,0.06)" }}>
                  <ProClient360Logo size={24}/>
                </div>
              )}
              {msg.role==="user" && (
                <div style={{ width:30,height:30,borderRadius:"50%",background:BRAND.accentDim,border:`1.5px solid ${BRAND.border}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:11,fontWeight:700,color:BRAND.accent }}>
                  {userInitial}
                </div>
              )}
              <div style={{ maxWidth:"82%",minWidth:60 }}>
                <div style={{ background:msg.role==="user"?`linear-gradient(135deg,${BRAND.accent},${BRAND.accentDark})`:"rgba(15,32,64,0.8)",
                  color:msg.role==="user"?BRAND.navy:BRAND.text,
                  border:`1px solid ${msg.role==="user"?"transparent":BRAND.border}`,
                  borderRadius:msg.role==="user"?"16px 16px 4px 16px":"16px 16px 16px 4px",
                  padding:"10px 14px",
                  boxShadow:msg.role==="user"?`0 4px 16px ${BRAND.accentGlow}`:"none" }}>
                  {msg.role==="user"
                    ? <p style={{ fontSize:13,margin:0,lineHeight:1.6,fontWeight:500 }}>{msg.text}</p>
                    : <BotMessage msg={msg} isSpeaking={speakingId===msg.id} onSpeakToggle={() => toggleSpeak(msg)} onTypeDone={scrollBottom}/>}
                </div>
                <div style={{ fontSize:10,color:BRAND.textDim,marginTop:3,textAlign:msg.role==="user"?"right":"left" }}>{fmt(msg.ts)}</div>
              </div>
            </div>
          ))}

          {loading && (
            <div style={{ display:"flex",gap:9,alignItems:"center" }}>
              <div style={{ width:32,height:32,borderRadius:"50%",border:`1.5px solid ${BRAND.border}`,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,194,255,0.06)" }}>
                <ProClient360Logo size={24}/>
              </div>
              <div style={{ background:"rgba(15,32,64,0.8)",border:`1px solid ${BRAND.border}`,borderRadius:"16px 16px 16px 4px",padding:"12px 18px",display:"flex",gap:6,alignItems:"center" }}>
                {[0,0.18,0.36].map((d,i) => (
                  <span key={i} style={{ width:7,height:7,borderRadius:"50%",background:BRAND.accent,display:"inline-block",animation:`pcTypBounce 1.2s ${d}s infinite` }}/>
                ))}
              </div>
            </div>
          )}
          <div ref={endRef}/>
        </div>

        {/* Input bar */}
        <div style={{ padding:"10px 14px 16px",borderTop:"1px solid rgba(0,194,255,0.1)",display:"flex",gap:8,flexShrink:0,alignItems:"center",background:"rgba(10,22,40,0.6)" }}>
          <input value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key==="Enter" && !e.shiftKey && handleSend()}
            placeholder={listening?"🎙  Listening…":"Ask anything about your leads…"}
            disabled={loading||listening}
            style={{ flex:1,background:listening?"rgba(0,227,150,0.08)":"rgba(15,32,64,0.6)",
              border:`1.5px solid ${listening?BRAND.green:BRAND.border}`,
              borderRadius:12,padding:"9px 14px",fontSize:12,color:BRAND.text,outline:"none",fontFamily:"inherit",transition:"border-color 0.2s" }}/>
          <button onClick={() => listening?stopListening():startListening()} title={listening?"Stop":"Speak"}
            style={{ width:38,height:38,borderRadius:"50%",background:listening?"rgba(255,69,96,0.2)":"rgba(0,194,255,0.08)",
              border:`1.5px solid ${listening?BRAND.red:BRAND.border}`,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,
              boxShadow:listening?"0 0 0 5px rgba(255,69,96,0.15)":"none",transition:"all 0.2s" }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={listening?BRAND.red:BRAND.textMuted} strokeWidth="2" strokeLinecap="round">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
              <line x1="12" y1="19" x2="12" y2="23"/>
              <line x1="8" y1="23" x2="16" y2="23"/>
            </svg>
          </button>
          <button onClick={handleSend} disabled={loading||!input.trim()||listening}
            style={{ width:38,height:38,borderRadius:12,
              background:loading||!input.trim()?"rgba(0,194,255,0.06)":`linear-gradient(135deg,${BRAND.accent},${BRAND.accentDark})`,
              border:`1.5px solid ${loading||!input.trim()?BRAND.border:"transparent"}`,
              cursor:loading||!input.trim()?"not-allowed":"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,
              boxShadow:!loading&&input.trim()?`0 4px 16px ${BRAND.accentGlow}`:"none",transition:"all 0.15s" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={loading||!input.trim()?BRAND.textDim:BRAND.navy} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>

        <div style={{ textAlign:"center",padding:"4px 0 8px",background:"rgba(10,22,40,0.6)" }}>
          <span style={{ fontSize:9,color:BRAND.textDim,letterSpacing:"0.8px" }}>
            POWERED BY <span style={{ color:BRAND.accent,fontWeight:700 }}>PROCLIENT</span><span style={{ color:BRAND.text,fontWeight:700 }}>360</span> · AI
          </span>
        </div>
      </div>

      <style>{`
        @keyframes pcTypBounce   { 0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-6px)} }
        @keyframes pcCursorBlink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes pcStatPop     { from{opacity:0;transform:scale(0.8)} to{opacity:1;transform:scale(1)} }
        @keyframes pcSlideUp     { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pcBarGrow     { from{width:0%} }
        @keyframes pcDrawerIn    { from{opacity:0;transform:translateY(24px) scale(0.95)} to{opacity:1;transform:none} }
        @keyframes pcOnlinePing  { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.6);opacity:0.5} }
        @keyframes pcSpeakPulse  { 0%,100%{opacity:1} 50%{opacity:0.3} }
      `}</style>
    </>
  );
};

export default ChatbotDrawer;
