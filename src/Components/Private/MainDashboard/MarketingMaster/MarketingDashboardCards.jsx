import React from 'react';
import { useNavigate } from 'react-router-dom';

const MarketingDashboardCards = ({ allLeads, feasibleLeads, notFeasibleLeads, callUnansweredLeads, pendingLeads }) => {
  const navigate = useNavigate();

  const cards = [
    {
      title: 'All Leads',
      count: allLeads || 0,
      bgColor: '#DDEEFF',
      countColor: '#1565C0',
      img: './static/assets/img/planning.png',
      clickable: false,
    },
    {
      title: 'Pending',
      count: pendingLeads || 0,
      bgColor: '#E8F4FD',
      countColor: '#0277BD',
      icon: 'fa-clock-rotate-left',
      iconColor: '#0277BD',
      clickable: false,
    },
    {
      // ✅ NOW CLICKABLE — navigates to FeasibleLeadsPage
      title: 'Feasible',
      count: feasibleLeads || 0,
      bgColor: '#F8EFDE',
      countColor: '#E65100',
      img: './static/assets/img/process.png',
      clickable: true,
      path: '/feasible-leads',
      subText: 'Click to view details',
    },
    {
      title: 'Not Feasible',
      count: notFeasibleLeads || 0,
      bgColor: '#F6C6CA',
      countColor: '#B71C1C',
      img: './static/assets/img/stuck.png',
      clickable: true,
      path: '/not-feasible-leads',
      subText: 'Click to view details',
    },
    {
      title: 'Call Unanswered',
      count: callUnansweredLeads || 0,
      bgColor: '#FFE5B4',
      countColor: '#E65100',
      img: './static/assets/img/callnotreceived.png',
      clickable: true,
      path: '/call-unanswered-leads',
      subText: 'Click to view details',
    },
  ];

  return (
    <div className="row bg-white p-2 m-1 border rounded">
      <div className="col-12 py-1">
        <div className="row pt-3">
          {cards.map((card, idx) => (
            <div
              key={idx}
              className="col-12 col-sm-6 col-md pb-3"
              onClick={card.clickable ? () => navigate(card.path) : undefined}
              style={{ cursor: card.clickable ? 'pointer' : 'default', minWidth: 0 }}
            >
              <div
                className="p-3 h-100"
                style={{
                  backgroundColor: card.bgColor,
                  borderRadius: '12px',
                  minHeight: '140px',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
                  transition: card.clickable ? 'transform 0.15s, box-shadow 0.15s' : undefined,
                }}
                onMouseEnter={card.clickable ? (e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.12)';
                } : undefined}
                onMouseLeave={card.clickable ? (e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.06)';
                } : undefined}
              >
                <div className="d-flex justify-content-between align-items-center h-100">
                  <div style={{ minWidth: 0 }}>
                    <h6
                      className="text-dark mb-1"
                      style={{
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {card.title}
                    </h6>
                    <h2
                      className="fw-bold mb-0"
                      style={{ fontSize: '2rem', color: card.countColor, lineHeight: 1.1 }}
                    >
                      {card.count}
                    </h2>
                    {card.subText && (
                      <p className="text-muted mb-0 mt-1" style={{ fontSize: '0.7rem' }}>
                        {card.subText}
                      </p>
                    )}
                  </div>
                  <div className="ms-2 flex-shrink-0">
                    {card.img ? (
                      <img
                        src={card.img}
                        alt={card.title}
                        style={{ width: '48px', height: '48px', objectFit: 'contain', opacity: 0.75 }}
                      />
                    ) : (
                      <i
                        className={`fa-solid ${card.icon}`}
                        style={{ fontSize: '2.2rem', color: card.iconColor, opacity: 0.5 }}
                      ></i>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MarketingDashboardCards;