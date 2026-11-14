import { useEffect, useState } from 'react';
import { auth } from '../firebase';
import { API_BASE_URL } from '../api';

const platforms = [
  { id: 'leetcode', name: 'LeetCode', hint: 'e.g. alex-codes' },
  { id: 'geeksforgeeks', name: 'GeeksforGeeks', hint: 'e.g. alexcodes' },
  { id: 'codeforces', name: 'Codeforces', hint: 'e.g. alex_cf' },
  { id: 'github', name: 'GitHub', hint: 'e.g. alex-dev' },
];

const readSavedHandles = (uid) => {
  try {
    return JSON.parse(localStorage.getItem(`solvesphere-handles-${uid}`) || '{}');
  } catch {
    return {};
  }
};

const ProfileSetup = ({
  user,
  onSignOut,
  isAuthLoading,
  onHome,
  onSaved,
  onOpenPreparation,
}) => {
  const [handles, setHandles] = useState(() => readSavedHandles(user.uid));
  const [saveMessage, setSaveMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let isActive = true;

    const loadPlatformProfile = async () => {
      try {
        const firebaseUser = auth?.currentUser;
        if (!firebaseUser || firebaseUser.uid !== user.uid) return;

        const idToken = await firebaseUser.getIdToken();
        const response = await fetch(`${API_BASE_URL}/platforms/profile`, {
          headers: { Authorization: `Bearer ${idToken}` },
        });

        if (response.status === 404) return;

        const payload = await response.json();
        if (!response.ok) throw new Error(payload?.message || 'Unable to load your platform IDs.');
        if (isActive) setHandles(payload?.data?.platforms || {});
      } catch {
        if (isActive) {
          setSaveMessage(`Could not load saved IDs. Check that the backend is running at ${API_BASE_URL}.`);
        }
      }
    };

    loadPlatformProfile();
    return () => {
      isActive = false;
    };
  }, [user.uid]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const submittedPlatforms = Object.fromEntries(
      Object.entries(handles)
        .map(([platform, handle]) => [platform, typeof handle === 'string' ? handle.trim() : ''])
        .filter(([, handle]) => handle)
    );

    if (!Object.keys(submittedPlatforms).length) {
      setSaveMessage('Enter at least one platform username before saving.');
      return;
    }

    const firebaseUser = auth?.currentUser;
    if (!firebaseUser || firebaseUser.uid !== user.uid) {
      setSaveMessage('Your sign-in session has expired. Sign in again to save your IDs.');
      return;
    }

    try {
      setIsSaving(true);
      setSaveMessage('');
      const idToken = await firebaseUser.getIdToken();
      const response = await fetch(`${API_BASE_URL}/platforms/profile`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ platforms: submittedPlatforms }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.message || 'Unable to save platform IDs.');
      }

      const savedPlatforms = payload?.data?.platforms || submittedPlatforms;
      setHandles(savedPlatforms);
      try {
        localStorage.setItem(`solvesphere-handles-${user.uid}`, JSON.stringify(savedPlatforms));
      } catch (storageError) {
        console.warn('Could not cache saved platform IDs locally.', storageError);
      }
      setSaveMessage('Your platform IDs have been saved.');
      onSaved?.();
    } catch (error) {
      setSaveMessage(error instanceof TypeError && error.message === 'Failed to fetch'
        ? `Could not reach the backend at ${API_BASE_URL}. Start the backend and check its database connection.`
        : error?.message || 'Unable to save platform IDs.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="profile-page">
      <header className="profile-topbar">
        <div className="profile-topbar-inner">
          <button type="button" className="profile-brand" onClick={onHome}>
            SolveSphere
          </button>
          <div className="profile-account">
            <span className="profile-account-name">{user.displayName || user.email}</span>
            <button type="button" className="preparation-nav-button" onClick={onOpenPreparation}>
              Preparation
            </button>
            <button type="button" className="profile-signout" onClick={onSignOut} disabled={isAuthLoading}>
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="profile-main">
        <div className="profile-heading">
          <p className="profile-kicker">YOUR SOLVESPHERE PROFILE</p>
          <h1>Bring your practice together.</h1>
          <p className="profile-description">
            Add your platform usernames to keep your coding profiles connected in one place.
          </p>
        </div>

        <form className="profile-form" onSubmit={handleSubmit}>
          <div className="profile-handle-grid">
            {platforms.map((platform) => (
              <label className="handle-field" htmlFor={`handle-${platform.id}`} key={platform.id}>
                <span className={`platform-mark platform-mark-${platform.id}`} aria-hidden="true">
                  {platform.name.slice(0, 1)}
                </span>
                <span className="handle-field-copy">
                  <span className="handle-platform-name">{platform.name}</span>
                  <span className="handle-platform-hint">Username or profile URL</span>
                </span>
                <input
                  id={`handle-${platform.id}`}
                  type="text"
                  autoComplete="off"
                  placeholder={platform.hint}
                  value={handles[platform.id] || ''}
                  onChange={(event) => {
                    setHandles((current) => ({ ...current, [platform.id]: event.target.value }));
                    setSaveMessage('');
                  }}
                />
              </label>
            ))}
          </div>

          <div className="profile-form-footer">
            <p className="profile-save-message" role="status">{saveMessage}</p>
            <button type="submit" className="profile-save-button" disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save profile IDs'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
};

export default ProfileSetup;