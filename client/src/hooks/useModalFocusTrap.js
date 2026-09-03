import { useEffect } from 'react';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

function getFocusableElements(container) {
  return Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR)).filter(
    (element) =>
      !element.hasAttribute('disabled') &&
      element.getAttribute('aria-hidden') !== 'true'
  );
}

/**
 * Gère le focus clavier d'une fenêtre modale.
 *
 * Le focus initial entre dans la modale, Tab reste piégé dans le dialogue,
 * Escape ferme la modale si un handler est fourni, puis le focus retourne à
 * l'élément actif avant l'ouverture.
 *
 * @param {object} params Paramètres du piège de focus.
 * @param {boolean} params.isOpen Indique si la modale est affichée.
 * @param {object} params.dialogRef Référence React vers le dialogue.
 * @param {Function} [params.onClose] Callback de fermeture.
 * @returns {void}
 */
export function useModalFocusTrap({ isOpen, dialogRef, onClose }) {
  useEffect(() => {
    if (!isOpen || !dialogRef.current) {
      return undefined;
    }

    const dialog = dialogRef.current;
    const previouslyFocusedElement = document.activeElement;
    const focusableElements = getFocusableElements(dialog);
    const firstFocusableElement = focusableElements[0] || dialog;

    firstFocusableElement.focus();

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        onClose?.();
        return;
      }

      if (event.key !== 'Tab') {
        return;
      }

      const currentFocusableElements = getFocusableElements(dialog);

      if (currentFocusableElements.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const firstElement = currentFocusableElements[0];
      const lastElement =
        currentFocusableElements[currentFocusableElements.length - 1];

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);

      if (previouslyFocusedElement instanceof HTMLElement) {
        previouslyFocusedElement.focus();
      }
    };
  }, [dialogRef, isOpen, onClose]);
}
