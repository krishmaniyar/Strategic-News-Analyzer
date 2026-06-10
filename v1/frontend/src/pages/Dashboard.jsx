import React, { useState, useMemo } from 'react';
import useNews from '../hooks/useNews';
import NewsCard from '../components/NewsCard';
import Filters from '../components/Filters';
import ChartsPanel from '../components/ChartsPanel';
import StatusPanel from '../components/StatusPanel';
import { Loader2, RefreshCw, Download } from 'lucide-react';

const Dashboard = () => {
  const { news, loading, error, aiStatus, runAiProcessing, refreshNews, fetchExternalNews } = useNews();
  const [filters, setFilters] = useState({
    search: '',
    sentiment: 'all',
    bias: 'all',
    minScore: 0
  });
  const [fetching, setFetching] = useState(false);

  const handleFetch = async () => {
    setFetching(true);
    try {
        await fetchExternalNews();
    } finally {
        setFetching(false);
    }
  };

  const filteredNews = useMemo(() => {
    return news.filter(article => {
      // 1. Search
      if (filters.search) {
        const query = filters.search.toLowerCase();
        if (!article.title.toLowerCase().includes(query) && 
            !article.content.toLowerCase().includes(query)) {
          return false;
        }
      }
      
      // 2. Sentiment
      if (filters.sentiment !== 'all' && article.sentiment_label !== filters.sentiment) {
        return false;
      }

      // 3. Bias
      if (filters.bias !== 'all' && article.bias_label !== filters.bias) {
        return false;
      }

      // 4. Score
      if (article.strategic_score < parseInt(filters.minScore)) {
        return false;
      }
      
      return true;
    }).sort((a, b) => (b.strategic_score || 0) - (a.strategic_score || 0)); // Sort by score DESC default
  }, [news, filters]);

  return (
    <div className="container">
      <header className="header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
            <h1>Geopolitical Intelligence Dashboard</h1>
            <p>Real-time analysis of global news trends.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button onClick={refreshNews} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <RefreshCw size={16} />
                Refresh Feed
            </button>
            <button onClick={handleFetch} disabled={fetching} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {fetching ? <Loader2 className="animate-spin" size={16} /> : <Download size={16} />}
                {fetching ? 'Fetching...' : 'Fetch New News'}
            </button>
        </div>
      </header>

      {/* AI Status Panel */}
      <StatusPanel status={aiStatus} onRunProcessing={runAiProcessing} />

      {/* Filters */}
      <Filters filters={filters} setFilters={setFilters} />

      {/* Charts */}
      {news.length > 0 && <ChartsPanel articles={news} />}

      {/* News Grid */}
      {loading && !fetching ? (
        <div className="loading-spinner">
           <Loader2 className="animate-spin" size={48} />
        </div>
      ) : error ? (
        <div className="error-msg">
          Error loading news: {error}
        </div>
      ) : (
        <>
            <div className="news-header">
                <h2>Latest Intelligence ({filteredNews.length} items)</h2>
            </div>
            
            <div className="news-grid">
            {filteredNews.map(article => (
                <NewsCard key={article.id} article={article} />
            ))}
            </div>
            
            {filteredNews.length === 0 && (
                <p style={{ textAlign: 'center', color: '#6b7280', padding: '3rem 0' }}>
                  No articles match your filters.
                </p>
            )}
        </>
      )}
    </div>
  );
};

export default Dashboard;
