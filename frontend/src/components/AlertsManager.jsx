// AlertsManager.jsx
import React, { useState, useEffect } from "react";
import { auth, db } from "../firebase";
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  doc, 
  deleteDoc,
  serverTimestamp 
} from "firebase/firestore";
import { FaBell, FaTrash, FaPlus } from "react-icons/fa";
import "../styles/AlertsManager.css";

const AlertsManager = () => {
  const [alerts, setAlerts] = useState([]);
  const [newAlert, setNewAlert] = useState({
    symbol: "",
    condition: "above",
    price: "",
    active: true
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [symbolSuggestions, setSymbolSuggestions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    if (!auth.currentUser) return;

    setLoading(true);
    try {
      const q = query(
        collection(db, "alerts"),
        where("userId", "==", auth.currentUser.uid)
      );
      
      const querySnapshot = await getDocs(q);
      const alertsData = [];
      
      querySnapshot.forEach((doc) => {
        alertsData.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      // Sort by creation date (newest first)
      alertsData.sort((a, b) => b.createdAt?.toDate() - a.createdAt?.toDate());
      
      setAlerts(alertsData);
    } catch (err) {
      console.error("Error fetching alerts:", err);
      setError("Failed to load alerts. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const searchSymbols = async (query) => {
    if (!query || query.length < 2) {
      setSymbolSuggestions([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(`http://127.0.0.1:8000/search-symbol?query=${query}`);
      
      if (response.ok) {
        const data = await response.json();
        setSymbolSuggestions(data.results || []);
      } else {
        setSymbolSuggestions([]);
      }
    } catch (err) {
      console.error("Error searching symbols:", err);
      setSymbolSuggestions([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    setNewAlert(prev => ({
      ...prev,
      [name]: value
    }));

    if (name === "symbol") {
      searchSymbols(value);
    }
  };

  const selectSymbol = (symbol) => {
    setNewAlert(prev => ({
      ...prev,
      symbol
    }));
    
    setSymbolSuggestions([]);
  };

  const createAlert = async (e) => {
    e.preventDefault();
    
    if (!auth.currentUser) return;
    
    if (!newAlert.symbol || !newAlert.price) {
      setError("Please fill in all required fields");
      return;
    }

    try {
      // Create new alert in Firestore
      await addDoc(collection(db, "alerts"), {
        userId: auth.currentUser.uid,
        symbol: newAlert.symbol.toUpperCase(),
        condition: newAlert.condition,
        price: parseFloat(newAlert.price),
        active: true,
        triggered: false,
        createdAt: serverTimestamp()
      });
      
      // Reset form
      setNewAlert({
        symbol: "",
        condition: "above",
        price: "",
        active: true
      });
      
      // Hide form
      setShowForm(false);
      
      // Refresh alerts
      fetchAlerts();
    } catch (err) {
      console.error("Error creating alert:", err);
      setError("Failed to create alert. Please try again.");
    }
  };

  const deleteAlert = async (alertId) => {
    try {
      await deleteDoc(doc(db, "alerts", alertId));
      
      // Update local state
      setAlerts(alerts.filter(alert => alert.id !== alertId));
    } catch (err) {
      console.error("Error deleting alert:", err);
      setError("Failed to delete alert. Please try again.");
    }
  };

  const toggleForm = () => {
    setShowForm(!showForm);
    setError(null);
  };

  return (
    <div className="alerts-manager">
      <div className="alerts-header">
        <h2><FaBell /> PRICE ALERTS</h2>
        <button className="add-alert-btn" onClick={toggleForm}>
          {showForm ? "CANCEL" : <><FaPlus /> NEW ALERT</>}
        </button>
      </div>

      {error && <div className="alert-error-message">{error}</div>}

      {showForm && (
        <div className="new-alert-form">
          <form onSubmit={createAlert}>
            <div className="form-group">
              <label>STOCK SYMBOL</label>
              <div className="symbol-input-container">
                <input
                  type="text"
                  name="symbol"
                  value={newAlert.symbol}
                  onChange={handleInputChange}
                  placeholder="e.g., AAPL"
                  autoComplete="off"
                  required
                />
                {isSearching && <div className="symbol-searching">Searching...</div>}
                {symbolSuggestions.length > 0 && (
                  <div className="symbol-suggestions">
                    {symbolSuggestions.map((suggestion, index) => (
                      <div 
                        key={index} 
                        className="suggestion-item"
                        onClick={() => selectSymbol(suggestion.symbol)}
                      >
                        <span className="suggestion-symbol">{suggestion.symbol}</span>
                        <span className="suggestion-name">{suggestion.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>CONDITION</label>
                <select
                  name="condition"
                  value={newAlert.condition}
                  onChange={handleInputChange}
                  required
                >
                  <option value="above">PRICE ABOVE</option>
                  <option value="below">PRICE BELOW</option>
                </select>
              </div>

              <div className="form-group">
                <label>PRICE ($)</label>
                <input
                  type="number"
                  name="price"
                  value={newAlert.price}
                  onChange={handleInputChange}
                  placeholder="Enter price"
                  step="0.01"
                  min="0.01"
                  required
                />
              </div>
            </div>

            <button type="submit" className="create-alert-btn">CREATE ALERT</button>
          </form>
        </div>
      )}

      {loading ? (
        <div className="alerts-loading">LOADING ALERTS...</div>
      ) : alerts.length === 0 ? (
        <div className="no-alerts">
          <p>YOU HAVE NO PRICE ALERTS SET</p>
          <button className="create-first-alert-btn" onClick={() => setShowForm(true)}>
            <FaPlus /> CREATE YOUR FIRST ALERT
          </button>
        </div>
      ) : (
        <div className="alerts-list">
          {alerts.map(alert => (
            <div key={alert.id} className={`alert-item ${alert.triggered ? 'triggered' : ''}`}>
              <div className="alert-symbol">{alert.symbol}</div>
              <div className="alert-details">
                <div className="alert-condition">
                  PRICE {alert.condition.toUpperCase()} ${alert.price.toFixed(2)}
                </div>
                <div className="alert-status">
                  {alert.triggered ? 'TRIGGERED' : 'ACTIVE'}
                </div>
              </div>
              <div className="alert-actions">
                <button 
                  className="delete-alert-btn" 
                  onClick={() => deleteAlert(alert.id)}
                  title="Delete alert"
                >
                  <FaTrash />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AlertsManager;