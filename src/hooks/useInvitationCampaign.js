// hooks/useInvitationCampaign.js — Invitation Campaign API (/api/invitation-campaigns)
import axios from 'axios';

const baseUrl = process.env.REACT_APP_API_URL;
const url = baseUrl + "/api/invitation-campaigns";

const authHeaders = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
});

const fail = (error) => {
  console.error(error?.response?.data || error);
  if (error?.response?.data) return error.response.data;
  return { success: false, error: error?.message || 'Could not reach the server.' };
};

const getInvitationTemplates = async () => {
  try { return (await axios.get(`${url}/templates`, authHeaders())).data; } catch (e) { return fail(e); }
};

const createInvitationTemplate = async (payload) => {
  try { return (await axios.post(`${url}/templates`, payload, authHeaders())).data; } catch (e) { return fail(e); }
};

const updateInvitationTemplate = async (id, payload) => {
  try { return (await axios.put(`${url}/templates/${id}`, payload, authHeaders())).data; } catch (e) { return fail(e); }
};

const deleteInvitationTemplate = async (id) => {
  try { return (await axios.delete(`${url}/templates/${id}`, authHeaders())).data; } catch (e) { return fail(e); }
};

const submitInvitationTemplate = async (id) => {
  try { return (await axios.post(`${url}/templates/${id}/submit`, {}, authHeaders())).data; } catch (e) { return fail(e); }
};

const syncInvitationTemplateStatus = async (id) => {
  try { return (await axios.post(`${url}/templates/${id}/sync-status`, {}, authHeaders())).data; } catch (e) { return fail(e); }
};

const uploadInvitationImage = async (file) => {
  try {
    const formData = new FormData();
    formData.append('image', file);
    const response = await axios.post(`${url}/upload-image`, formData, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'multipart/form-data' },
      timeout: 60000,
    });
    return response.data;
  } catch (e) {
    if (e.code === 'ECONNABORTED') return { success: false, error: 'Upload timed out — try a smaller image.' };
    return fail(e);
  }
};

// payload: { templateId, customerIds } OR { templateId, recipients: [{ name, phone }] }
const sendInvitation = async (payload) => {
  try { return (await axios.post(`${url}/send`, payload, { ...authHeaders(), timeout: 0 })).data; } catch (e) { return fail(e); }
};

const getInvitationLogs = async () => {
  try { return (await axios.get(`${url}/logs`, authHeaders())).data; } catch (e) { return fail(e); }
};

const getInvitationResponses = async (templateId = '') => {
  try {
    const q = templateId ? `?templateId=${templateId}` : '';
    return (await axios.get(`${url}/responses${q}`, authHeaders())).data;
  } catch (e) { return fail(e); }
};

export {
  getInvitationTemplates,
  createInvitationTemplate,
  updateInvitationTemplate,
  deleteInvitationTemplate,
  submitInvitationTemplate,
  syncInvitationTemplateStatus,
  uploadInvitationImage,
  sendInvitation,
  getInvitationLogs,
  getInvitationResponses,
};