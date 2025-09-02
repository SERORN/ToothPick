import { useContext } from 'react';
import { TranslationsContext } from '@/lib/providers/TranslationsProvider';

export const useTranslations = () => {
  const { t, locale } = useContext(TranslationsContext);
  return { t, locale };
};
