import { useState, useEffect } from "react";
import { Header } from "../../MainDashboard/Header/Header";
import { Sidebar } from "../../MainDashboard/Sidebar/Sidebar";
import toast from 'react-hot-toast';
import EmployeeUpdateFeedbackPopUp from "./PopUp/EmployeeUpdateFeedbackPopUp";
import { getRemaningFeedback } from "../../../../hooks/useFeedback";
import { formatDate } from "../../../../utils/formatDate";

export const EmployeeFeedbackMasterGrid = () => {
    const [isopen, setIsOpen] = useState(false);
    const toggle = () => {
        setIsOpen(!isopen);
    };

    const [UpdatePopUpShow, setUpdatePopUpShow] = useState(false);
    const [selectedFeedback, setSelectedFeedback] = useState(null);
    const [loading, setLoading] = useState(true);
    const [searchText, setSearchText] = useState("");
    const [search, setSearch] = useState("");
    const [showFeedbackGiven, setShowFeedbackGiven] = useState(false);
    const [showHighRatingOnly, setShowHighRatingOnly] = useState(false);

    const [feedbacks, setFeedbacks] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 20;
    const [pagination, setPagination] = useState({
        currentPage: 1,
        totalPages: 0,
        totalFeedbacks: 0,
        limit: itemsPerPage,
        hasNextPage: false,
        hasPrevPage: false
    });

    // ─── NEW: separate state for all-pages stats ───────────────────────────────
    const [allFeedbacksForStats, setAllFeedbacksForStats] = useState([]);
    const [statsLoading, setStatsLoading] = useState(true);

    // Fetch ALL records (high limit, no search filter) just for stats/top engineers
    const fetchStatsData = async () => {
        try {
            setStatsLoading(true);
            // Use a large limit to get all records for accurate stats
            const data = await getRemaningFeedback(1, 9999, '');
            if (data && data.success) {
                setAllFeedbacksForStats(data.services || []);
            } else {
                setAllFeedbacksForStats([]);
            }
        } catch (error) {
            console.error("Error fetching stats data:", error);
            setAllFeedbacksForStats([]);
        } finally {
            setStatsLoading(false);
        }
    };
    // ──────────────────────────────────────────────────────────────────────────

    // Calculate statistics from ALL pages data
    const calculateStats = () => {
        const stats = {
            total: allFeedbacksForStats.length,
            pending: 0,
            completed: 0,
            highRating: 0,
            avgRating: 0,
            topEngineers: {}
        };

        let totalRating = 0;
        let ratingCount = 0;

        allFeedbacksForStats.forEach(feedback => {
            const hasFeedback = feedback.feedback && feedback.feedback.rating;

            if (hasFeedback) {
                stats.completed++;
                totalRating += feedback.feedback.rating;
                ratingCount++;

                if (feedback.feedback.rating >= 4) {
                    stats.highRating++;

                    if (feedback.allotTo && feedback.allotTo.length > 0) {
                        feedback.allotTo.forEach(engineer => {
                            if (!stats.topEngineers[engineer._id]) {
                                stats.topEngineers[engineer._id] = {
                                    name: engineer.name,
                                    count: 0,
                                    totalRating: 0
                                };
                            }
                            stats.topEngineers[engineer._id].count++;
                            stats.topEngineers[engineer._id].totalRating += feedback.feedback.rating;
                        });
                    }
                }
            } else {
                stats.pending++;
            }
        });

        stats.avgRating = ratingCount > 0 ? (totalRating / ratingCount).toFixed(1) : 0;

        Object.keys(stats.topEngineers).forEach(id => {
            const engineer = stats.topEngineers[id];
            engineer.avgRating = (engineer.totalRating / engineer.count).toFixed(1);
        });

        return stats;
    };

    const stats = calculateStats();

    const getTopEngineers = () => {
        const engineers = Object.values(stats.topEngineers);
        return engineers.sort((a, b) => {
            if (b.avgRating !== a.avgRating) {
                return parseFloat(b.avgRating) - parseFloat(a.avgRating);
            }
            return b.count - a.count;
        }).slice(0, 5);
    };

    const getCardType = (feedback) => {
        if (!feedback.feedback || !feedback.feedback.rating) {
            return {
                type: 'pending',
                bgColor: '#fff8e1',
                borderColor: '#ffc107',
                textColor: '#f57c00'
            };
        }

        const rating = feedback.feedback.rating;

        if (rating === 5) {
            return { type: 'excellent', bgColor: '#e8f5e9', borderColor: '#4caf50', textColor: '#2e7d32' };
        } else if (rating === 4) {
            return { type: 'good', bgColor: '#e0f7fa', borderColor: '#00bcd4', textColor: '#00838f' };
        } else if (rating === 3) {
            return { type: 'average', bgColor: '#fff3e0', borderColor: '#ff9800', textColor: '#ef6c00' };
        } else {
            return { type: 'poor', bgColor: '#ffebee', borderColor: '#f44336', textColor: '#c62828' };
        }
    };

    const renderStars = (rating) => {
        return (
            <div className="d-flex align-items-center">
                {[...Array(5)].map((_, i) => (
                    <i
                        key={i}
                        className={`fa fa-star ${i < rating ? 'text-warning' : 'text-light'}`}
                        style={{ fontSize: '16px' }}
                    ></i>
                ))}
                <span className="ms-1 fw-bold">{rating}</span>
            </div>
        );
    };

    const renderEngineerName = (engineer, hasHighRating) => {
        if (hasHighRating) {
            return (
                <span className="badge bg-success me-1 position-relative">
                    <i className="fa fa-trophy me-1"></i>
                    {engineer.name}
                    <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-warning">
                        <i className="fa fa-star" style={{ fontSize: '10px' }}></i>
                    </span>
                </span>
            );
        } else {
            return (
                <span className="badge bg-secondary me-1">
                    {engineer.name}
                </span>
            );
        }
    };

    // Fetch paginated data for the table
    const fetchData = async () => {
        try {
            setLoading(true);
            const data = await getRemaningFeedback(currentPage, itemsPerPage, search);

            if (data && data.success) {
                setFeedbacks(data.services || []);
                setPagination({
                    currentPage: data.currentPage || 1,
                    totalPages: data.totalPages || 0,
                    totalFeedbacks: data.totalRecords || 0,
                    limit: data.limit || itemsPerPage,
                    hasNextPage: data.hasNextPage || false,
                    hasPrevPage: data.hasPrevPage || false
                });
            } else {
                toast(data?.error || "Failed to fetch feedback.");
                setFeedbacks([]);
                setPagination({
                    currentPage: 1,
                    totalPages: 0,
                    totalFeedbacks: 0,
                    limit: itemsPerPage,
                    hasNextPage: false,
                    hasPrevPage: false
                });
            }
        } catch (error) {
            console.error("Error fetching feedback:", error);
            toast.error("Failed to fetch feedback.");
            setFeedbacks([]);
            setPagination({
                currentPage: 1,
                totalPages: 0,
                totalFeedbacks: 0,
                limit: itemsPerPage,
                hasNextPage: false,
                hasPrevPage: false
            });
        } finally {
            setLoading(false);
        }
    };

    // Paginated table data — re-fetch when page, search, or popup closes
    useEffect(() => {
        fetchData();
    }, [currentPage, UpdatePopUpShow, search]);

    // Stats data — only re-fetch when popup closes (data may have changed)
    // Does NOT depend on currentPage or search so it always reflects ALL records
    useEffect(() => {
        fetchStatsData();
    }, [UpdatePopUpShow]);

    const handleUpdate = (feedback = null) => {
        if (feedback) {
            setSelectedFeedback(feedback);
        }
        setUpdatePopUpShow(!UpdatePopUpShow);
    };

    const handlePageChange = (page) => {
        setCurrentPage(page);
    };

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        setSearch(searchText);
        setCurrentPage(1);
    };

    const handleSearchChange = (e) => {
        const value = e.target.value;
        setSearchText(value);
        if (value === '') {
            setSearch('');
            setCurrentPage(1);
        }
    };

    const handleToggleFeedback = () => {
        setShowFeedbackGiven(!showFeedbackGiven);
        setShowHighRatingOnly(false);
        setCurrentPage(1);
    };

    const handleToggleHighRating = () => {
        setShowHighRatingOnly(!showHighRatingOnly);
        setShowFeedbackGiven(true);
        setCurrentPage(1);
    };

    // Filter current page's feedbacks for the table
    const filteredFeedbacks = feedbacks.filter(feedback => {
        const hasFeedback = feedback.feedback && feedback.feedback.rating;
        const isHighRating = hasFeedback && feedback.feedback.rating >= 4;

        if (showHighRatingOnly) {
            return isHighRating;
        } else if (showFeedbackGiven) {
            return hasFeedback;
        } else {
            return !hasFeedback;
        }
    });

    // Pagination
    const maxPageButtons = 5;
    const halfMaxButtons = Math.floor(maxPageButtons / 2);
    let startPage = Math.max(1, currentPage - halfMaxButtons);
    let endPage = Math.min(pagination.totalPages, startPage + maxPageButtons - 1);
    if (endPage - startPage + 1 < maxPageButtons) {
        startPage = Math.max(1, endPage - maxPageButtons + 1);
    }
    const pageButtons = [];
    for (let i = startPage; i <= endPage; i++) {
        pageButtons.push(i);
    }

    // Toggle counts from CURRENT PAGE only (these are for the filter buttons)
    const pendingCount = feedbacks.filter(f => !(f.feedback && f.feedback.rating)).length;
    const givenCount = feedbacks.filter(f => f.feedback && f.feedback.rating).length;
    const highRatingCount = feedbacks.filter(f => f.feedback && f.feedback.rating >= 4).length;

    return (
        <>
            {loading && (
                <div className="overlay"> <span className="loader"></span> </div>
            )}

            <div className="container-scroller">
                <div className="row background_main_all">
                    <Header toggle={toggle} isopen={isopen} />
                    <div className="container-fluid page-body-wrapper">
                        <Sidebar isopen={isopen} active="EmployeeFeedbackMasterGrid" />
                        <div className="main-panel" style={{ width: isopen ? "" : "calc(100%  - 120px )", marginLeft: isopen ? "" : "125px" }}>
                            <div className="content-wrapper ps-3 ps-md-0 pt-3">
                                <div className="row px-2 py-1 align-items-center">
                                    <div className="col-12 col-lg-6">
                                        <h5 className="text-white py-2 mb-0">Feedback</h5>
                                    </div>
                                    <div className="col-12 col-lg-6">
                                        <div className="row g-2 justify-content-end align-items-center">
                                            <div className="col-sm-8 col-md-7 col-lg-6">
                                                <form onSubmit={handleSearchSubmit} className="d-flex">
                                                    <input
                                                        type="text"
                                                        className="form-control me-2"
                                                        placeholder="Search Client, Person, Product..."
                                                        value={searchText}
                                                        onChange={handleSearchChange}
                                                    />
                                                    <button className="btn btn-primary" type="submit">
                                                        <i className="fa fa-search"></i>
                                                    </button>
                                                    {searchText && (
                                                        <button
                                                            className="btn btn-outline-secondary ms-2"
                                                            type="button"
                                                            onClick={() => {
                                                                setSearchText('');
                                                                setSearch('');
                                                                setCurrentPage(1);
                                                            }}
                                                        >
                                                            <i className="fa fa-times"></i>
                                                        </button>
                                                    )}
                                                </form>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* ── Statistics Cards (ALL pages) ── */}
                                <div className="row px-2 py-3">
                                    <div className="col-12 col-md-3 mb-3">
                                        <div className="card border-left-primary shadow h-100 py-2" style={{ borderLeft: '4px solid #4e73df' }}>
                                            <div className="card-body">
                                                <div className="row no-gutters align-items-center">
                                                    <div className="col mr-2">
                                                        <div className="text-xs font-weight-bold text-primary text-uppercase mb-1">Total Feedback</div>
                                                        <div className="h5 mb-0 font-weight-bold text-gray-800">
                                                            {statsLoading ? <span className="spinner-border spinner-border-sm" /> : stats.total}
                                                        </div>
                                                    </div>
                                                    <div className="col-auto">
                                                        <i className="fas fa-clipboard-list fa-2x text-gray-300"></i>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="col-12 col-md-3 mb-3">
                                        <div className="card border-left-warning shadow h-100 py-2" style={{ borderLeft: '4px solid #f6c23e' }}>
                                            <div className="card-body">
                                                <div className="row no-gutters align-items-center">
                                                    <div className="col mr-2">
                                                        <div className="text-xs font-weight-bold text-warning text-uppercase mb-1">Pending</div>
                                                        <div className="h5 mb-0 font-weight-bold text-gray-800">
                                                            {statsLoading ? <span className="spinner-border spinner-border-sm" /> : stats.pending}
                                                        </div>
                                                    </div>
                                                    <div className="col-auto">
                                                        <i className="fas fa-clock fa-2x text-gray-300"></i>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="col-12 col-md-3 mb-3">
                                        <div className="card border-left-success shadow h-100 py-2" style={{ borderLeft: '4px solid #1cc88a' }}>
                                            <div className="card-body">
                                                <div className="row no-gutters align-items-center">
                                                    <div className="col mr-2">
                                                        <div className="text-xs font-weight-bold text-success text-uppercase mb-1">High Ratings (4-5)</div>
                                                        <div className="h5 mb-0 font-weight-bold text-gray-800">
                                                            {statsLoading ? <span className="spinner-border spinner-border-sm" /> : stats.highRating}
                                                        </div>
                                                    </div>
                                                    <div className="col-auto">
                                                        <i className="fas fa-star fa-2x text-gray-300"></i>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="col-12 col-md-3 mb-3">
                                        <div className="card border-left-info shadow h-100 py-2" style={{ borderLeft: '4px solid #36b9cc' }}>
                                            <div className="card-body">
                                                <div className="row no-gutters align-items-center">
                                                    <div className="col mr-2">
                                                        <div className="text-xs font-weight-bold text-info text-uppercase mb-1">Average Rating</div>
                                                        <div className="row no-gutters align-items-center">
                                                            <div className="col-auto">
                                                                <div className="h5 mb-0 mr-3 font-weight-bold text-gray-800">
                                                                    {statsLoading ? <span className="spinner-border spinner-border-sm" /> : stats.avgRating}
                                                                </div>
                                                            </div>
                                                            <div className="col">
                                                                <div className="progress progress-sm mr-2">
                                                                    <div
                                                                        className="progress-bar bg-info"
                                                                        role="progressbar"
                                                                        style={{ width: `${stats.avgRating * 20}%` }}
                                                                        aria-valuenow={stats.avgRating * 20}
                                                                        aria-valuemin="0"
                                                                        aria-valuemax="100"
                                                                    ></div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="col-auto">
                                                        <i className="fas fa-chart-line fa-2x text-gray-300"></i>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* ── Top Performing Engineers (ALL pages) ── */}
                                {!statsLoading && Object.keys(stats.topEngineers).length > 0 && (
                                    <div className="row px-2 py-3">
                                        <div className="col-12">
                                            <div className="card shadow">
                                                <div className="card-header py-2 d-flex flex-row align-items-center justify-content-between">
                                                    <h6 className="m-0 font-weight-bold text-primary">
                                                        <i className="fa fa-trophy me-2"></i>
                                                        Top Performing Engineers
                                                    </h6>
                                                </div>
                                                <div className="card-body">
                                                    <div className="row">
                                                        {getTopEngineers().map((engineer, index) => (
                                                            <div key={engineer.name} className="col-md-6 col-lg-4 mb-3">
                                                                <div className="card border-left-success shadow h-100 py-2" style={{ borderLeft: '4px solid #1cc88a' }}>
                                                                    <div className="card-body">
                                                                        <div className="row no-gutters align-items-center">
                                                                            <div className="col mr-2">
                                                                                <div className="text-xs font-weight-bold text-success text-uppercase mb-1">
                                                                                    #{index + 1} {engineer.name}
                                                                                </div>
                                                                                <div className="row no-gutters align-items-center">
                                                                                    <div className="col-auto">
                                                                                        <div className="h6 mb-0 font-weight-bold text-gray-800">
                                                                                            {engineer.avgRating} <i className="fas fa-star text-warning"></i>
                                                                                        </div>
                                                                                    </div>
                                                                                    <div className="col">
                                                                                        <div className="text-xs text-gray-500">
                                                                                            {engineer.count} high rating{engineer.count > 1 ? 's' : ''}
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                            <div className="col-auto">
                                                                                <i className="fas fa-award fa-2x text-gray-300"></i>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Toggle Buttons */}
                                <div className="row px-2 py-2">
                                    <div className="col-12">
                                        <div className="d-flex align-items-center gap-3 flex-wrap">
                                            <button
                                                onClick={handleToggleFeedback}
                                                className={`btn ${!showFeedbackGiven && !showHighRatingOnly ? 'btn-warning' : 'btn-outline-warning'}`}
                                                style={{ fontWeight: 'bold', minWidth: '180px' }}
                                            >
                                                <i className="fa fa-clock me-2"></i>
                                                Pending Feedback ({pendingCount})
                                            </button>
                                            <button
                                                onClick={handleToggleFeedback}
                                                className={`btn ${showFeedbackGiven && !showHighRatingOnly ? 'btn-success' : 'btn-outline-success'}`}
                                                style={{ fontWeight: 'bold', minWidth: '180px' }}
                                            >
                                                <i className="fa fa-check-circle me-2"></i>
                                                All Feedback ({givenCount})
                                            </button>
                                            <button
                                                onClick={handleToggleHighRating}
                                                className={`btn ${showHighRatingOnly ? 'btn-primary' : 'btn-outline-primary'}`}
                                                style={{ fontWeight: 'bold', minWidth: '180px' }}
                                            >
                                                <i className="fa fa-trophy me-2"></i>
                                                High Ratings Only ({highRatingCount})
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Table */}
                                <div className="row bg-white p-2 m-1 border rounded">
                                    <div className="col-12 py-2">
                                        <div className="table-responsive">
                                            <table className="table table-striped table-class" id="table-id">
                                                <thead>
                                                    <tr className="th_border">
                                                        <th>Sr. No</th>
                                                        <th className="align_left_td">Client Name</th>
                                                        <th className="align_left_td">Contact Person</th>
                                                        <th className="align_left_td">Contact No</th>
                                                        <th className="align_left_td">Product</th>
                                                        <th>Allotment Date</th>
                                                        <th>Completion Date</th>
                                                        <th>Assigned to</th>
                                                        <th>Rating</th>
                                                        <th>Status</th>
                                                        <th>Action</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="broder my-4">
                                                    {filteredFeedbacks && filteredFeedbacks.length > 0 ? (
                                                        filteredFeedbacks.map((feedback, index) => {
                                                            const hasFeedback = feedback.feedback && feedback.feedback.rating;
                                                            const hasHighRating = hasFeedback && feedback.feedback.rating >= 4;
                                                            const cardType = getCardType(feedback);

                                                            return (
                                                                <tr
                                                                    className="border my-4"
                                                                    key={feedback._id}
                                                                    style={{
                                                                        backgroundColor: cardType.bgColor,
                                                                        borderLeft: `4px solid ${cardType.borderColor}`,
                                                                        color: cardType.textColor
                                                                    }}
                                                                >
                                                                    <td>{index + 1}</td>
                                                                    <td className="align_left_td">{feedback.ticket?.client?.custName || 'N/A'}</td>
                                                                    <td className="align_left_td">{feedback.ticket?.contactPerson || 'N/A'}</td>
                                                                    <td className="align_left_td">{feedback.ticket?.contactNumber || 'N/A'}</td>
                                                                    <td className="align_left_td">{feedback.ticket?.product || 'N/A'}</td>
                                                                    <td>{formatDate(feedback.allotmentDate)}</td>
                                                                    <td>{formatDate(feedback.completionDate)}</td>
                                                                    <td>
                                                                        {feedback.allotTo?.map(person =>
                                                                            renderEngineerName(person, hasHighRating)
                                                                        ) || 'N/A'}
                                                                    </td>
                                                                    <td>
                                                                        {hasFeedback ? renderStars(feedback.feedback.rating) : '-'}
                                                                    </td>
                                                                    <td>
                                                                        <span className="badge" style={{
                                                                            backgroundColor: cardType.borderColor,
                                                                            color: 'white'
                                                                        }}>
                                                                            {hasFeedback ? `Feedback Given (${cardType.type})` : 'Pending Feedback'}
                                                                        </span>
                                                                    </td>
                                                                    <td>
                                                                        <span
                                                                            onClick={() => handleUpdate(feedback)}
                                                                            className="update me-2"
                                                                            style={{ cursor: 'pointer' }}
                                                                            title={hasFeedback ? "View/Update Feedback" : "Add Feedback"}
                                                                        >
                                                                            <i className={`fa-solid fa-eye ${hasFeedback ? 'text-primary' : 'text-warning'}`}></i>
                                                                        </span>
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })
                                                    ) : (
                                                        <tr>
                                                            <td colSpan="11" className="text-center">
                                                                {loading ? 'Loading...' :
                                                                    showHighRatingOnly ? 'No high ratings found.' :
                                                                        showFeedbackGiven ? 'No feedback given yet.' :
                                                                            search ? `No results found for "${search}"` : 'No pending feedback found.'}
                                                            </td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>

                                {/* Pagination */}
                                {filteredFeedbacks.length > 0 && pagination.totalPages > 1 && (
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
                                                className={`btn btn-sm me-1 ${pagination.currentPage === page ? "btn-primary" : "btn-dark"}`}
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
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {UpdatePopUpShow && selectedFeedback && (
                <EmployeeUpdateFeedbackPopUp
                    selectedFeedback={selectedFeedback}
                    handleUpdate={handleUpdate}
                    onSuccess={() => fetchData()}
                />
            )}
        </>
    );
};