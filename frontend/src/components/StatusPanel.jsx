import React, { useState } from 'react';
import { RefreshCw, Play } from 'lucide-react';

const StatusPanel = ({ status, onRunProcessing, refreshing }) => {
  const [running, setRunning] = useState(false);

  if (!status) return null;

  const handleRun = async () => {
    setRunning(true);
    try {
      await onRunProcessing();
    } finally {
      setRunning(false);
    }
  };

  const percentage = status.total_articles > 0 
    ? Math.round((status.processed / status.total_articles) * 100) 
    : 0;

  return (
    <div className="status-panel">
      <div className="status-metrics">
        <div className="metric-group">
          <h3>Global Status</h3>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
            <span className="metric-value">{percentage}%</span>
            <span style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--text-secondary)' }}>PROCESSED</span>
          </div>
        </div>
        
        <div className="metric-divider"></div>

        <div className="metric-group">
            <h3>Total Articles</h3>
            <p className="metric-value">{status.total_articles}</p>
        </div>
        
        <div className="metric-divider"></div>

        <div className="metric-group">
          <h3>Unprocessed</h3>
          <p className="metric-value" style={{ color: 'var(--warning-text)' }}>{status.unprocessed}</p>
        </div>
      </div>

      <div className="status-actions">
        <button
          onClick={handleRun}
          disabled={running || status.unprocessed === 0}
          className="btn btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          {running ? (
             <RefreshCw className="animate-spin" size={18} />
          ) : (
             <Play size={18} />
          )}
          <span>{running ? 'Processing...' : 'Run Analysis'}</span>
        </button>
      </div>
    </div>
  );
};

export default StatusPanel;
