import axios from 'axios';

const baseUrl = process.env.REACT_APP_API_URL;
const url = baseUrl + '/api/exhibition';

// ─── EXHIBITION MASTER ────────────────────────────────────────────────────────

export const getExhibitions = async (page = 1, limit = 20, search = null) => {
  try {
    const response = await axios.get(`${url}?q=${search}&page=${page}&limit=${limit}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    });
    return response.data;
  } catch (error) {
    return error?.response?.data || { success: false, error: 'Network error' };
  }
};

export const getExhibitionById = async (id) => {
  try {
    const response = await axios.get(`${url}/${id}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    });
    return response.data;
  } catch (error) {
    return error?.response?.data || { success: false, error: 'Network error' };
  }
};

export const createExhibition = async (data) => {
  try {
    const response = await axios.post(`${url}`, data, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    });
    return response.data;
  } catch (error) {
    return error?.response?.data || { success: false, error: 'Network error' };
  }
};

export const updateExhibition = async (data) => {
  try {
    const response = await axios.put(`${url}/${data._id}`, data, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    });
    return response.data;
  } catch (error) {
    return error?.response?.data || { success: false, error: 'Network error' };
  }
};

export const deleteExhibition = async (id) => {
  try {
    const response = await axios.delete(`${url}/${id}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    });
    return response.data;
  } catch (error) {
    return error?.response?.data || { success: false, error: 'Network error' };
  }
};

export const getExhibitionsDropdown = async (search = '') => {
  try {
    const response = await axios.get(`${url}/dropdown?q=${search}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    });
    return response.data;
  } catch (error) {
    return { success: false, exhibitions: [] };
  }
};

// ─── EXHIBITION VISITS ────────────────────────────────────────────────────────

export const getExhibitionVisits = async (page = 1, limit = 20, search = null, exhibitionId = null) => {
  try {
    let query = `?q=${search}&page=${page}&limit=${limit}`;
    if (exhibitionId) query += `&exhibitionId=${exhibitionId}`;
    const response = await axios.get(`${url}/visits/all${query}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    });
    return response.data;
  } catch (error) {
    return error?.response?.data || { success: false, error: 'Network error' };
  }
};

export const createExhibitionVisit = async (data) => {
  try {
    const response = await axios.post(`${url}/visits/create`, data, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    });
    return response.data;
  } catch (error) {
    return error?.response?.data || { success: false, error: 'Network error' };
  }
};

export const updateExhibitionVisit = async (data) => {
  try {
    const response = await axios.put(`${url}/visits/${data._id}`, data, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    });
    return response.data;
  } catch (error) {
    return error?.response?.data || { success: false, error: 'Network error' };
  }
};

export const deleteExhibitionVisit = async (id) => {
  try {
    const response = await axios.delete(`${url}/visits/${id}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    });
    return response.data;
  } catch (error) {
    return error?.response?.data || { success: false, error: 'Network error' };
  }
};