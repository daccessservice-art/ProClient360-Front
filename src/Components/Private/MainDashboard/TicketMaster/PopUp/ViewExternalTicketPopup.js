import { useState, useEffect } from "react";
import { getExternalTicket } from "../../../../../hooks/useTicket";

const toLabel = (key) =>
  key
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^./, (c) => c.toUpperCase());

const toText = (value) => {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value);
};

const isObj = (v) => v && typeof v === "object" && !Array.isArray(v);

const FieldTable = ({ obj }) => (
  <table className="table table-bordered table-sm">
    <tbody>
      {Object.entries(obj).map(([key, value]) => (
        <tr key={key}>
          <th style={{ width: "35%", background: "#f8f9fa" }}>{toLabel(key)}</th>
          <td style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
            {toText(value)}
          </td>
        </tr>
      ))}
    </tbody>
  </table>
);

const ViewExternalTicketPopup = ({ uniqueTicketId, handleClose }) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const res = await getExternalTicket(uniqueTicketId);
      if (res?.success) setData(res.data);
      else setError(res?.error || "Failed to load details");
      setLoading(false);
    };
    load();
  }, [uniqueTicketId]);

  const simple = {};
  const nested = {};
  if (data) {
    Object.entries(data).forEach(([k, v]) => {
      if (isObj(v)) nested[k] = v;
      else simple[k] = v;
    });
  }

  return (
    <div
      className="modal fade show"
      style={{ display: "flex", alignItems: "center", backgroundColor: "#00000090" }}
    >
      <div className="modal-dialog modal-lg">
        <div className="modal-content p-3">
          <div className="modal-header pt-0">
            <h5 className="card-title fw-bold">
              External Ticket Details ({uniqueTicketId})
            </h5>
            <button
              onClick={handleClose}
              type="button"
              className="close px-3"
              style={{ marginLeft: "auto", border: "none", background: "none" }}
            >
              <span aria-hidden="true">&times;</span>
            </button>
          </div>

          <div className="modal-body" style={{ maxHeight: "70vh", overflowY: "auto" }}>
            {loading && <p>Loading...</p>}
            {!loading && error && <p className="text-danger">{error}</p>}
            {!loading && data && (
              <>
                {Object.keys(simple).length > 0 && <FieldTable obj={simple} />}
                {Object.entries(nested).map(([key, obj]) => (
                  <div key={key} className="mt-3">
                    <h6 className="fw-bold">{toLabel(key)} Details</h6>
                    <FieldTable obj={obj} />
                  </div>
                ))}
              </>
            )}
          </div>

          <div className="modal-footer">
            <button
              type="button"
              onClick={handleClose}
              className="btn addbtn rounded-0 Cancel_button px-4"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewExternalTicketPopup;