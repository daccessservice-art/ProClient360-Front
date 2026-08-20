import axios from 'axios';

const baseUrl = process.env.REACT_APP_API_URL;
const url = baseUrl + "/api/campaigns";

const authHeaders = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
});

const getCampaignTemplates = async () => {
  try {
    const response = await axios.get(`${url}/templates`, authHeaders());
    return response.data;
  } catch (error) {
    console.error(error?.response?.data);
    return error?.response?.data;
  }
};

const getApprovedCampaignTemplates = async () => {
  try {
    const response = await axios.get(`${url}/templates/approved`, authHeaders());
    return response.data;
  } catch (error) {
    console.error(error?.response?.data);
    return error?.response?.data;
  }
};

const createCampaignTemplate = async (payload) => {
  try {
    const response = await axios.post(`${url}/templates`, payload, authHeaders());
    return response.data;
  } catch (error) {
    console.error(error?.response?.data);
    return error?.response?.data;
  }
};

const updateCampaignTemplate = async (id, payload) => {
  try {
    const response = await axios.put(`${url}/templates/${id}`, payload, authHeaders());
    return response.data;
  } catch (error) {
    console.error(error?.response?.data);
    return error?.response?.data;
  }
};

const deleteCampaignTemplate = async (id) => {
  try {
    const response = await axios.delete(`${url}/templates/${id}`, authHeaders());
    return response.data;
  } catch (error) {
    console.error(error?.response?.data);
    return error?.response?.data;
  }
};

const submitCampaignTemplate = async (id) => {
  try {
    const response = await axios.post(`${url}/templates/${id}/submit`, {}, authHeaders());
    return response.data;
  } catch (error) {
    console.error(error?.response?.data);
    return error?.response?.data;
  }
};

const syncCampaignTemplateStatus = async (id) => {
  try {
    const response = await axios.post(`${url}/templates/${id}/sync-status`, {}, authHeaders());
    return response.data;
  } catch (error) {
    console.error(error?.response?.data);
    return error?.response?.data;
  }
};

const sendCampaign = async (templateId, customerIds) => {
  try {
    const response = await axios.post(`${url}/send`, { templateId, customerIds }, authHeaders());
    return response.data;
  } catch (error) {
    console.error(error?.response?.data);
    return error?.response?.data;
  }
};

const getCampaignLogs = async () => {
  try {
    const response = await axios.get(`${url}/logs`, authHeaders());
    return response.data;
  } catch (error) {
    console.error(error?.response?.data);
    return error?.response?.data;
  }
};

const getCampaignReplies = async (customerId = null) => {
  try {
    const params = customerId ? `?customerId=${customerId}` : '';
    const response = await axios.get(`${url}/replies${params}`, authHeaders());
    return response.data;
  } catch (error) {
    console.error(error?.response?.data);
    return error?.response?.data;
  }
};

// NEW — structured Q&A from the tap-through questionnaire (as opposed to
// raw free-text replies from getCampaignReplies above).
const getCampaignSessions = async (customerId = null) => {
  try {
    const params = customerId ? `?customerId=${customerId}` : '';
    const response = await axios.get(`${url}/sessions${params}`, authHeaders());
    return response.data;
  } catch (error) {
    console.error(error?.response?.data);
    return error?.response?.data;
  }
};

// NEW — uploads an image, returns { success, mediaId }
const uploadCampaignImage = async (file) => {
  try {
    const formData = new FormData();
    formData.append('image', file);
    const response = await axios.post(`${url}/templates/upload-image`, formData, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'multipart/form-data',
      },
      timeout: 30000, // FIXED: fail fast with a clear message instead of hanging silently
    });
    return response.data;
  } catch (error) {
    console.error(error);
    // FIXED: previously returned error?.response?.data, which is undefined
    // for a total connection failure/timeout (no server response at all) —
    // the popup then fell back to a generic "Failed to upload image" with
    // no real reason shown. Now always returns a usable error message.
    if (error?.response?.data) return error.response.data;
    if (error.code === 'ECONNABORTED') return { success: false, error: 'Upload timed out after 30 seconds — the server may be taking too long to respond.' };
    return { success: false, error: error.message || 'Could not reach the server.' };
  }
};

// NEW — paginated, grouped-by-customer inbox view, with optional name search
const getCampaignReplyCustomers = async (page = 1, limit = 15, search = '') => {
  try {
    const params = new URLSearchParams({ page, limit });
    if (search) params.append('search', search);
    const response = await axios.get(`${url}/replies/customers?${params.toString()}`, authHeaders());
    return response.data;
  } catch (error) {
    console.error(error?.response?.data);
    return error?.response?.data;
  }
};

export {
  getCampaignTemplates,
  getApprovedCampaignTemplates,
  createCampaignTemplate,
  updateCampaignTemplate,
  deleteCampaignTemplate,
  submitCampaignTemplate,
  syncCampaignTemplateStatus,
  sendCampaign,
  getCampaignLogs,
  getCampaignReplies,
  getCampaignSessions,
  uploadCampaignImage,
  getCampaignReplyCustomers,
};