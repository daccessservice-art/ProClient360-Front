import { useState, useContext, useEffect } from "react";
import { Header } from "../Header/Header";
import { Sidebar } from "../Sidebar/Sidebar";
import DeletePopUP from "../../CommonPopUp/DeletePopUp";
import AddExhibitionVisitPopUp from "./PopUp/AddExhibitionVisitPopUp";
import { getExhibitionVisits, deleteExhibitionVisit } from "../../../../hooks/useExhibition";
import { UserContext } from "../../../../context/UserContext";
import toast from "react-hot-toast";

// ─── View Detail Popup ────────────────────────────────────────────────────────
const ViewVisitPopUp = ({ visit, onClose }) => {
  if (!visit) return null;

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  };

  const getLeadsBadge = (type) => {
    if (!type) return <span className="text-muted">N/A</span>;
    const map = {
      'Hot Leads':  'badge bg-danger',
      'Warm Leads': 'badge bg-warning text-dark',
      'Cold Leads': 'badge bg-primary',
    };
    return <span className={map[type] || 'badge bg-secondary'}>{type}</span>;
  };

  const getFollowUpBadge = (date) => {
    if (!date) return null;
    const diff = Math.ceil((new Date(date) - new Date()) / (1000 * 60 * 60 * 24));
    if (diff < 0)  return <span className="badge bg-danger ms-2">Overdue</span>;
    if (diff === 0) return <span className="badge bg-warning text-dark ms-2">Today</span>;
    if (diff <= 3)  return <span className="badge ms-2 text-white" style={{ backgroundColor: '#fd7e14' }}>In {diff}d</span>;
    return <span className="badge bg-success ms-2">In {diff}d</span>;
  };

  // Helper: show value or "N/A"
  const val = (v) => (v && v.toString().trim() !== '' ? v : 'N/A');

  const Field = ({ icon, label, children }) => (
    <div className="col-12 col-lg-6 mb-3">
      <label className="form-label mb-1" style={{ fontSize: '12px', fontWeight: '600', color: '#555' }}>
        <i className={`${icon} me-1 text-muted`}></i> {label}
      </label>
      <div
        className="form-control rounded-0 bg-light"
        style={{ fontSize: '14px', minHeight: '38px', display: 'flex', alignItems: 'center' }}
      >
        {children}
      </div>
    </div>
  );

  return (
    <div
      className="modal fade show"
      style={{ display: 'flex', alignItems: 'center', backgroundColor: '#00000090', zIndex: 1055 }}
    >
      <div className="modal-dialog modal-lg modal-dialog-scrollable">
        <div className="modal-content p-3">

          {/* Header */}
          <div className="modal-header pt-0">
            <h5 className="card-title fw-bold">
              <i className="fa-solid fa-eye me-2 text-primary"></i>Visit Details
            </h5>
            <button onClick={onClose} type="button" className="close px-3" style={{ marginLeft: 'auto' }}>
              <span aria-hidden="true">&times;</span>
            </button>
          </div>

          <div className="modal-body">

            {/* Exhibition Banner */}
            <div className="alert alert-info py-2 mb-3">
              <i className="fa-solid fa-store me-2"></i>
              <strong>Exhibition:</strong>{' '}
              {val(visit.exhibition?.exhibitionName)}
              {visit.exhibition?.city && (
                <span className="text-muted ms-2">— {visit.exhibition.city}</span>
              )}
            </div>

            <div className="row">

              <Field icon="fa-solid fa-user" label="Customer Name">
                {val(visit.customerName)}
              </Field>

              <Field icon="fa-solid fa-building" label="Company Name">
                {val(visit.companyName)}
              </Field>

              {/* ✅ Visitor Designation */}
              <Field icon="fa-solid fa-id-badge" label="Visitor Designation">
                {val(visit.visitorDesignation)}
              </Field>

              {/* ✅ Leads Type */}
              <Field icon="fa-solid fa-fire" label="Leads Type">
                {getLeadsBadge(visit.leadsType)}
              </Field>

              {/* ✅ Product */}
              <Field icon="fa-solid fa-box" label="Product">
                {val(visit.product)}
              </Field>

              <Field icon="fa-solid fa-phone" label="Mobile">
                {val(visit.mobile)}
              </Field>

              <Field icon="fa-solid fa-envelope" label="Email">
                {val(visit.email)}
              </Field>

              <Field icon="fa-solid fa-location-dot" label="Location">
                {val(visit.location)}
              </Field>

              {/* Follow-Up Date with badge */}
              <div className="col-12 col-lg-6 mb-3">
                <label className="form-label mb-1" style={{ fontSize: '12px', fontWeight: '600', color: '#555' }}>
                  <i className="fa-solid fa-calendar me-1 text-muted"></i> Follow-Up Call Date
                </label>
                <div
                  className="form-control rounded-0 bg-light d-flex align-items-center"
                  style={{ fontSize: '14px', minHeight: '38px' }}
                >
                  {formatDate(visit.followUpDate)}
                  {visit.followUpDate && getFollowUpBadge(visit.followUpDate)}
                </div>
              </div>

              <Field icon="fa-solid fa-circle-user" label="Added By">
                {val(visit.createdBy?.name)}
              </Field>

              {/* Remark — full width */}
              <div className="col-12 mb-2">
                <label className="form-label mb-1" style={{ fontSize: '12px', fontWeight: '600', color: '#555' }}>
                  <i className="fa-solid fa-comment-dots me-1 text-muted"></i> Remark
                </label>
                <div
                  className="form-control rounded-0 bg-light"
                  style={{ minHeight: '80px', whiteSpace: 'pre-wrap', fontSize: '14px' }}
                >
                  {val(visit.remark)}
                </div>
              </div>

            </div>
          </div>

          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn btn-dark rounded-0 px-4">
              Close
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

// ─── Main Grid ────────────────────────────────────────────────────────────────
export const ExhibitionVisitMasterGrid = () => {
  const [isopen, setIsOpen] = useState(false);
  const toggle = () => setIsOpen(!isopen);

  const { user } = useContext(UserContext);

  const [AddPopUpShow, setAddPopUpShow] = useState(false);
  const [deletePopUpShow, setDeletePopUpShow] = useState(false);
  const [viewPopUpShow, setViewPopUpShow] = useState(false);

  const [selectedId, setSelectedId] = useState(null);
  const [selectedVisit, setSelectedVisit] = useState(null);
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 0,
    totalVisits: 0,
    limit: 20,
    hasNextPage: false,
    hasPrevPage: false,
  });

  const itemsPerPage = 20;

  const handlePageChange = (page) => setCurrentPage(page);
  const handleAdd = () => setAddPopUpShow(!AddPopUpShow);

  const handleDeleteOpen = (id) => {
    setSelectedId(id);
    setDeletePopUpShow(true);
  };

  const handleDeleteConfirm = async () => {
    const data = await deleteExhibitionVisit(selectedId);
    if (data?.success) {
      toast.success(data.message);
    } else {
      toast.error(data?.error || "Failed to delete");
    }
    setDeletePopUpShow(false);
    setCurrentPage(1);
  };

  // ✅ Pass full visit object to popup
  const handleViewOpen = (visit) => {
    setSelectedVisit(visit);
    setViewPopUpShow(true);
  };

  const handleViewClose = () => {
    setSelectedVisit(null);
    setViewPopUpShow(false);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const data = await getExhibitionVisits(currentPage, itemsPerPage, search);
        if (data?.success) {
          setVisits(data.visits || []);
          setPagination(data.pagination || {
            currentPage: 1, totalPages: 0, totalVisits: 0,
            limit: itemsPerPage, hasNextPage: false, hasPrevPage: false,
          });
        } else {
          toast.error(data?.error || "Failed to fetch visits");
        }
      } catch (error) {
        console.error("Error fetching visits:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentPage, deletePopUpShow, AddPopUpShow, search]);

  const maxPageButtons = 5;
  const halfMaxButtons = Math.floor(maxPageButtons / 2);
  let startPage = Math.max(1, currentPage - halfMaxButtons);
  let endPage = Math.min(pagination.totalPages, startPage + maxPageButtons - 1);
  if (endPage - startPage + 1 < maxPageButtons) startPage = Math.max(1, endPage - maxPageButtons + 1);
  const pageButtons = [];
  for (let i = startPage; i <= endPage; i++) pageButtons.push(i);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setSearch(searchText);
    setCurrentPage(1);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  };

  const getFollowUpBadge = (date) => {
    if (!date) return null;
    const diff = Math.ceil((new Date(date) - new Date()) / (1000 * 60 * 60 * 24));
    if (diff < 0)  return <span className="badge bg-danger">Overdue</span>;
    if (diff === 0) return <span className="badge bg-warning text-dark">Today</span>;
    if (diff <= 3)  return <span className="badge text-white" style={{ backgroundColor: '#fd7e14' }}>In {diff}d</span>;
    return <span className="badge bg-success">In {diff}d</span>;
  };

  const getLeadsBadgeClass = (type) => {
    switch (type) {
      case 'Hot Leads':  return 'badge bg-danger';
      case 'Warm Leads': return 'badge bg-warning text-dark';
      case 'Cold Leads': return 'badge bg-primary';
      default:           return null;
    }
  };

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
            <Sidebar isopen={isopen} active="ExhibitionVisitMasterGrid" />
            <div
              className="main-panel"
              style={{
                width: isopen ? "" : "calc(100% - 120px)",
                marginLeft: isopen ? "" : "125px",
              }}
            >
              <div className="content-wrapper ps-3 ps-md-0 pt-3">

                {/* Header Row */}
                <div className="row px-2 py-1">
                  <div className="col-12 col-lg-5">
                    <h5 className="text-white py-2">Exhibition Visit Records</h5>
                  </div>
                  <div className="col-12 col-lg-7 ms-auto">
                    <div className="row">
                      <div className="col-12 col-lg-6 ms-auto text-end">
                        <div className="form">
                          <i className="fa fa-search"></i>
                          <form onSubmit={handleSearchSubmit}>
                            <input
                              type="text"
                              value={searchText}
                              onChange={(e) => setSearchText(e.target.value)}
                              className="form-control form-input bg-transparant"
                              placeholder="Search visits..."
                            />
                          </form>
                        </div>
                      </div>
                      <div className="col-12 col-lg-6 text-end mt-2 mt-lg-0">
                        {(user?.permissions?.includes("createExhibitionVisit") || user?.user === 'company') && (
                          <button
                            onClick={handleAdd}
                            type="button"
                            className="btn btn-sm btn-dark"
                            disabled={loading}
                          >
                            <i className="fa-solid fa-plus"></i> Add Visit
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Total count */}
                <div className="row px-3 mb-1">
                  <div className="col-12">
                    <small className="text-white">
                      Total Visits: <strong>{pagination.totalVisits || 0}</strong>
                    </small>
                  </div>
                </div>

                {/* Table */}
                <div className="row bg-white p-2 m-1 border rounded">
                  <div className="col-12 py-2">
                    <div className="table-responsive">
                      <table className="table table-striped table-class" id="table-id">
                        <thead>
                          <tr className="th_border">
                            <th>Sr. No</th>
                            <th className="align_left_td">Exhibition</th>
                            <th className="align_left_td">Customer Name</th>
                            <th className="align_left_td">Company Name</th>
                            <th>Designation</th>
                            <th>Leads Type</th>
                            <th>Product</th>
                            <th>Mobile</th>
                            <th>Follow-Up Date</th>
                            <th>Added By</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {visits.length > 0 ? (
                            visits.map((visit, index) => (
                              <tr className="border my-4" key={visit._id}>
                                <td>{index + 1 + (currentPage - 1) * itemsPerPage}</td>
                                <td className="align_left_td wrap-text-of-col">
                                  <strong>{visit.exhibition?.exhibitionName || 'N/A'}</strong>
                                  <br />
                                  <small className="text-muted">{visit.exhibition?.city}</small>
                                </td>
                                <td className="align_left_td wrap-text-of-col">{visit.customerName}</td>
                                <td className="align_left_td wrap-text-of-col">{visit.companyName}</td>
                                <td>
                                  <small>{visit.visitorDesignation || '—'}</small>
                                </td>
                                <td>
                                  {visit.leadsType && getLeadsBadgeClass(visit.leadsType) ? (
                                    <span className={getLeadsBadgeClass(visit.leadsType)}>
                                      {visit.leadsType}
                                    </span>
                                  ) : (
                                    <span className="text-muted">—</span>
                                  )}
                                </td>
                                <td>
                                  <small>{visit.product || '—'}</small>
                                </td>
                                <td>{visit.mobile}</td>
                                <td>
                                  {formatDate(visit.followUpDate)}
                                  {visit.followUpDate && (
                                    <div className="mt-1">{getFollowUpBadge(visit.followUpDate)}</div>
                                  )}
                                </td>
                                <td>{visit.createdBy?.name || 'N/A'}</td>
                                <td style={{ whiteSpace: 'nowrap' }}>
                                  {/* View */}
                                  <span
                                    onClick={() => handleViewOpen(visit)}
                                    title="View Details"
                                    className="me-2 cursor-pointer"
                                  >
                                    <i className="fa-solid fa-eye text-primary"></i>
                                  </span>

                                  {/* Delete */}
                                  {(user?.permissions?.includes("deleteExhibitionVisit") || user?.user === 'company') && (
                                    <span
                                      onClick={() => handleDeleteOpen(visit._id)}
                                      title="Delete"
                                      className="cursor-pointer"
                                    >
                                      <i className="fa-solid fa-trash text-danger"></i>
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan="11" className="text-center">
                                No visit records found
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Pagination */}
                <div className="pagination-container text-center my-3">
                  <button disabled={!pagination.hasPrevPage} onClick={() => handlePageChange(1)} className="btn btn-dark btn-sm me-2">First</button>
                  <button disabled={!pagination.hasPrevPage} onClick={() => handlePageChange(currentPage - 1)} className="btn btn-dark btn-sm me-2">Previous</button>
                  {startPage > 1 && <span className="mx-2">...</span>}
                  {pageButtons.map((page) => (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      className={`btn btn-sm me-1 ${pagination.currentPage === page ? "btn-primary" : "btn-dark"}`}
                    >
                      {page}
                    </button>
                  ))}
                  {endPage < pagination.totalPages && <span className="mx-2">...</span>}
                  <button disabled={!pagination.hasNextPage} onClick={() => handlePageChange(currentPage + 1)} className="btn btn-dark btn-sm me-2">Next</button>
                  <button disabled={!pagination.hasNextPage} onClick={() => handlePageChange(pagination.totalPages)} className="btn btn-dark btn-sm">Last</button>
                </div>

              </div>
            </div>
          </div>
        </div>
      </div>

      {deletePopUpShow && (
        <DeletePopUP
          message="Are you sure you want to delete this visit record?"
          cancelBtnCallBack={() => setDeletePopUpShow(false)}
          confirmBtnCallBack={handleDeleteConfirm}
          heading="Delete Visit"
        />
      )}

      {AddPopUpShow && (
        <AddExhibitionVisitPopUp handleAdd={handleAdd} preSelectedExhibition={null} />
      )}

      {/* ✅ View Popup */}
      {viewPopUpShow && selectedVisit && (
        <ViewVisitPopUp visit={selectedVisit} onClose={handleViewClose} />
      )}
    </>
  );
};