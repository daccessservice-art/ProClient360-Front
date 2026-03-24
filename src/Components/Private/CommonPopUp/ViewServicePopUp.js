import { useEffect, useState } from "react";
import { formatDate, formatDateTimeForDisplay } from "../../../utils/formatDate";
import { getAllServiceActions } from "../../../hooks/useServiceAction";
import toast from "react-hot-toast";

const ViewServicePopUp = ({ closePopUp, selectedService }) => {
  const [service, setService] = useState(selectedService);
  const [previousActions, setPreviousActions] = useState([]);
  const [currentCompletionLevel, setCurrentCompletionLevel] = useState(0);

  // Extract completion percentage from action text if not in complateLevel field
  const extractCompletionFromAction = (action) => {
    if (action.complateLevel !== undefined && action.complateLevel !== null && action.complateLevel !== '' && action.complateLevel !== 0) {
      const level = parseInt(action.complateLevel);
      return (level >= 0 && level <= 100) ? level : 0;
    }
    
    const actionText = (action.action || '').toLowerCase().trim();
    if (!actionText) return 0;
    
    const percentPatterns = [
      /(\d+)\s*percent/gi,
      /(\d+)\s*%/gi,
      /(\d+)\s*per\s*cent/gi
    ];
    
    for (const pattern of percentPatterns) {
      const matches = actionText.match(pattern);
      if (matches) {
        const numbers = matches.map(match => {
          const num = parseInt(match.match(/\d+/)[0]);
          return (num >= 0 && num <= 100) ? num : 0;
        }).filter(num => num > 0);
        if (numbers.length > 0) return Math.max(...numbers);
      }
    }
    
    const completionKeywords = ['completed', 'complete', 'done', 'finished', 'progress'];
    const hasCompletionKeyword = completionKeywords.some(keyword => actionText.includes(keyword));
    
    if (hasCompletionKeyword) {
      const numberMatch = actionText.match(/(\d+)/);
      if (numberMatch) {
        const num = parseInt(numberMatch[1]);
        if (num >= 0 && num <= 100) return num;
      }
      if (actionText.match(/^(work\s+)?(completed|complete|done|finished)$/)) return 100;
    }
    
    const justNumberMatch = actionText.match(/^\d+$/);
    if (justNumberMatch) {
      const num = parseInt(actionText);
      if (num >= 0 && num <= 100) return num;
    }
    
    const fractionMatch = actionText.match(/(\d+)\s*\/\s*(\d+)/);
    if (fractionMatch) {
      const numerator = parseInt(fractionMatch[1]);
      const denominator = parseInt(fractionMatch[2]);
      if (denominator > 0) {
        const percentage = Math.round((numerator / denominator) * 100);
        return (percentage >= 0 && percentage <= 100) ? percentage : 0;
      }
    }
    
    const wordToPercent = {
      'half': 50,
      'quarter': 25,
      'three quarter': 75,
      'three-quarter': 75,
      'full': 100,
      'complete': 100
    };
    
    for (const [word, percent] of Object.entries(wordToPercent)) {
      if (actionText.includes(word)) return percent;
    }
    
    const advancedPatterns = [
      /work\s+(\d+)/i,
      /(\d+)\s+work/i,
      /progress\s+(\d+)/i,
      /(\d+)\s+progress/i,
      /level\s+(\d+)/i,
      /(\d+)\s+level/i
    ];
    
    for (const pattern of advancedPatterns) {
      const match = actionText.match(pattern);
      if (match) {
        const num = parseInt(match[1]);
        if (num >= 0 && num <= 100) return num;
      }
    }
    
    return 0;
  };

  // Calculate current completion level from service and previous actions
  const calculateCurrentCompletion = () => {
    let latestCompletion = parseInt(service.complateLevel) || 0;
    if (previousActions && previousActions.length > 0) {
      const completionLevels = previousActions.map(action => extractCompletionFromAction(action));
      const maxCompletion = Math.max(latestCompletion, ...completionLevels);
      latestCompletion = maxCompletion;
    }
    setCurrentCompletionLevel(latestCompletion);
  };

  useEffect(() => {
    const FetchPreviousActions = async () => {
      try {
        toast.loading("Loading Previous Actions...");
        const data = await getAllServiceActions(selectedService._id);
        if (data.success) {
          toast.dismiss();
          setPreviousActions(data.serviceActions);
        } else {
          toast.dismiss();
          setPreviousActions([]);
          toast(data.error);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.dismiss();
      }
    };
    FetchPreviousActions();
  }, [selectedService._id]);

  useEffect(() => {
    calculateCurrentCompletion();
  }, [service, previousActions]);

  return (
    <>
      <div
        className="modal fade show"
        style={{
          display: "flex",
          alignItems: "center",
          backgroundColor: "#00000090",
        }}
      >
        <div className="modal-dialog modal_widthhh_details modal-xl">
          <div className="modal-content p-3">
            <div className="modal-header pt-0">
              <h5 className="card-title fw-bold" id="exampleModalLongTitle">
                Service Details
              </h5>
              <button
                onClick={() => closePopUp()}
                type="button"
                className="close px-3"
                style={{ marginLeft: "auto" }}
              >
                <span aria-hidden="true">&times;</span>
              </button>
            </div>
            <div className="modal-body">
              <div className="row modal_body_height_details">
                <div className="row">
                  <div className="col-sm- col-md col-lg">
                    <h6>
                      <p className="fw-bold">Complaint:</p>
                      {service?.ticket?.details || "-"}
                    </h6>
                    <h6>
                      <p className="fw-bold mt-3">Client:</p>
                      {service?.ticket?.client?.custName}
                    </h6>
                    <h6>
                      <p className="fw-bold mt-3">Product:</p>
                      {service.ticket.product}
                    </h6>
                    <h6>
                      <p className="fw-bold mt-3">Service Type:</p>
                      {service.serviceType}
                    </h6>
                    {service.completionDate && (
                      <h6>
                        <p className="fw-bold mt-3">Completion Date:</p>
                        {formatDateTimeForDisplay(service.completionDate)}
                      </h6>
                    )}
                  </div>
                  <div className="col-sm- col-md col-lg">
                    <p className="fw-bold"> Allotment Date: </p>
                    {formatDateTimeForDisplay(service.allotmentDate)}
                    <p className="fw-bold mt-3"> Allocated to: </p>
                    {service.allotTo.map((item) => item.name).join(', ')}
                    <p className="fw-bold mt-3"> Status: </p>
                    {service.status}
                    <p className="fw-bold mt-3"> Priority: </p>
                    {service.priority}
                    <p className="fw-bold mt-3"> Work Mode: </p>
                    {service.workMode}
                    <p className="fw-bold mt-3"> Created At: </p>
                    {formatDateTimeForDisplay(service.ticket.date)}
                    <p className="fw-bold mt-3">Work Complete(%): </p>
                    <span className="badge bg-primary">{currentCompletionLevel}%</span>
                  </div>

                  {service.status === "Stuck" ? (
                    <div className="col-12">
                      <h5>
                        This Service is Stuck due to:{" "}
                        <span className="text-danger text-xl-center">{service.stuckReason}</span>
                      </h5>
                    </div>
                  ) : ""}
                </div>
              </div>

              {previousActions ? (
                <>
                  <h6 className="mt-2"> Past Actions</h6>
                  <div
                    className="table-responsive"
                    style={{
                      maxHeight: '170px',
                      overflowY: 'auto',
                      border: '1px solid #dee2e6',
                      borderRadius: '0.375rem'
                    }}
                  >
                    <table className="table table-bordered mb-0">
                      <thead className="thead-light sticky-top" style={{ backgroundColor: '#f8f9fa' }}>
                        <tr>
                          <th scope="col">Sr. No</th>
                          <th scope="col" className="text-start">Action</th>
                          <th scope="col">Action By</th>
                          <th scope="col">Start Date</th>
                          <th scope="col">End Date</th>
                          <th scope="col">Progress</th>
                        </tr>
                      </thead>
                      <tbody>
                        {previousActions.map((action, index) => {
                          const completionPercent = extractCompletionFromAction(action);
                          return (
                            <tr key={action._id}>
                              <td>{index + 1}</td>
                              <td
                                className="text-start text-wrap w-100"
                                style={{ maxWidth: "22rem" }}
                              >
                                {action?.action}
                              </td>
                              <td>{action?.actionBy?.name}</td>
                              <td>{formatDateTimeForDisplay(action?.startTime)}</td>
                              <td>{formatDateTimeForDisplay(action?.endTime)}</td>
                              <td>
                                <div className="d-flex flex-column align-items-center">
                                  {completionPercent > 0 ? (
                                    <span className={`badge mb-1 ${
                                      completionPercent >= 100 ? 'bg-success' :
                                      completionPercent >= 75 ? 'bg-primary' :
                                      completionPercent >= 50 ? 'bg-warning' :
                                      completionPercent > 0 ? 'bg-info' : 'bg-secondary'
                                    }`}>
                                      {completionPercent}%
                                    </span>
                                  ) : (
                                    <span className="text-muted">-</span>
                                  )}
                                  {completionPercent > 0 && (
                                    <div className="progress" style={{ width: '60px', height: '4px' }}>
                                      <div
                                        className={`progress-bar ${
                                          completionPercent >= 100 ? 'bg-success' :
                                          completionPercent >= 75 ? 'bg-primary' :
                                          completionPercent >= 50 ? 'bg-warning' : 'bg-info'
                                        }`}
                                        role="progressbar"
                                        style={{ width: `${completionPercent}%` }}
                                      ></div>
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <div className="alert alert-warning mt-2" role="alert">
                  No Actions Available
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ViewServicePopUp;