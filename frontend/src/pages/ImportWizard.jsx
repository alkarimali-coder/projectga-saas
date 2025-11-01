import React, { useState } from "react";
import axios from "axios";

const ImportWizard = () => {
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);

  const handleUpload = async () => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await axios.post(`${import.meta.env.VITE_API_URL}/import/csv`, formData);
    setResult(res.data);
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <h2 className="text-xl font-bold mb-4">Import Data</h2>
      <input type="file" accept=".csv" onChange={(e) => setFile(e.target.files[0])} />
      <button onClick={handleUpload} className="mt-4 bg-green-600 text-white px-4 py-2 rounded">
        Upload
      </button>
      {result && (
        <pre className="mt-4 bg-gray-50 p-4 rounded">
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  );
};

export default ImportWizard;
