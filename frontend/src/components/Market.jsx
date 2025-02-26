import React, { useState, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import "../styles/Market.css";

const Market = () => {
    const [symbol, setSymbol] = useState("AAPL");
    const [data, setData] = useState([]);
    const [stocks, setStocks] = useState([]);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const [timeRange, setTimeRange] = useState("6m"); // Default: 6 months

    useEffect(() => {
        fetchStockList();
    }, []);

    useEffect(() => {
        fetchStockData(symbol, timeRange);
    }, [symbol, timeRange]); // Fetch when symbol OR timeRange changes

    const fetchStockList = async () => {
        try {
            const response = await fetch("http://127.0.0.1:8000/stock/list");
            const result = await response.json();
            setStocks(result.stocks || []);
        } catch (err) {
            console.error("Failed to fetch stock list:", err);
        }
    };

    const fetchStockData = async (symbol, range) => {
        setError(null);
        setLoading(true);
        console.log(`Fetching data for ${symbol} with range ${range}`); 
    
        try {
            const response = await fetch(`http://127.0.0.1:8000/stock/${symbol}/history?range=${range}`);
            const result = await response.json();
            setLoading(false);
    
            console.log("API Response:", result.history); // 🛠️ DEBUG LOG
    
            if (!result.history || result.history.length === 0) {
                setError("No historical data available.");
                setData([]); 
                return;
            }
    
            const formattedData = result.history.map((item) => ({
                date: item.date ? item.date.substring(0, 10) : "N/A",
                price: item.close ?? 0,
            }));
    
            console.log("Formatted Data for Chart:", formattedData); // 🛠️ DEBUG LOG
            setData(formattedData);
        } catch (err) {
            setLoading(false);
            setError("Failed to fetch stock data.");
            console.error(err);
        }
    };
    

    const handleTimeRangeChange = (range) => {
        console.log(`Button clicked: ${range}`); // Debug log
        setTimeRange(range); // Triggers useEffect to call fetchStockData
    };

    return (
        <div className="market-container">
            <h1>Stock Market Overview</h1>
            <input
                type="text"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                placeholder="Search stocks"
                className="search-box"
            />

            <div className="market-content">
                <table className="stock-table">
                    <thead>
                        <tr>
                            <th>Symbol</th>
                            <th>Name</th>
                            <th>Price</th>
                            <th>Change</th>
                        </tr>
                    </thead>
                    <tbody>
                        {stocks.length > 0 ? (
                            stocks.map((stock) => (
                                <tr key={stock.symbol}>
                                    <td>{stock.symbol}</td>
                                    <td>{stock.name}</td>
                                    <td>${stock.price.toFixed(2)}</td>
                                    <td className={stock.change >= 0 ? "green" : "red"}>
                                        {stock.change >= 0 ? "▲" : "▼"} {stock.change.toFixed(2)}%
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="4" className="loading">Loading stock data...</td>
                            </tr>
                        )}
                    </tbody>
                </table>

                {/* Graph Section */}
                <div className="chart-container">
                    <h2>Stock Price Trend</h2>
                    <p>{symbol} - {timeRange.toUpperCase()} Data</p>
                    {loading && <p className="loading">Loading data...</p>}
                    {error && <p className="error">{error}</p>}

                    {!error && !loading && data.length > 0 && (
                        <>
                            <ResponsiveContainer width="100%" height={400}>
                                <LineChart data={data} margin={{ top: 10, right: 30, left: 20, bottom: 30 }}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="date" />
                                    <YAxis domain={["auto", "auto"]} />
                                    <Tooltip />
                                    <Line type="monotone" dataKey="price" stroke="#4CAF50" strokeWidth={3} />
                                </LineChart>
                            </ResponsiveContainer>

                            {/* Time Range Buttons */}
                            <div className="time-buttons">
                                {["1d", "5d", "1m", "3m", "6m", "1y", "5y", "max"].map((range) => (
                                    <button
                                        key={range}
                                        className={timeRange === range ? "active" : ""}
                                        onClick={() => handleTimeRangeChange(range)}
                                    >
                                        {range.toUpperCase()}
                                    </button>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Market;
