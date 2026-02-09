import React from 'react';

const SentimentBadge = ({ label, score }) => {
  const getClass = (sentiment) => {
    switch (sentiment?.toLowerCase()) {
      case 'positive':
        return 'badge success';
      case 'negative':
        return 'badge danger';
      default:
        return 'badge neutral';
    }
  };

  return (
    <span className={getClass(label)}>
      {label || 'Unknown'} {score ? `(${Math.round(score * 100)}%)` : ''}
    </span>
  );
};

export default SentimentBadge;
