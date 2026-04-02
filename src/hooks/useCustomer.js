import axios from 'axios';

const baseUrl = process.env.REACT_APP_API_URL;
const url = baseUrl + "/api/customer";

const getCustomers = async (page = 1, limit = 20, search = null) => {
  try {
    const response = await axios.get(`${url}?q=${search}&page=${page}&limit=${limit}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
    const data = response.data;
    return data;
  }
  catch (error) {
    console.error(error?.response?.data);
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
    const data = response.data;
    return data;
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
    const data = response.data;
    return data;
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
    const data = response.data;
    return data;
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
    const data = response.data;

    return data;
  } catch (error) {
    console.log(error.response.data);
    return error.response.data.error;
  }
};

// ✅ FIXED: Get employees for dropdown - Updated endpoint and response handling
const getEmployees = async () => {
  try {
    console.log('Fetching employees...');
    const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/employee`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
    console.log('Employees response:', response.data);
    
    // Handle different response formats
    if (response.data.success && response.data.employees) {
      return { success: true, employees: response.data.employees };
    } else if (response.data.success && response.data.data) {
      return { success: true, employees: response.data.data };
    } else if (Array.isArray(response.data)) {
      return { success: true, employees: response.data };
    } else if (response.data.employees) {
      return { success: true, employees: response.data.employees };
    } else if (response.data.data) {
      return { success: true, employees: response.data.data };
    } else {
      console.log('Unexpected response format:', response.data);
      return { success: false, employees: [] };
    }
  } catch (error) {
    console.error('Error fetching employees:', error?.response?.data || error.message);
    return { success: false, employees: [] };
  }
};

const triggerDownload = (blob, filename) => {
  try {
    if (navigator.userAgent.match(/(iPod|iPhone|iPad|Safari)/) && !navigator.userAgent.match(/Chrome/)) {
      const fileURL = URL.createObjectURL(blob);
      const newWindow = window.open(fileURL, '_blank');
      if (!newWindow) {
        throw new Error('Popup blocked');
      }
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
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      },
      responseType: 'blob'
    });
    
    const contentDisposition = response.headers['content-disposition'];
    let filename = `customers_export_${new Date().toISOString().split('T')[0]}.pdf`;
    
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
      if (filenameMatch && filenameMatch[1]) {
        filename = filenameMatch[1];
      }
    }
    
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const downloadSuccess = triggerDownload(blob, filename);
    
    if (downloadSuccess) {
      return { success: true, message: 'PDF exported successfully' };
    } else {
      return { success: false, error: 'Failed to download PDF' };
    }
  } catch (error) {
    console.error('PDF export error:', error);
    
    if (error.response && error.response.data instanceof Blob) {
      try {
        const errorText = await error.response.data.text();
        const errorObj = JSON.parse(errorText);
        return { success: false, error: errorObj.error || 'Failed to export PDF' };
      } catch (e) {
        return { success: false, error: 'Failed to export PDF' };
      }
    }
    
    return { success: false, error: error.message || 'Failed to export PDF' };
  }
};

const exportCustomersExcel = async () => {
  try {
    const response = await axios.get(`${url}/export/excel`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      },
      responseType: 'blob'
    });
    
    const contentDisposition = response.headers['content-disposition'];
    let filename = `customers_export_${new Date().toISOString().split('T')[0]}.xlsx`;
    
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
      if (filenameMatch && filenameMatch[1]) {
        filename = filenameMatch[1];
      }
    }
    
    const blob = new Blob([response.data], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    const downloadSuccess = triggerDownload(blob, filename);
    
    if (downloadSuccess) {
      return { success: true, message: 'Excel exported successfully' };
    } else {
      return { success: false, error: 'Failed to download Excel' };
    }
  } catch (error) {
    console.error('Excel export error:', error);
    
    if (error.response && error.response.data instanceof Blob) {
      try {
        const errorText = await error.response.data.text();
        const errorObj = JSON.parse(errorText);
        return { success: false, error: errorObj.error || 'Failed to export Excel' };
      } catch (e) {
        return { success: false, error: 'Failed to export Excel' };
      }
    }
    
    return { success: false, error: error.message || 'Failed to export Excel' };
  }
};

export { 
  getCustomers, 
  getCustomerById, 
  createCustomer, 
  updateCustomer, 
  deleteCustomer,
  getEmployees,
  exportCustomersPDF,
  exportCustomersExcel 
};