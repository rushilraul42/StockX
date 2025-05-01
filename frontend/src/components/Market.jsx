// Market.jsx
import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    CartesianGrid
} from "recharts";
import "../styles/Market.css";
import { auth, db } from "../firebase";
import { collection, addDoc, doc, getDoc, updateDoc, setDoc } from "firebase/firestore";
import { FaShoppingCart, FaHome } from "react-icons/fa";

const Market = () => {
    const navigate = useNavigate();
    const [symbol, setSymbol] = useState("");
    const [debouncedSymbol, setDebouncedSymbol] = useState("");
    const [data, setData] = useState([]);
    const [stocks, setStocks] = useState([]);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const [timeRange, setTimeRange] = useState("6mo");
    const [prediction, setPrediction] = useState(null);
    const [apiStatus, setApiStatus] = useState("Checking API connection...");
    const [trainingStatus, setTrainingStatus] = useState({});
    const [showPrediction, setShowPrediction] = useState(false);
    const [inputValid, setInputValid] = useState(false);
    const [showBuyModal, setShowBuyModal] = useState(false);
    const [buyAmount, setBuyAmount] = useState(1);
    const [selectedStock, setSelectedStock] = useState(null);
    const [userBalance, setUserBalance] = useState(0);
    const [buyError, setBuyError] = useState(null);

    const API_BASE_URL = "http://127.0.0.1:8000";

    const timeRanges = [
        { label: '1D', value: '1d' },
        { label: '5D', value: '5d' },
        { label: '1M', value: '1mo' },
        { label: '3M', value: '3mo' },
        { label: '6M', value: '6mo' },
        { label: '1Y', value: '1y' },
        { label: '5Y', value: '5y' },
        { label: 'MAX', value: 'max' }
    ];

    // Check API connectivity on mount
    useEffect(() => {
        checkApiConnection();
    }, []);

    // Fetch top companies once API is confirmed connected
    useEffect(() => {
        if (apiStatus.includes("API Connected")) {
            fetchStockList();
        }
    }, [apiStatus]);

    // Fetch user balance on mount
    useEffect(() => {
        fetchUserBalance();
    }, []);

    // Check if the API is accessible
    const checkApiConnection = async () => {
        try {
            console.log("Checking API connection...");
            const response = await fetch(`${API_BASE_URL}/`);
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            const result = await response.json();
            console.log("API Response:", result);
            setApiStatus(`API Connected: ${result.message}`);
        } catch (err) {
            console.error("API Connection Error:", err);
            setApiStatus("⚠️ API Connection Failed - Check if backend is running");
        }
    };

    // Debounce effect for search input
    useEffect(() => {
        const timer = setTimeout(() => {
            if (symbol.trim()) {
                setDebouncedSymbol(symbol);
                // Reset prediction state when symbol changes
                setPrediction(null);
                setShowPrediction(false);
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [symbol]);

    // Fetch data when symbol or time range changes
    useEffect(() => {
        if (debouncedSymbol) {
            console.log(`Symbol changed to: ${debouncedSymbol}, fetching data...`);
            fetchStockData(debouncedSymbol, timeRange);
            validateSymbol(debouncedSymbol);
        }
    }, [debouncedSymbol, timeRange]);

    const validateSymbol = async (symbol) => {
        try {
            const response = await fetch(`${API_BASE_URL}/stock/${symbol}`);
            setInputValid(response.ok);
        } catch (err) {
            setInputValid(false);
        }
    };

    const fetchStockList = async () => {
        console.log("Fetching top companies list...");
        try {
            const response = await fetch(`${API_BASE_URL}/top-companies`);
            console.log("Top companies response status:", response.status);
            
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            
            const result = await response.json();
            console.log("Top companies data:", result);
            
            if (result.top_companies) {
                const stockArray = Object.entries(result.top_companies).map(([key, value]) => ({
                    symbol: key,
                    price: typeof value.price === 'number' ? value.price.toFixed(2) : value.price,
                    prediction: null
                }));
                console.log("Processed stock list:", stockArray);
                setStocks(stockArray);
                
                // Check for available models
                fetchAvailableModels();
            } else {
                console.warn("No top companies found in response");
                setStocks([]);
            }
        } catch (err) {
            console.error("Failed to fetch stock list:", err);
            setStocks([]);
        }
    };
    
    const fetchAvailableModels = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/models`);
            if (!response.ok) {
                return;
            }
            
            const result = await response.json();
            console.log("Available models:", result);
            
            if (result.trained_models && result.trained_models.length > 0) {
                // Fetch predictions for all trained models
                for (const modelSymbol of result.trained_models) {
                    fetchStockPrediction(modelSymbol);
                }
            }
        } catch (err) {
            console.error("Error fetching available models:", err);
        }
    };
    
    const fetchStockPrediction = async (stockSymbol) => {
        try {
            const response = await fetch(`${API_BASE_URL}/predict/${stockSymbol}`);
            if (!response.ok) {
                return;
            }
            
            const result = await response.json();
            console.log(`Prediction for ${stockSymbol}:`, result);
            
            // Update the stocks array with prediction
            setStocks(prevStocks => 
                prevStocks.map(stock => 
                    stock.symbol === stockSymbol 
                        ? { 
                            ...stock, 
                            prediction: result.next_day_prediction,
                            last_price: result.last_actual_price 
                        } 
                        : stock
                )
            );
            
            // If this is the current symbol and showPrediction is true, update prediction
            if (stockSymbol === debouncedSymbol && showPrediction) {
                setPrediction(result);
            }
        } catch (err) {
            console.error(`Error fetching prediction for ${stockSymbol}:`, err);
        }
    };

    const fetchStockData = async (symbol, range) => {
        console.log(`Fetching history for ${symbol} with range ${range}...`);
        setError(null);
        setLoading(true);
        const start = Date.now();

        try {
            const url = `${API_BASE_URL}/stock/${symbol}/history?range=${range}`;
            console.log("Fetching from URL:", url);
            
            const response = await fetch(url);
            console.log(`History response status for ${symbol}:`, response.status);
            
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            
            const result = await response.json();
            console.log(`[⏱️ ${symbol}] Fetch time: ${Date.now() - start}ms`);
            console.log("History data:", result);

            setLoading(false);

            if (!result.history || result.history.length === 0) {
                console.warn("No historical data available");
                setError("No historical data available.");
                setData([]);
                return;
            }

            const formattedData = result.history.map((item) => ({
                date: item.date ? item.date.substring(0, 10) : "N/A",
                price: item.close ?? 0,
            }));
            
            console.log("Formatted data (first 3 items):", formattedData.slice(0, 3));
            setData(formattedData);
        } catch (err) {
            setLoading(false);
            console.error("Error fetching stock data:", err);
            setError(`Failed to fetch stock data: ${err.message}`);
        }
    };

    const fetchPrediction = async (symbol) => {
        console.log(`Fetching prediction for ${symbol}...`);
        try {
            const url = `${API_BASE_URL}/predict/${symbol}`;
            console.log("Prediction URL:", url);
            
            const response = await fetch(url);
            console.log("Prediction response status:", response.status);
            
            if (!response.ok) {
                console.warn(`Prediction not available for ${symbol} (${response.status})`);
                setPrediction(null);
                return null;
            }
            
            const result = await response.json();
            console.log("Prediction result:", result);
            setPrediction(result);
            return result;
        } catch (err) {
            console.error("Prediction error:", err);
            setPrediction(null);
            return null;
        }
    };

    const handlePredict = async () => {
        if (!debouncedSymbol) return;
        
        const existingModel = await fetchPrediction(debouncedSymbol);
        
        if (existingModel) {
            setShowPrediction(true);
        } else {
            // No model exists, train a new one
            await trainModel(debouncedSymbol);
            setShowPrediction(true);
        }
    };

    const trainModel = async (symbol) => {
        console.log(`Training model for ${symbol}...`);
        setTrainingStatus(prev => ({ ...prev, [symbol]: "Training..." }));
        
        try {
            const response = await fetch(`${API_BASE_URL}/train/${symbol}`, {
                method: "POST"
            });
            
            console.log("Training response status:", response.status);
            
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            
            const result = await response.json();
            console.log("Training result:", result);
            
            setTrainingStatus(prev => ({ ...prev, [symbol]: "Success!" }));
            setTimeout(() => {
                setTrainingStatus(prev => {
                    const newStatus = { ...prev };
                    delete newStatus[symbol];
                    return newStatus;
                });
            }, 3000);
            
            // Fetch prediction for the trained model
            fetchStockPrediction(symbol);
            
            // If it's the currently selected symbol, update the main prediction too
            if (symbol === debouncedSymbol) {
                fetchPrediction(symbol);
            }
        } catch (err) {
            console.error("Retraining error:", err);
            setTrainingStatus(prev => ({ ...prev, [symbol]: "Failed" }));
            setTimeout(() => {
                setTrainingStatus(prev => {
                    const newStatus = { ...prev };
                    delete newStatus[symbol];
                    return newStatus;
                });
            }, 3000);
        }
    };

    // Fetch user balance
    const fetchUserBalance = async () => {
        if (!auth.currentUser) return;
        
        try {
            const balanceRef = doc(db, "userBalances", auth.currentUser.uid);
            const balanceSnap = await getDoc(balanceRef);
            
            if (balanceSnap.exists()) {
                setUserBalance(balanceSnap.data().balance);
            } else {
                // Initialize balance if it doesn't exist
                await setDoc(balanceRef, { balance: 10000 });
                setUserBalance(10000);
            }
        } catch (err) {
            console.error("Error fetching user balance:", err);
        }
    };

    // Open buy modal
    const openBuyModal = (stock) => {
        setSelectedStock(stock);
        setBuyAmount(1);
        setBuyError(null);
        setShowBuyModal(true);
    };

    // Handle stock purchase
    const handleBuyStock = async () => {
        if (!auth.currentUser || !selectedStock) return;
        
        const stockPrice = parseFloat(selectedStock.price);
        const quantity = parseInt(buyAmount);
        const totalCost = stockPrice * quantity;
        
        // Validate purchase
        if (totalCost > userBalance) {
            setBuyError("Insufficient funds for this purchase.");
            return;
        }
        
        try {
            // Update user balance
            const balanceRef = doc(db, "userBalances", auth.currentUser.uid);
            const newBalance = userBalance - totalCost;
            await updateDoc(balanceRef, { balance: newBalance });
            
            // Add stock to portfolio
            await addDoc(collection(db, "portfolios"), {
                userId: auth.currentUser.uid,
                symbol: selectedStock.symbol,
                shares: quantity,
                buyPrice: stockPrice,
                investment: totalCost,
                purchaseDate: new Date().toISOString()
            });
            
            // Update local state
            setUserBalance(newBalance);
            setShowBuyModal(false);
            
            // Show success message or notification
            alert(`Successfully purchased ${quantity} shares of ${selectedStock.symbol}`);
        } catch (err) {
            console.error("Error buying stock:", err);
            setBuyError("Failed to complete purchase. Please try again.");
        }
    };

    // Function to buy current search symbol 
    const handleBuyCurrentStock = () => {
        if (!debouncedSymbol || !inputValid || data.length === 0) return;
        
        // Get latest price from data
        const latestPrice = data[data.length - 1]?.price;
        if (!latestPrice) return;
        
        const stockInfo = {
            symbol: debouncedSymbol,
            price: latestPrice
        };
        
        openBuyModal(stockInfo);
    };

    return (
        <div className="market-container">
            <div className="market-header">
                <Link to="/" className="home-button">
                    <FaHome /> HOME
                </Link>
                <h1>NASDAQ
                    
                     MARKET</h1>
            </div>
            
            <div className="market-status">
                <p className={apiStatus.includes("Failed") ? "error" : ""}>
                    {apiStatus}
                </p>
            </div>
            
            <div className="balance-display">
                <div className="balance-label">AVAILABLE FUNDS</div>
                <div className="balance-amount">${userBalance.toFixed(2)}</div>
            </div>

            <div className="market-content">
                <div className="search-controls">
                    <div className="search-bar">
                        <input
                            type="text"
                            placeholder="ENTER STOCK SYMBOL (e.g., AAPL)"
                            value={symbol}
                            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                        />
                        <button 
                            className="search-button" 
                            disabled={!debouncedSymbol || !inputValid}
                            onClick={handleBuyCurrentStock}
                        >
                            <FaShoppingCart /> BUY
                        </button>
                    </div>
                    
                    {debouncedSymbol && inputValid && (
                        <div className="time-range-controls">
                            {timeRanges.map((range) => (
                                <button
                                    key={range.value}
                                    className={timeRange === range.value ? "active" : ""}
                                    onClick={() => setTimeRange(range.value)}
                                >
                                    {range.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {debouncedSymbol && inputValid && data.length > 0 && (
                    <>
                        <div className="chart-container">
                            <h2>{debouncedSymbol} PRICE CHART</h2>
                            {loading ? (
                                <div className="loading">Loading chart data...</div>
                            ) : (
                                <ResponsiveContainer width="100%" height={300}>
                                    <LineChart data={data}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis
                                            dataKey="date"
                                            tick={{ fontSize: 12 }}
                                            tickFormatter={(value) => {
                                                if (timeRange === "1d" || timeRange === "5d") {
                                                    return value.substring(5);
                                                }
                                                return value;
                                            }}
                                        />
                                        <YAxis domain={["auto", "auto"]} />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Line
                                            type="monotone"
                                            dataKey="price"
                                            stroke="#00ff66"
                                            strokeWidth={2}
                                            dot={false}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                        
                        <div className="prediction-container">
                            <h3>MARKET FORECAST</h3>
                            <button 
                                className="predict-button" 
                                onClick={handlePredict}
                                disabled={!inputValid}
                            >
                                GET PREDICTION
                            </button>
                            
                            {trainingStatus[debouncedSymbol] && (
                                <div className="training-status">
                                    {trainingStatus[debouncedSymbol]}
                                </div>
                            )}
                            
                            {showPrediction && prediction && (
                                <div className="prediction-details">
                                    <div className="prediction-item">
                                        <span className="label">CURRENT PRICE</span>
                                        <span className="value">${prediction.last_actual_price}</span>
                                    </div>
                                    
                                    <span className="prediction-arrow">→</span>
                                    
                                    <div className="prediction-item">
                                        <span className="label">NEXT DAY FORECAST</span>
                                        <span className={`value predicted ${
                                            prediction.next_day_prediction > prediction.last_actual_price 
                                                ? "positive" 
                                                : "negative"
                                        }`}>
                                            ${prediction.next_day_prediction}
                                            <span className="prediction-change">
                                                {prediction.next_day_prediction > prediction.last_actual_price ? "↑" : "↓"}
                                                {((Math.abs(prediction.next_day_prediction - prediction.last_actual_price) / prediction.last_actual_price) * 100).toFixed(2)}%
                                            </span>
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </>
                )}

                <div className="stock-table-section">
                    <h2>TOP COMPANIES</h2>
                    {stocks.length > 0 ? (
                        <table className="stock-table">
                            <thead>
                                <tr>
                                    <th>SYMBOL</th>
                                    <th>PRICE</th>
                                    <th>FORECAST</th>
                                    <th>ACTION</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stocks.map((stock) => (
                                    <tr key={stock.symbol}>
                                        <td className="clickable" onClick={() => setSymbol(stock.symbol)}>
                                            {stock.symbol}
                                        </td>
                                        <td>${stock.price}</td>
                                        <td>
                                            {stock.prediction ? (
                                                <span className={`prediction-value ${
                                                    stock.prediction > stock.last_price 
                                                        ? "positive" 
                                                        : "negative"
                                                }`}>
                                                    ${stock.prediction}
                                                    <span className="prediction-trend">
                                                        {stock.prediction > stock.last_price ? "↑" : "↓"}
                                                        {((Math.abs(stock.prediction - stock.last_price) / stock.last_price) * 100).toFixed(2)}%
                                                    </span>
                                                </span>
                                            ) : (
                                                "N/A"
                                            )}
                                        </td>
                                        <td>
                                            <button 
                                                className="buy-button"
                                                onClick={() => openBuyModal(stock)}
                                            >
                                                <FaShoppingCart /> BUY
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <p className="loading-message">Loading top companies...</p>
                    )}
                </div>
            </div>

            {/* Buy Modal */}
            {showBuyModal && selectedStock && (
                <div className="modal-overlay">
                    <div className="buy-modal">
                        <h3>BUY {selectedStock.symbol}</h3>
                        <div className="stock-price">Current Price: ${selectedStock.price}</div>
                        
                        <div className="balance-display">
                            <div className="balance-label">AVAILABLE FUNDS</div>
                            <div className="balance-amount">${userBalance.toFixed(2)}</div>
                        </div>
                        
                        <div className="shares-input">
                            <label htmlFor="shares">NUMBER OF SHARES</label>
                            <input
                                type="number"
                                id="shares"
                                min="1"
                                value={buyAmount}
                                onChange={(e) => setBuyAmount(Math.max(1, parseInt(e.target.value) || 1))}
                            />
                        </div>
                        
                        <div className="transaction-summary">
                            <div className="total-label">TOTAL INVESTMENT</div>
                            <div className="total-cost">${(parseFloat(selectedStock.price) * buyAmount).toFixed(2)}</div>
                        </div>
                        
                        {buyError && (
                            <div className="buy-error">{buyError}</div>
                        )}
                        
                        <div className="modal-actions">
                            <button className="confirm-button" onClick={handleBuyStock}>
                                CONFIRM PURCHASE
                            </button>
                            <button className="cancel-button" onClick={() => setShowBuyModal(false)}>
                                CANCEL
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Custom tooltip for the chart
const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="custom-tooltip">
                <p className="tooltip-date">{label}</p>
                <p className="tooltip-price">${payload[0].value.toFixed(2)}</p>
            </div>
        );
    }
    return null;
};

export default Market;