import { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const url = process.env.REACT_APP_API_URL + '/api/leads/my-leads';

const useMyLeads = (page = 1, limit = 10, filters = {}) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit,
        ...(filters.source      && { source:        filters.source      }),
        ...(filters.date        && { date:           filters.date        }),
        ...(filters.status      && { status:         filters.status      }),
        ...(filters.callLeads   && { callLeads:      filters.callLeads   }),
        ...(filters.searchTerm  && { search:         filters.searchTerm  }),
        ...(filters.followUpToday && { followUpToday: 'true'             }),
        // ── NEW: Today's Action filter ──
        ...(filters.todayAction && { todayAction: 'true'                 }),
      };

      console.log('Fetching leads with params:', params);

      const response = await axios.get(url, {
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
    fetchLeads();
  }, [
    page, limit,
    filters.source, filters.date, filters.status,
    filters.callLeads, filters.searchTerm,
    filters.followUpToday,
    filters.todayAction, // ── NEW dependency
  ]);

  return { data, loading, error, refetch: () => fetchLeads() };
};

export default useMyLeads;