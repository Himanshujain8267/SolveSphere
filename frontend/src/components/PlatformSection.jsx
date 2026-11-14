const platforms = [
  { name: 'LeetCode', tags: 'Array, DP, Graph', action: 'Connect' },
  { name: 'Codeforces', tags: 'Contest, Rating', action: 'View' },
  { name: 'CodeChef', tags: 'Practice, CP', action: 'View' },
  { name: 'GeeksforGeeks', tags: 'Theory, DSA', action: 'Connect' },
  { name: 'HackerRank', tags: 'Skills, Prep', action: 'Connect' },
];

const PlatformSection = () => {
  return (
    <section id="platforms" className="section platform-section">
      <div className="container">
        <div className="section-heading center">
          <span className="eyebrow">Coding platforms</span>
          <h2>All Your Coding Platforms, One Place</h2>
          <p>Bring your competitive programming and coding profiles together.</p>
        </div>

        <div className="platform-grid">
          {platforms.map((platform) => (
            <article className="platform-card" key={platform.name}>
              <div className="platform-icon" aria-hidden="true">{platform.name.slice(0, 2).toUpperCase()}</div>
              <h3>{platform.name}</h3>
              <p>{platform.tags}</p>
              <button type="button">{platform.action}</button>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PlatformSection;
