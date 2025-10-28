import React from 'react';

function ModalForm({ isOpen, onClose, title, children, onSubmit }) {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        background: 'white',
        padding: '2rem',
        borderRadius: '8px',
        width: '400px',
        maxHeight: '80vh',
        overflowY: 'auto'
      }}>
        <h2 style={{ margin: '0 0 1rem 0' }}>{title}</h2>
        <form onSubmit={onSubmit}>
          {children}
          <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <button type="submit" style={{ padding: '0.5rem 1rem' }}>Save</button>
            <button type="button" onClick={onClose} style={{ padding: '0.5rem 1rem' }}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ModalForm;
