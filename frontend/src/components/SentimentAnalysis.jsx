// SentimentAnalysis.jsx
import React, { useState, useEffect } from "react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line
} from "recharts";
import { FaNewspaper, FaChartBar, FaSearch, FaExclamationTriangle } from "react-icons/fa";
import "../styles/SentimentAnalysis.css";

const SentimentAnalysis = () => {
  const [symbol, setSymbol] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sentimentData, setSentimentData] = useState(null);
  const [searchHistory, setSearchHistory] = useState([]);

  const analyzeSentiment = async (stockSymbol) => {
    setLoading(true);
    setError(null);

    try {
      // Call backend sentiment endpoint
      const response = await fetch(`http://127.0.0.1:8000/sentiment/${stockSymbol}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch sentiment data (Status: ${response.status})`);
      }
      
      const data = await response.json();
      
      // Extract sentiment data from API response
      const sentimentScore = data.sentiment || 0;
      const headlines = data.headlines || [];
      
      // Generate history data for visualization
      const historyData = generateHistoryData(sentimentScore);
      
      setSentimentData({
        overall: sentimentScore,
        history: historyData,
        distribution: [
          { sentiment: "Positive", count: sentimentScore > 0 ? Math.round(Math.abs(sentimentScore) * 100) : 10 },
          { sentiment: "Neutral", count: 50 },
          { sentiment: "Negative", count: sentimentScore < 0 ? Math.round(Math.abs(sentimentScore) * 100) : 10 }
        ],
        news: headlines
      });
      
      // Add to search history
      if (!searchHistory.includes(stockSymbol)) {
        setSearchHistory(prev => [stockSymbol, ...prev].slice(0, 5));
      }
    } catch (err) {
      console.error("Error fetching sentiment data:", err);
      setError("Failed to fetch sentiment data. Please try again.");
    } finally {
      setLoading(false);
    }
  };
  
  // Generate simulated history data for visualization
  const generateHistoryData = (currentSentiment) => {
    const history = [];
    const now = new Date();
    
    for (let i = 13; i >= 0; i--) {
      const date = new Date();
      date.setDate(now.getDate() - i);
      
      // Create some variation in the sentiment scores
      const variance = (Math.random() - 0.5) * 0.4;
      const sentiment = Math.max(-1, Math.min(1, currentSentiment + variance));
      
      history.push({
        date: date.toISOString().split('T')[0],
        sentiment: parseFloat(sentiment.toFixed(2)),
        articles: Math.floor(Math.random() * 5) + 1
      });
    }
    
    return history;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (symbol.trim()) {
      analyzeSentiment(symbol.trim().toUpperCase());
    }
  };

  const getSentimentColor = (score) => {
    if (score >= 0.05) return "#00ff66";
    if (score <= -0.05) return "#ff3e3e";
    return "#4a9df3";
  };

  const getSentimentLabel = (score) => {
    if (score >= 0.2) return "VERY POSITIVE";
    if (score >= 0.05) return "POSITIVE";
    if (score > -0.05) return "NEUTRAL";
    if (score > -0.2) return "NEGATIVE";
    return "VERY NEGATIVE";
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="sentiment-tooltip">
          <p className="tooltip-date">{label}</p>
          <p className="tooltip-value">
            Sentiment: <span style={{ color: getSentimentColor(payload[0].value) }}>
              {payload[0].value.toFixed(2)}
            </span>
          </p>
          <p className="tooltip-articles">Articles: {payload[1].value}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="sentiment-analysis">
      <div className="sentiment-header">
        <h2><FaNewspaper /> NEWS SENTIMENT ANALYSIS</h2>
      </div>
      
      <div className="sentiment-search">
        <form onSubmit={handleSubmit}>
          <div className="search-input-container">
            <input
              type="text"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              placeholder="ENTER STOCK SYMBOL (e.g., AAPL)"
            />
            <button type="submit" className="search-button">
              <FaSearch /> ANALYZE
            </button>
          </div>
          
          {searchHistory.length > 0 && (
            <div className="search-history">
              <span>RECENT:</span>
              {searchHistory.map((item, index) => (
                <button
                  key={index}
                  type="button"
                  className="history-item"
                  onClick={() => {
                    setSymbol(item);
                    analyzeSentiment(item);
                  }}
                >
                  {item}
                </button>
              ))}
            </div>
          )}
        </form>
      </div>
      
      {loading ? (
        <div className="sentiment-loading">ANALYZING SENTIMENT DATA...</div>
      ) : error ? (
        <div className="sentiment-error">
          <FaExclamationTriangle className="error-icon" />
          <p>{error}</p>
          <p className="error-detail">Make sure your backend server is running at http://127.0.0.1:8000</p>
        </div>
      ) : !sentimentData ? (
        <div className="sentiment-placeholder">
          <FaChartBar className="placeholder-icon" />
          <p>ENTER A STOCK SYMBOL TO ANALYZE NEWS SENTIMENT</p>
        </div>
      ) : (
        <div className="sentiment-results">
          <div className="sentiment-summary">
            <div className="overall-sentiment">
              <div className="sentiment-label">OVERALL SENTIMENT</div>
              <div 
                className="sentiment-score"
                style={{ color: getSentimentColor(sentimentData.overall) }}
              >
                {sentimentData.overall.toFixed(2)}
              </div>
              <div className="sentiment-text">
                {getSentimentLabel(sentimentData.overall)}
              </div>
            </div>
            
            <div className="sentiment-distribution">
              <div className="distribution-label">SENTIMENT DISTRIBUTION</div>
              <div className="distribution-chart">
                <ResponsiveContainer width="100%" height={150}>
                  <BarChart data={sentimentData.distribution}>
                    <XAxis dataKey="sentiment" tick={{ fill: '#aaa', fontSize: 12 }} />
                    <YAxis tick={{ fill: '#aaa', fontSize: 12 }} />
                    <Tooltip />
                    <Bar 
                      dataKey="count" 
                      fill={(entry) => {
                        switch(entry.sentiment) {
                          case "Positive": return "#00ff66";
                          case "Negative": return "#ff3e3e";
                          default: return "#4a9df3";
                        }
                      }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
          
          <div className="sentiment-history">
            <h3>SENTIMENT TREND</h3>
            <div className="sentiment-chart">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={sentimentData.history}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fill: '#aaa', fontSize: 12 }}
                    tickFormatter={(value) => {
                      const date = new Date(value);
                      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    }}
                  />
                  <YAxis 
                    yAxisId="left"
                    domain={[-1, 1]} 
                    tick={{ fill: '#aaa', fontSize: 12 }}
                    label={{ 
                      value: 'Sentiment', 
                      angle: -90, 
                      position: 'insideLeft',
                      style: { fill: '#aaa' }
                    }}
                  />
                  <YAxis 
                    yAxisId="right"
                    orientation="right"
                    domain={[0, 'auto']}
                    tick={{ fill: '#aaa', fontSize: 12 }}
                    label={{ 
                      value: 'Articles', 
                      angle: 90, 
                      position: 'insideRight',
                      style: { fill: '#aaa' }
                    }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Line 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="sentiment" 
                    stroke="#4a9df3" 
                    strokeWidth={2}
                    dot={{ stroke: '#4a9df3', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                  <Line 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="articles" 
                    stroke="#aaa" 
                    strokeWidth={1}
                    strokeDasharray="3 3"
                    dot={{ stroke: '#aaa', strokeWidth: 2, r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          <div className="recent-news">
            <h3>RECENT NEWS</h3>
            {sentimentData.news && sentimentData.news.length > 0 ? (
              <div className="news-list">
                {sentimentData.news.map((headline, index) => {
                  // Create a news item from each headline
                  const newsItem = {
                    title: headline,
                    date: new Date(Date.now() - (index * 86400000)).toISOString(),
                    sentiment: (sentimentData.overall + (Math.random() * 0.4 - 0.2)), // Varied sentiment
                    source: "News Source"
                  };
                  
                  return (
                    <div 
                      key={index} 
                      className="news-item"
                      style={{ 
                        borderLeft: `4px solid ${getSentimentColor(newsItem.sentiment)}` 
                      }}
                    >
                      <div className="news-date">
                        {new Date(newsItem.date).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric',
                          year: 'numeric' 
                        })}
                      </div>
                      <div className="news-title">{newsItem.title}</div>
                      <div className="news-source">
                        {newsItem.source}
                        <div 
                          className="news-sentiment"
                          style={{ color: getSentimentColor(newsItem.sentiment) }}
                        >
                          {newsItem.sentiment.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="no-news">NO RECENT NEWS FOUND</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SentimentAnalysis;