#main.py
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from tensorflow.keras.models import load_model
import yfinance as yf
import numpy as np
import pandas as pd  # Added pandas import
import os
import logging
from train_model import train_stock_model
import traceback
from sentiment_analysis import fetch_news_headlines, fetch_news_sentiment  # Import sentiment functions

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI()

# CORS setup
frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Predefined top companies
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
            "price": round(data["Close"].dropna().iloc[-1], 2)
        }
    except Exception as e:
        logger.error(f"Error in /stock/{symbol}: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@app.get("/stocks/")
def get_multiple_stocks(symbols: str):
    """Fetch latest prices for multiple stocks (comma-separated symbols)."""
    try:
        symbol_list = [s.strip().upper() for s in symbols.split(",")]
        data = yf.download(symbol_list, period="1d")["Close"]

        if data.empty:
            raise HTTPException(status_code=404, detail="No stock data available")

        prices = {}
        
        # Handle both single and multiple symbols
        if isinstance(data, np.ndarray) or isinstance(data, pd.Series):
            prices = {symbol_list[0]: {"price": round(float(data.iloc[-1]), 2) if not pd.isna(data.iloc[-1]) else "N/A"}}
        else:
            for symbol in symbol_list:
                if symbol in data.columns:
                    price_series = data[symbol].dropna()
                    prices[symbol] = {"price": round(float(price_series.iloc[-1]), 2) if not price_series.empty else "N/A"}
                else:
                    prices[symbol] = {"price": "N/A"}

        return prices
    except Exception as e:
        logger.error(f"Error in /stocks/: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@app.get("/stock/{symbol}/history")
def get_stock_history(symbol: str, range: str = "6mo"):
    """Fetch historical stock prices for the specified time range."""
    try:
        stock = yf.Ticker(symbol)
        history = stock.history(period=range)

        if history.empty or history["Close"].dropna().empty:
            raise HTTPException(status_code=404, detail=f"No historical data found for {symbol}")

        history_data = [
            {"date": str(idx.date()), "close": round(row["Close"], 2)}
            for idx, row in history.iterrows()
        ]
        return {"symbol": symbol, "history": history_data}
    except Exception as e:
        logger.error(f"Error in /stock/{symbol}/history: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@app.get("/top-companies")
def get_top_companies():
    """Fetch latest stock prices of the top companies dynamically from Yahoo Finance."""
    try:
        data = yf.download(TOP_COMPANIES, period="1d")["Close"]
        
        if data.empty:
            raise HTTPException(status_code=404, detail="No stock data available")

        # Process data
        stock_prices = {}
        
        # Handle case where there's only one data point
        if len(TOP_COMPANIES) == 1:
            single_price = data.iloc[-1] if not pd.isna(data.iloc[-1]) else None
            stock_prices[TOP_COMPANIES[0]] = {"price": round(single_price, 2) if single_price else "N/A"}
        else:
            for symbol in TOP_COMPANIES:
                if symbol in data.columns:
                    price_value = data[symbol].iloc[-1] if not pd.isna(data[symbol].iloc[-1]) else None
                    stock_prices[symbol] = {"price": round(price_value, 2) if price_value else "N/A"}
                else:
                    stock_prices[symbol] = {"price": "N/A"}

        return {"top_companies": stock_prices}
    except Exception as e:
        logger.error(f"Error in /top-companies: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Error fetching top company data: {str(e)}")


@app.post("/train/{symbol}")
def train_model(symbol: str, epochs: int = 10):
    """Train a stock prediction model for a given symbol."""
    try:
        logger.info(f"Training model for {symbol} with {epochs} epochs...")
        train_stock_model(symbol.upper(), epochs)
        return {"status": "success", "message": f"Model for {symbol.upper()} trained successfully."}
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))
    except Exception as e:
        logger.error(f"Error training model for {symbol}: {e}")
        raise HTTPException(status_code=500, detail=f"Training failed: {str(e)}")


@app.get("/predict/{symbol}")
async def predict(symbol: str):
    """Predict the next day's stock price using the trained model."""
    try:
        model_path = f"model_{symbol}.keras"
        scaler_path = f"scaler_{symbol}.npy"

        if not os.path.exists(model_path) or not os.path.exists(scaler_path):
            raise HTTPException(status_code=404, detail="Model or scaler not found for this symbol")

        model = load_model(model_path)
        scaler_min, scaler_max = np.load(scaler_path)

        stock = yf.Ticker(symbol)
        data = stock.history(period="60d")['Close'].values

        if len(data) < 60:
            raise HTTPException(status_code=400, detail="Not enough data for prediction (60 days required).")

        scaled_data = (data - scaler_min) / (scaler_max - scaler_min)
        X = np.reshape(scaled_data[-60:], (1, 60, 1))

        prediction = model.predict(X)[0][0]
        predicted_price = prediction * (scaler_max - scaler_min) + scaler_min

        return {
            "symbol": symbol,
            "last_actual_price": round(float(data[-1]), 2),
            "next_day_prediction": round(float(predicted_price), 2),
            "training_range": f"From {stock.history(period='max').index[0].date()} to present"
        }
    except Exception as e:
        logger.error(f"Prediction error for {symbol}: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/models")
def list_available_models():
    """Lists all trained models available in the server."""
    try:
        models = [
            f.split("_")[1].replace(".keras", "")
            for f in os.listdir()
            if f.startswith("model_") and f.endswith(".keras")
        ]
        return {"trained_models": models}
    except Exception as e:
        logger.error(f"Error listing models: {e}")
        raise HTTPException(status_code=500, detail="Failed to list models")


# New sentiment analysis endpoint
@app.get("/sentiment/{symbol}")
async def get_sentiment(symbol: str):
    """Get sentiment analysis for news related to a stock symbol."""
    try:
        logger.info(f"Analyzing sentiment for {symbol}")
        
        # Get news headlines for the symbol (10 days data)
        headlines = fetch_news_headlines(symbol, days=10)
        
        if not headlines:
            logger.warning(f"No news headlines found for {symbol}")
            return {
                "symbol": symbol,
                "sentiment": 0,
                "headlines": [],
                "message": "No news found for this symbol"
            }
            
        # Calculate sentiment score
        sentiment_score = fetch_news_sentiment(symbol, days=10)
        
        logger.info(f"Sentiment score for {symbol}: {sentiment_score}")
        
        return {
            "symbol": symbol,
            "sentiment": sentiment_score, 
            "headlines": headlines,
            "message": "Sentiment analysis successful"
        }
    except Exception as e:
        logger.error(f"Error analyzing sentiment for {symbol}: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Error analyzing sentiment: {str(e)}")


# Run the backend server
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)