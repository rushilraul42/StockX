// PortfolioMetrics.jsx
import React, { useState, useEffect } from "react";
import { auth, db } from "../firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { FaChartArea, FaChartPie, FaChartLine } from "react-icons/fa";
import "../styles/PortfolioMetrics.css";

const PortfolioMetrics = () => {
  const [portfolio, setPortfolio] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState("1M");
  const [chartType, setChartType] = useState("line");
  const [performanceData, setPerformanceData] = useState([]);
  const [allocationData, setAllocationData] = useState([]);

  // Sample colors for the pie chart
  const COLORS = ["#00C49F", "#FFBB28", "#FF8042", "#0088FE", "#8884D8", "#82CA9D", "#FF6666"];

  useEffect(() => {
    const fetchPortfolioData = async () => {
      if (!auth.currentUser) return;

      setLoading(true);
      try {
        // Fetch user's portfolio
        const q = query(
          collection(db, "portfolios"),
          where("userId", "==", auth.currentUser.uid)
        );

        const querySnapshot = await getDocs(q);
        const portfolioData = [];

        for (const doc of querySnapshot.docs) {
          const stockData = doc.data();

          // Fetch current stock price for each holding
          try {
            const response = await fetch(`http://127.0.0.1:8000/stock/${stockData.symbol}`);
            if (response.ok) {
              const data = await response.json();
              const currentValue = stockData.shares * data.price;
              const profit = currentValue - stockData.investment;
              const profitPercentage = (profit / stockData.investment) * 100;

              portfolioData.push({
                id: doc.id,
                ...stockData,
                currentPrice: data.price,
                currentValue,
                profit,
                profitPercentage,
              });
            }
          } catch (err) {
            console.error(`Failed to fetch current price for ${stockData.symbol}`, err);
          }
        }

        setPortfolio(portfolioData);
        
        // Generate performance data (simulated historical data)
        generatePerformanceData(portfolioData, timeRange);
        
        // Generate allocation data
        generateAllocationData(portfolioData);
      } catch (err) {
        console.error("Error fetching portfolio metrics:", err);
        setError("Failed to load portfolio metrics. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchPortfolioData();
  }, [timeRange]);

  // Generate simulated historical performance data based on current portfolio and time range
  const generatePerformanceData = (portfolioData, range) => {
    // This would ideally be real historical data from an API
    // For now, we'll simulate data based on the current portfolio value

    // Calculate total current value
    const totalValue = portfolioData.reduce((sum, stock) => sum + stock.currentValue, 0);
    
    // Total initial investment
    const totalInvestment = portfolioData.reduce((sum, stock) => sum + stock.investment, 0);

    let days = 30; // Default 1M
    if (range === "1W") days = 7;
    if (range === "3M") days = 90;
    if (range === "6M") days = 180;
    if (range === "1Y") days = 365;

    const data = [];
    let currentDate = new Date();
    currentDate.setDate(currentDate.getDate() - days);

    // Generate data points
    for (let i = 0; i < days; i++) {
      currentDate.setDate(currentDate.getDate() + 1);
      
      // Create slight variations for realistic data
      // In production, this would use actual historical data points
      const dayFactor = Math.sin(i / 10) * 0.1 + 0.95 + Math.random() * 0.1;
      const value = totalInvestment + ((totalValue - totalInvestment) * i / days) * dayFactor;
      
      data.push({
        date: currentDate.toISOString().substring(0, 10),
        value: parseFloat(value.toFixed(2)),
      });
    }

    setPerformanceData(data);
  };

  // Generate portfolio allocation data
  const generateAllocationData = (portfolioData) => {
    const totalValue = portfolioData.reduce((sum, stock) => sum + stock.currentValue, 0);
    
    const data = portfolioData.map(stock => ({
      name: stock.symbol,
      value: parseFloat(((stock.currentValue / totalValue) * 100).toFixed(2))
    }));
    
    setAllocationData(data);
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-tooltip">
          <p className="tooltip-date">{label}</p>
          <p className="tooltip-value">${payload[0].value}</p>
        </div>
      );
    }
    return null;
  };

  const PieTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-tooltip">
          <p>{`${payload[0].name}: ${payload[0].value}%`}</p>
        </div>
      );
    }
    return null;
  };

  // Calculate overall portfolio metrics
  const calculateMetrics = () => {
    if (!portfolio.length) return { totalValue: 0, totalProfit: 0, totalProfitPercentage: 0 };

    const totalValue = portfolio.reduce((sum, stock) => sum + stock.currentValue, 0);
    const totalInvestment = portfolio.reduce((sum, stock) => sum + stock.investment, 0);
    const totalProfit = totalValue - totalInvestment;
    const totalProfitPercentage = totalInvestment > 0 ? (totalProfit / totalInvestment) * 100 : 0;

    return {
      totalValue,
      totalProfit,
      totalProfitPercentage,
    };
  };

  const metrics = calculateMetrics();

  return (
    <div className="portfolio-metrics">
      <h2>PORTFOLIO PERFORMANCE</h2>

      {loading ? (
        <div className="loading-message">LOADING METRICS...</div>
      ) : error ? (
        <div className="error-message">{error}</div>
      ) : !portfolio.length ? (
        <div className="empty-portfolio-message">NO PORTFOLIO DATA AVAILABLE</div>
      ) : (
        <>
          <div className="metrics-summary">
            <div className="metric-card">
              <div className="metric-label">TOTAL VALUE</div>
              <div className="metric-value">${metrics.totalValue.toFixed(2)}</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">TOTAL PROFIT/LOSS</div>
              <div className={`metric-value ${metrics.totalProfit >= 0 ? 'positive' : 'negative'}`}>
                {metrics.totalProfit >= 0 ? '+' : ''}{metrics.totalProfit.toFixed(2)} 
                ({metrics.totalProfitPercentage.toFixed(2)}%)
              </div>
            </div>
            <div className="metric-card">
              <div className="metric-label">ASSETS</div>
              <div className="metric-value">{portfolio.length}</div>
            </div>
          </div>

          <div className="chart-controls">
            <div className="time-range-selectors">
              <button 
                className={timeRange === "1W" ? "active" : ""} 
                onClick={() => setTimeRange("1W")}
              >
                1W
              </button>
              <button 
                className={timeRange === "1M" ? "active" : ""} 
                onClick={() => setTimeRange("1M")}
              >
                1M
              </button>
              <button 
                className={timeRange === "3M" ? "active" : ""} 
                onClick={() => setTimeRange("3M")}
              >
                3M
              </button>
              <button 
                className={timeRange === "6M" ? "active" : ""} 
                onClick={() => setTimeRange("6M")}
              >
                6M
              </button>
              <button 
                className={timeRange === "1Y" ? "active" : ""} 
                onClick={() => setTimeRange("1Y")}
              >
                1Y
              </button>
            </div>
            <div className="chart-type-selectors">
              <button 
                className={chartType === "line" ? "active" : ""} 
                onClick={() => setChartType("line")}
                title="Line Chart"
              >
                <FaChartLine />
              </button>
              <button 
                className={chartType === "area" ? "active" : ""} 
                onClick={() => setChartType("area")}
                title="Area Chart"
              >
                <FaChartArea />
              </button>
              <button 
                className={chartType === "pie" ? "active" : ""} 
                onClick={() => setChartType("pie")}
                title="Portfolio Allocation"
              >
                <FaChartPie />
              </button>
            </div>
          </div>

          <div className="chart-container">
            {chartType === "line" && (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={performanceData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fill: '#aaa', fontSize: 12 }}
                    tickFormatter={(value) => {
                      // Format date differently based on time range
                      const date = new Date(value);
                      return timeRange === "1W" ? 
                        date.toLocaleDateString('en-US', { weekday: 'short' }) : 
                        date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    }}
                  />
                  <YAxis 
                    domain={['auto', 'auto']} 
                    tick={{ fill: '#aaa', fontSize: 12 }}
                    tickFormatter={(value) => `$${value}`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#4a9df3" 
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 8 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}

            {chartType === "area" && (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={performanceData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fill: '#aaa', fontSize: 12 }}
                    tickFormatter={(value) => {
                      const date = new Date(value);
                      return timeRange === "1W" ? 
                        date.toLocaleDateString('en-US', { weekday: 'short' }) : 
                        date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    }}
                  />
                  <YAxis 
                    domain={['auto', 'auto']} 
                    tick={{ fill: '#aaa', fontSize: 12 }}
                    tickFormatter={(value) => `$${value}`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#4a9df3" 
                    fill="url(#colorValue)"
                    strokeWidth={2}
                  />
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4a9df3" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#4a9df3" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                </AreaChart>
              </ResponsiveContainer>
            )}

            {chartType === "pie" && (
              <div className="pie-chart-container">
                <h3>PORTFOLIO ALLOCATION</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={allocationData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {allocationData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<PieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="assets-breakdown">
            <h3>ASSETS BREAKDOWN</h3>
            <div className="assets-table-container">
              <table className="assets-table">
                <thead>
                  <tr>
                    <th>SYMBOL</th>
                    <th>SHARES</th>
                    <th>PURCHASE PRICE</th>
                    <th>CURRENT PRICE</th>
                    <th>CHANGE</th>
                    <th>VALUE</th>
                    <th>ALLOCATION</th>
                  </tr>
                </thead>
                <tbody>
                  {portfolio.map((stock) => {
                    const allocation = (stock.currentValue / metrics.totalValue) * 100;
                    const priceChange = ((stock.currentPrice - stock.buyPrice) / stock.buyPrice) * 100;
                    
                    return (
                      <tr key={stock.id}>
                        <td>{stock.symbol}</td>
                        <td>{stock.shares}</td>
                        <td>${stock.buyPrice.toFixed(2)}</td>
                        <td>${stock.currentPrice.toFixed(2)}</td>
                        <td className={priceChange >= 0 ? 'positive' : 'negative'}>
                          {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}%
                        </td>
                        <td>${stock.currentValue.toFixed(2)}</td>
                        <td>{allocation.toFixed(2)}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default PortfolioMetrics;