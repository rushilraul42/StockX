import React, { useState } from "react";

const StockData = () => {
    const [symbol, setSymbol] = useState("");
    const [price, setPrice] = useState(null);
    const [error, setError] = useState(null);

    const fetchStockPrice = async () => {
        setError(null);
        try {
            const response = await fetch(`http://127.0.0.1:8000/stock/${symbol}`);
            const data = await response.json();
            if (data.error) {
                setError(data.error);
                setPrice(null);
            } else {
                setPrice(data.price);
            }
        } catch (err) {
            setError("Failed to fetch stock data.");
        }
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
            <button onClick={fetchStockPrice}>Get Price</button>
            {price && <p>Stock Price: ${price.toFixed(2)}</p>}
            {error && <p style={{ color: "red" }}>{error}</p>}
        </div>
    );
};

export default StockData;
