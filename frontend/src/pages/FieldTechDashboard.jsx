import { useState } from 'react';
import ModalForm from '../components/ModalForm';
import axios from 'axios';

function FieldTechDashboard() {
  const [modalOpen, setModalOpen] = useState(false);
  const [photo, setPhoto] = useState(null);
  const [notes, setNotes] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('file', photo);
    await axios.post('http://127.0.0.1:8000/inventory/upload', formData);
    setModalOpen(false);
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Field Tech Dashboard</h1>
      <button onClick={() => setModalOpen(true)}>Log Job</button>
      <ModalForm isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Log Job" onSubmit={handleSubmit}>
        <input type="file" onChange={e => setPhoto(e.target.files[0])} />
        <textarea placeholder="Notes" value={notes} onChange={e => setNotes(e.target.value)} />
      </ModalForm>
    </div>
  );
}

export default FieldTechDashboard;
