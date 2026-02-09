import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import client from '../api/client';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import ScoreBadge from '../components/ui/ScoreBadge';
import SentimentBadge from '../components/ui/SentimentBadge';
import BiasBadge from '../components/ui/BiasBadge';

const ArticleDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchArticle = async () => {
      try {
        const response = await client.get(`/news/${id}`);
        setArticle(response.data);
      } catch (err) {
        setError("Failed to load article details.");
      } finally {
        setLoading(false);
      }
    };
    fetchArticle();
  }, [id]);

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>Loading details...</div>;
  if (error || !article) return <div style={{ padding: '2rem', textAlign: 'center', color: '#ef4444' }}>Error: {error || "Article not found"}</div>;

  return (
    <div className="detail-container">
      <button 
        onClick={() => navigate('/')} 
        className="back-btn"
      >
        <ArrowLeft size={16} style={{ marginRight: '0.5rem' }} /> Back to Dashboard
      </button>

      <article className="article-main">
        {/* Header */}
        <div className="article-header">
            <div className="article-meta">
                <span className="badge info">
                    {article.source}
                </span>
                <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                    {new Date(article.published_at).toLocaleString()}
                </span>
            </div>
            
            <h1 className="article-title">
                {article.title}
            </h1>

            {/* Translated Headline */}
            {article.translated_title && article.translated_title !== article.title && (
              <div style={{ marginBottom: '2rem' }}>
                 <span style={{ 
                    display: 'inline-block', 
                    backgroundColor: 'rgba(9, 99, 126, 0.1)', 
                    color: 'var(--primary-color)', 
                    fontSize: '0.75rem', 
                    fontWeight: '700', 
                    padding: '0.25rem 0.6rem', 
                    borderRadius: '0.25rem',
                    marginBottom: '0.75rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    border: '1px solid var(--border-color)'
                 }}>
                   English Translation
                 </span>
                 <h2 style={{ 
                    margin: 0, 
                    fontSize: '1.75rem', 
                    color: 'var(--text-main)', 
                    fontWeight: '700',
                    lineHeight: 1.3
                 }}>
                   {article.translated_title}
                 </h2>
              </div>
            )}

            {/* AI Summary Bar */}
            <div className="analysis-bar">
                <div className="analysis-item">
                    <p>Strategic Score</p>
                    <ScoreBadge score={article.strategic_score} />
                </div>
                <div className="analysis-item">
                     <p>Risk Level</p>
                     <span className={`badge ${article.risk_level === 'Critical' ? 'danger' : article.risk_level === 'High' ? 'warning' : 'info'}`}>
                        {article.risk_level || 'N/A'}
                     </span>
                </div>
                <div className="analysis-item">
                     <p>Sentiment</p>
                     <SentimentBadge label={article.sentiment_label} score={article.sentiment_score} />
                </div>
                <div className="analysis-item">
                     <p>Bias</p>
                     <BiasBadge label={article.bias_label} score={article.bias_score} />
                </div>
            </div>

            {/* Strategic Analysis Details - REMOVED per user request */}
        </div>

        {/* Content */}
        <div className="article-content">
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#111827', marginBottom: '0.75rem' }}>Analysis Content</h3>
            <div style={{ marginBottom: '2rem' }}>
                {article.translated_text ? (
                    <>
                        <div className="translated-box">
                            <h5 className="translated-title">Translated Content</h5>
                            <p className="content-text" style={{ fontSize: '1rem' }}>{article.translated_text}</p>
                        </div>
                        <details style={{ fontSize: '0.875rem', color: '#6b7280', cursor: 'pointer' }}>
                            <summary style={{ marginBottom: '0.5rem' }}>View Original Content</summary>
                            <p className="original-content">
                                {article.content}
                            </p>
                        </details>
                    </>
                ) : (
                    <p className="content-text">{article.content || "No content available."}</p>
                )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '1.5rem', borderTop: '1px solid #e5e7eb' }}>
                 <a 
                    href={article.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#2563eb', fontWeight: 600, textDecoration: 'none' }}
                 >
                    <span>Read Original Source</span>
                    <ExternalLink size={18} />
                 </a>
            </div>
        </div>
      </article>
    </div>
  );
};

export default ArticleDetail;
