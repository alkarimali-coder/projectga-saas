import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import axios from "axios";
import { Bar } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from "chart.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const Dashboard = () => {
  const [jobs, setJobs] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const response = await axios.get(`${import.meta.env.VITE_API_URL}/service/jobs`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
        });
        setJobs(response.data);
      } catch (err) {
        setError("Failed to fetch jobs");
      }
    };
    fetchJobs();
  }, []);

  const chartData = {
    labels: jobs.map(job => `Job ${job.id}`),
    datasets: [{
      label: "Machine IDs",
      data: jobs.map(job => job.machine_id),
      backgroundColor: "rgba(59, 130, 246, 0.6)",
      borderColor: "rgba(59, 130, 246, 1)",
      borderWidth: 1
    }]
  };

  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>Welcome, {localStorage.getItem("user_email")}!</h1>
      <h2>Service Jobs</h2>
      {error && <p style={{ color: "red" }}>{error}</p>}
      <pre>{JSON.stringify(jobs, null, 2)}</pre>
      <h2>Job Graph</h2>
      <Bar data={chartData} options={{ responsive: true }} />
    </div>
  );
};

ReactDOM.createRoot(document.getElementById("root")).render(<Dashboard />);
