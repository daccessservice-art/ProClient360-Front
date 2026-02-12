import { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const baseUrl = process.env.REACT_APP_API_URL + '/api/activity';

const useActivityLogs = (entityType = null, entityId = null) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 0,
    totalRecords: 0,
    limit: 5
  });

  const fetchLogs = async (page = 1, filters = {}) => {
    setLoading(true);
    try {
      let url;
      
      if (entityType && entityId) {
        url = `${baseUrl}/${entityType}/${entityId}`;
      } else {
        url = `${baseUrl}/all`;
      }
      
      const params = {
        page,
        limit: 5,
        ...filters
      };

      const response = await axios.get(url, {
        params,
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.data.success) {
        setLogs(response.data.logs);
        setPagination(response.data.pagination);
      }
    } catch (err) {
      console.error('Error fetching logs:', err);
      toast.error('Failed to fetch activity logs');
    } finally {
      setLoading(false);
    }
  };

  const exportLogs = async (startDate, endDate, actionType = '', entityTypeFilter = '') => {
    try {
      toast.loading('Preparing export...');
      const response = await axios.get(`${baseUrl}/export`, {
        params: { startDate, endDate, actionType, entityType: entityTypeFilter },
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      toast.dismiss();

      if (response.data.success) {
        toast.success('Export ready!');
        return response.data.data;
      }
    } catch (err) {
      toast.dismiss();
      console.error('Error exporting logs:', err);
      toast.error('Failed to export logs');
      return null;
    }
  };

  useEffect(() => {
    if (entityType && entityId) {
      fetchLogs(1);
    } else if (entityType === null && entityId === null) {
      fetchLogs(1);
    }
  }, [entityType, entityId]);

  return { logs, loading, pagination, fetchLogs, exportLogs };
};

export default useActivityLogs;