import React, { useMemo, useState } from 'react';

const CATEGORY_COLORS = {
  'Food & Dining': '#f97316',
  'Travel & Transit': '#3b82f6',
  'Entertainment': '#ec4899',
  'Utilities': '#10b981',
  'Academics & Tech': '#8b5cf6',
  'Miscellaneous': '#64748b'
};

export default function AnalyticsView({ transactions = [], monthlyBudget = 25000 }) {
  const [hoveredDay, setHoveredDay] = useState(null);

  // 1. Category aggregation
  const categoryStats = useMemo(() => {
    const stats = {};
    let totalSpent = 0;

    transactions.forEach((tx) => {
      const amount = Number(tx.amount) || 0;
      const category = tx.category || 'Miscellaneous';
      totalSpent += amount;
      stats[category] = (stats[category] || 0) + amount;
    });

    const categories = Object.keys(stats).map((name) => ({
      name,
      amount: stats[name],
      percentage: totalSpent > 0 ? ((stats[name] / totalSpent) * 100).toFixed(1) : 0,
    }));

    categories.sort((a, b) => b.amount - a.amount);
    return { categories, totalSpent };
  }, [transactions]);

  // 2. Daily spending timeline data (last 14 days or days of current month up to today)
  const dailyData = useMemo(() => {
    const today = new Date();
    const daysMap = {};

    // Build the last 14 days list
    const dayLabels = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const iso = d.toISOString().split('T')[0];
      const shortLabel = d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
      daysMap[iso] = 0;
      dayLabels.push({ date: iso, label: shortLabel });
    }

    // Populate spent totals
    transactions.forEach((tx) => {
      if (daysMap[tx.date] !== undefined) {
        daysMap[tx.date] += Number(tx.amount) || 0;
      }
    });

    const result = dayLabels.map((item) => ({
      ...item,
      amount: daysMap[item.date] || 0
    }));

    const maxSpent = Math.max(...result.map((d) => d.amount), 500); // minimum scale of 500
    return { list: result, maxSpent };
  }, [transactions]);

  const today = new Date();
  const currentDay = today.getDate();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const daysRemaining = Math.max(1, daysInMonth - currentDay);
  const remainingBudget = monthlyBudget - categoryStats.totalSpent;
  const safeDailyPace = Math.max(0, remainingBudget / daysRemaining);

  const budgetUsagePercent = Math.min(
    Math.round((categoryStats.totalSpent / monthlyBudget) * 100),
    100
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Top Level Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <div style={cardStyle}>
          <span style={metricLabelStyle}>Monthly Budget Target</span>
          <span style={metricValueStyle}>₹{Number(monthlyBudget).toLocaleString('en-IN')}</span>
        </div>
        <div style={cardStyle}>
          <span style={metricLabelStyle}>Total Spent</span>
          <span style={{ ...metricValueStyle, color: categoryStats.totalSpent > monthlyBudget ? '#ef4444' : '#1e293b' }}>
            ₹{categoryStats.totalSpent.toLocaleString('en-IN')}
          </span>
        </div>
        <div style={cardStyle}>
          <span style={metricLabelStyle}>Remaining Balance</span>
          <span style={{ ...metricValueStyle, color: remainingBudget < 0 ? '#ef4444' : '#10b981' }}>
            ₹{remainingBudget.toLocaleString('en-IN')}
          </span>
        </div>
      </div>

      {/* Daily Spending Graph */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '18px', color: '#1e293b' }}>Daily Spending Trend (Last 14 Days)</h3>
            <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '13px' }}>
              Dashed line represents your target daily pace: <strong>₹{Math.round(safeDailyPace).toLocaleString('en-IN')} / day</strong>
            </p>
          </div>
          {hoveredDay && (
            <div style={{ backgroundColor: '#0f172a', color: '#ffffff', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: '600' }}>
              {hoveredDay.label}: ₹{hoveredDay.amount.toLocaleString('en-IN')}
            </div>
          )}
        </div>

        {/* Bar Chart Container */}
        <div style={{ height: '220px', marginTop: '20px', display: 'flex', alignItems: 'flex-end', gap: '8px', position: 'relative', paddingBottom: '24px' }}>
          
          {/* Safe Pace Reference Line */}
          {safeDailyPace > 0 && safeDailyPace <= dailyData.maxSpent && (
            <div
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: `${(safeDailyPace / dailyData.maxSpent) * 190 + 24}px`,
                borderBottom: '2px dashed #10b981',
                zIndex: 1,
                pointerEvents: 'none'
              }}
              title={`Safe Pace: ₹${Math.round(safeDailyPace)}`}
            />
          )}

          {dailyData.list.map((day) => {
            const heightPercent = dailyData.maxSpent > 0 ? (day.amount / dailyData.maxSpent) * 100 : 0;
            const isOverPace = day.amount > safeDailyPace && safeDailyPace > 0;
            const isHovered = hoveredDay?.date === day.date;

            return (
              <div
                key={day.date}
                onMouseEnter={() => setHoveredDay(day)}
                onMouseLeave={() => setHoveredDay(null)}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  height: '100%',
                  justifyContent: 'flex-end',
                  cursor: 'pointer'
                }}
              >
                {/* Visual Bar */}
                <div
                  style={{
                    width: '100%',
                    maxWidth: '36px',
                    height: `${Math.max(heightPercent, 3)}%`,
                    backgroundColor: day.amount === 0 ? '#e2e8f0' : (isOverPace ? '#f43f5e' : '#3b82f6'),
                    borderRadius: '6px 6px 0 0',
                    transition: 'all 0.2s ease',
                    opacity: isHovered ? 1 : 0.85,
                    transform: isHovered ? 'scaleY(1.05)' : 'none',
                    transformOrigin: 'bottom'
                  }}
                />

                {/* Date Label */}
                <span style={{ fontSize: '11px', color: '#64748b', marginTop: '8px', transform: 'rotate(-30deg)', whiteSpace: 'nowrap' }}>
                  {day.label.split(' ')[1]} {day.label.split(' ')[0]}
                </span>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', gap: '16px', marginTop: '16px', fontSize: '12px', color: '#64748b', justifyContent: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '12px', height: '12px', backgroundColor: '#3b82f6', borderRadius: '3px' }} />
            <span>Normal Spend</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '12px', height: '12px', backgroundColor: '#f43f5e', borderRadius: '3px' }} />
            <span>Above Daily Pace</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '16px', height: '2px', borderBottom: '2px dashed #10b981' }} />
            <span>Safe Daily Target</span>
          </div>
        </div>
      </div>

      {/* Overall Budget Progress */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ fontWeight: '600', color: '#334155' }}>Budget Utilization</span>
          <span style={{ fontWeight: '700', color: budgetUsagePercent > 90 ? '#ef4444' : '#2563eb' }}>
            {budgetUsagePercent}%
          </span>
        </div>
        <div style={progressBarContainerStyle}>
          <div
            style={{
              height: '100%',
              width: `${budgetUsagePercent}%`,
              backgroundColor: budgetUsagePercent > 90 ? '#ef4444' : '#2563eb',
              borderRadius: '9999px',
              transition: 'width 0.3s ease',
            }}
          />
        </div>
      </div>

      {/* Spending Breakdown by Category */}
      <div style={cardStyle}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', color: '#1e293b' }}>Spending by Category</h3>
        {categoryStats.categories.length === 0 ? (
          <p style={{ color: '#64748b', textAlign: 'center', margin: '20px 0' }}>No transactions recorded yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {categoryStats.categories.map((cat) => (
              <div key={cat.name}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '14px' }}>
                  <span style={{ fontWeight: '500', color: '#334155' }}>{cat.name}</span>
                  <span style={{ color: '#64748b' }}>
                    ₹{cat.amount.toLocaleString('en-IN')} ({cat.percentage}%)
                  </span>
                </div>
                <div style={progressBarContainerStyle}>
                  <div
                    style={{
                      height: '100%',
                      width: `${cat.percentage}%`,
                      backgroundColor: CATEGORY_COLORS[cat.name] || '#3b82f6',
                      borderRadius: '9999px',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}

const cardStyle = {
  backgroundColor: '#ffffff',
  borderRadius: '16px',
  padding: '24px',
  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
  border: '1px solid #e2e8f0',
};

const metricLabelStyle = {
  fontSize: '12px',
  color: '#64748b',
  fontWeight: '700',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

const metricValueStyle = {
  fontSize: '24px',
  fontWeight: '700',
  marginTop: '8px',
  display: 'block',
};

const progressBarContainerStyle = {
  height: '8px',
  backgroundColor: '#f1f5f9',
  borderRadius: '9999px',
  overflow: 'hidden',
};