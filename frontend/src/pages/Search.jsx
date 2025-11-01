import React, { useState } from "react";
import axios from "axios";

const Search = () => {
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);

  const handleSearch = async () => {
    if (!q.trim()) return;
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/search?q=${q}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      setResults(res.data);
    } catch (err) {
      alert("Search failed");
    }
  };

  return (
    <div>
      <h1 style={{ fontSize: "1.8rem", fontWeight: "bold" }}>Search Jobs</h1>
      <input
        type="text"
        placeholder="Type 'Urgent' or 'Test'"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        style={{ padding: "0.5rem", width: "300px", marginRight: "1rem" }}
      />
      <button onClick={handleSearch} style={{ padding: "0.5rem 1rem", background: "#2563eb", color: "white", border: "none" }}>
        Search
      </button>
      <div style={{ marginTop: "2rem" }}>
        <h2>Results</h2>
        {results.length === 0 ? <p>No results</p> : (
          <ul>
            {results.map(job => (
              <li key={job.id}>ID: {job.id} | Machine: {job.machine_id} | Notes: {job.notes}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default Search;
