const FinalCTA = ({ user, onPrimaryAction }) => {
  return (
    <section className="section final-cta-section">
      <div className="container final-cta-box">
        <div>
          <span className="eyebrow">Start today</span>
          <h2>Ready to Solve Smarter?</h2>
          <p>Build consistency, track your progress and take control of your coding journey.</p>
        </div>

        <button type="button" className="primary-button" onClick={onPrimaryAction}>
          {user ? 'Open Workspace' : 'Start Your Journey'}
        </button>
      </div>
    </section>
  );
};

export default FinalCTA;
