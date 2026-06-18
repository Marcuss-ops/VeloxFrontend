import React, { createContext, useContext, useMemo, useState } from 'react';

interface I18nContextValue {
    locale: string;
    setLocale: (next: string) => void;
    t: (label: string) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

const STORAGE_KEY = 'main_app_locale';

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [locale, setLocaleState] = useState<string>(() => localStorage.getItem(STORAGE_KEY) || 'it');

    const setLocale = (next: string) => {
        setLocaleState(next);
        localStorage.setItem(STORAGE_KEY, next);
    };

    const value = useMemo<I18nContextValue>(() => ({
        locale,
        setLocale,
        t: (label: string) => label,
    }), [locale]);

    return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export const useI18n = (): I18nContextValue => {
    const ctx = useContext(I18nContext);
    if (!ctx) throw new Error('useI18n must be used within I18nProvider');
    return ctx;
};

