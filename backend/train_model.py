#train_model.py
import yfinance as yf
import numpy as np
import pandas as pd
from sklearn.preprocessing import MinMaxScaler
import tensorflow as tf
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense
from sentiment_analysis import fetch_news_sentiment
from datetime import timedelta, datetime
import os

def train_stock_model(symbol="AAPL", epochs=10):
    """Train a stock prediction model that incorporates sentiment analysis"""
    try:
        # Step 1: Load historical stock data
        print(f"Loading historical data for {symbol}...")
        stock = yf.Ticker(symbol)
        data = stock.history(period="max")
        
        if data.empty:
            raise ValueError(f"No data found for {symbol}")
            
        close_prices = data['Close'].values
        dates = data.index

        # Step 2: Scale the prices
        scaler = MinMaxScaler(feature_range=(0, 1))
        scaled_prices = scaler.fit_transform(close_prices.reshape(-1, 1))

        # Step 3: Prepare sequences without sentiment first
        X, y = [], []
        for i in range(60, len(scaled_prices)):
            X.append(scaled_prices[i-60:i, 0])
            y.append(scaled_prices[i, 0])

        X, y = np.array(X), np.array(y)
        
        # Reshape X to match LSTM input requirements [samples, time steps, features]
        X = np.reshape(X, (X.shape[0], X.shape[1], 1))
        
        print(f"Data shape: X={X.shape}, y={y.shape}")

        # Step 4: Define the LSTM model - simplified for compatibility
        model = Sequential([
            LSTM(50, return_sequences=True, input_shape=(60, 1)),
            LSTM(50, return_sequences=False),
            Dense(25),
            Dense(1)
        ])
        
        model.compile(optimizer='adam', loss='mean_squared_error')
        model.summary()
        
        # Train the model with verbose output
        model.fit(X, y, epochs=epochs, batch_size=32, validation_split=0.2, verbose=1)

        # Step 5: Save the model and scaler
        model.save(f"model_{symbol}.keras")
        np.save(f"scaler_{symbol}.npy", np.array([scaler.data_min_[0], scaler.data_max_[0]]))

        print(f"Model trained successfully for {symbol} ({len(data)} days)")
        return True
        
    except Exception as e:
        print(f"Error training model for {symbol}: {e}")
        raise e

# Allow for direct testing of this module
if __name__ == "__main__":
    train_stock_model("AAPL", epochs=5)