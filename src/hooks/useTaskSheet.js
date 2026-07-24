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

// ── UPDATED: now accepts an optional testerId — required only if the task
// has no Manager-assigned tester, letting the developer choose their own. ──
const submitForTesting = async (id, testerId = null) => {
  try {
    const response = await axios.post(`${url}/${id}/submit-for-testing`, { testerId }, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
    return response.data;
  } catch (error) {
    console.error(error);
    return { success: false, error: error.response?.data?.error || "Error submitting for testing" };
  }
};

// ── NEW: Tester updates their in-progress testing percentage ──
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

const assignTester = async (id, testerId) => {
  try {
    const response = await axios.put(`${url}/${id}/assign-tester`, { testerId }, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
    return response.data;
  } catch (error) {
    console.error(error);
    return { success: false, error: error.response?.data?.error || "Error assigning tester" };
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
  updateTestProgress,   // ✅ NEW
  getTesterTasks,
  submitTestResult,
  assignTester
};