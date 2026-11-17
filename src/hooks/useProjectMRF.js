import axios from "axios";

const baseUrl = process.env.REACT_APP_API_URL;
const url = baseUrl + "/api/project-mrf";

const auth = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
const fail = (error, fallback) =>
  error?.response?.data || { success: false, error: error?.message || fallback };

const searchMRFProducts = async (q) => {
  try {
    const res = await axios.get(`${url}/products/search`, { ...auth(), params: { q } });
    return res.data;
  } catch (error) {
    return fail(error, "Error searching products");
  }
};

const getProjectMRFs = async (projectId) => {
  try {
    const res = await axios.get(`${url}/project/${projectId}`, auth());
    return res.data;
  } catch (error) {
    return fail(error, "Error fetching MRF history");
  }
};

const getAllProjectMRFs = async (page = 1, limit = 20, filters = {}) => {
  try {
    const res = await axios.get(url, { ...auth(), params: { page, limit, ...filters } });
    return res.data;
  } catch (error) {
    return fail(error, "Error fetching MRFs");
  }
};

const getProjectMRF = async (id) => {
  try {
    const res = await axios.get(`${url}/${id}`, auth());
    return res.data;
  } catch (error) {
    return fail(error, "Error fetching MRF");
  }
};

const createProjectMRF = async (payload) => {
  try {
    const res = await axios.post(url, payload, auth());
    return res.data;
  } catch (error) {
    return fail(error, "Error saving MRF");
  }
};

const updateProjectMRF = async (id, payload) => {
  try {
    const res = await axios.put(`${url}/${id}`, payload, auth());
    return res.data;
  } catch (error) {
    return fail(error, "Error updating MRF");
  }
};

const sendProjectMRF = async (id) => {
  try {
    const res = await axios.post(`${url}/${id}/send`, {}, auth());
    return res.data;
  } catch (error) {
    return fail(error, "Error sending MRF");
  }
};

const deleteProjectMRF = async (id) => {
  try {
    const res = await axios.delete(`${url}/${id}`, auth());
    return res.data;
  } catch (error) {
    return fail(error, "Error deleting MRF");
  }
};

export {
  searchMRFProducts,
  getProjectMRFs,
  getAllProjectMRFs,
  getProjectMRF,
  createProjectMRF,
  updateProjectMRF,
  sendProjectMRF,
  deleteProjectMRF,
};