import { useEffect, useState } from "react";
import validator from "validator";
import { updateEmployee } from "../../../../../hooks/useEmployees";
import toast from "react-hot-toast";
import { getDepartment } from "../../../../../hooks/useDepartment";
import { getDesignation } from "../../../../../hooks/useDesignation";
import { RequiredStar } from "../../../RequiredStar/RequiredStar";

const UpdateEmployeePopUp = ({ handleUpdate, selectedEmp }) => {
  const [employee, setEmployee] = useState(selectedEmp);
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);

  // Handle changes in the form fields
  const handleChange = (event) => {
    const { name, value } = event.target;

    // Check if the department is being changed
    if (name === "department") {
      const selectedDept = departments.find(dept => dept._id === value);
      setEmployee((prevEmployee) => ({
        ...prevEmployee,
        department: selectedDept,
        designation: "", // Reset designation when department changes
      }));
      setDesignations([]);
    } else {
      setEmployee((prevEmployee) => ({ ...prevEmployee, [name]: value }));
    }
  };

  // console.log(employee,"ds");


  const handleEmpUpdate = async (event) => {
    event.preventDefault();
    if(!employee.name || !employee.department || !employee.designation || !employee.email || !employee.mobileNo || !employee.hourlyRate) 
      return toast.error("All fields are required");
    if (!validator.isEmail(employee.email)) {
      return toast.error("Enter valid Email");
    }
    if (!validator.isMobilePhone(employee.mobileNo)) {
      return toast.error("Please Enter Valid Phone Number");
    }
    if(employee.hourlyRate <= 0){
      return toast.error("Hourly rate should be greater than 0");
    }
    try {
      toast.loading("Updating Employee...")
      await updateEmployee(employee);
      toast.dismiss()
      handleUpdate();
    } catch (error) {
      toast.error(error);
    }
  };

  useEffect(() => {
    const fetchDepartments = async () => {
      const data = await getDepartment();
      if (data) {
        setDepartments(data.departments || []);
      }
    };

    fetchDepartments();
  }, []);

  useEffect(() => {
    if (employee.department) {
      const fetchDesignations = async () => {
        const data = await getDesignation(employee.department._id);
        if (data) {
          setDesignations(data.designations || []);
        }
      };

      fetchDesignations();
    }
  }, [employee.department]);

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
                <h5 className="card-title fw-bold" id="exampleModalLongTitle">
                  Update Employee
                </h5>
                <button
                  onClick={() => handleUpdate()}
                  type="button"
                  className="close px-3"
                  style={{ marginLeft: "auto" }}
                >
                  <span aria-hidden="true">&times;</span>
                </button>
              </div>
              <div className="modal-body">
                <div className="row modal_body_height">
                  <div className="col-12">
                    <div className="mb-3">
                      <label htmlFor="name" className="form-label label_text">
                        Full Name <RequiredStar />
                      </label>
                      <input
                        name="name"
                        type="text"
                        maxLength={100}
                        placeholder="Update a Full Name...."
                        value={employee.name}
                        onChange={handleChange}
                        className="form-control rounded-0"
                        id="name"
                        required
                      />
                    </div>
                  </div>

                  <div className="col-12 col-lg-6 mt-2">
                    <div className="mb-3">
                      <label htmlFor="mobileNo" className="form-label label_text">
                        Mobile Number <RequiredStar />
                      </label>
                      <input
                        type="tel"
                        name="mobileNo"
                        placeholder="Update a Mobile Number...."
                        pattern="[0-9]{10}"
                        maxLength={10}
                        value={employee.mobileNo}
                        onChange={handleChange}
                        className="form-control rounded-0"
                        id="mobileNo"
                        required
                      />
                    </div>
                  </div>

                  <div className="col-12 col-lg-6 mt-2">
                    <div className="mb-3">
                      <label htmlFor="gender" className="form-label label_text">
                        Gender <RequiredStar />
                      </label>
                      <select
                        name="gender"
                        value={employee.gender} // Bind this to the state
                        onChange={handleChange} // Update the state on change
                        className="form-select rounded-0"
                        id="gender"
                        aria-label="Default select example"
                        required
                      >
                        {/* <option value="">Select Gender</option> */}
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>


                  <div className="col-12 col-lg-6 mt-2">
                    <div className="mb-3">
                      <label htmlFor="email" className="form-label label_text">
                        Email <RequiredStar />
                      </label>
                      <input
                        type="email"
                        name="email"
                        maxLength={50}
                        placeholder="Update a Email...."
                        value={employee.email}
                        onChange={handleChange}
                        className="form-control rounded-0"
                        id="email"
                        required
                      />
                    </div>
                  </div>

                  <div className="col-12 col-lg-6 mt-2">
                    <div className="mb-3">
                      <label htmlFor="Department" className="form-label label_text">
                        Department <RequiredStar />
                      </label>
                      <select
                        name="department"
                        className="form-select rounded-0"
                        onChange={handleChange}
                        required
                      >
                        <option value="" disabled>
                          {employee.department.name}
                        </option>
                        {departments.map((department) => (
                          <option
                            key={department._id}
                            value={department._id}
                          >
                            {department.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="col-12 col-lg-6 mt-2">
                    <div className="mb-3">
                      <label htmlFor="Role" className="form-label label_text">
                        Designation <RequiredStar />
                      </label>
                      <select
                        name="designation"
                        className="form-select rounded-0"
                        onChange={handleChange}
                        value={employee.designation &&employee.designation._id}
                        required
                      >
                        <option value="" disabled>
                          {/* {employee.designation.name} */}
                          {employee.designation &&employee.designation.name}
                        </option>
                        {designations.map((designation) => (
                          <option
                            key={designation._id}
                            value={designation._id}
                          >
                            {designation.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="col-12 col-lg-6 mt-2">
                    <div className="mb-3">
                      <label htmlFor="HourlyRate" className="form-label label_text">
                        Hourly Rate <RequiredStar />
                      </label>
                      <div className="input-group border mb-3">
                        <span
                          className="input-group-text rounded-0 bg-white border-0"
                          id="basic-addon1"
                        >
                          <i className="fa-solid fa-indian-rupee-sign"></i>
                        </span>
                        <input
                          type="text"
                          name="hourlyRate"
                          value={employee.hourlyRate}
                          onChange={handleChange}
                          className="form-control rounded-0 border-0"
                          id="HourlyRate"
                          placeholder="eg. 10,000"
                          maxLength={10}
                          aria-label="Hourly Rate"
                          required
                        />
                      </div>
                    </div>
                  </div>

<div className="col-12 col-lg-6 mt-2">
  <div className="mb-3">
    <label htmlFor="target" className="form-label label_text">
      Target (only sales employee)
    </label>
    <div className="input-group border mb-3">
      <span
        className="input-group-text rounded-0 bg-white border-0"
        id="target-addon"
      >
        <i className="fa-solid fa-indian-rupee-sign"></i>
      </span>
      <input
        type="number"
        name="target"
        value={employee.target || ''}
        onChange={handleChange}
        className="form-control rounded-0 border-0"
        id="target"
        placeholder="eg. 2000000"
        min="0"
        maxLength={15}
        aria-label="Target"
      />
    </div>
  </div>
</div>

                  <div className="row">
                    <div className="col-12 pt-3 mt-2">
                      <button
                        type="submit"
                        onClick={handleEmpUpdate}
                        className="w-80 btn addbtn rounded-0 add_button m-2 px-4"
                      >
                        Update
                      </button>
                      <button
                        type="button"
                        onClick={handleUpdate}
                        className="w-80 btn addbtn rounded-0 Cancel_button m-2 px-4"
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

export default UpdateEmployeePopUp;
