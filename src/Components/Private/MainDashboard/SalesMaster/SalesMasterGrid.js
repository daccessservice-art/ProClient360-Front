import { useState, useContext, useEffect, useMemo } from "react";
import { Header } from "../Header/Header";
import { Sidebar } from "../Sidebar/Sidebar";
import toast from 'react-hot-toast';
import AddSalesLeadPopUp from "./PopUp/AddSalesLeadPopUp";
import { formatDateforTaskUpdate } from "../../../../utils/formatDate";
import SalesDashboardCards from './SalesDashboardCards';
import SalesQuotationFunnel from './SalesQuotationFunnel';
import { UserContext } from "../../../../context/UserContext";

import DeletePopUP from "../../CommonPopUp/DeletePopUp";
import ViewSalesLeadPopUp from "../../CommonPopUp/ViewSalesLeadPopUp";
import UpdateSalesPopUp from "./PopUp/UpdateSalesPopUp";
import AssignSalesLeadPopUp from "./PopUp/AssignSalesLeadPopUp";
import useMyLeads from "../../../../hooks/leads/useMyLeads";
import useSubmitEnquiry from "../../../../hooks/leads/useSubmitEnquiry";
import useCreateLead from "../../../../hooks/leads/useCreateLead";
import useDeleteLead from "../../../../hooks/leads/useDeleteLead";
import useReassignLead from "../../../../hooks/leads/useReassignLead";

export const SalesMasterGrid = () => {
  const [isopen, setIsOpen] = useState(false);
  const toggle = () => {
    setIsOpen(!isopen);
  };

  const [addpop, setIsAddModalVisible] = useState(false);
  const [UpdatePopUpShow, setUpdatePopUpShow] = useState(false);
  const [showLeadPopUp, setShowLeadPopUp] = useState(false);
  const [assignPopUpShow, setAssignPopUpShow] = useState(false);

  const [selectedLead, setSelectedLead] = useState(null);
  const [deletePopUpShow, setDeletePopUpShow] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState(null);

  const { user } = useContext(UserContext);

  const [filters, setFilters] = useState({
    status: null,
    date: null,
    callLeads: null,
    source: null,
    searchTerm: "",
    followUpToday: false
  });
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 0,
    totalServices: 0,
    limit: 20,
    hasNextPage: true,
    hasPrevPage: false,
  });
  const itemsPerPage = 20;

  const { data, loading, error, refetch } = useMyLeads(pagination.currentPage, itemsPerPage, filters);
  const { submitEnquiry } = useSubmitEnquiry();
  const { createLead } = useCreateLead();
  const { deleteLead } = useDeleteLead();
  const { reassignLead, loading: assignLoading } = useReassignLead();

  const [allLeads, setAllLeads] = useState([]);

  useEffect(() => {
    if (data) {
      setPagination(prev => ({ ...prev, ...data.pagination }));

      if (data.leads) {

        if (!filters.followUpToday) {
          setAllLeads(data.leads);
        } else {
          setAllLeads(data.leads);
        }
      }
    }
    if (error) {
      toast.error(error.message || "An error occurred");
    }
  }, [data, error, filters.followUpToday]);

  useEffect(() => {
    if (filters.status !== null || filters.date !== null || filters.source !== null || filters.callLeads !== null || filters.followUpToday) {
      setAllLeads([]);
      setPagination(prev => ({ ...prev, currentPage: 1 }));
      refetch();
    }
  }, [filters.status, filters.date, filters.source, filters.callLeads, filters.followUpToday]);

  const filteredLeads = useMemo(() => {
    if (!filters.searchTerm) return allLeads;

    const searchLower = filters.searchTerm.toLowerCase();
    return allLeads.filter(lead =>
      (lead.SENDER_COMPANY && lead.SENDER_COMPANY.toLowerCase().includes(searchLower)) ||
      (lead.SENDER_MOBILE && lead.SENDER_MOBILE.toLowerCase().includes(searchLower))
    );
  }, [allLeads, filters.searchTerm]);

  const isSearchMode = filters.searchTerm !== "";
  const isFollowUpTodayMode = filters.followUpToday;

  const handlePageChange = (page) => {
    if (page >= 1 && page <= pagination.totalPages) {
      setPagination(prev => ({ ...prev, currentPage: page }));
    }
  };

  const handleUpdate = (lead = null) => {
    if (lead && (lead.STATUS === 'Won' || lead.STATUS === 'Lost')) {
      toast.error(`Cannot update a lead with status "${lead.STATUS}". This lead is already finalized.`);
      return;
    }

    setSelectedLead(lead);
    setUpdatePopUpShow(true);
  };

  const handleAssign = (lead = null) => {
    const canAssign = user?.permissions?.includes('updateLead') || user?.user === 'company';

    if (!canAssign) {
      toast.error("You don't have permission to reassign leads.");
      return;
    }

    // Add this check to prevent reassigning finalized leads
    if (lead && (lead.STATUS === 'Won' || lead.STATUS === 'Lost')) {
      toast.error(`Cannot reassign a lead with status "${lead.STATUS}". This lead is already finalized.`);
      return;
    }

    setSelectedLead(lead);
    setAssignPopUpShow(true);
  };

  const handleDelete = (leadId) => {
    // Find the lead to check its status
    const lead = allLeads.find(l => l._id === leadId);
    if (lead && (lead.STATUS === 'Won' || lead.STATUS === 'Lost')) {
      toast.error(`Cannot delete a lead with status "${lead.STATUS}". This lead is already finalized.`);
      return;
    }
    
    setSelectedLeadId(leadId);
    setDeletePopUpShow(true);
  };

  const handleDeleteConfirm = async () => {
    if(!selectedLeadId) return;
    try {
      toast.loading("Deleting lead...");
      const data = await deleteLead(selectedLeadId);
      toast.dismiss();
      if(data?.success){
        toast.success("Lead deleted successfully!");
        setDeletePopUpShow(false);
        setSelectedLeadId(null);

        setAllLeads(prev => prev.filter(lead => lead._id !== selectedLeadId));

        refetch();
      } else {
        toast.error(data?.error || "Failed to delete lead");
      }
    } catch (error) {
      toast.error("Failed to delete lead");
    }
  };

  const handleAssignSubmit = async (id, assignData) => {
    try {
      toast.loading("Reassigning lead...");
      const data = await reassignLead(id, assignData);
      toast.dismiss();

      if (data?.success) {
        toast.success(data?.message || "Lead reassigned successfully!");
        setAssignPopUpShow(false);
        setSelectedLead(null);
        refetch();
      } else {
        toast.error(data?.error || "Failed to reassign lead");
      }
    } catch (error) {
      console.error("Reassign lead error:", error);
      toast.error("Failed to reassign lead");
    }
  };

  const handleBgColor = (status) => {
    switch (status) {
      case "Won":
        return "badge bg-success text-white";
      case "Ongoing":
        return "badge bg-primary text-white";
      case "Pending":
        return "badge bg-warning text-dark";
      case "Lost":
        return "badge bg-danger text-white";
      case "today":
        return "badge bg-warning text-white";
      default:
        return "badge bg-secondary";
    }
  }

  const handleUpdateSubmit = async (id, enquiryData) => {
    try {
      if (enquiryData) {
        const data = await submitEnquiry(id, enquiryData);
        if (data?.success) {
          toast.success(data?.message);
        } else {
          toast.error(data?.error);
        }
        refetch();
      }
    } catch (error) {
      console.error("Update error:", error);
      toast.error("Failed to Submit Enquiry");
    }
  };

  const handleDetailsPopUpClick = (lead) => {
    setSelectedLead(lead);
    setShowLeadPopUp(true);
  };

  const handleChange = (filterType, value) => {
    console.log(`Filter changed: ${filterType} = ${value}`);
    setFilters(prevFilters => ({
      ...prevFilters,
      [filterType]: value || null
    }));
  };

  const handleSearchChange = (e) => {
    const searchTerm = e.target.value;
    setFilters(prevFilters => ({ ...prevFilters, searchTerm }));
  };


  const handleTodayFollowUpClick = () => {
    console.log("Today's FollowUp card clicked");
   
    setFilters(prevFilters => ({
      ...prevFilters,
      followUpToday: true,
      date: null,
      status: null,
      source: null,
      callLeads: null
    }));
  };

  const handleOpenAddModal = () => setIsAddModalVisible(true);
  const handleCloseAddModal = () => setIsAddModalVisible(false);

  const handleAddLeadSubmit = async (leadData) => {
    console.log('Lead creation data:', leadData);
    toast.loading("Adding lead...");
    const data = await createLead(leadData);
    toast.dismiss();
    console.log('Lead creation response:', data);
    if (data?.success) {
      toast.success(data?.message || "Lead added successfully!");
      handleCloseAddModal();
      setAllLeads([]);
      setPagination(prev => ({ ...prev, currentPage: 1 }));
      refetch();
    } else {
      toast.error(data?.error || "Failed to add lead");
    }
  };

  const resetSearch = () => {
    setFilters(prev => ({ ...prev, searchTerm: "" }));
    setAllLeads([]);
  };

  const resetFilters = () => {
    console.log("Resetting all filters");
    setFilters({
      status: null,
      date: null,
      callLeads: null,
      source: null,
      searchTerm: "",
      followUpToday: false
    });
    setAllLeads([]);
    setPagination(prev => ({ ...prev, currentPage: 1 }));
    refetch();
  };

  const canAssignLead = user?.permissions?.includes('updateLead') || user?.user === 'company';

  return (
    <>
      {loading && (
        <div className="overlay">
          <span className="loader"></span>
        </div>
      )}

      <div className="container-scroller">
        <div className="row background_main_all">
          <Header toggle={toggle} isopen={isopen} />
          <div className="container-fluid page-body-wrapper">
            <Sidebar isopen={isopen} active="SalesMasterGrid" />
            <div
              className="main-panel"
              style={{
                width: isopen ? "" : "calc(100% - 120px)",
                marginLeft: isopen ? "" : "125px",
              }}
            >
              <div className="content-wrapper ps-3 ps-md-0 pt-3">
                <div className="row px-2 py-1">
                  <div className="col-12 col-lg-4">
                    <h5 className="text-white py-2">My Sales Dashboard</h5>
                  </div>
                  {user?.permissions?.includes("createLead") || user?.user === 'company' ? (
                    <div className="col- col-lg-2 ms-auto text-end me-5">
                      <button onClick={handleOpenAddModal} type="button" className="btn adbtn btn-dark">
                        <i className="fa-solid fa-plus"></i> Add
                      </button>
                    </div>
                  ) : null}
                </div>

                <SalesDashboardCards
                  allLeadsCount={data?.leadCounts?.allLeadsCount || 0}
                  ongogingCount={data?.leadCounts?.ongogingCount || 0}
                  winCount={data?.leadCounts?.winCount || 0}
                  pendingCount={data?.leadCounts?.pendingCount || 0}
                  lostCount={data?.leadCounts?.lostCount || 0}
                  todayCount={data?.leadCounts?.todaysFollowUpCount || 0}
                  hotleadsCount={data?.leadCounts?.hotleadsCount || 0}
                  warmLeadsCount={data?.leadCounts?.warmLeadsCount || 0}
                  coldLeadsCount={data?.leadCounts?.coldLeadsCount || 0}
                  invalidLeadsCount={data?.leadCounts?.invalidLeadsCount || 0}
                  onTodayFollowUpClick={handleTodayFollowUpClick}
                />

                {/* Quotation Funnel */}
                {data?.quotationFunnel && (
                  <div className="row p-2 m-1">
                    <div className="col-12">
                      <SalesQuotationFunnel
                        totalQuotationAmount={data.quotationFunnel.totalActiveQuotationAmount || 0}
                        activeQuotationLeads={data.quotationFunnel.activeQuotationLeads || []}
                        wonAmount={data.quotationFunnel.totalWonAmount || 0}
                        lostAmount={data.quotationFunnel.totalLostAmount || 0}
                      />
                    </div>
                  </div>
                )}

                <div className="row align-items-center p-2 m-1">
                  <div className="col-12 col-lg-6">
                    <div className="input-group">
                      <input
                        type="text"
                        className="form-control bg_edit"
                        placeholder="Search by Mobile Number or Company Name....."
                        value={filters.searchTerm || ""}
                        onChange={handleSearchChange}
                      />
                      {filters.searchTerm && (
                        <button
                          className="btn btn-outline-secondary"
                          type="button"
                          onClick={resetSearch}
                        >
                          <i className="fa-solid fa-times"></i>
                        </button>
                      )}
                      <button className="btn btn-dark" type="button">
                        <i className="fa-solid fa-search"></i>
                      </button>
                    </div>
                    {isSearchMode && (
                      <div className="mt-2">
                        <small className="text-muted">
                          Searching through {allLeads.length} leads. {filteredLeads.length} matches found.
                        </small>
                      </div>
                    )}
                    {isFollowUpTodayMode && (
                      <div className="mt-2">
                        <small className="text-info">
                          Showing leads with follow-up scheduled for today
                        </small>
                      </div>
                    )}
                  </div>
                  <div className="col-12 col-lg-6 ms-auto text-end">
                    <div className="row g-2">
                      <div className="col">
                        <input
                          type="date"
                          className="form-control bg_edit"
                          name="date"
                          onChange={(e) => handleChange('date', e.target.value)}
                          value={filters.date || ""}
                          disabled={isFollowUpTodayMode}
                        />
                      </div>

                      <div className="col">
                        <select
                          className="form-select bg_edit"
                          name="callLeads"
                          onChange={(e) => handleChange('callLeads', e.target.value)}
                          value={filters.callLeads || ""}
                          disabled={isFollowUpTodayMode}
                        >
                          <option value="">Leads....</option>
                          <option value="Hot Leads">Hot Leads</option>
                          <option value="Warm Leads">Warm Leads</option>
                          <option value="Cold Leads">Cold Leads</option>
                          <option value="Invalid Leads">Invalid Leads</option>
                        </select>
                      </div>

                      <div className="col">
                        <select
                          className="form-select bg_edit"
                          name="source"
                          onChange={(e) => handleChange('source', e.target.value)}
                          value={filters.source || ""}
                          disabled={isFollowUpTodayMode}
                        >
                          <option value="">Sources....</option>
                          <option value="Direct">Direct</option>
                          <option value="IndiaMart">IndiaMart</option>
                          <option value="TradeIndia">TradeIndia</option>
                          <option value="Facebook">Facebook</option>
                          <option value="LinkedIn">LinkedIn</option>
                          <option value="Google">Google</option>
                          <option value="Tender">Tender</option>
                          <option value="Exhibitions">Exhibitions</option>
                          <option value="JustDial">JustDial</option>
                          <option value="Twitter">Twitter</option>
                          <option value="YouTube">YouTube</option>
                          <option value="WhatsApp">WhatsApp</option>
                          <option value="Referral">Referral</option>
                          <option value="Email Campaign">Email Campaign</option>
                          <option value="Cold Call">Cold Call</option>
                          <option value="Website">Website</option>
                          <option value="Walk-In">Walk-In</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>

                      <div className="col">
                        <select
                          className="form-select bg_edit"
                          name="status"
                          onChange={(e) => handleChange('status', e.target.value)}
                          value={filters.status || ""}
                          disabled={isFollowUpTodayMode}
                        >
                          <option value="">Status....</option>
                          <option value="Won">Won</option>
                          <option value="Ongoing">Ongoing</option>
                          <option value="Pending">Pending</option>
                          <option value="Lost">Lost</option>
                        </select>
                      </div>
                     
                      <div className="col">
                        <button
                          className="btn btn-outline-secondary w-100"
                          type="button"
                          onClick={resetFilters}
                          title="Reset all filters"
                        >
                          <i className="fa-solid fa-filter-circle-xmark"></i> Reset
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="row bg-white p-2 m-1 border rounded">
                  <div className="col-12 py-2">
                    <div className="table-responsive">
                      <table className="table table-striped table-class" id="table-id">
                        <thead>
                          <tr className="th_border">
                            <th>Sr.No</th>
                            <th className="align_left_td td_width">Company Name</th>
                            <th className="align_left_td td_width">Contact Name</th>
                            <th className="align_left_td td_width">Product</th>
                            <th>Sources</th>
                            <th>Mobile</th>
                            <th>Date</th>
                            <th>Status</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody className="broder my-4">
                          {(isSearchMode || isFollowUpTodayMode ? filteredLeads : data?.leads)?.length > 0 ? (
                            (isSearchMode || isFollowUpTodayMode ? filteredLeads : data?.leads).map((lead, index) => (
                              <tr key={lead._id}>
                                <td>{(pagination.currentPage - 1) * itemsPerPage + index + 1}</td>
                                <td className="align_left_td td_width">{lead.SENDER_COMPANY||"Not available."}</td>
                                <td className="align_left_td td_width">{lead.SENDER_NAME||"Not available."}</td>
                                <td className="align_left_td td_width">{lead.QUERY_PRODUCT_NAME||"Not available."}</td>
                                <td>{lead.SOURCE}</td>
                                <td>{lead.SENDER_MOBILE||"Not available."}</td>
                                <td>{formatDateforTaskUpdate(lead.nextFollowUpDate || lead.createdAt)}</td>
                                <td>
                                  <span className={handleBgColor(lead.STATUS)}>{lead.STATUS}</span>
                                </td>
                                <td>
                                  {/* For Won and Lost leads - only show view button */}
                                  {lead.STATUS === 'Won' || lead.STATUS === 'Lost' ? (
                                    <span onClick={() => handleDetailsPopUpClick(lead)} title="View Lead Details">
                                      <i className="mx-1 fa-solid fa-eye text-info cursor-pointer"></i>
                                    </span>
                                  ) : (
                                    <>
                                      {/* For other statuses - show regular action buttons */}
                                      {(user?.permissions?.includes('updateLead') || user?.user === 'company') && (
                                        <span onClick={() => handleUpdate(lead)} title="Action Lead">
                                          <i className="mx-1 fa-solid fa-pen text-success cursor-pointer"></i>
                                        </span>
                                      )}

                                      {canAssignLead && (
                                        <span onClick={() => handleAssign(lead)} title="Reassign Lead">
                                          <i className="mx-1 fa-solid fa-share cursor-pointer"></i>
                                        </span>
                                      )}

                                      {(lead.SOURCE==='Direct' && (user?.permissions?.includes('deleteLead') || user?.user === 'company')) && (
                                        <span onClick={() => handleDelete(lead._id)} title="Delete Lead">
                                          <i className="fa-solid fa-trash text-danger cursor-pointer"></i>
                                        </span>
                                      )}
                                    </>
                                  )}
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan="9" className="text-center">
                                {isSearchMode ?
                                  "No leads found matching your search." :
                                  isFollowUpTodayMode ?
                                  "No leads with follow-up scheduled for today." :
                                  "No More Leads."
                                }
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {!isSearchMode && !isFollowUpTodayMode && !loading && pagination.totalPages > 1 && (
                  <div className="pagination-container text-center my-3">
                    <button
                      onClick={() => handlePageChange(1)}
                      disabled={!pagination.hasPrevPage}
                      className="btn btn-dark btn-sm me-1"
                      style={{ borderRadius: "4px" }}
                      aria-label="First Page"
                    >
                      First
                    </button>
                    <button
                      onClick={() => handlePageChange(pagination.currentPage - 1)}
                      disabled={!pagination.hasPrevPage}
                      className="btn btn-dark btn-sm me-1"
                      style={{ borderRadius: "4px" }}
                      aria-label="Previous Page"
                    >
                      Previous
                    </button>
                    {(() => {
                      const pageNumbers = [];
                      const maxPagesToShow = 5;
                      if (pagination.totalPages <= maxPagesToShow) {
                        for (let i = 1; i <= pagination.totalPages; i++) {
                          pageNumbers.push(i);
                        }
                      } else {
                        let startPage, endPage;
                        if (pagination.currentPage <= 3) {
                      startPage = 1;
                      endPage = maxPagesToShow;
                    } else if (pagination.currentPage >= pagination.totalPages - 2) {
                      startPage = pagination.totalPages - maxPagesToShow + 1;
                      endPage = pagination.totalPages;
                    } else {
                      startPage = pagination.currentPage - 2;
                      endPage = pagination.currentPage + 2;
                    }
                    startPage = Math.max(1, startPage);
                    endPage = Math.min(pagination.totalPages, endPage);
                    for (let i = startPage; i <= endPage; i++) {
                      pageNumbers.push(i);
                    }
                  }
                  return pageNumbers.map((number) => (
                    <button
                      key={number}
                      onClick={() => handlePageChange(number)}
                      className={`btn btn-sm me-1 ${pagination.currentPage === number ? "btn-primary" : "btn-dark"
                      }`}
                      style={{ minWidth: "35px", borderRadius: "4px" }}
                      aria-label={`Go to page ${number}`}
                      aria-current={pagination.currentPage === number ? "page" : undefined}
                    >
                      {number}
                    </button>
                  ));
                })()}
                <button
                  disabled={!pagination.hasNextPage}
                  onClick={() => handlePageChange(pagination.currentPage + 1)}
                  className="btn btn-dark btn-sm me-1"
                >
                  Next
                </button>
                <button
                  onClick={() => handlePageChange(pagination.totalPages)}
                  disabled={!pagination.hasNextPage}
                  className="btn btn-dark btn-sm"
                  style={{ borderRadius: "4px" }}
                  aria-label="Last Page"
                >
                  Last
                </button>
              </div>
            )}

            {(isSearchMode || isFollowUpTodayMode) && !loading && pagination.hasNextPage && (
              <div className="text-center my-3">
                <button
                  className="btn btn-dark"
                  onClick={() => handlePageChange(pagination.currentPage + 1)}
                >
                  Load More Results
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  </div>

  {addpop && (
    <AddSalesLeadPopUp onAddLead={handleAddLeadSubmit} onClose={handleCloseAddModal} />
  )}

  {UpdatePopUpShow && selectedLead && (
    <UpdateSalesPopUp
      selectedLead={selectedLead}
      onUpdate={handleUpdateSubmit}
      isCompany={user.user === 'company'}
      onClose={() => {
        setUpdatePopUpShow(false);
        setSelectedLead(null);
      }}
    />
  )}

  {assignPopUpShow && selectedLead && (
    <AssignSalesLeadPopUp
      selectedLead={selectedLead}
      onUpdate={handleAssignSubmit}
      onClose={() => {
        setAssignPopUpShow(false);
        setSelectedLead(null);
      }}
    />
  )}

  {deletePopUpShow && (
    <DeletePopUP
      message={"Are you sure you want to delete this lead?"}
      heading={"Delete Lead"}
      cancelBtnCallBack={() => setDeletePopUpShow(false)}
      confirmBtnCallBack={handleDeleteConfirm}
    />
  )}

  {showLeadPopUp && selectedLead && (
    <ViewSalesLeadPopUp
      closePopUp={() => {
        setShowLeadPopUp(false);
        setSelectedLead(null);
      }}
      selectedLead={selectedLead}
    />
  )}
</>
); };

export default SalesMasterGrid;