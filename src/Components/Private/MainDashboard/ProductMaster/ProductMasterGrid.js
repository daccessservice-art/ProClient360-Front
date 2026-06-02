import { useState, useContext, useEffect } from "react";
import { Header } from "../Header/Header";
import { Sidebar } from "../Sidebar/Sidebar";
import DeletePopUP from "../../CommonPopUp/DeletePopUp";
import AddProductPopUp from "./PopUp/AddProductPopUp";
import UpdateProductPopUp from "./PopUp/UpdateProductPopUp";
import ViewProductPopUp from "../../CommonPopUp/ViewProductPopUp"; 
import { getProducts, deleteProduct } from "../../../../hooks/useProduct";
import { UserContext } from "../../../../context/UserContext";
import toast from "react-hot-toast";

export const ProductMasterGrid = () => {
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

  const [selectedId, setSelecteId] = useState(null);
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedProductForView, setSelectedProductForView] = useState(null);
  const [searchText, setSearchText] = useState("");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 0,
    totalProducts: 0,
    limit: 20,
    hasNextPage: false,
    hasPrevPage: false,
  });

  const itemsPerPage = 20;

  const [productCategories, setProductCategories] = useState([]);

  useEffect(() => {
    const savedCategories = localStorage.getItem('productCategories');
    if (savedCategories) {
      setProductCategories(JSON.parse(savedCategories));
    } else {
      setProductCategories(["Electronics", "Clothing", "Food", "Furniture", "Stationery", "Tools"]);
    }
  }, []);

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleAdd = () => {
    setAddPopUpShow(!AddPopUpShow);
  };

  const handleUpdate = (product) => {
    setSelectedProduct(product);
    setUpdatePopUpShow(!updatePopUpShow);
  };

  const handleView = (product) => {
    setSelectedProductForView(product);
    setViewPopUpShow(true);
  };

  const handelDeleteClosePopUpClick = (id) => {
    setSelecteId(id);
    setdeletePopUpShow(!deletePopUpShow);
  };

  const handelDeleteClick = async () => {
    const data = await deleteProduct(selectedId);
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
        const data = await getProducts(currentPage, itemsPerPage, search);
        if (data?.success) {
          setProducts(data.products || []);
          setPagination(data.pagination || {
            currentPage: 1,
            totalPages: 0,
            totalProducts: 0,
            limit: itemsPerPage,
            hasNextPage: false,
            hasPrevPage: false,
          });
        }
        else {
          toast(data.error)
        }
      } catch (error) {
        console.error("Error fetching products:", error);
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

  const formatAmount = (val) => {
    if (!val || val <= 0) return null;
    return '₹' + Number(val).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
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
            <Sidebar isopen={isopen} active="ProductMasterGrid" />
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
                    <h5 className="text-white py-2">Product Master</h5>
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
                      {user?.permissions && user?.permissions?.includes("createProduct") || user.user==='company' ? ( 
                      <div className="col- col-lg-2 ms-auto text-end me-4">
                          <div className="col-12 col-lg-12  ms-auto text-end">
                            <button
                              onClick={handleAdd}
                              type="button"
                              className="btn adbtn btn-dark"
                            >
                              {" "}
                              <i className="fa-solid fa-plus"></i> Add
                            </button>
                          </div>
                      </div>
                        ) : (
                          null
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
                            <th className="align_left_td td_width">Product Name</th>
                            <th className="align_left_td td_width">Brand Name</th>
                            <th className="align_left_td td_width">Model</th>
                            <th>Product Category</th>
                            <th>Base UOM</th>
                            <th>Category</th>
                            <th className="text-end">Purchase Price</th>
                            <th>Discount Type</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {products.length > 0 ? (
                            products.map((product, index) => (
                              <tr className="border my-4" key={product._id}>
                                <td className="w-10">{index + 1 + (currentPage - 1) * itemsPerPage}</td>
                                <td className="align_left_td td_width wrap-text-of-col">{product.productName}</td>
                                <td className="align_left_td td_width wrap-text-of-col">{product.brandName}</td>
                                <td className="align_left_td td_width wrap-text-of-col">{product.model}</td>
                                <td className="wrap-text-of-col">{product.productCategory}</td>
                                <td>{product.baseUOM}</td>
                                <td>
                                  <span className={`badge bg-primary`}>
                                    {product.category}
                                  </span>
                                </td>
                                <td className="text-end">
                                  {product.mrp > 0 ? (
                                    <span style={{ color: '#15803d', fontWeight: 700, fontSize: '0.84rem', whiteSpace: 'nowrap' }}>
                                      {formatAmount(product.mrp)}
                                    </span>
                                  ) : (
                                    <span style={{ color: '#cbd5e1', fontSize: '0.8rem' }}>—</span>
                                  )}
                                </td>
                                <td>
                                  <span className={`badge ${
                                    product.discountType === 'Zero Discount' ? 'bg-secondary' : 
                                    product.discountType === 'In percentage' ? 'bg-info' : 'bg-warning'
                                  }`}>
                                    {product.discountType}
                                  </span>
                                </td>
                                <td>
                                  {user?.permissions?.includes("viewProduct") || user?.user==='company' ? (
                                    <span
                                      onClick={() => handleView(product)}
                                      className="view"
                                    >
                                      <i className="fa-solid fa-eye text-primary me-3 cursor-pointer"></i>
                                    </span>
                                  ) : (
                                    ""
                                  )}

                                  {user?.permissions?.includes("updateProduct") || user?.user==='company' ? (
                                    <span
                                      onClick={() => handleUpdate(product)}
                                      className="update"
                                    >
                                      <i className="fa-solid fa-pen text-success me-3 cursor-pointer"></i>
                                    </span>
                                  ) : (
                                    ""
                                  )}

                                  {user?.permissions?.includes("deleteProduct") || user?.user==='company'? (
                                    <span
                                      onClick={() =>
                                        handelDeleteClosePopUpClick(
                                          product._id
                                        )
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
                            ))
                          ) : (
                            <tr>
                              <td colSpan="13" className="text-center">
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

      {AddPopUpShow && <AddProductPopUp handleAdd={handleAdd} categories={productCategories} />}

      {updatePopUpShow && (
        <UpdateProductPopUp
          selectedProduct={selectedProduct}
          handleUpdate={handleUpdate}
          categories={productCategories}
        />
      )}

      {viewPopUpShow && (
        <ViewProductPopUp
          selectedProduct={selectedProductForView}
          closePopUp={() => setViewPopUpShow(false)}
        />
      )}
    </>
  );
};