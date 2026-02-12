import React, { useState, useEffect } from 'react';
import { Header } from "../Header/Header";
import { Sidebar } from "../Sidebar/Sidebar";
import useActivityLogs from '../../../../hooks/leads/useActivityLogs';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';
import axios from 'axios';
import toast from 'react-hot-toast';

const ActivityLogReport = () => {
  const [isopen, setIsOpen] = useState(false);
  const { logs, loading, pagination, fetchLogs, exportLogs } = useActivityLogs();
  
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    actionType: '',
    entityType: '',
    search: ''
  });

  const [employees, setEmployees] = useState([]);
  const [entityTypes] = useState([
    'Lead', 'Customer', 'Employee', 'Project', 'Task', 'Department', 
    'Designation', 'Service', 'Product', 'Vendor', 'PurchaseOrder', 
    'GRN', 'QualityInspection', 'DeliveryChallan', 'MRF', 'AMC', 
    'Inventory', 'Ticket'
  ]);

  const toggle = () => setIsOpen(!isopen);

  useEffect(() => {
    fetchLogs(1);
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/leads/sales-employees`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );
      if (response.data.success) {
        setEmployees(response.data.employees || []);
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  const handlePageChange = (page) => {
    fetchLogs(page, filters);
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const applyFilters = () => {
    fetchLogs(1, filters);
  };

  const clearFilters = () => {
    setFilters({
      startDate: '',
      endDate: '',
      actionType: '',
      entityType: '',
      search: ''
    });
    fetchLogs(1);
  };

  const handleExport = async () => {
    const exportData = await exportLogs(
      filters.startDate, 
      filters.endDate, 
      filters.actionType,
      filters.entityType
    );
    if (!exportData) return;

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Activity Logs");
    
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `Activity_Logs_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getActionBadge = (actionType) => {
    const badges = {
      'CREATE': 'bg-success',
      'UPDATE': 'bg-primary',
      'DELETE': 'bg-danger',
      'ASSIGN': 'bg-info',
      'REASSIGN': 'bg-warning',
      'STATUS_CHANGE': 'bg-secondary',
      'CALL_ATTEMPT': 'bg-dark'
    };
    return badges[actionType] || 'bg-secondary';
  };

  const getEntityTypeBadge = (entityType) => {
    const badges = {
      'Lead': 'bg-primary',
      'Customer': 'bg-info',
      'Employee': 'bg-success',
      'Project': 'bg-warning',
      'Task': 'bg-secondary',
      'Department': 'bg-dark',
      'Designation': 'bg-danger',
      'Service': 'bg-primary',
      'Product': 'bg-info',
      'Vendor': 'bg-success',
      'PurchaseOrder': 'bg-warning',
      'GRN': 'bg-secondary',
      'QualityInspection': 'bg-dark',
      'DeliveryChallan': 'bg-danger',
      'MRF': 'bg-primary',
      'AMC': 'bg-info',
      'Inventory': 'bg-success',
      'Ticket': 'bg-warning'
    };
    return badges[entityType] || 'bg-secondary';
  };

  // Function to format field names for better readability
  const formatFieldName = (fieldName) => {
    const fieldMap = {
      'custName': 'Customer Name',
      'email': 'Email',
      'phoneNumber1': 'Phone 1',
      'phoneNumber2': 'Phone 2',
      'GSTNo': 'GST No',
      'customerContactPersonName1': 'Contact Person 1',
      'customerContactPersonName2': 'Contact Person 2',
      'billingAddress.add': 'Address',
      'billingAddress.city': 'City',
      'billingAddress.state': 'State',
      'billingAddress.country': 'Country',
      'billingAddress.pincode': 'Pincode',
      'SENDER_COMPANY': 'Company',
      'SENDER_NAME': 'Sender Name',
      'SENDER_EMAIL': 'Sender Email',
      'SENDER_MOBILE': 'Mobile',
      'vendorName': 'Vendor Name',
      'typeOfVendor': 'Vendor Type',
      'zone': 'Zone',
      'ownedBy': 'Owned By'
    };
    
    return fieldMap[fieldName] || fieldName.replace(/([A-Z])/g, ' $1').trim();
  };

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pages = [];
    const maxPagesToShow = 5;
    const currentPage = pagination.currentPage;
    const totalPages = pagination.totalPages;

    if (totalPages <= maxPagesToShow) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push('...');
        pages.push(currentPage - 1);
        pages.push(currentPage);
        pages.push(currentPage + 1);
        pages.push('...');
        pages.push(totalPages);
      }
    }

    return pages;
  };

  return (
    <div className="container-scroller">
      <div className="row background_main_all">
        <Header toggle={toggle} isopen={isopen} />
        <div className="container-fluid page-body-wrapper">
          <Sidebar isopen={isopen} active="ActivityLogReport" />
          <div
            className="main-panel"
            style={{
              width: isopen ? "" : "calc(100% - 120px)",
              marginLeft: isopen ? "" : "125px",
            }}
          >
            <div className="content-wrapper ps-3 ps-md-0 pt-3">
              {/* Header */}
              <div className="row px-2 py-1 align-items-center">
                <div className="col-12 col-lg-6 mb-2">
                  <h5 className="text-white py-2">Activity Log Report</h5>
                  <p className="text-white-50 small mb-0">
                    Complete audit trail of all system activities
                  </p>
                </div>
                <div className="col-12 col-lg-6 text-lg-end">
                  <button 
                    className="btn btn-success me-2"
                    onClick={handleExport}
                  >
                    <i className="fa-solid fa-file-excel me-2"></i>
                    Export
                  </button>
                  <button 
                    className="btn btn-primary"
                    onClick={() => fetchLogs(1)}
                  >
                    <i className="fa-solid fa-refresh me-2"></i>
                    Refresh
                  </button>
                </div>
              </div>

              {/* Filters */}
              <div className="row p-2 m-1">
                <div className="col-12 bg-white p-3 rounded mb-3">
                  <h6 className="mb-3">Filters</h6>
                  <div className="row">
                    <div className="col-md-2 mb-2">
                      <label className="small fw-bold">Start Date</label>
                      <input
                        type="date"
                        className="form-control form-control-sm"
                        name="startDate"
                        value={filters.startDate}
                        onChange={handleFilterChange}
                      />
                    </div>
                    <div className="col-md-2 mb-2">
                      <label className="small fw-bold">End Date</label>
                      <input
                        type="date"
                        className="form-control form-control-sm"
                        name="endDate"
                        value={filters.endDate}
                        onChange={handleFilterChange}
                      />
                    </div>
                    <div className="col-md-2 mb-2">
                      <label className="small fw-bold">Entity Type</label>
                      <select
                        className="form-control form-control-sm"
                        name="entityType"
                        value={filters.entityType}
                        onChange={handleFilterChange}
                      >
                        <option value="">All Entities</option>
                        {entityTypes.map(type => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-2 mb-2">
                      <label className="small fw-bold">Action Type</label>
                      <select
                        className="form-control form-control-sm"
                        name="actionType"
                        value={filters.actionType}
                        onChange={handleFilterChange}
                      >
                        <option value="">All Actions</option>
                        <option value="CREATE">Create</option>
                        <option value="UPDATE">Update</option>
                        <option value="DELETE">Delete</option>
                        <option value="ASSIGN">Assign</option>
                        <option value="REASSIGN">Reassign</option>
                        <option value="STATUS_CHANGE">Status Change</option>
                        <option value="CALL_ATTEMPT">Call Attempt</option>
                      </select>
                    </div>
                    <div className="col-md-4 mb-2">
                      <label className="small fw-bold">Search</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        name="search"
                        placeholder="Entity name, description..."
                        value={filters.search}
                        onChange={handleFilterChange}
                      />
                    </div>
                  </div>
                  <div className="row mt-2">
                    <div className="col-12">
                      <button 
                        className="btn btn-primary btn-sm me-2"
                        onClick={applyFilters}
                      >
                        <i className="fa-solid fa-filter me-1"></i>
                        Apply Filters
                      </button>
                      <button 
                        className="btn btn-secondary btn-sm"
                        onClick={clearFilters}
                      >
                        <i className="fa-solid fa-times me-1"></i>
                        Clear Filters
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Activity Logs Table */}
              <div className="row bg-white p-3 m-1 border rounded">
                <div className="col-12">
                  <h5 className="mb-3">
                    Activity Timeline 
                    {pagination.totalRecords > 0 && (
                      <span className="badge bg-primary ms-2">{pagination.totalRecords} records</span>
                    )}
                  </h5>
                  <div className="table-responsive">
                    <table className="table table-striped table-hover">
                      <thead className="table-dark">
                        <tr>
                          <th style={{width: '150px'}}>Date & Time</th>
                          <th style={{width: '120px'}}>Entity</th>
                          <th style={{width: '120px'}}>Action</th>
                          <th>Entity Name</th>
                          <th>Description</th>
                          <th>Changes</th>
                          <th>User</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loading ? (
                          <tr>
                            <td colSpan="7" className="text-center py-4">
                              <div className="spinner-border text-primary" role="status">
                                <span className="visually-hidden">Loading...</span>
                              </div>
                            </td>
                          </tr>
                        ) : logs.length > 0 ? (
                          logs.map((log) => (
                            <tr key={log._id}>
                              <td className="small">{formatDateTime(log.timestamp)}</td>
                              <td>
                                <span className={`badge ${getEntityTypeBadge(log.entityType)}`}>
                                  {log.entityType}
                                </span>
                              </td>
                              <td>
                                <span className={`badge ${getActionBadge(log.actionType)}`}>
                                  {log.actionType}
                                </span>
                              </td>
                              <td>
                                <div className="small">
                                  <div className="fw-bold">
                                    {log.entityInfo?.name || 'N/A'}
                                  </div>
                                  {log.entityType === 'Customer' && log.entityInfo?.email && (
                                    <div className="text-muted" style={{ fontSize: '11px' }}>
                                      {log.entityInfo.email}
                                    </div>
                                  )}
                                  <div className="text-muted" style={{ fontSize: '11px' }}>
                                    ID: {log.entityId?.substring(0, 8)}...
                                  </div>
                                </div>
                              </td>
                              <td>{log.description}</td>
                              <td>
                                {log.changes && log.changes.length > 0 ? (
                                  <div className="small">
                                    {log.changes.map((change, idx) => (
                                      <div key={idx} className="mb-1">
                                        <div className="fw-bold" style={{ fontSize: '11px', color: '#495057' }}>
                                          {formatFieldName(change.field)}
                                        </div>
                                        <div style={{ fontSize: '10px' }}>
                                          <span className="text-danger">
                                            {String(change.oldValue || 'Empty').substring(0, 30)}
                                          </span>
                                          <i className="fa-solid fa-arrow-right mx-1" style={{ fontSize: '8px' }}></i>
                                          <span className="text-success">
                                            {String(change.newValue || 'Empty').substring(0, 30)}
                                          </span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-muted small">No changes</span>
                                )}
                              </td>
                              <td className="small">{log.actionByName}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="7" className="text-center py-4">
                              No activity logs found
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {pagination.totalPages > 1 && (
                    <div className="d-flex justify-content-center align-items-center mt-3">
                      <nav>
                        <ul className="pagination mb-0">
                          <li className={`page-item ${!pagination.hasPrevPage ? 'disabled' : ''}`}>
                            <button
                              className="page-link"
                              onClick={() => handlePageChange(pagination.currentPage - 1)}
                              disabled={!pagination.hasPrevPage}
                            >
                              Previous
                            </button>
                          </li>
                          
                          {getPageNumbers().map((page, index) => (
                            <li 
                              key={index} 
                              className={`page-item ${page === pagination.currentPage ? 'active' : ''} ${page === '...' ? 'disabled' : ''}`}
                            >
                              {page === '...' ? (
                                <span className="page-link">...</span>
                              ) : (
                                <button
                                  className="page-link"
                                  onClick={() => handlePageChange(page)}
                                >
                                  {page}
                                </button>
                              )}
                            </li>
                          ))}
                          
                          <li className={`page-item ${!pagination.hasNextPage ? 'disabled' : ''}`}>
                            <button
                              className="page-link"
                              onClick={() => handlePageChange(pagination.currentPage + 1)}
                              disabled={!pagination.hasNextPage}
                            >
                              Next
                            </button>
                          </li>
                        </ul>
                      </nav>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActivityLogReport;