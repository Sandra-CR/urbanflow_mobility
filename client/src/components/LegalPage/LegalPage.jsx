import { FileText, Moon, Sun } from '@phosphor-icons/react';
import DecorativePattern from '../DecorativePattern/DecorativePattern';
import LegalFooter from '../LegalFooter/LegalFooter';
import './LegalPage.css';

const LEGAL_CONTENT = {
  'legal-notice': {
    title: 'Mentions légales',
    lastUpdated: '28 août 2026',
    sections: [
      {
        title: 'Éditeur du site',
        fields: [
          {
            label: 'Nom du site',
            value: 'UrbanFlow Mobility',
          },
          {
            label: 'Éditeur',
            value: 'Sandra CHAMP-RIGOT',
            startsGroup: true,
          },
          {
            label: "Adresse de l'éditeur",
            value: '37 avenue de la poste, TREMBLAY-EN-FRANCE 93290',
          },
          {
            label: 'Statut juridique',
            value: 'Personne physique',
          },
          {
            label: 'Adresse e-mail de contact',
            value: 'sandra.champrigot@gmail.com',
          },
          {
            label: 'Téléphone',
            value: '+33 6 43 37 08 33',
          },
          {
            label: 'Directeur de la publication',
            value: 'Sandra CHAMP-RIGOT',
            startsGroup: true,
          },
        ],
      },
      {
        title: 'Hébergement',
        fields: [
          {
            label: 'Hébergement du frontend',
            value: 'Vercel Inc.',
          },
          {
            label: 'Site web',
            value: 'https://vercel.com',
          },
          {
            label: 'Adresse',
            value: '440 N Barranca Avenue #4133, Covina, CA 91723, États-Unis.',
          },
          {
            label: 'Téléphone',
            value: 'Non communiqué publiquement.',
          },
          {
            label: 'Hébergement du backend',
            value: 'Render Services, Inc.',
            startsGroup: true,
          },
          {
            label: 'Site web',
            value: 'https://render.com',
          },
          {
            label: 'Adresse',
            value: '525 Brannan Street, San Francisco, CA 94107, États-Unis.',
          },
          {
            label: 'Téléphone',
            value: '+1 415 319 8186',
          },
          {
            label: 'Hébergement de la base de données',
            value: 'Supabase Pte. Ltd.',
            startsGroup: true,
          },
          {
            label: 'Site web',
            value: 'https://supabase.com',
          },
          {
            label: 'Adresse',
            value: '65 Chulia Street #38-02/03, OCBC Centre, Singapore 049513.',
          },
          {
            label: 'Téléphone',
            value: 'Non communiqué publiquement.',
          },
        ],
      },
      {
        title: 'Services tiers et sources de données',
        fields: [
          {
            label: 'API de mobilité',
            value:
              'UrbanFlow Mobility utilise des API de mobilité pour la recherche d’itinéraires, les perturbations, les lieux et les disponibilités de services de transport.',
          },
          {
            label: 'Île-de-France Mobilités',
            value:
              'Données de mobilité utilisées lorsque disponibles via les services Île-de-France Mobilités.',
          },
          {
            label: 'Vélib / GBFS',
            value:
              'Données de stations et disponibilités vélos utilisées lorsque la fonctionnalité est disponible.',
          },
          {
            label: 'Cartographie',
            value:
              'Carte interactive rendue avec MapLibre GL JS. Fonds de carte CARTO basés sur les données OpenStreetMap.',
          },
        ],
      },
      {
        title: 'Propriété intellectuelle',
        fields: [
          {
            label: 'Marque et interface',
            value:
              'UrbanFlow Mobility, ses textes, interfaces, éléments graphiques et composants sont protégés par le droit de la propriété intellectuelle, sauf mention contraire.',
          },
          {
            label: 'Crédits',
            value:
              'Icônes : Phosphor Icons. Police : Inter. Carte : MapLibre GL JS, fonds de carte CARTO, données OpenStreetMap contributors. Graphiques : Chart.js.',
          },
          {
            label: 'Licences open source',
            value:
              'Phosphor Icons : MIT. Inter : SIL Open Font License 1.1. MapLibre GL JS : BSD-3-Clause. Chart.js : MIT.',
          },
        ],
      },
      {
        title: 'Données personnelles',
        fields: [
          {
            label: 'Page dédiée',
            value:
              'Le traitement des données personnelles est détaillé dans la page Confidentialité.',
          },
          {
            label: 'Contact RGPD',
            value: 'sandra.champrigot@gmail.com',
          },
        ],
      },
      {
        title: 'Responsabilité',
        fields: [
          {
            label: 'Informations de mobilité',
            value:
              'Les horaires, itinéraires, perturbations, disponibilités et estimations carbone sont fournis à titre indicatif et peuvent dépendre de services tiers.',
          },
          {
            label: 'Disponibilité du service',
            value:
              'UrbanFlow Mobility est accessible 24 h/24 et 7 j/7 dans la limite des opérations de maintenance, incidents techniques, interruptions des hébergeurs, indisponibilités des services tiers ou cas de force majeure.',
          },
        ],
      },
    ],
  },
  privacy: {
    title: 'Confidentialité',
    lastUpdated: '28 août 2026',
    sections: [
      {
        title: 'Responsable du traitement',
        fields: [
          {
            label: 'Responsable',
            value: 'Sandra CHAMP-RIGOT',
          },
          {
            label: 'Contact',
            value: 'sandra.champrigot@gmail.com',
          },
        ],
      },
      {
        title: 'Données collectées',
        fields: [
          {
            label: 'Compte utilisateur',
            value:
              'Adresse e-mail, identifiant utilisateur, date de création du compte et mot de passe stocké sous forme hachée.',
          },
          {
            label: 'Favoris et adresses',
            value:
              'Lieux favoris, adresses enregistrées, libellés et coordonnées associés aux lieux sélectionnés.',
          },
          {
            label: 'Géolocalisation',
            value:
              'Position fournie par le navigateur lorsque l’utilisateur accepte l’accès à sa localisation.',
          },
          {
            label: 'Trajets et carbone',
            value:
              'Itinéraires consultés ou terminés, type de trajet, distance, date de fin, estimation CO2 du trajet et estimation CO2 équivalente en voiture solo.',
          },
          {
            label: 'Données techniques',
            value:
              'Adresse IP, informations de navigateur, journaux serveur, événements techniques nécessaires à la sécurité, au diagnostic et au bon fonctionnement du service.',
          },
        ],
      },
      {
        title: 'Stockage local et cookie nécessaire',
        fields: [
          {
            label: 'IndexedDB',
            value:
              'Le navigateur peut stocker localement les recherches récentes, les lieux récents, les trajets terminés et certaines données utiles au mode hors ligne.',
          },
          {
            label: 'localStorage',
            value:
              'Le choix du thème clair ou sombre peut être conservé localement dans le navigateur.',
          },
          {
            label: 'Cookie d’authentification',
            value:
              'Un cookie httpOnly strictement nécessaire, nommé urbanflow_auth, est utilisé pour maintenir la session de l’utilisateur connecté. Il n’est pas utilisé à des fins publicitaires ou de mesure d’audience.',
          },
        ],
      },
      {
        title: 'Finalités et bases légales',
        fields: [
          {
            label: 'Création et gestion du compte',
            value:
              'Base légale : exécution du service demandé par l’utilisateur.',
          },
          {
            label: 'Recherche d’itinéraires et favoris',
            value:
              'Base légale : exécution du service demandé par l’utilisateur.',
          },
          {
            label: 'Géolocalisation',
            value:
              'Base légale : consentement de l’utilisateur via l’autorisation du navigateur. Cette autorisation peut être retirée dans les paramètres du navigateur.',
          },
          {
            label: 'Calcul et suivi carbone',
            value:
              'Base légale : exécution du service demandé et intérêt légitime à fournir des indicateurs de mobilité durable.',
          },
          {
            label: 'Sécurité et diagnostic technique',
            value:
              'Base légale : intérêt légitime à sécuriser, maintenir et améliorer le service.',
          },
        ],
      },
      {
        title: 'Durées de conservation',
        fields: [
          {
            label: 'Compte utilisateur',
            value:
              'Les données de compte sont conservées tant que le compte existe, puis supprimées lors de la suppression du compte, sauf obligation légale contraire.',
          },
          {
            label: 'Favoris',
            value:
              'Les favoris sont conservés tant que le compte existe ou jusqu’à suppression par l’utilisateur.',
          },
          {
            label: 'Données locales du navigateur',
            value:
              'Les données stockées localement restent sur l’appareil jusqu’à suppression par l’utilisateur, nettoyage du navigateur ou suppression depuis les fonctionnalités prévues.',
          },
          {
            label: 'Journaux techniques',
            value:
              'Les journaux techniques sont conservés pour une durée limitée nécessaire à la sécurité, au diagnostic et à l’exploitation du service.',
          },
        ],
      },
      {
        title: 'Destinataires et sous-traitants',
        fields: [
          {
            label: 'Hébergement frontend',
            value: 'Vercel Inc.',
          },
          {
            label: 'Hébergement backend',
            value: 'Render Services, Inc.',
          },
          {
            label: 'Base de données',
            value: 'Supabase Pte. Ltd.',
          },
          {
            label: 'Cartographie',
            value:
              'CARTO et OpenStreetMap contributors pour l’affichage du fond de carte.',
          },
          {
            label: 'Données de mobilité',
            value:
              'Services de mobilité tels qu’Île-de-France Mobilités et Vélib / GBFS, utilisés pour les itinéraires, perturbations, lieux et disponibilités.',
          },
        ],
      },
      {
        title: 'Transferts hors Union européenne',
        fields: [
          {
            label: 'Hébergeurs et services tiers',
            value:
              'Certaines données peuvent être traitées par des prestataires situés hors de l’Union européenne, notamment aux États-Unis ou à Singapour, selon les services utilisés.',
          },
          {
            label: 'Garanties',
            value:
              'Lorsque cela est nécessaire, ces transferts doivent reposer sur les garanties prévues par le RGPD, notamment des clauses contractuelles types ou mécanismes équivalents proposés par les prestataires.',
          },
        ],
      },
      {
        title: 'Droits des utilisateurs',
        fields: [
          {
            label: 'Droits RGPD',
            value:
              'Chaque utilisateur dispose d’un droit d’accès, de rectification, d’effacement, d’opposition, de limitation du traitement et de portabilité lorsque ces droits sont applicables.',
          },
          {
            label: 'Exercer ses droits',
            value:
              'Les demandes peuvent être envoyées à sandra.champrigot@gmail.com. Une vérification d’identité peut être demandée si nécessaire.',
          },
          {
            label: 'Suppression du compte',
            value:
              'L’utilisateur peut demander ou déclencher la suppression de son compte depuis l’espace compte lorsque la fonctionnalité est disponible.',
          },
          {
            label: 'Réclamation',
            value:
              'L’utilisateur peut introduire une réclamation auprès de la CNIL sur www.cnil.fr s’il estime que ses droits ne sont pas respectés.',
          },
        ],
      },
      {
        title: 'Sécurité',
        fields: [
          {
            label: 'Mesures appliquées',
            value:
              'UrbanFlow Mobility utilise notamment le hachage des mots de passe, un cookie httpOnly pour la session, des échanges HTTPS en production et des contrôles d’accès côté serveur.',
          },
          {
            label: 'Limite',
            value:
              'Aucune mesure de sécurité ne permet de garantir une protection absolue, mais les mesures raisonnables sont mises en œuvre pour limiter les risques.',
          },
        ],
      },
    ],
  },
  terms: {
    title: "Conditions générales d'utilisation",
    lastUpdated: '28 août 2026',
    sections: [
      {
        title: 'Présentation',
        fields: [
          {
            label: 'Service',
            value:
              'UrbanFlow Mobility est une application web de mobilité urbaine permettant notamment de rechercher des itinéraires, consulter des informations de mobilité, enregistrer des favoris et suivre des indicateurs carbone.',
          },
          {
            label: 'Acceptation',
            value:
              'L’accès et l’utilisation du service impliquent l’acceptation des présentes conditions générales d’utilisation.',
          },
        ],
      },
      {
        title: 'Accès au service',
        fields: [
          {
            label: 'Accès libre',
            value:
              'Certaines fonctionnalités peuvent être consultées sans compte utilisateur.',
          },
          {
            label: 'Compte utilisateur',
            value:
              'Certaines fonctionnalités, notamment l’enregistrement de favoris ou la gestion du compte, nécessitent la création d’un compte.',
          },
          {
            label: 'Identifiants',
            value:
              'L’utilisateur est responsable de la confidentialité de ses identifiants et de toute utilisation de son compte.',
          },
        ],
      },
      {
        title: 'Utilisation autorisée',
        fields: [
          {
            label: 'Usage personnel',
            value:
              'Le service est fourni pour un usage personnel, informatif et non exclusif.',
          },
          {
            label: 'Exactitude des informations',
            value:
              'L’utilisateur s’engage à fournir des informations exactes lors de la création ou de l’utilisation de son compte.',
          },
          {
            label: 'Comportement interdit',
            value:
              'Il est interdit d’utiliser le service de manière frauduleuse, abusive, automatisée de façon excessive, contraire à la loi, portant atteinte à la sécurité du service ou aux droits de tiers.',
          },
        ],
      },
      {
        title: 'Informations de mobilité',
        fields: [
          {
            label: 'Caractère indicatif',
            value:
              'Les horaires, itinéraires, perturbations, disponibilités de vélos, distances, temps de trajet et estimations carbone sont fournis à titre indicatif.',
          },
          {
            label: 'Services tiers',
            value:
              'Ces informations peuvent dépendre de services tiers tels qu’Île-de-France Mobilités, Vélib / GBFS, CARTO, OpenStreetMap ou d’autres fournisseurs techniques.',
          },
          {
            label: 'Vérification terrain',
            value:
              'L’utilisateur doit vérifier les conditions réelles de déplacement, la signalisation, les consignes de sécurité et les informations officielles des opérateurs de transport.',
          },
        ],
      },
      {
        title: 'Géolocalisation et suivi de trajet',
        fields: [
          {
            label: 'Autorisation',
            value:
              'La géolocalisation n’est utilisée que si l’utilisateur l’autorise via son navigateur.',
          },
          {
            label: 'Retrait',
            value:
              'L’utilisateur peut retirer cette autorisation à tout moment dans les paramètres de son navigateur ou de son appareil.',
          },
          {
            label: 'Limite',
            value:
              'Le suivi de trajet est une aide fonctionnelle et ne remplace pas l’attention de l’utilisateur ni les règles applicables aux déplacements.',
          },
        ],
      },
      {
        title: 'Compte et suppression',
        fields: [
          {
            label: 'Déconnexion',
            value:
              'L’utilisateur peut se déconnecter depuis son espace compte lorsque la fonctionnalité est disponible.',
          },
          {
            label: 'Suppression',
            value:
              'L’utilisateur peut demander ou déclencher la suppression de son compte depuis l’espace compte lorsque la fonctionnalité est disponible.',
          },
          {
            label: 'Suspension',
            value:
              'L’accès au service ou à un compte peut être suspendu en cas d’usage abusif, frauduleux, illicite ou portant atteinte à la sécurité du service.',
          },
        ],
      },
      {
        title: 'Disponibilité et maintenance',
        fields: [
          {
            label: 'Disponibilité',
            value:
              'UrbanFlow Mobility est accessible 24 h/24 et 7 j/7 dans la limite des opérations de maintenance, incidents techniques, interruptions des hébergeurs, indisponibilités des services tiers ou cas de force majeure.',
          },
          {
            label: 'Évolutions',
            value:
              'Le service peut être modifié, suspendu, corrigé ou interrompu temporairement pour maintenance, amélioration ou contrainte technique.',
          },
        ],
      },
      {
        title: 'Responsabilité',
        fields: [
          {
            label: 'Limitation',
            value:
              'UrbanFlow Mobility ne garantit pas l’exactitude, l’exhaustivité ou l’actualité permanente des informations provenant de services tiers.',
          },
          {
            label: 'Décisions de déplacement',
            value:
              'L’utilisateur reste seul responsable de ses décisions de déplacement, de sa sécurité et du respect des règles applicables.',
          },
          {
            label: 'Dommages indirects',
            value:
              'UrbanFlow Mobility ne peut être tenue responsable des dommages indirects liés à l’utilisation ou à l’impossibilité d’utiliser le service, dans les limites autorisées par la loi.',
          },
        ],
      },
      {
        title: 'Propriété intellectuelle',
        fields: [
          {
            label: 'Contenus UrbanFlow Mobility',
            value:
              'Les textes, interfaces, graphismes, composants, logos et éléments propres au service sont protégés par le droit de la propriété intellectuelle, sauf mention contraire.',
          },
          {
            label: 'Éléments tiers',
            value:
              'Les bibliothèques, icônes, polices, fonds de carte et données de mobilité utilisés restent soumis à leurs licences et conditions respectives.',
          },
        ],
      },
      {
        title: 'Données personnelles',
        fields: [
          {
            label: 'Politique dédiée',
            value:
              'Le traitement des données personnelles est décrit dans la page Confidentialité.',
          },
          {
            label: 'Contact',
            value: 'sandra.champrigot@gmail.com',
          },
        ],
      },
      {
        title: 'Modification des CGU',
        fields: [
          {
            label: 'Mise à jour',
            value:
              'Les présentes conditions peuvent être modifiées pour tenir compte des évolutions du service, de la réglementation ou des contraintes techniques.',
          },
          {
            label: 'Version applicable',
            value:
              'La version applicable est celle publiée sur le site au moment de l’utilisation du service.',
          },
        ],
      },
      {
        title: 'Droit applicable et contact',
        fields: [
          {
            label: 'Droit applicable',
            value:
              'Les présentes conditions sont soumises au droit français, sous réserve des dispositions impératives applicables.',
          },
          {
            label: 'Contact',
            value:
              'Pour toute question relative aux présentes conditions, l’utilisateur peut écrire à sandra.champrigot@gmail.com.',
          },
        ],
      },
    ],
  },
};

export default function LegalPage({
  activeLegalPage = 'legal-notice',
  isDarkMode = false,
  onLegalLinkClick,
  onToggleDarkMode,
}) {
  const page = LEGAL_CONTENT[activeLegalPage] || LEGAL_CONTENT['legal-notice'];

  return (
    <section className="legal-page" aria-labelledby="legal-page-title">
      <DecorativePattern />
      <div className="legal-page__panel">
        <header className="legal-page__header">
          <div className="legal-page__header-main">
            <div className="legal-page__avatar" aria-hidden="true">
              <FileText size={34} weight="regular" />
            </div>
            <div>
              <h1 id="legal-page-title">{page.title}</h1>
              <p>Dernière mise à jour le {page.lastUpdated}</p>
            </div>
          </div>
          <button
            className="map-icon-button legal-theme-toggle"
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

        <div className="legal-page__content">
          {page.sections.map((section) => (
            <section key={section.title}>
              <h2>{section.title}</h2>
              {section.fields ? (
                <dl className="legal-page__fields">
                  {section.fields.map((field) => (
                    <div
                      className="legal-page__field"
                      data-starts-group={field.startsGroup || undefined}
                      key={field.label}
                    >
                      <dt>{field.label}</dt>
                      <dd>{field.value}</dd>
                    </div>
                  ))}
                </dl>
              ) : (
                section.paragraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))
              )}
            </section>
          ))}
        </div>
      </div>
      <LegalFooter onLegalLinkClick={onLegalLinkClick} />
    </section>
  );
}
