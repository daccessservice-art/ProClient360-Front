import axios from 'axios';
import toast from 'react-hot-toast';

const baseUrl = process.env.REACT_APP_API_URL;
const url = baseUrl + "/api/reports";

const triggerDownload = (blobData, headers, fallbackName) => {
  const blobUrl = window.URL.createObjectURL(new Blob([blobData]));
  const link = document.createElement('a');
  link.href = blobUrl;

  let filename = fallbackName;
  const disposition = headers['content-disposition'];
  if (disposition) {
    const match = disposition.match(/filename="?([^"]+)"?/);
    if (match?.[1]) filename = match[1];
  }

  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(blobUrl);
};

// filters: { projectId, status, from, to } — all optional
const downloadTaskStatusReport = async (filters = {}) => {
  try {
    const response = await axios.get(`${url}/task-status`, {
      params: filters,
      responseType: 'blob',
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
    triggerDownload(
      response.data,
      response.headers,
      `Task_Status_Report_${new Date().toISOString().slice(0, 10)}.xlsx`
    );
    return { success: true };
  } catch (error) {
    console.error(error);
    toast.error("Failed to generate report");
    return { success: false, error: "Failed to generate report" };
  }
};

// ✅ NEW — filters: { from, to } — optional task-start-date range
const downloadEmployeeGrowthReport = async (filters = {}) => {
  try {
    const response = await axios.get(`${url}/employee-growth`, {
      params: filters,
      responseType: 'blob',
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
    triggerDownload(
      response.data,
      response.headers,
      `Employee_Growth_Report_${new Date().toISOString().slice(0, 10)}.xlsx`
    );
    return { success: true };
  } catch (error) {
    console.error(error);
    // Surface the real reason (e.g. 403 permission denied) instead of a generic message
    const message = error.response?.data
      ? await error.response.data.text?.().then(t => {
          try { return JSON.parse(t)?.error; } catch { return null; }
        }).catch(() => null)
      : null;
    toast.error(message || "Failed to generate report");
    return { success: false, error: message || "Failed to generate report" };
  }
};

// ✅ NEW — no filters needed, covers every visible project
const downloadProjectProgressReport = async () => {
  try {
    const response = await axios.get(`${url}/project-progress`, {
      responseType: 'blob',
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
    triggerDownload(
      response.data,
      response.headers,
      `Project_Progress_Report_${new Date().toISOString().slice(0, 10)}.xlsx`
    );
    return { success: true };
  } catch (error) {
    console.error(error);
    toast.error("Failed to generate report");
    return { success: false, error: "Failed to generate report" };
  }
};

export { downloadTaskStatusReport, downloadEmployeeGrowthReport, downloadProjectProgressReport };