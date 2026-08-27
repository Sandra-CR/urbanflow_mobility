let deferredInstallPrompt = null;
const listeners = new Set();

function notifyListeners() {
  listeners.forEach((listener) => {
    listener(deferredInstallPrompt);
  });
}

export function initializePwaInstallPrompt() {
  if (typeof window === 'undefined') {
    return;
  }

  if (window.__urbanflowPwaInstallInitialized) {
    return;
  }

  window.__urbanflowPwaInstallInitialized = true;

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    notifyListeners();
  });

  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    notifyListeners();
  });
}

export function subscribeToPwaInstallPrompt(listener) {
  listeners.add(listener);
  listener(deferredInstallPrompt);

  return () => {
    listeners.delete(listener);
  };
}

export function getPwaInstallPrompt() {
  return deferredInstallPrompt;
}

export function clearPwaInstallPrompt() {
  deferredInstallPrompt = null;
  notifyListeners();
}
