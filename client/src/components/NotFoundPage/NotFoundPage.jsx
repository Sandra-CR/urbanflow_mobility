import DecorativePattern from '../DecorativePattern/DecorativePattern';
import LegalFooter from '../LegalFooter/LegalFooter';
import './NotFoundPage.css';

/**
 * Page affichée lorsqu'une URL ne correspond à aucune vue connue.
 *
 * @param {{onHomeClick: () => void, onLegalLinkClick?: Function}} props
 * @returns {import('react').JSX.Element}
 */
export default function NotFoundPage({ onHomeClick, onLegalLinkClick }) {
  return (
    <section className="not-found-page" aria-labelledby="not-found-title">
      <DecorativePattern />
      <div className="not-found-page__content">
        <div className="not-found-page__panel">
          <p className="not-found-page__code">404</p>
          <h1 id="not-found-title">Page introuvable</h1>
          <p className="not-found-page__message">
            Cette adresse ne correspond à aucune page UrbanFlow Mobility.
          </p>
          <button
            className="btn-primary not-found-page__button"
            type="button"
            onClick={onHomeClick}
          >
            <span>Retour aux itinéraires</span>
          </button>
        </div>
      </div>
      <LegalFooter onLegalLinkClick={onLegalLinkClick} />
    </section>
  );
}
