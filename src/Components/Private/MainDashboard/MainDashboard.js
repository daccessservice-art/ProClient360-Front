import { useState, useEffect } from "react";
import { Header } from "./Header/Header";
import { Sidebar } from "./Sidebar/Sidebar";
import { DashboardGroupBtn } from "./MainContent/DashboardGroupBtn";
import { CompanyInfo } from "./MainContent/CompanyInfo";
import { ProjectBar } from "./MainContent/ProjectBar";
import { ProjectDuration } from "./MainContent/ProjectDuration";
import { getDashboardData } from "../../../hooks/useCompany";
import "../EmployeeDashboard/EmployeeDashboard.css";

function MainDashboard() {
  const [isopen, setIsOpen] = useState(false);

  const [custCount, setCustCount] = useState([]);
  const [categorywise, setCategorywise] = useState({});
  const [valueWise, setValueWise] = useState([]);
  const [forbar, setForbar] = useState({});
  const [duration, setDuration] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        const data = await getDashboardData();
        console.log(data);

        if (data) {
          setCustCount(data.customerCount || []);
          setCategorywise(data.category.total || []);
          setForbar(data.category.category || []);
          setValueWise(data.valueWiseProjectData || []);
          setDuration(data.delayedProjectCountsByRange || []);
        }
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
        setLoading(false);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const toggle = () => {
    setIsOpen(!isopen);
  };

  return (
    <>
      {loading && (
        <div className="overlay">
          <span className="loader"></span>
        </div>
      )}

      <div className="container-scroller">
        <div className="row background_main_all ed-page">
          <Header toggle={toggle} isopen={isopen} />
          <div className="container-fluid page-body-wrapper">
            <Sidebar isopen={isopen} active="dashboard" />
            <div className="main-panel" style={{ width: isopen ? "" : "calc(100%  - 120px )", marginLeft: isopen ? "" : "125px" }}>
              <div className="content-wrapper ps-3 ps-md-0 ed-wrap">

                {/* Heading + customers + monthly review */}
                <DashboardGroupBtn custCount={custCount} />

                {/* KPI cards + status donut */}
                <CompanyInfo categorywise={categorywise} />

                {/* Category wise + value wise charts */}
                <ProjectBar forbar={forbar} valueWise={valueWise} />

                {/* Delayed projects chart */}
                <ProjectDuration duration={duration} />

              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default MainDashboard;