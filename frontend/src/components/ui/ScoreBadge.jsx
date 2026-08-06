import React from 'react';

const ScoreBadge = ({ score }) => {
  const getClass = (value) => {
    if (value >= 70) return 'badge danger';
    if (value >= 40) return 'badge warning';
    return 'badge success';
  };

  const numScore = parseFloat(score) || 0;

  return (
    <span className={getClass(numScore)}>
      Score: {Math.round(numScore)}
    </span>
  );
};

export default ScoreBadge;
