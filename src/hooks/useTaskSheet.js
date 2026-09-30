import axios from 'axios';
import toast from 'react-hot-toast';

const baseUrl = process.env.REACT_APP_API_URL;
const url = baseUrl + "/api/tasksheet";

const getAllTask = async () => {
  try {
    const response = await axios.get(`${url}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
    const data = response.data;
    if (data.error) {
      console.error(data.error);
      toast.error(data.error);
      return null;
    }
    return data;
  } catch (error) {
    console.error(error);
    toast.error(error.response?.data?.error || "Error fetching tasks");
    return null;
  }
};

const getTaskSheet = async (id) => {
  try {
    const response = await axios.get(`${url}/${id}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
    const data = response.data;
    if (data.error) {
      console.error(data.error);
      toast.error(data.error);
      return null;
    }
    return data;
  } catch (error) {
    console.error(error);
    toast.error(error.response?.data?.error || "Error fetching task sheet");
    return null;
  }
};

const getMyTaskSheet = async (projectId) => {
  try {
    const response = await axios.get(`${url}/my/${projectId}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
    const data = response.data;
    if (data.error) {
      console.error(data.error);
      toast.error(data.error);
      return null;
    }
    return data;
  } catch (error) {
    console.error(error);
    toast.error(error.response?.data?.error || "Error fetching my tasks");
    return null;
  }
};

const createTaskSheet = async (taskData) => {
  try {
    const response = await axios.post(`${url}`, taskData, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
    const data = response.data;
    if (data.error) {
      console.error(data.error);
      toast.error(data.error);
      return { success: false, error: data.error };
    }
    toast.success(data.message || "Task created successfully");
    return data;
  } catch (error) {
    console.error(error);
    const errorMessage = error.response?.data?.error || "Error creating task";
    toast.error(errorMessage);
    return { success: false, error: errorMessage };
  }
};

const createSubTask = async (subTaskData) => {
  try {
    const response = await axios.post(`${url}/subtask`, subTaskData, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
    const data = response.data;
    if (data.error) {
      console.error(data.error);
      toast.error(data.error);
      return { success: false, error: data.error };
    }
    toast.success(data.message || "Sub-task assigned successfully");
    return data;
  } catch (error) {
    console.error(error);
    const errorMessage = error.response?.data?.error || "Error creating sub-task";
    toast.error(errorMessage);
    return { success: false, error: errorMessage };
  }
};

const getSubTasksForParent = async (parentId) => {
  try {
    const response = await axios.get(`${url}/subtasks/${parentId}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
    const data = response.data;
    if (data.error) {
      console.error(data.error);
      toast.error(data.error);
      return null;
    }
    return data;
  } catch (error) {
    console.error(error);
    toast.error(error.response?.data?.error || "Error fetching sub-tasks");
    return null;
  }
};

const updateTaskSheet = async (id, updatedData) => {
  try {
    const response = await axios.put(`${url}/${id}`, updatedData, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
    const data = response.data;
    if (data.error) {
      console.error(data.error);
      toast.error(data.error);
      return { success: false, error: data.error };
    }
    toast.success(data.message || "Task updated successfully");
    return data;
  } catch (error) {
    console.error(error);
    const errorMessage = error.response?.data?.error || "Error updating task";
    toast.error(errorMessage);
    return { success: false, error: errorMessage };
  }
};

const updateSubtask = async (id, subtaskData) => {
  try {
    const response = await axios.patch(`${url}/update-subtask/${id}`, subtaskData, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
    const data = response.data;
    if (data.error) {
      console.error(data.error);
      toast.error(data.error);
      return { success: false, error: data.error };
    }
    toast.success(data.message || "Subtask updated successfully");
    return data;
  } catch (error) {
    console.error(error);
    const errorMessage = error.response?.data?.error || "Error updating subtask";
    toast.error(errorMessage);
    return { success: false, error: errorMessage };
  }
};

const deleteTaskSheet = async (id) => {
  try {
    const response = await axios.delete(`${url}/${id}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
    const data = response.data;
    if (data.error) {
      console.error(data.error);
      toast.error(data.error);
      return { success: false, error: data.error };
    }
    toast.success(data.message || "Task deleted successfully");
    return data;
  } catch (error) {
    console.error(error);
    const errorMessage = error.response?.data?.error || "Error deleting task";
    toast.error(errorMessage);
    return { success: false, error: errorMessage };
  }
};

// Developer submits for testing. testerId is only needed if the task has no
// tester yet (developer picks their own). Accepts one id or an array of ids.
const submitForTesting = async (id, testerId = null) => {
  try {
    const body = Array.isArray(testerId) ? { testerIds: testerId } : { testerId };
    const response = await axios.post(`${url}/${id}/submit-for-testing`, body, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
    return response.data;
  } catch (error) {
    console.error(error);
    return { success: false, error: error.response?.data?.error || "Error submitting for testing" };
  }
};

// Tester updates their in-progress testing percentage
const updateTestProgress = async (id, progress) => {
  try {
    const response = await axios.put(`${url}/${id}/test-progress`, { progress }, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
    return response.data;
  } catch (error) {
    console.error(error);
    return { success: false, error: error.response?.data?.error || "Error updating test progress" };
  }
};

const getTesterTasks = async () => {
  try {
    const response = await axios.get(`${url}/tester/my-tasks`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
    return response.data;
  } catch (error) {
    console.error(error);
    return { success: false, error: error.response?.data?.error || "Error fetching testing queue" };
  }
};

const submitTestResult = async (id, result, remark = "") => {
  try {
    const response = await axios.post(`${url}/${id}/test-result`, { result, remark }, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
    return response.data;
  } catch (error) {
    console.error(error);
    return { success: false, error: error.response?.data?.error || "Error submitting test result" };
  }
};

// ✅ UPDATED — accepts one tester id OR an array of tester ids
const assignTester = async (id, testerIds) => {
  try {
    const body = Array.isArray(testerIds) ? { testerIds } : { testerId: testerIds };
    const response = await axios.put(`${url}/${id}/assign-tester`, body, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
    return response.data;
  } catch (error) {
    console.error(error);
    return { success: false, error: error.response?.data?.error || "Error assigning tester" };
  }
};

// ✅ NEW — Senior downloads Excel: sub-tasks given to juniors + own tasks (one project)
const downloadMyTeamReport = async (projectId) => {
  try {
    const response = await axios.get(`${url}/my-team-report/${projectId}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      responseType: 'blob',
    });

    const disposition = response.headers['content-disposition'] || '';
    const match = disposition.match(/filename="?([^"]+)"?/);
    const fileName = match ? match[1] : `Team_Report_${new Date().toISOString().slice(0, 10)}.xlsx`;

    const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(blobUrl);

    toast.success("Excel report downloaded");
    return true;
  } catch (error) {
    console.error(error);
    let message = "Error downloading report";
    try {
      // error body comes back as a Blob because of responseType: 'blob'
      const text = await error.response?.data?.text?.();
      if (text) message = JSON.parse(text).error || message;
    } catch (e) { /* keep default message */ }
    toast.error(message);
    return false;
  }
};

// ✅ NEW — my open tasks that are overdue / due today, grouped by project
const getMyDueStatus = async () => {
  try {
    const response = await axios.get(`${url}/my-due-status`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
    return response.data;
  } catch (error) {
    console.error(error);
    return { success: false, projects: {} };
  }
};

export {
  getAllTask,
  createTaskSheet,
  createSubTask,
  getSubTasksForParent,
  updateTaskSheet,
  deleteTaskSheet,
  getTaskSheet,
  getMyTaskSheet,
  updateSubtask,
  submitForTesting,
  updateTestProgress,
  getTesterTasks,
  submitTestResult,
  assignTester,
  downloadMyTeamReport,   // ✅ NEW
  getMyDueStatus,         // ✅ NEW
};