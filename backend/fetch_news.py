#fetch_news.py
import requests
import pandas as pd
import nltk
import time
import os
from newspaper import Article
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
from textblob import TextBlob
from datetime import datetime, timedelta

nltk.download('punkt')

# API Configuration
NEWS_API_KEY = "9b4a0ebcb094464cb0ba7d7d18eeac3c"  # Replace with your API key
NEWS_API_URL = "https://newsapi.org/v2/everything"


def fetch_news_headlines(symbol, days=10, max_articles=20):
    """Fetch news headlines for a given stock symbol"""
    try:
        query = f"{symbol} stock OR {symbol}"
        end_date = datetime.today()
        start_date = (end_date - timedelta(days=days)).strftime('%Y-%m-%d')
        
        params = {
            "q": query,
            "from": start_date,
            "to": end_date.strftime('%Y-%m-%d'),
            "sortBy": "publishedAt",
            "language": "en",
            "apiKey": NEWS_API_KEY,
            "pageSize": max_articles
        }
        
        response = requests.get(NEWS_API_URL, params=params)
        data = response.json()
        
        headlines = []
        if "articles" in data:
            for article in data["articles"]:
                headlines.append(article["title"])
        
        return headlines
    
    except Exception as e:
        print(f"Error fetching news for {symbol}: {e}")
        return []

def fetch_news_sentiment(symbol):
    """Calculate average sentiment score for a stock symbol"""
    try:
        headlines = fetch_news_headlines(symbol)
        analyzer = SentimentIntensityAnalyzer()
        
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
# Function to fetch news articles for Apple stock
def fetch_news_articles(query, from_date, to_date, page_size=20):
    params = {
        "q": query,
        "from": from_date,
        "to": to_date,
        "sortBy": "publishedAt",
        "language": "en",
        "apiKey": NEWS_API_KEY,
        "pageSize": page_size
    }
    response = requests.get(NEWS_API_URL, params=params)
    data = response.json()
    
    articles = []
    if "articles" in data:
        for article in data["articles"]:
            articles.append({
                "title": article["title"],
                "description": article["description"],
                "url": article["url"],
                "publishedAt": article["publishedAt"]
            })
    
    return articles

# Function to extract full content from article URLs
def extract_full_content(url):
    try:
        article = Article(url)
        article.download()
        article.parse()
        return article.text
    except Exception as e:
        print(f"Failed to extract content from {url}: {e}")
        return None

# Function to perform sentiment analysis
def analyze_sentiment(title, content):
    vader = SentimentIntensityAnalyzer()
    title_sentiment_score = vader.polarity_scores(title)["compound"]
    textblob_score = TextBlob(content).sentiment.polarity
    return title_sentiment_score, textblob_score

# Function to fetch both historical and real-time news
def fetch_all_news():
    query = "Apple stock OR AAPL"
    today = datetime.today()
    past_date = (today - timedelta(days=10)).strftime('%Y-%m-%d')
    real_time = today.strftime('%Y-%m-%dT%H:%M:%SZ')
    
    # Fetch historical news (last 10 days)
    print("Fetching historical news...")
    historical_articles = fetch_news_articles(query, past_date, today.strftime('%Y-%m-%d'))
    
    # Fetch real-time news (last few minutes)
    print("Fetching real-time news...")
    real_time_articles = fetch_news_articles(query, real_time, real_time)
    
    return historical_articles + real_time_articles

# Main function
def fetch_news_continuously():
    file_exists = os.path.exists("apple_news_data.csv")
    
    while True:
        print("Fetching latest news...")
        articles = fetch_all_news()
        news_data = []
        
        for article in articles:
            title = article["title"]
            url = article["url"]
            publishedAt = article["publishedAt"]
            full_content = extract_full_content(url)
            
            if full_content:
                title_sentiment, content_sentiment = analyze_sentiment(title, full_content)
                news_data.append({
                    "date": publishedAt,
                    "title": title,
                    "content": full_content,
                    "url": url,
                    "title_sentiment": title_sentiment,
                    "content_sentiment": content_sentiment
                })
        
        # Convert to DataFrame
        df = pd.DataFrame(news_data)

        # Write headers only if file does not exist
        df.to_csv("apple_news_data.csv", mode='a', header=not file_exists, index=False)
        print("News data updated successfully!")
        
        # Wait 5 minutes before fetching again
        time.sleep(10)




if __name__ == "__main__":
    fetch_news_continuously()
