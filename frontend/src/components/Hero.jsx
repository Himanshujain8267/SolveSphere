const Hero = ({ user, onPrimaryAction, onSecondaryAction, onLpaPrediction, onOpenContestCalendar }) => {
  const primaryLabel = user ? 'Go to Workspace' : 'Get Started';

  return (
    <section className="hero-section">
      <div className="container hero-grid">
        <div className="hero-copy">
          <span className="eyebrow">Your coding journey</span>
          <h1>
            Your Coding Journey,
            <span> All in One Place</span>
          </h1>
          <p>
            Track your coding progress, organize your preparation, analyze your performance, and stay consistent — all from one powerful workspace.
          </p>

          <div className="hero-actions">
            <button type="button" className="primary-button" onClick={onPrimaryAction}>
              {primaryLabel}
            </button>
            <button type="button" className="secondary-button" onClick={onSecondaryAction}>
              Explore Features
            </button>
            <button type="button" className="secondary-button" onClick={onLpaPrediction}>
              Predict LPA
            </button>
            <button type="button" className="secondary-button contest-calendar-button" onClick={onOpenContestCalendar}>
              Contest Calendar
            </button>
          </div>

          <div className="hero-mini-stats">
            <div>
              <strong>15K+</strong>
              <span>Problems tracked</span>
            </div>
            <div>
              <strong>96%</strong>
              <span>Weekly consistency</span>
            </div>
            <div>
              <strong>140+</strong>
              <span>Company targets</span>
            </div>
          </div>
        </div>

        <div className="hero-visual" aria-label="SolveSphere dashboard preview">
          <div className="visual-window">
            <div className="window-header">
              <span className="window-dot red" />
              <span className="window-dot yellow" />
              <span className="window-dot green" />
            </div>

            <div className="window-body">
              <aside className="sidebar-preview">
                <div className="sidebar-item active">Overview</div>
                <div className="sidebar-item">Progress</div>
                <div className="sidebar-item">Notes</div>
                <div className="sidebar-item">Sheets</div>
              </aside>

              <div className="main-preview">
                <div className="preview-topbar">
                  <div className="bar-block small" />
                  <div className="bar-block medium" />
                </div>

                <div className="mini-cards">
                  <div className="mini-card blue">
                    <span>Problems</span>
                    <strong>184</strong>
                  </div>
                  <div className="mini-card purple">
                    <span>Streak</span>
                    <strong>12d</strong>
                  </div>
                  <div className="mini-card green">
                    <span>Rating</span>
                    <strong>1.6k</strong>
                  </div>
                </div>

                <div className="chart-panel">
                  <div className="chart-bars">
                    <span style={{ height: '30%' }} />
                    <span style={{ height: '48%' }} />
                    <span style={{ height: '72%' }} />
                    <span style={{ height: '55%' }} />
                    <span style={{ height: '84%' }} />
                    <span style={{ height: '76%' }} />
                    <span style={{ height: '92%' }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
