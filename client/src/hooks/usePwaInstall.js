import { useCallback, useEffect, useState } from 'react';
import {
  clearPwaInstallPrompt,
  getPwaInstallPrompt,
  subscribeToPwaInstallPrompt,
} from '../utils/pwaInstall';

export function usePwaInstall() {
  const [installPromptEvent, setInstallPromptEvent] = useState(null);
  const [cacheMessage, setCacheMessage] = useState('');

  useEffect(
    () =>
      subscribeToPwaInstallPrompt((promptEvent) => {
        setInstallPromptEvent(promptEvent);
      }),
    []
  );

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    function handleAppInstalled() {
      clearPwaInstallPrompt();
      setCacheMessage('UrbanFlow est installÃ©e sur votre appareil.');
    }

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const installPwa = useCallback(async () => {
    const promptEvent = installPromptEvent || getPwaInstallPrompt();

    if (!promptEvent) {
      setCacheMessage(
        "L'installation directe n'est pas disponible pour l'instant. Utilisez le bouton Installer dans la barre d'adresse si disponible."
      );
      return;
    }

    setCacheMessage('');
    await promptEvent.prompt();
    const choiceResult = await promptEvent.userChoice;

    if (choiceResult.outcome === 'accepted') {
      setCacheMessage("Installation de l'app lancÃ©e.");
      clearPwaInstallPrompt();
      return;
    }

    setCacheMessage("Installation de l'app annulÃ©e.");
  }, [installPromptEvent]);

  return {
    cacheMessage,
    installPwa,
    setCacheMessage,
  };
}
