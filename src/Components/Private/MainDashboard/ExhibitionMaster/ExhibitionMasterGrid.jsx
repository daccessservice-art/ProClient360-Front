import { useState, useContext, useEffect } from "react";
import { Header } from "../Header/Header";
import { Sidebar } from "../Sidebar/Sidebar";
import DeletePopUP from "../../CommonPopUp/DeletePopUp";
import AddExhibitionPopUp from "./PopUp/AddExhibitionPopUp";
import UpdateExhibitionPopUp from "./PopUp/UpdateExhibitionPopUp";
import AddExhibitionVisitPopUp from "./PopUp/AddExhibitionVisitPopUp";
import { getExhibitions, deleteExhibition } from "../../../../hooks/useExhibition";
import { UserContext } from "../../../../context/UserContext";
import toast from "react-hot-toast";

export const ExhibitionMasterGrid = () => {
  const [isopen, setIsOpen] = useState(false);
  const toggle = () => setIsOpen(!isopen);

  const { user } = useContext(UserContext);

  const [AddPopUpShow, setAddPopUpShow] = useState(false);
  const [deletePopUpShow, setDeletePopUpShow] = useState(false);
  const [updatePopUpShow, setUpdatePopUpShow] = useState(false);
  const [visitPopUpShow, setVisitPopUpShow] = useState(false);

  const [selectedId, setSelectedId] = useState(null);
  const [exhibitions, setExhibitions] = useState([]);
  const [selectedExhibition, setSelectedExhibition] = useState(null);
  const [visitExhibition, setVisitExhibition] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 0,
    totalExhibitions: 0,
    limit: 20,
    hasNextPage: false,
    hasPrevPage: false,
  });

  const itemsPerPage = 20;

  const handlePageChange = (page) => setCurrentPage(page);
  const handleAdd = () => setAddPopUpShow(!AddPopUpShow);

  const handleUpdate = (exhibition) => {
    setSelectedExhibition(exhibition);
    setUpdatePopUpShow(!updatePopUpShow);
  };

  const handleDeleteOpen = (id) => {
    setSelectedId(id);
    setDeletePopUpShow(true);
  };

  const handleDeleteClose = () => setDeletePopUpShow(false);

  const handleDeleteConfirm = async () => {
    const data = await deleteExhibition(selectedId);
    if (data?.success) {
      toast.success(data.message);
    } else {
      toast.error(data?.error || "Failed to delete");
    }
    setDeletePopUpShow(false);
    setCurrentPage(1);
  };

  const handleAddVisit = (exhibition) => {
    setVisitExhibition(exhibition || null);
    setVisitPopUpShow(true);
  };

  const handleCloseVisit = () => {
    setVisitPopUpShow(false);
    setVisitExhibition(null);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const data = await getExhibitions(currentPage, itemsPerPage, search);
        if (data?.success) {
          setExhibitions(data.exhibitions || []);
          setPagination(data.pagination || {
            currentPage: 1, totalPages: 0, totalExhibitions: 0,
            limit: itemsPerPage, hasNextPage: false, hasPrevPage: false,
          });
        } else {
          toast.error(data?.error || "Failed to fetch exhibitions");
        }
      } catch (error) {
        console.error("Error fetching exhibitions:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentPage, deletePopUpShow, AddPopUpShow, updatePopUpShow, visitPopUpShow, search]);

  // Pagination buttons
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

  const getStatusBadge = (status) => {
    const classes = {
      Upcoming: 'badge bg-primary',
      Ongoing: 'badge bg-success',
      Completed: 'badge bg-secondary',
      Cancelled: 'badge bg-danger',
    };
    return classes[status] || 'badge bg-secondary';
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatCurrency = (amount) => {
    if (amount == null) return 'N/A';
    return '₹' + Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 0 });
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
            <Sidebar isopen={isopen} active="ExhibitionMasterGrid" />
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
                  <div className="col-12 col-lg-4">
                    <h5 className="text-white py-2">Exhibition Master</h5>
                  </div>
                  <div className="col-12 col-lg-8 ms-auto">
                    <div className="row">
                      <div className="col-12 col-lg-5 ms-auto text-end">
                        <div className="form">
                          <i className="fa fa-search"></i>
                          <form onSubmit={handleSearchSubmit}>
                            <input
                              type="text"
                              value={searchText}
                              onChange={(e) => setSearchText(e.target.value)}
                              className="form-control form-input bg-transparant"
                              placeholder="Search exhibitions..."
                            />
                          </form>
                        </div>
                      </div>
                      <div className="col-12 col-lg-7 text-end mt-2 mt-lg-0">
                        <div className="btn-group" role="group">
                          {/* Add Visit button - for sales employees */}
                          {(user?.permissions?.includes("createExhibitionVisit") || user?.user === 'company') && (
                            <button
                              onClick={() => handleAddVisit(null)}
                              type="button"
                              className="btn btn-sm btn-info me-1"
                              disabled={loading}
                            >
                              <i className="fa-solid fa-person-walking-arrow-right"></i> Add Visit
                            </button>
                          )}
                          {/* Add Exhibition - manager / company only */}
                          {(user?.permissions?.includes("createExhibition") || user?.user === 'company') && (
                            <button
                              onClick={handleAdd}
                              type="button"
                              className="btn btn-sm btn-dark"
                              disabled={loading}
                            >
                              <i className="fa-solid fa-plus"></i> Add Exhibition
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
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
                            <th className="align_left_td">Exhibition Name</th>
                            <th>Venue</th>
                            <th>City</th>
                            <th>Country</th>
                            <th>Date From</th>
                            <th>Date To</th>
                            <th>Exhibition Fees</th>
                            <th>Stall Fees</th>
                            <th>Status</th>
                            <th>Created By</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {exhibitions.length > 0 ? (
                            exhibitions.map((exhibition, index) => (
                              <tr className="border my-4" key={exhibition._id}>
                                <td className="w-10">{index + 1 + (currentPage - 1) * itemsPerPage}</td>
                                <td className="align_left_td wrap-text-of-col">
                                  <strong>{exhibition.exhibitionName}</strong>
                                  <br />
                                  <small className="text-muted">{exhibition.targetAddress?.substring(0, 50)}{exhibition.targetAddress?.length > 50 ? '...' : ''}</small>
                                </td>
                                <td>{exhibition.venue}</td>
                                <td>{exhibition.city}</td>
                                <td>{exhibition.country}</td>
                                <td>{formatDate(exhibition.dateFrom)}</td>
                                <td>{formatDate(exhibition.dateTo)}</td>
                                <td>{formatCurrency(exhibition.exhibitionFees)}</td>
                                <td>{formatCurrency(exhibition.stallDesignationFees)}</td>
                                <td>
                                  <span className={getStatusBadge(exhibition.status)}>
                                    {exhibition.status || 'Upcoming'}
                                  </span>
                                </td>
                                <td>{exhibition.createdBy?.name || 'N/A'}</td>
                                <td>
                                  {/* Add visit icon */}
                                  {(user?.permissions?.includes("createExhibitionVisit") || user?.user === 'company') && (
                                    <span
                                      onClick={() => handleAddVisit(exhibition)}
                                      title="Add Visit"
                                      className="me-2 cursor-pointer"
                                    >
                                      <i className="fa-solid fa-person-walking-arrow-right text-info"></i>
                                    </span>
                                  )}

                                  {(user?.permissions?.includes("updateExhibition") || user?.user === 'company') && (
                                    <span onClick={() => handleUpdate(exhibition)} className="update">
                                      <i className="fa-solid fa-pen text-success me-2 cursor-pointer"></i>
                                    </span>
                                  )}
                                  {(user?.permissions?.includes("deleteExhibition") || user?.user === 'company') && (
                                    <span onClick={() => handleDeleteOpen(exhibition._id)} className="delete">
                                      <i className="fa-solid fa-trash text-danger cursor-pointer"></i>
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan="12" className="text-center">
                                No exhibitions found
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
          message="Are you sure you want to delete this exhibition?"
          cancelBtnCallBack={handleDeleteClose}
          confirmBtnCallBack={handleDeleteConfirm}
          heading="Delete Exhibition"
        />
      )}

      {AddPopUpShow && <AddExhibitionPopUp handleAdd={handleAdd} />}

      {updatePopUpShow && selectedExhibition && (
        <UpdateExhibitionPopUp
          selectedExhibition={selectedExhibition}
          handleUpdate={() => setUpdatePopUpShow(false)}
        />
      )}

      {visitPopUpShow && (
        <AddExhibitionVisitPopUp
          handleAdd={handleCloseVisit}
          preSelectedExhibition={visitExhibition}
        />
      )}
    </>
  );
};