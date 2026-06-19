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

// ─── Vendor Type Cards Config ───────────────────────────────────────────────
const VENDOR_TYPE_CONFIG = [
  { type: "Import",             icon: "fa-globe",        color: "#0d6efd", bg: "#e7f0ff" },
  { type: "B2B Material",       icon: "fa-handshake",    color: "#198754", bg: "#e6f4ee" },
  { type: "Labour Contractor",  icon: "fa-hard-hat",     color: "#fd7e14", bg: "#fff3e6" },
  { type: "Turnkey Contractor", icon: "fa-tools",        color: "#6f42c1", bg: "#f0ebff" },
  { type: "Logistics",          icon: "fa-truck",        color: "#0dcaf0", bg: "#e0f8fc" },
  { type: "Service",            icon: "fa-cogs",         color: "#20c997", bg: "#e3faf4" },
  { type: "Freelancer",         icon: "fa-user-tie",     color: "#e83e8c", bg: "#fce4f1" },
  { type: "Other",              icon: "fa-ellipsis-h",   color: "#6c757d", bg: "#f0f0f0" },
];

const VendorTypeCards = ({ vendors = [], totalVendors = 0 }) => {
  // Count from current page vendors — for accurate totals we use totalVendors from pagination
  const countByType = {};
  vendors.forEach((v) => {
    const t = (v.typeOfVendor || "Other").trim();
    countByType[t] = (countByType[t] || 0) + 1;
  });

  return (
    <div className="row px-2 mb-2">
      <div className="col-12">
        {/* Total Banner */}
        <div
          className="d-flex align-items-center justify-content-between px-3 py-2 mb-2 rounded"
          style={{ background: "#1a237e", border: "1px solid #283593" }}
        >
          <span className="fw-bold text-white" style={{ fontSize: "0.9rem" }}>
            <i className="fa fa-building me-2" style={{ color: "#90caf9" }}></i>
            Total Registered Vendors
          </span>
          <span
            className="badge rounded-pill px-3 py-2"
            style={{ background: "#2196f3", fontSize: "0.95rem" }}
          >
            {totalVendors}
          </span>
        </div>

        {/* Type-wise Cards */}
        <div className="row g-2">
          {VENDOR_TYPE_CONFIG.map(({ type, icon, color, bg }) => {
            const count = countByType[type] || 0;
            return (
              <div className="col-6 col-sm-4 col-md-3 col-xl-3" key={type}>
                <div
                  className="d-flex align-items-center gap-2 p-2 rounded"
                  style={{
                    background: bg,
                    border: `1px solid ${color}40`,
                    minHeight: "58px",
                  }}
                >
                  <div
                    className="d-flex align-items-center justify-content-center rounded flex-shrink-0"
                    style={{ width: "34px", height: "34px", background: color }}
                  >
                    <i className={`fa ${icon} text-white`} style={{ fontSize: "0.8rem" }}></i>
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: "0.65rem",
                        color: "#555",
                        lineHeight: 1.2,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {type}
                    </div>
                    <div className="fw-bold" style={{ fontSize: "1.15rem", color, lineHeight: 1.2 }}>
                      {count}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
// ────────────────────────────────────────────────────────────────────────────

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

  // State to toggle between all vendors and link-registered vendors
  const [showOnlyLinkRegistered, setShowOnlyLinkRegistered] = useState(false);

  const [brands, setBrands] = useState([]);

  const itemsPerPage = 20;

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleAdd = () => {
    if (AddPopUpShow) {
      setCurrentPage(1);
    }
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

  const handleToggleView = () => {
    setShowOnlyLinkRegistered(!showOnlyLinkRegistered);
    setCurrentPage(1);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const data = await getVendors(currentPage, itemsPerPage, search);
        if (data?.success) {
          let filteredVendors = data.vendors || [];
          if (showOnlyLinkRegistered) {
            filteredVendors = filteredVendors.filter(vendor => vendor.registeredFromLink === true);
          }

          setVendors(filteredVendors);

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
        } else {
          toast(data.error);
        }
      } catch (error) {
        console.error("Error fetching vendors:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentPage, deletePopUpShow, updatePopUpShow, search, showOnlyLinkRegistered]);

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

  const getMaterialCategoryBadge = (category) => {
    const badgeMap = {
      'Raw Material': 'bg-primary',
      'Finished Goods': 'bg-success',
      'Scrap Material': 'bg-warning',
      'Service': 'bg-info',
      'Logistics': 'bg-secondary',
      'Other': 'bg-dark',
    };
    return badgeMap[category] || 'bg-secondary';
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

                {/* ── Top Bar ── */}
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
                              placeholder="Search Vendor Name, Email, Phone, Type, Category, GST..."
                            />
                          </form>
                        </div>
                      </div>

                      {/* Toggle Link Registered */}
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

                      {user?.permissions && user?.permissions?.includes("createVendor") || user.user === 'company' ? (
                        <div className="col-6 col-lg-2 text-end">
                          <button onClick={handleAdd} type="button" className="btn adbtn btn-dark btn-sm">
                            <i className="fa-solid fa-plus"></i> Add
                          </button>
                        </div>
                      ) : null}

                      {user?.permissions && user?.permissions?.includes("createVendor") || user.user === 'company' ? (
                        <div className="col-6 col-lg-3 text-end">
                          <button onClick={handleVendorLink} type="button" className="btn btn-sm btn-info">
                            <i className="fa-solid fa-link"></i> Vendor Link
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>

                {/* ── Vendor Type Summary Cards ── */}
                <VendorTypeCards
                  vendors={vendors}
                  totalVendors={pagination.totalVendors}
                />

                {/* Link filter alert */}
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

                {/* ── Table ── */}
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
                                  <span className={`badge ${getMaterialCategoryBadge(vendor.materialCategory)}`}>
                                    {vendor.materialCategory === 'Other' && vendor.customMaterialCategory
                                      ? vendor.customMaterialCategory
                                      : vendor.materialCategory}
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

                                  {user?.permissions?.includes("updateVendor") || user?.user === 'company' ? (
                                    <span
                                      onClick={() => handleUpdate(vendor)}
                                      className="update"
                                      title="Update Vendor"
                                    >
                                      <i className="fa-solid fa-pen text-success me-3 cursor-pointer"></i>
                                    </span>
                                  ) : ""}

                                  {user?.permissions?.includes("deleteVendor") || user?.user === 'company' ? (
                                    <span
                                      onClick={() => handelDeleteClosePopUpClick(vendor._id)}
                                      className="delete"
                                      title="Delete Vendor"
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

                {/* ── Pagination ── */}
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