import { useEffect, useState } from 'react';
import { auth } from '../firebase';
import { API_BASE_URL } from '../api';
import ThemeToggle from './ThemeToggle';

const preparationAreas = [
  {
    number: '01',
    title: 'Company-wise practice',
    description: 'A focused place for target-company questions, patterns, and progress.',
  },
  {
    number: '02',
    title: 'Topic roadmaps',
    description: 'Build a clear path through the core data structures and algorithms.',
  },
  {
    number: '03',
    title: 'Interview readiness',
    description: 'Bring revision plans and preparation milestones into one view.',
  },
];

const getUserToken = async (user) => {
  const firebaseUser = auth?.currentUser;
  if (!user || !firebaseUser || firebaseUser.uid !== user.uid) {
    throw new Error('Your sign-in session has expired. Sign in again to continue.');
  }
  return firebaseUser.getIdToken();
};

const authenticatedRequest = async (user, path, options = {}) => {
  const idToken = await getUserToken(user);
  return fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${idToken}`,
      ...options.headers,
    },
  });
};

const PreparationPage = ({
  user,
  onHome,
  onOpenWorkspace,
  onEditProfile,
  onSignIn,
  onSignOut,
  isAuthLoading,
  theme,
  onToggleTheme,
}) => {
  const [plan, setPlan] = useState(null);
  const [planError, setPlanError] = useState(null);
  const [fallbackDifficulty, setFallbackDifficulty] = useState('Medium');
  const [isGenerating, setIsGenerating] = useState(false);
  const [topicOptions, setTopicOptions] = useState([]);
  const [selectedTopic, setSelectedTopic] = useState('');
  const [topicPlan, setTopicPlan] = useState(null);
  const [topicError, setTopicError] = useState(null);
  const [isLoadingTopics, setIsLoadingTopics] = useState(false);
  const [isGeneratingTopic, setIsGeneratingTopic] = useState(false);
  const [solvedProblemIds, setSolvedProblemIds] = useState(() => new Set());
  const [savingProblemId, setSavingProblemId] = useState(null);
  const [isLoadingProgress, setIsLoadingProgress] = useState(false);
  const [isLoadingPlans, setIsLoadingPlans] = useState(false);
  const [progressError, setProgressError] = useState('');
  const userId = user?.uid;

  useEffect(() => {
    let isCurrent = true;
    setPlan(null);
    setTopicPlan(null);
    setSolvedProblemIds(new Set());
    setProgressError('');
    setTopicError(null);
    setTopicOptions([]);
    setSelectedTopic('');
    setIsLoadingTopics(false);
    setIsLoadingProgress(Boolean(userId));
    setIsLoadingPlans(Boolean(userId));

    if (!userId) {
      return () => {
        isCurrent = false;
      };
    }

    const loadProgress = async () => {
      try {
        const response = await authenticatedRequest({ uid: userId }, '/platforms/preparation-progress');
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload?.message || 'Unable to load saved question progress.');
        }
        if (isCurrent) setSolvedProblemIds(new Set(payload.data.solvedProblemIds));
      } catch (error) {
        if (isCurrent) setProgressError(error.message);
      } finally {
        if (isCurrent) setIsLoadingProgress(false);
      }
    };

    const loadPlans = async () => {
      try {
        const response = await authenticatedRequest({ uid: userId }, '/platforms/preparation-plans');
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload?.message || 'Unable to restore your active study plans.');
        }
        if (isCurrent) {
          setPlan(payload.data.levelPlan);
          setTopicPlan(payload.data.topicPlan);
        }
      } catch (error) {
        if (isCurrent) setProgressError(error.message);
      } finally {
        if (isCurrent) setIsLoadingPlans(false);
      }
    };

    const loadTopics = async () => {
      try {
        setIsLoadingTopics(true);
        const response = await authenticatedRequest({ uid: userId }, '/platforms/preparation-topics');
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload?.message || 'Unable to load available topics.');
        }
        if (isCurrent) {
          const topics = payload.data.topics;
          setTopicOptions(topics);
          setSelectedTopic(topics[0] || '');
        }
      } catch (error) {
        if (isCurrent) setTopicError(error.message);
      } finally {
        if (isCurrent) setIsLoadingTopics(false);
      }
    };

    void loadProgress();
    void loadPlans();
    void loadTopics();

    return () => {
      isCurrent = false;
    };
  }, [userId]);

  const generatePlan = async (event) => {
    event.preventDefault();
    const firebaseUser = auth?.currentUser;
    if (!user || !firebaseUser || firebaseUser.uid !== user.uid) {
      setPlanError({
        message: 'Your sign-in session has expired. Sign in again to create a personal plan.',
        code: 'AUTH_REQUIRED',
      });
      return;
    }

    try {
      setIsGenerating(true);
      setPlanError(null);
      const idToken = await firebaseUser.getIdToken();
      const response = await fetch(`${API_BASE_URL}/platforms/preparation-plan`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(
          planError?.code === 'LEVEL_REQUIRED' ? { fallbackDifficulty } : {}
        ),
      });
      const payload = await response.json();

      if (!response.ok) {
        setPlanError({
          message: payload?.message || 'Unable to create your study plan.',
          code: payload?.code || 'PLAN_REQUEST_FAILED',
        });
        return;
      }

      setPlan(payload.data);
    } catch (error) {
      setPlanError({
        message: error instanceof TypeError && error.message === 'Failed to fetch'
          ? `Cannot reach the backend at ${API_BASE_URL}. Start the backend and try again.`
          : error?.message || 'Unable to create your study plan.',
        code: 'PLAN_REQUEST_FAILED',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const generateTopicPlan = async (event) => {
    event.preventDefault();
    if (!selectedTopic) return;

    try {
      setIsGeneratingTopic(true);
      setTopicError(null);
      const response = await authenticatedRequest(user, '/platforms/preparation-plan/topic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: selectedTopic }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setTopicError(payload?.message || 'Unable to create a topic practice set.');
        return;
      }
      setTopicPlan(payload.data);
    } catch (error) {
      setTopicError(error.message || 'Unable to create a topic practice set.');
    } finally {
      setIsGeneratingTopic(false);
    }
  };

  const toggleQuestionSolved = async (question, topic = '') => {
    const nextSolved = !solvedProblemIds.has(question.problem_id);
    setSavingProblemId(question.problem_id);
    setProgressError('');

    try {
      const response = await authenticatedRequest(user, '/platforms/preparation-progress', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problemId: question.problem_id,
          platform: question.platform,
          title: question.title,
          url: question.url,
          difficulty: question.difficulty,
          topic: topic || question.tags || '',
          solved: nextSolved,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.message || 'Unable to save this question progress.');
      }
      setSolvedProblemIds((current) => {
        const updated = new Set(current);
        if (nextSolved) updated.add(question.problem_id);
        else updated.delete(question.problem_id);
        return updated;
      });
      if (payload.data.completedPlanTypes?.includes('level')) setPlan(null);
      if (payload.data.completedPlanTypes?.includes('topic')) setTopicPlan(null);
    } catch (error) {
      setProgressError(error.message || 'Unable to save this question progress.');
    } finally {
      setSavingProblemId(null);
    }
  };

  const renderQuestion = (question, index, topic = '') => {
    const isSolved = solvedProblemIds.has(question.problem_id);
    const difficultyLabel = question.platform === 'Codeforces'
      ? `Rating ${question.difficulty}`
      : question.difficulty === 1000
        ? 'Easy'
        : question.difficulty === 1500
          ? 'Medium'
          : 'Hard';

    return (
      <article
        className={`preparation-question${isSolved ? ' is-solved' : ''}`}
        key={question.problem_id}
      >
        <span className="preparation-question-number">{String(index + 1).padStart(2, '0')}</span>
        <div className="preparation-question-copy">
          <div className="preparation-question-meta">
            <span>{question.type}</span>
            <span className={`preparation-difficulty difficulty-${question.difficulty}`}>
              {difficultyLabel}
            </span>
          </div>
          <h4>{question.title}</h4>
          <p>{question.reason}</p>
        </div>
        <button
          type="button"
          className="preparation-solved-toggle"
          aria-label={isSolved ? `Mark ${question.title} as not solved` : `Mark ${question.title} as solved`}
          aria-pressed={isSolved}
          title={isSolved ? 'Mark as not solved' : 'Mark as solved'}
          disabled={isLoadingProgress || isLoadingPlans || savingProblemId === question.problem_id}
          onClick={() => toggleQuestionSolved(question, topic)}
        >
          {isSolved ? '✓' : ''}
        </button>
        <a href={question.url} target="_blank" rel="noreferrer">
          Solve <span aria-hidden="true">↗</span>
        </a>
      </article>
    );
  };

  return (
    <div className="preparation-page">
      <header className="profile-topbar preparation-topbar">
        <div className="profile-topbar-inner">
          <button type="button" className="profile-brand" onClick={onHome}>
            <span className="dashboard-brand-mark" aria-hidden="true">S</span>
            SolveSphere
          </button>
          <div className="preparation-topbar-actions">
            <ThemeToggle theme={theme} onToggle={onToggleTheme} />
            {user ? (
              <>
                <button type="button" className="preparation-nav-button" onClick={onEditProfile}>
                  Edit platform IDs
                </button>
                <button type="button" className="profile-signout" onClick={onSignOut} disabled={isAuthLoading}>
                  Sign out
                </button>
              </>
            ) : (
              <button type="button" className="preparation-nav-button" onClick={onHome}>
                Back to home
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="preparation-main">
        <section className="preparation-hero">
          <div className="preparation-hero-copy">
            <p className="preparation-kicker"><span /> YOUR NEXT MILESTONE</p>
            <h1>Make your next move <span>count.</span></h1>
            <p className="preparation-intro">
              Turn your LeetCode contest rating into a focused daily plan.
              Get five hand-picked questions with direct links and a clear practice flow.
            </p>
            {user ? (
              <button
                type="button"
                className="preparation-primary-button"
                onClick={onOpenWorkspace}
              >
                <span aria-hidden="true">⌂</span> Your coding workspace
              </button>
            ) : (
              <button
                type="button"
                className="preparation-primary-button"
                onClick={onSignIn}
                disabled={isAuthLoading}
              >
                {isAuthLoading ? 'Signing in...' : 'Sign in to personalize'}
              </button>
            )}
          </div>
          <div className="preparation-hero-art" aria-hidden="true">
            <div className="prep-orbit prep-orbit-outer" />
            <div className="prep-orbit prep-orbit-inner" />
            <div className="prep-core"><span>SS</span></div>
            <span className="prep-float prep-float-one">FOCUS</span>
            <span className="prep-float prep-float-two">GROWTH</span>
            <span className="prep-float prep-float-three">READY</span>
          </div>
        </section>

        <section className="preparation-roadmap">
          <div className="preparation-section-heading">
            <div>
              <p className="preparation-kicker">YOUR DAILY PRACTICE</p>
              <h2>A plan shaped around your level.</h2>
            </div>
            <span className="preparation-status"><i /> Practice plans • progress saved</span>
          </div>

          <section className="preparation-plan-panel" aria-labelledby="plan-panel-title">
            <div className="preparation-plan-intro">
              <span className="preparation-plan-icon" aria-hidden="true">✦</span>
              <div>
                <p className="preparation-kicker">PERSONALIZED STUDY PLAN</p>
                <h3 id="plan-panel-title">Build today's momentum.</h3>
                <p>
                  We use your linked LeetCode contest rating to find questions around
                  your current level. No contest rating yet? Pick a starting difficulty.
                </p>
              </div>
            </div>

            {planError?.code === 'LEVEL_REQUIRED' && (
              <div className="preparation-fallback-level">
                <label htmlFor="fallback-difficulty">Choose your starting difficulty</label>
                <select
                  id="fallback-difficulty"
                  value={fallbackDifficulty}
                  onChange={(event) => setFallbackDifficulty(event.target.value)}
                >
                  <option value="Easy">Easy — building fundamentals</option>
                  <option value="Medium">Medium — comfortable with basics</option>
                  <option value="Hard">Hard — ready for a challenge</option>
                </select>
              </div>
            )}

            {planError && (
              <div className="preparation-plan-error" role="alert">
                <p>{planError.message}</p>
                {planError.code === 'LEETCODE_NOT_CONNECTED' && user && (
                  <button type="button" onClick={onEditProfile}>Connect LeetCode</button>
                )}
              </div>
            )}

            {!user && (
              <p className="preparation-plan-note">
                Sign in and connect your LeetCode username to create a plan for your account.
              </p>
            )}

            {user && (
              <button
                type="button"
                className="preparation-generate-button"
                onClick={generatePlan}
                disabled={isGenerating || isLoadingPlans || Boolean(plan)}
              >
                <span aria-hidden="true">{isGenerating ? '◌' : '✦'}</span>
                {isGenerating
                  ? 'Building your plan...'
                  : plan
                    ? 'Complete this plan to generate another'
                    : 'Generate my daily plan'}
                {!isGenerating && <span aria-hidden="true">→</span>}
              </button>
            )}

            {plan && (
              <div className="preparation-generated-plan" aria-live="polite">
                <div className="preparation-generated-heading">
                  <div>
                    <p className="preparation-kicker">YOUR FIVE-QUESTION ROUTINE</p>
                    <h3>Today's LeetCode plan</h3>
                  </div>
                  <span className="preparation-rating-badge">
                    {plan.ratingSource === 'contest_rating' ? 'Contest rating' : 'Selected level'}
                    <strong>{plan.currentRating.toLocaleString()}</strong>
                  </span>
                </div>
                <div className="preparation-plan-steps">
                  {plan.recommendations.map((question, index) => renderQuestion(question, index))}
                </div>
                <p className="preparation-plan-disclaimer">
                  Recommendations use your contest rating or selected level. Your solved checkmarks are saved to your account.
                </p>
              </div>
            )}
          </section>

          <section className="preparation-plan-panel preparation-topic-panel" aria-labelledby="topic-panel-title">
            <div className="preparation-plan-intro">
              <span className="preparation-plan-icon" aria-hidden="true">⌕</span>
              <div>
                <p className="preparation-kicker">TOPIC PRACTICE</p>
                <h3 id="topic-panel-title">Practice what you want to improve.</h3>
                <p>
                  Choose a topic to get five matching Codeforces questions. Every solved
                  checkmark is saved to your account and stays checked next time.
                </p>
              </div>
            </div>

            {user && (
              <form className="preparation-topic-form" onSubmit={generateTopicPlan}>
                <label htmlFor="preparation-topic">Choose a topic</label>
                <select
                  id="preparation-topic"
                  value={selectedTopic}
                  onChange={(event) => setSelectedTopic(event.target.value)}
                  disabled={isLoadingTopics || !topicOptions.length || isGeneratingTopic || Boolean(topicPlan)}
                >
                  {topicOptions.length
                    ? topicOptions.map((topicName) => (
                      <option value={topicName} key={topicName}>{topicName}</option>
                    ))
                    : <option value="">{isLoadingTopics ? 'Loading topics...' : 'Topics unavailable'}</option>}
                </select>
                <button
                  type="submit"
                  className="preparation-generate-button"
                  disabled={isGeneratingTopic || isLoadingTopics || isLoadingPlans || !selectedTopic || Boolean(topicPlan)}
                >
                  {isGeneratingTopic
                    ? 'Finding questions...'
                    : topicPlan
                      ? 'Complete this set to generate another'
                      : 'Generate topic questions'}
                  {!isGeneratingTopic && <span aria-hidden="true">→</span>}
                </button>
              </form>
            )}

            {topicError && (
              <div className="preparation-plan-error" role="alert">
                <p>{topicError}</p>
              </div>
            )}

            {topicPlan && (
              <div className="preparation-generated-plan" aria-live="polite">
                <div className="preparation-generated-heading">
                  <div>
                    <p className="preparation-kicker">TOPIC: {topicPlan.topic}</p>
                    <h3>Codeforces practice set</h3>
                  </div>
                  <span className="preparation-rating-badge">
                    {topicPlan.recommendations.length} questions
                  </span>
                </div>
                <div className="preparation-plan-steps">
                  {topicPlan.recommendations.map((question, index) => (
                    renderQuestion(question, index, topicPlan.topic)
                  ))}
                </div>
              </div>
            )}

            {progressError && (
              <div className="preparation-plan-error" role="alert">
                <p>{progressError}</p>
              </div>
            )}

            {user && (
              <p className="preparation-plan-disclaimer">
                {solvedProblemIds.size} question{solvedProblemIds.size === 1 ? '' : 's'} marked solved for your account.
                Topic filters use the tags available in the Codeforces catalog.
              </p>
            )}
          </section>

          <div className="preparation-area-grid">
            {preparationAreas.map((area) => (
              <article className="preparation-area-card" key={area.number}>
                <span className="preparation-area-number">{area.number}</span>
                <div>
                  <h3>{area.title}</h3>
                  <p>{area.description}</p>
                </div>
                <span className="preparation-area-status">Coming next <i aria-hidden="true">↗</i></span>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};

export default PreparationPage;
