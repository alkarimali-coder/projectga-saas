import React from "react";
import { Link, useLocation } from "react-router-dom";

const Sidebar = ({ isOpen, onToggle }) => {
  const location = useLocation();
  const links = [
    { path: "/", label: "Home", icon: "🏠" },
    { path: "/machines", label: "Machines", icon: "🎰" },
    { path: "/work-orders", label: "Work Orders", icon: "🧾" },
    { path: "/inventory", label: "Inventory", icon: "📦" },
  ];

  return (
    <aside
      className={`${
        isOpen ? "w-64" : "w-16"
      } bg-gray-900 text-white flex flex-col transition-all duration-300`}
    >
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <span className={`font-bold ${!isOpen && "hidden"}`}>COAM</span>
        <button onClick={onToggle} className="text-gray-400 hover:text-white">
          ☰
        </button>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {links.map((link) => {
          const active = location.pathname === link.path;
          return (
            <Link
              key={link.path}
              to={link.path}
              className={`block px-3 py-2 rounded transition-colors ${
                active ? "bg-gray-700 text-yellow-400" : "hover:bg-gray-700"
              }`}
            >
              {isOpen ? link.label : link.icon}
            </Link>
          );
        })}
      </nav>

      <div className={`p-4 text-sm border-t border-gray-700 ${!isOpen && "hidden"}`}>
        © 2025 Coam Core
      </div>
    </aside>
  );
};

export default Sidebar;
