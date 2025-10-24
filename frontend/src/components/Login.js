import React, { useState } from "react";
import axios from "axios";

const Login = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setMessage("");

    try {
      const response = await axios.post(
        "http://127.0.0.1:8000/auth/login",
        new URLSearchParams({ username: email, password }),
        { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
      );

      localStorage.setItem("token", response.data.access_token);
      console.log("✅ Login success:", response.data);
      
      // CALLBACK TO REDIRECT
      if (onLoginSuccess) {
        onLoginSuccess();
      }
    } catch (err) {
      console.error("❌ Login error:", err.response?.data || err.message);
      setMessage("❌ Invalid email or password");
    }
  };

  return (
    <div style={{ maxWidth: "400px", margin: "100px auto", padding: "20px", border: "1px solid #ccc", borderRadius: "10px", textAlign: "center" }}>
      <h2>🎰 PROJECTGA - COAM SaaS</h2>
      <form onSubmit={handleLogin}>
        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} style={{ width: "100%", marginBottom: "10px", padding: "8px" }} required />
        <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} style={{ width: "100%", marginBottom: "10px", padding: "8px" }} required />
        <button type="submit" style={{ width: "100%", padding: "10px", backgroundColor: "#007bff", color: "white", border: "none", borderRadius: "5px" }}>
          🚀 Login
        </button>
      </form>
      <p style={{ marginTop: "10px", color: message.includes("✅") ? "green" : "red" }}>{message}</p>
    </div>
  );
};

export default Login;
