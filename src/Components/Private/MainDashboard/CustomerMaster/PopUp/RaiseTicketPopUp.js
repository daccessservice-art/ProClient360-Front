import { useState, useEffect } from "react";
import validator from "validator";
import toast from "react-hot-toast";
import { RequiredStar } from "../../../RequiredStar/RequiredStar";
import { createRaiseTicket, getTicketsByCustomer, deleteRaiseTicket } from "../../../../../hooks/useCustomerRaiseTicket";
import { confirmAlert } from 'react-confirm-alert';
import 'react-confirm-alert/src/react-confirm-alert.css';

const MAX_CONTACTS = 10;

const emptyContact = () => ({
  contactPersonName: "",
  contactNumber: "",
  contactEmail: "",
  designation: "",
  location: "",
});

const RaiseTicketPopUp = ({ customer, onClose }) => {
  const [submitting, setSubmitting] = useState(false);
  const [contacts, setContacts] = useState([emptyContact()]);
  const [existingTickets, setExistingTickets] = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [showExisting, setShowExisting] = useState(false);

  useEffect(() => {
    if (customer?._id) {
      fetchExistingTickets();
    }
  }, [customer?._id]);

  const fetchExistingTickets = async () => {
    setLoadingTickets(true);
    try {
      const data = await getTicketsByCustomer(customer._id);
      if (data?.success) {
        setExistingTickets(data.tickets || []);
      }
    } catch (error) {
      console.error("Error fetching existing tickets:", error);
    } finally {
      setLoadingTickets(false);
    }
  };

  const handleAddContact = () => {
    if (contacts.length < MAX_CONTACTS) {
      setContacts([...contacts, emptyContact()]);
    } else {
      toast.error(`Maximum ${MAX_CONTACTS} contacts allowed`);
    }
  };

  const handleRemoveContact = (index) => {
    if (contacts.length <= 1) {
      toast.error("At least one contact is required");
      return;
    }
    setContacts(contacts.filter((_, i) => i !== index));
  };

  const handleContactChange = (index, field, value) => {
    const updated = [...contacts];
    if (field === "contactPersonName") {
      if (/^[a-zA-Z\s]*$/.test(value)) updated[index][field] = value;
    } else if (field === "contactNumber") {
      if (value.length <= 25) updated[index][field] = value;
    } else if (field === "designation") {
      if (/^[a-zA-Z0-9\s&\-\/]*$/.test(value)) updated[index][field] = value;
    } else if (field === "location") {
      if (value.length <= 200) updated[index][field] = value;
    } else {
      updated[index][field] = value;
    }
    setContacts(updated);
  };

  const validateContacts = () => {
    for (let i = 0; i < contacts.length; i++) {
      const c = contacts[i];
      if (!c.contactPersonName || c.contactPersonName.trim() === "") {
        toast.error(`Contact Person Name is required for Contact ${i + 1}`);
        return false;
      }
      if (c.contactEmail && c.contactEmail.trim() !== "" && !validator.isEmail(c.contactEmail)) {
        toast.error(`Enter a valid email for Contact ${i + 1}`);
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    if (!validateContacts()) return;

    try {
      setSubmitting(true);
      const result = await createRaiseTicket({
        customer: customer._id,
        contacts,
      });

      if (result?.success) {
        toast.success(result.message || "Ticket raised successfully");
        onClose();
      } else {
        toast.error(result?.error || "Failed to raise ticket");
      }
    } catch (error) {
      console.error("Error raising ticket:", error);
      toast.error("Error raising ticket");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTicket = (ticketId) => {
    confirmAlert({
      title: 'Delete Ticket',
      message: 'Are you sure you want to delete this raised ticket? This cannot be undone.',
      buttons: [
        {
          label: 'Yes, Delete',
          onClick: async () => {
            try {
              const result = await deleteRaiseTicket(ticketId);
              if (result?.success) {
                toast.success(result.message);
                fetchExistingTickets();
              } else {
                toast.error(result?.error || "Failed to delete");
              }
            } catch {
              toast.error("Error deleting ticket");
            }
          }
        },
        { label: 'Cancel', onClick: () => {} }
      ]
    });
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
    });
  };

  return (
    <>
      <div
        className="modal fade show"
        style={{
          display: "flex",
          alignItems: "center",
          backgroundColor: "#00000090",
          zIndex: 1060,
        }}
      >
        <div
          className="modal-dialog"
          style={{
            maxWidth: "900px",
            width: "95%",
            maxHeight: "92vh",
            margin: "auto",
          }}
        >
          <div
            className="modal-content"
            style={{
              display: "flex",
              flexDirection: "column",
              maxHeight: "92vh",
              overflow: "hidden",
              borderRadius: "8px",
            }}
          >
            <form
              onSubmit={handleSubmit}
              style={{
                display: "flex",
                flexDirection: "column",
                maxHeight: "92vh",
                overflow: "hidden",
              }}
            >
              {/* ── FIXED HEADER ── */}
              <div
                className="modal-header"
                style={{
                  flexShrink: 0,
                  borderBottom: "2px solid #e0e0e0",
                  backgroundColor: "#f8f9fa",
                  padding: "12px 20px",
                }}
              >
                <div>
                  <h5 className="card-title fw-bold mb-0" style={{ fontSize: "18px" }}>
                    <i className="fa-solid fa-ticket me-2 text-primary"></i>
                    Raise Ticket
                  </h5>
                  <small className="text-muted" style={{ fontSize: "13px" }}>
                    Customer: <strong>{customer?.custName}</strong>
                    {customer?.email && <span className="ms-2">({customer.email})</span>}
                  </small>
                </div>
                <button
                  type="button"
                  className="btn-close"
                  onClick={onClose}
                  style={{ marginLeft: "auto" }}
                ></button>
              </div>

              {/* ── SCROLLABLE BODY ── */}
              <div
                className="modal-body"
                style={{
                  flex: "1 1 auto",
                  overflowY: "auto",
                  overflowX: "hidden",
                  padding: "16px 20px",
                  minHeight: 0,
                }}
              >
                <div className="row">

                  {/* ── Existing Tickets Toggle ── */}
                  <div className="col-12 mb-3">
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-info"
                      onClick={() => setShowExisting(!showExisting)}
                    >
                      <i className={`fa-solid ${showExisting ? 'fa-chevron-up' : 'fa-chevron-down'} me-1`}></i>
                      Previous Raised Tickets
                      {existingTickets.length > 0 && (
                        <span className="badge bg-info text-dark ms-2">{existingTickets.length}</span>
                      )}
                    </button>
                  </div>

                  {/* ── Existing Tickets List ── */}
                  {showExisting && (
                    <div className="col-12 mb-3">
                      {loadingTickets ? (
                        <div className="text-center py-3">
                          <span className="text-muted">
                            <i className="fa fa-spinner fa-spin me-2"></i>Loading...
                          </span>
                        </div>
                      ) : existingTickets.length > 0 ? (
                        <div
                          className="border rounded"
                          style={{
                            maxHeight: "260px",
                            overflowY: "auto",
                            borderColor: "#dee2e6",
                          }}
                        >
                          {existingTickets.map((ticket) => (
                            <div
                              key={ticket._id}
                              className="p-2"
                              style={{
                                borderBottom: "1px solid #e9ecef",
                                backgroundColor: "#f8f9fa",
                              }}
                            >
                              <div className="d-flex justify-content-between align-items-start mb-1">
                                <div>
                                  <small className="fw-bold text-primary">
                                    <i className="fa-solid fa-calendar me-1"></i>
                                    {formatDate(ticket.createdAt)}
                                  </small>
                                  <small className="text-muted ms-2">
                                    By: {ticket.raisedBy?.name || "N/A"}
                                  </small>
                                </div>
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-danger py-0 px-2"
                                  onClick={() => handleDeleteTicket(ticket._id)}
                                  title="Delete this ticket"
                                  style={{ fontSize: "11px" }}
                                >
                                  <i className="fa-solid fa-trash-can"></i>
                                </button>
                              </div>
                              <div className="table-responsive">
                                <table className="table table-sm table-bordered mb-0" style={{ fontSize: "12px" }}>
                                  <thead className="table-light">
                                    <tr>
                                      <th style={{ minWidth: "30px" }}>#</th>
                                      <th style={{ minWidth: "120px" }}>Name</th>
                                      <th style={{ minWidth: "110px" }}>Phone</th>
                                      <th style={{ minWidth: "140px" }}>Email</th>
                                      <th style={{ minWidth: "100px" }}>Designation</th>
                                      <th style={{ minWidth: "120px" }}>Location</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {ticket.contacts.map((c, i) => (
                                      <tr key={i}>
                                        <td className="text-center">{i + 1}</td>
                                        <td>{c.contactPersonName}</td>
                                        <td>{c.contactNumber || "-"}</td>
                                        <td>{c.contactEmail || "-"}</td>
                                        <td>{c.designation || "-"}</td>
                                        <td>{c.location || "-"}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="alert alert-light py-2 mb-0 text-center">
                          <small className="text-muted">
                            <i className="fa-solid fa-circle-info me-1"></i>
                            No previous tickets found for this customer
                          </small>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── Add New Contact Section ── */}
                  <div className="col-12">
                    <div
                      className="border rounded p-3"
                      style={{
                        backgroundColor: "#f0f7ff",
                        borderColor: "#b6d4fe",
                      }}
                    >
                      <div className="d-flex justify-content-between align-items-center mb-3">
                        <span className="fw-bold text-primary">
                          <i className="fa-solid fa-user-plus me-1"></i>
                          Add Contact Information
                        </span>
                        <span className="badge bg-primary">
                          {contacts.length} / {MAX_CONTACTS}
                        </span>
                      </div>

                      {contacts.map((contact, index) => (
                        <div
                          key={index}
                          className="border rounded p-2 mb-3 bg-white"
                          style={{ borderLeft: "4px solid #0d6efd" }}
                        >
                          <div className="d-flex justify-content-between align-items-center mb-2">
                            <small className="fw-bold text-muted">
                              <i className="fa-solid fa-user me-1"></i>
                              Contact Person {index + 1}
                              {index === 0 && <RequiredStar />}
                            </small>
                            {contacts.length > 1 && (
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-danger py-0 px-2"
                                onClick={() => handleRemoveContact(index)}
                                style={{ fontSize: "11px" }}
                              >
                                <i className="fa-solid fa-xmark me-1"></i>Remove
                              </button>
                            )}
                          </div>

                          <div className="row g-2">
                            <div className="col-12 col-lg-6">
                              <label
                                className="form-label label_text mb-1"
                                style={{ fontSize: "13px" }}
                              >
                                Contact Person Name {index === 0 && <RequiredStar />}
                              </label>
                              <input
                                type="text"
                                className="form-control form-control-sm rounded-0"
                                placeholder="Enter full name..."
                                maxLength={100}
                                value={contact.contactPersonName}
                                onChange={(e) =>
                                  handleContactChange(index, "contactPersonName", e.target.value)
                                }
                                required
                              />
                            </div>

                            <div className="col-12 col-lg-6">
                              <label
                                className="form-label label_text mb-1"
                                style={{ fontSize: "13px" }}
                              >
                                Contact Number
                              </label>
                              <input
                                type="text"
                                className="form-control form-control-sm rounded-0"
                                placeholder="Enter phone number..."
                                maxLength={25}
                                value={contact.contactNumber}
                                onChange={(e) =>
                                  handleContactChange(index, "contactNumber", e.target.value)
                                }
                              />
                            </div>

                            <div className="col-12 col-lg-6">
                              <label
                                className="form-label label_text mb-1"
                                style={{ fontSize: "13px" }}
                              >
                                Contact Email
                              </label>
                              <input
                                type="email"
                                className="form-control form-control-sm rounded-0"
                                placeholder="Enter email address..."
                                maxLength={100}
                                value={contact.contactEmail}
                                onChange={(e) =>
                                  handleContactChange(index, "contactEmail", e.target.value)
                                }
                              />
                            </div>

                            <div className="col-12 col-lg-6">
                              <label
                                className="form-label label_text mb-1"
                                style={{ fontSize: "13px" }}
                              >
                                Designation
                              </label>
                              <input
                                type="text"
                                className="form-control form-control-sm rounded-0"
                                placeholder="e.g. Manager, Director..."
                                maxLength={100}
                                value={contact.designation}
                                onChange={(e) =>
                                  handleContactChange(index, "designation", e.target.value)
                                }
                              />
                            </div>

                            <div className="col-12">
                              <label
                                className="form-label label_text mb-1"
                                style={{ fontSize: "13px" }}
                              >
                                Location
                              </label>
                              <input
                                type="text"
                                className="form-control form-control-sm rounded-0"
                                placeholder="Enter location / city / address..."
                                maxLength={200}
                                value={contact.location}
                                onChange={(e) =>
                                  handleContactChange(index, "location", e.target.value)
                                }
                              />
                            </div>
                          </div>
                        </div>
                      ))}

                      {/* ── Add Contact Button ── */}
                      {contacts.length < MAX_CONTACTS ? (
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-primary w-100"
                          onClick={handleAddContact}
                        >
                          <i className="fa-solid fa-plus me-1"></i>
                          Add Contact ({MAX_CONTACTS - contacts.length} remaining)
                        </button>
                      ) : (
                        <div className="text-center py-2">
                          <small className="text-muted">
                            <i className="fa-solid fa-circle-check me-1 text-success"></i>
                            Maximum {MAX_CONTACTS} contacts reached
                          </small>
                        </div>
                      )}
                    </div>
                  </div>

                </div>
              </div>

              {/* ── FIXED FOOTER ── */}
              <div
                className="modal-footer"
                style={{
                  flexShrink: 0,
                  borderTop: "2px solid #e0e0e0",
                  backgroundColor: "#f8f9fa",
                  padding: "12px 20px",
                }}
              >
                <button
                  type="submit"
                  className="btn addbtn rounded-0 add_button m-2 px-4"
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <span
                        className="spinner-border spinner-border-sm me-2"
                        role="status"
                      ></span>
                      Submitting...
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-paper-plane me-1"></i>
                      Raise Ticket
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="btn addbtn rounded-0 Cancel_button m-2 px-4"
                  disabled={submitting}
                >
                  Cancel
                </button>
              </div>

            </form>
          </div>
        </div>
      </div>
    </>
  );
};

export default RaiseTicketPopUp;