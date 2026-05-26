import { useState, useEffect } from "react";
import { updateTicket } from "../../../../../hooks/useTicket";
import { getCustomers } from "../../../../../hooks/useCustomer";
import toast from "react-hot-toast";
import { RequiredStar } from "../../../RequiredStar/RequiredStar";

const UpdateEmployeePopUp = ({ handleUpdate, selectedTicket }) => {
  const [ticket, setTicket] = useState(selectedTicket);
  const [customers, setCustomers] = useState([]);
  const [searchText, setSearchText] = useState("");

  const handleChange = (event) => {
    const { name, value } = event.target;

    if (name === "client") {
      setTicket((prevTicket) => ({
        ...prevTicket,
        client: {
          _id: value,
        },
      }));
    } else {
      setTicket((prevTicket) => ({
        ...prevTicket,
        [name]: value,
      }));
    }
  };

  const handleAddressChange = (event) => {
    const { name, value } = event.target;
    setTicket((prevTicket) => ({
      ...prevTicket,
      Address: {
        ...prevTicket.Address,
        [name]: value,
      },
    }));
  };

  const handleEmpUpdate = async (event) => {
    event.preventDefault();
    if (
      !ticket.details ||
      !ticket.product ||
      !ticket.client ||
      !ticket.contactPerson ||
      !ticket.contactNumber ||
      !ticket.source
    ) {
      return toast.error("Please fill all required fields");
    }
    if (/[a-zA-Z]/.test(ticket.contactNumber)) {
      return toast.error("Phone number should not contain alphabets");
    }
    try {
      toast.loading("Updating Ticket...");
      const data = await updateTicket(ticket._id, ticket);
      toast.dismiss();
      if (data?.success) {
        toast.success(data.message);
        handleUpdate();
      } else {
        toast.error(data.error);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      if (searchText.trim() !== "" && searchText.length > 2) {
        fetchCustomers(searchText);
      } else {
        setCustomers([]);
      }
    }, 500);

    return () => clearTimeout(delayDebounce);
  }, [searchText]);

  const fetchCustomers = async (search) => {
    try {
      const data = await getCustomers(1, 15, search);
      if (data) {
        setCustomers(data.customers || []);
      }
    } catch (error) {
      console.error("Error fetching customers:", error);
    }
  };

  const productOptions = [
    "Surveillance System",
    "CCTV System",
    "TA System",
    "Hajeri",
    "SmartFace",
    "ZKBioSecurity",
    "Access Control System",
    "Turnkey Project",
    "Alleviz",
    "CafeLive",
    "WorksJoy",
    "WorksJoy Blu",
    "Fire Alarm System",
    "Fire Hydrant System",
    "IDS",
    "AI Face Machines",
    "Entrance Automation",
    "Guard Tour System",
    "Home Automation",
    "IP PA and Communication System",
    "CRM",
    "KMS",
    "VMS",
    "PMS",
    "Boom Barrier System",
    "Tripod System",
    "Flap Barrier System",
    "EPBX System",
    "CMS",
    "Lift Elevator System",
    "AV6",
    "Walky Talky System",
    "Device Management System",
    "VisionIQ",
    "CineMind",
    "Extracto",
    "Virtual Agent",
    "LAN Cabling Activity",
  ];

  return (
    <>
      <div
        className="modal fade show"
        style={{
          display: "flex",
          alignItems: "center",
          backgroundColor: "#00000090",
        }}
      >
        <div className="modal-dialog modal-lg">
          <div className="modal-content p-3">
            <form onSubmit={handleEmpUpdate}>
              <div className="modal-header pt-0">
                <h5 className="card-title fw-bold">Update Ticket</h5>
                <button
                  onClick={handleUpdate}
                  type="button"
                  className="close px-3"
                  style={{ marginLeft: "auto", border: "none", background: "none" }}
                >
                  <span aria-hidden="true">&times;</span>
                </button>
              </div>
              <div className="modal-body">
                <div className="row modal_body_height">
                  {/* Client Search and Selection */}
                  <div className="col-12">
                    <div className="mb-3">
                      <label htmlFor="customerSearch" className="form-label label_text">
                        Client Name <RequiredStar />
                      </label>
                      <input
                        type="text"
                        className="form-control mb-2 rounded-0"
                        id="customerSearch"
                        placeholder="Type to search customer..."
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        required
                      />
                      <select
                        className="form-select rounded-0"
                        id="custName"
                        name="client"
                        onChange={handleChange}
                        value={ticket?.client?._id || ""}
                        required
                      >
                        <option value="" hidden>
                          {ticket?.client?.custName || "Select Client"}
                        </option>
                        {customers.map((cust) => (
                          <option key={cust._id} value={cust._id}>
                            {cust.custName}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Address Section */}
                  <div className="col-12 mt-2">
                    <div className="row border mt-4 bg-gray mx-auto p-3">
                      <div className="col-12 mb-3">
                        <span className="AddressInfo">
                          Address <RequiredStar />
                        </span>
                      </div>

                      <div className="col-12 col-lg-6 mt-2">
                        <div className="mb-3">
                          <input
                            type="text"
                            inputMode="numeric"
                            pattern="\d{6}"
                            maxLength={6}
                            className="form-control rounded-0"
                            placeholder="Pincode"
                            name="pincode"
                            value={ticket?.Address?.pincode || ""}
                            onChange={handleAddressChange}
                            required
                          />
                        </div>
                      </div>

                      <div className="col-12 col-lg-6 mt-2">
                        <div className="mb-3">
                          <input
                            type="text"
                            maxLength={50}
                            className="form-control rounded-0"
                            placeholder="State"
                            name="state"
                            value={ticket?.Address?.state || ""}
                            onChange={handleAddressChange}
                            required
                          />
                        </div>
                      </div>

                      <div className="col-12 col-lg-6 mt-2">
                        <div className="mb-3">
                          <input
                            type="text"
                            maxLength={50}
                            className="form-control rounded-0"
                            placeholder="City"
                            name="city"
                            value={ticket?.Address?.city || ""}
                            onChange={handleAddressChange}
                            required
                          />
                        </div>
                      </div>

                      <div className="col-12 col-lg-6 mt-2">
                        <div className="mb-3">
                          <input
                            type="text"
                            maxLength={50}
                            className="form-control rounded-0"
                            placeholder="Country"
                            name="country"
                            value={ticket?.Address?.country || ""}
                            onChange={handleAddressChange}
                            required
                          />
                        </div>
                      </div>

                      <div className="col-12 mt-2">
                        <div className="mb-3">
                          <textarea
                            className="form-control rounded-0"
                            name="add"
                            maxLength={500}
                            placeholder="House NO., Building Name, Road Name, Area, Colony"
                            value={ticket?.Address?.add || ""}
                            onChange={handleAddressChange}
                            rows="2"
                            required
                          ></textarea>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Contact Information */}
                  <div className="col-12 col-lg-6 mt-2">
                    <div className="mb-3">
                      <label htmlFor="contactPerson" className="form-label label_text">
                        Contact Person Name <RequiredStar />
                      </label>
                      <input
                        type="text"
                        maxLength={50}
                        value={ticket?.contactPerson || ""}
                        onChange={handleChange}
                        className="form-control rounded-0"
                        id="contactPerson"
                        name="contactPerson"
                        required
                      />
                    </div>
                  </div>

                  <div className="col-12 col-lg-6 mt-2">
                    <div className="mb-3">
                      <label htmlFor="contactPersonEmail" className="form-label label_text">
                        Contact Person Email <RequiredStar />
                      </label>
                      <input
                        type="email"
                        maxLength={50}
                        value={ticket?.contactPersonEmail || ""}
                        onChange={handleChange}
                        className="form-control rounded-0"
                        id="contactPersonEmail"
                        name="contactPersonEmail"
                        required
                      />
                    </div>
                  </div>

                  <div className="col-12 col-lg-6 mt-2">
                    <div className="mb-3">
                      <label htmlFor="contactNumber" className="form-label label_text">
                        Contact Person Number <RequiredStar />
                      </label>
                      <input
                        type="tel"
                        pattern="[0-9]{10}"
                        maxLength="10"
                        value={ticket?.contactNumber || ""}
                        onChange={handleChange}
                        className="form-control rounded-0"
                        id="contactNumber"
                        name="contactNumber"
                        required
                      />
                    </div>
                  </div>

                  <div className="col-12 col-lg-6 mt-2">
                    <div className="mb-3">
                      <label htmlFor="source" className="form-label label_text">
                        Complaint Source <RequiredStar />
                      </label>
                      <select
                        className="form-select rounded-0"
                        id="source"
                        name="source"
                        value={ticket?.source || ""}
                        onChange={handleChange}
                        required
                      >
                        <option value="" hidden>Select Source</option>
                        <option value="Email">Email</option>
                        <option value="Call">Call</option>
                        <option value="WhatsApp">WhatsApp</option>
                        <option value="SMS">SMS</option>
                        <option value="Direct">Direct</option>
                      </select>
                    </div>
                  </div>

                  {/* Product Selection */}
                  <div className="col-12">
                    <div className="mb-3">
                      <label htmlFor="product" className="form-label label_text">
                        Product <RequiredStar />
                      </label>
                      <select
                        className="form-select rounded-0"
                        id="product"
                        name="product"
                        value={ticket?.product || ""}
                        onChange={handleChange}
                        required
                      >
                        <option value="" hidden>Select Product</option>
                        {productOptions.map((product) => (
                          <option key={product} value={product}>
                            {product}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Complaint Details */}
                  <div className="col-12">
                    <div className="mb-3">
                      <label htmlFor="details" className="form-label label_text">
                        Complaint Details <RequiredStar />
                      </label>
                      <textarea
                        name="details"
                        maxLength={500}
                        placeholder="Enter complaint details..."
                        value={ticket?.details || ""}
                        onChange={handleChange}
                        className="form-control rounded-0"
                        id="details"
                        rows="3"
                        required
                      ></textarea>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="col-12 pt-3 mt-2">
                    <button
                      type="submit"
                      className="btn addbtn rounded-0 add_button m-2 px-4"
                    >
                      Update
                    </button>
                    <button
                      type="button"
                      onClick={handleUpdate}
                      className="btn addbtn rounded-0 Cancel_button m-2 px-4"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
};

export default UpdateEmployeePopUp;