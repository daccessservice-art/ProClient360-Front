import axios from 'axios';

const baseUrl = process.env.REACT_APP_API_URL;
const url = baseUrl + "/api/project-task-agent";

const suggestAssignees = async (excludeIds = []) => {
  try {
    const response = await axios.get(`${url}/suggest-assignees`, {
      params: { excludeIds: excludeIds.join(',') },
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
    return response.data;
  } catch (error) {
    console.error(error);
    return { success: false, error: error.response?.data?.error || "Error fetching suggestions" };
  }
};

const suggestTester = async () => {
  try {
    const response = await axios.get(`${url}/suggest-tester`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
    return response.data;
  } catch (error) {
    console.error(error);
    return { success: false, error: error.response?.data?.error || "Error fetching tester suggestion" };
  }
};

const getMyFocus = async () => {
  try {
    const response = await axios.get(`${url}/my-focus`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
    return response.data;
  } catch (error) {
    console.error(error);
    return { success: false, error: error.response?.data?.error || "Error fetching focus suggestion" };
  }
};

const chatWithAgent = async (message, history = []) => {
  try {
    const response = await axios.post(`${url}/chat`, { message, history }, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
    return response.data;
  } catch (error) {
    console.error(error);
    return { success: false, error: error.response?.data?.error || "Error reaching the AI agent" };
  }
};

const applyAgentUpdate = async (taskId, field, newValue) => {
  try {
    const response = await axios.put(`${url}/apply-update`, { taskId, field, newValue }, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
    return response.data;
  } catch (error) {
    console.error(error);
    return { success: false, error: error.response?.data?.error || "Error applying the update" };
  }
};

// ✅ NEW — applies a work-log proposal (creates a real Action document)
const applyAgentActionLog = async (taskId, action, taskStatus, taskLevel, remark) => {
  try {
    const response = await axios.put(`${url}/apply-action-log`, { taskId, action, taskStatus, taskLevel, remark }, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
    return response.data;
  } catch (error) {
    console.error(error);
    return { success: false, error: error.response?.data?.error || "Error logging the work" };
  }
};

export { suggestAssignees, suggestTester, getMyFocus, chatWithAgent, applyAgentUpdate, applyAgentActionLog };