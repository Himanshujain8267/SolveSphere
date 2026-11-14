const topicData = [
  { name: 'Arrays', value: 86 },
  { name: 'Graphs', value: 64 },
  { name: 'Trees', value: 91 },
  { name: 'Dynamic', value: 72 },
  { name: 'Strings', value: 79 },
];

const weeklyData = [4, 7, 5, 9, 8, 12, 10];

const AnalyticsSection = () => {
  return (
    <section className="section analytics-section">
      <div className="container">
        <div className="section-heading center">
          <span className="eyebrow">Know your strengths</span>
          <h2>Know Your Strengths</h2>
          <p>Understand your coding journey with meaningful analytics.</p>
        </div>

        <div className="analytics-grid">
          <div className="analytics-panel large-panel">
            <div className="panel-title-row">
              <h3>Topic distribution</h3>
              <span>Current focus</span>
            </div>

            <div className="topic-list">
              {topicData.map((topic) => (
                <div key={topic.name} className="topic-row">
                  <div className="topic-label-row">
                    <span>{topic.name}</span>
                    <span>{topic.value}%</span>
                  </div>
                  <div className="progress-bar">
                    <span style={{ width: `${topic.value}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="analytics-panel">
            <div className="panel-title-row">
              <h3>Difficulty split</h3>
              <span>Problems</span>
            </div>
            <div className="donut-wrap">
              <div className="donut-chart">
                <div className="donut-center">
                  <strong>64%</strong>
                  <span>Easy</span>
                </div>
              </div>
            </div>
            <div className="legend-list">
              <span><i className="legend-dot blue" /> Easy</span>
              <span><i className="legend-dot purple" /> Medium</span>
              <span><i className="legend-dot green" /> Hard</span>
            </div>
          </div>

          <div className="analytics-panel">
            <div className="panel-title-row">
              <h3>Weekly activity</h3>
              <span>7-day trend</span>
            </div>
            <div className="weekly-bars">
              {weeklyData.map((value, index) => (
                <div key={index} className="bar-group">
                  <span className="bar-value" style={{ height: `${value * 12}%` }} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AnalyticsSection;
