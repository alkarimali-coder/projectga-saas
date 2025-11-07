import React, { useEffect, useState } from "react";

const API_URL = `${import.meta.env.VITE_API_URL}/api/v1/machines`;

const Machines = () => {
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newMachine, setNewMachine] = useState({
    model: "",
    manufacturer: "",
    coam_id: "",
    qr_tag: "",
  });

  // Fetch machines from backend
  const fetchMachines = async () => {
    try {
      const res = await fetch(API_URL);
      const data = await res.json();
      setMachines(data.machines || []);
    } catch (err) {
      console.error("Error fetching machines:", err);
    } finally {
      setLoading(false);
    }
  };

  // Add a new machine
  const addMachine = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newMachine),
      });
      if (!res.ok) throw new Error("Failed to add machine");
      await fetchMachines();
      setNewMachine({ model: "", manufacturer: "", coam_id: "", qr_tag: "" });
    } catch (err) {
      console.error(err);
      alert("Error adding machine");
    }
  };

  useEffect(() => {
    fetchMachines();
  }, []);

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Machines</h2>

      {/* Add Machine Form */}
      <form onSubmit={addMachine} className="bg-white p-4 rounded shadow mb-6 flex flex-wrap gap-2">
        <input
          className="border px-3 py-2 rounded w-48"
          placeholder="Model"
          value={newMachine.model}
          onChange={(e) => setNewMachine({ ...newMachine, model: e.target.value })}
          required
        />
        <input
          className="border px-3 py-2 rounded w-48"
          placeholder="Manufacturer"
          value={newMachine.manufacturer}
          onChange={(e) => setNewMachine({ ...newMachine, manufacturer: e.target.value })}
          required
        />
        <input
          className="border px-3 py-2 rounded w-40"
          placeholder="COAM ID"
          value={newMachine.coam_id}
          onChange={(e) => setNewMachine({ ...newMachine, coam_id: e.target.value })}
          required
        />
        <input
          className="border px-3 py-2 rounded w-40"
          placeholder="QR Tag"
          value={newMachine.qr_tag}
          onChange={(e) => setNewMachine({ ...newMachine, qr_tag: e.target.value })}
          required
        />
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          + Add
        </button>
      </form>

      {/* Machines Table */}
      {loading ? (
        <p>Loading...</p>
      ) : machines.length === 0 ? (
        <p className="text-gray-500">No machines found.</p>
      ) : (
        <div className="overflow-x-auto bg-white rounded shadow">
          <table className="min-w-full text-sm text-left">
            <thead className="bg-gray-200">
              <tr>
                <th className="px-4 py-2">ID</th>
                <th className="px-4 py-2">Model</th>
                <th className="px-4 py-2">Manufacturer</th>
                <th className="px-4 py-2">COAM ID</th>
                <th className="px-4 py-2">QR Tag</th>
              </tr>
            </thead>
            <tbody>
              {machines.map((m) => (
                <tr key={m.id} className="border-t">
                  <td className="px-4 py-2">{m.id}</td>
                  <td className="px-4 py-2">{m.model}</td>
                  <td className="px-4 py-2">{m.manufacturer}</td>
                  <td className="px-4 py-2">{m.coam_id}</td>
                  <td className="px-4 py-2">{m.qr_tag}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Machines;
