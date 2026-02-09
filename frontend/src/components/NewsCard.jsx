import React from 'react';
import { useNavigate } from 'react-router-dom';
import SentimentBadge from './ui/SentimentBadge';
import BiasBadge from './ui/BiasBadge';
import ScoreBadge from './ui/ScoreBadge';
import { ExternalLink, Calendar, Globe } from 'lucide-react';

const getSentimentClass = (label) => {
  if (!label) return 'neutral';
  const l = label.toLowerCase();
  if (l === 'positive') return 'positive';
  if (l === 'negative') return 'negative';
  return 'neutral';
};

const NewsCard = ({ article }) => {
  const navigate = useNavigate();

  return (
    <div className="news-card">
      <div className="card-body">
        <div className="card-meta">
          <span className="source-badge">
             {article.source}
          </span>
          {article.language && article.language !== 'en' && (
             <span className="badge neutral" style={{ marginLeft: 'auto', marginRight: '0.5rem' }}>
                {article.language.toUpperCase()}
             </span>
          )}
          <span className="date-text">
            {new Date(article.published_at).toLocaleDateString()}
          </span>
        </div>

        <h3 className="card-title" onClick={() => navigate(`/article/${article.id}`)}>
          {article.title}
        </h3>

        <p className="card-excerpt">
          {article.translated_text?.substring(0, 150) || article.content?.substring(0, 150) || "No content available."}{article.content && article.content.length > 150 ? '...' : ''}
        </p>

        <div className="card-badges">
           {/* Sentiment Badge */}
           {article.sentiment_label && (
             <span className={`badge ${getSentimentClass(article.sentiment_label)}`}>
               {article.sentiment_label}
             </span>
           )}
           
           {/* Score Badge */}
           <span className="badge" style={{ backgroundColor: '#eff6ff', color: '#1d4ed8' }}>
             Score: {article.strategic_score}
           </span>
        </div>
      </div>
      
      <div className="card-footer">
        <button 
          onClick={() => navigate(`/article/${article.id}`)}
          className="view-btn"
        >
          View Details
        </button>
        <a 
          href={article.url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="external-link"
        >
          <ExternalLink size={16} />
        </a>
      </div>
    </div>
  );
};

export default NewsCard;
