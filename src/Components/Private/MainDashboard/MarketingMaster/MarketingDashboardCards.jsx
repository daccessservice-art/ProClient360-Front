import React from 'react';
import { useNavigate } from 'react-router-dom';

const MarketingDashboardCards = ({ allLeads, feasibleLeads, notFeasibleLeads, callUnansweredLeads }) => {
  const navigate = useNavigate();

  const handleCardClick = (path) => {
    navigate(path);
  };

  return (
    <div className="row bg-white p-2 m-1 border rounded">
      <div className="col-12 py-1">
        <div className="row pt-3">
          
          <div className="col-12 col-md-3 pb-3">
            <div className="p-4 background_style bg_sky">
              <div className="row">
                <div className="col-9">
                  <h6 className="text-dark card_heading">
                    All Leads
                  </h6>
                  <h2 className="pt-2 fw-bold card_count demo_bottom">
                    {allLeads || 0}
                  </h2>
                </div>
                <div className="col-3 d-flex align-items-center justify-content-center">
                  <img src="./static/assets/img/planning.png" className="img_opacity all_card_img_size" alt="All Leads" />
                </div>
              </div>
            </div>
          </div>

          <div className="col-12 col-md-3 pb-3">
            <div className="p-4 background_style" style={{backgroundColor:"#F8EFDE"}}>
              <div className="row">
                <div className="col-9">
                  <h6 className="text-dark card_heading">
                    Feasible
                  </h6> 
                  <h2 className="pt-2 fw-bold card_count">
                    {feasibleLeads || 0}
                  </h2>
                </div>
                <div className="col-3 d-flex align-items-center justify-content-center">
                  <img src="./static/assets/img/process.png" className="img_opacity all_card_img_size" alt="Feasible" />
                </div>
              </div>
            </div>
          </div>

          {/* Updated Not Feasible Card with click handler */}
          <div 
            className="col-12 col-md-3 pb-3 cursor-pointer" 
            onClick={() => handleCardClick('/not-feasible-leads')}
            style={{ cursor: 'pointer' }}
          >
            <div className="p-4 background_style" style={{backgroundColor:"#F6C6CA"}}>
              <div className="row">
                <div className="col-9">
                  <h6 className="text-dark card_heading">
                    Not Feasible
                  </h6>
                  <h2 className="pt-2 fw-bold card_count">
                    {notFeasibleLeads || 0}
                  </h2>
                  <p className="text-muted small mb-0">Click to view details</p>
                </div>
                <div className="col-3 d-flex align-items-center justify-content-center">
                  <img src="./static/assets/img/stuck.png" className="img_opacity all_card_img_size" alt="Not Feasible" />
                </div>
              </div>
            </div>
          </div>

          <div 
            className="col-12 col-md-3 pb-3 cursor-pointer" 
            onClick={() => handleCardClick('/call-unanswered-leads')}
            style={{ cursor: 'pointer' }}
          >
            <div className="p-4 background_style" style={{backgroundColor:"#FFE5B4"}}>
              <div className="row">
                <div className="col-9">
                  <h6 className="text-dark card_heading">
                    Call Unanswered
                  </h6> 
                  <h2 className="pt-2 fw-bold card_count">
                    {callUnansweredLeads || 0}
                  </h2>
                  <p className="text-muted small mb-0">Click to view details</p>
                </div>
                <div className="col-3 d-flex align-items-center justify-content-center">
                  <img src="./static/assets/img/callnotreceived.png" className="img_opacity all_card_img_size" alt="Call Unanswered" />
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default MarketingDashboardCards;