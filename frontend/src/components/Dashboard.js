import React, { useState, useEffect } from "react";
import axios from "axios";

const Dashboard = () => {
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    console.log("🔑 TOKEN FOUND:", token ? "YES" : "NO");
    
    if (token) {
      // FIXED: PROPER TOKEN HEADER
      axios.get("http://127.0.0.1:8000/inventory", {
        headers: { 
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      }).then(res => {
        console.log("✅ DASHBOARD DATA:", res.data);
        setMachines(res.data);
        setLoading(false);
      }).catch(err => {
        console.error("❌ DASHBOARD ERROR:", err.response?.status);
        setError("Failed to load inventory");
        setLoading(false);
      });
    } else {
      window.location.href = "/";
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    window.location.href = "/";
  };

  if (loading) return <div style={{textAlign:"center", padding:"50px"}}>Loading Dashboard...</div>;
  if (error) return <div style={{textAlign:"center", padding:"50px", color:"red"}}>{error}</div>;

  return (
    <div style={{padding:"20px"}}>
      <div style={{display:"flex", justifyContent:"space-between", marginBottom:"20px"}}>
        <h1>🎰 COAM Inventory Dashboard</h1>
        <button onClick={handleLogout} style={{padding:"10px", background:"#dc3545", color:"white", border:"none", borderRadius:"5px"}}>
          Logout
        </button>
      </div>
      
      <div style={{background:"#f8f9fa", padding:"15px", borderRadius:"8px", marginBottom:"20px"}}>
        <h3>📊 Stats</h3>
        <p><strong>Total Machines:</strong> {machines.length}</p>
        <p><strong>Total Revenue:</strong> ${machines.reduce((sum, m) => sum + (m.revenue || 0), 0).toFixed(2)}</p>
      </div>

      <table style={{width:"100%", borderCollapse:"collapse"}}>
        <thead>
          <tr style={{background:"#007bff", color:"white"}}>
            <th style={{border:"1px solid #ddd", padding:"12px"}}>ID</th>
            <th style={{border:"1px solid #ddd", padding:"12px"}}>Location</th>
            <th style={{border:"1px solid #ddd", padding:"12px"}}>Type</th>
            <th style={{border:"1px solid #ddd", padding:"12px"}}>Status</th>
            <th style={{border:"1px solid #ddd", padding:"12px"}}>Revenue</th>
          </tr>
        </thead>
        <tbody>
          {machines.length === 0 ? (
            <tr>
              <td colSpan="5" style={{textAlign:"center", padding:"40px", color:"#666"}}>
                🎰 No machines yet! Add your first COAM machine to get started.
              </td>
            </tr>
          ) : (
            machines.map((machine, index) => (
              <tr key={index} style={{backgroundColor: index % 2 === 0 ? "#f8f9fa" : "white"}}>
                <td style={{border:"1px solid #ddd", padding:"12px"}}>{machine.id}</td>
                <td style={{border:"1px solid #ddd", padding:"12px"}}>{machine.location}</td>
                <td style={{border:"1px solid #ddd", padding:"12px"}}>{machine.type}</td>
                <td style={{border:"1px solid #ddd", padding:"12px"}}>{machine.status}</td>
                <td style={{border:"1px solid #ddd", padding:"12px"}}>${machine.revenue}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default Dashboard;
