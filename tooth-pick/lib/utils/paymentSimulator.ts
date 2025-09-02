/**
 * 💰 Calculadora de Pagos para Arrendamiento y Financiamiento
 * Utiliza tasas de interés competitivas para productos dentales costosos
 */

interface PaymentCalculation {
  monthlyPayment: number;
  totalToPay: number;
  totalInterest: number;
  interestRate: number;
  effectiveRate: number;
}

interface LeaseQuote {
  leasing: PaymentCalculation;
  financing: PaymentCalculation;
}

/**
 * Calcula el pago mensual usando la fórmula de amortización
 * @param principal - Monto principal del préstamo
 * @param annualRate - Tasa de interés anual (decimal)
 * @param months - Número de meses del préstamo
 */
export function calculateMonthlyPayment(
  principal: number, 
  annualRate: number, 
  months: number
): number {
  if (annualRate === 0) return principal / months;
  
  const monthlyRate = annualRate / 12;
  const payment = (principal * monthlyRate * Math.pow(1 + monthlyRate, months)) / 
                  (Math.pow(1 + monthlyRate, months) - 1);
  
  return Math.round(payment * 100) / 100; // Redondear a centavos
}

/**
 * Obtiene las tasas de interés según el tipo de financiamiento y plazo
 * @param leaseType - Tipo: 'leasing' o 'financing'
 * @param months - Plazo en meses
 */
export function getInterestRate(leaseType: 'leasing' | 'financing', months: number): number {
  const rates = {
    leasing: {
      12: 0.15,  // 15% anual para leasing 12 meses
      24: 0.16,  // 16% anual para leasing 24 meses  
      36: 0.17   // 17% anual para leasing 36 meses
    },
    financing: {
      12: 0.18,  // 18% anual para financiamiento 12 meses
      24: 0.19,  // 19% anual para financiamiento 24 meses
      36: 0.20   // 20% anual para financiamiento 36 meses
    }
  };

  return rates[leaseType][months as keyof typeof rates.leasing] || 0.18;
}

/**
 * Calcula una cotización completa para un producto
 * @param productPrice - Precio del producto
 * @param months - Plazo en meses
 */
export function calculatePaymentQuote(
  productPrice: number, 
  months: 12 | 24 | 36
): LeaseQuote {
  const leasingRate = getInterestRate('leasing', months);
  const financingRate = getInterestRate('financing', months);

  const leasingPayment = calculateMonthlyPayment(productPrice, leasingRate, months);
  const financingPayment = calculateMonthlyPayment(productPrice, financingRate, months);

  const leasingTotal = leasingPayment * months;
  const financingTotal = financingPayment * months;

  return {
    leasing: {
      monthlyPayment: leasingPayment,
      totalToPay: leasingTotal,
      totalInterest: leasingTotal - productPrice,
      interestRate: leasingRate,
      effectiveRate: ((leasingTotal / productPrice) - 1) * (12 / months)
    },
    financing: {
      monthlyPayment: financingPayment,
      totalToPay: financingTotal,
      totalInterest: financingTotal - productPrice,
      interestRate: financingRate,
      effectiveRate: ((financingTotal / productPrice) - 1) * (12 / months)
    }
  };
}

/**
 * Valida si un producto es elegible para arrendamiento/financiamiento
 * @param productPrice - Precio del producto
 */
export function isEligibleForLeasing(productPrice: number): boolean {
  return productPrice >= 50000; // Mínimo $50,000 MXN
}

/**
 * Formatea un precio en pesos mexicanos
 * @param amount - Cantidad a formatear
 */
export function formatMXNPrice(amount: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

/**
 * Calcula el ahorro por usar arrendamiento vs financiamiento
 * @param productPrice - Precio del producto
 * @param months - Plazo en meses
 */
export function calculateSavings(
  productPrice: number, 
  months: 12 | 24 | 36
): { amount: number; percentage: number } {
  const quote = calculatePaymentQuote(productPrice, months);
  const savings = quote.financing.totalToPay - quote.leasing.totalToPay;
  const percentage = (savings / quote.financing.totalToPay) * 100;
  
  return {
    amount: savings,
    percentage: Math.round(percentage * 100) / 100
  };
}
