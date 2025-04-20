from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
from newsapi import NewsApiClient
import datetime
import requests

# Initialize News API
NEWS_API_KEY = "9b4a0ebcb094464cb0ba7d7d18eeac3c"  # Consider moving this to an environment variable
NEWS_API_URL = "https://newsapi.org/v2/everything"

# VADER Sentiment Analyzer
analyzer = SentimentIntensityAnalyzer()

def analyze_sentiment(texts, return_average=True):
    sentiments = []
    
    for text in texts:
        score = analyzer.polarity_scores(text)['compound']
        sentiments.append(score)

    if return_average:
        return sum(sentiments) / len(sentiments) if sentiments else 0
    else:
        return sentiments

def fetch_news_headlines(symbol, days=1):
    """
    Fetch recent news articles related to the stock symbol and return headlines.
    """
    try:
        today = datetime.datetime.now().date()
        from_date = (today - datetime.timedelta(days=days)).strftime('%Y-%m-%d')
        
        params = {
            "q": f"{symbol} stock",
            "from": from_date,
            "to": today.strftime('%Y-%m-%d'),
            "language": "en",
            "sortBy": "relevancy",
            "apiKey": NEWS_API_KEY,
            "pageSize": 20
        }
        
        response = requests.get(NEWS_API_URL, params=params)
        data = response.json()
        
        if "articles" not in data or len(data["articles"]) == 0:
            print(f"No articles found for {symbol}")
            return []
            
        headlines = [article.get('title', '') for article in data['articles'] if article.get('title')]
        return headlines

    except Exception as e:
        print(f"Error fetching news for {symbol}: {e}")
        return []

def fetch_news_sentiment(symbol, days=10):
    """
    Calculate average sentiment score for a stock symbol.
    This function is used by the prediction API endpoint.
    """
    try:
        headlines = fetch_news_headlines(symbol, days)
        
        if not headlines:
            return 0.0  # Neutral if no headlines found
        
        sentiment_scores = []
        for headline in headlines:
            vs = analyzer.polarity_scores(headline)
            sentiment_scores.append(vs['compound'])
        
        return sum(sentiment_scores) / len(sentiment_scores)
    
    except Exception as e:
        print(f"Error in sentiment analysis for {symbol}: {e}")
        return 0.0