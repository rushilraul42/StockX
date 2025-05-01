// Home.jsx - GTA 5 Style
import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import "../styles/Home.css";
import StockData from "../components/StockData";

const Home = () => {
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  
  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/login"); // Redirect to login page after logout
    } catch (error) {
      console.error("Logout Error:", error);
    }
  };
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="gta-home-page">
      <header className="gta-header">
        <div className="header-content">
          <div className="logo">
            <Link to="/">
              <h1>StockX</h1>
            </Link>
          </div>
          
          <nav className="main-nav">
            <ul>
              <li><Link to="/" className="active">Home</Link></li>
              <li><Link to="/market">Market</Link></li>
              <li><Link to="/portfolio">Portfolio</Link></li>
              <li><Link to="/sentiment">Sentiment</Link></li>
            </ul>
          </nav>
          
          <div className="header-right">
            <div className="profile-dropdown" ref={dropdownRef}>
              <button 
                className="profile-button" 
                onClick={() => setDropdownOpen(!dropdownOpen)}
              >
                <div className="profile-icon">
                  <span>{auth.currentUser ? auth.currentUser.email[0].toUpperCase() : 'U'}</span>
                </div>
                <span className="profile-name">
                  {auth.currentUser ? 
                    (auth.currentUser.displayName || auth.currentUser.email) : 
                    'User'}
                </span>
                <i className={`arrow ${dropdownOpen ? 'up' : 'down'}`}></i>
              </button>
              
              {dropdownOpen && (
                <div className="dropdown-menu">
                  <Link to="/profile">Profile</Link>
                  <Link to="/account">Account</Link>
                  <Link to="/settings">Settings</Link>
                  <div className="dropdown-divider"></div>
                  <button onClick={handleLogout}>Logout</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="gta-main-content">
        <section className="hero-section">
          <div className="hero-content">
            <h1>NASDAQ MARKET</h1>
            <p>Trade stocks with AI-powered predictions and analytics</p>
            <div className="hero-buttons">
              <Link to="/market" className="primary-button">ENTER MARKET</Link>
              <Link to="/portfolio" className="secondary-button">VIEW PORTFOLIO</Link>
            </div>
          </div>
          <div className="hero-image">
            <div className="chart-illustration"></div>
          </div>
        </section>

        <section className="features-section">
          <div className="feature-card">
            <div className="feature-icon prediction-icon"></div>
            <h3>PRICE PREDICTIONS</h3>
            <p>Get next-day forecasts powered by LSTM models</p>
          </div>
          
          <div className="feature-card">
            <div className="feature-icon sentiment-icon"></div>
            <h3>SENTIMENT ANALYSIS</h3>
            <p>News sentiment analysis with VADER technology</p>
          </div>
          
          <div className="feature-card">
            <div className="feature-icon portfolio-icon"></div>
            <h3>PORTFOLIO TRACKING</h3>
            <p>Monitor your investments and performance</p>
          </div>
        </section>

        <section className="market-overview">
          <h2>MARKET OVERVIEW</h2>
          <div className="stock-data-container">
            <StockData />
          </div>
          <div className="view-more">
            <Link to="/market">VIEW DETAILED MARKET ANALYSIS</Link>
          </div>
        </section>
      </main>

      <footer className="gta-footer">
        <div className="footer-content">
          <p>&copy; 2025 StockX. All rights reserved.</p>
          <div className="footer-links">
            <a href="/terms">Terms of Service</a>
            <a href="/privacy">Privacy Policy</a>
            <a href="/contact">Contact Us</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;