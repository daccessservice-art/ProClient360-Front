import { useState, useContext, useEffect } from "react";
import { Header } from "../Header/Header";
import { Sidebar } from "../Sidebar/Sidebar";
import AddInventoryPopUp from "./PopUp/AddInventoryPopUp";
import UpdateInventoryPopUp from "./PopUp/UpdateInventoryPopUp";
import ViewInventoryPopup from "./PopUp/ViewInventoryPopup";
import DeletePopUP from "../../CommonPopUp/DeletePopUp";
import toast from "react-hot-toast";
import { getInventory, deleteInventory, createInventory, updateInventory } from "../../../../hooks/useInventory.js";
import { UserContext } from "../../../../context/UserContext";
import { formatDate } from "../../../../utils/formatDate";

export const InventoryMasterGrid = () => {
  const [isopen, setIsOpen] = useState(false);
  const [lowStockCount, setLowStockCount] = useState(0);
  
  const toggle = () => {
    setIsOpen(!isopen);
  };

  const { user } = useContext(UserContext);

  const [AddPopUpShow, setAddPopUpShow] = useState(false);
  const [deletePopUpShow, setdeletePopUpShow] = useState(false);
  const [selectedId, setSelecteId] = useState(null);
  const [updatePopUpShow, setUpdatePopUpShow] = useState(false);
  const [viewPopUpShow, setViewPopUpShow] = useState(false);
  const [selectedInventory, setSelectedInventory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [stockFilter, setStockFilter] = useState("");

  const [inventory, setInventory] = useState([]);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 0,
    totalRecords: 0,
    limit: 20,
    hasNextPage: false,
    hasPrevPage: false,
  });

  const itemsPerPage = 20;

  const handlePageChange = (page) => {
    setPagination((prev) => ({ ...prev, currentPage: page }));
  };

  const handleAdd = () => {
    setAddPopUpShow(!AddPopUpShow);
  };

  const handleUpdate = (item = null) => {
    setSelectedInventory(item);
    setUpdatePopUpShow(!updatePopUpShow);
  };

  const handleView = (item = null) => {
    setSelectedInventory(item);
    setViewPopUpShow(!viewPopUpShow);
  };

  const handelDeleteClosePopUpClick = (id) => {
    setSelecteId(id);
    setdeletePopUpShow(!deletePopUpShow);
  };

  const handelDeleteClick = async () => {
    toast.loading("Deleting Inventory Item...");
    const data = await deleteInventory(selectedId);
    toast.dismiss();
    if (data?.success) {
      handelDeleteClosePopUpClick();
      fetchInventory();
      return toast.success(data?.message);
    }
    toast.error(data?.error);
  };

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const data = await getInventory(pagination.currentPage, itemsPerPage, search, categoryFilter, stockFilter);
      
      if (data?.success) {
        setInventory(data.data || []);
        setPagination(data.pagination || {
          currentPage: 1,
          totalPages: 0,
          totalRecords: 0,
          limit: itemsPerPage,
          hasNextPage: false,
          hasPrevPage: false,
        });
        
        const lowStock = data.data.filter(item => item.currentStock <= item.minStockLevel);
        setLowStockCount(lowStock.length);
      } else {
        toast.error(data.error || "Failed to fetch inventory");
      }
    } catch (error) {
      console.error("Error fetching inventory:", error);
      toast.error("Failed to fetch inventory");
    } finally {
      setLoading(false);
    }
  };

  const handleAddInventory = async (inventoryData) => {
    try {
      toast.loading("Creating Inventory Item...");
      const result = await createInventory(inventoryData);
      toast.dismiss();
      
      if (result.success) {
        toast.success("Inventory item created successfully!");
        handleAdd();
        fetchInventory();
      } else {
        toast.error(result.error || "Failed to create inventory item");
      }
    } catch (error) {
      toast.dismiss();
      toast.error("Failed to create inventory item");
    }
  };

  const handleUpdateInventory = async (inventoryData) => {
    try {
      toast.loading("Updating Inventory Item...");
      const result = await updateInventory(selectedInventory._id, inventoryData);
      toast.dismiss();
      
      if (result.success) {
        toast.success("Inventory item updated successfully!");
        handleUpdate();
        fetchInventory();
      } else {
        toast.error(result.error || "Failed to update inventory item");
      }
    } catch (error) {
      toast.dismiss();
      toast.error("Failed to update inventory item");
    }
  };

  useEffect(() => {
    fetchInventory();
  }, [pagination.currentPage, search, categoryFilter, stockFilter]);

  useEffect(() => {
    setPagination((prev) => ({ ...prev, currentPage: 1 }));
  }, [searchText, categoryFilter, stockFilter]);

  const handleOnSearchSubmit = (e) => {
    e.preventDefault();
    setSearch(searchText);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount || 0);
  };

  const getStockStatus = (currentStock, minStock) => {
    if (currentStock === 0) return { text: 'Out of Stock', color: 'danger' };
    if (currentStock <= minStock) return { text: 'Low Stock', color: 'warning' };
    return { text: 'In Stock', color: 'success' };
  };

  return (
    <>
      {loading && (
        <div className="overlay">
          <span className="loader"></span>
        </div>
      )}

      <style>
        {`
          @keyframes blink {
            0% { opacity: 1; }
            50% { opacity: 0.5; }
            100% { opacity: 1; }
          }
        `}
      </style>

      <div className="container-scroller">
        <div className="row background_main_all">
          <Header toggle={toggle} isopen={isopen} />
          <div className="container-fluid page-body-wrapper">
            <Sidebar isopen={isopen} active="InventoryMasterGrid" />
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
                    <div className="row">
                      <div className="col-12 col-lg-4">
                        <h5 className="text-white py-2">
                          Inventory Master 
                          {lowStockCount > 0 && (
                            <span className="badge bg-warning ms-2" style={{ animation: 'blink 1.5s infinite' }}>
                              {lowStockCount} Low Stock
                            </span>
                          )}
                        </h5>
                      </div>
                    </div>
                  </div>

                  <div className="col-12 col-lg-6 ms-auto">
                    <div className="row g-2">
                      <div className="col-12 col-md-5">
                        <div className="form">
                          <i className="fa fa-search"></i>
                          <form onSubmit={handleOnSearchSubmit}>
                            <input
                              type="text"
                              value={searchText}
                              onChange={(e) => setSearchText(e.target.value)}
                              className="form-control form-input bg-transparant"
                              placeholder="Search material..."
                            />
                          </form>
                        </div>
                      </div>
                      
                      <div className="col-6 col-md-2">
                        <select 
                          className="form-select bg-transparant text-white"
                          value={categoryFilter}
                          onChange={(e) => setCategoryFilter(e.target.value)}
                        >
                          <option value="">All Categories</option>
                          <option value="Raw Material">Raw Material</option>
                          <option value="Finished Goods">Finished Goods</option>
                          <option value="Repairing Material">Repairing Material</option>
                          <option value="Scrap">Scrap</option>
                          <option value="Asset">Asset</option> {/* Added Asset option */}
                        </select>
                      </div>

                      <div className="col-6 col-md-2">
                        <select 
                          className="form-select bg-transparant text-white"
                          value={stockFilter}
                          onChange={(e) => setStockFilter(e.target.value)}
                        >
                          <option value="">All Stock</option>
                          <option value="in-stock">In Stock</option>
                          <option value="low-stock">Low Stock</option>
                          <option value="out-of-stock">Out of Stock</option>
                        </select>
                      </div>

                      {user?.permissions?.includes("createInventory") || user?.user === 'company' ? (
                        <div className="col-12 col-md-3 text-end">
                          <button
                            onClick={handleAdd}
                            type="button"
                            className="btn adbtn btn-dark w-100"
                          >
                            <i className="fa-solid fa-plus"></i> Add Material
                          </button>
                        </div>
                      ) : (
                        <div className="col-12 col-md-3"></div>
                      )}
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
                            <th className="align_left_td">Material Code</th>
                            <th className="align_left_td">Product Name</th>
                            <th className="align_left_td">Category</th>
                            <th className="text-end">Purchase Price</th>
                            <th className="text-center">Opening Stock</th>
                            <th className="text-center">Min Stock</th>
                            <th className="text-center">Base UOM</th>
                            <th className="text-center">Opening Date</th>
                            <th className="text-center">Action</th>
                          </tr>
                        </thead>
                        <tbody className="broder my-4">
                          {inventory.length > 0 ? (
                            inventory.map((item, index) => {
                              const stockStatus = getStockStatus(item.currentStock, item.minStockLevel);
                              
                              return (
                                <tr 
                                  className={`border my-4 ${stockStatus.color === 'danger' ? 'table-danger' : stockStatus.color === 'warning' ? 'table-danger' : ''}`} 
                                  key={item._id}
                                >
                                  <td>{index + 1 + (pagination.currentPage - 1) * itemsPerPage}</td>
                                  <td className="align_left_td">{item?.materialCode}</td>
                                  <td className="align_left_td">{item?.productName || item?.materialName}</td>
                                  <td className="align_left_td">
                                    <span className={`badge ${
                                      item?.category === 'Raw Material' ? 'bg-primary' : 
                                      item?.category === 'Finished Goods' ? 'bg-success' : 
                                      item?.category === 'Repairing Material' ? 'bg-info' :
                                      item?.category === 'Asset' ? 'bg-dark' : // Added Asset color
                                      'bg-secondary'
                                    }`}>
                                      {item?.category}
                                    </span>
                                  </td>
                                  <td className="text-end">{formatCurrency(item?.unitPrice)}</td>
                                  <td className="text-center">{item?.currentStock}</td>
                                  <td className="text-center">{item?.minStockLevel}</td>
                                  <td className="text-center">{item?.baseUOM || item?.unit}</td>
                                  <td className="text-center">{formatDate(item?.openingDate || item?.createdAt)}</td>
                                  <td className="text-center">
                                    {user?.permissions?.includes("viewInventory") || user?.user === 'company' ? (
                                      <span
                                        onClick={() => handleView(item)}
                                        className="view"
                                      >
                                        <i className="fa-solid fa-eye text-info cursor-pointer me-3"></i>
                                      </span>
                                    ) : (
                                      ""
                                    )}
                                    {user?.permissions?.includes("updateInventory") || user?.user === 'company' ? (
                                      <span
                                        onClick={() => handleUpdate(item)}
                                        className="update"
                                      >
                                        <i className="fa-solid fa-pen text-success cursor-pointer me-3"></i>
                                      </span>
                                    ) : (
                                      ""
                                    )}
                                    {user?.permissions?.includes("deleteInventory") || user?.user === 'company' ? (
                                      <span
                                        onClick={() =>
                                          handelDeleteClosePopUpClick(item._id)
                                        }
                                        className="delete"
                                      >
                                        <i className="fa-solid fa-trash text-danger cursor-pointer"></i>
                                      </span>
                                    ) : (
                                      ""
                                    )}
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
                {!loading && pagination.totalPages > 1 && (
                  <div className="pagination-container text-center my-3">
                    <button
                      onClick={() => handlePageChange(1)}
                      disabled={!pagination.hasPrevPage}
                      className="btn btn-dark btn-sm me-1"
                      style={{ borderRadius: "4px" }}
                    >
                      First
                    </button>
                    <button
                      onClick={() => handlePageChange(pagination.currentPage - 1)}
                      disabled={!pagination.hasPrevPage}
                      className="btn btn-dark btn-sm me-1"
                      style={{ borderRadius: "4px" }}
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
                          className={`btn btn-sm me-1 ${pagination.currentPage === number ? "btn-primary" : "btn-dark"}`}
                          style={{ minWidth: "35px", borderRadius: "4px" }}
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
                    >
                      Last
                    </button>
                  </div>
                )}
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
      {AddPopUpShow && (
        <AddInventoryPopUp 
          onAddInventory={handleAddInventory}
          onClose={handleAdd} 
        />
      )}
      {updatePopUpShow && (
        <UpdateInventoryPopUp 
          selectedInventory={selectedInventory}
          onUpdateInventory={handleUpdateInventory}
          onClose={handleUpdate} 
        />
      )}
      {viewPopUpShow && (
        <ViewInventoryPopup 
          selectedInventory={selectedInventory}
          onClose={handleView} 
        />
      )}
    </>
  );
};