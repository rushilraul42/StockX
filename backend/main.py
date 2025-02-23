from fastapi import FastAPI
import yfinance as yf
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# Allow frontend to communicate with the backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/stock/{symbol}")
def get_stock(symbol: str):
    try:
        stock = yf.Ticker(symbol)
        data = stock.history(period="1d")
        return {
            "symbol": symbol,
            "price": data["Close"].iloc[-1]
        }
    except Exception as e:
        return {"error": str(e)}

@app.get("/stocks/")
def get_multiple_stocks(symbols: str):
    try:
        symbol_list = symbols.split(",")  # Expecting symbols as comma-separated values
        stock_data = {}
        
        for symbol in symbol_list:
            stock = yf.Ticker(symbol)
            data = stock.history(period="1d")
            stock_data[symbol] = {
                "price": data["Close"].iloc[-1]
            }
        
        return stock_data
    except Exception as e:
        return {"error": str(e)}

# Run the backend
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
