import axios from "axios";
import toast from "react-hot-toast";

const baseUrl = process.env.REACT_APP_API_URL;
const url = baseUrl + "/api/project";

const getProjects = async (page, limit, filters = {}, searchTerm = "") => {
  try {
    const params = {
      page,
      limit,
      ...(filters.status && { status: filters.status }),
      ...(searchTerm && { search: searchTerm }),
    };
    const response = await axios.get(url, {
      params,
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    });
    return response.data;
  } catch (error) {
    console.error(error);
    return error.response.data;
  }
};

const getMyProjects = async () => {
  try {
    const response = await axios.get(`${url}/my`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    });
    const data = response.data;
    if (data.error) {
      console.error(data.error);
      return toast.error(data.error);
    }
    return data;
  } catch (error) {
    console.error(error);
    toast.error(error.response.data.error);
  }
};

const createProject = async (projectData) => {
  try {
    // FIX 1: Validate POCopy before sending
    if (projectData.POCopy) {
      if (typeof projectData.POCopy !== "string") {
        return { success: false, error: "Invalid file format. Please re-upload the PDF." };
      }
      if (!projectData.POCopy.startsWith("data:application/pdf")) {
        return { success: false, error: "Only PDF files are accepted for Purchase Order Copy." };
      }
      const approximateSizeKB = (projectData.POCopy.length * 0.75) / 1024;
      if (approximateSizeKB > 2048) {
        return { success: false, error: "PDF file is too large. Maximum size is 2MB." };
      }
    }

    const response = await axios.post(`${url}`, projectData, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      maxContentLength: Infinity,  // FIX 2: Remove axios 10MB default limit
      maxBodyLength: Infinity,     // FIX 2: THIS was the production failure cause
      timeout: 120000,             // FIX 3: 2min timeout for uploads
    });
    return response.data;
  } catch (error) {
    console.error("createProject error:", error.response?.status, error.response?.data);
    if (error.response?.status === 413) {
      return { success: false, error: "File too large. Use a PDF under 2MB." };
    }
    if (error.code === "ECONNABORTED") {
      return { success: false, error: "Upload timed out. Check your connection and try again." };
    }
    return error.response?.data || { success: false, error: error.message };
  }
};

const exportProject = async (startDate, endDate, status) => {
  try {
    const response = await axios.get(`${url}/export-pdf`, {
      params: { startDate, endDate, status },
      responseType: "blob",
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    });
    const URL = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement("a");
    link.href = URL;
    link.setAttribute("download", "projects_report.pdf");
    document.body.appendChild(link);
    link.click();
  } catch (error) {
    console.error(error);
    toast.error(error.response?.data?.error || "Error exporting projects");
  }
};

const updateProject = async (updatedProjectData) => {
  try {
    const response = await axios.put(
      `${url}/${updatedProjectData._id}`,
      updatedProjectData,
      {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        timeout: 120000,
      }
    );
    return response.data;
  } catch (error) {
    console.error(error);
    return error.response?.data;
  }
};

const deleteProject = async (Id) => {
  try {
    const response = await axios.delete(`${url}/${Id}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    });
    return response.data;
  } catch (error) {
    console.error(error);
    return error?.response?.data;
  }
};

const getProject = async (Id) => {
  try {
    const response = await axios.get(`${url}/${Id}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    });
    const data = response.data;
    if (data.error) {
      console.error(data.error);
      return alert(data.error);
    }
    return data;
  } catch (error) {
    console.error(error);
    toast.error(error.response.data.error);
  }
};

export {
  getProjects,
  createProject,
  updateProject,
  deleteProject,
  getProject,
  getMyProjects,
  exportProject,
};