const ServiceDashboardCards = ({
  totalServiceCount,
  completeServiceCount,
  inprogressServiceCount,
  pendingServiceCount,
  stuckServiceCount,
  onCardClick,          // NEW: (statusValue) => void
  activeStatusFilter,   // NEW: currently active status string
}) => {
  const cards = [
    {
      label: "Total Services",
      count: totalServiceCount,
      statusValue: "",          // clears filter
      bg: "#E3F0FF",
      img: "./static/assets/img/planning.png",
    },
    {
      label: "Completed Services",
      count: completeServiceCount,
      statusValue: "Completed",
      bg: "#E5F5E5",
      img: "./static/assets/img/checked.png",
    },
    {
      label: "Inprogress Services",
      count: inprogressServiceCount,
      statusValue: "Inprogress",
      bg: "#FFE4EE",
      img: "./static/assets/img/Inprocess.png",
    },
    {
      label: "Stuck Services",
      count: stuckServiceCount,
      statusValue: "Stuck",
      bg: "#FEA2A2",
      img: "./static/assets/img/stuck.png",
    },
    {
      label: "Pending Services",
      count: pendingServiceCount,
      statusValue: "Pending",
      bg: "#f8d7da",
      img: "./static/assets/img/pending.png",
    },
  ];

  return (
    <div className="row bg-white p-2 m-1 border rounded">
      <div className="col-12 py-1">
        <div className="row pt-3">
          {cards.map((card) => {
            const isActive =
              activeStatusFilter === card.statusValue ||
              (card.statusValue === "" && !activeStatusFilter);
            return (
              <div
                key={card.label}
                className="col-12 col-md-3 pb-3"
                style={{ cursor: onCardClick ? "pointer" : "default" }}
                onClick={() => onCardClick && onCardClick(card.statusValue)}
              >
                <div
                  className="p-4 background_style"
                  style={{
                    backgroundColor: card.bg,
                    border: isActive ? "2px solid #1d4ed8" : "2px solid transparent",
                    borderRadius: "10px",
                    transition: "border 0.2s, box-shadow 0.2s",
                    boxShadow: isActive
                      ? "0 4px 16px rgba(29,78,216,0.18)"
                      : "none",
                  }}
                >
                  <div className="row">
                    <div className="col-9">
                      <h6 className="text-dark card_heading">{card.label}</h6>
                      <h2 className="pt-2 fw-bold card_count demo_bottom">
                        {card.count}
                      </h2>
                      {onCardClick && (
                        <div
                          style={{
                            fontSize: "0.7rem",
                            color: "#6b7280",
                            marginTop: "4px",
                          }}
                        >
                          {isActive ? "✔ Active filter" : "Click to filter"}
                        </div>
                      )}
                    </div>
                    <div className="col-3 d-flex align-items-center justify-content-center">
                      <img
                        src={card.img}
                        className="img_opacity all_card_img_size"
                        alt={card.label}
                      />
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

export default ServiceDashboardCards;