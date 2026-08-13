import darkLogoOnPrimary from '../../assets/brand/dark/urbanflow-logo-onprimary.svg';
import darkLogoPrimary from '../../assets/brand/dark/urbanflow-logo-primary.svg';
import darkSymbolOnPrimary from '../../assets/brand/dark/urbanflow-symbol-onprimary.svg';
import darkSymbolPrimary from '../../assets/brand/dark/urbanflow-symbol-primary.svg';
import lightLogoOnPrimary from '../../assets/brand/light/urbanflow-logo-onprimary.svg';
import lightLogoPrimary from '../../assets/brand/light/urbanflow-logo-primary.svg';
import lightSymbolOnPrimary from '../../assets/brand/light/urbanflow-symbol-onprimary.svg';
import lightSymbolPrimary from '../../assets/brand/light/urbanflow-symbol-primary.svg';

/**
 * Catalogue central des variantes SVG UrbanFlow.
 *
 * `primary` s'utilise sur fond neutre ou carte. `onPrimary` s'utilise sur un
 * fond de couleur primaire, par exemple le bloc marque de la navigation.
 */
const brandAssets = {
  light: {
    onPrimary: {
      logo: lightLogoOnPrimary,
      symbol: lightSymbolOnPrimary,
    },
    primary: {
      logo: lightLogoPrimary,
      symbol: lightSymbolPrimary,
    },
  },
  dark: {
    onPrimary: {
      logo: darkLogoOnPrimary,
      symbol: darkSymbolOnPrimary,
    },
    primary: {
      logo: darkLogoPrimary,
      symbol: darkSymbolPrimary,
    },
  },
};

/**
 * Affiche le logo ou le symbole UrbanFlow adapté au thème courant.
 *
 * @param {object} props Propriétés du composant.
 * @param {'logo' | 'symbol'} [props.kind='logo'] Forme de marque à afficher.
 * @param {'primary' | 'onPrimary'} [props.variant='primary'] Contraste attendu.
 * @param {boolean} [props.isDarkMode=false] Sélectionne les assets dark.
 * @param {string} [props.className] Classe CSS appliquée à l'image.
 * @param {string} [props.alt='UrbanFlow Mobility'] Texte alternatif.
 * @returns {import('react').JSX.Element} Image SVG UrbanFlow.
 */
export default function UrbanflowBrand({
  kind = 'logo',
  variant = 'primary',
  isDarkMode = false,
  className,
  alt = 'UrbanFlow Mobility',
  ...imageProps
}) {
  const theme = isDarkMode ? 'dark' : 'light';
  const normalizedVariant = variant === 'onPrimary' ? 'onPrimary' : 'primary';
  const src =
    brandAssets[theme][normalizedVariant][kind] ||
    brandAssets[theme][normalizedVariant].logo;

  return <img className={className} src={src} alt={alt} {...imageProps} />;
}
