import { useCallback, useState } from 'react';

const THEME_STORAGE_KEY = 'urbanflow-theme';

function getInitialIsDarkMode() {
  if (typeof window === 'undefined') {
    return false;
  }

  return window.localStorage.getItem(THEME_STORAGE_KEY) === 'dark';
}

export function useTheme() {
  const [isDarkMode, setIsDarkMode] = useState(getInitialIsDarkMode);

  const toggleDarkMode = useCallback(() => {
    setIsDarkMode((currentValue) => {
      const nextValue = !currentValue;

      if (typeof window !== 'undefined') {
        window.localStorage.setItem(
          THEME_STORAGE_KEY,
          nextValue ? 'dark' : 'light'
        );
      }

      return nextValue;
    });
  }, []);

  return {
    isDarkMode,
    toggleDarkMode,
  };
}
