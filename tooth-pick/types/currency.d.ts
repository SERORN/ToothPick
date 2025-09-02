// Tipos personalizados para currency.js ya que @types/currency.js no está disponible
declare module 'currency.js' {
  interface Options {
    symbol?: string;
    precision?: number;
    separator?: string;
    decimal?: string;
    format?: string;
    pattern?: string;
    negativePattern?: string;
    fromCents?: boolean;
    errorOnInvalid?: boolean;
    increment?: number;
    useVedic?: boolean;
  }

  interface Currency {
    value: number;
    intValue: number;
    add(amount: number | Currency): Currency;
    subtract(amount: number | Currency): Currency;
    multiply(amount: number | Currency): Currency;
    divide(amount: number | Currency): Currency;
    distribute(count: number): Currency[];
    dollars(): number;
    cents(): number;
    format(options?: Options): string;
    toString(): string;
    toJSON(): number;
  }

  interface CurrencyConstructor {
    (value?: any, options?: Options): Currency;
    new (value?: any, options?: Options): Currency;
  }

  const currency: CurrencyConstructor;
  export = currency;
}
