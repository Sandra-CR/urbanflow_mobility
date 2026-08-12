import { useState } from 'react';
import { CheckCircle, Eye, EyeClosed, X, XCircle } from '@phosphor-icons/react';
import urbanflowSymbol from '../../assets/brand/urbanflow-symbol.svg';
import './AuthPanel.css';

const PASSWORD_RULES = [
  {
    id: 'length',
    label: '12 caractères',
    validate: (value) => value.length >= 12,
  },
  {
    id: 'lowercase',
    label: 'Une minuscule',
    validate: (value) => /[a-z]/.test(value),
  },
  {
    id: 'uppercase',
    label: 'Une majuscule',
    validate: (value) => /[A-Z]/.test(value),
  },
  {
    id: 'digit',
    label: 'Un chiffre',
    validate: (value) => /\d/.test(value),
  },
  {
    id: 'special',
    label: 'Un caractère spécial',
    validate: (value) => /[^A-Za-z0-9\s]/.test(value),
  },
  {
    id: 'space',
    label: 'Aucun espace',
    validate: (value) => !/\s/.test(value),
  },
];

export default function AuthPanel({
  isOverlay = false,
  onClose,
  onLogin,
  onRegister,
}) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [details, setDetails] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const isRegisterMode = mode === 'register';

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setDetails([]);
    setIsSubmitting(true);

    try {
      if (isRegisterMode) {
        if (password !== confirmPassword) {
          setError('Les mots de passe ne correspondent pas.');
          return;
        }

        await onRegister({ email, password });
      } else {
        await onLogin({ email, password });
      }
    } catch (submitError) {
      setError(submitError.message);
      setDetails(submitError.details || []);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className={
        isOverlay ? 'auth-page auth-page--overlay' : 'auth-page app-surface'
      }
    >
      <section className="auth-panel app-card" aria-labelledby="auth-title">
        {isOverlay ? (
          <button
            className="auth-close"
            type="button"
            aria-label="Fermer"
            title="Fermer"
            onClick={onClose}
          >
            <X size={20} weight="bold" aria-hidden="true" />
          </button>
        ) : null}
        <div className="auth-brand">
          <img src={urbanflowSymbol} alt="UrbanFlow Mobility" />
          <h1 id="auth-title">
            {isRegisterMode ? 'Inscription' : 'Connexion'}
          </h1>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="auth-field">
            <span>Email</span>
            <div className="auth-input">
              <input
                type="email"
                name="email"
                autoComplete="email"
                value={email}
                required
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
          </label>

          <label className="auth-field auth-field--password">
            <span>Mot de passe</span>
            <div className="auth-input auth-password-input">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                autoComplete={
                  isRegisterMode ? 'new-password' : 'current-password'
                }
                value={password}
                required
                minLength={isRegisterMode ? 12 : undefined}
                onBlur={() => setIsPasswordFocused(false)}
                onFocus={() => setIsPasswordFocused(true)}
                onChange={(event) => setPassword(event.target.value)}
              />
              <button
                className="auth-password-toggle"
                type="button"
                aria-label={
                  showPassword
                    ? 'Masquer le mot de passe'
                    : 'Afficher le mot de passe'
                }
                aria-pressed={showPassword}
                onClick={() => setShowPassword((currentValue) => !currentValue)}
              >
                {showPassword ? (
                  <EyeClosed size={20} aria-hidden="true" />
                ) : (
                  <Eye size={20} aria-hidden="true" />
                )}
              </button>
            </div>
            {isRegisterMode && isPasswordFocused && (
              <div className="auth-password-rules">
                {PASSWORD_RULES.map((rule) => {
                  const isValid = rule.validate(password);

                  return (
                    <div
                      className="auth-password-rule"
                      data-valid={isValid}
                      key={rule.id}
                    >
                      {isValid ? (
                        <CheckCircle
                          size={18}
                          weight="fill"
                          aria-hidden="true"
                        />
                      ) : (
                        <XCircle size={18} weight="fill" aria-hidden="true" />
                      )}
                      <span>{rule.label}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </label>

          {isRegisterMode ? (
            <label className="auth-field">
              <span>Confirmer le mot de passe</span>
              <div className="auth-input auth-password-input">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  autoComplete="new-password"
                  value={confirmPassword}
                  required
                  onChange={(event) => setConfirmPassword(event.target.value)}
                />
                <button
                  className="auth-password-toggle"
                  type="button"
                  aria-label={
                    showConfirmPassword
                      ? 'Masquer la confirmation du mot de passe'
                      : 'Afficher la confirmation du mot de passe'
                  }
                  aria-pressed={showConfirmPassword}
                  onClick={() =>
                    setShowConfirmPassword((currentValue) => !currentValue)
                  }
                >
                  {showConfirmPassword ? (
                    <EyeClosed size={20} aria-hidden="true" />
                  ) : (
                    <Eye size={20} aria-hidden="true" />
                  )}
                </button>
              </div>
            </label>
          ) : (
            <div className="auth-password-row">
              <button className="auth-link" type="button">
                Mot de passe oublié ?
              </button>
            </div>
          )}

          {error && (
            <div className="auth-error" role="alert">
              <p>{error}</p>
              {details.length > 0 && (
                <ul>
                  {details.map((detail) => (
                    <li key={detail}>{detail}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <button className="auth-submit" type="submit" disabled={isSubmitting}>
            <span>
              {isSubmitting
                ? 'Traitement...'
                : isRegisterMode
                  ? "S'inscrire"
                  : 'Se connecter'}
            </span>
          </button>

          <p className="auth-switch text-small">
            {isRegisterMode
              ? 'Vous avez déjà un compte ?'
              : "Vous n'avez pas de compte ?"}{' '}
            <button
              className="auth-link"
              type="button"
              onClick={() => {
                setMode(isRegisterMode ? 'login' : 'register');
                setError('');
                setDetails([]);
                setPassword('');
                setConfirmPassword('');
                setIsPasswordFocused(false);
                setShowPassword(false);
                setShowConfirmPassword(false);
              }}
            >
              {isRegisterMode ? 'Se connecter' : "S'inscrire"}
            </button>
          </p>
        </form>
      </section>
    </div>
  );
}
