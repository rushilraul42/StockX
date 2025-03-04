import React, { useState, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import "../styles/Market.css";

const Market = () => {
    const [symbol, setSymbol] = useState("");
    const [data, setData] = useState([]);
    const [stocks, setStocks] = useState([]);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const [timeRange, setTimeRange] = useState("6m");

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

    useEffect(() => {
        fetchStockList();
    }, []);

    useEffect(() => {
        if (symbol) {
            fetchStockData(symbol, timeRange);
        }
    }, [symbol, timeRange]);

    const fetchStockList = async () => {
        try {
            const response = await fetch("http://127.0.0.1:8000/top-companies");
            const result = await response.json();

            // ✅ Fix: Map API response correctly
            if (result.top_companies) {
                const stockArray = Object.keys(result.top_companies).map((key) => ({
                    symbol: key,
                    price: result.top_companies[key].price.toFixed(2),
                }));
                setStocks(stockArray);
            } else {
                setStocks([]);
            }
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

            console.log("API Response:", result.history);

            if (!result.history || result.history.length === 0) {
                setError("No historical data available.");
                setData([]);
                return;
            }

            const formattedData = result.history.map((item) => ({
                date: item.date ? item.date.substring(0, 10) : "N/A",
                price: item.close ?? 0,
            }));

            console.log("Formatted Data for Chart:", formattedData);

            // Clear and update data to force re-render
            setData([]);
            setTimeout(() => setData(formattedData), 10);
        } catch (err) {
            setLoading(false);
            setError("Failed to fetch stock data.");
            console.error(err);
        }
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
                            <th>Price</th>
                        </tr>
                    </thead>
                    <tbody>
                        {stocks.length > 0 ? (
                            stocks.map((stock) => (
                                <tr key={stock.symbol}>
                                    <td>{stock.symbol}</td>
                                    <td>${stock.price}</td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="2" className="loading">Loading stock data...</td>
                            </tr>
                        )}
                    </tbody>
                </table>

                {/* Graph Section */}
                <div className="chart-container">
                    <h2>Stock Price Trend</h2>
                    <p>{symbol} - {timeRange.toUpperCase()} Data</p>
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
                        <>
                            <div key={data.length}>
                                <ResponsiveContainer width="100%" height={400}>
                                    <LineChart data={data} margin={{ top: 10, right: 30, left: 20, bottom: 30 }}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="date" />
                                        <YAxis domain={["auto", "auto"]} />
                                        <Tooltip />
                                        <Line type="monotone" dataKey="price" stroke="#4CAF50" strokeWidth={3} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Market;
