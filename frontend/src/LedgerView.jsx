import React, { useState, useMemo } from 'react';

const CATEGORY_COLORS = {
  'Food & Dining': '#f97316',
  'Travel & Transit': '#3b82f6',
  'Entertainment': '#ec4899',
  'Utilities': '#10b981',
  'Academics & Tech': '#8b5cf6',
  'Miscellaneous': '#64748b'
};

const CATEGORIES = [
  'ALL',
  'Food & Dining',
  'Travel & Transit',
  'Entertainment',
  'Utilities',
  'Academics & Tech',
  'Miscellaneous'
];

export default function LedgerView({ transactions = [], onDeleteExpense }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortOption, setSortOption] = useState('date-desc');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  // Filter and sort transactions
  const processedTransactions = useMemo(() => {
    let result = [...transactions];

    // Search query filter
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter((tx) =>
        (tx.title || '').toLowerCase().includes(q)
      );
    }

    // Category filter
    if (selectedCategory !== 'ALL') {
      result = result.filter(
        (tx) => (tx.category || 'Miscellaneous') === selectedCategory
      );
    }

    // Date range filter
    if (startDate) {
      result = result.filter((tx) => tx.date >= startDate);
    }
    if (endDate) {
      result = result.filter((tx) => tx.date <= endDate);
    }

    // Sorting
    result.sort((a, b) => {
      if (sortOption === 'date-desc') return new Date(b.date) - new Date(a.date);
      if (sortOption === 'date-asc') return new Date(a.date) - new Date(b.date);
      if (sortOption === 'amount-desc') return Number(b.amount) - Number(a.amount);
      if (sortOption === 'amount-asc') return Number(a.amount) - Number(b.amount);
      return 0;
    });

    return result;
  }, [transactions, searchTerm, selectedCategory, startDate, endDate, sortOption]);

  // Total amount matching current filters
  const filteredTotal = useMemo(() => {
    return processedTransactions.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
  }, [processedTransactions]);

  // Pagination slice
  const totalPages = Math.ceil(processedTransactions.length / pageSize) || 1;
  const paginatedTransactions = useMemo(() => {
    const startIdx = (currentPage - 1) * pageSize;
    return processedTransactions.slice(startIdx, startIdx + pageSize);
  }, [processedTransactions, currentPage, pageSize]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Search and Filter Controls Card */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, fontSize: '18px', color: '#1e293b' }}>Ledger Filter & Search</h3>
          <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b' }}>
            Found {processedTransactions.length} items (Total: ₹{filteredTotal.toLocaleString('en-IN')})
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
          <div>
            <label style={labelStyle}>Search Title</label>
            <input
              type="text"
              placeholder="Filter by keyword..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => { setSelectedCategory(e.target.value); setCurrentPage(1); }}
              style={inputStyle}
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={labelStyle}>From Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setCurrentPage(1); }}
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>To Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setCurrentPage(1); }}
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Sort By</label>
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value)}
              style={inputStyle}
            >
              <option value="date-desc">Date (Newest First)</option>
              <option value="date-asc">Date (Oldest First)</option>
              <option value="amount-desc">Amount (Highest First)</option>
              <option value="amount-asc">Amount (Lowest First)</option>
            </select>
          </div>
        </div>

        {(searchTerm || selectedCategory !== 'ALL' || startDate || endDate) && (
          <div style={{ marginTop: '12px' }}>
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedCategory('ALL');
                setStartDate('');
                setEndDate('');
                setCurrentPage(1);
              }}
              style={{
                backgroundColor: 'transparent',
                border: '1px solid #cbd5e1',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                color: '#64748b',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              Clear All Filters
            </button>
          </div>
        )}
      </div>

      {/* Ledger Table Card */}
      <div style={cardStyle}>
        {paginatedTransactions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>
            No transactions match the selected criteria.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#64748b', fontSize: '13px' }}>
                  <th style={{ padding: '12px 16px' }}>DATE</th>
                  <th style={{ padding: '12px 16px' }}>DESCRIPTION</th>
                  <th style={{ padding: '12px 16px' }}>CATEGORY</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>AMOUNT</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center' }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {paginatedTransactions.map((tx) => (
                  <tr key={tx.id} style={{ borderBottom: '1px solid #f1f5f9', fontSize: '14px' }}>
                    <td style={{ padding: '14px 16px', color: '#64748b' }}>{tx.date}</td>
                    <td style={{ padding: '14px 16px', fontWeight: '600', color: '#1e293b' }}>{tx.title}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <span
                        style={{
                          fontSize: '12px',
                          fontWeight: '700',
                          color: CATEGORY_COLORS[tx.category] || '#64748b',
                          backgroundColor: '#f1f5f9',
                          padding: '3px 8px',
                          borderRadius: '6px'
                        }}
                      >
                        {tx.category || 'Miscellaneous'}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: '700', color: '#ef4444' }}>
                      -₹{Number(tx.amount).toLocaleString('en-IN')}
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                      <button
                        onClick={() => onDeleteExpense(tx.id)}
                        style={{
                          backgroundColor: '#fee2e2',
                          border: 'none',
                          color: '#ef4444',
                          cursor: 'pointer',
                          borderRadius: '6px',
                          width: '28px',
                          height: '28px',
                          fontWeight: 'bold'
                        }}
                        title="Delete record"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '13px', color: '#64748b' }}>
              Page {currentPage} of {totalPages}
            </span>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: currentPage === 1 ? '#f8fafc' : '#ffffff',
                  color: currentPage === 1 ? '#cbd5e1' : '#334155',
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                  fontWeight: '600',
                  fontSize: '13px'
                }}
              >
                Prev
              </button>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: currentPage === totalPages ? '#f8fafc' : '#ffffff',
                  color: currentPage === totalPages ? '#cbd5e1' : '#334155',
                  cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                  fontWeight: '600',
                  fontSize: '13px'
                }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}

const cardStyle = {
  backgroundColor: '#ffffff',
  borderRadius: '16px',
  padding: '20px',
  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
  border: '1px solid #e2e8f0'
};

const labelStyle = {
  display: 'block',
  fontSize: '12px',
  fontWeight: '700',
  color: '#475569',
  marginBottom: '6px'
};

const inputStyle = {
  width: '100%',
  padding: '8px 12px',
  borderRadius: '8px',
  border: '1.5px solid #cbd5e1',
  outline: 'none',
  fontSize: '13px',
  boxSizing: 'border-box',
  backgroundColor: '#ffffff',
  color: '#0f172a'
};