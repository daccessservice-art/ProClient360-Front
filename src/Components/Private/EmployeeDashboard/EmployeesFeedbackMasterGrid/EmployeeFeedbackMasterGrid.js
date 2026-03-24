import { useState, useEffect, useMemo } from "react";
import { Header } from "../../MainDashboard/Header/Header";
import { Sidebar } from "../../MainDashboard/Sidebar/Sidebar";
import toast from 'react-hot-toast';
import EmployeeUpdateFeedbackPopUp from "./PopUp/EmployeeUpdateFeedbackPopUp";
import { getRemaningFeedback } from "../../../../hooks/useFeedback";
import { formatDate, formatDateTimeForDisplay } from "../../../../utils/formatDate";

const ITEMS_PER_PAGE = 20;

export const EmployeeFeedbackMasterGrid = () => {
    const [isopen, setIsOpen] = useState(false);
    const toggle = () => setIsOpen(!isopen);

    const [UpdatePopUpShow, setUpdatePopUpShow] = useState(false);
    const [selectedFeedback, setSelectedFeedback] = useState(null);
    const [loading, setLoading] = useState(true);

    const [searchText, setSearchText] = useState("");
    const [search, setSearch] = useState("");

    const [showFeedbackGiven, setShowFeedbackGiven] = useState(false);
    const [showHighRatingOnly, setShowHighRatingOnly] = useState(false);

    const [allFeedbacks, setAllFeedbacks] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);

    const fetchAllData = async () => {
        try {
            setLoading(true);
            const data = await getRemaningFeedback(1, 9999, '');
            if (data && data.success) {
                setAllFeedbacks(data.services || []);
            } else {
                toast.error(data?.error || "Failed to fetch feedback.");
                setAllFeedbacks([]);
            }
        } catch (error) {
            console.error("Error fetching feedback:", error);
            toast.error("Failed to fetch feedback.");
            setAllFeedbacks([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAllData();
    }, [UpdatePopUpShow]);

    const searchFiltered = useMemo(() => {
        if (!search.trim()) return allFeedbacks;
        const q = search.trim().toLowerCase();
        return allFeedbacks.filter(fb => {
            const client  = fb.ticket?.client?.custName?.toLowerCase() || '';
            const person  = fb.ticket?.contactPerson?.toLowerCase() || '';
            const product = fb.ticket?.product?.toLowerCase() || '';
            const contact = fb.ticket?.contactNumber?.toLowerCase() || '';
            return client.includes(q) || person.includes(q) || product.includes(q) || contact.includes(q);
        });
    }, [allFeedbacks, search]);

    const filteredFeedbacks = useMemo(() => {
        return searchFiltered.filter(feedback => {
            const hasFeedback  = feedback.feedback && feedback.feedback.rating;
            const isHighRating = hasFeedback && feedback.feedback.rating >= 4;
            if (showHighRatingOnly) return isHighRating;
            if (showFeedbackGiven) return hasFeedback;
            return !hasFeedback;
        });
    }, [searchFiltered, showFeedbackGiven, showHighRatingOnly]);

    const totalPages = Math.ceil(filteredFeedbacks.length / ITEMS_PER_PAGE);
    const paginatedFeedbacks = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredFeedbacks.slice(start, start + ITEMS_PER_PAGE);
    }, [filteredFeedbacks, currentPage]);

    useEffect(() => {
        setCurrentPage(1);
    }, [showFeedbackGiven, showHighRatingOnly, search]);

    const stats = useMemo(() => {
        const result = { total: allFeedbacks.length, pending: 0, completed: 0, highRating: 0, avgRating: 0, topEngineers: {} };
        let totalRating = 0, ratingCount = 0;

        allFeedbacks.forEach(feedback => {
            const hasFeedback = feedback.feedback && feedback.feedback.rating;
            if (hasFeedback) {
                result.completed++;
                totalRating += feedback.feedback.rating;
                ratingCount++;
                if (feedback.feedback.rating >= 4) {
                    result.highRating++;
                    (feedback.allotTo || []).forEach(engineer => {
                        if (!result.topEngineers[engineer._id]) {
                            result.topEngineers[engineer._id] = { name: engineer.name, count: 0, totalRating: 0 };
                        }
                        result.topEngineers[engineer._id].count++;
                        result.topEngineers[engineer._id].totalRating += feedback.feedback.rating;
                    });
                }
            } else {
                result.pending++;
            }
        });

        result.avgRating = ratingCount > 0 ? (totalRating / ratingCount).toFixed(1) : 0;
        Object.values(result.topEngineers).forEach(eng => {
            eng.avgRating = (eng.totalRating / eng.count).toFixed(1);
        });
        return result;
    }, [allFeedbacks]);

    const topEngineers = useMemo(() =>
        Object.values(stats.topEngineers)
            .sort((a, b) => parseFloat(b.avgRating) - parseFloat(a.avgRating) || b.count - a.count)
            .slice(0, 5),
        [stats]
    );

    const pendingCount    = useMemo(() => searchFiltered.filter(f => !(f.feedback && f.feedback.rating)).length, [searchFiltered]);
    const givenCount      = useMemo(() => searchFiltered.filter(f => f.feedback && f.feedback.rating).length, [searchFiltered]);
    const highRatingCount = useMemo(() => searchFiltered.filter(f => f.feedback && f.feedback.rating >= 4).length, [searchFiltered]);

    const getCardType = (feedback) => {
        if (!feedback.feedback || !feedback.feedback.rating) return { type: 'pending',   bgColor: '#fff8e1', borderColor: '#ffc107', textColor: '#f57c00' };
        const r = feedback.feedback.rating;
        if (r === 5) return { type: 'excellent', bgColor: '#e8f5e9', borderColor: '#4caf50', textColor: '#2e7d32' };
        if (r === 4) return { type: 'good',      bgColor: '#e0f7fa', borderColor: '#00bcd4', textColor: '#00838f' };
        if (r === 3) return { type: 'average',   bgColor: '#fff3e0', borderColor: '#ff9800', textColor: '#ef6c00' };
        return { type: 'poor', bgColor: '#ffebee', borderColor: '#f44336', textColor: '#c62828' };
    };

    const renderStars = (rating) => (
        <div className="d-flex align-items-center">
            {[...Array(5)].map((_, i) => (
                <i key={i} className={`fa fa-star ${i < rating ? 'text-warning' : 'text-light'}`} style={{ fontSize: '16px' }}></i>
            ))}
            <span className="ms-1 fw-bold">{rating}</span>
        </div>
    );

    const renderEngineerName = (engineer, hasHighRating) => hasHighRating ? (
        <span className="badge bg-success me-1 position-relative" key={engineer._id}>
            <i className="fa fa-trophy me-1"></i>{engineer.name}
            <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-warning">
                <i className="fa fa-star" style={{ fontSize: '10px' }}></i>
            </span>
        </span>
    ) : (
        <span className="badge bg-secondary me-1" key={engineer._id}>{engineer.name}</span>
    );

    const handleUpdate = (feedback = null) => {
        if (feedback) setSelectedFeedback(feedback);
        setUpdatePopUpShow(!UpdatePopUpShow);
    };

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        setSearch(searchText);
    };

    const handleSearchChange = (e) => {
        const value = e.target.value;
        setSearchText(value);
        if (value === '') setSearch('');
    };

    const handleToggleFeedback = () => {
        setShowFeedbackGiven(!showFeedbackGiven);
        setShowHighRatingOnly(false);
    };

    const handleToggleHighRating = () => {
        setShowHighRatingOnly(!showHighRatingOnly);
        setShowFeedbackGiven(true);
    };

    const maxPageButtons = 5;
    const halfMax = Math.floor(maxPageButtons / 2);
    let startPage = Math.max(1, currentPage - halfMax);
    let endPage   = Math.min(totalPages, startPage + maxPageButtons - 1);
    if (endPage - startPage + 1 < maxPageButtons) startPage = Math.max(1, endPage - maxPageButtons + 1);
    const pageButtons = [];
    for (let i = startPage; i <= endPage; i++) pageButtons.push(i);

    return (
        <>
            {loading && <div className="overlay"><span className="loader"></span></div>}

            <div className="container-scroller">
                <div className="row background_main_all">
                    <Header toggle={toggle} isopen={isopen} />
                    <div className="container-fluid page-body-wrapper">
                        <Sidebar isopen={isopen} active="EmployeeFeedbackMasterGrid" />
                        <div className="main-panel" style={{ width: isopen ? "" : "calc(100% - 120px)", marginLeft: isopen ? "" : "125px" }}>
                            <div className="content-wrapper ps-3 ps-md-0 pt-3">

                                {/* Header + Search */}
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
                                                        <button className="btn btn-outline-secondary ms-2" type="button"
                                                            onClick={() => { setSearchText(''); setSearch(''); }}>
                                                            <i className="fa fa-times"></i>
                                                        </button>
                                                    )}
                                                </form>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Statistics Cards */}
                                <div className="row px-2 py-3">
                                    <div className="col-12 col-md-3 mb-3">
                                        <div className="card shadow h-100 py-2" style={{ borderLeft: '4px solid #4e73df' }}>
                                            <div className="card-body">
                                                <div className="row no-gutters align-items-center">
                                                    <div className="col mr-2">
                                                        <div className="text-xs font-weight-bold text-primary text-uppercase mb-1">Total Feedback</div>
                                                        <div className="h5 mb-0 font-weight-bold text-gray-800">{stats.total}</div>
                                                    </div>
                                                    <div className="col-auto"><i className="fas fa-clipboard-list fa-2x text-gray-300"></i></div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="col-12 col-md-3 mb-3">
                                        <div className="card shadow h-100 py-2" style={{ borderLeft: '4px solid #f6c23e' }}>
                                            <div className="card-body">
                                                <div className="row no-gutters align-items-center">
                                                    <div className="col mr-2">
                                                        <div className="text-xs font-weight-bold text-warning text-uppercase mb-1">Pending</div>
                                                        <div className="h5 mb-0 font-weight-bold text-gray-800">{stats.pending}</div>
                                                    </div>
                                                    <div className="col-auto"><i className="fas fa-clock fa-2x text-gray-300"></i></div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="col-12 col-md-3 mb-3">
                                        <div className="card shadow h-100 py-2" style={{ borderLeft: '4px solid #1cc88a' }}>
                                            <div className="card-body">
                                                <div className="row no-gutters align-items-center">
                                                    <div className="col mr-2">
                                                        <div className="text-xs font-weight-bold text-success text-uppercase mb-1">High Ratings (4-5)</div>
                                                        <div className="h5 mb-0 font-weight-bold text-gray-800">{stats.highRating}</div>
                                                    </div>
                                                    <div className="col-auto"><i className="fas fa-star fa-2x text-gray-300"></i></div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="col-12 col-md-3 mb-3">
                                        <div className="card shadow h-100 py-2" style={{ borderLeft: '4px solid #36b9cc' }}>
                                            <div className="card-body">
                                                <div className="row no-gutters align-items-center">
                                                    <div className="col mr-2">
                                                        <div className="text-xs font-weight-bold text-info text-uppercase mb-1">Average Rating</div>
                                                        <div className="row no-gutters align-items-center">
                                                            <div className="col-auto">
                                                                <div className="h5 mb-0 mr-3 font-weight-bold text-gray-800">{stats.avgRating}</div>
                                                            </div>
                                                            <div className="col">
                                                                <div className="progress progress-sm mr-2">
                                                                    <div className="progress-bar bg-info" role="progressbar"
                                                                        style={{ width: `${stats.avgRating * 20}%` }}
                                                                        aria-valuenow={stats.avgRating * 20} aria-valuemin="0" aria-valuemax="100"></div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="col-auto"><i className="fas fa-chart-line fa-2x text-gray-300"></i></div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Top Performing Engineers */}
                                {topEngineers.length > 0 && (
                                    <div className="row px-2 py-3">
                                        <div className="col-12">
                                            <div className="card shadow">
                                                <div className="card-header py-2 d-flex flex-row align-items-center justify-content-between">
                                                    <h6 className="m-0 font-weight-bold text-primary">
                                                        <i className="fa fa-trophy me-2"></i>Top Performing Engineers
                                                    </h6>
                                                </div>
                                                <div className="card-body">
                                                    <div className="row">
                                                        {topEngineers.map((engineer, index) => (
                                                            <div key={engineer.name} className="col-md-6 col-lg-4 mb-3">
                                                                <div className="card shadow h-100 py-2" style={{ borderLeft: '4px solid #1cc88a' }}>
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
                                                    {paginatedFeedbacks.length > 0 ? (
                                                        paginatedFeedbacks.map((feedback, index) => {
                                                            const hasFeedback   = feedback.feedback && feedback.feedback.rating;
                                                            const hasHighRating = hasFeedback && feedback.feedback.rating >= 4;
                                                            const cardType      = getCardType(feedback);
                                                            const globalIndex   = (currentPage - 1) * ITEMS_PER_PAGE + index + 1;

                                                            return (
                                                                <tr className="border my-4" key={feedback._id}
                                                                    style={{
                                                                        backgroundColor: cardType.bgColor,
                                                                        borderLeft: `4px solid ${cardType.borderColor}`,
                                                                        color: cardType.textColor
                                                                    }}
                                                                >
                                                                    <td>{globalIndex}</td>
                                                                    <td className="align_left_td">{feedback.ticket?.client?.custName || 'N/A'}</td>
                                                                    <td className="align_left_td">{feedback.ticket?.contactPerson || 'N/A'}</td>
                                                                    <td className="align_left_td">{feedback.ticket?.contactNumber || 'N/A'}</td>
                                                                    <td className="align_left_td">{feedback.ticket?.product || 'N/A'}</td>
                                                                    <td>{formatDateTimeForDisplay(feedback.allotmentDate)}</td>
                                                                    <td>{formatDateTimeForDisplay(feedback.completionDate)}</td>
                                                                    <td>
                                                                        {feedback.allotTo?.map(person =>
                                                                            renderEngineerName(person, hasHighRating)
                                                                        ) || 'N/A'}
                                                                    </td>
                                                                    <td>{hasFeedback ? renderStars(feedback.feedback.rating) : '-'}</td>
                                                                    <td>
                                                                        <span className="badge" style={{ backgroundColor: cardType.borderColor, color: 'white' }}>
                                                                            {hasFeedback ? `Feedback Given (${cardType.type})` : 'Pending Feedback'}
                                                                        </span>
                                                                    </td>
                                                                    <td>
                                                                        <span onClick={() => handleUpdate(feedback)} className="update me-2"
                                                                            style={{ cursor: 'pointer' }}
                                                                            title={hasFeedback ? "View/Update Feedback" : "Add Feedback"}>
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
                                                                            search ? `No results found for "${search}"` :
                                                                                'No pending feedback found.'}
                                                            </td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>

                                {/* Pagination */}
                                {totalPages > 1 && (
                                    <div className="pagination-container text-center my-3">
                                        <button disabled={currentPage === 1} onClick={() => setCurrentPage(1)} className="btn btn-dark btn-sm me-2">First</button>
                                        <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="btn btn-dark btn-sm me-2">Previous</button>
                                        {startPage > 1 && <span className="mx-2">...</span>}
                                        {pageButtons.map(page => (
                                            <button key={page} onClick={() => setCurrentPage(page)}
                                                className={`btn btn-sm me-1 ${currentPage === page ? "btn-primary" : "btn-dark"}`}>
                                                {page}
                                            </button>
                                        ))}
                                        {endPage < totalPages && <span className="mx-2">...</span>}
                                        <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="btn btn-dark btn-sm me-2">Next</button>
                                        <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(totalPages)} className="btn btn-dark btn-sm">Last</button>
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
                    onSuccess={() => fetchAllData()}
                />
            )}
        </>
    );
};