const companies = [
  { name: 'Google', questions: '42 questions', topics: 'Graphs, Arrays', difficulty: 'Medium-Hard' },
  { name: 'Microsoft', questions: '37 questions', topics: 'Trees, Strings', difficulty: 'Medium' },
  { name: 'Amazon', questions: '48 questions', topics: 'Heap, DP', difficulty: 'Medium-Hard' },
  { name: 'Meta', questions: '33 questions', topics: 'Graphs, BFS', difficulty: 'Hard' },
  { name: 'Flipkart', questions: '29 questions', topics: 'Arrays, Sorting', difficulty: 'Easy-Medium' },
  { name: 'Apple', questions: '41 questions', topics: 'Trie, DP', difficulty: 'Medium-Hard' },
];

const CompanySection = ({ onOpenPreparation }) => {
  return (
    <section id="preparation" className="section company-section">
      <div className="container">
        <div className="section-heading center">
          <span className="eyebrow">Preparation</span>
          <h2>Prepare for Your Dream Company</h2>
        </div>

        <div className="company-grid">
          {companies.map((company) => (
            <article className="company-card" key={company.name}>
              <div className="company-top">
                <h3>{company.name}</h3>
                <span>{company.questions}</span>
              </div>
              <ul>
                <li><strong>Topics:</strong> {company.topics}</li>
                <li><strong>Difficulty:</strong> {company.difficulty}</li>
              </ul>
            </article>
          ))}
        </div>

        <div className="section-cta-row">
          <button type="button" className="secondary-button" onClick={onOpenPreparation}>
            Explore Company Sheets →
          </button>
        </div>
      </div>
    </section>
  );
};

export default CompanySection;
