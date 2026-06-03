import { useState, useContext, useEffect } from "react";
import { Header } from "../Header/Header";
import { Sidebar } from "../Sidebar/Sidebar";
import DeletePopUP from "../../CommonPopUp/DeletePopUp";
import AddProductPopUp from "./PopUp/AddProductPopUp";
import UpdateProductPopUp from "./PopUp/UpdateProductPopUp";
import ViewProductPopUp from "../../CommonPopUp/ViewProductPopUp";
import { getProducts, deleteProduct, getAllProductsForReport } from "../../../../hooks/useProduct";
import { UserContext } from "../../../../context/UserContext";
import toast from "react-hot-toast";

// ─── Company Header Info for Reports ────────────────────────────────────────
const COMPANY_INFO = {
  name: "DAccess Security Systems Pvt. Ltd.",
  address: "Office No 5, 3rd Floor, Revati Arcade - II, Opp Kapil Malhar Society, Baner",
  city: "Pune, 27-Maharashtra",
  pincode: "Pincode - 411045",
  gstin: "GSTIN : 27AACCD7325G1ZR",
};

// ─── PDF Generator (pure browser, no library needed) ────────────────────────
const generatePDF = (products) => {
  const formatINR = (val) => {
    if (!val || val <= 0) return "-";
    return "Rs." + Number(val).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const now = new Date();
  const dateStr = now.toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" });
  const timeStr = now.toLocaleTimeString("en-IN");

  // Build HTML for print
  const rows = products
    .map(
      (p, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${p.productName || "-"}</td>
        <td>${p.brandName || "-"}</td>
        <td>${p.model || "-"}</td>
        <td>${p.productCategory || "-"}</td>
        <td>${p.hsnCode || "-"}</td>
        <td>${p.baseUOM || "-"}</td>
        <td>${p.category || "-"}</td>
        <td style="text-align:right">${formatINR(p.mrp)}</td>
        <td style="text-align:right">${formatINR(p.salesPrice)}</td>
        <td style="text-align:right">${formatINR(p.purchasePrice)}</td>
        <td style="text-align:right">${formatINR(p.minSalesPrice)}</td>
        <td style="text-align:right">${p.minQtyLevel > 0 ? p.minQtyLevel : "-"}</td>
        <td style="text-align:right;font-weight:700;color:#1e40af">${p.currentStockQty != null ? p.currentStockQty : 0}</td>
        <td>${p.discountType || "Zero Discount"}</td>
        <td>${p.taxType === "gst" ? `GST ${p.gstRate || 0}%` : p.taxType === "cess" ? `CESS` : "None"}</td>
      </tr>`
    )
    .join("");

  // Summary calculations
  const totalStock = products.reduce((sum, p) => sum + (parseFloat(p.currentStockQty) || 0), 0);
  const totalStockValue = products.reduce(
    (sum, p) => sum + (parseFloat(p.currentStockQty) || 0) * (parseFloat(p.purchasePrice) || 0),
    0
  );
  const totalMRPValue = products.reduce(
    (sum, p) => sum + (parseFloat(p.currentStockQty) || 0) * (parseFloat(p.mrp) || 0),
    0
  );

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8"/>
      <title>Product Master Report</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: Arial, sans-serif; font-size: 10px; color: #1a1a1a; padding: 15px; }
        .header-section { text-align: center; border-bottom: 2px solid #1e3a5f; padding-bottom: 10px; margin-bottom: 10px; }
        .company-name { font-size: 16px; font-weight: bold; color: #1e3a5f; }
        .company-sub { font-size: 10px; color: #555; margin-top: 3px; }
        .report-title { font-size: 13px; font-weight: bold; color: #1e3a5f; margin-top: 8px; border: 1px solid #1e3a5f; display: inline-block; padding: 3px 15px; border-radius: 3px; }
        .meta-row { display: flex; justify-content: space-between; margin: 8px 0; font-size: 9px; color: #555; }
        table { width: 100%; border-collapse: collapse; margin-top: 8px; }
        thead tr { background-color: #1e3a5f; color: white; }
        thead th { padding: 6px 4px; text-align: left; font-size: 9px; border: 1px solid #1e3a5f; }
        tbody tr:nth-child(even) { background-color: #f0f4ff; }
        tbody tr:nth-child(odd) { background-color: #ffffff; }
        tbody td { padding: 5px 4px; border: 1px solid #cdd5e0; font-size: 9px; }
        .summary-section { margin-top: 15px; border-top: 2px solid #1e3a5f; padding-top: 10px; }
        .summary-grid { display: flex; gap: 15px; flex-wrap: wrap; }
        .summary-card { background: #f0f4ff; border: 1px solid #c7d7f5; border-radius: 5px; padding: 8px 12px; min-width: 160px; }
        .summary-card .label { font-size: 9px; color: #555; }
        .summary-card .value { font-size: 13px; font-weight: bold; color: #1e3a5f; margin-top: 2px; }
        .footer { margin-top: 20px; text-align: center; font-size: 8px; color: #aaa; border-top: 1px solid #eee; padding-top: 8px; }
        @media print {
          body { padding: 5px; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="header-section">
        <div class="company-name">${COMPANY_INFO.name}</div>
        <div class="company-sub">${COMPANY_INFO.address}</div>
        <div class="company-sub">${COMPANY_INFO.city} &nbsp;|&nbsp; ${COMPANY_INFO.pincode}</div>
        <div class="company-sub">${COMPANY_INFO.gstin}</div>
        <div class="report-title">PRODUCT MASTER REPORT</div>
      </div>

      <div class="meta-row">
        <span>Total Products: <strong>${products.length}</strong></span>
        <span>Date: <strong>${dateStr}</strong> &nbsp; Time: <strong>${timeStr}</strong></span>
      </div>

      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Product Name</th>
            <th>Brand</th>
            <th>Model</th>
            <th>Category</th>
            <th>HSN</th>
            <th>UOM</th>
            <th>Group</th>
            <th>MRP (₹)</th>
            <th>Sales Price (₹)</th>
            <th>Purchase Price (₹)</th>
            <th>Min. Sales (₹)</th>
            <th>Min. Qty</th>
            <th>Curr. Stock</th>
            <th>Discount</th>
            <th>Tax</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>

      <div class="summary-section">
        <div class="summary-grid">
          <div class="summary-card">
            <div class="label">Total Products</div>
            <div class="value">${products.length}</div>
          </div>
          <div class="summary-card">
            <div class="label">Total Stock Units</div>
            <div class="value">${totalStock.toLocaleString("en-IN")}</div>
          </div>
          <div class="summary-card">
            <div class="label">Total Stock Value (Purchase)</div>
            <div class="value">₹${totalStockValue.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          </div>
          <div class="summary-card">
            <div class="label">Total MRP Value</div>
            <div class="value">₹${totalMRPValue.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          </div>
        </div>
      </div>

      <div class="footer">
        This is a system-generated report. &nbsp;|&nbsp; Printed on ${dateStr} at ${timeStr}
      </div>

      <script>
        window.onload = function() { window.print(); }
      </script>
    </body>
    </html>
  `;

  const printWindow = window.open("", "_blank", "width=1200,height=800");
  printWindow.document.write(htmlContent);
  printWindow.document.close();
};

// ─── Excel (CSV) Generator ───────────────────────────────────────────────────
const generateExcel = (products) => {
  const formatVal = (val) => {
    if (!val || val <= 0) return "";
    return Number(val).toFixed(2);
  };

  const now = new Date();
  const dateStr = now.toLocaleDateString("en-IN");

  // Header rows
  const companyRows = [
    [COMPANY_INFO.name],
    [COMPANY_INFO.address],
    [`${COMPANY_INFO.city} | ${COMPANY_INFO.pincode}`],
    [COMPANY_INFO.gstin],
    [],
    ["PRODUCT MASTER REPORT"],
    [`Date: ${dateStr}`, "", `Total Products: ${products.length}`],
    [],
  ];

  const headers = [
    "Sr. No",
    "Product Name",
    "Brand Name",
    "Model",
    "Print Name",
    "Alias Name",
    "HSN Code",
    "Description",
    "Product Category",
    "Base UOM",
    "Alternate UOM",
    "UOM Conversion",
    "Product Group",
    "MRP (Rs.)",
    "Sales Price (Rs.)",
    "Purchase Price (Rs.)",
    "Min. Sales Price (Rs.)",
    "Min. Qty Level",
    "Current Stock Qty.",
    "Stock Value (Purchase Rs.)",
    "Discount Type",
    "Discount Value",
    "Tax Type",
    "GST Rate (%)",
    "CESS % ",
    "CESS Amount (Rs.)",
  ];

  const dataRows = products.map((p, i) => {
    const stockVal = (parseFloat(p.currentStockQty) || 0) * (parseFloat(p.purchasePrice) || 0);
    return [
      i + 1,
      p.productName || "",
      p.brandName || "",
      p.model || "",
      p.printName || "",
      p.aliasName || "",
      p.hsnCode || "",
      p.description || "",
      p.productCategory || "",
      p.baseUOM || "",
      p.alternateUOM || "",
      p.uomConversion || 1,
      p.category || "",
      formatVal(p.mrp),
      formatVal(p.salesPrice),
      formatVal(p.purchasePrice),
      formatVal(p.minSalesPrice),
      p.minQtyLevel || 0,
      p.currentStockQty != null ? p.currentStockQty : 0,
      stockVal.toFixed(2),
      p.discountType || "Zero Discount",
      p.discountValue || 0,
      p.taxType || "none",
      p.taxType === "gst" ? p.gstRate || 0 : "",
      p.taxType === "cess" ? p.cessPercentage || 0 : "",
      p.taxType === "cess" ? p.cessAmount || 0 : "",
    ];
  });

  // Summary rows
  const totalStock = products.reduce((sum, p) => sum + (parseFloat(p.currentStockQty) || 0), 0);
  const totalStockValue = products.reduce(
    (sum, p) => sum + (parseFloat(p.currentStockQty) || 0) * (parseFloat(p.purchasePrice) || 0),
    0
  );
  const totalMRPValue = products.reduce(
    (sum, p) => sum + (parseFloat(p.currentStockQty) || 0) * (parseFloat(p.mrp) || 0),
    0
  );

  const summaryRows = [
    [],
    ["SUMMARY"],
    ["Total Products", products.length],
    ["Total Stock Units", totalStock],
    ["Total Stock Value (Purchase Price)", totalStockValue.toFixed(2)],
    ["Total MRP Value", totalMRPValue.toFixed(2)],
  ];

  const escape = (val) => {
    const str = String(val == null ? "" : val);
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const allRows = [
    ...companyRows,
    headers,
    ...dataRows,
    ...summaryRows,
  ];

  const csv = "\uFEFF" + allRows.map((row) => row.map(escape).join(",")).join("\r\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute(
    "download",
    `Product_Report_${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}.csv`
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// ─── Main Component ──────────────────────────────────────────────────────────
export const ProductMasterGrid = () => {
  const [isopen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reportLoading, setReportLoading] = useState(false);

  const toggle = () => setIsOpen(!isopen);

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
    const savedCategories = localStorage.getItem("productCategories");
    if (savedCategories) {
      setProductCategories(JSON.parse(savedCategories));
    } else {
      setProductCategories(["Electronics", "Clothing", "Food", "Furniture", "Stationery", "Tools"]);
    }
  }, []);

  const handlePageChange = (page) => setCurrentPage(page);

  const handleAdd = () => setAddPopUpShow(!AddPopUpShow);

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
          setPagination(
            data.pagination || {
              currentPage: 1,
              totalPages: 0,
              totalProducts: 0,
              limit: itemsPerPage,
              hasNextPage: false,
              hasPrevPage: false,
            }
          );
        } else {
          toast(data.error);
        }
      } catch (error) {
        console.error("Error fetching products:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentPage, deletePopUpShow, AddPopUpShow, updatePopUpShow, search]);

  // ✅ PDF Download Handler
  const handleDownloadPDF = async () => {
    try {
      setReportLoading(true);
      toast.loading("Preparing PDF report...");
      const data = await getAllProductsForReport(search);
      toast.dismiss();
      if (data?.success && data.products?.length > 0) {
        generatePDF(data.products);
      } else {
        toast.error("No products found for report");
      }
    } catch (err) {
      toast.dismiss();
      toast.error("Failed to generate PDF report");
    } finally {
      setReportLoading(false);
    }
  };

  // ✅ Excel Download Handler
  const handleDownloadExcel = async () => {
    try {
      setReportLoading(true);
      toast.loading("Preparing Excel report...");
      const data = await getAllProductsForReport(search);
      toast.dismiss();
      if (data?.success && data.products?.length > 0) {
        generateExcel(data.products);
        toast.success("Excel report downloaded!");
      } else {
        toast.error("No products found for report");
      }
    } catch (err) {
      toast.dismiss();
      toast.error("Failed to generate Excel report");
    } finally {
      setReportLoading(false);
    }
  };

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
    return (
      "₹" +
      Number(val).toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    );
  };

  return (
    <>
      {(loading || reportLoading) && (
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
                {/* ── Top Bar ── */}
                <div className="row px-2 py-1 align-items-center">
                  <div className="col-12 col-lg-3">
                    <h5 className="text-white py-2 mb-0">Product Master</h5>
                  </div>

                  <div className="col-12 col-lg-9">
                    <div className="d-flex flex-wrap align-items-center justify-content-end gap-2">
                      {/* Search */}
                      <div className="form" style={{ minWidth: "200px" }}>
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

                      {/* ✅ PDF Button */}
                      {(user?.permissions?.includes("viewProduct") || user?.user === "company") && (
                        <button
                          onClick={handleDownloadPDF}
                          type="button"
                          className="btn btn-danger btn-sm"
                          title="Download PDF Report"
                          disabled={reportLoading}
                        >
                          <i className="fa-solid fa-file-pdf me-1"></i> PDF
                        </button>
                      )}

                      {/* ✅ Excel Button */}
                      {(user?.permissions?.includes("viewProduct") || user?.user === "company") && (
                        <button
                          onClick={handleDownloadExcel}
                          type="button"
                          className="btn btn-success btn-sm"
                          title="Download Excel Report"
                          disabled={reportLoading}
                        >
                          <i className="fa-solid fa-file-excel me-1"></i> Excel
                        </button>
                      )}

                      {/* Add Button */}
                      {(user?.permissions?.includes("createProduct") || user?.user === "company") && (
                        <button onClick={handleAdd} type="button" className="btn adbtn btn-dark">
                          <i className="fa-solid fa-plus"></i> Add
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* ── Table ── */}
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
                            {/* ✅ NEW COLUMN */}
                            <th className="text-end">Curr. Stock Qty</th>
                            <th>Discount Type</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {products.length > 0 ? (
                            products.map((product, index) => (
                              <tr className="border my-4" key={product._id}>
                                <td className="w-10">
                                  {index + 1 + (currentPage - 1) * itemsPerPage}
                                </td>
                                <td className="align_left_td td_width wrap-text-of-col">
                                  {product.productName}
                                </td>
                                <td className="align_left_td td_width wrap-text-of-col">
                                  {product.brandName}
                                </td>
                                <td className="align_left_td td_width wrap-text-of-col">
                                  {product.model}
                                </td>
                                <td className="wrap-text-of-col">{product.productCategory}</td>
                                <td>{product.baseUOM}</td>
                                <td>
                                  <span className="badge bg-primary">{product.category}</span>
                                </td>
                                <td className="text-end">
                                  {product.mrp > 0 ? (
                                    <span
                                      style={{
                                        color: "#15803d",
                                        fontWeight: 700,
                                        fontSize: "0.84rem",
                                        whiteSpace: "nowrap",
                                      }}
                                    >
                                      {formatAmount(product.mrp)}
                                    </span>
                                  ) : (
                                    <span style={{ color: "#cbd5e1", fontSize: "0.8rem" }}>—</span>
                                  )}
                                </td>
                                {/* ✅ NEW: Current Stock Qty cell */}
                                <td className="text-end">
                                  <span
                                    style={{
                                      fontWeight: 700,
                                      fontSize: "0.84rem",
                                      color:
                                        product.currentStockQty > 0
                                          ? "#1e40af"
                                          : product.minQtyLevel > 0 &&
                                            product.currentStockQty <= product.minQtyLevel
                                          ? "#dc2626"
                                          : "#6b7280",
                                    }}
                                  >
                                    {product.currentStockQty != null ? product.currentStockQty : 0}{" "}
                                    <small style={{ fontWeight: 400, fontSize: "0.7rem" }}>
                                      {product.baseUOM}
                                    </small>
                                  </span>
                                </td>
                                <td>
                                  <span
                                    className={`badge ${
                                      product.discountType === "Zero Discount"
                                        ? "bg-secondary"
                                        : product.discountType === "In percentage"
                                        ? "bg-info"
                                        : "bg-warning"
                                    }`}
                                  >
                                    {product.discountType}
                                  </span>
                                </td>
                                <td>
                                  {user?.permissions?.includes("viewProduct") ||
                                  user?.user === "company" ? (
                                    <span onClick={() => handleView(product)} className="view">
                                      <i className="fa-solid fa-eye text-primary me-3 cursor-pointer"></i>
                                    </span>
                                  ) : (
                                    ""
                                  )}

                                  {user?.permissions?.includes("updateProduct") ||
                                  user?.user === "company" ? (
                                    <span
                                      onClick={() => handleUpdate(product)}
                                      className="update"
                                    >
                                      <i className="fa-solid fa-pen text-success me-3 cursor-pointer"></i>
                                    </span>
                                  ) : (
                                    ""
                                  )}

                                  {user?.permissions?.includes("deleteProduct") ||
                                  user?.user === "company" ? (
                                    <span
                                      onClick={() => handelDeleteClosePopUpClick(product._id)}
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
                              <td colSpan="11" className="text-center">
                                No data found
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