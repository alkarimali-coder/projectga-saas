import { useState } from 'react';
import axios from 'axios';

function VendorPODownload({ jobId }) {
  const downloadPO = () => {
    axios.get(`http://127.0.0.1:8000/vendor/po/${jobId}`, {
      responseType: 'blob',
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    }).then(res => {
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `po_${jobId}.pdf`);
      document.body.appendChild(link);
      link.click();
    });
  };

  return <button onClick={downloadPO}>Download PO</button>;
}

export default VendorPODownload;
