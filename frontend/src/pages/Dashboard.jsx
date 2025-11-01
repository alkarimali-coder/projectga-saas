import React, { useEffect, useState } from "react";
import axios from "axios";
import { Bar } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from "chart.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const Dashboard = () => {
  const [jobs, setJobs] = useState([]);
  const [page, setPage] = useState(1);
  const perPage = 6;

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const response = await axios.get(`${import.meta.env.VITE_API_URL}/service/jobs`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
        });
        setJobs(response.data.filter(job => job.id <= 6)); // only 1-6
      } catch (err) {
        console.error("Failed to fetch jobs");
      }
    };
    fetchJobs();
  }, []);

  const start = (page - 1) * perPage;
  const paginated = jobs.slice(start, start + perPage);
  const totalPages = Math.ceil(jobs.length / perPage);

  const chartData = {
    labels: paginated.map(job => `Job ${job.id}`),
    datasets: [{
      label: "Machine ID",
      data: paginated.map(job => job.machine_id),
      backgroundColor: "rgba(59, 130, 246, 0.6)",
    }]
  };

  return (
    <div>
      <h1 style={{ fontSize: "1.8rem", fontWeight: "bold" }}>Welcome, {localStorage.getItem("user_email")}!</h1>
      <p style={{ color: "#555" }}>Showing jobs 1-6</p>

      <div style={{ marginTop: "2rem" }}>
        <h2 style={{ fontSize: "1.4rem", fontWeight: "bold" }}>Jobs Table</h2>
        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "1rem" }}>
          <thead>
            <tr style={{ background: "#f3f4f6" }}>
              <th style={{ padding: "0.5rem", border: "1px solid #ddd" }}>ID</th>
              <th style={{ padding: "0.5rem", border: "1px solid #ddd" }}>Machine</th>
              <th style={{ padding: "0.5rem", border: "1px solid #ddd" }}>Status</th>
              <th style={{ padding: "0.5rem", border: "1px solid #ddd" }}>Notes</th>
            </tr>
          </thead>
          <tbody>
            {paginated.map(job => (
              <tr key={job.id}>
                <td style={{ padding: "0.5rem", border: "1px solid #ddd" }}>{job.id}</td>
                <td style={{ padding: "0.5rem", border: "1px solid #ddd" }}>{job.machine_id}</td>
                <td style={{ padding: "0.5rem", border: "1px solid #ddd" }}>{job.status}</td>
                <td style={{ padding: "0.5rem", border: "1px solid #ddd" }}>{job.notes}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ marginTop: "1rem" }}>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
            ← Previous
          </button>
          <span style={{ margin: "0 1rem" }}>Page {page} of {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
            Next →
          </button>
        </div>
      </div>

      <div style={{ marginTop: "3rem" }}>
        <h2 style={{ fontSize: "1.4rem", fontWeight: "bold" }}>Job Graph</h2>
        <Bar data={chartData} options={{ responsive: true }} />
      </div>
    </div>
  );
};

export default Dashboard;
