export const getDictionary = async (locale: string): Promise<Record<string, string>> => {
  return (await import(`./${locale}.ts`)).default;
};
