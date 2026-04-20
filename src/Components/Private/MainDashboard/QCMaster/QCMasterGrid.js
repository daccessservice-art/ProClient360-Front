// Components/Private/MainDashboard/QCMaster/QCMasterGrid.jsx
import { useState, useContext, useEffect } from "react";
import { Header } from "../Header/Header";
import { Sidebar } from "../Sidebar/Sidebar";
import DeletePopUP from "../../CommonPopUp/DeletePopUp";
import AddQCPopUp from "./PopUp/AddQCPopUp";
import UpdateQCPopUp from "./PopUp/UpdateQCPopUp";
import ViewQCPopUp from "../../CommonPopUp/ViewQCPopUp";
import AssetListPopUp from "./PopUp/AssetListPopUp";
import AssetScannerPopUp from "./PopUp/AssetScannerPopUp";
import { getQualityInspections, deleteQualityInspection } from "../../../../hooks/useQC";
import { UserContext } from "../../../../context/UserContext";
import toast from "react-hot-toast";

export const QCMasterGrid = () => {
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
  const [assetListPopUpShow, setAssetListPopUpShow] = useState(false);
  const [assetScannerPopUpShow, setAssetScannerPopUpShow] = useState(false);
  const [selectedQC, setSelectedQC] = useState(null);
  const [selectedQCIdForAssets, setSelectedQCIdForAssets] = useState(null);

  const [selectedId, setSelecteId] = useState(null);
  const [qualityInspections, setQualityInspections] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 0,
    totalQCs: 0,
    limit: 20,
    hasNextPage: false,
    hasPrevPage: false,
  });

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

  const handleAssetList = () => {
    setAssetListPopUpShow(!assetListPopUpShow);
  };

  const handleAssetScanner = () => {
    setAssetScannerPopUpShow(!assetScannerPopUpShow);
  };

  const handelDeleteClosePopUpClick = (id) => {
    setSelecteId(id);
    setdeletePopUpShow(!deletePopUpShow);
  };

  const handelDeleteClick = async () => {
    const data = await deleteQualityInspection(selectedId);
    if (data?.success) {
      toast.success(data?.message);
    } else {
      toast.error(data?.error);
    }
    setdeletePopUpShow(false);
    setCurrentPage(1);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const data = await getQualityInspections(currentPage, itemsPerPage, search);
        if (data?.success) {
          setQualityInspections(data.qualityInspections || []);
          setPagination(data.pagination || {
            currentPage: 1,
            totalPages: 0,
            totalQCs: 0,
            limit: itemsPerPage,
            hasNextPage: false,
            hasPrevPage: false,
          });
        } else {
          toast(data.error);
        }
      } catch (error) {
        console.error("Error fetching quality inspections:", error);
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
            <Sidebar isopen={isopen} active="QCMasterGrid" />
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
                    <h5 className="text-white py-2">Quality Inspection Report</h5>
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
                      {user?.permissions || user?.permissions?.includes("createQC") || user.user==='company' ? ( 
                        <div className="col- col-lg-2 ms-auto text-end me-4">
                          <div className="col-12 col-lg-12 ms-auto text-end d-flex gap-1">
                            <button
                              onClick={handleAssetScanner}
                              type="button"
                              className="btn adbtn btn-info btn-sm"
                              title="Scan QR Code"
                            >
                              <i className="fa fa-qrcode"></i>
                            </button>
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
                            <th>QC Number</th>
                            <th>QC Date</th>
                            <th>GRN Number</th>
                            <th>Total Items</th>
                            <th>QC OK Qty</th>
                            <th>Faulty Qty</th>
                            <th>Total Assets</th>
                            <th>Status</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {qualityInspections.length > 0 ? (
                            qualityInspections.map((qc, index) => {
                              const totalQcOk = qc.items?.reduce((sum, item) => sum + item.qcOkQuantity, 0) || 0;
                              const totalFaulty = qc.items?.reduce((sum, item) => sum + item.faultyQuantity, 0) || 0;
                              const totalAssets = qc.totalAssets || qc.items?.reduce((sum, item) => sum + (item.assets?.length || 0), 0) || 0;
                              
                              return (
                                <tr className="border my-4" key={qc._id}>
                                  <td className="w-10">{index + 1 + (currentPage - 1) * itemsPerPage}</td>
                                  <td>{qc.qcNumber}</td>
                                  <td>{new Date(qc.qcDate).toLocaleDateString('en-GB')}</td>
                                  <td>{qc.grnNumber}</td>
                                  <td>{qc.items?.length || 0}</td>
                                  <td>
                                    <span className="badge bg-success">
                                      {totalQcOk}
                                    </span>
                                  </td>
                                  <td>
                                    <span className={`badge ${totalFaulty > 0 ? 'bg-danger' : 'bg-secondary'}`}>
                                      {totalFaulty}
                                    </span>
                                  </td>
                                  <td>
                                    <span className="badge bg-primary">
                                      {totalAssets}
                                    </span>
                                  </td>
                                  <td>
                                    <span className={`badge ${
                                      qc.status === 'Pending' ? 'bg-warning' : 
                                      qc.status === 'Completed' ? 'bg-success' : 'bg-danger'
                                    }`}>
                                      {qc.status}
                                    </span>
                                  </td>
                                  <td>
                                    <span 
                                      className="view" 
                                      onClick={() => {
                                        setSelectedQC(qc);
                                        setViewPopUpShow(true);
                                      }}
                                      title="View Details"
                                    >
                                      <i className="fa-solid fa-eye text-primary me-3 cursor-pointer"></i>
                                    </span>

                                    {totalAssets > 0 && (
                                      <span 
                                        className="assets" 
                                        onClick={() => {
                                          setSelectedQCIdForAssets(qc._id);
                                          setAssetListPopUpShow(true);
                                        }}
                                        title="View Assets & QR Codes"
                                      >
                                        <i className="fa-solid fa-qrcode text-info me-3 cursor-pointer"></i>
                                      </span>
                                    )}

                                    {user?.permissions?.includes("updateQC") || user?.user==='company' ? (
                                      <span 
                                        className="update" 
                                        onClick={() => {
                                          setSelectedQC(qc);
                                          setUpdatePopUpShow(true);
                                        }}
                                        title="Update"
                                      >
                                        <i className="fa-solid fa-pen text-success me-3 cursor-pointer"></i>
                                      </span>
                                    ) : ""}

                                    {user?.permissions?.includes("deleteQC") || user?.user==='company' ? (
                                      <span
                                        onClick={() => handelDeleteClosePopUpClick(qc._id)}
                                        className="delete"
                                        title="Delete"
                                      >
                                        <i className="fa-solid fa-trash text-danger cursor-pointer"></i>
                                      </span>
                                    ) : ""}
                                  </td>
                                </tr>
                              );
                            })
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

      {AddPopUpShow && <AddQCPopUp handleAdd={handleAdd} />}
      
      {updatePopUpShow && (
        <UpdateQCPopUp 
          handleUpdate={handleUpdate} 
          selectedQC={selectedQC} 
        />
      )}

      {viewPopUpShow && (
        <ViewQCPopUp 
          closePopUp={handleView} 
          selectedQC={selectedQC} 
        />
      )}

      {assetListPopUpShow && (
        <AssetListPopUp 
          handleClose={handleAssetList} 
          qcId={selectedQCIdForAssets} 
        />
      )}

      {assetScannerPopUpShow && (
        <AssetScannerPopUp 
          handleClose={handleAssetScanner} 
        />
      )}
    </>
  );
};