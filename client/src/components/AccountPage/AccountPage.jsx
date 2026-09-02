import { useEffect, useRef, useState } from 'react';
import {
  BagSimple,
  Check,
  House,
  Moon,
  PencilSimple,
  SignOut,
  Sun,
  Trash,
  UserCircle,
} from '@phosphor-icons/react';
import { getFavoritePlaces, saveFavoritePlace } from '../../utils/favoritesApi';
import DecorativePattern from '../DecorativePattern/DecorativePattern';
import LegalFooter from '../LegalFooter/LegalFooter';
import '../MapActions/MapActions.css';
import './AccountPage.css';

const ADDRESS_CONFIGS = [
  {
    category: 'home',
    title: 'Domicile',
    placeholder: 'Rechercher votre domicile',
    Icon: House,
  },
  {
    category: 'work',
    title: 'Travail',
    placeholder: 'Rechercher votre lieu de travail',
    Icon: BagSimple,
  },
];

const ROUTE_SORT_STORAGE_KEY = 'urbanflow-route-sort';
const ROUTE_SORT_MODES = {
  co2: 'co2',
  time: 'time',
};
const ROUTE_ACCESSIBILITY_STORAGE_KEY = 'urbanflow-route-accessibility';
const ROUTE_ACCESSIBILITY_MODES = {
  standard: 'standard',
  wheelchair: 'wheelchair',
};

function getInitialRouteSortMode() {
  if (typeof window === 'undefined') {
    return ROUTE_SORT_MODES.co2;
  }

  const cachedSortMode = window.localStorage.getItem(ROUTE_SORT_STORAGE_KEY);

  return Object.values(ROUTE_SORT_MODES).includes(cachedSortMode)
    ? cachedSortMode
    : ROUTE_SORT_MODES.co2;
}

function getInitialRouteAccessibilityMode() {
  if (typeof window === 'undefined') {
    return ROUTE_ACCESSIBILITY_MODES.standard;
  }

  const cachedMode = window.localStorage.getItem(
    ROUTE_ACCESSIBILITY_STORAGE_KEY
  );

  return Object.values(ROUTE_ACCESSIBILITY_MODES).includes(cachedMode)
    ? cachedMode
    : ROUTE_ACCESSIBILITY_MODES.standard;
}

/**
 * Page de gestion du compte utilisateur.
 *
 * @param {object} props Proprietes de page.
 * @param {object} props.currentUser Utilisateur connecte.
 * @param {boolean} props.isDarkMode Theme courant.
 * @param {Function} props.onDeleteAccount Suppression du compte.
 * @param {Function} props.onLogout Deconnexion.
 * @param {Function} props.onLegalLinkClick Ouverture d'une page legale.
 * @param {Function} props.onSearchPlaces Recherche de lieux.
 * @param {Function} props.onToggleDarkMode Changement de theme.
 * @returns {import('react').JSX.Element} Page compte.
 */
export default function AccountPage({
  currentUser,
  isDarkMode,
  onDeleteAccount,
  onLogout,
  onLegalLinkClick,
  onSearchPlaces,
  onToggleDarkMode,
}) {
  const [personalDraft, setPersonalDraft] = useState({
    email: currentUser?.email || '',
  });
  const [placesByCategory, setPlacesByCategory] = useState({
    home: null,
    work: null,
  });
  const [addressDrafts, setAddressDrafts] = useState({
    home: '',
    work: '',
  });
  const [addressResults, setAddressResults] = useState({
    home: [],
    work: [],
  });
  const [editingAddress, setEditingAddress] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isLoadingPlaces, setIsLoadingPlaces] = useState(false);
  const [savingCategory, setSavingCategory] = useState(null);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [routeSortMode, setRouteSortMode] = useState(getInitialRouteSortMode);
  const [routeAccessibilityMode, setRouteAccessibilityMode] = useState(
    getInitialRouteAccessibilityMode
  );
  const addressSearchTimeoutRef = useRef(null);

  function clearAddressSearchTimeout() {
    if (addressSearchTimeoutRef.current) {
      window.clearTimeout(addressSearchTimeoutRef.current);
      addressSearchTimeoutRef.current = null;
    }
  }

  useEffect(() => {
    let isMounted = true;

    async function loadSavedAddresses() {
      setIsLoadingPlaces(true);
      setError('');

      try {
        const [homeData, workData] = await Promise.all([
          getFavoritePlaces('home'),
          getFavoritePlaces('work'),
        ]);

        if (!isMounted) {
          return;
        }

        setPlacesByCategory({
          home: homeData.places?.[0] || null,
          work: workData.places?.[0] || null,
        });
      } catch (loadError) {
        if (isMounted) {
          setError(loadError.message);
        }
      } finally {
        if (isMounted) {
          setIsLoadingPlaces(false);
        }
      }
    }

    loadSavedAddresses();

    return () => {
      isMounted = false;
      clearAddressSearchTimeout();
    };
  }, []);

  const createdAtLabel = currentUser?.createdAt
    ? new Intl.DateTimeFormat('fr-FR', {
        dateStyle: 'long',
      }).format(new Date(currentUser.createdAt))
    : 'Non disponible';

  async function searchAddressPlaces(category, query) {
    if (query.length < 2) {
      setAddressResults((currentResults) => ({
        ...currentResults,
        [category]: [],
      }));
      return;
    }

    setSavingCategory(category);
    setError('');
    setMessage('');

    try {
      const places = await onSearchPlaces(query);

      setAddressResults((currentResults) => ({
        ...currentResults,
        [category]: places,
      }));
    } catch (searchError) {
      setError(searchError.message);
    } finally {
      setSavingCategory(null);
    }
  }

  function scheduleAddressSearch(category, query) {
    clearAddressSearchTimeout();

    addressSearchTimeoutRef.current = window.setTimeout(() => {
      searchAddressPlaces(category, query.trim());
    }, 220);
  }

  function handleAddressInputChange(category, value) {
    setAddressDrafts((currentDrafts) => ({
      ...currentDrafts,
      [category]: value,
    }));
    scheduleAddressSearch(category, value);
  }

  async function handleAddressSelect(category, place) {
    setSavingCategory(category);
    setError('');
    setMessage('');

    try {
      const data = await saveFavoritePlace({
        category,
        place: {
          ...place,
          label: category === 'home' ? 'Domicile' : 'Travail',
          placeLabel: place.label || place.name,
        },
      });

      setPlacesByCategory((currentPlaces) => ({
        ...currentPlaces,
        [category]: data.place,
      }));
      setAddressDrafts((currentDrafts) => ({
        ...currentDrafts,
        [category]: '',
      }));
      setAddressResults((currentResults) => ({
        ...currentResults,
        [category]: [],
      }));
      setEditingAddress(null);
      setMessage('Adresse enregistrée.');
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSavingCategory(null);
    }
  }

  async function handleLogout() {
    setIsSigningOut(true);
    setError('');

    try {
      await onLogout();
    } catch (logoutError) {
      setError(logoutError.message);
      setIsSigningOut(false);
    }
  }

  async function handleDeleteAccount() {
    const shouldDelete = window.confirm(
      'Supprimer définitivement votre compte UrbanFlow ?'
    );

    if (!shouldDelete) {
      return;
    }

    setIsDeletingAccount(true);
    setError('');

    try {
      await onDeleteAccount();
    } catch (deleteError) {
      setError(deleteError.message);
      setIsDeletingAccount(false);
    }
  }

  function handleRouteSortChange(nextSortMode) {
    setRouteSortMode(nextSortMode);

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(ROUTE_SORT_STORAGE_KEY, nextSortMode);
    }
  }

  function handleRouteAccessibilityChange(nextMode) {
    setRouteAccessibilityMode(nextMode);

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(ROUTE_ACCESSIBILITY_STORAGE_KEY, nextMode);
    }
  }

  return (
    <section className="account-page" aria-labelledby="account-page-title">
      <DecorativePattern />
      <div className="account-page__panel">
        <header className="account-page__header">
          <div className="account-page__header-main">
            <div className="account-page__avatar" aria-hidden="true">
              <UserCircle size={34} weight="regular" />
            </div>
            <div>
              <h1 id="account-page-title">Mon compte</h1>
              <p>Créé le {createdAtLabel}</p>
            </div>
          </div>
          <button
            className="map-icon-button account-theme-toggle"
            type="button"
            aria-label={
              isDarkMode ? 'Activer le mode clair' : 'Activer le mode sombre'
            }
            title={isDarkMode ? 'Mode clair' : 'Mode sombre'}
            aria-pressed={isDarkMode}
            onClick={onToggleDarkMode}
          >
            {isDarkMode ? (
              <Sun size={20} weight="bold" aria-hidden="true" />
            ) : (
              <Moon size={20} weight="bold" aria-hidden="true" />
            )}
          </button>
        </header>

        {message ? (
          <div className="account-page__success" role="status">
            {message}
          </div>
        ) : null}

        {error ? (
          <div className="account-page__error" role="alert">
            {error}
          </div>
        ) : null}

        <section className="account-section" aria-labelledby="personal-title">
          <div className="account-section__header">
            <h2 id="personal-title">Informations personnelles</h2>
          </div>

          <div className="account-form-grid">
            <label className="account-route-field">
              <span className="account-route-field__tag">Email</span>
              <input
                type="email"
                value={personalDraft.email}
                onChange={(event) =>
                  setPersonalDraft((currentDraft) => ({
                    ...currentDraft,
                    email: event.target.value,
                  }))
                }
              />
            </label>
            <label className="account-route-field">
              <span className="account-route-field__tag">Mot de passe</span>
              <input type="password" value="****************" readOnly />
            </label>
          </div>

          <button className="account-button" type="button" disabled>
            <Check size={18} weight="regular" aria-hidden="true" />
            <span>Enregistrer</span>
          </button>
        </section>

        <section className="account-section" aria-labelledby="addresses-title">
          <div className="account-section__header">
            <h2 id="addresses-title">Adresses enregistrées</h2>
            {isLoadingPlaces ? <span>Chargement...</span> : null}
          </div>

          <div className="account-addresses">
            {ADDRESS_CONFIGS.map((config) => {
              const savedPlace = placesByCategory[config.category];
              const isEditing =
                editingAddress === config.category || !savedPlace;
              const isBusy = savingCategory === config.category;
              const Icon = config.Icon;
              const savedAddressLabel =
                savedPlace?.placeLabel ||
                savedPlace?.label ||
                'Aucune adresse enregistrée';

              return (
                <article className="account-address" key={config.category}>
                  <div className="account-address__field-row">
                    <label
                      className="account-route-field"
                      htmlFor={`account-address-${config.category}`}
                    >
                      <Icon
                        className="account-route-field__icon"
                        size={22}
                        weight="regular"
                        aria-hidden="true"
                      />
                      <input
                        id={`account-address-${config.category}`}
                        type={isEditing ? 'search' : 'text'}
                        value={
                          isEditing
                            ? addressDrafts[config.category]
                            : savedAddressLabel
                        }
                        aria-label={config.title}
                        placeholder={config.placeholder}
                        readOnly={!isEditing}
                        onChange={(event) =>
                          handleAddressInputChange(
                            config.category,
                            event.target.value
                          )
                        }
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault();
                            clearAddressSearchTimeout();
                            searchAddressPlaces(
                              config.category,
                              addressDrafts[config.category].trim()
                            );
                          }
                        }}
                      />
                    </label>
                    <button
                      className="account-field-action"
                      type="button"
                      aria-label={`Modifier ${config.title.toLowerCase()}`}
                      title={`Modifier ${config.title.toLowerCase()}`}
                      onClick={() => {
                        setAddressDrafts((currentDrafts) => ({
                          ...currentDrafts,
                          [config.category]:
                            savedPlace?.placeLabel || savedPlace?.label || '',
                        }));
                        setAddressResults((currentResults) => ({
                          ...currentResults,
                          [config.category]: [],
                        }));
                        setEditingAddress(config.category);
                      }}
                    >
                      <PencilSimple
                        size={18}
                        weight="regular"
                        aria-hidden="true"
                      />
                    </button>
                  </div>

                  {isEditing && addressResults[config.category].length > 0 ? (
                    <div className="account-address__editor">
                      <div className="account-address__results">
                        {addressResults[config.category].map((place) => (
                          <button
                            type="button"
                            key={place.id}
                            disabled={isBusy}
                            onClick={() =>
                              handleAddressSelect(config.category, place)
                            }
                          >
                            <span>{place.label || place.name}</span>
                            <small>{place.city || place.type}</small>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        </section>

        <section
          className="account-section"
          aria-labelledby="mobility-preferences-title"
        >
          <div className="account-section__header">
            <h2 id="mobility-preferences-title">Préférences de mobilité</h2>
          </div>

          <div className="account-mobility-preferences">
            <div className="account-mobility-field">
              <label
                className="account-mobility-field__label"
                htmlFor="account-route-sort"
              >
                Tri
              </label>
              <select
                id="account-route-sort"
                className="account-mobility-field__select"
                value={routeSortMode}
                onChange={(event) => handleRouteSortChange(event.target.value)}
              >
                <option value={ROUTE_SORT_MODES.co2}>CO2</option>
                <option value={ROUTE_SORT_MODES.time}>Temps</option>
              </select>
            </div>

            <div className="account-mobility-field">
              <label
                className="account-mobility-field__label"
                htmlFor="account-route-accessibility"
              >
                Accès
              </label>
              <select
                id="account-route-accessibility"
                className="account-mobility-field__select"
                value={routeAccessibilityMode}
                onChange={(event) =>
                  handleRouteAccessibilityChange(event.target.value)
                }
              >
                <option value={ROUTE_ACCESSIBILITY_MODES.standard}>Tous</option>
                <option value={ROUTE_ACCESSIBILITY_MODES.wheelchair}>
                  Fauteuil
                </option>
              </select>
            </div>
          </div>
        </section>

        <section className="account-section account-section--danger">
          <div className="account-section__header">
            <h2>Session et compte</h2>
          </div>

          <div className="account-actions">
            <button
              className="account-button btn-outline-primary"
              type="button"
              disabled={isSigningOut}
              onClick={handleLogout}
            >
              <SignOut size={18} weight="regular" aria-hidden="true" />
              <span>{isSigningOut ? 'Déconnexion...' : 'Se déconnecter'}</span>
            </button>
            <button
              className="account-button btn-outline-danger"
              type="button"
              disabled={isDeletingAccount}
              onClick={handleDeleteAccount}
            >
              <Trash size={18} weight="regular" aria-hidden="true" />
              <span>
                {isDeletingAccount ? 'Suppression...' : 'Supprimer le compte'}
              </span>
            </button>
          </div>
        </section>

      </div>
      <LegalFooter onLegalLinkClick={onLegalLinkClick} />
    </section>
  );
}
