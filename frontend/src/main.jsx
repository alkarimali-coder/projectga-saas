import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import DashboardLayout from "./layouts/DashboardLayout";
import Machines from "./pages/Machines";
import Home from "./pages/Home";
import WorkOrders from "./pages/WorkOrders";
import Inventory from "./pages/Inventory";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DashboardLayout />}>
          <Route index element={<Home />} />
          <Route path="machines" element={<Machines />} />
          <Route path="work-orders" element={<WorkOrders />} />
          <Route path="inventory" element={<Inventory />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);

