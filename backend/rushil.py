from sentiment_analysis import get_average_sentiment_from_news

# Example test: Get average sentiment of AAPL news from last 3 days
symbol = "AAPL"
days = 3
sentiment_score = get_average_sentiment_from_news(symbol, days)

print(f"Average sentiment score for {symbol} over the past {days} days: {sentiment_score:.3f}")
