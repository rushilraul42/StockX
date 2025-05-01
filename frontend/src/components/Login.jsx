// Login.jsx
import React, { useState } from "react";
import { auth, googleProvider } from "../firebase";
import { signInWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { useNavigate, Link } from "react-router-dom";
import { FaEye, FaEyeSlash, FaGoogle, FaChartLine } from "react-icons/fa";
import "../styles/Login.css";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Please enter both email and password");
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate("/");
    } catch (error) {
      console.error("Login Error:", error);
      setError("Invalid email or password. Please try again.");
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      console.log("Google Sign-In Successful:", result.user);
      navigate("/");
    } catch (error) {
      console.error("Google Sign-In Error:", error);
      setError("Failed to sign in with Google.");
    }
  };

  return (
    <div className="login-page">
      <div className="login-background">
        <div className="login-grid-lines horizontal"></div>
        <div className="login-grid-lines vertical"></div>
      </div>
      
      <div className="login-container">
        <div className="login-logo">
          <FaChartLine />
          <h1>StockX</h1>
        </div>
        
        <h2>SYSTEM LOGIN</h2>
        
        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleLogin}>
          <div className="input-group">
            <label>USER EMAIL</label>
            <div className="input-field">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
              />
            </div>
          </div>

          <div className="input-group">
            <label>PASSWORD</label>
            <div className="input-field">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
              />
              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex="-1"
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          </div>

          <button type="submit" className="login-button">
            ACCESS SYSTEM
          </button>
        </form>

        <div className="login-separator">
          <span>OR</span>
        </div>

        <button className="google-login-btn" onClick={handleGoogleLogin}>
          <FaGoogle /> SIGN IN WITH GOOGLE
        </button>

        <div className="signup-link">
          NO ACCOUNT? <Link to="/signup">REGISTER</Link>
        </div>
      </div>
    </div>
  );
};

export default Login;