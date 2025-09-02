// ⚙️ CONFIGURACIÓN DE COMISIONES TOOTHPICK
// Centraliza todos los porcentajes de comisión para fácil mantenimiento

export const FEES = {
  // B2B: Distribuidor comprando a Proveedor
  B2B: 0.055, // 5.5%
  
  // B2C: Cliente final comprando a Distribuidor
  B2C: 0.085, // 8.5%
} as const;

export const FEE_PERCENTAGES = {
  B2B: '5.5%',
  B2C: '8.5%',
} as const;

// Función para calcular comisión basada en tipo de orden
export function calculatePlatformFee(subtotal: number, orderType: 'b2b' | 'b2c' = 'b2b'): number {
  const feeRate = orderType === 'b2c' ? FEES.B2C : FEES.B2B;
  return subtotal * feeRate;
}

// Función para obtener el porcentaje como string para UI
export function getFeePercentageString(orderType: 'b2b' | 'b2c' = 'b2b'): string {
  return orderType === 'b2c' ? FEE_PERCENTAGES.B2C : FEE_PERCENTAGES.B2B;
}

// Función para calcular lo que recibe el vendedor (descontando comisión)
export function calculateSellerAmount(subtotal: number, orderType: 'b2b' | 'b2c' = 'b2b'): number {
  const platformFee = calculatePlatformFee(subtotal, orderType);
  return subtotal - platformFee;
}

export default FEES;
