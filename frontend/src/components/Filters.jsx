import React from 'react';
import { Search } from 'lucide-react';

const Filters = ({ filters, setFilters }) => {
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="filters-panel">
      <div className="filters-grid">
        
        {/* Search */}
        <div className="filter-group">
          <label>Search Keywords</label>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              name="search"
              value={filters.search}
              onChange={handleChange}
              placeholder="Search articles..."
              className="filter-input"
              style={{ paddingLeft: '2.25rem' }}
            />
            <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '0.625rem', color: '#9ca3af' }} />
          </div>
        </div>

        {/* Sentiment Filter */}
        <div className="filter-group">
          <label>Sentiment</label>
          <select
            name="sentiment"
            value={filters.sentiment}
            onChange={handleChange}
            className="filter-input"
          >
            <option value="all">All Sentiments</option>
            <option value="Positive">Positive</option>
            <option value="Neutral">Neutral</option>
            <option value="Negative">Negative</option>
          </select>
        </div>

        {/* Bias Filter */}
        <div className="filter-group">
           <label>Bias</label>
           <select
            name="bias"
            value={filters.bias}
            onChange={handleChange}
            className="filter-input"
          >
            <option value="all">All Biases</option>
            <option value="Left">Left</option>
            <option value="Center">Center</option>
            <option value="Right">Right</option>
            <option value="Biased">Biased</option>
            <option value="Non-biased">Non-biased</option>
          </select>
        </div>

        {/* Min Score Filter */}
        <div className="filter-group">
          <label>
            Min Strategic Score: <span style={{ color: '#2563eb' }}>{filters.minScore}</span>
          </label>
          <input
            type="range"
            name="minScore"
            min="0"
            max="100"
            value={filters.minScore}
            onChange={handleChange}
            style={{ width: '100%', cursor: 'pointer' }}
          />
        </div>
      </div>
    </div>
  );
};

export default Filters;
