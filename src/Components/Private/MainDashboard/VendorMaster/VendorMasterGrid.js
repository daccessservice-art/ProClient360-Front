import { useState, useContext, useEffect } from "react";
import { Header } from "../Header/Header";
import { Sidebar } from "../Sidebar/Sidebar";
import DeletePopUP from "../../CommonPopUp/DeletePopUp";
import AddVendorPopUp from "./PopUp/AddVendorPopUp";
import UpdateVendorPopUp from "./PopUp/UpdateVendorPopUp";
import VendorLinkPopUp from "./PopUp/VendorLinkPopUp";
import ViewVendorPopUp from "./PopUp/ViewVendorPopUp";
import { getVendors, deleteVendor } from "../../../../hooks/useVendor";
import { UserContext } from "../../../../context/UserContext";
import toast from "react-hot-toast";

export const VendorMasterGrid = () => {
  const [isopen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const toggle = () => {
    setIsOpen(!isopen);
  };

  const { user } = useContext(UserContext);
  const [AddPopUpShow, setAddPopUpShow] = useState(false);
  const [deletePopUpShow, setdeletePopUpShow] = useState(false);
  const [updatePopUpShow, setUpdatePopUpShow] = useState(false);
  const [vendorLinkPopUpShow, setVendorLinkPopUpShow] = useState(false);
  const [viewPopUpShow, setViewPopUpShow] = useState(false);
  const [generatedVendorLink, setGeneratedVendorLink] = useState("");

  const [selectedId, setSelecteId] = useState(null);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [vendors, setVendors] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 0,
    totalVendors: 0,
    limit: 20,
    hasNextPage: false,
    hasPrevPage: false,
  });
  
  // NEW: State to toggle between all vendors and link-registered vendors
  const [showOnlyLinkRegistered, setShowOnlyLinkRegistered] = useState(false);
  
  const [brands, setBrands] = useState([]);

  const itemsPerPage = 20;

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleAdd = () => {
    setAddPopUpShow(!AddPopUpShow);
  };

  const handleUpdate = (vendor) => {
    setSelectedVendor(vendor);
    setUpdatePopUpShow(!updatePopUpShow);
  };

  const handleView = (vendor) => {
    setSelectedVendor(vendor);
    setViewPopUpShow(!viewPopUpShow);
  };

  const handleViewClose = () => {
    setViewPopUpShow(false);
  };

  const handelDeleteClosePopUpClick = (id) => {
    setSelecteId(id);
    setdeletePopUpShow(!deletePopUpShow);
  };

  const handelDeleteClick = async () => {
    const data = await deleteVendor(selectedId);
    if (data?.success) {
      toast.success(data?.message);
    } else {
      toast.error(data?.error);
    }
    setdeletePopUpShow(false);
    setCurrentPage(1);
  };

  const handleVendorLink = () => {
    setVendorLinkPopUpShow(!vendorLinkPopUpShow);
  };

  const generateVendorLink = async () => {
    try {
      const uniqueId = Date.now().toString(36) + Math.random().toString(36).substr(2);
      const linkUrl = `${window.location.origin}/vendor-registration/${uniqueId}`;
      
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/vendor/generate-link`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ linkId: uniqueId, linkUrl })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setGeneratedVendorLink(linkUrl);
      } else {
        toast.error(data.error || "Failed to generate vendor link");
      }
    } catch (error) {
      console.error("Error generating vendor link:", error);
      toast.error("Error generating vendor link");
    }
  };

  const addBrand = (newBrand) => {
    if (newBrand && !brands.includes(newBrand)) {
      setBrands([...brands, newBrand]);
    }
  };

  // NEW: Toggle function
  const handleToggleView = () => {
    setShowOnlyLinkRegistered(!showOnlyLinkRegistered);
    setCurrentPage(1); // Reset to first page when toggling
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const data = await getVendors(currentPage, itemsPerPage, search);
        if (data?.success) {
          // NEW: Filter vendors based on toggle state
          let filteredVendors = data.vendors || [];
          if (showOnlyLinkRegistered) {
            filteredVendors = filteredVendors.filter(vendor => vendor.registeredFromLink === true);
          }
          
          setVendors(filteredVendors);
          
          // NEW: Update pagination based on filtered results
          const totalFilteredVendors = showOnlyLinkRegistered 
            ? filteredVendors.length 
            : data.pagination.totalVendors;
          
          setPagination({
            ...data.pagination,
            totalVendors: totalFilteredVendors,
            totalPages: Math.ceil(totalFilteredVendors / itemsPerPage)
          });
          
          const uniqueBrands = [...new Set(data.vendors
            .filter(vendor => vendor.typeOfVendor === 'B2B Material' && vendor.brandsWorkWith)
            .map(vendor => vendor.brandsWorkWith))];
          setBrands(uniqueBrands);
        }
        else {
          toast(data.error)
        }
      } catch (error) {
        console.error("Error fetching vendors:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentPage, deletePopUpShow, AddPopUpShow, updatePopUpShow, search, showOnlyLinkRegistered]);

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

  const renderStars = (rating) => {
    return (
      <div>
        {[1, 2, 3, 4, 5].map((star) => (
          <span
            key={star}
            className={`fa fa-star ${star <= rating ? 'text-warning' : 'text-secondary'}`}
          ></span>
        ))}
      </div>
    );
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
            <Sidebar isopen={isopen} active="VendorMasterGrid" />
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
                    <h5 className="text-white py-2">Vendor Master</h5>
                  </div>
                  <div className="col-12 col-lg-6 ms-auto">
                    <div className="row">
                      <div className="col-8 col-lg-5 ms-auto text-end">
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
                      
                      {/* NEW: Toggle Button for Link Registered Vendors */}
                      <div className="col-4 col-lg-2 text-end">
                        <button
                          onClick={handleToggleView}
                          type="button"
                          className={`btn btn-sm ${showOnlyLinkRegistered ? 'btn-warning' : 'btn-outline-light'}`}
                          title={showOnlyLinkRegistered ? "Show All Vendors" : "Show Link Registered Only"}
                        >
                          <i className={`fa ${showOnlyLinkRegistered ? 'fa-users' : 'fa-link'}`}></i>
                          {showOnlyLinkRegistered ? ' All' : ' Link'}
                        </button>
                      </div>
                      
                      {user?.permissions && user?.permissions?.includes("createVendor") || user.user==='company' ? ( 
                      <div className="col-6 col-lg-2 text-end">
                          <button
                            onClick={handleAdd}
                            type="button"
                            className="btn adbtn btn-dark btn-sm"
                          >
                            <i className="fa-solid fa-plus"></i> Add
                          </button>
                      </div>
                        ) : (
                          null
                        )}
                      {user?.permissions && user?.permissions?.includes("createVendor") || user.user==='company' ? (
                        <div className="col-6 col-lg-3 text-end">
                          <button
                            onClick={handleVendorLink}
                            type="button"
                            className="btn btn-sm btn-info"
                          >
                            <i className="fa-solid fa-link"></i> Vendor Link
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>

                {/* NEW: Display filter status */}
                {showOnlyLinkRegistered && (
                  <div className="row px-2">
                    <div className="col-12">
                      <div className="alert alert-info py-2 mb-2" style={{ fontSize: '14px' }}>
                        <i className="fa fa-filter me-2"></i>
                        Showing only vendors registered through link ({vendors.length} found)
                      </div>
                    </div>
                  </div>
                )}

                <div className="row bg-white p-2 m-1 border rounded">
                  <div className="col-12 py-2">
                    <div className="table-responsive">
                      <table className="table table-striped table-class" id="table-id">
                        <thead>
                          <tr className="th_border">
                            <th>Sr. No</th>
                            <th className="align_left_td td_width">Vendor Name</th>
                            <th className="align_left_td td_width">Email</th>
                            <th>Phone</th>
                            <th>Type of Vendor</th>
                            <th>Material Category</th>
                            <th>Rating</th>
                            <th>GST No</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {vendors.length > 0 ? (
                            vendors.map((vendor, index) => (
                              <tr className="border my-4" key={vendor._id}>
                                <td className="w-10">{index + 1 + (currentPage - 1) * itemsPerPage}</td>
                                <td className="align_left_td td_width wrap-text-of-col">{vendor.vendorName}</td>
                                <td className="align_left_td td_width wrap-text-of-col">{vendor.email}</td>
                                <td>{vendor.phoneNumber1}</td>
                                <td>
                                  <span className={`badge ${
                                    vendor.typeOfVendor === 'Import' ? 'bg-primary' : 
                                    vendor.typeOfVendor === 'B2B Material' ? 'bg-success' :
                                    vendor.typeOfVendor === 'Labour Contractor' ? 'bg-info' :
                                    vendor.typeOfVendor === 'Turnkey Contractor' ? 'bg-warning' :
                                    vendor.typeOfVendor === 'Logistics' ? 'bg-secondary' :
                                    vendor.typeOfVendor === 'Service' ? 'bg-danger' : 'bg-dark'
                                  }`}>
                                    {vendor.typeOfVendor}
                                  </span>
                                  {vendor.registeredFromLink && (
                                    <span className="badge bg-info ms-1" title="Registered via Link">
                                      <i className="fa fa-link"></i>
                                    </span>
                                  )}
                                </td>
                                <td>
                                  <span className={`badge ${
                                    vendor.materialCategory === 'Raw Material' ? 'bg-primary' : 
                                    vendor.materialCategory === 'Finished Goods' ? 'bg-success' :
                                    'bg-warning'
                                  }`}>
                                    {vendor.materialCategory}
                                  </span>
                                </td>
                                <td>{renderStars(vendor.vendorRating)}</td>
                                <td>{vendor.GSTNo}</td>
                                <td>
                                  <span
                                    onClick={() => handleView(vendor)}
                                    className="view"
                                    title="View Vendor Details"
                                  >
                                    <i className="fa-solid fa-eye text-primary me-3 cursor-pointer"></i>
                                  </span>

                                  {/* Only show update/delete buttons for vendors NOT registered via link */}
                                  {!vendor.registeredFromLink && (
                                    <>
                                      {user?.permissions?.includes("updateVendor") || user?.user==='company' ? (
                                        <span
                                          onClick={() => handleUpdate(vendor)}
                                          className="update"
                                          title="Update Vendor"
                                        >
                                          <i className="fa-solid fa-pen text-success me-3 cursor-pointer"></i>
                                        </span>
                                      ) : (
                                        ""
                                      )}

                                      {user?.permissions?.includes("deleteVendor") || user?.user==='company'? (
                                        <span
                                          onClick={() =>
                                            handelDeleteClosePopUpClick(
                                              vendor._id
                                            )
                                          }
                                          className="delete"
                                          title="Delete Vendor"
                                        >
                                          <i className="fa-solid fa-trash text-danger cursor-pointer"></i>
                                        </span>
                                      ) : (
                                        ""
                                      )}
                                    </>
                                  )}
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan="9" className="text-center">
                                {showOnlyLinkRegistered 
                                  ? "No vendors registered through link found" 
                                  : "No data found"}
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

      {AddPopUpShow && <AddVendorPopUp handleAdd={handleAdd} brands={brands} addBrand={addBrand} />}

      {updatePopUpShow && (
        <UpdateVendorPopUp
          selectedVendor={selectedVendor}
          handleUpdate={handleUpdate}
          brands={brands}
          addBrand={addBrand}
        />
      )}

      {vendorLinkPopUpShow && (
        <VendorLinkPopUp 
          handleVendorLink={handleVendorLink}
          generatedVendorLink={generatedVendorLink}
          generateVendorLink={generateVendorLink}
          setGeneratedVendorLink={setGeneratedVendorLink}
        />
      )}

      {viewPopUpShow && (
        <ViewVendorPopUp 
          vendor={selectedVendor}
          handleViewClose={handleViewClose}
        />
      )}
    </>
  );
};