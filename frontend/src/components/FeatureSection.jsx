import FeatureCard from './FeatureCard';

const features = [
  {
    icon: '✓',
    title: 'Problem Tracker',
    description: 'Track every coding problem you solve and organize your progress with clarity.',
  },
  {
    icon: '▣',
    title: 'DSA Progress',
    description: 'Understand which topics you have mastered and where you need more practice.',
  },
  {
    icon: '✎',
    title: 'Smart Notes',
    description: 'Keep important concepts, approaches, and interview notes organized in one place.',
  },
  {
    icon: '◎',
    title: 'Company Preparation',
    description: 'Prepare systematically with company-wise sheets, patterns, and question lists.',
  },
  {
    icon: '◔',
    title: 'Coding Analytics',
    description: 'Spot solving patterns, consistency, and performance trends with focused insights.',
  },
  {
    icon: '★',
    title: 'Achievement Tracking',
    description: 'Track milestones, streaks, ratings, and coding achievements over time.',
  },
];

const FeatureSection = () => {
  return (
    <section id="features" className="section feature-section">
      <div className="container">
        <div className="section-heading center">
          <span className="eyebrow">Everything you need</span>
          <h2>Everything You Need to Level Up</h2>
          <p>
            One workspace for your coding practice, interview preparation and competitive programming journey.
          </p>
        </div>

        <div className="feature-grid">
          {features.map((feature) => (
            <FeatureCard key={feature.title} {...feature} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeatureSection;
