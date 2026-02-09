import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const ChartsPanel = ({ articles }) => {
  const sentimentData = useMemo(() => {
    const counts = { Positive: 0, Neutral: 0, Negative: 0 };
    articles.forEach(a => {
        if (a.ai_processed && a.sentiment_label) {
            counts[a.sentiment_label] = (counts[a.sentiment_label] || 0) + 1;
        }
    });
    return Object.keys(counts).map(key => ({ name: key, value: counts[key] }));
  }, [articles]);

  const BiasData = useMemo(() => {
      const counts = {};
      articles.forEach(a => {
        if (a.ai_processed && a.bias_label) {
            counts[a.bias_label] = (counts[a.bias_label] || 0) + 1;
        }
      });
      return Object.keys(counts).map(key => ({ name: key, value: counts[key] }));
  }, [articles]);

  const ScoreDistribution = useMemo(() => {
      const buckets = { '0-20': 0, '21-40': 0, '41-60': 0, '61-80': 0, '81-100': 0 };
      articles.forEach(a => {
          if (a.ai_processed && a.strategic_score !== null) {
              const s = a.strategic_score;
              if (s <= 20) buckets['0-20']++;
              else if (s <= 40) buckets['21-40']++;
              else if (s <= 60) buckets['41-60']++;
              else if (s <= 80) buckets['61-80']++;
              else buckets['81-100']++;
          }
      });
      return Object.keys(buckets).map(key => ({ range: key, count: buckets[key] }));
  }, [articles]);

  const COLORS = ['#10B981', '#9CA3AF', '#EF4444']; // Green, Gray, Red for sentiment
  const BIAS_COLORS = ['#3B82F6', '#8B5CF6', '#F59E0B', '#10B981']; // Blue, Purple, Orange, Green

  return (
    <div className="charts-grid">
      {/* Sentiment Chart */}
      <div className="chart-card">
        <h4>Sentiment Distribution</h4>
        <div className="chart-container">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={sentimentData}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={70}
                fill="#8884d8"
                paddingAngle={5}
                dataKey="value"
              >
                {sentimentData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bias Chart */}
      <div className="chart-card">
        <h4>Bias Distribution</h4>
        <div className="chart-container">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={BiasData}>
              <XAxis dataKey="name" fontSize={10} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="value" fill="#8884d8">
                {BiasData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={BIAS_COLORS[index % BIAS_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Score Histogram */}
      <div className="chart-card">
        <h4>Strategic Score Distribution</h4>
        <div className="chart-container">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={ScoreDistribution}>
              <XAxis dataKey="range" fontSize={10} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#4F46E5" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default ChartsPanel;
