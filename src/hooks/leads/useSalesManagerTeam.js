import { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const url = process.env.REACT_APP_API_URL + '/api/leads';

const useSalesManagerTeam = (employeeId, page = 1, limit = 20, filters = {}) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchEmployeeLeads = async () => {
    // Don't fetch if employeeId is null or undefined
    if (employeeId === null || employeeId === undefined) {
      setData(null);
      return;
    }

    setLoading(true);
    try {
      let endpoint;
      
      // If employeeId is 'all', fetch all leads
      if (employeeId === 'all') {
        endpoint = `${url}/all-leads`;
      } else {
        endpoint = `${url}/employee-leads/${employeeId}`;
      }

      const params = {
        page,
        limit,
        ...(filters.source && { source: filters.source }),
        ...(filters.date && { date: filters.date }),
        ...(filters.status && { status: filters.status }),
        ...(filters.callLeads && { callLeads: filters.callLeads }),
        ...(filters.searchTerm && { search: filters.searchTerm }),
      };

      const response = await axios.get(endpoint, {
        params,
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.data.success) {
        setData(response.data);
        setError(null);
      } else {
        throw new Error(response.data.error || 'Failed to fetch leads');
      }
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to fetch leads';
      setError(errorMessage);
      setData(null);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployeeLeads();
  }, [employeeId, page, limit, filters.source, filters.date, filters.status, filters.callLeads, filters.searchTerm]);

  return { data, loading, error, refetch: fetchEmployeeLeads };
};

export default useSalesManagerTeam;