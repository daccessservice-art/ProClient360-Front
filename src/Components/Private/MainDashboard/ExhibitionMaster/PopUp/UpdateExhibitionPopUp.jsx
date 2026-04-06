import { useState } from "react";
import toast from "react-hot-toast";
import { RequiredStar } from "../../../RequiredStar/RequiredStar";
import { updateExhibition } from "../../../../../hooks/useExhibition";

const UpdateExhibitionPopUp = ({ handleUpdate, selectedExhibition }) => {
  const formatDateForInput = (dateStr) => {
    if (!dateStr) return "";
    return new Date(dateStr).toISOString().split("T")[0];
  };

  const [exhibition, setExhibition] = useState({
    ...selectedExhibition,
    dateFrom: formatDateForInput(selectedExhibition?.dateFrom),
    dateTo: formatDateForInput(selectedExhibition?.dateTo),
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setExhibition((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!exhibition.exhibitionName || !exhibition.targetAddress || !exhibition.dateFrom || !exhibition.dateTo || !exhibition.venue || !exhibition.city || !exhibition.country || !exhibition.exhibitionFees || !exhibition.stallDesignationFees) {
      return toast.error("Please fill all required fields");
    }

    if (new Date(exhibition.dateTo) < new Date(exhibition.dateFrom)) {
      return toast.error('"Date To" cannot be earlier than "Date From"');
    }

    toast.loading("Updating Exhibition...");
    const data = await updateExhibition({
      ...exhibition,
      exhibitionFees: parseFloat(exhibition.exhibitionFees),
      stallDesignationFees: parseFloat(exhibition.stallDesignationFees),
    });
    toast.dismiss();

    if (data.success) {
      toast.success(data.message);
      handleUpdate();
    } else {
      toast.error(data.error || "Failed to update exhibition");
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
              <h5 className="card-title fw-bold">Update Exhibition</h5>
              <button
                onClick={handleUpdate}
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
                      name="exhibitionName"
                      className="form-control rounded-0"
                      maxLength={200}
                      value={exhibition.exhibitionName || ""}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>

                {/* Status */}
                <div className="col-12 col-lg-6">
                  <div className="mb-3">
                    <label className="form-label label_text">Status</label>
                    <select
                      name="status"
                      className="form-select rounded-0"
                      value={exhibition.status || "Upcoming"}
                      onChange={handleChange}
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
                      name="targetAddress"
                      className="form-control rounded-0"
                      maxLength={500}
                      rows={2}
                      value={exhibition.targetAddress || ""}
                      onChange={handleChange}
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
                      name="dateFrom"
                      className="form-control rounded-0"
                      value={exhibition.dateFrom || ""}
                      onChange={handleChange}
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
                      name="dateTo"
                      className="form-control rounded-0"
                      value={exhibition.dateTo || ""}
                      min={exhibition.dateFrom}
                      onChange={handleChange}
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
                      name="venue"
                      className="form-control rounded-0"
                      maxLength={300}
                      value={exhibition.venue || ""}
                      onChange={handleChange}
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
                      name="city"
                      className="form-control rounded-0"
                      maxLength={100}
                      value={exhibition.city || ""}
                      onChange={(e) => {
                        if (/^[a-zA-Z\s]*$/.test(e.target.value)) handleChange(e);
                      }}
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
                      name="country"
                      className="form-control rounded-0"
                      maxLength={100}
                      value={exhibition.country || ""}
                      onChange={(e) => {
                        if (/^[a-zA-Z\s]*$/.test(e.target.value)) handleChange(e);
                      }}
                      required
                    />
                  </div>
                </div>

                {/* Fees */}
                <div className="col-12 mt-2">
                  <div className="row border bg-gray mx-auto p-2">
                    <div className="col-12 mb-2">
                      <span className="SecondaryInfo fw-bold">Fee Details</span>
                    </div>

                    <div className="col-12 col-lg-6">
                      <div className="mb-3">
                        <label className="form-label label_text">
                          Exhibition Fees / Stall Fees (₹) <RequiredStar />
                        </label>
                        <input
                          type="number"
                          name="exhibitionFees"
                          className="form-control rounded-0"
                          min={0}
                          value={exhibition.exhibitionFees || ""}
                          onChange={handleChange}
                          required
                        />
                      </div>
                    </div>

                    <div className="col-12 col-lg-6">
                      <div className="mb-3">
                        <label className="form-label label_text">
                          Stall Designation Fees (₹) <RequiredStar />
                        </label>
                        <input
                          type="number"
                          name="stallDesignationFees"
                          className="form-control rounded-0"
                          min={0}
                          value={exhibition.stallDesignationFees || ""}
                          onChange={handleChange}
                          required
                        />
                      </div>
                    </div>

                    {(exhibition.exhibitionFees || exhibition.stallDesignationFees) && (
                      <div className="col-12">
                        <div className="alert alert-info py-2 mb-0">
                          <small>
                            <strong>Total Estimated Cost: ₹</strong>{" "}
                            {(parseFloat(exhibition.exhibitionFees || 0) + parseFloat(exhibition.stallDesignationFees || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
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
                      Update
                    </button>
                    <button type="button" onClick={handleUpdate} className="w-80 btn addbtn rounded-0 Cancel_button m-2 px-4">
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

export default UpdateExhibitionPopUp;