import axios from 'axios';

const baseUrl = process.env.REACT_APP_API_URL;
const url = baseUrl + "/api/customer";

const getCustomers = async (
  page = 1,
  limit = 40,
  search = null,
  createdBy = null,
  ownedBy = null,
  priority = null,
  industryType = null,
  customerType = null
) => {
  try {
    const params = new URLSearchParams();
    params.append('page', page);
    params.append('limit', limit);

    if (search && search.trim() !== '' && search.toLowerCase() !== 'null') {
      params.append('q', search);
    }
    if (createdBy && createdBy.trim() !== '') {
      params.append('createdBy', createdBy);
    }
    if (ownedBy && ownedBy.trim() !== '') {
      params.append('ownedBy', ownedBy);
    }
    if (priority && priority.trim() !== '') {
      params.append('priority', priority);
    }
    if (industryType && industryType.trim() !== '') {
      params.append('industryType', industryType);
    }
    if (customerType && customerType.trim() !== '') {
      params.append('customerType', customerType);
    }

    const response = await axios.get(`${url}?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data;
  } catch (error) {
    console.error(error?.response?.data);
    return error?.response?.data;
  }
};

const getCustomerCountByOwner = async (ownerName) => {
  try {
    const params = new URLSearchParams();
    params.append('page', 1);
    params.append('limit', 1);
    if (ownerName && ownerName.trim() !== '') {
      params.append('ownedBy', ownerName.trim());
    }

    const response = await axios.get(`${url}?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching customer count by owner:', error?.response?.data);
    return error?.response?.data;
  }
};

const getCustomerById = async (customerId) => {
  try {
    const response = await axios.get(`${url}/${customerId}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data;
  } catch (error) {
    console.error(error?.response?.data);
    return error?.response?.data;
  }
};

const createCustomer = async (customerData) => {
  try {
    const response = await axios.post(`${url}`, customerData, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data;
  } catch (error) {
    console.error(error.response.data);
    return error.response.data;
  }
};

const updateCustomer = async (updatedData) => {
  try {
    const response = await axios.put(`${url}/${updatedData._id}`, updatedData, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data;
  } catch (error) {
    console.error(error.response.data);
    return error.response.data;
  }
};

const deleteCustomer = async (Id) => {
  try {
    const response = await axios.delete(`${url}/${Id}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data;
  } catch (error) {
    console.log(error.response.data);
    return error.response.data.error;
  }
};

const getEmployees = async () => {
  try {
    const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/employee/dropdown`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });

    if (response.data && response.data.success && response.data.employees) {
      return { success: true, employees: response.data.employees };
    }
    if (Array.isArray(response.data)) {
      return { success: true, employees: response.data };
    }
    return { success: false, employees: [] };
  } catch (error) {
    console.error('❌ Error fetching employees:', error?.response?.data || error.message);
    return { success: false, employees: [] };
  }
};

const getCustomersForBranch = async (searchText = "") => {
  try {
    const params = new URLSearchParams();
    if (searchText && searchText.trim() !== "") {
      params.append('search', searchText.trim());
    }

    const response = await axios.get(`${url}/branch-customers?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching customers for branch:', error?.response?.data || error.message);
    return { success: false, customers: [] };
  }
};

const triggerDownload = (blob, filename) => {
  try {
    if (navigator.userAgent.match(/(iPod|iPhone|iPad|Safari)/) && !navigator.userAgent.match(/Chrome/)) {
      const fileURL = URL.createObjectURL(blob);
      const newWindow = window.open(fileURL, '_blank');
      if (!newWindow) throw new Error('Popup blocked');
      setTimeout(() => {
        newWindow.document.title = filename;
        URL.revokeObjectURL(fileURL);
      }, 100);
    } else {
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(downloadUrl);
      }, 100);
    }
    return true;
  } catch (error) {
    console.error('Error triggering download:', error);
    return false;
  }
};

const exportCustomersPDF = async () => {
  try {
    const response = await axios.get(`${url}/export/pdf`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      responseType: 'blob'
    });

    const contentDisposition = response.headers['content-disposition'];
    let filename = `customers_export_${new Date().toISOString().split('T')[0]}.pdf`;
    if (contentDisposition) {
      const match = contentDisposition.match(/filename="?([^"]+)"?/);
      if (match?.[1]) filename = match[1];
    }

    const blob = new Blob([response.data], { type: 'application/pdf' });
    const ok = triggerDownload(blob, filename);
    return ok
      ? { success: true, message: 'PDF exported successfully' }
      : { success: false, error: 'Failed to download PDF' };
  } catch (error) {
    console.error('PDF export error:', error);
    if (error.response?.data instanceof Blob) {
      try {
        const text = await error.response.data.text();
        const obj = JSON.parse(text);
        return { success: false, error: obj.error || 'Failed to export PDF' };
      } catch { /* ignore */ }
    }
    return { success: false, error: error.message || 'Failed to export PDF' };
  }
};

const exportCustomersExcel = async () => {
  try {
    const response = await axios.get(`${url}/export/excel`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      responseType: 'blob'
    });

    const contentDisposition = response.headers['content-disposition'];
    let filename = `customers_export_${new Date().toISOString().split('T')[0]}.xlsx`;
    if (contentDisposition) {
      const match = contentDisposition.match(/filename="?([^"]+)"?/);
      if (match?.[1]) filename = match[1];
    }

    const blob = new Blob([response.data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    const ok = triggerDownload(blob, filename);
    return ok
      ? { success: true, message: 'Excel exported successfully' }
      : { success: false, error: 'Failed to download Excel' };
  } catch (error) {
    console.error('Excel export error:', error);
    if (error.response?.data instanceof Blob) {
      try {
        const text = await error.response.data.text();
        const obj = JSON.parse(text);
        return { success: false, error: obj.error || 'Failed to export Excel' };
      } catch { /* ignore */ }
    }
    return { success: false, error: error.message || 'Failed to export Excel' };
  }
};

const exportVerifiedCustomersPDF = async () => {
  try {
    const response = await axios.get(`${url}/export/pdf/verified`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      responseType: 'blob'
    });

    const contentDisposition = response.headers['content-disposition'];
    let filename = `verified_customers_export_${new Date().toISOString().split('T')[0]}.pdf`;
    if (contentDisposition) {
      const match = contentDisposition.match(/filename="?([^"]+)"?/);
      if (match?.[1]) filename = match[1];
    }

    const blob = new Blob([response.data], { type: 'application/pdf' });
    const ok = triggerDownload(blob, filename);
    return ok
      ? { success: true, message: 'Verified customers PDF exported successfully' }
      : { success: false, error: 'Failed to download PDF' };
  } catch (error) {
    console.error('Verified PDF export error:', error);
    if (error.response?.data instanceof Blob) {
      try {
        const text = await error.response.data.text();
        const obj = JSON.parse(text);
        return { success: false, error: obj.error || 'Failed to export PDF' };
      } catch { /* ignore */ }
    }
    return { success: false, error: error.message || 'Failed to export PDF' };
  }
};

const exportNotVerifiedCustomersPDF = async () => {
  try {
    const response = await axios.get(`${url}/export/pdf/not-verified`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      responseType: 'blob'
    });

    const contentDisposition = response.headers['content-disposition'];
    let filename = `not_verified_customers_export_${new Date().toISOString().split('T')[0]}.pdf`;
    if (contentDisposition) {
      const match = contentDisposition.match(/filename="?([^"]+)"?/);
      if (match?.[1]) filename = match[1];
    }

    const blob = new Blob([response.data], { type: 'application/pdf' });
    const ok = triggerDownload(blob, filename);
    return ok
      ? { success: true, message: 'Not verified customers PDF exported successfully' }
      : { success: false, error: 'Failed to download PDF' };
  } catch (error) {
    console.error('Not Verified PDF export error:', error);
    if (error.response?.data instanceof Blob) {
      try {
        const text = await error.response.data.text();
        const obj = JSON.parse(text);
        return { success: false, error: obj.error || 'Failed to export PDF' };
      } catch { /* ignore */ }
    }
    return { success: false, error: error.message || 'Failed to export PDF' };
  }
};

export {
  getCustomers,
  getCustomerCountByOwner,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getEmployees,
  getCustomersForBranch,
  exportCustomersPDF,
  exportCustomersExcel,
  exportVerifiedCustomersPDF,
  exportNotVerifiedCustomersPDF,
};