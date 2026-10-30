import { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const baseUrl = process.env.REACT_APP_API_URL;
const url = `${baseUrl}/api/landing-leads`;
const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

const useLandingPageLeads = (page = 1, limit = 20, filters = {}) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const params = {
        page, limit,
        ...(filters.landingPage && { landingPage: filters.landingPage }),
        ...(filters.status      && { status:      filters.status }),
        ...(filters.date        && { date:        filters.date }),
        ...(filters.search      && { search:      filters.search }),
      };
      const response = await axios.get(url, { params, headers: authHeaders() });
      if (response.data.success) {
        setData(response.data);
        setError(null);
      } else {
        throw new Error(response.data.error || 'Failed to fetch landing page leads');
      }
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Failed to fetch landing page leads';
      setError(msg);
      setData(null);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, filters.landingPage, filters.status, filters.date, filters.search]);

  return { data, loading, error, refetch: () => fetchLeads() };
};

export const getLandingLeadStats = async () => {
  try {
    const res = await axios.get(`${url}/stats`, { headers: authHeaders() });
    return res.data;
  } catch (err) {
    return { success: false, total: 0, newCount: 0 };
  }
};

export const moveLandingLeadToMarketing = async (id) => {
  try {
    const res = await axios.post(`${url}/${id}/move`, {}, { headers: authHeaders() });
    return res.data;
  } catch (err) {
    return err.response?.data || { success: false, error: 'Failed to move lead' };
  }
};

export const moveLandingLeadsBulk = async (ids) => {
  try {
    const res = await axios.post(`${url}/move-bulk`, { ids }, { headers: authHeaders() });
    return res.data;
  } catch (err) {
    return err.response?.data || { success: false, error: 'Failed to move leads' };
  }
};

export const deleteLandingLead = async (id) => {
  try {
    const res = await axios.delete(`${url}/${id}`, { headers: authHeaders() });
    return res.data;
  } catch (err) {
    return err.response?.data || { success: false, error: 'Failed to delete lead' };
  }
};

export default useLandingPageLeads;