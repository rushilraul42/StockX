// backend/routes/sentiment.js (or wherever you have your API endpoints)
const express = require('express');
const router = express.Router();
const { spawn } = require('child_process');

// API endpoint to get news sentiment for a symbol
router.get('/api/news/:symbol', async (req, res) => {
  const { symbol } = req.params;
  
  try {
    // Call the Python script to fetch and analyze news
    const python = spawn('python', ['sentiment_analysis.py', symbol]);
    let dataString = '';

    // Collect data from Python script
    python.stdout.on('data', (data) => {
      dataString += data.toString();
    });

    // Handle script completion
    python.on('close', (code) => {
      if (code !== 0) {
        return res.status(500).json({ error: "Error analyzing sentiment" });
      }
      
      try {
        const sentimentResults = JSON.parse(dataString);
        return res.json(sentimentResults);
      } catch (error) {
        return res.status(500).json({ error: "Error parsing sentiment results" });
      }
    });
  } catch (error) {
    console.error("Sentiment analysis error:", error);
    res.status(500).json({ error: "Failed to analyze sentiment" });
  }
});

module.exports = router;