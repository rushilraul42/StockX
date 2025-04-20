import React, { useState, useEffect } from "react";
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

const Market = () => {
    const [symbol, setSymbol] = useState("");
    const [debouncedSymbol, setDebouncedSymbol] = useState("");
    const [data, setData] = useState([]);
    const [stocks, setStocks] = useState([]);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const [timeRange, setTimeRange] = useState("6mo");
    const [prediction, setPrediction] = useState(null);
    const [apiStatus, setApiStatus] = useState("Checking API connection...");

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
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [symbol]);

    // Fetch data when symbol or time range changes
    useEffect(() => {
        if (debouncedSymbol) {
            console.log(`Symbol changed to: ${debouncedSymbol}, fetching data...`);
            fetchStockData(debouncedSymbol, timeRange);
            fetchPrediction(debouncedSymbol);
        }
    }, [debouncedSymbol, timeRange]);

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
                    price: typeof value.price === 'number' ? value.price.toFixed(2) : value.price
                }));
                console.log("Processed stock list:", stockArray);
                setStocks(stockArray);
            } else {
                console.warn("No top companies found in response");
                setStocks([]);
            }
        } catch (err) {
            console.error("Failed to fetch stock list:", err);
            setStocks([]);
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
                return;
            }
            
            const result = await response.json();
            console.log("Prediction result:", result);
            setPrediction(result);
        } catch (err) {
            console.error("Prediction error:", err);
            setPrediction(null);
        }
    };

    const trainModel = async (symbol) => {
        console.log(`Training model for ${symbol}...`);
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
            
            alert(result.message || "Model retrained.");
            fetchPrediction(symbol);
        } catch (err) {
            console.error("Retraining error:", err);
            alert(`Training failed: ${err.message}`);
        }
    };

    return (
        <div className="market-container">
            <h1>Stock Market Overview</h1>
            <div className={`api-status ${apiStatus.includes("Failed") ? "error" : ""}`}>{apiStatus}</div>

            <input
                type="text"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                placeholder="Search stocks (e.g. AAPL, MSFT)"
                className="search-box"
            />

            <div className="market-content">
                <div className="stock-table-container">
                    <h2>Top Companies</h2>
                    <table className="stock-table">
                        <thead>
                            <tr>
                                <th>Symbol</th>
                                <th>Price</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stocks.length > 0 ? (
                                stocks.map((stock) => (
                                    <tr key={stock.symbol} onClick={() => setSymbol(stock.symbol)}>
                                        <td>{stock.symbol}</td>
                                        <td>{stock.price === "N/A" ? "N/A" : `$${stock.price}`}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="2" className="loading">Loading stock data...</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="chart-container">
                    <h2>Stock Price Trend</h2>
                    {debouncedSymbol && <p>{debouncedSymbol} - {timeRange.toUpperCase()} Data</p>}

                    <div className="time-range-buttons">
                        {timeRanges.map(range => (
                            <button
                                key={range.value}
                                className={`time-button ${timeRange === range.value ? 'active' : ''}`}
                                onClick={() => setTimeRange(range.value)}
                            >
                                {range.label}
                            </button>
                        ))}
                    </div>

                    {loading && <p className="loading">Loading data...</p>}
                    {error && <p className="error">{error}</p>}

                    {!error && !loading && data.length > 0 && (
                        <ResponsiveContainer width="100%" height={400}>
                            <LineChart data={data} margin={{ top: 10, right: 30, left: 20, bottom: 30 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" />
                                <YAxis domain={["auto", "auto"]} />
                                <Tooltip />
                                <Line type="monotone" dataKey="price" stroke="#4CAF50" strokeWidth={3} />
                            </LineChart>
                        </ResponsiveContainer>
                    )}

                    {prediction && (
                        <div className="prediction-card">
                            <h3>AI Prediction for {prediction.symbol}</h3>
                            <p>Last Price: ${prediction.last_actual_price}</p>
                            <p>Next Day Forecast: <strong>${prediction.next_day_prediction}</strong></p>
                            <small>Trained on data from {prediction.training_range}</small>
                            <br />
                            <button onClick={() => trainModel(debouncedSymbol)}>🔁 Retrain Model</button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Market;