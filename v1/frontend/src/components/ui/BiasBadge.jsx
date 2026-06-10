import React from 'react';

const BiasBadge = ({ label, score }) => {
  const getClass = (bias) => {
    if (!bias) return 'badge neutral';
    
    const lower = bias.toLowerCase();
    if (lower.includes('left')) return 'badge blue';
    if (lower.includes('right')) return 'badge orange';
    if (lower.includes('center') || lower.includes('neutral')) return 'badge purple';
    
    if (lower === 'biased') return 'badge warning';
    if (lower === 'non-biased') return 'badge success';
    
    return 'badge neutral';
  };

  return (
    <span className={getClass(label)}>
      {label || 'Unknown'} {score ? `(${Math.round(score * 100)}%)` : ''}
    </span>
  );
};

export default BiasBadge;
