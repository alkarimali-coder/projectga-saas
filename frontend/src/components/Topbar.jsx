import React from "react";

const Topbar = ({ onToggleSidebar }) => {
  return (
    <header className="h-14 bg-white shadow flex items-center justify-between px-6">
      <div className="flex items-center space-x-3">
        <button
          onClick={onToggleSidebar}
          className="text-gray-600 hover:text-black focus:outline-none text-xl"
        >
          ☰
        </button>
        <h1 className="text-xl font-semibold text-gray-800">COAM Dashboard</h1>
      </div>
      <input
        type="text"
        placeholder="Search..."
        className="border rounded px-3 py-1 text-sm w-64"
      />
    </header>
  );
};

export default Topbar;
