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

// ─── NEW: Team Lead creates a sub-task under one of their tasks ───────────────
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

// ─── NEW: Fetch all sub-tasks for a parent task (Manager uses this) ───────────
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

export {
  getAllTask,
  createTaskSheet,
  createSubTask,           // ✅ NEW — Team Lead assigns subtask
  getSubTasksForParent,    // ✅ NEW — Manager fetches child tasks
  updateTaskSheet,
  deleteTaskSheet,
  getTaskSheet,
  getMyTaskSheet,
  updateSubtask
};