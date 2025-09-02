import { ReactNode } from 'react';
import { TranslationsProvider } from '@/lib/providers/TranslationsProvider';
import { getDictionary } from '@/lib/dictionaries';

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: { locale: string };
}) {
  const dictionary = await getDictionary(params.locale);

  return (
    <html lang={params.locale}>
      <body>
        <TranslationsProvider locale={params.locale} dictionary={dictionary}>
          {children}
        </TranslationsProvider>
      </body>
    </html>
  );
}
