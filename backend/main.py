from fastapi import FastAPI, HTTPException
import yfinance as yf
from fastapi.middleware.cors import CORSMiddleware
import os

app = FastAPI()

# ✅ Dynamic CORS for production
frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")  # Default to local dev

app.add_middleware(
    CORSMiddleware,
    allow_origins=[frontend_url],  # Use dynamic frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ✅ Manual stock data (fallback)
manual_stock_data = {
    "TSLA": 204.78,
    "AAPL": 176.30,
    "GOOGL": 2750.50,
    "MSFT": 329.40,
    "AMZN": 142.65
}

@app.get("/")
def read_root():
    """Root endpoint for API health check."""
    return {"message": "StockX API is running!"}

@app.get("/stock/{symbol}")
def get_stock(symbol: str):
    """Fetch the latest closing price of a stock."""
    try:
        stock = yf.Ticker(symbol)
        data = stock.history(period="1d")

        # ✅ If no data found, use manual fallback
        if data.empty or data["Close"].dropna().empty:
            if symbol.upper() in manual_stock_data:
                return {"symbol": symbol.upper(), "price": manual_stock_data[symbol.upper()]}
            else:
                raise HTTPException(status_code=404, detail=f"No data found for {symbol}")

        return {
            "symbol": symbol.upper(),
            "price": round(data["Close"].dropna().iloc[-1], 2)  # Rounded for better readability
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@app.get("/stocks/")
def get_multiple_stocks(symbols: str):
    """Fetch latest prices for multiple stocks (comma-separated symbols)."""
    try:
        symbol_list = [s.strip().upper() for s in symbols.split(",")]
        data = yf.download(symbol_list, period="1d")["Close"]

        prices = {}
        for symbol in symbol_list:
            # ✅ If data exists, fetch the price
            if symbol in data.columns:
                last_price = data[symbol].dropna().iloc[-1] if not data[symbol].dropna().empty else None
                prices[symbol] = {"price": round(last_price, 2) if last_price else "N/A"}
            elif symbol in manual_stock_data:
                prices[symbol] = {"price": manual_stock_data[symbol]}
            else:
                prices[symbol] = {"price": "N/A"}

        return prices
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@app.get("/stock/{symbol}/history")
def get_stock_history(symbol: str):
    """Fetch historical stock prices for the maximum available period."""
    try:
        stock = yf.Ticker(symbol)
        history = stock.history(period="max")  # Fetch all available data

        if history.empty or history["Close"].dropna().empty:
            raise HTTPException(status_code=404, detail=f"No historical data found for {symbol}")

        history_data = [{"date": str(idx.date()), "close": round(row["Close"], 2)} for idx, row in history.iterrows()]
        return {"symbol": symbol, "history": history_data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

# ✅ Run the backend
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
