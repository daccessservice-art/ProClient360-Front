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

// Add Function - Get customer by ID
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

// Get employees for dropdown
const getEmployees = async () => {
  try {
    const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/employee/all`, {
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

// Helper function to trigger download with production compatibility
const triggerDownload = (blob, filename) => {
  try {
    // For iOS/Mac Safari compatibility
    if (navigator.userAgent.match(/(iPod|iPhone|iPad|Safari)/) && !navigator.userAgent.match(/Chrome/)) {
      // Use window.open for Safari
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
      // Standard download for other browsers
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

// PDF Export Function - Updated for production compatibility
const exportCustomersPDF = async () => {
  try {
    const response = await axios.get(`${url}/export/pdf`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      },
      responseType: 'blob'
    });
    
    // Get filename from headers or use default
    const contentDisposition = response.headers['content-disposition'];
    let filename = `customers_export_${new Date().toISOString().split('T')[0]}.pdf`;
    
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
      if (filenameMatch && filenameMatch[1]) {
        filename = filenameMatch[1];
      }
    }
    
    // Create blob and trigger download
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const downloadSuccess = triggerDownload(blob, filename);
    
    if (downloadSuccess) {
      return { success: true, message: 'PDF exported successfully' };
    } else {
      return { success: false, error: 'Failed to download PDF' };
    }
  } catch (error) {
    console.error('PDF export error:', error);
    
    // Try to extract error message if it's a JSON response
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

// Excel Export Function - Updated for production compatibility
const exportCustomersExcel = async () => {
  try {
    const response = await axios.get(`${url}/export/excel`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      },
      responseType: 'blob'
    });
    
    // Get filename from headers or use default
    const contentDisposition = response.headers['content-disposition'];
    let filename = `customers_export_${new Date().toISOString().split('T')[0]}.xlsx`;
    
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
      if (filenameMatch && filenameMatch[1]) {
        filename = filenameMatch[1];
      }
    }
    
    // Create blob and trigger download
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
    
    // Try to extract error message if it's a JSON response
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

// UPDATE EXPORTS TO INCLUDE getCustomerById
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