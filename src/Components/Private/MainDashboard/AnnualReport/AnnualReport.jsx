import React, { useState, useEffect } from 'react';
import { Header } from "../Header/Header";
import { Sidebar } from "../Sidebar/Sidebar";
import axios from 'axios';
import toast from 'react-hot-toast';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';

const AnnualReport = () => {
  const [isopen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [reportData, setReportData] = useState({
    monthlyData: [],
    activityByType: [],
    topUsers: []
  });

  const toggle = () => setIsOpen(!isopen);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  useEffect(() => {
    fetchAnnualReport();
  }, [selectedYear]);

  const fetchAnnualReport = async () => {
    setLoading(true);
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/activity/annual`,
        {
          params: { year: selectedYear },
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );

      if (response.data.success) {
        // Group activity by type for better display
        const activityByTypeGrouped = {};
        if (response.data.activityByType && Array.isArray(response.data.activityByType)) {
          response.data.activityByType.forEach(item => {
            const actionType = item._id?.actionType || item._id || 'Unknown';
            if (!activityByTypeGrouped[actionType]) {
              activityByTypeGrouped[actionType] = 0;
            }
            activityByTypeGrouped[actionType] += item.count;
          });
        }

        const activityByTypeArray = Object.entries(activityByTypeGrouped).map(([type, count]) => ({
          _id: type,
          count: count
        }));

        setReportData({
          monthlyData: response.data.monthlyData || [],
          activityByType: activityByTypeArray,
          topUsers: response.data.topUsers || []
        });
      }
    } catch (error) {
      console.error('Error fetching annual report:', error);
      toast.error('Failed to fetch annual report');
    } finally {
      setLoading(false);
    }
  };

  const handleYearChange = (e) => {
    setSelectedYear(parseInt(e.target.value));
  };

  const exportToExcel = () => {
    const workbook = XLSX.utils.book_new();

    // Monthly Summary Sheet
    const monthlySheetData = reportData.monthlyData.map(month => {
      const row = {
        'Month': monthNames[month._id - 1],
        'Total Activities': month.total
      };
      
      // Add each action type as a column
      if (month.actions && Array.isArray(month.actions)) {
        month.actions.forEach(action => {
          row[action.type] = action.count;
        });
      }
      
      return row;
    });
    const monthlySheet = XLSX.utils.json_to_sheet(monthlySheetData);
    XLSX.utils.book_append_sheet(workbook, monthlySheet, 'Monthly Summary');

    // Activity by Type Sheet
    const typeSheetData = reportData.activityByType.map(item => ({
      'Action Type': item._id,
      'Count': item.count
    }));
    const typeSheet = XLSX.utils.json_to_sheet(typeSheetData);
    XLSX.utils.book_append_sheet(workbook, typeSheet, 'Activity by Type');

    // Top Users Sheet
    const usersSheetData = reportData.topUsers.map((user, index) => ({
      'Rank': index + 1,
      'User Name': user._id?.userName || 'Unknown',
      'Total Actions': user.count
    }));
    const usersSheet = XLSX.utils.json_to_sheet(usersSheetData);
    XLSX.utils.book_append_sheet(workbook, usersSheet, 'Top Users');

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `Annual_Activity_Report_${selectedYear}.xlsx`);
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

  const getTotalActivities = () => {
    return reportData.monthlyData.reduce((sum, month) => sum + (month.total || 0), 0);
  };

  return (
    <div className="container-scroller">
      <div className="row background_main_all">
        <Header toggle={toggle} isopen={isopen} />
        <div className="container-fluid page-body-wrapper">
          <Sidebar isopen={isopen} active="AnnualReport" />
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
                  <h5 className="text-white py-2">Annual Activity Report</h5>
                  <p className="text-white-50 small mb-0">
                    Year-wise activity summary and trends
                  </p>
                </div>
                <div className="col-12 col-lg-6 text-lg-end">
                  <select
                    className="form-select form-select-sm d-inline-block w-auto me-2"
                    value={selectedYear}
                    onChange={handleYearChange}
                  >
                    {[...Array(5)].map((_, i) => {
                      const year = new Date().getFullYear() - i;
                      return <option key={year} value={year}>{year}</option>;
                    })}
                  </select>
                  <button 
                    className="btn btn-success me-2"
                    onClick={exportToExcel}
                    disabled={reportData.monthlyData.length === 0}
                  >
                    <i className="fa-solid fa-file-excel me-2"></i>
                    Export
                  </button>
                  <button 
                    className="btn btn-primary"
                    onClick={fetchAnnualReport}
                  >
                    <i className="fa-solid fa-refresh me-2"></i>
                    Refresh
                  </button>
                </div>
              </div>

              {/* Summary Cards - Updated Design */}
              <div className="row p-2 m-1">
                {/* Total Activities Card */}
                <div className="col-md-4 mb-3">
                  <div className="card shadow-sm border-0" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                    <div className="card-body text-white">
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <h6 className="card-title mb-1 text-white-50 small">Total Activities</h6>
                          <h2 className="mb-0 fw-bold">{getTotalActivities().toLocaleString()}</h2>
                          <small className="text-white-50">in {selectedYear}</small>
                        </div>
                        <div>
                          <i className="fa-solid fa-chart-line fa-3x opacity-50"></i>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Active Months Card */}
                <div className="col-md-4 mb-3">
                  <div className="card shadow-sm border-0" style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}>
                    <div className="card-body text-white">
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <h6 className="card-title mb-1 text-white-50 small">Active Months</h6>
                          <h2 className="mb-0 fw-bold">{reportData.monthlyData.length}</h2>
                          <small className="text-white-50">with activities</small>
                        </div>
                        <div>
                          <i className="fa-solid fa-calendar-days fa-3x opacity-50"></i>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Active Users Card */}
                <div className="col-md-4 mb-3">
                  <div className="card shadow-sm border-0" style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }}>
                    <div className="card-body text-white">
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <h6 className="card-title mb-1 text-white-50 small">Active Users</h6>
                          <h2 className="mb-0 fw-bold">{reportData.topUsers.length}</h2>
                          <small className="text-white-50">contributing users</small>
                        </div>
                        <div>
                          <i className="fa-solid fa-users fa-3x opacity-50"></i>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Monthly Breakdown */}
              <div className="row bg-white p-3 m-1 border rounded mb-3 shadow-sm">
                <div className="col-12">
                  <h5 className="mb-3">
                    <i className="fa-solid fa-calendar-check me-2 text-primary"></i>
                    Monthly Breakdown
                  </h5>
                  {loading ? (
                    <div className="text-center py-4">
                      <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Loading...</span>
                      </div>
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-striped table-hover">
                        <thead className="table-dark">
                          <tr>
                            <th>Month</th>
                            <th>Total</th>
                            <th>CREATE</th>
                            <th>UPDATE</th>
                            <th>DELETE</th>
                            <th>ASSIGN</th>
                            <th>STATUS_CHANGE</th>
                            <th>CALL_ATTEMPT</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reportData.monthlyData.length > 0 ? (
                            reportData.monthlyData.map((month) => {
                              const actions = month.actions || [];
                              return (
                                <tr key={month._id}>
                                  <td className="fw-bold">{monthNames[month._id - 1]}</td>
                                  <td className="fw-bold text-primary">{month.total.toLocaleString()}</td>
                                  {['CREATE', 'UPDATE', 'DELETE', 'ASSIGN', 'STATUS_CHANGE', 'CALL_ATTEMPT'].map(type => {
                                    const action = actions.find(a => a.type === type);
                                    return <td key={type}>{action ? action.count.toLocaleString() : 0}</td>;
                                  })}
                                </tr>
                              );
                            })
                          ) : (
                            <tr>
                              <td colSpan="8" className="text-center py-4 text-muted">
                                <i className="fa-solid fa-inbox fa-2x mb-2 d-block"></i>
                                No data available for {selectedYear}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              {/* Activity by Type & Top Users */}
              <div className="row m-1">
                <div className="col-md-6 mb-3">
                  <div className="bg-white p-3 border rounded shadow-sm">
                    <h5 className="mb-3">
                      <i className="fa-solid fa-chart-pie me-2 text-success"></i>
                      Activity by Type
                    </h5>
                    <div className="table-responsive">
                      <table className="table table-sm table-hover">
                        <thead className="table-light">
                          <tr>
                            <th>Action Type</th>
                            <th className="text-end">Count</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reportData.activityByType && reportData.activityByType.length > 0 ? (
                            reportData.activityByType.map((item, index) => (
                              <tr key={index}>
                                <td>
                                  <span className={`badge ${getActionBadge(item._id)}`}>
                                    {item._id}
                                  </span>
                                </td>
                                <td className="text-end fw-bold">{item.count.toLocaleString()}</td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan="2" className="text-center py-4 text-muted">
                                <i className="fa-solid fa-chart-simple fa-2x mb-2 d-block"></i>
                                No activity data available
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                <div className="col-md-6 mb-3">
                  <div className="bg-white p-3 border rounded shadow-sm">
                    <h5 className="mb-3">
                      <i className="fa-solid fa-trophy me-2 text-warning"></i>
                      Top 10 Active Users
                    </h5>
                    <div className="table-responsive">
                      <table className="table table-sm table-hover">
                        <thead className="table-light">
                          <tr>
                            <th style={{ width: '60px' }}>Rank</th>
                            <th>User Name</th>
                            <th className="text-end">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reportData.topUsers && reportData.topUsers.length > 0 ? (
                            reportData.topUsers.map((user, index) => (
                              <tr key={user._id?.userId || index}>
                                <td>
                                  <span className={`badge ${index === 0 ? 'bg-warning' : index === 1 ? 'bg-secondary' : index === 2 ? 'bg-info' : 'bg-primary'}`}>
                                    {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
                                  </span>
                                </td>
                                <td className="fw-semibold">{user._id?.userName || 'Unknown'}</td>
                                <td className="text-end fw-bold text-primary">{user.count.toLocaleString()}</td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan="3" className="text-center py-4 text-muted">
                                <i className="fa-solid fa-user-slash fa-2x mb-2 d-block"></i>
                                No user data available
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnnualReport;