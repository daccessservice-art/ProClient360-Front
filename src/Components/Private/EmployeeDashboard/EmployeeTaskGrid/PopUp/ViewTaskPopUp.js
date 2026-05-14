import { useState, useEffect } from "react";
import TaskListUpdatedPopUp from "./TaskListUpdatedPopUp";
import { getMyTaskSheet } from "../../../../../hooks/useTaskSheet";
import { formatDate } from "../../../../../utils/formatDate";

const ViewTaskPopUp = ({ handleViewTask, selectedId }) => {
  const [updateTaskPopUpShow, setUpdateTaskPopUpShow] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [selectedTask, setSelectedTask] = useState({});

  const handleUpdateTask = (id) => {
    setSelectedTask(id);
    setUpdateTaskPopUpShow(!updateTaskPopUpShow);
  };

  useEffect(() => {
    const fetchData = async () => {
      const data = await getMyTaskSheet(selectedId);
      if (data) {
        setTasks(data.task || []);
      }
    };
    fetchData();
  }, [updateTaskPopUpShow]);

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
        <div className="modal-dialog modal-xl modal_table_width">
          <div className="modal-content p-3">
            <form>
              <div className="modal-header pt-0">
                <h5 className="card-title fw-bold" id="exampleModalLongTitle">
                  Task List
                </h5>
                <button
                  onClick={() => handleViewTask()}
                  type="button"
                  className="close px-3"
                  style={{ marginLeft: "auto" }}
                >
                  <span aria-hidden="true">&times;</span>
                </button>
              </div>
              <div className="modal-body " >
                <div className=" row bg-white p-2 m-1 border rounded modal_body_height" style={{ maxWidth: '60vw' }}>
                  <div className="col-12 py-2">
                    <div className="table-responsive">
                      <table className="table table-striped table-class" id="table-id">
                        <tr className="th_border">
                          <th>Task No.</th>
                          <th>Task Name</th>
                          <th>Subtask Name</th>
                          <th>Start Date</th>
                          <th>End Date</th>
                          <th>Remarks</th>
                          <th>Status</th>
                          <th>Action</th>
                        </tr>
                        <tbody className="broder my-4">
                          {tasks && tasks.length > 0 ? (
                            tasks.map((task, index) => (
                              <tr className="border my-4" key={task.id}>
                                <td className="w-10">{index + 1}</td>
                                <td className="text-wrap">{task.taskName.name}</td>
                                {/* Display Subtask Name */}
                                <td className="text-wrap text-primary fw-bold">{task.subtaskName || "-"}</td>
                                <td className="w-20">{formatDate(task.startDate)}</td>
                                <td className="w-20">{formatDate(task.endDate)}</td>
                                <td className="w-30">{task.remark||"N/A"}</td>
                                <td className="w-20">{task.taskStatus}</td>
                                <td>
                                  <span onClick={() => handleUpdateTask(task)} className={`update_icon`}>
                                    <i className={`fa-solid fa-pen text-success cursor-pointer me-3`}></i>
                                  </span>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan="8" className="text-center"> {/* ✅ Changed colspan to 8 */}
                                No tasks assigned
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>

      {updateTaskPopUpShow ? (
        <TaskListUpdatedPopUp
          selectedTask={selectedTask}
          handleUpdateTask={handleUpdateTask}
        />
      ) : (
        <></>
      )}
    </>
  );
};

export default ViewTaskPopUp;