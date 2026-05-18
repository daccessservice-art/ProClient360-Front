import { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const url = process.env.REACT_APP_API_URL + '/api/leads/old-sales-history';

const useOldSalesHistory = (year, page = 1, limit = 20, filters = {}) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchHistory = async () => {
    if (!year) { setData(null); return; }
    setLoading(true);
    try {
      const params = { year, page, limit, ...(filters.source && { source: filters.source }), ...(filters.searchTerm && { search: filters.searchTerm }) };
      const response = await axios.get(url, { params, headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
      if (response.data.success) { setData(response.data); setError(null); } 
      else { throw new Error(response.data.error || 'Failed to fetch sales history'); }
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to fetch sales history';
      setError(errorMessage); setData(null); toast.error(errorMessage);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchHistory(); }, [year, page, limit, filters.source, filters.searchTerm]);
  return { data, loading, error, refetch: fetchHistory };
};

export default useOldSalesHistory;