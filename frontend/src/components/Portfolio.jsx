// Portfolio.jsx
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { auth, db } from "../firebase";
import { collection, query, where, getDocs, doc, setDoc, updateDoc, deleteDoc, getDoc } from "firebase/firestore";
import { FaCoins, FaTrash, FaHome } from "react-icons/fa";
import "../styles/Portfolio.css";

const Portfolio = () => {
  const [portfolio, setPortfolio] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [balance, setBalance] = useState(10000); // Default starting balance
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const fetchPortfolio = async () => {
      if (!auth.currentUser) return;

      setLoading(true);
      try {
        // Fetch user's balance
        const balanceRef = doc(db, "userBalances", auth.currentUser.uid);
        const balanceSnap = await getDoc(balanceRef);
        
        if (balanceSnap.exists()) {
          setBalance(balanceSnap.data().balance);
        } else {
          // Initialize user's balance if it doesn't exist
          await setDoc(balanceRef, { balance: 10000 });
        }

        // Fetch user's portfolio
        const q = query(
          collection(db, "portfolios"),
          where("userId", "==", auth.currentUser.uid)
        );
        
        const querySnapshot = await getDocs(q);
        const portfolioData = [];
        
        for (const doc of querySnapshot.docs) {
          const stockData = doc.data();
          
          // Fetch current stock price for each holding
          try {
            const response = await fetch(`http://127.0.0.1:8000/stock/${stockData.symbol}`);
            if (response.ok) {
              const data = await response.json();
              const currentValue = stockData.shares * data.price;
              const profit = currentValue - stockData.investment;
              const profitPercentage = (profit / stockData.investment) * 100;
              
              portfolioData.push({
                id: doc.id,
                ...stockData,
                currentPrice: data.price,
                currentValue,
                profit,
                profitPercentage
              });
            }
          } catch (err) {
            console.error(`Failed to fetch current price for ${stockData.symbol}`, err);
            portfolioData.push({
              id: doc.id,
              ...stockData,
              currentPrice: "N/A",
              currentValue: "N/A",
              profit: "N/A",
              profitPercentage: "N/A"
            });
          }
        }
        
        setPortfolio(portfolioData);
      } catch (err) {
        console.error("Error fetching portfolio:", err);
        setError("Failed to load portfolio. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchPortfolio();
  }, [refreshKey]);

  const sellStock = async (stockId, stockSymbol, shares, currentPrice) => {
    if (!auth.currentUser) return;
    
    try {
      // Delete stock from portfolio
      await deleteDoc(doc(db, "portfolios", stockId));
      
      // Update user balance
      const balanceRef = doc(db, "userBalances", auth.currentUser.uid);
      const balanceSnap = await getDoc(balanceRef);
      
      if (balanceSnap.exists()) {
        const newBalance = balanceSnap.data().balance + (shares * currentPrice);
        await updateDoc(balanceRef, { balance: newBalance });
        setBalance(newBalance);
      }
      
      // Refresh portfolio
      setRefreshKey(prev => prev + 1);
    } catch (err) {
      console.error("Error selling stock:", err);
      setError("Failed to sell stock. Please try again.");
    }
  };

  // Calculate total portfolio value
  const totalValue = portfolio.reduce((sum, stock) => {
    return stock.currentValue !== "N/A" ? sum + stock.currentValue : sum;
  }, 0);

  // Calculate total investment
  const totalInvestment = portfolio.reduce((sum, stock) => sum + stock.investment, 0);

  // Calculate total profit/loss
  const totalProfit = totalValue - totalInvestment;
  const totalProfitPercentage = totalInvestment > 0 ? (totalProfit / totalInvestment) * 100 : 0;

  return (
    <div className="portfolio-container">
      <div className="portfolio-header">
        <Link to="/" className="home-button">
          <FaHome /> HOME
        </Link>
        <h1>MY PORTFOLIO</h1>
      </div>
      
      <div className="portfolio-summary">
        <div className="summary-card balance">
          <h2>AVAILABLE BALANCE</h2>
          <p className="balance-amount">${balance.toFixed(2)}</p>
        </div>
        
        <div className="summary-card value">
          <h2>PORTFOLIO VALUE</h2>
          <p className="value-amount">${totalValue.toFixed(2)}</p>
          <p className={`profit ${totalProfit >= 0 ? 'positive' : 'negative'}`}>
            {totalProfit >= 0 ? '+' : ''}{totalProfit.toFixed(2)} 
            ({totalProfitPercentage.toFixed(2)}%)
          </p>
        </div>
      </div>
      
      {loading ? (
        <p className="loading-text">LOADING YOUR PORTFOLIO...</p>
      ) : error ? (
        <p className="error-text">{error}</p>
      ) : portfolio.length === 0 ? (
        <div className="empty-portfolio">
          <h2>YOUR PORTFOLIO IS EMPTY</h2>
          <p>Start building your portfolio by buying stocks in the Market section.</p>
        </div>
      ) : (
        <div className="portfolio-table-container">
          <table className="portfolio-table">
            <thead>
              <tr>
                <th>SYMBOL</th>
                <th>SHARES</th>
                <th>AVG. BUY PRICE</th>
                <th>INVESTMENT</th>
                <th>CURRENT PRICE</th>
                <th>CURRENT VALUE</th>
                <th>PROFIT/LOSS</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {portfolio.map((stock) => (
                <tr key={stock.id}>
                  <td>{stock.symbol}</td>
                  <td>{stock.shares}</td>
                  <td>${stock.buyPrice.toFixed(2)}</td>
                  <td>${stock.investment.toFixed(2)}</td>
                  <td>${stock.currentPrice !== "N/A" ? stock.currentPrice.toFixed(2) : "N/A"}</td>
                  <td>${stock.currentValue !== "N/A" ? stock.currentValue.toFixed(2) : "N/A"}</td>
                  <td className={`${stock.profit >= 0 ? 'positive' : 'negative'}`}>
                    {stock.profit !== "N/A" ? (
                      <>
                        {stock.profit >= 0 ? '+' : ''}{stock.profit.toFixed(2)} 
                        ({stock.profitPercentage.toFixed(2)}%)
                      </>
                    ) : "N/A"}
                  </td>
                  <td>
                    <button 
                      className="sell-button"
                      onClick={() => sellStock(stock.id, stock.symbol, stock.shares, stock.currentPrice)}
                      disabled={stock.currentPrice === "N/A"}
                    >
                      <FaTrash /> SELL
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Portfolio;