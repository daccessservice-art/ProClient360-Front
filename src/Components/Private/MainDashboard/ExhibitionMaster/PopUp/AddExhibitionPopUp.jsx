import { useState } from "react";
import toast from "react-hot-toast";
import { RequiredStar } from "../../../RequiredStar/RequiredStar";
import { createExhibition } from "../../../../../hooks/useExhibition";

const AddExhibitionPopUp = ({ handleAdd }) => {
  const [exhibitionName, setExhibitionName] = useState("");
  const [targetAddress, setTargetAddress] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [venue, setVenue] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [exhibitionFees, setExhibitionFees] = useState("");
  const [stallDesignationFees, setStallDesignationFees] = useState("");
  const [status, setStatus] = useState("Upcoming");

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!exhibitionName || !targetAddress || !dateFrom || !dateTo || !venue || !city || !country || !exhibitionFees || !stallDesignationFees) {
      return toast.error("Please fill all required fields");
    }

    if (new Date(dateTo) < new Date(dateFrom)) {
      return toast.error('"Date To" cannot be earlier than "Date From"');
    }

    const payload = {
      exhibitionName,
      targetAddress,
      dateFrom,
      dateTo,
      venue,
      city,
      country,
      exhibitionFees: parseFloat(exhibitionFees),
      stallDesignationFees: parseFloat(stallDesignationFees),
      status,
    };

    toast.loading("Creating Exhibition...");
    const data = await createExhibition(payload);
    toast.dismiss();

    if (data.success) {
      toast.success(data.message);
      handleAdd();
    } else {
      toast.error(data.error || "Failed to create exhibition");
    }
  };

  return (
    <div
      className="modal fade show"
      style={{ display: "flex", alignItems: "center", backgroundColor: "#00000090" }}
    >
      <div className="modal-dialog modal-lg modal-dialog-scrollable">
        <div className="modal-content p-3">
          <form onSubmit={handleSubmit}>
            <div className="modal-header pt-0">
              <h5 className="card-title fw-bold">Create New Exhibition</h5>
              <button
                onClick={handleAdd}
                type="button"
                className="close px-3"
                style={{ marginLeft: "auto" }}
              >
                <span aria-hidden="true">&times;</span>
              </button>
            </div>

            <div className="modal-body">
              <div className="row modal_body_height">

                {/* Exhibition Name */}
                <div className="col-12 col-lg-6">
                  <div className="mb-3">
                    <label className="form-label label_text">
                      Exhibition Name <RequiredStar />
                    </label>
                    <input
                      type="text"
                      className="form-control rounded-0"
                      maxLength={200}
                      value={exhibitionName}
                      onChange={(e) => setExhibitionName(e.target.value)}
                      placeholder="Enter exhibition name..."
                      required
                    />
                  </div>
                </div>

                {/* Status */}
                <div className="col-12 col-lg-6">
                  <div className="mb-3">
                    <label className="form-label label_text">Status</label>
                    <select
                      className="form-select rounded-0"
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                    >
                      <option value="Upcoming">Upcoming</option>
                      <option value="Ongoing">Ongoing</option>
                      <option value="Completed">Completed</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>

                {/* Target Address */}
                <div className="col-12">
                  <div className="mb-3">
                    <label className="form-label label_text">
                      Target Address <RequiredStar />
                    </label>
                    <textarea
                      className="form-control rounded-0"
                      maxLength={500}
                      rows={2}
                      value={targetAddress}
                      onChange={(e) => setTargetAddress(e.target.value)}
                      placeholder="Enter target address..."
                      required
                    />
                  </div>
                </div>

                {/* Date From */}
                <div className="col-12 col-lg-6">
                  <div className="mb-3">
                    <label className="form-label label_text">
                      Date From <RequiredStar />
                    </label>
                    <input
                      type="date"
                      className="form-control rounded-0"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* Date To */}
                <div className="col-12 col-lg-6">
                  <div className="mb-3">
                    <label className="form-label label_text">
                      Date To <RequiredStar />
                    </label>
                    <input
                      type="date"
                      className="form-control rounded-0"
                      value={dateTo}
                      min={dateFrom}
                      onChange={(e) => setDateTo(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* Venue */}
                <div className="col-12 col-lg-6">
                  <div className="mb-3">
                    <label className="form-label label_text">
                      Venue <RequiredStar />
                    </label>
                    <input
                      type="text"
                      className="form-control rounded-0"
                      maxLength={300}
                      value={venue}
                      onChange={(e) => setVenue(e.target.value)}
                      placeholder="Enter venue name..."
                      required
                    />
                  </div>
                </div>

                {/* City */}
                <div className="col-12 col-lg-3">
                  <div className="mb-3">
                    <label className="form-label label_text">
                      City <RequiredStar />
                    </label>
                    <input
                      type="text"
                      className="form-control rounded-0"
                      maxLength={100}
                      value={city}
                      onChange={(e) => {
                        if (/^[a-zA-Z\s]*$/.test(e.target.value)) setCity(e.target.value);
                      }}
                      placeholder="City..."
                      required
                    />
                  </div>
                </div>

                {/* Country */}
                <div className="col-12 col-lg-3">
                  <div className="mb-3">
                    <label className="form-label label_text">
                      Country <RequiredStar />
                    </label>
                    <input
                      type="text"
                      className="form-control rounded-0"
                      maxLength={100}
                      value={country}
                      onChange={(e) => {
                        if (/^[a-zA-Z\s]*$/.test(e.target.value)) setCountry(e.target.value);
                      }}
                      placeholder="Country..."
                      required
                    />
                  </div>
                </div>

                {/* Fees Section */}
                <div className="col-12 mt-2">
                  <div className="row border bg-gray mx-auto p-2">
                    <div className="col-12 mb-2">
                      <span className="SecondaryInfo fw-bold">Fee Details</span>
                    </div>

                    {/* Exhibition Fees */}
                    <div className="col-12 col-lg-6">
                      <div className="mb-3">
                        <label className="form-label label_text">
                          Exhibition Fees / Stall Fees (₹) <RequiredStar />
                        </label>
                        <input
                          type="number"
                          className="form-control rounded-0"
                          min={0}
                          value={exhibitionFees}
                          onChange={(e) => setExhibitionFees(e.target.value)}
                          placeholder="0.00"
                          required
                        />
                      </div>
                    </div>

                    {/* Stall Designation Fees */}
                    <div className="col-12 col-lg-6">
                      <div className="mb-3">
                        <label className="form-label label_text">
                          Stall Designation Fees (₹) <RequiredStar />
                        </label>
                        <input
                          type="number"
                          className="form-control rounded-0"
                          min={0}
                          value={stallDesignationFees}
                          onChange={(e) => setStallDesignationFees(e.target.value)}
                          placeholder="0.00"
                          required
                        />
                      </div>
                    </div>

                    {/* Total summary */}
                    {(exhibitionFees || stallDesignationFees) && (
                      <div className="col-12">
                        <div className="alert alert-info py-2 mb-0">
                          <small>
                            <strong>Total Estimated Cost: ₹</strong>{" "}
                            {(parseFloat(exhibitionFees || 0) + parseFloat(stallDesignationFees || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </small>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Buttons */}
                <div className="row mt-3">
                  <div className="col-12 pt-2">
                    <button type="submit" className="w-80 btn addbtn rounded-0 add_button m-2 px-4">
                      Add
                    </button>
                    <button type="button" onClick={handleAdd} className="w-80 btn addbtn rounded-0 Cancel_button m-2 px-4">
                      Cancel
                    </button>
                  </div>
                </div>

              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddExhibitionPopUp;