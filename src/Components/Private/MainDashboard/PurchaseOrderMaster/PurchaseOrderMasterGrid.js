import { useState, useContext, useEffect } from "react";
import { Header } from "../Header/Header";
import { Sidebar } from "../Sidebar/Sidebar";
import DeletePopUP from "../../CommonPopUp/DeletePopUp";
import AddPurchaseOrderPopUp from "./PopUp/AddPurchaseOrderPopUp";
import UpdatePurchaseOrderPopUp from "./PopUp/UpdatePurchaseOrderPopUp";
import ViewPurchaseOrderPopUp from "../../CommonPopUp/ViewPurchaseOrderPopUp"; // Add this import
import { getPurchaseOrders, deletePurchaseOrder } from "../../../../hooks/usePurchaseOrder";
import axios from "axios";
import { UserContext } from "../../../../context/UserContext";
import toast from "react-hot-toast";

const getProjects = async (page = 1, limit = 20, filters = {}, searchTerm = "") => {
  try {
    const baseUrl = process.env.REACT_APP_API_URL;
    const url = `${baseUrl}/api/project`;
    const params = {
      page: page,
      limit: limit,
      ...(filters.status && { status: filters.status }),
      ...(searchTerm && { search: searchTerm })
    };
    const response = await axios.get(url, {
      params: params,
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching projects:", error);
    return { success: false, error: error.message };
  }
};

export const PurchaseOrderMasterGrid = () => {
  const [isopen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const toggle = () => {
    setIsOpen(!isopen);
  };

  const { user } = useContext(UserContext);
  const [AddPopUpShow, setAddPopUpShow] = useState(false);
  const [deletePopUpShow, setdeletePopUpShow] = useState(false);
  const [updatePopUpShow, setUpdatePopUpShow] = useState(false);
  const [viewPopUpShow, setViewPopUpShow] = useState(false);
  const [selectedPO, setSelectedPO] = useState(null);

  const [selectedId, setSelecteId] = useState(null);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 0,
    totalPurchaseOrders: 0,
    limit: 20,
    hasNextPage: false,
    hasPrevPage: false,
  });

  const [projects, setProjects] = useState([]);

  const itemsPerPage = 20;

  const formatAmount = (val) => {
    if (!val || val <= 0) return null;
    return '₹' + Number(val).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleAdd = () => {
    setAddPopUpShow(!AddPopUpShow);
  };

  const handleUpdate = () => {
    setUpdatePopUpShow(!updatePopUpShow);
  };

  const handleView = () => { 
    setViewPopUpShow(!viewPopUpShow);
  };

  const handelDeleteClosePopUpClick = (id) => {
    setSelecteId(id);
    setdeletePopUpShow(!deletePopUpShow);
  };

  const handelDeleteClick = async () => {
    const data = await deletePurchaseOrder(selectedId);
    if (data?.success) {
      toast.success(data?.message);
    } else {
      toast.error(data?.error);
    }
    setdeletePopUpShow(false);
    setCurrentPage(1);
  };

  // Fetch projects for dropdown
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const data = await getProjects(1, 100, {}, "");
        if (data?.success) {
          const projectOptions = data.projects.map(p => ({
            value: p._id,
            label: p.name
          }));
          setProjects(projectOptions);
        }
      } catch (error) {
        console.error("Error fetching projects:", error);
        toast.error("Failed to fetch projects");
      }
    };
    fetchProjects();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const data = await getPurchaseOrders(currentPage, itemsPerPage, search);
        if (data?.success) {
          setPurchaseOrders(data.purchaseOrders || []);
          setPagination(data.pagination || {
            currentPage: 1,
            totalPages: 0,
            totalPurchaseOrders: 0,
            limit: itemsPerPage,
            hasNextPage: false,
            hasPrevPage: false,
          });
        } else {
          toast(data.error);
        }
      } catch (error) {
        console.error("Error fetching purchase orders:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentPage, deletePopUpShow, AddPopUpShow, updatePopUpShow, search]);

  const maxPageButtons = 5;
  const halfMaxButtons = Math.floor(maxPageButtons / 2);
  let startPage = Math.max(1, currentPage - halfMaxButtons);
  let endPage = Math.min(pagination.totalPages, startPage + maxPageButtons - 1);

  if (endPage - startPage + 1 < maxPageButtons) {
    startPage = Math.max(1, endPage - maxPageButtons + 1);
  }

  const handleOnSearchSubmit = (event) => {
    event.preventDefault();
    setSearch(searchText);
  };

  const pageButtons = [];
  for (let i = startPage; i <= endPage; i++) {
    pageButtons.push(i);
  }

  const getStatusBadgeClass = (status) => {
    switch(status) {
      case 'Pending': return 'bg-warning';
      case 'Approved': return 'bg-info';
      case 'Partially Received': return 'bg-primary';
      case 'Received': return 'bg-success';
      case 'Cancelled': return 'bg-danger';
      default: return 'bg-secondary';
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
            <Sidebar isopen={isopen} active="PurchaseOrderMasterGrid" />
            <div
              className="main-panel"
              style={{
                width: isopen ? "" : "calc(100% - 120px)",
                marginLeft: isopen ? "" : "125px",
              }}
            >
              <div className="content-wrapper ps-3 ps-md-0 pt-3">
                <div className="row px-2 py-1">
                  <div className="col-12 col-lg-6">
                    <h5 className="text-white py-2">Purchase Order Master</h5>
                  </div>
                  <div className="col-12 col-lg-5 ms-auto">
                    <div className="row">
                      <div className="col-8 col-lg-6 ms-auto text-end">
                        <div className="form">
                          <i className="fa fa-search"></i>
                          <form onSubmit={handleOnSearchSubmit}>
                            <input
                              type="text"
                              value={searchText}
                              onChange={(e) => setSearchText(e.target.value)}
                              className="form-control form-input bg-transparant"
                              placeholder="Search ..."
                            />
                          </form>
                        </div>
                      </div>
                      {user?.permissions || user?.permissions?.includes("createPurchaseOrder") || user.user==='company' ? ( 
                        <div className="col- col-lg-2 ms-auto text-end me-4">
                          <div className="col-12 col-lg-12 ms-auto text-end">
                            <button
                              onClick={handleAdd}
                              type="button"
                              className="btn adbtn btn-dark"
                            >
                              <i className="fa-solid fa-plus"></i> Add
                            </button>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="row bg-white p-2 m-1 border rounded">
                  <div className="col-12 py-2">
                    <div className="table-responsive">
                      <table className="table table-striped table-class" id="table-id">
                        <thead>
                          <tr className="th_border">
                            <th>Sr. No</th>
                            <th>Order Number</th>
                            <th>Order Date</th>
                            <th>Vendor Name</th>
                            <th>Transaction Type</th>
                            <th>Purchase Type</th>
                            <th className="text-end">Grand Total</th>
                            <th>Status</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {purchaseOrders.length > 0 ? (
                            purchaseOrders.map((po, index) => (
                              <tr className="border my-4" key={po._id}>
                                <td className="w-10">{index + 1 + (currentPage - 1) * itemsPerPage}</td>
                                <td>{po.orderNumber}</td>
                                <td>{new Date(po.orderDate).toLocaleDateString('en-GB')}</td>
                                <td>{po.vendor?.vendorName || 'N/A'}</td>
                                <td>
                                  <span className={`badge ${
                                    po.transactionType === 'B2B' ? 'bg-primary' : 
                                    po.transactionType === 'SEZ' ? 'bg-success' :
                                    po.transactionType === 'Import' ? 'bg-info' : 'bg-warning'
                                  }`}>
                                    {po.transactionType}
                                  </span>
                                </td>
                                <td>
                                  <span className={`badge ${
                                    po.purchaseType === 'Project Purchase' ? 'bg-primary' : 'bg-secondary'
                                  }`}>
                                    {po.purchaseType}
                                  </span>
                                </td>
                                <td className="text-end">
                                  {po.grandTotal > 0 ? (
                                    <span style={{ color: '#15803d', fontWeight: 700, fontSize: '0.84rem', whiteSpace: 'nowrap' }}>
                                      {formatAmount(po.grandTotal)}
                                    </span>
                                  ) : (
                                    <span style={{ color: '#cbd5e1', fontSize: '0.8rem' }}>—</span>
                                  )}
                                </td>
                                <td>
                                  <span className={`badge ${getStatusBadgeClass(po.status)}`}>
                                    {po.status}
                                  </span>
                                </td>
                                <td>
                                  {/* View button */}
                                  <span 
                                    className="view" 
                                    onClick={() => {
                                      setSelectedPO(po);
                                      setViewPopUpShow(true);
                                    }}
                                  >
                                    <i className="fa-solid fa-eye text-primary me-3 cursor-pointer"></i>
                                  </span>

                                  {user?.permissions?.includes("updatePurchaseOrder") || user?.user==='company' ? (
                                    <span 
                                      className="update" 
                                      onClick={() => {
                                        setSelectedPO(po);
                                        setUpdatePopUpShow(true);
                                      }}
                                    >
                                      <i className="fa-solid fa-pen text-success me-3 cursor-pointer"></i>
                                    </span>
                                  ) : ""}

                                  {user?.permissions?.includes("deletePurchaseOrder") || user?.user==='company' ? (
                                    <span
                                      onClick={() => handelDeleteClosePopUpClick(po._id)}
                                      className="delete"
                                    >
                                      <i className="fa-solid fa-trash text-danger cursor-pointer"></i>
                                    </span>
                                  ) : ""}
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan="9" className="text-center">
                                No data found
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                <div className="pagination-container text-center my-3 sm">
                  <button
                    disabled={!pagination.hasPrevPage}
                    onClick={() => handlePageChange(1)}
                    className="btn btn-dark btn-sm me-2"
                  >
                    First
                  </button>
                  <button
                    disabled={!pagination.hasPrevPage}
                    onClick={() => handlePageChange(currentPage - 1)}
                    className="btn btn-dark btn-sm me-2"
                  >
                    Previous
                  </button>
                  {startPage > 1 && <span className="mx-2">...</span>}

                  {pageButtons.map((page) => (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      className={`btn btn-sm me-1 ${ 
                        pagination.currentPage === page ? "btn-primary" : "btn-dark"
                      }`}
                    >
                      {page}
                    </button>
                  ))}

                  {endPage < pagination.totalPages && <span className="mx-2">...</span>}
                  <button
                    disabled={!pagination.hasNextPage}
                    onClick={() => handlePageChange(currentPage + 1)}
                    className="btn btn-dark btn-sm me-2"
                  >
                    Next
                  </button>
                  <button
                    disabled={!pagination.hasNextPage}
                    onClick={() => handlePageChange(pagination.totalPages)}
                    className="btn btn-dark btn-sm"
                  >
                    Last
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {deletePopUpShow && (
        <DeletePopUP
          message={"Are you sure! Do you want to Delete ?"}
          cancelBtnCallBack={handelDeleteClosePopUpClick}
          confirmBtnCallBack={handelDeleteClick}
          heading="Delete"
        />
      )}

      {AddPopUpShow && <AddPurchaseOrderPopUp handleAdd={handleAdd} projects={projects} />}
      
      {updatePopUpShow && (
        <UpdatePurchaseOrderPopUp 
          handleUpdate={handleUpdate} 
          selectedPO={selectedPO} 
          projects={projects} 
        />
      )}

      {viewPopUpShow && (
        <ViewPurchaseOrderPopUp 
          closePopUp={handleView} 
          selectedPO={selectedPO} 
        />
      )}
    </>
  );
};