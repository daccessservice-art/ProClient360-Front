import { useState, useEffect } from 'react';
import axios from 'axios';

const baseUrl = process.env.REACT_APP_API_URL;
const url = baseUrl + "/api/service";

// searchQuery + filters.allotTo both sent to backend (server-side, all pages)
const useServices = (page = 1, limit = 20, filters = {}, searchQuery = "") => {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  useEffect(() => {
    const fetchServices = async () => {
      setLoading(true);
      try {
        const params = {
          page,
          limit,
          ...(filters.serviceType && { serviceType: filters.serviceType }),
          ...(filters.status      && { status:      filters.status }),
          ...(filters.priority    && { priority:    filters.priority }),
          ...(filters.allotTo     && { allotTo:     filters.allotTo }),
          ...(searchQuery && searchQuery.trim() !== "" && { q: searchQuery.trim() }),
        };

        const response = await axios.get(url, {
          params,
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });

        setData(response.data);
        setError(null);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to fetch services');
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchServices();
  }, [page, limit, filters.serviceType, filters.status, filters.priority, filters.allotTo, searchQuery]);

  return { data, loading, error };
};

export default useServices;