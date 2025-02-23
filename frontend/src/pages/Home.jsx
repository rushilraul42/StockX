import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import "../styles/Home.css";
import StockData from "../components/StockData";

const Home = () => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/login"); // Redirect to login page after logout
    } catch (error) {
      console.error("Logout Error:", error);
    }
  };

  return (
    <>
      <div className="dashboard-container">
        <h2>StockX - Stock Market Prediction</h2>
        <p>Analyze stock trends with AI-powered predictions.</p>

        <h2>Welcome to StockX</h2>
        <p>Real-time stock market predictions and insights.</p>

        <div className="dashboard-links">
          <Link to="/market">Market</Link>
          <Link to="/settings">Settings</Link>
        </div>

        <button className="logout-btn" onClick={handleLogout}>Logout</button>
      </div>

      {/* Stock Data Section */}
      <div>
        <h1>Welcome to StockX</h1>
        <StockData />
      </div>
    </>
  );
};

export default Home;
