import { useState, useEffect, useCallback } from "react";
import { RequiredStar } from "../../../RequiredStar/RequiredStar";
import { createService } from "../../../../../hooks/useService";
import { getEmployees } from "../../../../../hooks/useEmployees";
import Select from "react-select";
import toast from "react-hot-toast";
const PAGE_SIZE = 10;

const AddServicePopup = ({ handleAddService, selectedTicket }) => {
  const [loading, setLoading] = useState(false);
  const [serviceType, setServiceType] = useState();
  const [priority, setPriority] = useState();
  const [allotmentDate, setAllotmentDate] = useState();
  const [workMode, setWorkMode] = useState();
  const [ticket] = useState(selectedTicket);

  // Employee dropdown state
  const [empOptions, setEmpOptions] = useState([]);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [empPage, setEmpPage] = useState(1);
  const [empHasMore, setEmpHasMore] = useState(true);
  const [empLoading, setEmpLoading] = useState(false);
  const [empSearch, setEmpSearch] = useState("");

  // Fetch employees with pagination & search
  const loadEmployees = useCallback(
    async (page, search) => {
      if (empLoading || !empHasMore) return;
      setEmpLoading(true);
      const data = await getEmployees(page, PAGE_SIZE, search);

      if (data.error) {
        toast.error(data.error || "Failed to load employees");
        setEmpLoading(false);
        return;
      }

      const newOpts = (data.employees || []).map((e) => ({
        value: e._id,
        label: e.name,
        mobile: e.mobileNo || e.mobile || e.contactNumber,
        email: e.email,
        employeeData: e,
      }));

      setEmpOptions((prev) => (page === 1 ? newOpts : [...prev, ...newOpts]));
      setEmpHasMore(newOpts.length === PAGE_SIZE);
      setEmpLoading(false);
      setEmpPage(page + 1);
    },
    [empLoading, empHasMore]
  );

    useEffect(() => {
    setEmpPage(1);
    setEmpHasMore(true);
    setEmpOptions([]);
    loadEmployees(1, empSearch);
  }, [empSearch]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const serviceData = {
      serviceType,
      ticket,
      priority,
      allotmentDate,
      allotTo: selectedEmployees.map((emp) => emp.value),
      workMode,
      selectedEmployeesData: selectedEmployees.map((emp) => ({
        name: emp.label,
      })),
    };

    if (
      !serviceType ||
      !ticket ||
      !priority ||
      !allotmentDate ||
      selectedEmployees.length === 0 ||
      !workMode
    ) {
      return toast.error("Please fill all the fields");
    }

    const data = await createService(serviceData);
    if (data?.success) {
      toast.success(data.message);
      setLoading(false);
      handleAddService();
    } else {
      toast.error(data.error || "Failed to add service");
    }
  };

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
            <form onSubmit={handleSubmit}>
              <div className="modal-header pt-0">
                <h5 className="card-title fw-bold">Assign Service</h5>
              </div>
              <div className="modal-body">
                <div className="row modal_body_height">
                  <div className="col-12 col-lg-6 mt-2">
                    <div className="mb-3">
                      <label className="form-label label_text">
                        Service Type <RequiredStar />
                      </label>
                      <select
                        className="form-select rounded-0"
                        onChange={(e) => setServiceType(e.target.value)}
                        required
                      >
                        <option>Select Service Type</option>
                        <option value={"AMC"}>AMC</option>
                        <option value={"One Time"}>One time</option>
                        <option value={"Warranty"}>Warranty</option>
                      </select>
                    </div>
                  </div>

                  <div className="col-12 col-lg-6 mt-2">
                    <div className="mb-3">
                      <label className="form-label label_text">
                        Priority <RequiredStar />
                      </label>
                      <select
                        className="form-select rounded-0"
                        onChange={(e) => setPriority(e.target.value)}
                        required
                      >
                        <option>Select Priority</option>
                        <option value={"High"}>High</option>
                        <option value={"Medium"}>Mid</option>
                        <option value={"Low"}>Low</option>
                      </select>
                    </div>
                  </div>

                  <div className="col-12 col-lg-6 mt-2">
                    <div className="mb-3">
                      <label className="form-label label_text">
                        Allotment Date <RequiredStar />
                      </label>
                      <input
                       onChange={(e) => setAllotmentDate(e.target.value)}
                       value={allotmentDate}
                       type="datetime-local"
                       className="form-control rounded-0"
                       min={new Date().toISOString().slice(0, 16)}
                       />
                    </div>
                  </div>

                  <div className="col-12 col-lg-6 mt-2">
                    <div className="mb-3">
                      <label className="form-label label_text">
                        Allocated to <RequiredStar />
                      </label>
                      <Select
                        isMulti
                        options={empOptions}
                        value={selectedEmployees}
                        onChange={(opts) => setSelectedEmployees(opts || [])}
                        onInputChange={(val) => setEmpSearch(val)}
                        onMenuScrollToBottom={() =>
                          loadEmployees(empPage, empSearch)
                        }
                        isLoading={empLoading}
                        placeholder="Search and select employees..."
                        noOptionsMessage={() =>
                          empLoading ? "Loading..." : "No employees"
                        }
                        closeMenuOnSelect={false}
                        formatOptionLabel={(option) => (
                          <div>
                            <div style={{ fontWeight: "bold" }}>
                              {option.label}
                            </div>
                          </div>
                        )}
                      />
                    </div>
                  </div>

                  <div className="col-12 col-lg-6 mt-2">
                    <div className="mb-3">
                      <label className="form-label label_text">
                        Workmode <RequiredStar />
                      </label>
                      <select
                        className="form-select rounded-0"
                        onChange={(e) => setWorkMode(e.target.value)}
                        required
                      >
                        <option>Select Workmode</option>
                        <option value={"Onsite"}>Onsite</option>
                        <option value={"Remote"}>Remote</option>
                      </select>
                    </div>
                  </div>

                  <div className="row">
                    <div className="col-12 pt-3 mt-2">
                      <button
                        type="submit"
                        disabled={loading}
                        className="w-80 btn addbtn rounded-0 add_button m-2 px-4"
                      >
                        {!loading ? "Add" : "Submitting..."}
                      </button>
                      <button
                        type="button"
                        onClick={handleAddService}
                        className="w-80  btn addbtn rounded-0 Cancel_button m-2 px-4"
                      >
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
    </>
  );
};

export default AddServicePopup;