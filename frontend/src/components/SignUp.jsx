import React, { useState } from "react";
import { auth, db } from "../firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore"; 
import { useNavigate } from "react-router-dom";

const SignUp = () => {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleSignUp = async (e) => {
    e.preventDefault();
    setError(null);

    console.log("Email entered:", email); // ✅ Debugging step

    if (!email.trim() || !password.trim() || !username.trim()) {
      setError("All fields are required");
      return;
    }

    try {
      // Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Store additional data (username) in Firestore
      await setDoc(doc(db, "users", user.uid), {
        username: username,
        email: email,
        uid: user.uid,
      });

      console.log("User registered:", user);
      navigate("/dashboard"); // Redirect to dashboard after successful signup
    } catch (error) {
      console.error("Firebase Auth Error:", error); // ✅ Debugging step
      setError(error.message);
    }
  };

  return (
    <div className="signup-container">
      <h2>Sign Up</h2>
      {error && <p className="error-message">{error}</p>}
      <form onSubmit={handleSignUp}>
        <input type="text" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} required />
        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <button type="submit">Sign Up</button>
      </form>

      {/* 🔙 Back Button */}
      <button onClick={() => navigate("/login")} className="back-button">
        ← Back to Login
      </button>
    </div>
  );
};

export default SignUp;
