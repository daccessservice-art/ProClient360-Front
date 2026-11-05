import { useState, useContext, useEffect, useCallback } from "react";
import { Header } from "../Header/Header";
import { Sidebar } from "../Sidebar/Sidebar";
import AddInventoryPopUp from "./PopUp/AddInventoryPopUp";
import UpdateInventoryPopUp from "./PopUp/UpdateInventoryPopUp";
import ViewInventoryPopup from "./PopUp/ViewInventoryPopup";
import StockHistoryPopup from "./PopUp/StockHistoryPopup";
import DeletePopUP from "../../CommonPopUp/DeletePopUp";
import toast from "react-hot-toast";
import { getInventory, deleteInventory, createInventory, updateInventory, syncInventoryWithProducts } from "../../../../hooks/useInventory.js";
import { UserContext } from "../../../../context/UserContext";
import { formatDate } from "../../../../utils/formatDate";

const ITEMS_PER_PAGE = 20;

const EMPTY_PAGINATION = {
  currentPage: 1,
  totalPages: 0,
  totalRecords: 0,
  limit: ITEMS_PER_PAGE,
  hasNextPage: false,
  hasPrevPage: false,
};

const EMPTY_SUMMARY = {
  totalItems: 0, inStock: 0, lowStock: 0, outOfStock: 0,
  totalIn: 0, totalOut: 0, totalStockValue: 0,
  productMasterTotal: 0, productMasterStock: 0, linkedProducts: 0, linkedStock: 0,
  notInProductMaster: 0, mismatch: 0,
};

// ── Product Master ↔ Inventory match strip ─────────────────────────────────
const ProductMatchBar = ({ summary, onSelect }) => {
  const countOk = summary.linkedProducts === summary.productMasterTotal;
  const stockOk = Math.abs((summary.productMasterStock || 0) - (summary.linkedStock || 0)) < 0.0001;
  const allOk = countOk && stockOk && summary.mismatch === 0;
  const Tick = ({ ok }) => (
    <i className={`fa-solid ${ok ? "fa-circle-check text-success" : "fa-triangle-exclamation text-warning"} ms-1`}></i>
  );
  return (
    <div className="row px-2 mb-2">
      <div className="col-12">
        <div className="d-flex flex-wrap align-items-center gap-3 px-3 py-2 rounded"
          style={{ background: allOk ? "#ecfdf5" : "#fffbeb", border: `1px solid ${allOk ? "#86efac" : "#fcd34d"}`, fontSize: "0.82rem" }}>
          <span className="fw-bold"><i className="fa-solid fa-scale-balanced me-1"></i>Product Master ↔ Inventory</span>
          <span title="Products in Product Master that have an Inventory row">
            Products: <strong>{fmtQty(summary.linkedProducts)}</strong> / {fmtQty(summary.productMasterTotal)}<Tick ok={countOk} />
          </span>
          <span title="Total stock: Product Master vs Inventory">
            Stock: PM <strong>{fmtQty(summary.productMasterStock)}</strong> = Inventory <strong>{fmtQty(summary.linkedStock)}</strong><Tick ok={stockOk} />
          </span>
          <span role="button" className="text-decoration-underline" onClick={() => onSelect("mismatch")}
            title="Items whose Opening + IN − OUT does not equal the live stock">
            Calculation mismatch: <strong>{fmtQty(summary.mismatch)}</strong><Tick ok={summary.mismatch === 0} />
          </span>
          {summary.notInProductMaster > 0 && (
            <span role="button" className="text-decoration-underline text-secondary" onClick={() => onSelect("not-linked")}
              title="Inventory items without a Product Master product (add Product Name + Base UOM to link)">
              Not in Product Master: <strong>{fmtQty(summary.notInProductMaster)}</strong>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

const fmtQty = (n) => {
  const v = Number(n) || 0;
  return Number.isInteger(v) ? v.toLocaleString("en-IN") : v.toLocaleString("en-IN", { maximumFractionDigits: 3 });
};

const formatCurrency = (amount) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(amount || 0);

const STATUS_STYLE = {
  "In Stock": { bg: "#dcfce7", color: "#15803d" },
  "Low Stock": { bg: "#fef3c7", color: "#b45309" },
  "Out of Stock": { bg: "#fee2e2", color: "#b91c1c" },
};

const CATEGORY_BADGE = {
  "Raw Material": "bg-primary",
  "Finished Goods": "bg-success",
  "Repairing Material": "bg-info",
  Scrap: "bg-secondary",
  Asset: "bg-dark",
};

// ── Summary cards (click = filter by stock status) ──────────────────────────
const SummaryCards = ({ summary, stockFilter, onSelect }) => {
  const cards = [
    { key: "", label: "Total Items", value: fmtQty(summary.totalItems), icon: "fa-boxes-stacked", color: "#1e40af", bg: "#e0e7ff" },
    { key: "in-stock", label: "In Stock", value: fmtQty(summary.inStock), icon: "fa-circle-check", color: "#15803d", bg: "#dcfce7" },
    { key: "low-stock", label: "Low Stock", value: fmtQty(summary.lowStock), icon: "fa-triangle-exclamation", color: "#b45309", bg: "#fef3c7" },
    { key: "out-of-stock", label: "Out of Stock", value: fmtQty(summary.outOfStock), icon: "fa-ban", color: "#b91c1c", bg: "#fee2e2" },
    { key: null, label: "Stock Value", value: formatCurrency(summary.totalStockValue), icon: "fa-indian-rupee-sign", color: "#6d28d9", bg: "#ede9fe" },
  ];

  return (
    <div className="row px-2 mb-2 g-2">
      {cards.map((c) => {
        const clickable = c.key !== null;
        const active = clickable && stockFilter === c.key;
        return (
          <div className="col-6 col-md-4 col-xl" key={c.label}>
            <div
              className="d-flex align-items-center gap-2 p-2 rounded"
              onClick={clickable ? () => onSelect(active && c.key ? "" : c.key) : undefined}
              title={clickable ? (c.key ? `Show only ${c.label}` : "Show all items") : undefined}
              style={{
                background: c.bg,
                border: active ? `2px solid ${c.color}` : `1px solid ${c.color}40`,
                cursor: clickable ? "pointer" : "default",
                minHeight: 58,
              }}
            >
              <div className="d-flex align-items-center justify-content-center rounded flex-shrink-0"
                style={{ width: 34, height: 34, background: c.color }}>
                <i className={`fa-solid ${c.icon} text-white`} style={{ fontSize: "0.8rem" }}></i>
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: "0.7rem", color: "#555" }}>{c.label}</div>
                <div className="fw-bold" style={{ fontSize: "1.05rem", color: c.color, whiteSpace: "nowrap" }}>{c.value}</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export const InventoryMasterGrid = () => {
  const [isopen, setIsOpen] = useState(false);
  const toggle = () => setIsOpen(!isopen);

  const { user } = useContext(UserContext);
  const can = (perm) => user?.permissions?.includes(perm) || user?.user === "company";

  const [AddPopUpShow, setAddPopUpShow] = useState(false);
  const [deletePopUpShow, setDeletePopUpShow] = useState(false);
  const [updatePopUpShow, setUpdatePopUpShow] = useState(false);
  const [viewPopUpShow, setViewPopUpShow] = useState(false);
  const [historyShow, setHistoryShow] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedInventory, setSelectedInventory] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [stockFilter, setStockFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);

  const [inventory, setInventory] = useState([]);
  const [pagination, setPagination] = useState(EMPTY_PAGINATION);
  const [summary, setSummary] = useState(EMPTY_SUMMARY);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  const [syncing, setSyncing] = useState(false);
  const handleSync = async () => {
    setSyncing(true);
    const data = await syncInventoryWithProducts();
    setSyncing(false);
    if (data?.success) {
      toast.success(data.message);
      refresh();
    } else {
      toast.error(data?.error || "Sync failed");
    }
  };

  // ── Fetch (stale responses are ignored) ──
  useEffect(() => {
    let isCurrent = true;
    const fetchData = async () => {
      setLoading(true);
      const data = await getInventory(currentPage, ITEMS_PER_PAGE, search, categoryFilter, stockFilter);
      if (!isCurrent) return;

      if (data?.success) {
        setInventory(data.data || []);
        setPagination(data.pagination || EMPTY_PAGINATION);
        setSummary(data.summary || EMPTY_SUMMARY);
        // server clamps the page if it no longer exists (e.g. after a delete)
        const serverPage = data.pagination?.currentPage;
        if (serverPage && serverPage !== currentPage && data.pagination.totalPages > 0) {
          setCurrentPage(serverPage);
        }
      } else {
        setInventory([]);
        setPagination(EMPTY_PAGINATION);
        toast.error(data?.error || "Failed to fetch inventory");
      }
      setLoading(false);
    };
    fetchData();
    return () => { isCurrent = false; };
  }, [currentPage, search, categoryFilter, stockFilter, refreshKey]);

  // ── Filters / search ──
  const handleOnSearchSubmit = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    setSearch(searchText.trim());
  };

  const handleSearchTextChange = (e) => {
    const value = e.target.value;
    setSearchText(value);
    if (value.trim() === "" && search !== "") {
      setCurrentPage(1);
      setSearch("");
    }
  };

  const handleClearSearch = () => {
    setSearchText("");
    setSearch("");
    setCurrentPage(1);
  };

  const handleCategoryChange = (value) => {
    setCategoryFilter(value);
    setCurrentPage(1);
  };

  const handleStockFilterChange = (value) => {
    setStockFilter(value);
    setCurrentPage(1);
  };

  const handlePageChange = (page) => {
    if (page < 1 || (pagination.totalPages > 0 && page > pagination.totalPages)) return;
    setCurrentPage(page);
  };

  // ── Popups ──
  const openAdd = () => setAddPopUpShow(true);
  const closeAdd = () => setAddPopUpShow(false);

  const openUpdate = (item) => { setSelectedInventory(item); setUpdatePopUpShow(true); };
  const closeUpdate = () => { setUpdatePopUpShow(false); setSelectedInventory(null); };

  const openView = (item) => { setSelectedInventory(item); setViewPopUpShow(true); };
  const closeView = () => { setViewPopUpShow(false); setSelectedInventory(null); };

  // from Stock History → open one item's full ledger (only needs its _id)
  const openItemFromHistory = (itemId) => {
    if (!itemId) return;
    setHistoryShow(false);
    openView({ _id: itemId });
  };

  const openDelete = (id) => { setSelectedId(id); setDeletePopUpShow(true); };
  const closeDelete = () => { setDeletePopUpShow(false); setSelectedId(null); };

  // ── CRUD ──
  const handleDelete = async () => {
    toast.loading("Deleting inventory item...");
    const data = await deleteInventory(selectedId);
    toast.dismiss();
    if (data?.success) {
      toast.success(data.message);
      closeDelete();
      if (inventory.length === 1 && currentPage > 1) setCurrentPage((p) => p - 1);
      else refresh();
    } else {
      toast.error(data?.error || "Failed to delete inventory item");
    }
  };

  const handleAddInventory = async (inventoryData) => {
    if (saving) return;
    setSaving(true);
    toast.loading("Creating inventory item...");
    const result = await createInventory(inventoryData);
    toast.dismiss();
    setSaving(false);

    if (result?.success) {
      toast.success(result.message || "Inventory item created successfully!", { duration: 5000 });
      closeAdd();
      setCurrentPage(1);
      refresh();
    } else {
      toast.error(result?.error || "Failed to create inventory item");
    }
  };

  const handleUpdateInventory = async (inventoryData) => {
    if (saving || !selectedInventory?._id) return;
    setSaving(true);
    toast.loading("Updating inventory item...");
    const result = await updateInventory(selectedInventory._id, inventoryData);
    toast.dismiss();
    setSaving(false);

    if (result?.success) {
      toast.success(result.message || "Inventory item updated successfully!");
      closeUpdate();
      refresh();
    } else {
      toast.error(result?.error || "Failed to update inventory item");
    }
  };

  // ── Pagination buttons ──
  const pageNumbers = [];
  {
    const maxPagesToShow = 5;
    const total = pagination.totalPages;
    let start = Math.max(1, currentPage - 2);
    let end = Math.min(total, start + maxPagesToShow - 1);
    if (end - start + 1 < maxPagesToShow) start = Math.max(1, end - maxPagesToShow + 1);
    for (let i = start; i <= end; i++) pageNumbers.push(i);
  }

  const hasActiveFilter = !!search || !!categoryFilter || !!stockFilter;

  return (
    <>
      {loading && (
        <div className="overlay">
          <span className="loader"></span>
        </div>
      )}

      <style>
        {`
          @keyframes blink { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }
          .inv-qty-in  { color: #15803d; font-weight: 600; }
          .inv-qty-out { color: #b91c1c; font-weight: 600; }
          .inv-sub     { font-size: 0.72rem; color: #6b7280; }
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
                {/* ── Top Bar ── */}
                <div className="row px-2 py-1 align-items-center">
                  <div className="col-12 col-lg-4">
                    <h5 className="text-white py-2 mb-0">
                      Inventory Master
                      {summary.lowStock + summary.outOfStock > 0 && (
                        <span className="badge bg-warning text-dark ms-2" style={{ animation: "blink 1.5s infinite" }}>
                          {summary.lowStock + summary.outOfStock} Need Attention
                        </span>
                      )}
                    </h5>
                  </div>

                  <div className="col-12 col-lg-8">
                    <div className="d-flex flex-wrap align-items-center justify-content-end gap-2">
                      <div className="form position-relative" style={{ minWidth: 230 }}>
                        <i className="fa fa-search"></i>
                        <form onSubmit={handleOnSearchSubmit}>
                          <input
                            type="text"
                            value={searchText}
                            onChange={handleSearchTextChange}
                            className="form-control form-input bg-transparant"
                            placeholder="Code, product, brand, model, HSN..."
                            title="Press Enter to search"
                          />
                        </form>
                        {search && (
                          <i
                            className="fa fa-times cursor-pointer"
                            onClick={handleClearSearch}
                            title="Clear search"
                            style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", left: "auto" }}
                          ></i>
                        )}
                      </div>

                      <select
                        className="form-select bg-transparant text-white"
                        style={{ width: "auto" }}
                        value={categoryFilter}
                        onChange={(e) => handleCategoryChange(e.target.value)}
                      >
                        <option value="">All Categories</option>
                        <option value="Raw Material">Raw Material</option>
                        <option value="Finished Goods">Finished Goods</option>
                        <option value="Repairing Material">Repairing Material</option>
                        <option value="Scrap">Scrap</option>
                        <option value="Asset">Asset</option>
                      </select>

                      <select
                        className="form-select bg-transparant text-white"
                        style={{ width: "auto" }}
                        value={stockFilter}
                        onChange={(e) => handleStockFilterChange(e.target.value)}
                      >
                        <option value="">All Stock</option>
                        <option value="in-stock">In Stock</option>
                        <option value="low-stock">Low Stock</option>
                        <option value="out-of-stock">Out of Stock</option>
                        <option value="mismatch">Calculation Mismatch</option>
                        <option value="not-linked">Not in Product Master</option>
                        <option value="auto">Auto-added from Product Master</option>
                      </select>

                      {can("viewInventory") && (
                        <button type="button" className="btn btn-info btn-sm" onClick={() => setHistoryShow(true)}
                          title="All GRN / DC / manual movements with who & when">
                          <i className="fa-solid fa-clock-rotate-left me-1"></i>Stock History
                        </button>
                      )}

                      <button type="button" className="btn btn-outline-light btn-sm" onClick={handleSync} disabled={syncing}
                        title="Add every Product Master product that is missing from Inventory">
                        <i className={`fa-solid fa-arrows-rotate me-1 ${syncing ? "fa-spin" : ""}`}></i>Sync Products
                      </button>

                      <button type="button" className="btn btn-outline-light btn-sm" onClick={refresh} title="Reload live stock">
                        <i className="fa-solid fa-rotate"></i>
                      </button>

                      {can("createInventory") && (
                        <button onClick={openAdd} type="button" className="btn adbtn btn-dark">
                          <i className="fa-solid fa-plus"></i> Add Material
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* ── Summary ── */}
                <SummaryCards summary={summary} stockFilter={stockFilter} onSelect={handleStockFilterChange} />
                <ProductMatchBar summary={summary} onSelect={handleStockFilterChange} />

                {hasActiveFilter && (
                  <div className="row px-2">
                    <div className="col-12">
                      <div className="alert alert-info py-2 mb-2 d-flex flex-wrap align-items-center gap-2" style={{ fontSize: 14 }}>
                        <i className="fa fa-filter"></i>
                        <span>Showing <strong>{pagination.totalRecords}</strong> item(s)</span>
                        {search && (
                          <span className="badge bg-dark">
                            Search: "{search}" <i className="fa fa-times ms-2 cursor-pointer" onClick={handleClearSearch}></i>
                          </span>
                        )}
                        {categoryFilter && (
                          <span className="badge bg-primary">
                            {categoryFilter} <i className="fa fa-times ms-2 cursor-pointer" onClick={() => handleCategoryChange("")}></i>
                          </span>
                        )}
                        {stockFilter && (
                          <span className="badge bg-warning text-dark">
                            {stockFilter.replace(/-/g, " ")} <i className="fa fa-times ms-2 cursor-pointer" onClick={() => handleStockFilterChange("")}></i>
                          </span>
                        )}
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
                            <th className="align_left_td">Material Code</th>
                            <th className="align_left_td">Product</th>
                            <th className="align_left_td">Category</th>
                            <th className="text-end">Purchase Price</th>
                            <th className="text-center">Opening</th>
                            <th className="text-center" title="GRN received + manual incoming">IN (+)</th>
                            <th className="text-center" title="Delivery Challan + manual outgoing">OUT (−)</th>
                            <th className="text-center">Current Stock</th>
                            <th className="text-center">Min</th>
                            <th className="text-center">Opening Date / Added By</th>
                            <th className="text-center">Action</th>
                          </tr>
                        </thead>
                        <tbody className="broder my-4">
                          {inventory.length > 0 ? (
                            inventory.map((item, index) => {
                              const st = STATUS_STYLE[item.stockStatus] || STATUS_STYLE["In Stock"];
                              const uom = item.baseUOM || item.unit || "";
                              return (
                                <tr
                                  key={item._id}
                                  className={`border my-4 ${item.stockStatus === "Out of Stock" ? "table-danger" : item.stockStatus === "Low Stock" ? "table-warning" : ""}`}
                                >
                                  <td>{index + 1 + (pagination.currentPage - 1) * ITEMS_PER_PAGE}</td>
                                  <td className="align_left_td">{item.materialCode}</td>
                                  <td className="align_left_td" style={{ minWidth: 180 }}>
                                    <div className="fw-semibold">{item.productName || item.materialName || "-"}</div>
                                    {(item.brandName || item.model) && (
                                      <div className="inv-sub">{[item.brandName, item.model].filter(Boolean).join(" • ")}</div>
                                    )}
                                    <div className="d-flex flex-wrap gap-1 mt-1">
                                      {item.inProductMaster ? (
                                        <span className="badge bg-light text-success border" style={{ fontSize: "0.65rem" }}
                                          title="Current stock comes from Product Master (updated by GRN / DC)">
                                          <i className="fa-solid fa-link me-1"></i>Product Master
                                        </span>
                                      ) : (
                                        <span className="badge bg-light text-secondary border" style={{ fontSize: "0.65rem" }}
                                          title="Not in Product Master — add Product Name + Base UOM and save to link">
                                          <i className="fa-solid fa-link-slash me-1"></i>Not in Product Master
                                        </span>
                                      )}
                                      {item.autoCreated && (
                                        <span className="badge bg-light text-primary border" style={{ fontSize: "0.65rem" }}
                                          title="Added automatically when the product was created in Product Master">Auto</span>
                                      )}
                                      {item.duplicateProduct && (
                                        <span className="badge bg-warning text-dark" style={{ fontSize: "0.65rem" }}
                                          title="Another product has the same Brand + Model; GRN / DC update only the oldest one">Duplicate</span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="align_left_td">
                                    <span className={`badge ${CATEGORY_BADGE[item.category] || "bg-secondary"}`}>{item.category}</span>
                                  </td>
                                  <td className="text-end">{formatCurrency(item.unitPrice || item.purchasePrice)}</td>
                                  <td className="text-center">{fmtQty(item.openingStock)}</td>
                                  <td className="text-center">
                                    <span className="inv-qty-in">+{fmtQty(item.totalIn)}</span>
                                    {item.grnCount > 0 && <div className="inv-sub">{item.grnCount} GRN</div>}
                                  </td>
                                  <td className="text-center">
                                    <span className="inv-qty-out">−{fmtQty(item.totalOut)}</span>
                                    {item.dcCount > 0 && <div className="inv-sub">{item.dcCount} DC</div>}
                                  </td>
                                  <td className="text-center">
                                    <span
                                      style={{
                                        display: "inline-block", padding: "3px 10px", borderRadius: 12,
                                        fontWeight: 700, fontSize: "0.85rem", background: st.bg, color: st.color,
                                      }}
                                      title={item.stockStatus}
                                    >
                                      {fmtQty(item.currentStock)}
                                      {uom && <small style={{ fontWeight: 400, marginLeft: 4, fontSize: "0.7rem" }}>{uom}</small>}
                                    </span>
                                    <div className="inv-sub">{item.stockStatus}</div>
                                    {Math.abs(item.difference || 0) > 0.0001 && (
                                      <div className="inv-sub text-warning fw-semibold"
                                        title={`Opening + IN − OUT = ${fmtQty(item.calculatedStock)}, live stock = ${fmtQty(item.currentStock)}`}>
                                        <i className="fa-solid fa-triangle-exclamation me-1"></i>
                                        diff {item.difference > 0 ? "+" : ""}{fmtQty(item.difference)}
                                      </div>
                                    )}
                                  </td>
                                  <td className="text-center">{fmtQty(item.minStockLevel)}</td>
                                  <td className="text-center">
                                    {formatDate(item.openingDate || item.createdAt)}
                                    {item.createdByName && (
                                      <div className="inv-sub" title={`Added on ${new Date(item.createdAt).toLocaleString("en-IN")}`}>
                                        <i className="fa-solid fa-user me-1"></i>{item.createdByName}
                                      </div>
                                    )}
                                    {item.lastMovement && (
                                      <div className="inv-sub" title="Last stock movement">
                                        Last: {item.lastMovement.type} {formatDate(item.lastMovement.date)}
                                      </div>
                                    )}
                                  </td>
                                  <td className="text-center" style={{ whiteSpace: "nowrap" }}>
                                    {can("viewInventory") && (
                                      <span onClick={() => openView(item)} className="view" title="View details & stock ledger">
                                        <i className="fa-solid fa-eye text-info cursor-pointer me-3"></i>
                                      </span>
                                    )}
                                    {can("updateInventory") && (
                                      <span onClick={() => openUpdate(item)} className="update" title="Edit / stock transaction">
                                        <i className="fa-solid fa-pen text-success cursor-pointer me-3"></i>
                                      </span>
                                    )}
                                    {can("deleteInventory") && (
                                      <span onClick={() => openDelete(item._id)} className="delete" title="Delete">
                                        <i className="fa-solid fa-trash text-danger cursor-pointer"></i>
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })
                          ) : (
                            <tr>
                              <td colSpan="12" className="text-center">
                                {loading ? "Loading..." : hasActiveFilter ? "No items match the selected filters" : "No data found"}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* ── Pagination ── */}
                {pagination.totalPages > 1 && (
                  <div className="pagination-container text-center my-3">
                    <button onClick={() => handlePageChange(1)} disabled={!pagination.hasPrevPage} className="btn btn-dark btn-sm me-1">First</button>
                    <button onClick={() => handlePageChange(currentPage - 1)} disabled={!pagination.hasPrevPage} className="btn btn-dark btn-sm me-1">Previous</button>
                    {pageNumbers[0] > 1 && <span className="mx-2 text-white">...</span>}
                    {pageNumbers.map((n) => (
                      <button
                        key={n}
                        onClick={() => handlePageChange(n)}
                        className={`btn btn-sm me-1 ${pagination.currentPage === n ? "btn-primary" : "btn-dark"}`}
                        style={{ minWidth: 35 }}
                      >
                        {n}
                      </button>
                    ))}
                    {pageNumbers[pageNumbers.length - 1] < pagination.totalPages && <span className="mx-2 text-white">...</span>}
                    <button onClick={() => handlePageChange(currentPage + 1)} disabled={!pagination.hasNextPage} className="btn btn-dark btn-sm me-1">Next</button>
                    <button onClick={() => handlePageChange(pagination.totalPages)} disabled={!pagination.hasNextPage} className="btn btn-dark btn-sm">Last</button>
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
          cancelBtnCallBack={closeDelete}
          confirmBtnCallBack={handleDelete}
          heading="Delete"
        />
      )}
      {AddPopUpShow && (
        <AddInventoryPopUp onAddInventory={handleAddInventory} onClose={closeAdd} requireMaterialCode saving={saving} />
      )}
      {updatePopUpShow && selectedInventory && (
        <UpdateInventoryPopUp
          selectedInventory={selectedInventory}
          onUpdateInventory={handleUpdateInventory}
          onClose={closeUpdate}
          saving={saving}
        />
      )}
      {viewPopUpShow && selectedInventory && (
        <ViewInventoryPopup selectedInventory={selectedInventory} onClose={closeView} />
      )}
      {historyShow && (
        <StockHistoryPopup onClose={() => setHistoryShow(false)} onOpenItem={openItemFromHistory} />
      )}
    </>
  );
};