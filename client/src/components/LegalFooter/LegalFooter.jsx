import './LegalFooter.css';

const LEGAL_LINKS = [
  {
    id: 'legal-notice',
    label: 'Mentions légales',
  },
  {
    id: 'privacy',
    label: 'Confidentialité',
  },
  {
    id: 'terms',
    label: 'CGU',
  },
];

export default function LegalFooter({ className = '', onLegalLinkClick }) {
  const footerClassName = ['legal-footer', className].filter(Boolean).join(' ');

  return (
    <footer className={footerClassName}>
      <small className="legal-footer__copyright">
        &copy; 2026 UrbanFlow Mobility
      </small>
      <nav className="legal-footer__links" aria-label="Informations légales">
        {LEGAL_LINKS.map((link, index) => (
          <span className="legal-footer__link-item" key={link.id}>
            {index > 0 ? <span aria-hidden="true">|</span> : null}
            <a
              href={`#${link.id}`}
              onClick={(event) => {
                if (!onLegalLinkClick) {
                  return;
                }

                event.preventDefault();
                onLegalLinkClick(link.id);
              }}
            >
              {link.label}
            </a>
          </span>
        ))}
      </nav>
    </footer>
  );
}
