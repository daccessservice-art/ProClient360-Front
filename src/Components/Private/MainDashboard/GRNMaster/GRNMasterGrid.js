import { useState, useContext, useEffect } from "react";
import { Header } from "../Header/Header";
import { Sidebar } from "../Sidebar/Sidebar";
import DeletePopUP from "../../CommonPopUp/DeletePopUp";
import AddGRNPopUp from "./PopUp/AddGRNPopUp";
import UpdateGRNPopUp from "./PopUp/UpdateGRNPopUp";
import ViewGRNPopUp from "../../CommonPopUp/ViewGRNPopUp";
import { getGRNs, deleteGRN } from "../../../../hooks/useGRN";
import axios from "axios";
import { UserContext } from "../../../../context/UserContext";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";

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

export const GRNMasterGrid = () => {
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
  const [selectedGRN, setSelectedGRN] = useState(null);

  const [selectedId, setSelecteId] = useState(null);
  const [grns, setGRNs] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [exporting, setExporting] = useState(false);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 0,
    totalGRNs: 0,
    limit: 20,
    hasNextPage: false,
    hasPrevPage: false,
  });

  const [projects, setProjects] = useState([]);

  const itemsPerPage = 20;

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
    const data = await deleteGRN(selectedId);
    if (data?.success) {
      toast.success(data?.message);
    } else {
      toast.error(data?.error);
    }
    setdeletePopUpShow(false);
    setCurrentPage(1);
  };

  // ── Export to Excel ──────────────────────────────────────────────────────
  const handleExportExcel = async () => {
    try {
      setExporting(true);
      toast.loading("Preparing Excel file...");

      // Fetch all GRNs (not just current page) for a complete export
      let allGRNs = [];
      let page = 1;
      const limit = 200;
      let hasMore = true;

      while (hasMore) {
        const data = await getGRNs(page, limit, search);
        if (data?.success && data.grns?.length > 0) {
          allGRNs = [...allGRNs, ...data.grns];
          if (data.grns.length < limit) hasMore = false;
          else page++;
        } else {
          hasMore = false;
        }
      }

      toast.dismiss();

      if (allGRNs.length === 0) {
        toast.error("No GRN data to export");
        setExporting(false);
        return;
      }

      // Flatten: one row per GRN item (so quantities/prices are visible)
      const rows = [];
      allGRNs.forEach((grn, grnIndex) => {
        const baseInfo = {
          "Sr. No": grnIndex + 1,
          "GRN Number": grn.grnNumber || "-",
          "GRN Date": grn.grnDate ? new Date(grn.grnDate).toLocaleDateString("en-GB") : "-",
          "Choice": grn.choice || "-",
          "PO Number": grn.purchaseOrder?.orderNumber || "-",
          "Vendor Name": grn.vendor?.vendorName || "-",
          "Transaction Type": grn.transactionType || "-",
          "Purchase Type": grn.purchaseType || "-",
          "Project": grn.project?.name || "-",
          "Warehouse Location": grn.warehouseLocation || "-",
          "Status": grn.status || "-",
          "Remark": grn.remark || "-",
        };

        if (grn.items && grn.items.length > 0) {
          grn.items.forEach((item) => {
            rows.push({
              ...baseInfo,
              "Product Name": item.productName || "-",
              "Brand Name": item.brandName || "-",
              "Model No": item.modelNo || "-",
              "Unit": item.unit || "-",
              "Ordered Qty": item.orderedQuantity || 0,
              "Received Qty": item.receivedQuantity || 0,
              "Price": item.price || 0,
              "Discount %": item.discountPercent || 0,
              "Tax %": item.taxPercent || 0,
              "Net Value": item.netValue || 0,
            });
          });
        } else {
          rows.push({
            ...baseInfo,
            "Product Name": "-",
            "Brand Name": "-",
            "Model No": "-",
            "Unit": "-",
            "Ordered Qty": 0,
            "Received Qty": 0,
            "Price": 0,
            "Discount %": 0,
            "Tax %": 0,
            "Net Value": 0,
          });
        }
      });

      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "GRN Data");

      // Auto column width (simple heuristic)
      const colWidths = Object.keys(rows[0]).map((key) => ({
        wch: Math.max(key.length, 15),
      }));
      worksheet["!cols"] = colWidths;

      const fileName = `GRN_Master_${new Date().toISOString().split("T")[0]}.xlsx`;
      XLSX.writeFile(workbook, fileName);

      toast.success("Excel file downloaded successfully!");
    } catch (error) {
      toast.dismiss();
      console.error("Error exporting GRN to Excel:", error);
      toast.error("Failed to export Excel file");
    } finally {
      setExporting(false);
    }
  };

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
        const data = await getGRNs(currentPage, itemsPerPage, search);
        if (data?.success) {
          setGRNs(data.grns || []);
          setPagination(data.pagination || {
            currentPage: 1,
            totalPages: 0,
            totalGRNs: 0,
            limit: itemsPerPage,
            hasNextPage: false,
            hasPrevPage: false,
          });
        } else {
          toast(data.error);
        }
      } catch (error) {
        console.error("Error fetching GRNs:", error);
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
      case 'Completed': return 'bg-success';
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
            <Sidebar isopen={isopen} active="GRNMasterGrid" />
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
                    <h5 className="text-white py-2">GRN (Goods Receipt Note) Master</h5>
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

                      <div className="col- col-lg-2 ms-auto text-end me-2">
                        <div className="col-12 col-lg-12 ms-auto text-end">
                          <button
                            onClick={handleExportExcel}
                            type="button"
                            className="btn adbtn btn-success"
                            disabled={exporting}
                          >
                            <i className="fa-solid fa-file-excel"></i> {exporting ? "Exporting..." : "Export"}
                          </button>
                        </div>
                      </div>

                      {user?.permissions || user?.permissions?.includes("createGRN") || user.user==='company' ? ( 
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
                            <th>GRN Number</th>
                            <th>GRN Date</th>
                            <th>Choice</th>
                            <th>PO Number</th>
                            <th>Vendor Name</th>
                            <th>Transaction Type</th>
                            <th>Purchase Type</th>
                            <th>Status</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {grns.length > 0 ? (
                            grns.map((grn, index) => (
                              <tr className="border my-4" key={grn._id}>
                                <td className="w-10">{index + 1 + (currentPage - 1) * itemsPerPage}</td>
                                <td>{grn.grnNumber}</td>
                                <td>{new Date(grn.grnDate).toLocaleDateString('en-GB')}</td>
                                <td>
                                  <span className={`badge ${
                                    grn.choice === 'Against PO' ? 'bg-primary' : 'bg-secondary'
                                  }`}>
                                    {grn.choice}
                                  </span>
                                </td>
                                <td>{grn.purchaseOrder?.orderNumber || '-'}</td>
                                <td>{grn.vendor?.vendorName || 'N/A'}</td>
                                <td>
                                  <span className={`badge ${
                                    grn.transactionType === 'B2B' ? 'bg-primary' : 
                                    grn.transactionType === 'SEZ' ? 'bg-success' :
                                    grn.transactionType === 'Import' ? 'bg-info' : 'bg-warning'
                                  }`}>
                                    {grn.transactionType}
                                  </span>
                                </td>
                                <td>
                                  <span className={`badge ${
                                    grn.purchaseType === 'Project Purchase' ? 'bg-primary' : 'bg-secondary'
                                  }`}>
                                    {grn.purchaseType}
                                  </span>
                                </td>
                                <td>
                                  <span className={`badge ${getStatusBadgeClass(grn.status)}`}>
                                    {grn.status}
                                  </span>
                                </td>
                                <td>
                                  <span 
                                    className="view" 
                                    onClick={() => {
                                      setSelectedGRN(grn);
                                      setViewPopUpShow(true);
                                    }}
                                  >
                                    <i className="fa-solid fa-eye text-primary me-3 cursor-pointer"></i>
                                  </span>

                                  {user?.permissions?.includes("updateGRN") || user?.user==='company' ? (
                                    <span 
                                      className="update" 
                                      onClick={() => {
                                        setSelectedGRN(grn);
                                        setUpdatePopUpShow(true);
                                      }}
                                    >
                                      <i className="fa-solid fa-pen text-success me-3 cursor-pointer"></i>
                                    </span>
                                  ) : ""}

                                  {user?.permissions?.includes("deleteGRN") || user?.user==='company' ? (
                                    <span
                                      onClick={() => handelDeleteClosePopUpClick(grn._id)}
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
                              <td colSpan="10" className="text-center">
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

      {AddPopUpShow && <AddGRNPopUp handleAdd={handleAdd} projects={projects} />}
      
       {updatePopUpShow && (
        <UpdateGRNPopUp 
          handleUpdate={handleUpdate} 
          selectedGRN={selectedGRN} 
          projects={projects} 
        />
      )}

       {viewPopUpShow && (
        <ViewGRNPopUp 
          closePopUp={handleView} 
          selectedGRN={selectedGRN} 
        />
      )}  
    </>
  );
};