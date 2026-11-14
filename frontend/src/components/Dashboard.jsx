import { useCallback, useEffect, useState } from 'react';
import { auth } from '../firebase';
import { API_BASE_URL } from '../api';

const platforms = [
  {
    id: 'leetcode',
    name: 'LeetCode',
    profileUrl: (username) => `https://leetcode.com/u/${encodeURIComponent(username)}/`,
    metrics: [
      ['solved', 'Problems solved'],
      ['easySolved', 'Easy'],
      ['mediumSolved', 'Medium'],
      ['hardSolved', 'Hard'],
      ['ranking', 'Global ranking'],
      ['contestRating', 'Contest rating'],
      ['contestGlobalRanking', 'Contest rank'],
    ],
  },
  {
    id: 'geeksforgeeks',
    name: 'GeeksforGeeks',
    profileUrl: (username) => `https://www.geeksforgeeks.org/user/${encodeURIComponent(username)}/`,
    metrics: [
      ['solved', 'Problems solved'],
      ['codingScore', 'Coding score'],
      ['currentStreak', 'Current streak'],
      ['maxStreak', 'Longest streak'],
    ],
  },
  {
    id: 'codeforces',
    name: 'Codeforces',
    profileUrl: (username) => `https://codeforces.com/profile/${encodeURIComponent(username)}`,
    metrics: [
      ['solved', 'Problems solved'],
      ['rating', 'Current rating'],
      ['maxRating', 'Max rating'],
      ['rank', 'Rank'],
      ['contests', 'Contests entered'],
    ],
  },
  {
    id: 'github',
    name: 'GitHub',
    profileUrl: (username) => `https://github.com/${encodeURIComponent(username)}`,
    metrics: [
      ['publicRepos', 'Public repositories'],
      ['followers', 'Followers'],
      ['following', 'Following'],
      ['publicGists', 'Public gists'],
    ],
  },
];

const formatValue = (value) => (
  typeof value === 'number' ? value.toLocaleString() : value
);

const chartPlatforms = platforms.filter(({ id }) => id !== 'github');
const chartColors = {
  leetcode: '#4568ff',
  geeksforgeeks: '#16a05a',
  codeforces: '#ed9228',
};
const difficultyColors = {
  Easy: '#20a464',
  Medium: '#ed9228',
  Hard: '#e4546b',
};

const MiniBarChart = ({ items, accent, label }) => {
  const maximum = Math.max(1, ...items.map(({ value }) => value ?? 0));

  if (!items.some(({ value }) => typeof value === 'number')) {
    return <p className="platform-chart-empty">Chart data is not available yet.</p>;
  }

  return (
    <div className="platform-mini-bars" role="img" aria-label={label}>
      {items.map(({ label: itemLabel, value }) => (
        <div className="platform-mini-bar-row" key={itemLabel}>
          <span className="platform-mini-bar-label">{itemLabel}</span>
          <span className="platform-mini-bar-track">
            <span
              className="platform-mini-bar-fill"
              style={{
                width: typeof value === 'number' ? `${Math.max((value / maximum) * 100, value > 0 ? 2 : 0)}%` : '0%',
                backgroundColor: accent,
              }}
            />
          </span>
          <strong>{typeof value === 'number' ? value.toLocaleString() : '—'}</strong>
        </div>
      ))}
    </div>
  );
};

const RatingHistoryChart = ({ history, platformName, accent }) => {
  const ratings = history.map(({ rating }) => rating);
  const minimum = Math.min(...ratings);
  const maximum = Math.max(...ratings);
  const range = maximum - minimum || 1;
  const points = history.map(({ rating }, index) => {
    const x = history.length === 1 ? 160 : 18 + (index / (history.length - 1)) * 284;
    const y = 87 - ((rating - minimum) / range) * 62;
    return { ...history[index], x, y };
  });
  const latest = points[points.length - 1];

  return (
    <div className="platform-rating-chart">
      <div className="platform-mini-chart-heading">
        <p className="platform-mini-chart-title">Contest rating trend</p>
        <strong>{latest.rating.toLocaleString()}</strong>
      </div>
      <svg
        className="rating-history-chart"
        viewBox="0 0 320 112"
        role="img"
        aria-label={`${platformName} contest rating history, latest rating ${latest.rating}`}
        style={{ '--chart-accent': accent }}
      >
        {[24, 55, 87].map((y) => <line key={y} x1="12" y1={y} x2="308" y2={y} />)}
        <polyline points={points.map(({ x, y }) => `${x},${y}`).join(' ')} />
        {points.map(({ x, y, rating, contestName, startTime }, index) => (
          <circle key={`${x}-${index}`} cx={x} cy={y} r={index === points.length - 1 ? 4 : 2.5}>
            <title>
              {`${contestName}: ${rating.toLocaleString()}${startTime ? ` · ${new Date(startTime * 1000).toLocaleDateString()}` : ''}`}
            </title>
          </circle>
        ))}
        <text x="14" y="106">Last {history.length} contests</text>
        <text x="306" y="106" textAnchor="end">Current rating</text>
      </svg>
    </div>
  );
};

const PlatformMiniChart = ({ platformId, stats }) => {
  if (platformId === 'leetcode') {
    const difficultyItems = [
      { label: 'Easy', value: stats.easySolved },
      { label: 'Medium', value: stats.mediumSolved },
      { label: 'Hard', value: stats.hardSolved },
    ];
    const hasDifficultyCounts = difficultyItems.some(({ value }) => typeof value === 'number');

    return (
      <div className="platform-mini-chart">
        <p className="platform-mini-chart-title">
          {hasDifficultyCounts ? 'Solved by difficulty' : 'Problem-solving snapshot'}
        </p>
        <MiniBarChart
          label={hasDifficultyCounts ? 'LeetCode solved problems by difficulty' : 'LeetCode profile summary'}
          accent="#4568ff"
          items={hasDifficultyCounts ? difficultyItems : [{ label: 'Solved', value: stats.solved }]}
        />
        {stats.ratingHistory?.length > 0 && (
          <RatingHistoryChart
            history={stats.ratingHistory}
            platformName="LeetCode"
            accent="#4568ff"
          />
        )}
      </div>
    );
  }

  if (platformId === 'geeksforgeeks') {
    const categoryItems = [
      { label: 'School', value: stats.schoolSolved },
      { label: 'Basic', value: stats.basicSolved },
      { label: 'Easy', value: stats.easySolved },
      { label: 'Medium', value: stats.mediumSolved },
      { label: 'Hard', value: stats.hardSolved },
    ];
    const hasCategories = categoryItems.some(({ value }) => typeof value === 'number');

    return (
      <div className="platform-mini-chart">
        <p className="platform-mini-chart-title">
          {hasCategories ? 'Solved by category' : 'Profile activity snapshot'}
        </p>
        <MiniBarChart
          label={hasCategories ? 'GeeksforGeeks solved problems by category' : 'GeeksforGeeks profile activity'}
          accent="#169447"
          items={hasCategories ? categoryItems : [
            { label: 'Solved', value: stats.solved },
            { label: 'Coding score', value: stats.codingScore },
            { label: 'Current streak', value: stats.currentStreak },
          ]}
        />
      </div>
    );
  }

  if (platformId === 'codeforces') {
    const history = (stats.ratingHistory || []).filter(({ rating }) => typeof rating === 'number');
    if (history.length > 0) {
      return (
        <div className="platform-mini-chart">
          <RatingHistoryChart
            history={history}
            platformName="Codeforces"
            accent="#ed9228"
          />
        </div>
      );
    }

    const ratingItems = typeof stats.rating === 'number' || typeof stats.maxRating === 'number'
      ? [
        { label: 'Current rating', value: stats.rating },
        { label: 'Peak rating', value: stats.maxRating },
      ]
      : [
        { label: 'Problems solved', value: stats.solved },
        { label: 'Contests entered', value: stats.contests },
      ];

    return (
      <div className="platform-mini-chart">
        <p className="platform-mini-chart-title">Rating overview</p>
        <MiniBarChart label="Codeforces rating and activity" accent="#ed9228" items={ratingItems} />
      </div>
    );
  }

  return (
    <div className="platform-mini-chart">
      <p className="platform-mini-chart-title">Public activity</p>
      <MiniBarChart
        label="GitHub public profile activity counts"
        accent="#354052"
        items={[
          { label: 'Repositories', value: stats.publicRepos },
          { label: 'Followers', value: stats.followers },
          { label: 'Following', value: stats.following },
          { label: 'Gists', value: stats.publicGists },
        ]}
      />
    </div>
  );
};

const Dashboard = ({ user, onSignOut, isAuthLoading, onEditProfile, onHome, onOpenPreparation }) => {
  const [dashboard, setDashboard] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDashboard = useCallback(async () => {
    const firebaseUser = auth?.currentUser;
    if (!firebaseUser || firebaseUser.uid !== user.uid) {
      setError('Your sign-in session has expired. Sign in again to load your dashboard.');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError('');
      const idToken = await firebaseUser.getIdToken();
      const response = await fetch(`${API_BASE_URL}/platforms/dashboard`, {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.message || 'Unable to load your platform data.');
      }
      setDashboard(payload?.data || null);
    } catch (loadError) {
      setError(loadError instanceof TypeError && loadError.message === 'Failed to fetch'
        ? `Cannot reach the backend at ${API_BASE_URL}. Start the backend and check its database connection.`
        : loadError?.message || 'Unable to load your platform data.');
    } finally {
      setIsLoading(false);
    }
  }, [user.uid]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const platformResults = dashboard?.platforms || {};
  const linkedCount = platforms.filter(({ id }) => platformResults[id]?.connected).length;
  const syncedCount = platforms.filter(({ id }) => (
    platformResults[id]?.connected && !platformResults[id]?.error
  )).length;
  const solvedPlatformCount = ['leetcode', 'geeksforgeeks', 'codeforces'].filter((id) => (
    typeof platformResults[id]?.stats?.solved === 'number'
  )).length;
  const totalSolved = ['leetcode', 'geeksforgeeks', 'codeforces'].reduce((total, id) => {
    const solved = platformResults[id]?.stats?.solved;
    return total + (typeof solved === 'number' ? solved : 0);
  }, 0);
  const solvedChartData = chartPlatforms.map((platform) => ({
    ...platform,
    value: typeof platformResults[platform.id]?.stats?.solved === 'number'
      ? platformResults[platform.id].stats.solved
      : null,
  }));
  const maxSolvedValue = Math.max(1, ...solvedChartData.map(({ value }) => value ?? 0));
  const hasSolvedChartData = solvedChartData.some(({ value }) => value !== null);
  const difficultyData = [
    { label: 'Easy', value: platformResults.leetcode?.stats?.easySolved },
    { label: 'Medium', value: platformResults.leetcode?.stats?.mediumSolved },
    { label: 'Hard', value: platformResults.leetcode?.stats?.hardSolved },
  ];
  const hasDifficultyData = difficultyData.some(({ value }) => typeof value === 'number');
  const difficultyTotal = difficultyData.reduce((sum, { value }) => sum + (value || 0), 0);
  const donutRadius = 48;
  const donutCircumference = 2 * Math.PI * donutRadius;
  let donutOffset = 0;
  const userInitial = (user.displayName || user.email || 'S').trim().slice(0, 1).toUpperCase();

  return (
    <div className="profile-page dashboard-page">
      <header className="profile-topbar">
        <div className="profile-topbar-inner">
          <button type="button" className="profile-brand" onClick={onHome}>
            <span className="dashboard-brand-mark" aria-hidden="true">S</span>
            SolveSphere
          </button>
          <div className="profile-account">
            <span className="profile-account-name">{user.displayName || user.email}</span>
            <span className="dashboard-user-avatar" aria-hidden="true">{userInitial}</span>
            <button type="button" className="profile-signout" onClick={onSignOut} disabled={isAuthLoading}>
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="profile-main dashboard-main">
        <section className="dashboard-welcome-panel">
          <div className="dashboard-welcome-copy">
            <p className="dashboard-eyebrow"><span /> YOUR CODING WORKSPACE</p>
            <h1>Welcome back, {user.displayName?.split(' ')[0] || 'coder'}.</h1>
            <p>One clear view of your practice across all your connected platforms.</p>
          </div>
          <div className="dashboard-actions">
            <button type="button" className="dashboard-home-button" onClick={onHome}>
              <span aria-hidden="true">⌂</span> Home
            </button>
            <button type="button" className="preparation-nav-button" onClick={onOpenPreparation}>
              Preparation
            </button>
            <button type="button" className="dashboard-refresh-button" onClick={loadDashboard} disabled={isLoading}>
              <span aria-hidden="true">↻</span> {isLoading ? 'Refreshing...' : 'Refresh stats'}
            </button>
            <button type="button" className="dashboard-edit-button" onClick={onEditProfile}>
              Add / edit IDs <span aria-hidden="true">↗</span>
            </button>
          </div>
          <div className="dashboard-orb dashboard-orb-one" />
          <div className="dashboard-orb dashboard-orb-two" />
        </section>

        {dashboard && (
          <section className="dashboard-summary-grid" aria-label="Coding overview">
            <article className="dashboard-summary-card summary-blue">
              <span className="summary-icon" aria-hidden="true">⌘</span>
              <div><p>Connected platforms</p><strong>{linkedCount}<small> / {platforms.length}</small></strong></div>
            </article>
            <article className="dashboard-summary-card summary-violet">
              <span className="summary-icon" aria-hidden="true">✓</span>
              <div><p>Profiles synced</p><strong>{syncedCount}<small> of {linkedCount} connected</small></strong></div>
            </article>
            <article className="dashboard-summary-card summary-green">
              <span className="summary-icon" aria-hidden="true">▤</span>
              <div>
                <p>Problems solved</p>
                <strong>{solvedPlatformCount ? totalSolved.toLocaleString() : '—'}<small> across platforms</small></strong>
              </div>
            </article>
          </section>
        )}

        {dashboard && (
          <section className="dashboard-charts-grid" aria-label="Progress charts">
            <article className="dashboard-chart-card">
              <div className="dashboard-chart-heading">
                <div>
                  <p className="dashboard-section-kicker">PROBLEM SOLVING</p>
                  <h2>Solved by platform</h2>
                </div>
                <span className="chart-caption">Problems</span>
              </div>
              {hasSolvedChartData ? (
                <svg className="solved-bar-chart" viewBox="0 0 640 258" role="img" aria-labelledby="solved-chart-title solved-chart-description">
                  <title id="solved-chart-title">Problems solved by platform</title>
                  <desc id="solved-chart-description">Bar chart comparing solved problem totals from LeetCode, GeeksforGeeks, and Codeforces.</desc>
                  {[0, 0.25, 0.5, 0.75, 1].map((fraction) => {
                    const y = 198 - fraction * 148;
                    return (
                      <g key={fraction}>
                        <line x1="58" y1={y} x2="620" y2={y} />
                        <text x="48" y={y + 4} textAnchor="end">
                          {Math.round(maxSolvedValue * fraction).toLocaleString()}
                        </text>
                      </g>
                    );
                  })}
                  {solvedChartData.map((item, index) => {
                    const slotWidth = 562 / solvedChartData.length;
                    const centerX = 58 + slotWidth * (index + 0.5);
                    const barHeight = item.value === null ? 0 : (item.value / maxSolvedValue) * 148;
                    const barY = 198 - barHeight;
                    return (
                      <g key={item.id}>
                        {item.value !== null && (
                          <>
                            <rect
                              className="solved-chart-bar-shadow"
                              x={centerX - 28}
                              y={barY + 4}
                              width="56"
                              height={Math.max(barHeight - 4, 0)}
                              rx="9"
                            />
                            <rect
                              x={centerX - 28}
                              y={barY}
                              width="56"
                              height={Math.max(barHeight, 4)}
                              rx="9"
                              fill={chartColors[item.id]}
                            />
                          </>
                        )}
                        <text className="solved-chart-value" x={centerX} y={item.value === null ? 185 : Math.max(barY - 10, 20)} textAnchor="middle">
                          {item.value === null ? '—' : item.value.toLocaleString()}
                        </text>
                        <text className="solved-chart-label" x={centerX} y="226" textAnchor="middle">
                          {item.name === 'GeeksforGeeks' ? 'GeeksforGeeks' : item.name}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              ) : (
                <div className="chart-empty-state">Solved-problem data will appear here when available.</div>
              )}
              <p className="chart-footnote">GitHub activity is shown in its platform card.</p>
            </article>

            <article className="dashboard-chart-card difficulty-chart-card">
              <div className="dashboard-chart-heading">
                <div>
                  <p className="dashboard-section-kicker">LEETCODE BREAKDOWN</p>
                  <h2>Difficulty mix</h2>
                </div>
                <span className="chart-caption">Solved</span>
              </div>
              {hasDifficultyData ? (
                <div className="difficulty-chart-content">
                  <svg className="difficulty-donut" viewBox="0 0 160 160" role="img" aria-labelledby="difficulty-chart-title difficulty-chart-description">
                    <title id="difficulty-chart-title">LeetCode solved problems by difficulty</title>
                    <desc id="difficulty-chart-description">{difficultyTotal.toLocaleString()} total solved, split across easy, medium, and hard problems.</desc>
                    <circle className="difficulty-donut-track" cx="80" cy="80" r={donutRadius} />
                    {difficultyData.map(({ label, value }) => {
                      const segmentLength = difficultyTotal > 0
                        ? ((value || 0) / difficultyTotal) * donutCircumference
                        : 0;
                      const currentOffset = donutOffset;
                      donutOffset += segmentLength;
                      return segmentLength > 0 ? (
                        <circle
                          key={label}
                          className="difficulty-donut-segment"
                          cx="80"
                          cy="80"
                          r={donutRadius}
                          transform="rotate(-90 80 80)"
                          stroke={difficultyColors[label]}
                          strokeDasharray={`${segmentLength} ${donutCircumference - segmentLength}`}
                          strokeDashoffset={-currentOffset}
                        />
                      ) : null;
                    })}
                    <text className="difficulty-donut-total" x="80" y="77" textAnchor="middle">{difficultyTotal.toLocaleString()}</text>
                    <text className="difficulty-donut-label" x="80" y="97" textAnchor="middle">problems</text>
                  </svg>
                  <ul className="difficulty-legend">
                    {difficultyData.map(({ label, value }) => (
                      <li key={label}>
                        <span className="difficulty-legend-name">
                          <i style={{ backgroundColor: difficultyColors[label] }} />{label}
                        </span>
                        <strong>{typeof value === 'number' ? value.toLocaleString() : '—'}</strong>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="chart-empty-state">LeetCode difficulty stats will appear here when available.</div>
              )}
            </article>
          </section>
        )}

        <div className="dashboard-section-heading">
          <div>
            <p className="dashboard-section-kicker">YOUR ACCOUNTS</p>
            <h2>Platform overview</h2>
          </div>
          {dashboard?.updatedAt && (
            <span className="dashboard-updated">IDs saved {new Date(dashboard.updatedAt).toLocaleDateString()}</span>
          )}
        </div>

        {error && (
          <div className="dashboard-error-banner" role="alert">
            <span>{error}</span>
            <button type="button" onClick={loadDashboard} disabled={isLoading}>Try again</button>
          </div>
        )}
        {isLoading && !dashboard && (
          <div className="platform-dashboard-grid" aria-label="Loading platform statistics" aria-busy="true">
            {platforms.map((platform) => (
              <div className="platform-dashboard-skeleton" key={platform.id}>
                <span /><span /><span /><span />
              </div>
            ))}
          </div>
        )}

        {dashboard && (
          <section className="platform-dashboard-grid" aria-label="Coding platform statistics">
            {platforms.map((platform) => {
              const result = dashboard.platforms?.[platform.id];
              const metrics = platform.metrics.filter(([key]) => result?.stats?.[key] !== null && result?.stats?.[key] !== undefined);

              return (
                <article className={`platform-dashboard-card platform-card-${platform.id}`} key={platform.id}>
                  <div className="platform-dashboard-card-header">
                    <div className="platform-card-title">
                      <span className={`dashboard-platform-mark dashboard-mark-${platform.id}`} aria-hidden="true">
                        {platform.name.slice(0, 1)}
                      </span>
                      <div>
                        <h3>{platform.name}</h3>
                        <p>{result?.username ? `@${result.username}` : 'Account not linked'}</p>
                      </div>
                    </div>
                    <span className={`platform-status ${result?.connected && !result?.error ? 'is-connected' : ''}`}>
                      <span />{!result?.connected ? 'Not linked' : result.error ? 'Unavailable' : 'Live stats'}
                    </span>
                  </div>

                  {result?.error && <p className="platform-dashboard-error">{result.error}</p>}
                  {result?.connected && !result.error && metrics.length > 0 && (
                    <dl className="platform-metric-grid">
                      {metrics.map(([key, label]) => (
                        <div className="platform-metric" key={key}>
                          <dt>{label}</dt>
                          <dd>{formatValue(result.stats[key])}</dd>
                        </div>
                      ))}
                    </dl>
                  )}
                  {result?.connected && !result.error && result.stats && (
                    <PlatformMiniChart platformId={platform.id} stats={result.stats} />
                  )}
                  {result?.connected && !result.error && metrics.length === 0 && (
                    <p className="platform-dashboard-empty">No statistics were returned for this profile.</p>
                  )}
                  {!result?.connected && (
                    <div className="platform-unlinked-state">
                      <p>Connect your {platform.name} profile to see your progress here.</p>
                      <button type="button" onClick={onEditProfile}>Add profile ID <span aria-hidden="true">→</span></button>
                    </div>
                  )}
                  {result?.username && (
                    <a className="platform-profile-link" href={platform.profileUrl(result.username)} target="_blank" rel="noreferrer">
                      Open {platform.name} profile <span aria-hidden="true">↗</span>
                    </a>
                  )}
                </article>
              );
            })}
          </section>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
