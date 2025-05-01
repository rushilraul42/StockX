// App.jsx
import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from "react-router-dom";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "./firebase";
import Home from "./pages/Home";
import Login from "./components/Login";
import SignUp from "./components/SignUp";
import Market from "./components/Market";
import Portfolio from "./components/Portfolio";
import PortfolioMetrics from "./components/PortfolioMetrics";
import AlertsManager from "./components/AlertsManager";
import SentimentAnalysis from "./components/SentimentAnalysis";
import { FaChartLine, FaChartBar, FaNewspaper, FaUser } from "react-icons/fa";
import "./styles/App.css";

const App = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout Error:", error);
    }
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>LOADING STOCKX...</p>
      </div>
    );
  }

  return (
    <Router>
      {user && (
        <nav className="navbar">
          <h1>StockX</h1>
          <ul>
            <li><Link to="/"><FaChartLine /> Home</Link></li>
            <li><Link to="/market"><FaChartBar /> Market</Link></li>
            <li><Link to="/portfolio"><FaUser /> Portfolio</Link></li>
            <li><Link to="/sentiment"><FaNewspaper /> Sentiment</Link></li>
            <li><button className="logout-btn" onClick={handleLogout}>Logout</button></li>
          </ul>
        </nav>
      )}

      <Routes>
        <Route path="/" element={user ? <Home /> : <Navigate to="/login" />} />
        <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
        <Route path="/signup" element={user ? <Navigate to="/" /> : <SignUp />} />
        <Route path="/market" element={user ? <Market /> : <Navigate to="/login" />} />
        <Route path="/portfolio" element={
          user ? (
            <div className="portfolio-container">
              <Portfolio />
              <PortfolioMetrics />
              <AlertsManager />
            </div>
          ) : <Navigate to="/login" />
        } />
        <Route path="/sentiment" element={user ? <SentimentAnalysis /> : <Navigate to="/login" />} />
        {/* Add the missing insights route - redirecting to sentiment for now */}
        <Route path="/insights" element={user ? <Navigate to="/sentiment" /> : <Navigate to="/login" />} />
      </Routes>
    </Router>
  );
};

export default App;