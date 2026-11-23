import { useState, useEffect, useCallback, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import Select from "react-select";
import toast from "react-hot-toast";
import { getLiveLocations, getTrackedEngineers, getLocationHistory } from "../../../../../hooks/useLocation";

const REFRESH_SECONDS = 30;
const DEFAULT_CENTER = [18.5204, 73.8567]; // Pune
const DEFAULT_ZOOM = 11;

// ---------- helpers ----------

const minutesAgo = (date) => Math.floor((Date.now() - new Date(date).getTime()) / 60000);

const lastSeenText = (date) => {
  if (!date) return "—";
  const m = minutesAgo(date);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  return `${Math.floor(m / 60)} hr ${m % 60} min ago`;
};

// green = live (< 3 min), orange = < 15 min, grey = no signal
const statusColor = (date) => {
  if (!date) return "#9e9e9e";
  const m = minutesAgo(date);
  if (m < 3) return "#2e7d32";
  if (m < 15) return "#ef6c00";
  return "#9e9e9e";
};

const initials = (name = "") =>
  name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "E";

const formatTime = (date) =>
  date ? new Date(date).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "—";

const todayIST = () => new Date(Date.now() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10);

const engineerIcon = (name, color, highlight) =>
  L.divIcon({
    className: "",
    html: `<div style="background:${color};color:#fff;width:34px;height:34px;border-radius:50%;
      border:3px solid ${highlight ? "#1565c0" : "#fff"};box-shadow:0 1px 4px rgba(0,0,0,.4);display:flex;
      align-items:center;justify-content:center;font-weight:600;font-size:12px;">${initials(name)}</div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -18],
  });

const labelIcon = (color, label) =>
  L.divIcon({
    className: "",
    html: `<div style="background:${color};color:#fff;padding:2px 6px;border-radius:10px;border:2px solid #fff;
      box-shadow:0 1px 3px rgba(0,0,0,.4);font-size:11px;font-weight:600;white-space:nowrap;">${label}</div>`,
    iconSize: [50, 20],
    iconAnchor: [25, 10],
  });

// Fix map size inside a popup + move to a position
const MapController = ({ focus, points, fitKey }) => {
  const map = useMap();

  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 200);
    return () => clearTimeout(t);
  }, [map]);

  useEffect(() => {
    if (focus) map.flyTo(focus, 15, { duration: 0.8 });
  }, [focus, map]);

  useEffect(() => {
    if (!points || points.length === 0) return;
    if (points.length === 1) map.setView(points[0], 15);
    else map.fitBounds(points, { padding: [40, 40] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitKey, map]);

  return null;
};

const Tiles = () => (
  <TileLayer
    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
  />
);

/**
 * Engineer live location + route history popup (used in Service Master)
 * props:
 *  - closePopUp: () => void
 *  - focusEngineers: optional [{ _id, name }] → e.g. engineers assigned to one service
 */
const EngineerLocationPopUp = ({ closePopUp, focusEngineers = [] }) => {
  const focusIds = focusEngineers.map((e) => String(e._id));
  const focusKey = focusIds.join(",");
  const [tab, setTab] = useState("live");

  // live
  const [engineers, setEngineers] = useState([]);
  const [liveLoading, setLiveLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [focus, setFocus] = useState(null);
  const [fitKey, setFitKey] = useState(0);
  const firstLoad = useRef(true);

  // history
  const [engineerOptions, setEngineerOptions] = useState([]);
  const [selectedEngineer, setSelectedEngineer] = useState(
    focusEngineers[0] ? { value: focusEngineers[0]._id, label: focusEngineers[0].name } : null
  );
  const [historyDate, setHistoryDate] = useState(todayIST());
  const [history, setHistory] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyFitKey, setHistoryFitKey] = useState(0);

  // ----- live -----
  const loadLive = useCallback(async () => {
    const data = await getLiveLocations();
    setLiveLoading(false);
    if (!data?.success) {
      if (firstLoad.current) toast.error(data?.error || "Failed to load live locations");
      return;
    }
    const list = data.engineers || [];
    setEngineers(list);
    setLastUpdated(new Date());

    if (firstLoad.current) {
      firstLoad.current = false;
      const ids = focusKey ? focusKey.split(",") : [];
      const target = list.find((e) => ids.includes(String(e.employeeId)) && e.lat != null);
      if (target) setFocus([target.lat, target.lng]);
      else setFitKey((k) => k + 1);
    }
  }, [focusKey]);

  useEffect(() => {
    if (tab !== "live") return;
    loadLive();
    const timer = setInterval(() => {
      if (!document.hidden) loadLive();
    }, REFRESH_SECONDS * 1000);
    return () => clearInterval(timer);
  }, [tab, loadLive]);

  const withPosition = engineers.filter((e) => e.lat != null && e.lng != null);
  const focusNotOnDuty = focusEngineers.filter(
    (f) => !engineers.some((e) => String(e.employeeId) === String(f._id))
  );

  // ----- history -----
  useEffect(() => {
    if (tab !== "history" || engineerOptions.length > 0) return;
    (async () => {
      const data = await getTrackedEngineers();
      const opts = (data?.engineers || []).map((e) => ({ value: e._id, label: e.name }));
      focusEngineers.forEach((f) => {
        if (!opts.some((o) => String(o.value) === String(f._id))) opts.push({ value: f._id, label: f.name });
      });
      setEngineerOptions(opts);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const loadHistory = async () => {
    if (!selectedEngineer) return toast.error("Please select an engineer");
    setHistoryLoading(true);
    const data = await getLocationHistory(selectedEngineer.value, historyDate);
    setHistoryLoading(false);
    if (!data?.success) {
      setHistory(null);
      return toast.error(data?.error || "Failed to load route");
    }
    setHistory(data);
    setHistoryFitKey((k) => k + 1);
    if (!data.points?.length) toast("No location found for this day");
  };

  const routePoints = (history?.points || []).map((p) => [p.lat, p.lng]);
  const firstPoint = history?.points?.[0];
  const lastPoint = history?.points?.[history.points.length - 1];

  return (
    <div className="modal fade show" style={{ display: "flex", alignItems: "center", backgroundColor: "#00000090" }}>
      <div className="modal-dialog modal-xl" style={{ maxWidth: "95%", width: "1300px" }}>
        <div className="modal-content p-3">
          {/* header */}
          <div className="modal-header pt-0 align-items-center">
            <h5 className="card-title fw-bold mb-0">
              <i className="fa-solid fa-location-dot text-danger me-2"></i>
              Engineer Location
              {focusEngineers.length > 0 && (
                <span className="text-muted fw-normal ms-2" style={{ fontSize: "0.9rem" }}>
                  — {focusEngineers.map((f) => f.name).join(", ")}
                </span>
              )}
            </h5>
            <div className="ms-auto d-flex align-items-center gap-2">
              <button
                type="button"
                className={`btn btn-sm ${tab === "live" ? "btn-primary" : "btn-outline-primary"}`}
                onClick={() => setTab("live")}
              >
                <i className="fa-solid fa-location-crosshairs me-1"></i> Live
              </button>
              <button
                type="button"
                className={`btn btn-sm ${tab === "history" ? "btn-primary" : "btn-outline-primary"}`}
                onClick={() => setTab("history")}
              >
                <i className="fa-solid fa-route me-1"></i> Route History
              </button>
              <button onClick={closePopUp} type="button" className="close px-3">
                <span aria-hidden="true">&times;</span>
              </button>
            </div>
          </div>

          <div className="modal-body">
            {/* ===== LIVE ===== */}
            {tab === "live" && (
              <div className="row">
                <div className="col-12 col-lg-3" style={{ maxHeight: "65vh", overflowY: "auto" }}>
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <strong>On duty ({engineers.length})</strong>
                    <button type="button" className="btn btn-sm btn-outline-secondary" onClick={loadLive} title="Refresh">
                      <i className="fa-solid fa-rotate"></i>
                    </button>
                  </div>
                  <div className="small text-muted mb-2">
                    {liveLoading ? "Loading..." : `Auto refresh every ${REFRESH_SECONDS} sec`}
                    {lastUpdated && ` · ${formatTime(lastUpdated)}`}
                  </div>

                  {focusNotOnDuty.length > 0 && !liveLoading && (
                    <div className="alert alert-warning py-2 small">
                      <strong>{focusNotOnDuty.map((f) => f.name).join(", ")}</strong> not on duty now.
                      <button
                        type="button"
                        className="btn btn-link btn-sm p-0 ms-1 align-baseline"
                        onClick={() => setTab("history")}
                      >
                        See today's route
                      </button>
                    </div>
                  )}

                  {engineers.length === 0 && !liveLoading && (
                    <div className="text-muted small py-3">No service engineer is on duty right now.</div>
                  )}

                  {engineers.map((e) => {
                    const isFocus = focusIds.includes(String(e.employeeId));
                    return (
                      <div
                        key={e.employeeId}
                        className="border rounded p-2 mb-2"
                        style={{
                          cursor: e.lat != null ? "pointer" : "default",
                          borderColor: isFocus ? "#1565c0" : undefined,
                          background: isFocus ? "#e7f1fb" : undefined,
                        }}
                        onClick={() => e.lat != null && setFocus([e.lat, e.lng])}
                      >
                        <div className="d-flex align-items-center">
                          <span
                            className="me-2"
                            style={{
                              width: 10, height: 10, borderRadius: "50%",
                              background: statusColor(e.lastSeenAt), display: "inline-block",
                            }}
                          ></span>
                          <strong className="text-truncate">{e.name}</strong>
                        </div>
                        <div className="small text-muted mt-1">
                          <i className="fa-regular fa-clock me-1"></i>{lastSeenText(e.lastSeenAt)}
                          {e.battery != null && (
                            <span className="ms-2"><i className="fa-solid fa-battery-half me-1"></i>{e.battery}%</span>
                          )}
                        </div>
                        <div className="small text-muted">
                          Duty from {formatTime(e.dutyStartAt)}
                          {e.lat == null && " · waiting for GPS"}
                        </div>
                      </div>
                    );
                  })}

                  <div className="small text-muted mt-3">
                    <span style={{ color: "#2e7d32" }}>●</span> live &nbsp;
                    <span style={{ color: "#ef6c00" }}>●</span> &lt; 15 min &nbsp;
                    <span style={{ color: "#9e9e9e" }}>●</span> no signal
                  </div>
                </div>

                <div className="col-12 col-lg-9">
                  <MapContainer center={DEFAULT_CENTER} zoom={DEFAULT_ZOOM} style={{ height: "65vh", width: "100%", borderRadius: 6 }}>
                    <Tiles />
                    <MapController focus={focus} points={withPosition.map((e) => [e.lat, e.lng])} fitKey={fitKey} />
                    {withPosition.map((e) => (
                      <Marker
                        key={e.employeeId}
                        position={[e.lat, e.lng]}
                        icon={engineerIcon(e.name, statusColor(e.lastSeenAt), focusIds.includes(String(e.employeeId)))}
                      >
                        <Popup>
                          <strong>{e.name}</strong>
                          <br />Last seen: {lastSeenText(e.lastSeenAt)} ({formatTime(e.lastSeenAt)})
                          {e.battery != null && <><br />Battery: {e.battery}%</>}
                          {e.accuracy != null && <><br />GPS accuracy: {Math.round(e.accuracy)} m</>}
                          <br />
                          <a href={`https://www.google.com/maps?q=${e.lat},${e.lng}`} target="_blank" rel="noreferrer">
                            Open in Google Maps
                          </a>
                        </Popup>
                      </Marker>
                    ))}
                  </MapContainer>
                </div>
              </div>
            )}

            {/* ===== HISTORY ===== */}
            {tab === "history" && (
              <>
                <div className="row g-2 align-items-center mb-2">
                  <div className="col-12 col-md-4">
                    <Select
                      options={engineerOptions}
                      value={selectedEngineer}
                      onChange={setSelectedEngineer}
                      placeholder="Select engineer..."
                      noOptionsMessage={() => "No engineer has used tracking yet"}
                      styles={{ menu: (p) => ({ ...p, zIndex: 9999 }) }}
                    />
                  </div>
                  <div className="col-6 col-md-3">
                    <input
                      type="date"
                      className="form-control"
                      value={historyDate}
                      max={todayIST()}
                      onChange={(e) => setHistoryDate(e.target.value)}
                    />
                  </div>
                  <div className="col-6 col-md-2">
                    <button type="button" className="btn btn-primary w-100" onClick={loadHistory} disabled={historyLoading}>
                      {historyLoading ? "Loading..." : "Show Route"}
                    </button>
                  </div>
                </div>

                <div className="row">
                  <div className="col-12 col-lg-3">
                    {!history && <div className="text-muted small">Select an engineer and date, then click Show Route.</div>}
                    {history && (
                      <>
                        <h6 className="mb-1">{history.employee?.name}</h6>
                        <div className="small text-muted mb-3">{history.date}</div>
                        <div className="mb-2">
                          <div className="small text-muted">Total distance</div>
                          <div className="fs-5 fw-bold">{history.totalDistanceKm} km</div>
                        </div>
                        <div className="mb-3">
                          <div className="small text-muted">Location points</div>
                          <div className="fw-bold">{history.points?.length || 0}</div>
                        </div>
                        <div className="small text-muted mb-1">Duty</div>
                        {(history.duties || []).length === 0 && <div className="small">No duty this day</div>}
                        {(history.duties || []).map((d) => (
                          <div key={d._id} className="small border rounded p-2 mb-2">
                            <i className="fa-solid fa-play text-success me-1"></i> Start {formatTime(d.startAt)}
                            <br />
                            <i className="fa-solid fa-stop text-danger me-1"></i>
                            {d.endAt ? ` End ${formatTime(d.endAt)}` : " Still on duty"}
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                  <div className="col-12 col-lg-9">
                    <MapContainer center={DEFAULT_CENTER} zoom={DEFAULT_ZOOM} style={{ height: "60vh", width: "100%", borderRadius: 6 }}>
                      <Tiles />
                      <MapController points={routePoints} fitKey={historyFitKey} />
                      {routePoints.length > 1 && (
                        <Polyline positions={routePoints} pathOptions={{ color: "#1565c0", weight: 4 }} />
                      )}
                      {firstPoint && (
                        <Marker position={[firstPoint.lat, firstPoint.lng]} icon={labelIcon("#2e7d32", formatTime(firstPoint.recordedAt))}>
                          <Popup>Start: {formatTime(firstPoint.recordedAt)}</Popup>
                        </Marker>
                      )}
                      {lastPoint && routePoints.length > 1 && (
                        <Marker position={[lastPoint.lat, lastPoint.lng]} icon={labelIcon("#c62828", formatTime(lastPoint.recordedAt))}>
                          <Popup>Last: {formatTime(lastPoint.recordedAt)}</Popup>
                        </Marker>
                      )}
                    </MapContainer>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EngineerLocationPopUp;