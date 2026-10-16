import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { getExternalTicket, updateExternalTicket } from "../../../../../hooks/useTicket";

const STATUSES = ["Open", "In Progress", "Closed"];
const PRIORITIES = ["Low", "Medium", "High"];

const UpdateSmartGateTicketPopUp = ({ uniqueTicketId, handleClose }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState(null);
  const [original, setOriginal] = useState(null);
  const [ticketNo, setTicketNo] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const res = await getExternalTicket(uniqueTicketId);
      if (res?.success) {
        const d = res.data?.ticket || res.data || {};
        const f = {
          Ticket_Status: d.Ticket_Status || "",
          Ticket_Priority: d.Ticket_Priority || "",
          Ticket_Category: d.Ticket_Category || "",
          Ticket_Details: d.Ticket_Details || "",
          Assignee_ID: d.Assignee_ID || "",
          Assignee_Name: d.Assignee_Name || "",
          Assignee_Email: d.Assignee_Email || "",
          Comment: d.Comment || "",
        };
        setForm(f);
        setOriginal(f);
        setTicketNo(d.Ticket_No || "");
      } else {
        setError(res?.error || "Failed to load ticket");
      }
      setLoading(false);
    };
    load();
  }, [uniqueTicketId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // send only what changed
    const changes = {};
    Object.keys(form).forEach((k) => {
      if (form[k] !== original[k]) changes[k] = form[k] === "" ? null : form[k];
    });
    if (!Object.keys(changes).length) {
      toast("Nothing changed.");
      return;
    }
    setSaving(true);
    const res = await updateExternalTicket(uniqueTicketId, changes);
    setSaving(false);
    if (res?.success) {
      toast.success("SmartGate ticket updated.");
      handleClose(true);
    } else {
      toast.error(res?.error || "Failed to update ticket.");
    }
  };

  const select = (name, options) => (
    <select name={name} value={form[name]} onChange={handleChange} className="form-select">
      {!form[name] && <option value="">Select</option>}
      {form[name] && !options.includes(form[name]) && (
        <option value={form[name]}>{form[name]}</option>
      )}
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );

  return (
    <div
      className="modal fade show"
      style={{ display: "flex", alignItems: "center", backgroundColor: "#00000090" }}
    >
      <div className="modal-dialog modal-lg">
        <div className="modal-content p-3">
          <div className="modal-header pt-0">
            <h5 className="card-title fw-bold">
              Update SmartGate Ticket ({ticketNo || uniqueTicketId})
            </h5>
            <button
              onClick={() => handleClose(false)}
              type="button"
              className="close px-3"
              style={{ marginLeft: "auto", border: "none", background: "none" }}
            >
              <span aria-hidden="true">&times;</span>
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="modal-body" style={{ maxHeight: "70vh", overflowY: "auto" }}>
              {loading && <p>Loading...</p>}
              {!loading && error && <p className="text-danger">{error}</p>}
              {!loading && form && (
                <div className="row g-3">
                  <div className="col-md-4">
                    <label className="form-label">Status</label>
                    {select("Ticket_Status", STATUSES)}
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Priority</label>
                    {select("Ticket_Priority", PRIORITIES)}
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Category</label>
                    <input name="Ticket_Category" value={form.Ticket_Category} onChange={handleChange} className="form-control" />
                  </div>
                  <div className="col-12">
                    <label className="form-label">Details</label>
                    <textarea name="Ticket_Details" rows="3" value={form.Ticket_Details} onChange={handleChange} className="form-control" />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Assignee ID</label>
                    <input name="Assignee_ID" value={form.Assignee_ID} onChange={handleChange} className="form-control" />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Assignee Name</label>
                    <input name="Assignee_Name" value={form.Assignee_Name} onChange={handleChange} className="form-control" />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Assignee Email</label>
                    <input name="Assignee_Email" type="email" value={form.Assignee_Email} onChange={handleChange} className="form-control" />
                  </div>
                  <div className="col-12">
                    <label className="form-label">Comment</label>
                    <textarea name="Comment" rows="3" value={form.Comment} onChange={handleChange} className="form-control" />
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button type="button" onClick={() => handleClose(false)} className="btn addbtn rounded-0 Cancel_button px-4">
                Cancel
              </button>
              <button type="submit" disabled={loading || saving || !form} className="btn addbtn rounded-0 Update_button px-4">
                {saving ? "Saving..." : "Update"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default UpdateSmartGateTicketPopUp;
