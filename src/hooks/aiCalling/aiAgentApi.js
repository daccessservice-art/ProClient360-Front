// AI CALLING – NEW: Tripti (AI calling agent) API for Marketing Master
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5443';
const BASE = `${API_URL}/api/ai-calling/marketing`;
const auth = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
const fail = (err) => ({ success: false, error: err.response?.data?.error || err.message || 'AI calling request failed' });

export const getAiConfig = async () => {
  try { return (await axios.get(`${BASE}/config`, auth())).data; } catch (e) { return fail(e); }
};

export const getAiStatus = async (leadIds = []) => {
  if (!leadIds.length) return { success: true, status: {} };
  try { return (await axios.get(`${BASE}/status`, { ...auth(), params: { ids: leadIds.join(',') } })).data; } catch (e) { return fail(e); }
};

export const getAiLeadHistory = async (leadId) => {
  try { return (await axios.get(`${BASE}/leads/${leadId}`, auth())).data; } catch (e) { return fail(e); }
};

export const callLeadWithAi = async (leadId, ignoreHours = false) => {
  try { return (await axios.post(`${BASE}/leads/${leadId}/call`, { ignoreHours }, auth())).data; } catch (e) { return fail(e); }
};

export const queueLeadsForAi = async (leadIds = []) => {
  try { return (await axios.post(`${BASE}/queue`, { leadIds }, auth())).data; } catch (e) { return fail(e); }
};

export const getAiRecentCalls = async (limit = 30) => {
  try { return (await axios.get(`${BASE}/recent`, { ...auth(), params: { limit } })).data; } catch (e) { return fail(e); }
};

// ---- display helpers ----
export const formatIST = (raw) => {
  if (!raw) return '—';
  const d = new Date(raw);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' });
};

export const OUTCOME_LABELS = {
  appointment_booked: { text: 'Site visit booked', cls: 'bg-success' },
  interested: { text: 'Interested', cls: 'bg-primary' },
  callback_requested: { text: 'Callback requested', cls: 'bg-info text-dark' },
  transferred: { text: 'Forwarded to sales', cls: 'bg-success' },
  not_interested: { text: 'Not interested', cls: 'bg-secondary' },
  no_answer: { text: 'No answer', cls: 'bg-warning text-dark' },
  busy: { text: 'Busy', cls: 'bg-warning text-dark' },
  voicemail: { text: 'Voicemail', cls: 'bg-warning text-dark' },
  wrong_number: { text: 'Wrong number', cls: 'bg-dark' },
  do_not_call: { text: 'Do not call', cls: 'bg-danger' },
  failed: { text: 'Failed', cls: 'bg-danger' },
  other: { text: 'Completed', cls: 'bg-secondary' },
};

export const ACTIVE_STATUSES = ['queued', 'scheduled', 'prepared', 'initiated', 'ringing', 'in-progress', 'call-disconnected'];

export const callBadge = (call) => {
  if (!call) return { text: '—', cls: 'bg-light text-dark' };
  if (String(call.providerCallId || '').startsWith('dryrun-')) return { text: 'Test (no real call)', cls: 'bg-secondary' };
  if (call.outcome && OUTCOME_LABELS[call.outcome]) return OUTCOME_LABELS[call.outcome];
  if (ACTIVE_STATUSES.includes(call.status)) return { text: call.status === 'in-progress' ? 'On call now' : 'Calling...', cls: 'bg-primary' };
  return { text: call.outcome || call.status || 'Ended', cls: 'bg-secondary' };
};
