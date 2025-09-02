'use client';
import { createContext, ReactNode, useMemo } from 'react';

export const TranslationsContext = createContext<any>(null);

export function TranslationsProvider({
  children,
  locale,
  dictionary,
}: {
  children: ReactNode;
  locale: string;
  dictionary: Record<string, string>;
}) {
  const value = useMemo(() => {
    const t = (key: string) => dictionary[key] || key;
    return { t, locale };
  }, [dictionary, locale]);

  return (
    <TranslationsContext.Provider value={value}>
      {children}
    </TranslationsContext.Provider>
  );
}
