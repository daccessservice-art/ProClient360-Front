const MarketingDashboardCards = ({allLeads, feasibleLeads, notFeasibleLeads, callUnansweredLeads }) => {
  return (
    <div className="row bg-white p-2 m-1 border rounded">
      <div className="col-12 py-1">
        <div className="row pt-3">
          
           <div className="col-12 col-md-3 pb-3 cursor-pointer">
            <div className="p-4 background_style bg_sky">
              <div className="row">
                <div className="col-9">
                  <h6 className="text-dark card_heading">
                    All Lead
                  </h6>
                  <h2 className="pt-2 fw-bold card_count demo_bottom">
                    {allLeads}
                  </h2>
                </div>
                <div className="col-3 d-flex align-items-center justify-content-center">
                  <img src="./static/assets/img/planning.png" className="img_opacity all_card_img_size" alt="img not found" />
                </div>
              </div>
            </div>
          </div>

          
          <div className="col-12 col-md-3 pb-3 cursor-pointer">
            <div className="p-4 background_style" style={{backgroundColor:"#F8EFDE"}}>
              <div className="row">
                <div className="col-9">
                  <h6 className="text-dark card_heading">
                    Feasible
                  </h6> 
                  <h2 className="pt-2 fw-bold card_count">
                    {feasibleLeads}
                  </h2>
                </div>
                <div className="col-3 d-flex align-items-center justify-content-center">
                  <img src="./static/assets/img/process.png" className="img_opacity all_card_img_size" alt="" />
                </div>
              </div>
            </div>
          </div>

           
          <div className="col-12 col-md-3 pb-3 cursor-pointer">
            <div className="p-4 background_style"   style={{backgroundColor:"#F6C6CA"}}>
              <div className="row">
                <div className="col-9">
                  <h6 className="text-dark card_heading">
                    Not Feasible
                  </h6>
                  <h2 className="pt-2 fw-bold card_count">
                    {notFeasibleLeads}
                  </h2>
                </div>
                <div className="col-3 d-flex align-items-center justify-content-center">
                  <img src="./static/assets/img/stuck.png" className="img_opacity all_card_img_size" alt="" />
                </div>
              </div>
            </div>
          </div>

          <div className="col-12 col-md-3 pb-3 cursor-pointer">
            <div className="p-4 background_style" style={{backgroundColor:"#d2c866"}}>
              <div className="row">
                <div className="col-9">
                  <h6 className="text-dark card_heading">
                    Call Unanswered
                  </h6> 
                  <h2 className="pt-2 fw-bold card_count">
                     {callUnansweredLeads}
                  </h2>
                </div>
                <div className="col-3 d-flex align-items-center justify-content-center">
                  <img src="./static/assets/img/callnotreceived.png" className="img_opacity all_card_img_size" alt="" />
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

