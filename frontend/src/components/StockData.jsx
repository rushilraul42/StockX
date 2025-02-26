import React, { useState } from "react";

const StockData = () => {
    const [symbol, setSymbol] = useState("");
    const [price, setPrice] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    const fetchStockPrice = async () => {
        setError(null);
        setPrice(null);
        setLoading(true);

        const trimmedSymbol = symbol.trim().toUpperCase();
        if (!trimmedSymbol) {
            setError("Please enter a valid stock symbol.");
            setLoading(false);
            return;
        }

        try {
            const response = await fetch(`http://127.0.0.1:8000/stock/${trimmedSymbol}`);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || `Error ${response.status}: ${response.statusText}`);
            }
            const data = await response.json();
            setPrice(parseFloat(data.price)); // Ensure price is a number
        } catch (err) {
            setError(err.message || "Failed to fetch stock data. Please try again.");
        }
        setLoading(false);
    };

    return (
        <div>
            <h2>Stock Price Checker</h2>
            <input 
                type="text" 
                placeholder="Enter Stock Symbol (e.g. AAPL)" 
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
            />
            <button onClick={fetchStockPrice} disabled={loading}>
                {loading ? "Loading..." : "Get Price"}
            </button>
            {price !== null && <p>Stock Price: ${price.toFixed(2)}</p>}
            {error && <p style={{ color: "red" }}>{error}</p>}
        </div>
    );
};

export default StockData;
