import { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const url = process.env.REACT_APP_API_URL + '/api/leads';

const useSalesManagers = () => {
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchSalesEmployees = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${url}/sales-employees`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.data.success) {
        setManagers(response.data.salesEmployees);
        setError(null);
      } else {
        throw new Error(response.data.error || 'Failed to fetch sales employees');
      }
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to fetch sales employees';
      setError(errorMessage);
      setManagers([]);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSalesEmployees();
  }, []);

  return { managers, loading, error, refetch: fetchSalesEmployees };
};

export default useSalesManagers;  