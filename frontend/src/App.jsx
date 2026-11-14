import { useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut,
} from 'firebase/auth';
import { auth, isFirebaseConfigured, firebaseErrorMessage } from './firebase';
import { API_BASE_URL } from './api';
import ProfileSetup from './components/ProfileSetup';
import Dashboard from './components/Dashboard';
import Header from './components/Header';
import Hero from './components/Hero';
import FeatureSection from './components/FeatureSection';
import DashboardPreview from './components/DashboardPreview';
import AnalyticsSection from './components/AnalyticsSection';
import PlatformSection from './components/PlatformSection';
import CompanySection from './components/CompanySection';
import WorkspaceSection from './components/WorkspaceSection';
import FinalCTA from './components/FinalCTA';
import Footer from './components/Footer';
import PreparationPage from './components/PreparationPage';
import LpaPredictionPage from './components/LpaPredictionPage';

const App = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthResolved, setIsAuthResolved] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');

  useEffect(() => {
    if (!auth) {
      setIsAuthResolved(true);
      return undefined;
    }

    let isActive = true;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        if (isActive) {
          setUser(null);
          setIsAuthResolved(true);
        }
        return;
      }

      if (isActive) {
        setIsLoading(true);
        setAuthError('');
      }

      try {
        const idToken = await firebaseUser.getIdToken();
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${idToken}`,
            'Content-Type': 'application/json',
          },
        });
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload?.message || 'Authentication failed.');
        }

        if (isActive) {
          setUser({
            uid: firebaseUser.uid,
            displayName: firebaseUser.displayName,
            email: firebaseUser.email,
            photoURL: firebaseUser.photoURL,
            backendUser: payload?.data?.user,
          });
        }
      } catch (error) {
        if (isActive) {
          setAuthError(error instanceof TypeError && error.message === 'Failed to fetch'
            ? `Cannot reach the backend at ${API_BASE_URL}. Start the backend and check its database connection.`
            : error?.message || 'Google authentication failed.');
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
          setIsAuthResolved(true);
        }
      }
    });

    return () => {
      isActive = false;
      unsubscribe();
    };
  }, [navigate]);

  const handleGoogleAuth = async () => {
    if (!isFirebaseConfigured || !auth) {
      setAuthError(firebaseErrorMessage);
      setAuthSuccess('');
      return;
    }

    if (isLoading) return;

    setIsLoading(true);
    setAuthError('');
    setAuthSuccess('');

    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (error) {
      if (error?.code === 'auth/popup-blocked') {
        try {
          await signInWithRedirect(auth, new GoogleAuthProvider());
          return;
        } catch (redirectError) {
          setAuthError(redirectError?.message || 'Unable to start Google sign-in.');
          return;
        }
      }

      const message = error?.message === 'auth/popup-closed-by-user'
        ? 'Google sign-in was cancelled.'
        : error?.message || 'Google authentication failed.';

      setAuthError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      if (auth) {
        await signOut(auth);
      }
      setUser(null);
      navigate('/');
      setAuthSuccess('Signed out successfully.');
      setAuthError('');
    } catch (error) {
      setAuthError(error?.message || 'Failed to sign out.');
    }
  };

  const handlePrimaryAction = () => {
    if (user) {
      navigate('/dashboard');
      return;
    }
    handleGoogleAuth();
  };

  const scrollToSection = (sectionId) => {
    const target = document.getElementById(sectionId);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    setMobileMenuOpen(false);
  };

  if (location.pathname === '/profile') {
    if (!isAuthResolved) return null;
    if (!user) return <Navigate to="/" replace />;

    return (
      <ProfileSetup
        user={user}
        onSignOut={handleSignOut}
        isAuthLoading={isLoading}
        onHome={() => navigate('/')}
        onSaved={() => navigate('/dashboard')}
        onOpenPreparation={() => navigate('/preparation')}
      />
    );
  }

  if (location.pathname === '/dashboard') {
    if (!isAuthResolved) return null;
    if (!user) return <Navigate to="/" replace />;

    return (
      <Dashboard
        user={user}
        onSignOut={handleSignOut}
        isAuthLoading={isLoading}
        onHome={() => navigate('/')}
        onEditProfile={() => navigate('/profile')}
        onOpenPreparation={() => navigate('/preparation')}
      />
    );
  }

  if (location.pathname === '/preparation') {
    if (!isAuthResolved) return null;

    return (
      <PreparationPage
        user={user}
        onHome={() => navigate('/')}
        onOpenWorkspace={() => navigate('/dashboard')}
        onEditProfile={() => navigate('/profile')}
        onSignIn={handleGoogleAuth}
        onSignOut={handleSignOut}
        isAuthLoading={isLoading}
      />
    );
  }

  if (location.pathname === '/lpa-prediction') {
    return <LpaPredictionPage onHome={() => navigate('/')} />;
  }

  if (location.pathname !== '/') return <Navigate to="/" replace />;

  return (
    <div className="app-shell">
      <Header
        user={user}
        onSignIn={handleGoogleAuth}
        onSignOut={handleSignOut}
        isAuthLoading={isLoading}
        onEditProfile={() => navigate('/profile')}
        onOpenWorkspace={() => navigate('/dashboard')}
        onOpenPreparation={() => navigate('/preparation')}
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
      />

      {authError && <div className="global-alert error">{authError}</div>}
      {authSuccess && <div className="global-alert success">{authSuccess}</div>}

      <main>
        <Hero
          user={user}
          onPrimaryAction={handlePrimaryAction}
          onSecondaryAction={() => scrollToSection('features')}
          onLpaPrediction={() => navigate('/lpa-prediction')}
        />
        <FeatureSection />
        <DashboardPreview />
        <AnalyticsSection />
        <PlatformSection />
        <CompanySection onOpenPreparation={() => navigate('/preparation')} />
        <WorkspaceSection />
        <FinalCTA user={user} onPrimaryAction={handlePrimaryAction} />
      </main>

      <Footer onOpenPreparation={() => navigate('/preparation')} />
    </div>
  );
};

export default App;