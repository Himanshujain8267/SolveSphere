import { useEffect, useMemo, useState } from 'react';
import ThemeToggle from './ThemeToggle';

const PLATFORM_DETAILS = {
  LeetCode: { short: 'LC', color: '#f59e0b' },
  Codeforces: { short: 'CF', color: '#3182ce' },
  CodeChef: { short: 'CC', color: '#8b5cf6' },
  AtCoder: { short: 'AC', color: '#64748b' },
  HackerRank: { short: 'HR', color: '#16a34a' },
  Topcoder: { short: 'TC', color: '#ef4444' },
};

const sameDay = (a, b) => (
  a.getFullYear() === b.getFullYear()
  && a.getMonth() === b.getMonth()
  && a.getDate() === b.getDate()
);

const formatDuration = (seconds) => {
  const hours = Math.max(0, Math.floor(Number(seconds || 0) / 3600));
  const minutes = Math.max(0, Math.floor((Number(seconds || 0) % 3600) / 60));
  if (hours >= 24) return `${Math.floor(hours / 24)}d ${hours % 24}h`;
  return hours ? `${hours}h${minutes ? ` ${minutes}m` : ''}` : `${minutes}m`;
};

const getStatus = (contest, now) => {
  const start = new Date(contest.startTime);
  const end = new Date(contest.endTime);
  if (start <= now && end >= now) return 'live';
  if (start > now) return 'upcoming';
  return 'ended';
};

const ContestCalendarPage = ({
  onHome,
  theme,
  onToggleTheme,
}) => {
  const [contests, setContests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [platform, setPlatform] = useState('All');
  const [status, setStatus] = useState('upcoming');
  const [search, setSearch] = useState('');
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const loadContests = async () => {
      try {
        setIsLoading(true);
        setError('');

        const [codeforcesResult, codechefResult, leetcodeResult] = await Promise.allSettled([
          fetch('https://codeforces.com/api/contest.list?gym=false', {
            signal: controller.signal,
          }).then(async (response) => {
            if (!response.ok) throw new Error('Codeforces schedule unavailable');
            return response.json();
          }),
          fetch('https://www.codechef.com/api/list/contests/all', {
            signal: controller.signal,
          }).then(async (response) => {
            if (!response.ok) throw new Error('CodeChef schedule unavailable');
            return response.json();
          }),
          fetch('https://leetcode.com/graphql', {
            method: 'POST',
            signal: controller.signal,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              query: 'query { allContests { title titleSlug startTime duration } }',
            }),
          }).then(async (response) => {
            if (!response.ok) throw new Error('LeetCode schedule unavailable');
            return response.json();
          }),
        ]);

        const normalized = [];

        if (codeforcesResult.status === 'fulfilled') {
          const codeforces = codeforcesResult.value?.result || [];
          codeforces.forEach((contest) => {
            const start = contest.startTimeSeconds
              ? new Date(contest.startTimeSeconds * 1000)
              : null;
            if (!start) return;
            normalized.push({
              name: contest.name,
              url: `https://codeforces.com/contest/${contest.id}`,
              startTime: start.toISOString(),
              endTime: new Date(start.getTime() + contest.durationSeconds * 1000).toISOString(),
              duration: contest.durationSeconds,
              site: 'Codeforces',
              in24Hours: false,
            });
          });
        }

        if (codechefResult.status === 'fulfilled') {
          const codechef = codechefResult.value || {};
          const lists = [
            ...(codechef.future_contests || []).map((contest) => ({ ...contest, phase: 'future' })),
            ...(codechef.present_contests || []).map((contest) => ({ ...contest, phase: 'present' })),
            ...(codechef.past_contests || []).slice(0, 20).map((contest) => ({ ...contest, phase: 'past' })),
          ];
          lists.forEach((contest) => {
            if (!contest.contest_start_date_iso) return;
            const start = new Date(contest.contest_start_date_iso);
            const duration = Number(contest.contest_duration || 0) * 60;
            normalized.push({
              name: contest.contest_name,
              url: `https://www.codechef.com/${contest.contest_code}`,
              startTime: start.toISOString(),
              endTime: new Date(start.getTime() + duration * 1000).toISOString(),
              duration,
              site: 'CodeChef',
              in24Hours: false,
            });
          });
        }

        if (leetcodeResult.status === 'fulfilled') {
          const leetcode = leetcodeResult.value?.data?.allContests || [];
          leetcode.forEach((contest) => {
            if (!contest.startTime) return;
            const start = new Date(Number(contest.startTime) * 1000);
            normalized.push({
              name: contest.title,
              url: `https://leetcode.com/contest/${contest.titleSlug}`,
              startTime: start.toISOString(),
              endTime: new Date(start.getTime() + Number(contest.duration || 0) * 1000).toISOString(),
              duration: Number(contest.duration || 0),
              site: 'LeetCode',
              in24Hours: false,
            });
          });
        }

        const successfulSources = [
          codeforcesResult,
          codechefResult,
          leetcodeResult,
        ].filter((result) => result.status === 'fulfilled').length;
        if (!successfulSources) throw new Error('The contest schedule could not be loaded.');

        const uniqueContests = Array.from(
          new Map(
            normalized
              .filter((contest) => contest.name && contest.startTime)
              .map((contest) => [`${contest.site}-${contest.name}-${contest.startTime}`, contest])
          ).values()
        ).sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
        setContests(uniqueContests);
      } catch (requestError) {
        if (requestError?.name !== 'AbortError') {
          setError(requestError?.message || 'Unable to load upcoming contests.');
        }
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    };

    void loadContests();
    return () => controller.abort();
  }, []);

  const platformOptions = useMemo(() => (
    ['All', ...Object.keys(PLATFORM_DETAILS).filter((name) => (
      contests.some((contest) => contest.site === name)
    ))]
  ), [contests]);

  const filteredContests = useMemo(() => (
    contests.filter((contest) => {
      if (platform !== 'All' && contest.site !== platform) return false;
      if (search && !contest.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (status !== 'all' && getStatus(contest, now) !== status) return false;
      return true;
    })
  ), [contests, platform, search, status, now]);

  const monthContests = useMemo(() => (
    filteredContests.filter((contest) => {
      const date = new Date(contest.startTime);
      return date.getFullYear() === month.getFullYear()
        && date.getMonth() === month.getMonth();
    })
  ), [filteredContests, month]);

  const selectedContests = useMemo(() => (
    monthContests.filter((contest) => sameDay(new Date(contest.startTime), selectedDate))
  ), [monthContests, selectedDate]);

  const nextContest = useMemo(() => (
    contests.find((contest) => getStatus(contest, now) === 'upcoming')
  ), [contests, now]);

  const calendarCells = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const gridStart = new Date(first);
    gridStart.setDate(first.getDate() - first.getDay());
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(gridStart);
      date.setDate(gridStart.getDate() + index);
      return date;
    });
  }, [month]);

  const moveMonth = (offset) => {
    const nextMonth = new Date(month.getFullYear(), month.getMonth() + offset, 1);
    setMonth(nextMonth);
  };

  const countdown = nextContest
    ? Math.max(0, new Date(nextContest.startTime).getTime() - now.getTime())
    : 0;

  const countdownParts = {
    days: Math.floor(countdown / 86400000),
    hours: Math.floor((countdown % 86400000) / 3600000),
    minutes: Math.floor((countdown % 3600000) / 60000),
  };

  const openOfficialSite = (contest) => {
    window.open(contest.url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="contest-page">
      <header className="profile-topbar contest-topbar">
        <div className="profile-topbar-inner">
          <button type="button" className="profile-brand" onClick={onHome}>
            <span className="dashboard-brand-mark" aria-hidden="true">S</span>
            SolveSphere
          </button>
          <div className="contest-topbar-actions">
            <ThemeToggle theme={theme} onToggle={onToggleTheme} />
            <button type="button" className="preparation-nav-button" onClick={onHome}>
              Back to home
            </button>
          </div>
        </div>
      </header>

      <main className="contest-main">
        <section className="contest-hero">
          <div>
            <p className="contest-kicker"><span /> LIVE CONTEST DIRECTORY</p>
            <h1>Never miss your <span>next contest.</span></h1>
            <p>Browse upcoming programming contests across your favorite platforms and jump directly to registration.</p>
          </div>

          {nextContest ? (
            <div className="contest-countdown" aria-live="polite">
              <div>
                <span>Next contest</span>
                <strong>{nextContest.name}</strong>
              </div>
              <div className="contest-countdown-time">
                <span><strong>{countdownParts.days}</strong>days</span>
                <span><strong>{countdownParts.hours}</strong>hrs</span>
                <span><strong>{countdownParts.minutes}</strong>min</span>
              </div>
            </div>
          ) : (
            <div className="contest-countdown contest-countdown-empty">
              <span>{isLoading ? 'Finding the next contest...' : 'No upcoming contest found'}</span>
            </div>
          )}
        </section>

        <section className="contest-controls" aria-label="Contest filters">
          <div className="contest-search">
            <span aria-hidden="true">⌕</span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search contests..."
              aria-label="Search contests"
            />
          </div>

          <div className="contest-status-tabs" role="group" aria-label="Contest status">
            {[
              ['upcoming', 'Upcoming'],
              ['live', 'Live now'],
              ['ended', 'Past'],
              ['all', 'All'],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={status === value ? 'active' : ''}
                onClick={() => setStatus(value)}
              >
                {label}
              </button>
            ))}
          </div>
        </section>

        <div className="contest-platform-chips" aria-label="Platform filters">
          {platformOptions.map((name) => {
            const detail = PLATFORM_DETAILS[name] || { short: '•', color: '#64748b' };
            return (
              <button
                key={name}
                type="button"
                className={platform === name ? 'active' : ''}
                onClick={() => setPlatform(name)}
                style={{ '--platform-color': detail.color }}
              >
                <span>{detail.short}</span>
                {name}
              </button>
            );
          })}
        </div>

        {error && (
          <div className="contest-error" role="alert">
            <div>
              <strong>Contest data is temporarily unavailable.</strong>
              <p>{error} Check again shortly or open a platform directly.</p>
            </div>
            <button type="button" onClick={() => window.location.reload()}>Try again</button>
          </div>
        )}

        <section className="contest-layout">
          <div className="contest-calendar-panel">
            <div className="contest-calendar-heading">
              <button type="button" aria-label="Previous month" onClick={() => moveMonth(-1)}>‹</button>
              <h2>{month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</h2>
              <button type="button" aria-label="Next month" onClick={() => moveMonth(1)}>›</button>
            </div>

            <div className="contest-weekdays" aria-hidden="true">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => <span key={day}>{day}</span>)}
            </div>

            <div className="contest-calendar-grid">
              {calendarCells.map((date) => {
                const dayContests = monthContests.filter((contest) => (
                  sameDay(new Date(contest.startTime), date)
                ));
                const outsideMonth = date.getMonth() !== month.getMonth();
                return (
                  <button
                    type="button"
                    key={date.toISOString()}
                    className={[
                      'contest-calendar-day',
                      outsideMonth ? 'outside' : '',
                      sameDay(date, selectedDate) ? 'selected' : '',
                      sameDay(date, now) ? 'today' : '',
                    ].filter(Boolean).join(' ')}
                    onClick={() => setSelectedDate(date)}
                  >
                    <span>{date.getDate()}</span>
                    <div className="contest-day-dots" aria-label={`${dayContests.length} contests`}>
                      {dayContests.slice(0, 3).map((contest) => (
                        <i
                          key={`${contest.name}-${contest.startTime}`}
                          style={{ background: PLATFORM_DETAILS[contest.site]?.color || '#64748b' }}
                        />
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <aside className="contest-agenda">
            <div className="contest-agenda-heading">
              <div>
                <span>{selectedDate.toLocaleDateString(undefined, { weekday: 'long' })}</span>
                <h2>{selectedDate.toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}</h2>
              </div>
              <span className="contest-count">{selectedContests.length}</span>
            </div>

            {isLoading ? (
              <div className="contest-loading">
                <span />
                <p>Loading contests...</p>
              </div>
            ) : selectedContests.length ? (
              <div className="contest-agenda-list">
                {selectedContests.map((contest) => {
                  const start = new Date(contest.startTime);
                  const contestStatus = getStatus(contest, now);
                  const detail = PLATFORM_DETAILS[contest.site] || { short: '•', color: '#64748b' };
                  return (
                    <article className="contest-card" key={`${contest.name}-${contest.startTime}`}>
                      <div className="contest-card-accent" style={{ background: detail.color }} />
                      <div className="contest-card-top">
                        <span
                          className="contest-platform-mark"
                          style={{ '--platform-color': detail.color }}
                        >
                          {detail.short}
                        </span>
                        <div>
                          <span className="contest-site">{contest.site}</span>
                          <span className={`contest-status contest-status-${contestStatus}`}>
                            {contestStatus === 'live' ? '● Live now' : contestStatus === 'ended' ? 'Ended' : 'Upcoming'}
                          </span>
                        </div>
                      </div>
                      <h3>{contest.name}</h3>
                      <div className="contest-card-meta">
                        <span>
                          <b>◷</b>
                          {start.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span>
                          <b>◫</b>
                          {formatDuration(contest.duration)}
                        </span>
                      </div>
                      <button type="button" onClick={() => openOfficialSite(contest)}>
                        Open contest <span aria-hidden="true">↗</span>
                      </button>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="contest-empty">
                <span aria-hidden="true">◷</span>
                <h3>No contests on this date</h3>
                <p>Choose another day or adjust the filters.</p>
              </div>
            )}
          </aside>
        </section>
      </main>
    </div>
  );
};

export default ContestCalendarPage;
