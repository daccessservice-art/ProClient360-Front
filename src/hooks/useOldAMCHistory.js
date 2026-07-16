import axios from 'axios';

const baseUrl = process.env.REACT_APP_API_URL;
const url = baseUrl + "/api/old-amc-history";

const authHeader = () => ({
  Authorization: `Bearer ${localStorage.getItem('token')}`
});

const getOldAMCHistory = async (
  page = 1, limit = 40, search = null, customerType = null, zone = null, ownedBy = null, customerPriority = null
) => {
  try {
    const params = new URLSearchParams();
    params.append('page', page);
    params.append('limit', limit);
    if (search && search.trim() !== '') params.append('q', search);
    if (customerType && customerType.trim() !== '') params.append('customerType', customerType);
    if (zone && zone.trim() !== '') params.append('zone', zone);
    if (ownedBy && ownedBy.trim() !== '') params.append('ownedBy', ownedBy);
    if (customerPriority && customerPriority.trim() !== '') params.append('customerPriority', customerPriority);

    const response = await axios.get(`${url}?${params.toString()}`, { headers: authHeader() });
    return response.data;
  } catch (error) {
    console.error(error?.response?.data);
    return error?.response?.data;
  }
};

const importOldAMCHistory = async (file) => {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await axios.post(`${url}/import`, formData, {
      headers: { ...authHeader(), 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  } catch (error) {
    console.error(error?.response?.data);
    return error?.response?.data || { success: false, error: 'Import failed' };
  }
};

const createOldAMCHistory = async (payload) => {
  try {
    const response = await axios.post(`${url}`, payload, { headers: authHeader() });
    return response.data;
  } catch (error) {
    console.error(error?.response?.data);
    return error?.response?.data;
  }
};

const updateOldAMCHistory = async (payload) => {
  try {
    const response = await axios.put(`${url}/${payload._id}`, payload, { headers: authHeader() });
    return response.data;
  } catch (error) {
    console.error(error?.response?.data);
    return error?.response?.data;
  }
};

const deleteOldAMCHistory = async (id) => {
  try {
    const response = await axios.delete(`${url}/${id}`, { headers: authHeader() });
    return response.data;
  } catch (error) {
    console.error(error?.response?.data);
    return error?.response?.data;
  }
};

const deleteImportBatch = async (batch) => {
  try {
    const response = await axios.delete(`${url}/batch/${batch}`, { headers: authHeader() });
    return response.data;
  } catch (error) {
    console.error(error?.response?.data);
    return error?.response?.data;
  }
};

const triggerDownload = (blob, filename) => {
  try {
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    }, 100);
    return true;
  } catch (error) {
    console.error('Error triggering download:', error);
    return false;
  }
};

const exportOldAMCHistoryPDF = async () => {
  try {
    const response = await axios.get(`${url}/export/pdf`, { headers: authHeader(), responseType: 'blob' });
    const filename = `old_amc_history_${new Date().toISOString().split('T')[0]}.pdf`;
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const ok = triggerDownload(blob, filename);
    return ok ? { success: true, message: 'PDF exported successfully' } : { success: false, error: 'Failed to download PDF' };
  } catch (error) {
    return { success: false, error: 'Failed to export PDF' };
  }
};

const exportOldAMCHistoryExcel = async () => {
  try {
    const response = await axios.get(`${url}/export/excel`, { headers: authHeader(), responseType: 'blob' });
    const filename = `old_amc_history_${new Date().toISOString().split('T')[0]}.xlsx`;
    const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const ok = triggerDownload(blob, filename);
    return ok ? { success: true, message: 'Excel exported successfully' } : { success: false, error: 'Failed to download Excel' };
  } catch (error) {
    return { success: false, error: 'Failed to export Excel' };
  }
};

export {
  getOldAMCHistory,
  importOldAMCHistory,
  createOldAMCHistory,
  updateOldAMCHistory,
  deleteOldAMCHistory,
  deleteImportBatch,
  exportOldAMCHistoryPDF,
  exportOldAMCHistoryExcel,
};