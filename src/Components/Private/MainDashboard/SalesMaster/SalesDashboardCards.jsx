import React from 'react';
import { Pie } from 'react-chartjs-2';

const SalesDashboardCards = ({ 
  allLeadsCount, 
  ongogingCount,
  winCount, 
  pendingCount, 
  lostCount, 
  todayCount,
  hotleadsCount,
  warmLeadsCount,
  coldLeadsCount,
  invalidLeadsCount,
  onTodayFollowUpClick
}) => {
  const chartData = {
    labels: ['Hot Leads', 'Warm Leads', 'Cold Leads', 'Invalid Leads'],
    datasets: [
      {
        data: [
          hotleadsCount || 0,
          warmLeadsCount || 0,
          coldLeadsCount || 0,
          invalidLeadsCount || 0
        ],
        backgroundColor: [
          '#FF6B6B', // Hot Leads
          '#4ECDC4', // Warm Leads
          '#95E1D3', // Cold Leads
          '#F38181', // Invalid Leads
        ],
        borderColor: [
          '#FFFFFF',
          '#FFFFFF',
          '#FFFFFF',
          '#FFFFFF'
        ],
        borderWidth: 2,
      },
    ],
  };

  const totalLeads = chartData.datasets[0].data.reduce((sum, value) => sum + value, 0);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    legend: {
      position: 'bottom',
      labels: {
        fontColor: '#333',
        fontSize: 11,
        padding: 15,
        boxWidth: 15
      }
    },
    tooltips: {
      callbacks: {
        label: function(tooltipItem, data) {
          const dataset = data.datasets[tooltipItem.datasetIndex];
          const value = dataset.data[tooltipItem.index];
          const label = data.labels[tooltipItem.index];
          const percentage = totalLeads > 0 ? ((value / totalLeads) * 100).toFixed(1) : 0;
          return `${label}: ${value} (${percentage}%)`;
        }
      }
    }
  };

  return (
    <div className="row bg-white p-2 m-1 border rounded">
      <div className="col-12 py-1">
        <div className="row pt-3">
          
          {/* All Enquiries Card */}
          <div className="col-12 col-md-3 pb-3 cursor-pointer">
            <div className="p-4 background_style bg_sky">
              <div className="row">
                <div className="col-9">
                  <h6 className="text-dark card_heading">
                    All Enquiries
                  </h6>
                  <h2 className="pt-2 fw-bold card_count demo_bottom">
                    {allLeadsCount || 0}
                  </h2>
                </div>
                <div className="col-3 d-flex align-items-center justify-content-center">
                  <img 
                    src="./static/assets/img/planning.png" 
                    className="img_opacity all_card_img_size" 
                    alt="All Enquiries" 
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Ongoing Card */}
          <div className="col-12 col-md-3 pb-3 cursor-pointer">
            <div className="p-4 background_style" style={{backgroundColor:"#F8EFDE"}}>
              <div className="row">
                <div className="col-9">
                  <h6 className="text-dark card_heading">
                    Ongoing
                  </h6>
                  <h2 className="pt-2 fw-bold card_count">
                    {ongogingCount || 0}
                  </h2>
                </div>
                <div className="col-3 d-flex align-items-center justify-content-center">
                  <img 
                    src="./static/assets/img/process.png" 
                    className="img_opacity all_card_img_size" 
                    alt="Ongoing" 
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Won Card */}
          <div className="col-12 col-md-3 pb-3 cursor-pointer">
            <div className="p-4 background_style" style={{backgroundColor:"#E5F5E5"}}>
              <div className="row">
                <div className="col-9">
                  <h6 className="text-dark card_heading">
                    Won
                  </h6>
                  <h2 className="pt-2 fw-bold card_count">
                    {winCount || 0}
                  </h2>
                </div>
                <div className="col-3 d-flex align-items-center justify-content-center">
                  <img 
                    src="./static/assets/img/winner.png" 
                    className="img_opacity all_card_img_size" 
                    alt="Won" 
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Lost Card */}
          <div className="col-12 col-md-3 pb-3 cursor-pointer">
            <div className="p-4 background_style" style={{backgroundColor:"#E0E0E0"}}>
              <div className="row">
                <div className="col-9">
                  <h6 className="text-dark card_heading">
                    Lost
                  </h6>
                  <h2 className="pt-2 fw-bold card_count">
                    {lostCount || 0}
                  </h2>
                </div>
                <div className="col-3 d-flex align-items-center justify-content-center">
                  <img 
                    src="./static/assets/img/lost.png" 
                    className="img_opacity all_card_img_size" 
                    alt="Lost" 
                  />
                </div>
              </div>
            </div>
          </div>
        
          {/* Pending FollowUp Card */}
          <div className="col-12 col-md-3 pb-3 cursor-pointer">
            <div className="p-4 background_style" style={{backgroundColor: '#f8d7da'}}>
              <div className="row">
                <div className="col-9">
                  <h6 className="text-dark card_heading">
                    Pending Enquiries
                  </h6>
                  <h2 className="pt-2 fw-bold card_count">
                    {pendingCount || 0}
                  </h2>
                </div>
                <div className="col-3 d-flex align-items-center justify-content-center">
                  <img 
                    src="./static/assets/img/pending.png" 
                    className="img_opacity all_card_img_size" 
                    alt="Pending" 
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="col-12 col-md-3 pb-3 cursor-pointer" onClick={onTodayFollowUpClick}>
            <div className="p-4 background_style" style={{backgroundColor:"#FAFAD2"}}>
              <div className="row">
                <div className="col-9">
                  <h6 className="text-dark card_heading">
                    Today's Follow-Ups
                  </h6>
                  <h2 className="pt-2 fw-bold card_count">
                    {todayCount || 0}
                  </h2>
                </div>
                <div className="col-3 d-flex align-items-center justify-content-center">
                  <img 
                    src="./static/assets/img/only-today.png" 
                    className="img_opacity all_card_img_size" 
                    alt="Today's FollowUp" 
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="col-12 col-md-3 pb-3">
            <div className="p-2 background_style" style={{backgroundColor:"#F8F9FA"}}>
              <div className="row">
                <div className="col-12">
                  <div style={{ height: '250px', position: 'relative' }}>
                    <Pie data={chartData} options={options} />
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default SalesDashboardCards;