const statCards = [
  { label: 'Total Problems', value: '248', change: '+18 this month' },
  { label: 'Solved', value: '184', change: '74% completion' },
  { label: 'Current Streak', value: '12 days', change: 'Consistency boosted' },
  { label: 'Longest Streak', value: '27 days', change: 'Best pace' },
];

const DashboardPreview = () => {
  return (
    <section id="home" className="section dashboard-preview-section">
      <div className="container">
        <div className="section-heading">
          <span className="eyebrow">Visual overview</span>
          <h2>Your Coding Progress, Visualized</h2>
        </div>

        <div className="dashboard-card">
          <div className="dashboard-header">
            <div>
              <p className="mini-label">Overview</p>
              <h3>Performance snapshot</h3>
            </div>
            <span className="pill success">+12.4%</span>
          </div>

          <div className="stat-grid">
            {statCards.map((card) => (
              <div className="stat-box" key={card.label}>
                <span>{card.label}</span>
                <strong>{card.value}</strong>
                <small>{card.change}</small>
              </div>
            ))}
          </div>

          <div className="insight-grid">
            <div className="insight-panel">
              <div className="panel-title-row">
                <h4>DSA Topics</h4>
                <span>8 active</span>
              </div>
              <div className="progress-list">
                <div><label>Arrays</label><div className="progress-bar"><span style={{ width: '86%' }} /></div></div>
                <div><label>Graphs</label><div className="progress-bar"><span style={{ width: '64%' }} /></div></div>
                <div><label>DP</label><div className="progress-bar"><span style={{ width: '72%' }} /></div></div>
                <div><label>Tree</label><div className="progress-bar"><span style={{ width: '92%' }} /></div></div>
              </div>
            </div>

            <div className="insight-panel">
              <div className="panel-title-row">
                <h4>Recent achievements</h4>
                <span>4 new</span>
              </div>
              <ul className="achievement-list">
                <li><span className="dot blue" /> 100 Days Streak</li>
                <li><span className="dot purple" /> Contest Rating 1600+</li>
                <li><span className="dot green" /> 30 Hard Questions Solved</li>
                <li><span className="dot orange" /> Interview prep milestone</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default DashboardPreview;
