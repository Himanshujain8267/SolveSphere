import ThemeToggle from './ThemeToggle';

const navItems = ['Home', 'Features', 'Platforms', 'Contest Calendar', 'Preparation'];

const Header = ({ user, onSignIn, onSignOut, onEditProfile, onOpenWorkspace, onOpenPreparation, onOpenContestCalendar, isAuthLoading, mobileMenuOpen, setMobileMenuOpen, theme, onToggleTheme }) => {
  const initials = user?.displayName
    ? user.displayName
        .split(' ')
        .slice(0, 2)
        .map((name) => name[0]?.toUpperCase() || '')
        .join('')
    : user?.email?.slice(0, 2).toUpperCase() || 'SS';

  return (
    <header className="site-header">
      <div className="container header-inner">
        <a href="#home" className="brand" aria-label="SolveSphere home">
          SolveSphere
        </a>

        <nav className={`main-nav ${mobileMenuOpen ? 'open' : ''}`} aria-label="Main navigation">
          {(user ? ['Platform', 'Home', 'Contest Calendar', 'Preparation'] : navItems).map((item) => {
            const opensWorkspace = user && item === 'Platform';
            const opensPreparation = item === 'Preparation';
            const opensContestCalendar = item === 'Contest Calendar';

            return (
              <a
                key={item}
                href={opensWorkspace ? '/dashboard' : opensPreparation ? '/preparation' : opensContestCalendar ? '/contest-calendar' : `#${item.toLowerCase()}`}
                onClick={(event) => {
                  setMobileMenuOpen(false);
                  if (opensWorkspace) {
                    event.preventDefault();
                    onOpenWorkspace();
                  } else if (opensPreparation) {
                    event.preventDefault();
                    onOpenPreparation();
                  } else if (opensContestCalendar) {
                    event.preventDefault();
                    onOpenContestCalendar();
                  }
                }}
              >
                {item}
              </a>
            );
          })}
        </nav>

        <div className="header-actions">
          <ThemeToggle theme={theme} onToggle={onToggleTheme} />
          {user ? (
            <>
              <button type="button" className="header-add-profile-button" onClick={onEditProfile}>
                Add IDs
              </button>
              <button type="button" className="profile-button" onClick={onSignOut} disabled={isAuthLoading}>
                <span className="profile-avatar" aria-label="User profile avatar">
                  {user.photoURL ? (
                    <img src={user.photoURL} alt={user.displayName || user.email || 'User avatar'} />
                  ) : (
                    initials
                  )}
                </span>
                <span className="profile-label">{user.displayName || 'Profile'}</span>
              </button>
            </>
          ) : (
            <button type="button" className="sign-in-button" onClick={onSignIn} disabled={isAuthLoading}>
              {isAuthLoading ? 'Signing in...' : 'Sign In'}
            </button>
          )}

          <button
            type="button"
            className="menu-toggle"
            aria-label="Toggle navigation menu"
            onClick={() => setMobileMenuOpen((value) => !value)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
