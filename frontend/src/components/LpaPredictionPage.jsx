import { useState } from 'react';
import { API_BASE_URL } from '../api';
import { auth } from '../firebase';
import ThemeToggle from './ThemeToggle';

const requiredFields = [
  { name: 'age', label: 'Age', min: 16, max: 60, step: 1 },
  { name: 'cgpa', label: 'CGPA (out of 10)', min: 0, max: 10, step: 0.01 },
  { name: 'projects', label: 'Projects completed', min: 0, max: 1000, step: 1 },
  { name: 'internships', label: 'Internships completed', min: 0, max: 100, step: 1 },
  { name: 'skills_count', label: 'Technical skills', min: 0, max: 500, step: 1 },
];

const optionalFields = [
  { name: 'leetcode_solved', label: 'LeetCode problems solved', min: 0, max: 200000, step: 1 },
  { name: 'leetcode_rating', label: 'LeetCode rating', min: 0, max: 10000, step: 1 },
  { name: 'leetcode_contest_rating', label: 'LeetCode contest rating', min: 0, max: 10000, step: 1 },
  { name: 'codeforces_rating', label: 'Codeforces rating', min: 0, max: 10000, step: 1 },
  { name: 'codeforces_solved', label: 'Codeforces problems solved', min: 0, max: 200000, step: 1 },
  { name: 'codechef_rating', label: 'CodeChef rating', min: 0, max: 10000, step: 1 },
  { name: 'codechef_solved', label: 'CodeChef problems solved', min: 0, max: 200000, step: 1 },
  { name: 'github_repos', label: 'GitHub repositories', min: 0, max: 100000, step: 1 },
  { name: 'github_contributions', label: 'GitHub contributions (year)', min: 0, max: 1000000, step: 1 },
  { name: 'github_stars', label: 'GitHub stars', min: 0, max: 1000000, step: 1 },
];

const initialForm = {
  age: '',
  gender: '',
  branch: '',
  cgpa: '',
  projects: '',
  internships: '',
  skills_count: '',
  ...Object.fromEntries(optionalFields.map(({ name }) => [name, ''])),
};

const LpaPredictionPage = ({
  user,
  onHome,
  onSignIn,
  isAuthLoading,
  isAuthResolved,
  authError,
  theme,
  onToggleTheme,
}) => {
  const [form, setForm] = useState(initialForm);
  const [prediction, setPrediction] = useState(null);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateField = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setPrediction(null);
    setError('');

    const firebaseUser = auth?.currentUser;
    if (!user || !firebaseUser || firebaseUser.uid !== user.uid) {
      setError('Sign in again to use the LPA estimator.');
      return;
    }

    const profile = Object.fromEntries(
      Object.entries(form).map(([field, value]) => [
        field,
        value === '' ? null : ['gender', 'branch'].includes(field) ? value : Number(value),
      ])
    );

    try {
      setIsSubmitting(true);
      const idToken = await firebaseUser.getIdToken();
      const response = await fetch(`${API_BASE_URL}/predictions/lpa`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profile),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.message || 'Unable to estimate your package right now.');
      }
      setPrediction(payload.data);
    } catch (requestError) {
      setError(requestError instanceof TypeError && requestError.message === 'Failed to fetch'
        ? `Cannot reach the backend at ${API_BASE_URL}. Start the backend and try again.`
        : requestError.message || 'Unable to estimate your package right now.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderNumberField = (field, required = false) => (
    <label className="lpa-field" htmlFor={`lpa-${field.name}`} key={field.name}>
      <span>{field.label}{required && <i aria-hidden="true"> *</i>}</span>
      <input
        id={`lpa-${field.name}`}
        name={field.name}
        type="number"
        min={field.min}
        max={field.max}
        step={field.step}
        value={form[field.name]}
        onChange={updateField}
        required={required}
        placeholder={required ? '' : 'Leave blank if unknown'}
      />
    </label>
  );

  return (
    <div className="lpa-page">
      <header className="profile-topbar">
        <div className="profile-topbar-inner">
          <button type="button" className="profile-brand" onClick={onHome}>SolveSphere</button>
          <div className="preparation-topbar-actions">
            <ThemeToggle theme={theme} onToggle={onToggleTheme} />
            <button type="button" className="preparation-nav-button" onClick={onHome}>Back to home</button>
          </div>
        </div>
      </header>

      <main className="lpa-main">
        <section className="lpa-hero">
          <p className="preparation-kicker">STUDENT PROFILE ESTIMATOR</p>
          <h1>Explore a package estimate.</h1>
          <p>
            Add your current academic and coding profile to get a demo estimate from
            SolveSphere's package-regression model.
          </p>
          <div className="lpa-demo-notice" role="note">
            <strong>Demo only—not a placement or salary promise.</strong>
            <span>
              The current model was trained on synthetic sample data and predicts a package
              only; it does not estimate whether you will be placed. Your profile is used for
              this calculation and is not saved by this page.
            </span>
          </div>
          {!isAuthResolved ? (
            <p className="lpa-auth-notice">Checking your sign-in status...</p>
          ) : !user ? (
            <div className="lpa-auth-notice" role="status">
              <div>
                <span>Sign in with Google to request an authenticated, rate-limited estimate.</span>
                {authError && <p className="lpa-auth-error">{authError}</p>}
              </div>
              <button type="button" onClick={onSignIn} disabled={isAuthLoading}>
                {isAuthLoading ? 'Signing in...' : 'Sign in with Google'}
              </button>
            </div>
          ) : null}
        </section>

        <form className="lpa-form" onSubmit={handleSubmit}>
          <section className="lpa-form-section">
            <div className="lpa-section-heading">
              <span>01</span>
              <div>
                <h2>Academic profile</h2>
                <p>Required fields are marked with an asterisk.</p>
              </div>
            </div>
            <div className="lpa-field-grid">
              {renderNumberField(requiredFields[0], true)}
              <label className="lpa-field" htmlFor="lpa-gender">
                <span>Gender<i aria-hidden="true"> *</i></span>
                <select id="lpa-gender" name="gender" value={form.gender} onChange={updateField} required>
                  <option value="">Select</option>
                  <option value="Female">Female</option>
                  <option value="Male">Male</option>
                </select>
              </label>
              <label className="lpa-field" htmlFor="lpa-branch">
                <span>Branch<i aria-hidden="true"> *</i></span>
                <select id="lpa-branch" name="branch" value={form.branch} onChange={updateField} required>
                  <option value="">Select</option>
                  {['CSE', 'IT', 'ECE', 'EEE', 'MECH', 'CIVIL'].map((branch) => (
                    <option value={branch} key={branch}>{branch}</option>
                  ))}
                </select>
              </label>
              {requiredFields.slice(1).map((field) => renderNumberField(field, true))}
            </div>
          </section>

          <section className="lpa-form-section">
            <div className="lpa-section-heading">
              <span>02</span>
              <div>
                <h2>Coding &amp; platform activity</h2>
                <p>Optional—leave fields blank when you do not have that information.</p>
              </div>
            </div>
            <div className="lpa-field-grid">
              {optionalFields.map((field) => renderNumberField(field))}
            </div>
          </section>

          {error && <p className="lpa-error" role="alert">{error}</p>}

          <button
            className="lpa-submit-button"
            type="submit"
            disabled={isSubmitting || !user || !isAuthResolved || isAuthLoading}
          >
            {isSubmitting ? 'Estimating...' : user ? 'Estimate package' : 'Sign in to estimate'}
            {!isSubmitting && user && <span aria-hidden="true">→</span>}
          </button>

          {prediction && (
            <section className="lpa-result" aria-live="polite">
              <p className="preparation-kicker">DEMO PACKAGE ESTIMATE</p>
              <strong>{prediction.estimatedLpa.toFixed(2)} LPA</strong>
              <span>{prediction.disclaimer}</span>
            </section>
          )}
        </form>
      </main>
    </div>
  );
};

export default LpaPredictionPage;
