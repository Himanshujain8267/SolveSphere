const workspaceItems = [
  {
    title: 'Question Tracker',
    description: 'Keep all your important coding questions organized and easy to revisit.',
  },
  {
    title: 'Notes',
    description: 'Save approaches, explanations and important concepts for quick reference.',
  },
  {
    title: 'Custom Sheets',
    description: 'Create personalized preparation sheets for your goals and target companies.',
  },
];

const WorkspaceSection = () => {
  return (
    <section className="section workspace-section">
      <div className="container workspace-grid">
        <div className="workspace-copy">
          <span className="eyebrow">Build your workflow</span>
          <h2>Build Your Own Coding Workspace</h2>

          <div className="workspace-list">
            {workspaceItems.map((item) => (
              <article key={item.title} className="workspace-card">
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </article>
            ))}
          </div>
        </div>

        <div className="workspace-preview" aria-label="Workspace preview panel">
          <div className="preview-panel">
            <div className="row-card">
              <span>LeetCode</span>
              <strong>42 solved</strong>
            </div>
            <div className="row-card">
              <span>Interview Notes</span>
              <strong>11 saved</strong>
            </div>
            <div className="row-card highlight">
              <span>Custom Sheet</span>
              <strong>Meta Prep</strong>
            </div>
            <div className="mini-progress">
              <div className="mini-progress-head">
                <span>Prepared</span>
                <strong>72%</strong>
              </div>
              <div className="progress-bar"><span style={{ width: '72%' }} /></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default WorkspaceSection;
