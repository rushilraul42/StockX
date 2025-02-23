import React, { useState } from "react";
import { auth, googleProvider } from "../firebase";
import { signInWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { useNavigate, Link } from "react-router-dom";
import { FaEye, FaEyeSlash } from "react-icons/fa"; // ✅ Eye icons
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

    // ✅ Email validation
    if (!email.includes("@") || (!email.endsWith(".com") && !email.endsWith(".in"))) {
      setError("Enter a valid email (must contain '@' and end with .com or .in)");
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
    <div className="login-container">
      <h2>Login</h2>
      {error && <p className="error-message">{error}</p>}

      <form onSubmit={handleLogin}>
        {/* Email Input */}
        <input
          type="email"
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        {/* Password Input with Eye Icon Inside */}
        <div className="password-container">
  <input
    type={showPassword ? "text" : "password"}
    placeholder="Password"
    value={password}
    onChange={(e) => setPassword(e.target.value)}
    required
  />
  <button
    type="button"
    className="toggle-password"
    onMouseDown={() => setShowPassword(true)}
    onMouseUp={() => setShowPassword(false)}
    onMouseLeave={() => setShowPassword(false)}
  >
    {showPassword ? <FaEyeSlash /> : <FaEye />}
  </button>
</div>


        <button type="submit">Login</button>
      </form>

      {/* Google Sign-In Button */}
      <button className="google-login-btn" onClick={handleGoogleLogin}>
        Sign in with Google
      </button>

      <p>
        Don't have an account? <Link to="/signup">Sign Up</Link>
      </p>
    </div>
  );
};

export default Login;
