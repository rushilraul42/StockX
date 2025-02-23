import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "./firebase";
import Home from "./pages/Home";
import Login from "./components/Login";
import SignUp from "./components/SignUp"; 
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

  if (loading) return <p>Loading...</p>;

  return (
    <Router>
      {user && (
        <nav className="navbar">
          <h1>StockX</h1>
          <ul>
            <li><Navigate to="/" replace /></li>
            <li><button className="logout-btn" onClick={handleLogout}>Logout</button></li>
          </ul>
        </nav>
      )}

      <Routes>
        <Route path="/" element={user ? <Home /> : <Navigate to="/login" />} />
        <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
        <Route path="/signup" element={user ? <Navigate to="/" /> : <SignUp />} />
      </Routes>
    </Router>
  );
};

export default App;
