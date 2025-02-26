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

# ✅ Predefined top companies
TOP_COMPANIES = ["AAPL", "MSFT", "AMZN", "GOOGL", "TSLA", "NVDA", "META"]

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

        if data.empty or data["Close"].dropna().empty:
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

        if data.empty:
            raise HTTPException(status_code=404, detail="No stock data available")

        prices = {
            symbol: {"price": round(data[symbol].dropna().iloc[-1], 2) if not data[symbol].dropna().empty else "N/A"}
            for symbol in symbol_list
        }

        return prices
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

# Update the default range from "6m" to "6mo"
@app.get("/stock/{symbol}/history")
def get_stock_history(symbol: str, range: str = "6mo"):
    """Fetch historical stock prices for the specified time range.
    Valid periods: 1d, 5d, 1mo, 3mo, 6mo, 1y, 2y, 5y, 10y, ytd, max
    """
    try:
        stock = yf.Ticker(symbol)
        # Convert common format to yfinance format
        range_mapping = {
            "1m": "1mo",
            "3m": "3mo",
            "6m": "6mo"
        }
        adjusted_range = range_mapping.get(range, range)
        history = stock.history(period=adjusted_range)

        if history.empty or history["Close"].dropna().empty:
            raise HTTPException(status_code=404, detail=f"No historical data found for {symbol}")

        history_data = [{"date": str(idx.date()), "close": round(row["Close"], 2)} for idx, row in history.iterrows()]
        return {"symbol": symbol, "history": history_data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@app.get("/top-companies")
def get_top_companies():
    """Fetch latest stock prices of the top companies dynamically from Yahoo Finance."""
    try:
        data = yf.download(TOP_COMPANIES, period="1d")["Close"]

        if data.empty:
            raise HTTPException(status_code=404, detail="No stock data available")

        stock_prices = {
            symbol: {"price": round(data[symbol].dropna().iloc[-1], 2) if not data[symbol].dropna().empty else "N/A"}
            for symbol in TOP_COMPANIES
        }

        return {"top_companies": stock_prices}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching top company data: {str(e)}")  

# ✅ Run the backend
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
