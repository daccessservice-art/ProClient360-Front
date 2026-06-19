import { useState, useContext, useEffect } from "react";
import { Header } from "../Header/Header";
import { Sidebar } from "../Sidebar/Sidebar";
import AddTicketPopup from "./PopUp/AddTicketPopup";
import DeletePopUP from "../../CommonPopUp/DeletePopUp";
import UpdateEmployeePopUp from "./PopUp/UpdateTicketPopUp";
import toast from "react-hot-toast";
import { getAllTickets, deleteTicket } from "../../../../hooks/useTicket";
import AddServicePopup from "./PopUp/AddServicePopUp";
import { UserContext } from "../../../../context/UserContext";

export const TicketMasterGrid = () => {
  const [isopen, setIsOpen] = useState(false);
  const toggle = () => {
    setIsOpen(!isopen);
  };

  const { user } = useContext(UserContext);

  const [addServicePopUpShow, setAddServicePopUpShow] = useState(false);
  const [AddPopUpShow, setAddPopUpShow] = useState(false);
  const [deletePopUpShow, setdeletePopUpShow] = useState(false);
  const [selectedId, setSelecteId] = useState(null);
  const [updatePopUpShow, setUpdatePopUpShow] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [search, setSearch] = useState("");
  const [selectedTicketId, setSelectedTicketId] = useState(null);

  const [tickets, setTickets] = useState([]);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 0,
    totalTickets: 0,
    limit: 20,
    hasNextPage: false,
    hasPrevPage: false,
  });

  const itemsPerPage = 20;

  const handlePageChange = (page) => {
    setPagination((prev) => ({ ...prev, currentPage: page }));
  };

  const handleAddService = (id) => {
    setSelectedTicketId(id);
    setAddServicePopUpShow(!addServicePopUpShow);
  };

  const handleAdd = () => {
    setAddPopUpShow(!AddPopUpShow);
  };

  const handleUpdate = (ticket = null) => {
    setSelectedTicket(ticket);
    setUpdatePopUpShow(!updatePopUpShow);
  };

  const handelDeleteClosePopUpClick = (id = null) => {
    setSelecteId(id);
    setdeletePopUpShow(!deletePopUpShow);
  };

  const handelDeleteClick = async () => {
    if (!selectedId) return;

    try {
      setLoading(true);
      toast.loading("Deleting Ticket...");
      const data = await deleteTicket(selectedId);
      toast.dismiss();
      if (data?.success) {
        toast.success(data.message || "Ticket deleted successfully.");
        const pageToFetch =
          tickets.length === 1 && pagination.currentPage > 1
            ? pagination.currentPage - 1
            : pagination.currentPage;

        const refetchData = await getAllTickets(
          pageToFetch,
          itemsPerPage,
          searchText
        );
        if (refetchData) {
          setTickets(refetchData.tickets || []);
          setPagination(
            refetchData.pagination || {
              currentPage: pageToFetch,
              totalPages: 0,
              totalTickets: 0,
              limit: itemsPerPage,
              hasNextPage: false,
              hasPrevPage: false,
            }           
          );
          if (pageToFetch !== pagination.currentPage) {
            setPagination((prev) => ({ ...prev, currentPage: pageToFetch }));
          }         
        } else {
          setTickets([]);
          setPagination({
            currentPage: 1,
            totalPages: 0,
            totalTickets: 0,
            limit: itemsPerPage,
            hasNextPage: false,
            hasPrevPage: false,
          });
        }
      } else {
        toast(data?.error || "Failed to delete ticket.");
      }
    } catch (error) {
      console.error("Error deleting ticket:", error);
      toast.error(error?.message || "An error occurred during deletion.");
    } finally {
      setLoading(false);
      setdeletePopUpShow(false);
      setSelecteId(null);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const data = await getAllTickets(
          pagination.currentPage,
          itemsPerPage,
          search
        );
        if (data?.success) {
          setTickets(data.tickets || []);
          setPagination(
            data.pagination || {
              currentPage: 1,
              totalPages: 0,
              totalTickets: 0,
              limit: itemsPerPage,
              hasNextPage: false,
              hasPrevPage: false,
            }
          );
        }
        else {
          toast(data?.message);
        }
      } catch (error) {
        console.error("Error fetching tickets:", error);
        toast.error("Failed to fetch tickets.");
        setTickets([]);
        setPagination({
          currentPage: 1,
          totalPages: 0,
          totalTickets: 0,
          limit: itemsPerPage,
          hasNextPage: false,
          hasPrevPage: false,
        });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [
    pagination.currentPage,
    deletePopUpShow,
    updatePopUpShow,
    AddPopUpShow,
    addServicePopUpShow,
    search
  ]);

  useEffect(() => {
    setPagination((prev) => ({ ...prev, currentPage: 1 }));
  }, [searchText]);

  const handleSubmitSearch = (e) => {
    e.preventDefault();
    setSearch(searchText);
  }

  // Function to determine the appropriate "no data" message
  const getNoDataMessage = () => {
    if (search && search.trim() !== "") {
    return "No Tickets Found";
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
            <Sidebar isopen={isopen} active="TicketMasterGrid" />
            <div
              className="main-panel"
              style={{
                width: isopen ? "" : "calc(100%  - 120px )",
                marginLeft: isopen ? "" : "125px",
              }}
            >
              <div className="content-wrapper ps-3 ps-md-0 pt-3">
                <div className="row px-2 py-1">
                  <div className="col-12 col-lg-6">
                    <h5 className="text-white py-2">Ticket Master</h5>
                  </div>
                  
                  <div className="col-12 col-lg-6 ms-auto">
                    <div className="row align-items-center justify-content-end">
                      <div className="col-8 col-lg-6 text-end">
                        <div className="form position-relative">
                          <i
                            className="fa fa-search position-absolute"
                            style={{ top: "10px", left: "10px", color: "#aaa" }}
                          ></i>
                          <form onSubmit={handleSubmitSearch}>
                            <input
                                type="text"
                                value={searchText}
                                onChange={(e) => setSearchText(e.target.value)}
                                className="form-control form-input ps-4"
                                placeholder="Search by Products..."
                                aria-label="Search tickets"
                            />
                          </form>
                        </div>
                      </div>
                      <div className="col-12 col-lg-4 ms-auto text-end ">
                        {user?.user === "employee" ? (
                          <button
                            onClick={handleAdd}
                            type="button"
                            className="btn adbtn btn-dark me-4"
                          >
                            <i className="fa-solid fa-plus"></i> Add
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="row bg-white p-2 m-1 border rounded">
                  <div className="col-12 py-2">
                    <div className="table-responsive">
                      <table
                        className="table table-striped table-class"
                        id="table-id"
                      >
                        <thead>
                          <tr className="th_border">
                            <th>Sr. No</th>
                            <th className="align_left_td">Customer Name</th>
                            <th className="align_left_td width_tdd">
                              Complaint Details
                            </th>
                            <th>Product</th>
                            <th>Ticket ID</th>
                            <th>Registered by</th>
                          
                            <th>Assign</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody className="broder my-4">
                          {tickets.length > 0 ? (
                            tickets.map((ticket, index) => (
                              <tr className="border my-4" key={ticket._id}>
  <td>
    {index + 1 + (pagination.currentPage - 1) * itemsPerPage}
  </td>
  <td className="align_left_td">
    {ticket?.client?.custName || "N/A"}
  </td>
  <td className="align_left_td width_tdd wrap-text-of-col">
    {ticket?.details}
  </td>
  <td>{ticket?.product}</td>

  {/* ✅ NEW — Ticket ID column */}
  <td>
    {ticket?.uniqueTicketId ? (
      <span style={{
        background: "#e3f2fd",
        color: "#1565c0",
        padding: "3px 8px",
        borderRadius: "4px",
        fontWeight: "600",
        fontSize: "12px",
        whiteSpace: "nowrap"
      }}>
        {ticket.uniqueTicketId}
      </span>
    ) : (
      <span style={{ color: "#999", fontSize: "12px" }}>—</span>
    )}
  </td>

  {/* ✅ NEW — Source column (shows "Customer Portal" badge) */}
  <td>
    {ticket?.source === "Customer Portal" ? (
      <span style={{
        background: "#e8f5e9",
        color: "#2e7d32",
        padding: "3px 8px",
        borderRadius: "4px",
        fontWeight: "600",
        fontSize: "11px",
        whiteSpace: "nowrap"
      }}>
        🌐 Customer Portal
      </span>
    ) : (
      <span style={{ fontSize: "12px" }}>{ticket?.source || "N/A"}</span>
    )}
  </td>

  <td>{ticket?.registerBy?.name || "Self"}</td>

  <td>
    {user?.permissions?.includes("createService") ? (
      <span onClick={() => handleAddService(ticket._id)} title="Assign Service">
        <i className="fa-solid fa-share cursor-pointer"></i>
      </span>
    ) : ""}
  </td>
  <td>
    <span onClick={() => handleUpdate(ticket)} className="update" title="Edit Ticket">
      <i className="fa-solid fa-pen text-success cursor-pointer me-3"></i>
    </span>
    <span onClick={() => handelDeleteClosePopUpClick(ticket._id)} className="delete" title="Delete Ticket">
      <i className="fa-solid fa-trash text-danger cursor-pointer"></i>
    </span>
  </td>
</tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan="7" className="text-center">
                                {getNoDataMessage()}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {!loading && (
                  <>
                    {pagination.totalPages > 1 && (
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
                          disabled={!pagination.hasPrevPage}
                          onClick={() =>
                            handlePageChange(pagination.currentPage - 1)
                          }
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
                            if (
                              pagination.currentPage <=
                              Math.ceil(maxPagesToShow / 2)
                            ) {
                              startPage = 1;
                              endPage = maxPagesToShow;
                            } else if (
                              pagination.currentPage +
                                Math.floor(maxPagesToShow / 2) >=
                              pagination.totalPages
                            ) {
                              startPage =
                                pagination.totalPages - maxPagesToShow + 1;
                              endPage = pagination.totalPages;
                            } else {
                              startPage =
                                pagination.currentPage -
                                Math.floor(maxPagesToShow / 2);
                              endPage =
                                pagination.currentPage +
                                Math.floor(maxPagesToShow / 2);
                            }
                            startPage = Math.max(1, startPage);
                            endPage = Math.min(pagination.totalPages, endPage);

                            if (startPage > 1) {
                              pageNumbers.push(1);
                              if (startPage > 2) {
                                pageNumbers.push("...");
                              }
                            }
                            for (let i = startPage; i <= endPage; i++) {
                              pageNumbers.push(i);
                            }
                            if (endPage < pagination.totalPages) {
                              if (endPage < pagination.totalPages - 1) {
                                pageNumbers.push("...");
                              }
                              pageNumbers.push(pagination.totalPages);
                            }
                          }

                          return pageNumbers.map((number, index) =>
                            typeof number === "number" ? (
                              <button
                                key={number}
                                onClick={() => handlePageChange(number)}
                                className={`btn btn-sm me-1 ${
                                  pagination.currentPage === number
                                    ? "btn-primary"
                                    : "btn-dark"
                                }`}
                                style={{
                                  minWidth: "35px",
                                  borderRadius: "4px",
                                }}
                                aria-label={`Go to page ${number}`}
                                aria-current={
                                  pagination.currentPage === number
                                    ? "page"
                                    : undefined
                                }
                              >
                                {number}
                              </button>
                            ) : (
                              <span
                                key={`ellipsis-${index}`}
                                className="btn btn-sm btn-disabled me-1"
                                style={{
                                  minWidth: "35px",
                                  borderRadius: "4px",
                                  border: "1px solid #6c757d",
                                  cursor: "default",
                                }}
                              >
                                {number}
                              </span>
                            )
                          );
                        })()}

                        <button
                          disabled={!pagination.hasNextPage}
                          onClick={() =>
                            handlePageChange(pagination.currentPage + 1)
                          }
                          className="btn btn-dark btn-sm me-1"
                          style={{ borderRadius: "4px" }}
                          aria-label="Next Page"
                        >
                          Next
                        </button>

                        <button
                          onClick={() =>
                            handlePageChange(pagination.totalPages)
                          }
                          disabled={!pagination.hasNextPage}
                          className="btn btn-dark btn-sm"
                          style={{ borderRadius: "4px" }}
                          aria-label="Last Page"
                        >
                          Last
                        </button>
                      </div>
                    )}

                    {pagination.totalTickets === 0 && (
                      <div className="text-center my-3 text-muted">
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {deletePopUpShow && (
        <DeletePopUP
          message={"Are you sure you want to delete this ticket?"}
          cancelBtnCallBack={handelDeleteClosePopUpClick}
          confirmBtnCallBack={handelDeleteClick}
          heading="Delete"
        />
      )}

      {AddPopUpShow && <AddTicketPopup handleAdd={handleAdd} />}

      {addServicePopUpShow && (
        <AddServicePopup
          selectedTicket={selectedTicketId}
          handleAddService={handleAddService}
        />
      )}

      {updatePopUpShow && (
        <UpdateEmployeePopUp
          selectedTicket={selectedTicket}
          handleUpdate={handleUpdate}
        />
      )}
    </>
  );
};