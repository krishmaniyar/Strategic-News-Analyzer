import { useState, useEffect, useCallback } from 'react';
import client from '../api/client';

const useNews = () => {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [aiStatus, setAiStatus] = useState(null);

  const fetchNews = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await client.get('/news?limit=100');
      setNews(response.data);
    } catch (err) {
      setError(err.message || 'Failed to fetch news');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAiStatus = useCallback(async () => {
    try {
      const response = await client.get('/ai/status');
      setAiStatus(response.data);
    } catch (err) {
      console.error('Failed to fetch AI status', err);
    }
  }, []);

  const runAiProcessing = async () => {
    try {
      await client.post('/ai/process');
      fetchAiStatus();
    } catch (err) {
      console.error('Failed to trigger AI processing', err);
      throw err;
    }
  };

  const fetchExternalNews = async () => {
    try {
      const response = await client.post('/news/fetch');
      await fetchNews(); // Reload news after fetching
      return response.data;
    } catch (err) {
      console.error('Failed to fetch external news', err);
      throw err;
    }
  };

  useEffect(() => {
    fetchNews();
    fetchAiStatus();
    const interval = setInterval(fetchAiStatus, 10000);
    return () => clearInterval(interval);
  }, [fetchNews, fetchAiStatus]);

  return {
    news,
    loading,
    error,
    aiStatus,
    refreshNews: fetchNews,
    refreshStatus: fetchAiStatus,
    runAiProcessing,
    fetchExternalNews
  };
};

export default useNews;
